"use client";

import { useState } from "react";

const COLORS = ["#fb7185", "#f59e0b", "#34d399", "#a78bfa", "#f8fafc"];

/** Mounted only while celebrating, so the pieces are generated client-side. */
export function Confetti({ pieces = 80 }: { pieces?: number }) {
  const [shapes] = useState(() =>
    Array.from({ length: pieces }, (_, index) => ({
      key: index,
      left: Math.random() * 100,
      delay: Math.random() * 1.2,
      duration: 2.6 + Math.random() * 2,
      color: COLORS[index % COLORS.length],
      rotate: Math.random() * 360,
    })),
  );

  return (
    <div
      className="pointer-events-none fixed inset-0 z-50 overflow-hidden"
      aria-hidden
    >
      {shapes.map((shape) => (
        <span
          key={shape.key}
          className="confetti-piece"
          style={{
            left: `${shape.left}%`,
            backgroundColor: shape.color,
            animationDelay: `${shape.delay}s`,
            animationDuration: `${shape.duration}s`,
            transform: `rotate(${shape.rotate}deg)`,
          }}
        />
      ))}
    </div>
  );
}
