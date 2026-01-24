import React, { useMemo, useState } from "react";
import "./dice/dice.css";
import { useDiceOverlay } from "./dice/DiceOverlayProvider";

// Neon-ish 3D-ish D6.
// Uses a CSS cube tumble animation and shows the rolled value as pips on the front face.
export default function D6Die({ value, onRoll, disabled }) {
  const [rolling, setRolling] = useState(false);
  const diceOverlay = useDiceOverlay();

  async function handleClick() {
    if (disabled || rolling) return;
    setRolling(true);
    try {
      // Show the global overlay and await the server result.
      await diceOverlay.rollD6(() => onRoll?.());
    } finally {
      // Let the tumble finish even if the request returns fast.
      setTimeout(() => {
        setRolling(false);
      }, 980);
    }
  }

  // Slight deterministic tilt per value so it doesn't look identical every time.
  const tilts = useMemo(() => {
    const v = Number(value) || 0;
    const rx = -18 + (v % 3) * 6; // -18, -12, -6
    const ry = 24 + (v % 4) * 10; // 24..54
    return { rx: `${rx}deg`, ry: `${ry}deg` };
  }, [value]);

  const pips = useMemo(() => pipsFor(value), [value]);

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        className={`cc-diceBtn ${rolling ? "cc-diceRolling" : ""}`}
        aria-label="Roll D6"
      >
        <div className="cc-diceScene">
          <div className="cc-d6Cube" style={{ "--rx": tilts.rx, "--ry": tilts.ry }}>
            <div className="cc-d6Face cc-d6Face--front">
              <div className="cc-d6Pips">
                {pips.map((p) => (
                  <span key={p.key} className="cc-pip" style={{ left: p.x, top: p.y }} />
                ))}
              </div>
            </div>
            {/* The other faces are subtle (purely visual). */}
            <div className="cc-d6Face cc-d6Face--back" />
            <div className="cc-d6Face cc-d6Face--right" />
            <div className="cc-d6Face cc-d6Face--left" />
            <div className="cc-d6Face cc-d6Face--top" />
            <div className="cc-d6Face cc-d6Face--bottom" />
          </div>
        </div>
      </button>
    </>
  );
}

function pipsFor(value) {
  const v = Number(value) || 0;
  // percent coordinates inside cc-d6Pips box
  const pos = {
    tl: { x: "12%", y: "12%" },
    tr: { x: "88%", y: "12%" },
    cl: { x: "12%", y: "50%" },
    cr: { x: "88%", y: "50%" },
    bl: { x: "12%", y: "88%" },
    br: { x: "88%", y: "88%" },
    cc: { x: "50%", y: "50%" },
    tc: { x: "50%", y: "12%" },
    bc: { x: "50%", y: "88%" },
  };

  const mk = (p, i) => ({ key: `${v}-${i}`, x: p.x, y: p.y });

  if (v === 1) return [mk(pos.cc, 0)];
  if (v === 2) return [mk(pos.tl, 0), mk(pos.br, 1)];
  if (v === 3) return [mk(pos.tl, 0), mk(pos.cc, 1), mk(pos.br, 2)];
  if (v === 4) return [mk(pos.tl, 0), mk(pos.tr, 1), mk(pos.bl, 2), mk(pos.br, 3)];
  if (v === 5) return [mk(pos.tl, 0), mk(pos.tr, 1), mk(pos.cc, 2), mk(pos.bl, 3), mk(pos.br, 4)];
  if (v === 6) return [mk(pos.tl, 0), mk(pos.tr, 1), mk(pos.cl, 2), mk(pos.cr, 3), mk(pos.bl, 4), mk(pos.br, 5)];
  return [];
}
