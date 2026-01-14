import { useMemo, useRef, useState } from "react";

type SwipeRevealOpts = {
  thresholdPx?: number; // how far to trigger
  maxRevealPx?: number; // max visual reveal
  maxVerticalPx?: number; // treat as scroll if vertical movement exceeds
  onCommitLeft?: () => void; // swipe right
  onCommitRight?: () => void; // swipe left
};

type SwipeRevealBind = {
  onPointerDown: (e: React.PointerEvent<HTMLElement>) => void;
  onPointerMove: (e: React.PointerEvent<HTMLElement>) => void;
  onPointerUp: (e: React.PointerEvent<HTMLElement>) => void;
  onPointerCancel: (e: React.PointerEvent<HTMLElement>) => void;
};

export function useSwipeReveal(opts: SwipeRevealOpts) {
  const {
    thresholdPx = 90,
    maxRevealPx = 140,
    maxVerticalPx = 40,
    onCommitLeft,
    onCommitRight,
  } = opts;

  const [dx, setDx] = useState(0);

  const stateRef = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    pointerId: number | null;
    committed: boolean;
  }>({
    active: false,
    startX: 0,
    startY: 0,
    pointerId: null,
    committed: false,
  });

  const progress = Math.min(1, Math.abs(dx) / thresholdPx);
  const side: "left" | "right" | null =
    dx > 0 ? "left" : dx < 0 ? "right" : null;

  const bind: SwipeRevealBind = useMemo(() => {
    const onPointerDown: SwipeRevealBind["onPointerDown"] = (e) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;

      stateRef.current.active = true;
      stateRef.current.committed = false;
      stateRef.current.pointerId = e.pointerId;
      stateRef.current.startX = e.clientX;
      stateRef.current.startY = e.clientY;

      e.currentTarget.setPointerCapture(e.pointerId);
    };

    const onPointerMove: SwipeRevealBind["onPointerMove"] = (e) => {
      const s = stateRef.current;
      if (!s.active) return;
      if (s.pointerId !== e.pointerId) return;

      const rawDx = e.clientX - s.startX;
      const rawDy = e.clientY - s.startY;

      if (Math.abs(rawDy) > maxVerticalPx) {
        s.active = false;
        setDx(0);
        return;
      }

      // clamp visual reveal
      const clamped = Math.max(-maxRevealPx, Math.min(maxRevealPx, rawDx));
      setDx(clamped);
    };

    const commitIfNeeded = () => {
      const s = stateRef.current;
      if (s.committed) return;

      if (dx <= -thresholdPx) {
        s.committed = true;
        onCommitRight?.();
      } else if (dx >= thresholdPx) {
        s.committed = true;
        onCommitLeft?.();
      }
    };

    const end = () => {
      commitIfNeeded();
      setDx(0);
      stateRef.current.active = false;
      stateRef.current.pointerId = null;
    };

    const onPointerUp: SwipeRevealBind["onPointerUp"] = (e) => {
      const s = stateRef.current;
      if (s.pointerId !== e.pointerId) return;
      end();
    };

    const onPointerCancel: SwipeRevealBind["onPointerCancel"] = (e) => {
      const s = stateRef.current;
      if (s.pointerId !== e.pointerId) return;
      setDx(0);
      s.active = false;
      s.pointerId = null;
    };

    return { onPointerDown, onPointerMove, onPointerUp, onPointerCancel };
  }, [
    dx,
    maxRevealPx,
    maxVerticalPx,
    onCommitLeft,
    onCommitRight,
    thresholdPx,
  ]);

  return {
    bind,
    dx,
    progress,
    side,
    thresholdPx,
    maxRevealPx,
  };
}
