import React, { useEffect, useState } from "react";

// Minimal visual D6 with pips on the front face.
// No external CSS (keeps project simple).
export default function D6Die({ value, onRoll, disabled }) {
  const [rolling, setRolling] = useState(false);

  async function handleClick() {
    if (disabled || rolling) return;
    setRolling(true);
    try {
      await (onRoll?.());
    } finally {
      // let the anim play a bit even if request returns fast
      setTimeout(() => setRolling(false), 520);
    }
  }

  const size = 72;
  const pip = (x, y) => (
    <div
      key={`${x}-${y}`}
      style={{
        position: "absolute",
        width: 10,
        height: 10,
        borderRadius: 999,
        background: "rgba(226,232,240,0.92)",
        left: x,
        top: y,
        transform: "translate(-50%, -50%)",
        boxShadow: "0 1px 8px rgba(0,0,0,0.35)",
      }}
    />
  );

  // 3x3 grid positions
  const pos = {
    tl: [18, 18],
    tc: [36, 18],
    tr: [54, 18],
    cl: [18, 36],
    cc: [36, 36],
    cr: [54, 36],
    bl: [18, 54],
    bc: [36, 54],
    br: [54, 54],
  };

  const pipsFor = (v) => {
    const vv = Number(v) || 0;
    if (vv === 1) return [pos.cc];
    if (vv === 2) return [pos.tl, pos.br];
    if (vv === 3) return [pos.tl, pos.cc, pos.br];
    if (vv === 4) return [pos.tl, pos.tr, pos.bl, pos.br];
    if (vv === 5) return [pos.tl, pos.tr, pos.cc, pos.bl, pos.br];
    if (vv === 6) return [pos.tl, pos.tr, pos.cl, pos.cr, pos.bl, pos.br];
    return [];
  };

  const pips = pipsFor(value).map(([x, y]) => pip(x, y));

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      style={{
        border: "1px solid rgba(148,163,184,0.20)",
        background: "rgba(15,23,42,0.35)",
        borderRadius: 16,
        padding: 10,
        minWidth: 90,
        minHeight: 90,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.55 : 1,
        touchAction: "manipulation",
      }}
      aria-label="Roll D6"
    >
      <div
        style={{
          width: size,
          height: size,
          position: "relative",
          display: "grid",
          placeItems: "center",
          transform: rolling ? "rotate(15deg)" : "rotate(0deg)",
          transition: "transform 120ms ease",
          animation: rolling ? "cc_d6shake 520ms ease-in-out" : "none",
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 14,
            background: "rgba(30,41,59,0.95)",
            border: "2px solid rgba(148,163,184,0.65)",
            position: "relative",
          }}
        >
          {pips}
        </div>
      </div>

      <style>{`
        @keyframes cc_d6shake {
          0%   { transform: translateY(0) rotate(0deg); }
          20%  { transform: translateY(-2px) rotate(8deg); }
          40%  { transform: translateY(1px) rotate(-10deg); }
          60%  { transform: translateY(-1px) rotate(12deg); }
          80%  { transform: translateY(1px) rotate(-8deg); }
          100% { transform: translateY(0) rotate(0deg); }
        }
      `}</style>
    </button>
  );
}
