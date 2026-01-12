import { useEffect, useMemo, useState } from "react";

type Piece = {
  left: number; // 0..100
  delay: number; // seconds
  dur: number; // seconds
  rot: number; // deg
  size: number; // px
};

type Props = {
  onDone: () => void;
  count?: number;
};

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeSeed(): number {
  try {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    return buf[0] ?? 1;
  } catch {
    // fallback without Math.random
    return (Date.now() ^ 0x9e3779b9) >>> 0;
  }
}

export function ConfettiBurst({ onDone, count = 34 }: Props) {
  // state is safe to read during render (unlike ref.current with React Compiler rules)
  const [seed] = useState<number>(() => makeSeed());

  const pieces = useMemo<Piece[]>(() => {
    const rand = mulberry32(seed);
    const out: Piece[] = [];

    for (let i = 0; i < count; i++) {
      out.push({
        left: rand() * 100,
        delay: rand() * 0.15,
        dur: 1.2 + rand() * 0.6,
        rot: rand() * 360,
        size: 6 + rand() * 8,
      });
    }
    return out;
  }, [count, seed]);

  useEffect(() => {
    const t = window.setTimeout(onDone, 1800);
    return () => window.clearTimeout(t);
  }, [onDone]);

  return (
    <div className="confetti" aria-hidden="true">
      {pieces.map((p, i) => (
        <span
          key={i}
          className="confettiPiece"
          style={{
            left: `${p.left}%`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.dur}s`,
            transform: `rotate(${p.rot}deg)`,
            width: `${p.size}px`,
            height: `${Math.max(4, p.size * 0.6)}px`,
          }}
        />
      ))}
    </div>
  );
}
