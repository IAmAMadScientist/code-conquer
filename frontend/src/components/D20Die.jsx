import React from "react";

/**
 * Lightweight D20 die (2D SVG) with a number overlay.
 * Looks like a D20 (icosahedron) silhouette.
 */
export default function D20Die({ value, rolling = false, disabled = false, onClick }) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      aria-label="Roll D20"
      className={`d20-btn${rolling ? " is-rolling" : ""}`}
      disabled={disabled}
      style={{
        border: "1px solid rgba(148,163,184,0.20)",
        background: "rgba(15,23,42,0.35)",
        borderRadius: 16,
        padding: 10,
        minWidth: 88,
        minHeight: 88,
        display: "grid",
        placeItems: "center",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.55 : 1,
        touchAction: "manipulation",
      }}
    >
      <div style={{ position: "relative", width: 64, height: 64 }}>
        <svg
          width="64"
          height="64"
          viewBox="0 0 100 100"
          style={{
            transform: rolling ? "rotate(25deg)" : "none",
            transition: "transform 120ms ease",
          }}
        >
          {/* Outer silhouette */}
          <polygon
            points="50,4 88,26 96,66 50,96 4,66 12,26"
            fill="rgba(2,6,23,0.55)"
            stroke="rgba(226,232,240,0.55)"
            strokeWidth="2"
          />
          {/* Facet lines */}
          <polyline
            points="50,4 50,96"
            fill="none"
            stroke="rgba(226,232,240,0.25)"
            strokeWidth="2"
          />
          <polyline
            points="12,26 88,26"
            fill="none"
            stroke="rgba(226,232,240,0.22)"
            strokeWidth="2"
          />
          <polyline
            points="4,66 96,66"
            fill="none"
            stroke="rgba(226,232,240,0.18)"
            strokeWidth="2"
          />
          <polyline
            points="12,26 50,52 88,26"
            fill="none"
            stroke="rgba(226,232,240,0.16)"
            strokeWidth="2"
          />
        </svg>
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "grid",
            placeItems: "center",
            fontWeight: 900,
            fontSize: 20,
            letterSpacing: 0.5,
            color: "rgba(226,232,240,0.92)",
            textShadow: "0 2px 10px rgba(0,0,0,0.45)",
          }}
        >
          {value ?? "?"}
        </div>
      </div>
      <style>{`
        @keyframes d20shake {
          0% { transform: translateY(0) rotate(0deg); }
          20% { transform: translateY(-2px) rotate(6deg); }
          40% { transform: translateY(1px) rotate(-8deg); }
          60% { transform: translateY(-1px) rotate(10deg); }
          80% { transform: translateY(1px) rotate(-6deg); }
          100% { transform: translateY(0) rotate(0deg); }
        }
        .d20-btn.is-rolling {
          animation: d20shake 420ms ease-in-out;
        }
      `}</style>
    </button>
  );
}
