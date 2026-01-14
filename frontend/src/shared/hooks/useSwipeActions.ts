import { useCallback, useMemo, useRef, useState } from "react";

type SwipeOpts = {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;

  thresholdPx?: number; // commit distance
  maxPx?: number; // hard clamp for dragging feel
  maxRevealPx?: number; // visual clamp (used by UI to size reveal panels)
};

type SwipeBind = {
  onPointerDown: React.PointerEventHandler;
  onPointerMove: React.PointerEventHandler;
  onPointerUp: React.PointerEventHandler;
  onPointerCancel: React.PointerEventHandler;
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

export function useSwipeAction(opts: SwipeOpts) {
  const thresholdPx = opts.thresholdPx ?? 70;

  // maxRevealPx: how wide the reveal UI can get
  const maxRevealPx = opts.maxRevealPx ?? 140;

  // maxPx: how far the row can be dragged; default to reveal width
  const maxPx = opts.maxPx ?? maxRevealPx;

  const startX = useRef<number | null>(null);
  const activeId = useRef<number | null>(null);
  const dragging = useRef(false);

  const [dx, setDx] = useState(0);

  const end = useCallback(() => {
    startX.current = null;
    activeId.current = null;
    dragging.current = false;
    setDx(0);
  }, []);

  const onPointerDown = useCallback<SwipeBind["onPointerDown"]>((e) => {
    // Only primary button / touch
    if (e.pointerType === "mouse" && e.button !== 0) return;

    activeId.current = e.pointerId;
    startX.current = e.clientX;
    dragging.current = true;

    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback<SwipeBind["onPointerMove"]>(
    (e) => {
      if (!dragging.current) return;
      if (activeId.current !== e.pointerId) return;
      if (startX.current == null) return;

      const raw = e.clientX - startX.current;
      const clamped = clamp(raw, -maxPx, maxPx);

      if (Math.abs(clamped) > 4) e.preventDefault();

      setDx(clamped);
    },
    [maxPx],
  );

  const onPointerUp = useCallback<SwipeBind["onPointerUp"]>(
    (e) => {
      if (activeId.current !== e.pointerId) return;

      // use a snapshot of dx at release time
      const finalDx = dx;

      if (finalDx <= -thresholdPx) opts.onSwipeLeft?.();
      if (finalDx >= thresholdPx) opts.onSwipeRight?.();

      end();
    },
    [dx, end, opts, thresholdPx],
  );

  const onPointerCancel = useCallback<SwipeBind["onPointerCancel"]>(() => {
    end();
  }, [end]);

  const bind = useMemo<SwipeBind>(
    () => ({ onPointerDown, onPointerMove, onPointerUp, onPointerCancel }),
    [onPointerDown, onPointerMove, onPointerUp, onPointerCancel],
  );

  // progress should be relative to reveal width (for scaling/opacity)
  const progress = Math.min(1, Math.abs(dx) / maxRevealPx);

  return {
    bind,
    dx,
    progress, // 0..1 relative to maxRevealPx
    isSwiping: dx !== 0,
    thresholdPx,
    maxPx,
    maxRevealPx,
  };
}
