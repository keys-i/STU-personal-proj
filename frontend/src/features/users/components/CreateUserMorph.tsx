import { useEffect, useLayoutEffect, useMemo, useRef } from "react";

type Rect = { left: number; top: number; width: number; height: number };

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
  collapsedContent: React.ReactNode;
  children: React.ReactNode;
  title: string;
  subtitle?: string;
};

const CLOSE_MS = 220;

export function CreateUserMorph({
  open,
  anchorRef,
  onClose,
  collapsedContent,
  children,
  title,
  subtitle,
}: Props) {
  const cardRef = useRef<HTMLDivElement | null>(null);

  const rafRef = useRef<number>(0);
  const tokenRef = useRef(0);

  const showTimerRef = useRef<number | null>(null);

  const prefersReducedMotion = useMemo(() => {
    if (typeof window === "undefined") return false;
    return (
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false
    );
  }, []);

  const computeToRect = (from: Rect): Rect => {
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

    const height = clamp(
      openBelow ? Math.min(580, maxHBelow) : Math.min(580, maxHAbove),
      280,
      580,
    );

    return { left, top, width: targetW, height };
  };

  const applyRectVars = (rect: Rect, radiusPx: number) => {
    const card = cardRef.current;
    if (!card) return;

    card.style.setProperty("--x", `${rect.left}px`);
    card.style.setProperty("--y", `${rect.top}px`);
    card.style.setProperty("--w", `${rect.width}px`);
    card.style.setProperty("--h", `${rect.height}px`);
    card.style.setProperty("--r", `${radiusPx}px`);
  };

  // Hide anchor while open, show it back after close animation completes
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
      // keep hidden until the card finishes collapsing
      hideAnchor();
      showTimerRef.current = window.setTimeout(
        () => {
          showAnchor();
          showTimerRef.current = null;
        },
        prefersReducedMotion ? 0 : CLOSE_MS,
      );
    }

    return () => {
      if (showTimerRef.current) window.clearTimeout(showTimerRef.current);
      showAnchor();
    };
  }, [open, anchorRef, prefersReducedMotion]);

  // OPEN/CLOSE positioning + morph via CSS vars
  useLayoutEffect(() => {
    const anchor = anchorRef.current;
    const card = cardRef.current;
    if (!anchor || !card) return;

    tokenRef.current += 1;
    const token = tokenRef.current;

    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    const from = getRect(anchor);

    if (open) {
      const to = computeToRect(from);

      applyRectVars(from, 10);

      rafRef.current = requestAnimationFrame(() => {
        if (token !== tokenRef.current) return;
        applyRectVars(to, 14);
      });
    } else {
      applyRectVars(from, 10);
    }

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [open, anchorRef]);

  // Keep aligned on resize/scroll while open
  useEffect(() => {
    if (!open) return;

    const onReflow = () => {
      const anchor = anchorRef.current;
      if (!anchor) return;

      const from = getRect(anchor);
      const to = computeToRect(from);
      applyRectVars(to, 14);
    };

    window.addEventListener("resize", onReflow);
    window.addEventListener("scroll", onReflow, true);
    return () => {
      window.removeEventListener("resize", onReflow);
      window.removeEventListener("scroll", onReflow, true);
    };
  }, [open, anchorRef]);

  return (
    <>
      {/* Backdrop is visual only; doesn't close and doesn't eat clicks */}
      <div
        className={`morphBackdrop ${open ? "morphBackdropOpen" : ""}`}
        style={{ pointerEvents: "none" }}
      />

      <div
        ref={cardRef}
        className={`morphCard ${open ? "morphCardExpanded" : "morphCardCollapsed"}`}
        role="dialog"
        aria-modal="true"
        aria-hidden={!open}
        style={{ pointerEvents: open ? "auto" : "none" }}
      >
        <div className="morphFace">{collapsedContent}</div>

        <div className={`morphInner ${open ? "morphInnerOpen" : ""}`}>
          <div className="morphHeader">
            <div>
              <div className="morphTitle">{title}</div>
              {subtitle ? <div className="morphSub">{subtitle}</div> : null}
            </div>

            {/* ONLY close trigger */}
            <button
              type="button"
              className="morphCloseBtn"
              onClick={onClose}
              aria-label="Close"
              title="Close"
            >
              ✕
            </button>
          </div>

          <div className="morphBody">{children}</div>
        </div>
      </div>
    </>
  );
}
