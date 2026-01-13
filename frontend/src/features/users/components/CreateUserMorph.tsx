import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

type Rect = { left: number; top: number; width: number; height: number };
type ToLayout = { left: number; top: number; width: number; maxH: number };

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function getRect(el: HTMLElement): Rect {
  const r = el.getBoundingClientRect();
  return { left: r.left, top: r.top, width: r.width, height: r.height };
}

type Props = {
  open: boolean;
  anchorRef: React.RefObject<HTMLElement | null>;
  onClose: () => void;

  collapsedContent?: React.ReactNode;

  // NEW
  nudgeKey?: number; // bump to retrigger nod + bubble pop
  errorMessage?: string | null;

  children: React.ReactNode;
  title: string;
  subtitle?: string;
};

const CLOSE_MS = 220;
const NOD_MS = 380;

export function CreateUserMorph({
  open,
  anchorRef,
  onClose,
  collapsedContent,
  nudgeKey = 0,
  errorMessage,
  children,
  title,
  subtitle,
}: Props) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const headerRef = useRef<HTMLDivElement | null>(null);
  const bodyRef = useRef<HTMLDivElement | null>(null);

  const rafRef = useRef<number>(0);
  const tokenRef = useRef(0);
  const showTimerRef = useRef<number | null>(null);

  const [nod, setNod] = useState(false);

  const prefersReducedMotion = useMemo(() => {
    if (typeof window === "undefined") return false;
    return (
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false
    );
  }, []);

  const computeToLayout = (from: Rect): ToLayout => {
    const pad = 16;
    const gap = 10;

    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const targetW = Math.min(540, vw - pad * 2);

    const left = clamp(
      from.left + from.width - targetW,
      pad,
      vw - targetW - pad,
    );

    const maxHBelow = vh - (from.top + from.height + gap) - pad;
    const maxHAbove = from.top - gap - pad;
    const openBelow = maxHBelow >= 320 || maxHBelow >= maxHAbove;

    const top = openBelow
      ? clamp(from.top + from.height + gap, pad, vh - pad - 240)
      : clamp(from.top - gap - 460, pad, vh - pad - 240);

    const maxH = clamp(openBelow ? maxHBelow : maxHAbove, 220, 580);

    return { left, top, width: targetW, maxH };
  };

  const applyVars = (x: number, y: number, w: number, h: number, r: number) => {
    const card = cardRef.current;
    if (!card) return;

    card.style.setProperty("--x", `${x}px`);
    card.style.setProperty("--y", `${y}px`);
    card.style.setProperty("--w", `${w}px`);
    card.style.setProperty("--h", `${h}px`);
    card.style.setProperty("--r", `${r}px`);
  };

  const measureAndFitHeight = (maxH: number) => {
    const headerEl = headerRef.current;
    const bodyEl = bodyRef.current;
    const card = cardRef.current;
    if (!headerEl || !bodyEl || !card) return;

    const headerH = headerEl.getBoundingClientRect().height;
    const bodyContentH = bodyEl.scrollHeight;
    const want = headerH + bodyContentH;

    const fitted = clamp(Math.ceil(want), 160, Math.ceil(maxH));
    card.style.setProperty("--h", `${fitted}px`);
  };

  const hasCollapsedFace = collapsedContent != null;

  // NEW: trigger nod animation when nudgeKey changes while open
  useEffect(() => {
    if (!open) return;
    if (prefersReducedMotion) return;

    setNod(true);
    const t = window.setTimeout(() => setNod(false), NOD_MS);
    return () => window.clearTimeout(t);
  }, [nudgeKey, open, prefersReducedMotion]);

  // Hide anchor while open; show after collapse completes (overlay-only safe)
  useEffect(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;

    if (showTimerRef.current) window.clearTimeout(showTimerRef.current);

    const hideAnchor = () => {
      anchor.style.opacity = "0";
      anchor.style.pointerEvents = "none";
    };

    const showAnchor = () => {
      anchor.style.opacity = "";
      anchor.style.pointerEvents = "";
    };

    if (open) {
      hideAnchor();
    } else {
      if (hasCollapsedFace) {
        hideAnchor();
        showTimerRef.current = window.setTimeout(
          () => {
            showAnchor();
            showTimerRef.current = null;
          },
          prefersReducedMotion ? 0 : CLOSE_MS,
        );
      } else {
        showAnchor();
      }
    }

    return () => {
      if (showTimerRef.current) window.clearTimeout(showTimerRef.current);
      showAnchor();
    };
  }, [open, anchorRef, prefersReducedMotion, hasCollapsedFace]);

  useLayoutEffect(() => {
    const anchor = anchorRef.current;
    const card = cardRef.current;
    if (!anchor || !card) return;

    tokenRef.current += 1;
    const token = tokenRef.current;

    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    const from = getRect(anchor);

    if (open) {
      const to = computeToLayout(from);

      applyVars(from.left, from.top, from.width, from.height, 10);

      rafRef.current = requestAnimationFrame(() => {
        if (token !== tokenRef.current) return;
        applyVars(to.left, to.top, to.width, Math.min(280, to.maxH), 14);

        requestAnimationFrame(() => {
          if (token !== tokenRef.current) return;
          measureAndFitHeight(to.maxH);
        });
      });
    } else {
      applyVars(from.left, from.top, from.width, from.height, 10);
    }

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [open, anchorRef]);

  useEffect(() => {
    if (!open) return;

    const onReflow = () => {
      const anchor = anchorRef.current;
      if (!anchor) return;

      const from = getRect(anchor);
      const to = computeToLayout(from);

      applyVars(to.left, to.top, to.width, Math.min(280, to.maxH), 14);
      requestAnimationFrame(() => measureAndFitHeight(to.maxH));
    };

    window.addEventListener("resize", onReflow);
    window.addEventListener("scroll", onReflow, true);
    return () => {
      window.removeEventListener("resize", onReflow);
      window.removeEventListener("scroll", onReflow, true);
    };
  }, [open, anchorRef]);

  useEffect(() => {
    if (!open) return;

    const bodyEl = bodyRef.current;
    const anchor = anchorRef.current;
    if (!bodyEl || !anchor) return;

    const from = getRect(anchor);
    const to = computeToLayout(from);

    const ro = new ResizeObserver(() => {
      measureAndFitHeight(to.maxH);
    });

    ro.observe(bodyEl);
    return () => ro.disconnect();
  }, [open, anchorRef, children]);

  return (
    <>
      <div
        className={`morphBackdrop ${open ? "morphBackdropOpen" : ""}`}
        style={{ pointerEvents: open ? "auto" : "none" }}
        onMouseDown={() => onClose()}
        onTouchStart={() => onClose()}
        aria-hidden="true"
      />

      <div
        ref={cardRef}
        className={`morphCard ${
          open ? "morphCardExpanded" : "morphCardCollapsed"
        } ${nod ? "morphCardNod" : ""} ${open && errorMessage ? "morphCardError" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-hidden={!open}
        style={{ pointerEvents: open ? "auto" : "none" }}
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
      >
        {!open && hasCollapsedFace ? (
          <div className="morphFace morphFaceShow">{collapsedContent}</div>
        ) : null}

        <div className={`morphInner ${open ? "morphInnerOpen" : ""}`}>
          <div ref={headerRef} className="morphHeader">
            <div>
              <div className="morphTitle">{title}</div>
              {subtitle ? <div className="morphSub">{subtitle}</div> : null}
            </div>
          </div>

          {/* NEW: error banner INSIDE the box */}
          {open && errorMessage ? (
            <div key={nudgeKey} className="morphErrorBanner" role="alert">
              {errorMessage}
            </div>
          ) : null}

          <div ref={bodyRef} className="morphBody">
            {children}
          </div>
        </div>
      </div>
    </>
  );
}
