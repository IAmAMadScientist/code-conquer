import React from "react";
import { createPortal } from "react-dom";
import ImpactFX from "./ImpactFX";

// Full-screen (pointer-events:none) overlay.
// Shows a 3D-ish D6 that rolls across the screen and settles on the rolled value.
//
// open: boolean
// value: number | null (final value; when null it keeps tumbling)
export default function DiceRollOverlay({ open, value }) {
  const [mounted, setMounted] = React.useState(false);
  const [seed, setSeed] = React.useState(() => Math.floor(Math.random() * 1e9));

  React.useEffect(() => {
    if (open) {
      setSeed(Math.floor(Math.random() * 1e9));
      setMounted(true);
    }
  }, [open]);

  // Unmount a little after the animation ends.
  React.useEffect(() => {
    if (!open && !mounted) return;
    if (!open && mounted) {
      const t = setTimeout(() => setMounted(false), 150);
      return () => clearTimeout(t);
    }
  }, [open, mounted]);

  if (!mounted) return null;

  // Random initial rotations (deterministic per seed so it feels consistent during one roll)
  const r = mulberry32(seed);
  const r1x = Math.floor(r() * 360);
  const r1y = Math.floor(r() * 360);
  const r1z = Math.floor(r() * 360);

  // Final orientation: the rolled value should face the camera (FRONT),
  // so the player can clearly read a single face at rest.
  const final = finalOrientationForFront(value);

  const path = edgeBounceTravelPath(r);
  const style = {
    "--r1x": `${r1x}deg`,
    "--r1y": `${r1y}deg`,
    "--r1z": `${r1z}deg`,
    "--fx": final.rx,
    "--fy": final.ry,
    "--fz": final.rz,
    ...path,
  };

  const landed = typeof value === "number" && value >= 1;

  return createPortal(
    <div className={`cc-diceOverlay ${open ? "is-open" : ""} ${landed ? "is-landed" : ""}`}>
      <div className="cc-diceOverlayBackdrop" />
      <div className="cc-diceOverlayTrack" style={style}>
        <div className="cc-d6Model" aria-hidden="true">
          <Face n={1} className="front" />
          <Face n={6} className="back" />
          <Face n={3} className="right" />
          <Face n={4} className="left" />
          <Face n={5} className="top" />
          <Face n={2} className="bottom" />
        </div>
        {landed ? <ImpactFX seed={seed} /> : null}
      </div>
    </div>,
    document.body
  );
}

function edgeBounceTravelPath(r) {
  // A more "physical" path: the dice only changes X direction when it "hits" an edge.
  // We approximate edges with large vw offsets (safe for most phone screens).
  const fromLeft = r() < 0.5;
  const sign = fromLeft ? 1 : -1;

  // Start slightly off-screen.
  const sx = -(58 + Math.floor(r() * 8)) * sign;
  const sy = -(14 + Math.floor(r() * 12));

  // Bounce 1: hit far edge.
  const x1 = (48 + Math.floor(r() * 4)) * sign;
  const y1 = (-4 + Math.floor(r() * 10));

  // Bounce 2: hit opposite edge.
  const x2 = -(44 + Math.floor(r() * 6)) * sign;
  const y2 = (6 + Math.floor(r() * 10));

  // Final settle near center.
  const ex = (r() - 0.5) * 10;
  const ey = (r() - 0.5) * 10;

  // Rotate direction on bounces (slight changes only at "edge hits").
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

function Face({ n, className }) {
  const pips = pipsFor(n);
  return (
    <div className={`cc-d6ModelFace ${className}`}>
      <div className="cc-d6ModelPips">
        {pips.map((p) => (
          <span key={p.key} className="cc-pip" style={{ left: p.x, top: p.y }} />
        ))}
      </div>
    </div>
  );
}

function finalOrientationForFront(value) {
  // We build the cube with faces:
  // top=5, bottom=2, front=1, back=6, right=3, left=4.
  // Rotate so that the requested value becomes FRONT (facing the camera).
  const v = Number(value);
  if (v === 1) return { rx: "0deg", ry: "0deg", rz: "0deg" }; // already front
  if (v === 2) return { rx: "90deg", ry: "0deg", rz: "0deg" }; // bottom -> front
  if (v === 3) return { rx: "0deg", ry: "-90deg", rz: "0deg" }; // right -> front
  if (v === 4) return { rx: "0deg", ry: "90deg", rz: "0deg" }; // left -> front
  if (v === 5) return { rx: "-90deg", ry: "0deg", rz: "0deg" }; // top -> front
  if (v === 6) return { rx: "0deg", ry: "180deg", rz: "0deg" }; // back -> front
  return { rx: "0deg", ry: "0deg", rz: "0deg" };
}

function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pipsFor(value) {
  const v = Number(value) || 0;
  const pos = {
    tl: { x: "12%", y: "12%" },
    tr: { x: "88%", y: "12%" },
    cl: { x: "12%", y: "50%" },
    cr: { x: "88%", y: "50%" },
    bl: { x: "12%", y: "88%" },
    br: { x: "88%", y: "88%" },
    cc: { x: "50%", y: "50%" },
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
