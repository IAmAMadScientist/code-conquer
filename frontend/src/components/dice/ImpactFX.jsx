import React from "react";

// Tiny impact effect: sparks + dust ring.
// Deterministic via seed so it feels stable per roll.

export default function ImpactFX({ seed }) {
  const r = mulberry32((Number(seed) || 0) ^ 0x9e3779b9);

  const sparks = Array.from({ length: 14 }).map((_, i) => {
    const ang = Math.floor(r() * 360);
    const len = 28 + Math.floor(r() * 30);
    const delay = Math.floor(r() * 80);
    const w = 2 + Math.floor(r() * 2);
    return { key: `s-${seed}-${i}`, ang, len, delay, w };
  });

  const dust = Array.from({ length: 10 }).map((_, i) => {
    const ang = Math.floor(r() * 360);
    const dist = 14 + Math.floor(r() * 22);
    const delay = 20 + Math.floor(r() * 90);
    const s = 0.6 + r() * 0.9;
    return { key: `d-${seed}-${i}`, ang, dist, delay, s };
  });

  return (
    <div className="cc-impact" aria-hidden="true">
      <div className="cc-impactRing" />
      <div className="cc-impactSparks">
        {sparks.map((p) => (
          <span
            key={p.key}
            className="cc-impactSpark"
            style={{ "--a": `${p.ang}deg`, "--l": `${p.len}px`, "--pd": `${p.delay}ms`, "--w": `${p.w}px` }}
          />
        ))}
      </div>
      <div className="cc-impactDust">
        {dust.map((p) => (
          <span
            key={p.key}
            className="cc-impactDustPuff"
            style={{ "--a": `${p.ang}deg`, "--d": `${p.dist}px`, "--pd": `${p.delay}ms`, "--ps": p.s }}
          />
        ))}
      </div>
    </div>
  );
}

function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
