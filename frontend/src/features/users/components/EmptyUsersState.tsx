import { useLayoutEffect, useMemo, useRef, useState } from "react";

type Point = { x: number; y: number };

type Props = {
  targetRef: React.RefObject<HTMLElement | null>;
  popping?: boolean;
};

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}
function len(x: number, y: number) {
  return Math.hypot(x, y);
}
function norm(x: number, y: number) {
  const l = len(x, y);
  if (!l) return { x: 0, y: 0 };
  return { x: x / l, y: y / l };
}
function add(p: Point, v: Point, s: number): Point {
  return { x: p.x + v.x * s, y: p.y + v.y * s };
}
function randSigned(seed: number, salt: number) {
  const s = Math.sin(seed * 999.17 + salt * 123.43) * 43758.5453;
  const f = s - Math.floor(s);
  return f * 2 - 1;
}

/**
 * One smooth loopy cubic that ENDS at `tip`.
 * End tangent is aligned with `endDir` via c2 behind the tip.
 */
function buildLoopyCubicToTip(
  start: Point,
  tip: Point,
  endDir: Point,
  seed: number,
) {
  const dx = tip.x - start.x;
  const dy = tip.y - start.y;
  const distance = len(dx, dy);

  const dir = norm(dx, dy);
  const side = randSigned(seed, 1) >= 0 ? 1 : -1;

  const loop = clamp(distance * 0.28, 38, 120) * side;
  const t1 = clamp(0.26 + randSigned(seed, 2) * 0.05, 0.18, 0.34);

  const wob = clamp(distance * 0.025, 3, 10);
  const w1 = randSigned(seed, 4) * wob;

  const perp = { x: -dir.y, y: dir.x };

  const c1 = {
    x: start.x + dx * t1 + perp.x * (loop * 1.1) + perp.x * w1,
    y: start.y + dy * t1 + perp.y * (loop * 1.1) + perp.y * w1,
  };

  // Force final tangent to match endDir: tangent at end is (tip - c2)
  const handle = clamp(distance * 0.22, 34, 90);
  const c2 = {
    x: tip.x - endDir.x * handle,
    y: tip.y - endDir.y * handle,
  };

  return `M ${start.x.toFixed(1)} ${start.y.toFixed(1)}
          C ${c1.x.toFixed(1)} ${c1.y.toFixed(1)}
            ${c2.x.toFixed(1)} ${c2.y.toFixed(1)}
            ${tip.x.toFixed(1)} ${tip.y.toFixed(1)}`;
}

/**
 * Arrowhead that STARTS at the same TIP as the shaft, and diverges into two wings.
 * (So it feels like the path breaks into the head at the tip.)
 */
function buildOpen30HeadFromTip(tip: Point, endDir: Point) {
  const perp = { x: -endDir.y, y: endDir.x };

  // Tune these:
  const headLen = 16; // longer/shorter head
  const spread = 9; // openness (bigger = wider V)
  const control = 7; // how "curvy" the split feels

  // Wings go backwards from the tip
  const leftEnd = add(add(tip, endDir, -headLen), perp, spread);
  const rightEnd = add(add(tip, endDir, -headLen), perp, -spread);

  // Make it feel like it "splits" from the tip:
  // first controls push outward immediately from the tip.
  const leftC1 = add(add(tip, endDir, -control * 0.2), perp, spread * 0.85);
  const leftC2 = add(add(tip, endDir, -control * 1.0), perp, spread * 0.55);

  const rightC1 = add(add(tip, endDir, -control * 0.2), perp, -spread * 0.85);
  const rightC2 = add(add(tip, endDir, -control * 1.0), perp, -spread * 0.55);

  return `M ${tip.x.toFixed(1)} ${tip.y.toFixed(1)}
            C ${leftC1.x.toFixed(1)} ${leftC1.y.toFixed(1)}
              ${leftC2.x.toFixed(1)} ${leftC2.y.toFixed(1)}
              ${leftEnd.x.toFixed(1)} ${leftEnd.y.toFixed(1)}
          M ${tip.x.toFixed(1)} ${tip.y.toFixed(1)}
            C ${rightC1.x.toFixed(1)} ${rightC1.y.toFixed(1)}
              ${rightC2.x.toFixed(1)} ${rightC2.y.toFixed(1)}
              ${rightEnd.x.toFixed(1)} ${rightEnd.y.toFixed(1)}`;
}

export function EmptyUsersState({ targetRef, popping }: Props) {
  const textRef = useRef<HTMLDivElement | null>(null);
  const shaftRef = useRef<SVGPathElement | null>(null);
  const headRef = useRef<SVGPathElement | null>(null);

  const seedRef = useRef<number>(Math.random() * 1_000_000);

  const [data, setData] = useState<{
    start: Point;
    tip: Point; // shaft ends HERE
    endDir: Point;
  } | null>(null);

  const [dashShaft, setDashShaft] = useState(1400);
  const [dashHead, setDashHead] = useState(240);

  useLayoutEffect(() => {
    let raf = 0;

    const measure = () => {
      const textEl = textRef.current;
      const targetEl = targetRef.current;
      if (!textEl || !targetEl) return;

      const a = textEl.getBoundingClientRect();
      const b = targetEl.getBoundingClientRect();

      const start = {
        x: a.left + a.width / 2 + 24,
        y: a.top + a.height / 2 - 42,
      };

      const buttonCorner = {
        x: b.right - 10,
        y: b.bottom - 18,
      };

      const endDir = norm(buttonCorner.x - start.x, buttonCorner.y - start.y);

      const distance = len(buttonCorner.x - start.x, buttonCorner.y - start.y);
      const gap = clamp(distance * 0.22, 44, 96);

      const tip = {
        x: buttonCorner.x - endDir.x * gap,
        y: buttonCorner.y - endDir.y * gap,
      };

      setData({ start, tip, endDir });
    };

    const schedule = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(measure);
    };

    schedule();
    window.addEventListener("resize", schedule);
    window.addEventListener("scroll", schedule, true);

    const ro = new ResizeObserver(schedule);
    if (textRef.current) ro.observe(textRef.current);
    if (targetRef.current) ro.observe(targetRef.current);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("scroll", schedule, true);
      ro.disconnect();
    };
  }, [targetRef]);

  const seed = seedRef.current;

  const { shaftD, headD } = useMemo(() => {
    if (!data) return { shaftD: "", headD: "" };
    return {
      shaftD: buildLoopyCubicToTip(data.start, data.tip, data.endDir, seed),
      headD: buildOpen30HeadFromTip(data.tip, data.endDir),
    };
  }, [data, seed]);

  useLayoutEffect(() => {
    const el = shaftRef.current;
    if (!el) return;
    const total = el.getTotalLength?.();
    if (typeof total === "number" && Number.isFinite(total)) {
      setDashShaft(Math.ceil(total + 120));
    }
  }, [shaftD]);

  useLayoutEffect(() => {
    const el = headRef.current;
    if (!el) return;
    const total = el.getTotalLength?.();
    if (typeof total === "number" && Number.isFinite(total)) {
      setDashHead(Math.ceil(total + 40));
    }
  }, [headD]);

  return (
    <div className="emptyState">
      {data && (
        <svg
          className={`emptyArrowOverlay ${popping ? "emptyArrowPop" : ""}`}
          width="100%"
          height="100%"
          viewBox={`0 0 ${window.innerWidth} ${window.innerHeight}`}
          aria-hidden="true"
        >
          <g transform="translate(0 -15)">
            <path
              ref={shaftRef}
              d={shaftD}
              className="emptyArrowShaft emptyArrowShaftDraw"
              style={{ ["--dash" as any]: `${dashShaft}` }}
            />
            <path
              ref={headRef}
              d={headD}
              className="emptyArrowHead emptyArrowHeadDraw"
              style={{ ["--dash" as any]: `${dashHead}` }}
            />
          </g>
        </svg>
      )}

      <div className="emptyFace">:(</div>

      <div ref={textRef}>
        <div className="emptyTitle">No users showed up to the party</div>
        <div className="emptySub">
          Invite someone. That “New” button is shy.
        </div>
      </div>
    </div>
  );
}
