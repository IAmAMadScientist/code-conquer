import React from "react";
import "./dice/dice.css";

/**
 * Neon-ish D20 (SVG) with a spin/tumble animation + number overlay.
 * Intentionally lightweight (no 3D assets) but reads as a D20.
 */
export default function D20Die({ value, rolling = false, disabled = false, onClick }) {
  function handleClick() {
    if (disabled) return;
    onClick?.();
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="Roll D20"
      className={`cc-diceBtn ${rolling ? "cc-d20Rolling" : ""}`}
      disabled={disabled}
    >
      <div className="cc-d20Wrap">
        <svg className="cc-d20Svg" viewBox="0 0 100 100" aria-hidden="true">
          <defs>
            <linearGradient id="cc_d20_grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="rgba(99,102,241,0.35)" />
              <stop offset="55%" stopColor="rgba(30,41,59,0.92)" />
              <stop offset="100%" stopColor="rgba(2,6,23,0.92)" />
            </linearGradient>
            <radialGradient id="cc_d20_glow" cx="30%" cy="25%" r="70%">
              <stop offset="0%" stopColor="rgba(226,232,240,0.20)" />
              <stop offset="60%" stopColor="rgba(99,102,241,0.14)" />
              <stop offset="100%" stopColor="rgba(2,6,23,0.0)" />
            </radialGradient>
          </defs>

          {/* Outer silhouette */}
          <polygon
            points="50,4 88,26 96,66 50,96 4,66 12,26"
            fill="url(#cc_d20_grad)"
            stroke="rgba(226,232,240,0.55)"
            strokeWidth="2"
          />
          {/* Inner glow */}
          <polygon
            points="50,10 84,29 90,64 50,90 10,64 16,29"
            fill="url(#cc_d20_glow)"
            stroke="rgba(226,232,240,0.12)"
            strokeWidth="1.6"
          />

          {/* Facet lines */}
          <polyline points="50,4 50,96" fill="none" stroke="rgba(226,232,240,0.22)" strokeWidth="2" />
          <polyline points="12,26 88,26" fill="none" stroke="rgba(226,232,240,0.18)" strokeWidth="2" />
          <polyline points="4,66 96,66" fill="none" stroke="rgba(226,232,240,0.14)" strokeWidth="2" />
          <polyline points="12,26 50,52 88,26" fill="none" stroke="rgba(226,232,240,0.12)" strokeWidth="2" />
        </svg>

        <div className="cc-d20Number">{value ?? "?"}</div>
      </div>
    </button>
  );
}
