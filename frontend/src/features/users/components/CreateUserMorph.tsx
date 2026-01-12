import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

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
  anchorRef: React.RefObject<HTMLElement>;
  onClose: () => void;

  // what the morph looks like when "closed" (should match the button)
  collapsedContent: React.ReactNode;

  // what the morph shows when fully open (your create form)
  children: React.ReactNode;

  title: string;
  subtitle?: string;
};

export function CreateUserMorph({
  open,
  anchorRef,
  onClose,
  collapsedContent,
  children,
  title,
  subtitle,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [phase, setPhase] = useState<"closed" | "opening" | "open" | "closing">(
    "closed",
  );

  const fromRectRef = useRef<Rect | null>(null);
  const toRectRef = useRef<Rect | null>(null);

  const cardRef = useRef<HTMLDivElement | null>(null);

  const prefersReducedMotion = useMemo(() => {
    if (typeof window === "undefined") return false;
    return (
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false
    );
  }, []);

  const computeToRect = () => {
    const anchor = anchorRef.current;
    if (!anchor) return null;

    const from = getRect(anchor);
    const pad = 16;
    const gap = 10;

    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const targetW = Math.min(540, vw - pad * 2);

    // align right edge with button’s right edge (feels like it “unfolds” from it)
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

  // Hide the real anchor button while the morph is visible
  useEffect(() => {
    const anchor = anchorRef.current as HTMLElement | null;
    if (!anchor) return;

    if (mounted) {
      // keep layout; just hide visuals + disable interaction
      anchor.style.opacity = "0";
      anchor.style.pointerEvents = "none";
    } else {
      anchor.style.opacity = "";
      anchor.style.pointerEvents = "";
    }

    return () => {
      anchor.style.opacity = "";
      anchor.style.pointerEvents = "";
    };
  }, [mounted, anchorRef]);

  // Mount + opening animation
  useLayoutEffect(() => {
    if (!open) return;

    const anchor = anchorRef.current;
    if (!anchor) return;

    const from = getRect(anchor);
    const to = computeToRect();
    if (!to) return;

    fromRectRef.current = from;
    toRectRef.current = to;

    setMounted(true);
    setPhase("opening");

    requestAnimationFrame(() => {
      const card = cardRef.current;
      if (!card) return;

      // Start exactly at button position/size
      card.style.setProperty("--x", `${from.left}px`);
      card.style.setProperty("--y", `${from.top}px`);
      card.style.setProperty("--w", `${from.width}px`);
      card.style.setProperty("--h", `${from.height}px`);
      card.style.setProperty("--r", `10px`);

      // Next frame: expand to floating window
      requestAnimationFrame(() => {
        card.style.setProperty("--x", `${to.left}px`);
        card.style.setProperty("--y", `${to.top}px`);
        card.style.setProperty("--w", `${to.width}px`);
        card.style.setProperty("--h", `${to.height}px`);
        card.style.setProperty("--r", `14px`);

        if (prefersReducedMotion) setPhase("open");
      });
    });
  }, [open, anchorRef, prefersReducedMotion]);

  // Close animation when `open` becomes false
  useEffect(() => {
    if (open) return;
    if (!mounted) return;

    const from = fromRectRef.current;
    const card = cardRef.current;

    if (!from || !card) {
      setMounted(false);
      setPhase("closed");
      return;
    }

    setPhase("closing");

    requestAnimationFrame(() => {
      card.style.setProperty("--x", `${from.left}px`);
      card.style.setProperty("--y", `${from.top}px`);
      card.style.setProperty("--w", `${from.width}px`);
      card.style.setProperty("--h", `${from.height}px`);
      card.style.setProperty("--r", `10px`);

      if (prefersReducedMotion) {
        setMounted(false);
        setPhase("closed");
      }
    });
  }, [open, mounted, prefersReducedMotion]);

  // Keep correct position on resize/scroll while open
  useEffect(() => {
    if (!mounted) return;

    const onReflow = () => {
      const anchor = anchorRef.current;
      const card = cardRef.current;
      if (!anchor || !card) return;

      const from = getRect(anchor);
      fromRectRef.current = from;

      const to = computeToRect();
      if (!to) return;
      toRectRef.current = to;

      if (phase === "open") {
        card.style.setProperty("--x", `${to.left}px`);
        card.style.setProperty("--y", `${to.top}px`);
        card.style.setProperty("--w", `${to.width}px`);
        card.style.setProperty("--h", `${to.height}px`);
        card.style.setProperty("--r", `14px`);
      }
    };

    window.addEventListener("resize", onReflow);
    window.addEventListener("scroll", onReflow, true);
    return () => {
      window.removeEventListener("resize", onReflow);
      window.removeEventListener("scroll", onReflow, true);
    };
  }, [mounted, anchorRef, phase]);

  // Click outside + Esc
  useEffect(() => {
    if (!mounted) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    const onPointerDown = (e: PointerEvent) => {
      const card = cardRef.current;
      if (!card) return;
      if (!card.contains(e.target as Node)) onClose();
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [mounted, onClose]);

  const onTransitionEnd = (e: React.TransitionEvent<HTMLDivElement>) => {
    if (e.target !== cardRef.current) return;

    if (phase === "opening" && !prefersReducedMotion) {
      setPhase("open");
      return;
    }
    if (phase === "closing" && !prefersReducedMotion) {
      setMounted(false);
      setPhase("closed");
    }
  };

  if (!mounted) return null;

  const expanded = phase === "open" || phase === "opening";
  const showExpandedContent = phase === "open"; // wait until fully expanded
  const showCollapsedFace = phase !== "open"; // show button face while animating

  return (
    <>
      <div className={`morphBackdrop ${expanded ? "morphBackdropOpen" : ""}`} />

      <div
        ref={cardRef}
        className={`morphCard ${expanded ? "morphCardExpanded" : "morphCardCollapsed"}`}
        onTransitionEnd={onTransitionEnd}
        role="dialog"
        aria-modal="true"
      >
        {/* Button face (makes it feel like the button is transforming) */}
        <div
          className={`morphFace ${showCollapsedFace ? "morphFaceShow" : ""}`}
        >
          {collapsedContent}
        </div>

        {/* Real content appears only once expanded */}
        <div
          className={`morphInner ${showExpandedContent ? "morphInnerOpen" : ""}`}
        >
          <div className="morphHeader">
            <div>
              <div className="morphTitle">{title}</div>
              {subtitle ? <div className="morphSub">{subtitle}</div> : null}
            </div>

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
