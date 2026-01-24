import React from "react";
import { createPortal } from "react-dom";
import ImpactFX from "./ImpactFX";

// Full-screen (pointer-events:none) overlay for a D20 roll.
// open: boolean
// value: number | null (final value; when null it keeps tumbling)
export default function D20RollOverlay({ open, value }) {
  const [mounted, setMounted] = React.useState(false);
  const [seed, setSeed] = React.useState(() => Math.floor(Math.random() * 1e9));

  React.useEffect(() => {
    if (open) {
      setSeed(Math.floor(Math.random() * 1e9));
      setMounted(true);
    }
  }, [open]);

  // Unmount shortly after closing to allow fade-out.
  React.useEffect(() => {
    if (!open && mounted) {
      const t = setTimeout(() => setMounted(false), 180);
      return () => clearTimeout(t);
    }
  }, [open, mounted]);

  if (!mounted) return null;

  const r = mulberry32(seed);
  const spin1 = Math.floor(r() * 360);
  const spin2 = Math.floor(r() * 360);
  const spin3 = Math.floor(r() * 360);

  const landed = typeof value === "number" && value >= 1;
  const path = edgeBounceTravelPath(r);

  return createPortal(
    <div className={`cc-diceOverlay ${open ? "is-open" : ""} ${landed ? "is-landed" : ""}`}>
      <div className="cc-diceOverlayBackdrop" />
      <div
        className="cc-diceOverlayTrack cc-d20OverlayTrack"
        style={{
          "--s1": `${spin1}deg`,
          "--s2": `${spin2}deg`,
          "--s3": `${spin3}deg`,
          ...path,
        }}
      >
        <div className="cc-d20Overlay">
          <svg className="cc-d20OverlaySvg" viewBox="0 0 100 100" aria-hidden="true">
            <defs>
              <linearGradient id="cc_d20_grad_big" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="rgba(99,102,241,0.38)" />
                <stop offset="55%" stopColor="rgba(30,41,59,0.92)" />
                <stop offset="100%" stopColor="rgba(2,6,23,0.92)" />
              </linearGradient>
              <radialGradient id="cc_d20_glow_big" cx="30%" cy="25%" r="70%">
                <stop offset="0%" stopColor="rgba(226,232,240,0.22)" />
                <stop offset="60%" stopColor="rgba(99,102,241,0.16)" />
                <stop offset="100%" stopColor="rgba(2,6,23,0.0)" />
              </radialGradient>
            </defs>

            <polygon
              points="50,4 88,26 96,66 50,96 4,66 12,26"
              fill="url(#cc_d20_grad_big)"
              stroke="rgba(226,232,240,0.6)"
              strokeWidth="2"
            />
            <polygon
              points="50,10 84,29 90,64 50,90 10,64 16,29"
              fill="url(#cc_d20_glow_big)"
              stroke="rgba(226,232,240,0.14)"
              strokeWidth="1.6"
            />

            <polyline points="50,4 50,96" fill="none" stroke="rgba(226,232,240,0.22)" strokeWidth="2" />
            <polyline points="12,26 88,26" fill="none" stroke="rgba(226,232,240,0.18)" strokeWidth="2" />
            <polyline points="4,66 96,66" fill="none" stroke="rgba(226,232,240,0.14)" strokeWidth="2" />
            <polyline points="12,26 50,52 88,26" fill="none" stroke="rgba(226,232,240,0.12)" strokeWidth="2" />
          </svg>
          <div className="cc-d20OverlayNumber">{value ?? "…"}</div>
        </div>
        {landed ? <ImpactFX seed={seed} /> : null}
      </div>
    </div>,
    document.body
  );
}

function edgeBounceTravelPath(r) {
  // Same feel as D6 overlay: heading changes only at "edge hits".
  const fromLeft = r() < 0.5;
  const sign = fromLeft ? 1 : -1;

  const sx = -(58 + Math.floor(r() * 8)) * sign;
  const sy = -(14 + Math.floor(r() * 12));

  const x1 = (48 + Math.floor(r() * 4)) * sign;
  const y1 = (-4 + Math.floor(r() * 10));

  const x2 = -(44 + Math.floor(r() * 6)) * sign;
  const y2 = (6 + Math.floor(r() * 10));

  const ex = (r() - 0.5) * 10;
  const ey = (r() - 0.5) * 10;

  const rz0 = (r() - 0.5) * 18;
  const rz1 = rz0 + sign * (10 + r() * 10);
  const rz2 = rz1 - sign * (12 + r() * 10);

  return {
    "--sx": `${sx}vw`,
    "--sy": `${sy}vh`,
    "--mx1": `${x1}vw`,
    "--my1": `${y1}vh`,
    "--mx2": `${x2}vw`,
    "--my2": `${y2}vh`,
    "--ex": `${ex}vw`,
    "--ey": `${ey}vh`,
    "--rz0": `${rz0}deg`,
    "--rz1": `${rz1}deg`,
    "--rz2": `${rz2}deg`,
  };
}

function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
