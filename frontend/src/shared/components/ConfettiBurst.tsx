import { useEffect, useMemo } from "react";

type Piece = {
  left: number; // 0..100
  delay: number; // seconds
  dur: number; // seconds
  rot: number; // deg
  size: number; // px
};

export function ConfettiBurst(props: { onDone: () => void }) {
  const pieces = useMemo<Piece[]>(() => {
    const n = 34;
    const out: Piece[] = [];
    for (let i = 0; i < n; i++) {
      out.push({
        left: Math.random() * 100,
        delay: Math.random() * 0.15,
        dur: 1.2 + Math.random() * 0.6,
        rot: Math.random() * 360,
        size: 6 + Math.random() * 8,
      });
    }
    return out;
  }, []);

  useEffect(() => {
    const t = setTimeout(props.onDone, 1800);
    return () => clearTimeout(t);
  }, [props]);

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
