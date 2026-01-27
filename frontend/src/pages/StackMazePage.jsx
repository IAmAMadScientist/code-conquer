import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import AppShell from "../components/AppShell";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Progress } from "../components/ui/progress";
import { cn } from "../lib/utils";
import { Link, useLocation } from "react-router-dom";
import ResultSubmitPanel from "../components/ResultSubmitPanel";
import {
  getHapticsEnabled,
  getSoundEnabled,
  playFailSfx,
  playMoveSfx,
  playUiTapSfx,
  playWinSfx,
} from "../lib/diceSound";

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function randInt(a, b) {
  return Math.floor(Math.random() * (b - a + 1)) + a;
}

function hasPath(grid) {
  const n = grid.length;
  const q = [{ r: 0, c: 0 }];
  const seen = new Set(["0,0"]);
  const dirs = [
    { dr: -1, dc: 0 },
    { dr: 1, dc: 0 },
    { dr: 0, dc: -1 },
    { dr: 0, dc: 1 },
  ];
  while (q.length) {
    const cur = q.shift();
    if (cur.r === n - 1 && cur.c === n - 1) return true;
    for (const d of dirs) {
      const nr = cur.r + d.dr;
      const nc = cur.c + d.dc;
      if (nr < 0 || nc < 0 || nr >= n || nc >= n) continue;
      if (grid[nr][nc] === 1) continue;
      const key = `${nr},${nc}`;
      if (seen.has(key)) continue;
      seen.add(key);
      q.push({ r: nr, c: nc });
    }
  }
  return false;
}

const DIRS = [
  { key: "U", dr: -1, dc: 0 },
  { key: "D", dr: 1, dc: 0 },
  { key: "L", dr: 0, dc: -1 },
  { key: "R", dr: 0, dc: 1 },
];

function reachableCells(grid) {
  const n = grid.length;
  const q = [{ r: 0, c: 0 }];
  const seen = new Set(["0,0"]);
  while (q.length) {
    const cur = q.shift();
    for (const d of DIRS) {
      const nr = cur.r + d.dr;
      const nc = cur.c + d.dc;
      if (nr < 0 || nc < 0 || nr >= n || nc >= n) continue;
      if (grid[nr][nc] === 1) continue;
      const k = `${nr},${nc}`;
      if (seen.has(k)) continue;
      seen.add(k);
      q.push({ r: nr, c: nc });
    }
  }
  return seen;
}

function placeStars(grid, count) {
  // Place collectible stars on reachable empty cells (not start/goal).
  const n = grid.length;
  const reachable = reachableCells(grid);
  const candidates = [];
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (grid[r][c] === 1) continue;
      if (r === 0 && c === 0) continue;
      if (r === n - 1 && c === n - 1) continue;
      if (!reachable.has(`${r},${c}`)) continue;
      candidates.push({ r, c });
    }
  }
  // Shuffle lightly.
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  return candidates.slice(0, Math.min(count, candidates.length));
}

function simulatePath({ grid, size, startPos, stack, energy }) {
  // Execution order is LIFO: last item executes first.
  const exec = [...stack].reverse();
  let p = { ...startPos };
  let e = energy;
  let crashes = 0;
  const path = [{ ...p }];
  for (let i = 0; i < exec.length && e > 0; i++) {
    const d = exec[i];
    const dd = DIRS.find((x) => x.key === d);
    if (!dd) continue;
    const nr = p.r + dd.dr;
    const nc = p.c + dd.dc;
    e -= 1;
    if (nr < 0 || nc < 0 || nr >= size || nc >= size || grid[nr][nc] === 1) {
      crashes += 1;
      // stay
      path.push({ ...p });
      continue;
    }
    p = { r: nr, c: nc };
    path.push({ ...p });
  }
  return { path, crashes, endPos: p, energyLeft: e };
}

function makeMaze(size, wallDensity) {
  // Ensure the level is always solvable.
  for (let attempt = 0; attempt < 40; attempt++) {
    const grid = Array.from({ length: size }, () => Array.from({ length: size }, () => 0));
    const wallCount = Math.floor(size * size * wallDensity);
    for (let k = 0; k < wallCount; k++) {
      const r = randInt(0, size - 1);
      const c = randInt(0, size - 1);
      grid[r][c] = 1;
    }
    // Keep start/goal + a small safety corridor open.
    grid[0][0] = 0;
    grid[size - 1][size - 1] = 0;
    if (size >= 2) {
      grid[0][1] = 0;
      grid[1][0] = 0;
      grid[size - 2][size - 1] = 0;
      grid[size - 1][size - 2] = 0;
    }
    if (hasPath(grid)) return grid;
  }
  // Fallback: empty grid.
  return Array.from({ length: size }, () => Array.from({ length: size }, () => 0));
}

function getConfig(difficulty) {
  const d = (difficulty || "EASY").toUpperCase();
  if (d === "HARD") {
    // HARD should be noticeably harder.
    return {
      size: 9,
      wallDensity: 0.30,
      maxEnergy: 18,
      stepMs: 260,
      maxStack: 16,
      fog: true,
      fogRadius: 1,
      allowPreview: false,
    };
  }
  if (d === "MEDIUM") {
    return {
      size: 7,
      wallDensity: 0.22,
      maxEnergy: 22,
      stepMs: 300,
      maxStack: 20,
      fog: true,
      fogRadius: 2,
      allowPreview: true,
    };
  }
  // EASY should be very easy.
  return {
    size: 5,
    wallDensity: 0.12,
    maxEnergy: 28,
    stepMs: 330,
    maxStack: 24,
    fog: false,
    fogRadius: 99,
    allowPreview: true,
  };
}

export default function StackMazePage() {
  const loc = useLocation();
  const challenge = loc.state?.challenge;
  const difficulty = challenge?.difficulty || "EASY";

  const config = getConfig(difficulty);
  const size = config.size;

  const [grid, setGrid] = useState(() => makeMaze(size, config.wallDensity));
  const [pos, setPos] = useState({ r: 0, c: 0 });
  const [stack, setStack] = useState([]);
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState("playing"); // "playing" | "won" | "lost"
  const [energy, setEnergy] = useState(config.maxEnergy);
  const [crashes, setCrashes] = useState(0);
  const [stars, setStars] = useState(() => placeStars(grid, difficulty === "HARD" ? 4 : difficulty === "MEDIUM" ? 3 : 2));
  const [collected, setCollected] = useState(() => new Set());
  const [showPreview, setShowPreview] = useState(false);
  // Fog-of-war is implemented as a single soft vision mask overlay, so we don't
  // need per-tile discovery state.

  // Board measurement for smooth robot movement
  const boardRef = useRef(null);
  const rootRef = useRef(null);
  const hudRef = useRef(null);
  const controlsRef = useRef(null);
  const [boardSizePx, setBoardSizePx] = useState(340);
  const [cellPx, setCellPx] = useState(40);
  useLayoutEffect(() => {
    function recalc() {
      // We want the *entire* grid visible without scrolling on phones.
      // Compute the available height between HUD and the sticky controls.
      const hudEl = hudRef.current;
      const ctlEl = controlsRef.current;
      const rootEl = rootRef.current;
      const vh = window.innerHeight || 700;
      const vw = window.innerWidth || 390;

      const hudBottom = hudEl ? hudEl.getBoundingClientRect().bottom : (rootEl ? rootEl.getBoundingClientRect().top : 0);
      const ctlH = ctlEl ? ctlEl.getBoundingClientRect().height : 180;

      // Small paddings + safe areas.
      const safeTop = 8;
      const safeBottom = 18;
      const availH = Math.max(220, vh - hudBottom - ctlH - safeTop - safeBottom);

      // Board should fit both width and available height.
      const maxW = Math.min(vw * 0.94, 520);
      const maxH = Math.min(availH, 520);
      const px = Math.max(240, Math.floor(Math.min(maxW, maxH)));
      setBoardSizePx(px);
      setCellPx(px / size);
    }
    recalc();
    window.addEventListener("resize", recalc);
    return () => window.removeEventListener("resize", recalc);
  }, [size]);

  // timing
  const startRef = useRef(Date.now());
  const [timeMs, setTimeMs] = useState(0);

  const goal = { r: size - 1, c: size - 1 };

  function haptic(ms = 12) {
    try {
      if (!getHapticsEnabled()) return;
      if (navigator.vibrate) navigator.vibrate(ms);
    } catch {
      // ignore
    }
  }

  function sfx(fn) {
    try {
      if (!getSoundEnabled()) return;
      fn();
    } catch {
      // ignore
    }
  }

  function reset() {
    startRef.current = Date.now();
    setTimeMs(0);
    const g = makeMaze(size, config.wallDensity);
    setGrid(g);
    setPos({ r: 0, c: 0 });
    setStack([]);
    setRunning(false);
    setStatus("playing");
    setEnergy(config.maxEnergy);
    setCrashes(0);
    setCollected(new Set());
    setStars(placeStars(g, difficulty === "HARD" ? 4 : difficulty === "MEDIUM" ? 3 : 2));
    setShowPreview(false);
  }

  function pushMove(d) {
    if (status !== "playing" || running) return;
    if (stack.length >= (config.maxStack || 20)) return;
    haptic(8);
    sfx(playUiTapSfx);
    setStack((s) => s.concat(d));
  }

  function popMove() {
    if (status !== "playing" || running) return;
    haptic(8);
    sfx(playUiTapSfx);
    setStack((s) => s.slice(0, -1));
  }

  function stepOnce() {
    setStack((s) => {
      if (s.length === 0) return s;
      const d = s[s.length - 1];
      const next = s.slice(0, -1);
      setEnergy((e) => e - 1);
      setPos((p) => {
        let nr = p.r, nc = p.c;
        if (d === "U") nr--;
        if (d === "D") nr++;
        if (d === "L") nc--;
        if (d === "R") nc++;

        if (nr < 0 || nc < 0 || nr >= size || nc >= size || grid[nr][nc] === 1) {
          setCrashes((x) => x + 1);
          haptic(18);
          sfx(playFailSfx);
          return p;
        }
        sfx(playMoveSfx);
        return { r: nr, c: nc };
      });
      return next;
    });
  }

  useEffect(() => {
    if (!running) return;
    if (status !== "playing") return;
    const t = setInterval(() => stepOnce(), config.stepMs);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, status]);

  useEffect(() => {
    if (status !== "playing") return;

    // Collect stars.
    const starHere = stars.find((s) => s.r === pos.r && s.c === pos.c);
    if (starHere) {
      const k = `${starHere.r},${starHere.c}`;
      if (!collected.has(k)) {
        setCollected((prev) => {
          const n = new Set(prev);
          n.add(k);
          return n;
        });
        haptic(16);
        sfx(playUiTapSfx);
      }
    }

    if (pos.r === goal.r && pos.c === goal.c) {
      setStatus("won");
      setRunning(false);
    } else if (energy <= 0) {
      setStatus("lost");
      setRunning(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pos, energy, status, stars, collected]);

  // Win/loss SFX
  useEffect(() => {
    if (status === "won") {
      haptic(28);
      sfx(playWinSfx);
    }
    if (status === "lost") {
      haptic(24);
      sfx(playFailSfx);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  // stop timer on finish
  useEffect(() => {
    if (status === "playing") return;
    setTimeMs(Date.now() - startRef.current);
  }, [status]);

  // freeze time when finished
  useEffect(() => {
    if (status === "playing") return;
    setTimeMs(Date.now() - startRef.current);
  }, [status]);

  const energyPct = Math.round((energy / config.maxEnergy) * 100);

  return (
    <AppShell
      title="Code & Conquer"
      subtitle="Stack Maze — plan the stack, grab stars, reach the goal"
      headerBadges={
        <>
          <Badge>Category: STACK_MAZE</Badge>
          <Badge>Stars: {collected.size}/{stars.length}</Badge>
          <Badge>Energy: {energy}</Badge>
          <Badge>Crashes: {crashes}</Badge>
          {status === "won" && <Badge style={{ borderColor: "rgba(52,211,153,0.35)" }}>WON</Badge>}
          {status === "lost" && <Badge style={{ borderColor: "rgba(251,113,133,0.35)" }}>LOST</Badge>}
        </>
      }
      rightPanel={
        <div className="panel">
          <div style={{ fontSize: 16, fontWeight: 650 }}>How it works</div>
          <div className="muted" style={{ marginTop: 10, fontSize: 14 }}>
            You build a stack of moves. On Run, moves are popped from the top (LIFO).
          </div>
          <div style={{ marginTop: 12 }}>
            <Link to="/play">
              <Button variant="ghost">Back to game</Button>
            </Link>
          </div>
        </div>
      }
    >
      {(() => {
        const starTotal = stars.length;
        const starGot = collected.size;
        const preview = (config.allowPreview && showPreview)
          ? simulatePath({ grid, size, startPos: pos, stack, energy })
          : null;

        const robotStyle = {
          width: Math.max(22, cellPx * 0.62),
          height: Math.max(22, cellPx * 0.62),
          transform: `translate(${pos.c * cellPx}px, ${pos.r * cellPx}px)`,
        };

        // Fit the board reliably on phones.
        const gap = size >= 9 ? 4 : size >= 7 ? 5 : 6;
        const btn = size >= 9 ? 48 : 52;

        // Vision/fog as a *single* soft mask overlay (more gamey than per-tile darkening).
        const fogR = (config.fogRadius ?? 2) + 0.9;
        const fogStyle = config.fog
          ? {
              "--fogX": `${(pos.c + 0.5) * cellPx}px`,
              "--fogY": `${(pos.r + 0.5) * cellPx}px`,
              "--fogR": `${fogR * cellPx}px`,
            }
          : null;

        return (
          <div
            ref={rootRef}
            className="smx"
            style={{ "--smxGap": `${gap}px`, "--smxBtn": `${btn}px`, "--smxBoardPx": `${boardSizePx}px` }}
          >
            <style>{`
              .smx{display:grid;gap:12px;}
              .smx-hud{display:grid;gap:10px;}
              .smx-hudRow{display:flex;gap:10px;align-items:center;justify-content:space-between;}
              .smx-title{font-weight:750;font-size:16px;letter-spacing:-0.01em;}
              .smx-mini{font-size:12px;opacity:0.72}

              .smx-pill{display:inline-flex;align-items:center;gap:8px;padding:8px 10px;border-radius:999px;border:1px solid rgba(148,163,184,0.20);background:rgba(2,6,23,0.25);}
              .smx-stars{display:inline-flex;align-items:center;gap:6px;}
              .smx-star{filter:drop-shadow(0 6px 14px rgba(0,0,0,0.45));}
              .smx-starDim{opacity:0.25}

              .smx-boardWrap{display:flex;justify-content:center;}
              .smx-board{position:relative;width:var(--smxBoardPx);height:var(--smxBoardPx);}
              .smx-grid{display:grid;gap:var(--smxGap, 6px);}
              .smx-cell{aspect-ratio:1/1;border-radius:18px;border:1px solid rgba(51,65,85,0.40);background:rgba(2,6,23,0.20);position:relative;overflow:hidden;}
              .smx-cell::before{content:"";position:absolute;inset:-40%;background:radial-gradient(circle at 30% 30%, rgba(99,102,241,0.16), transparent 60%);filter:blur(8px);}
              .smx-wall{background:linear-gradient(180deg, rgba(30,41,59,0.72), rgba(15,23,42,0.55));}
              .smx-wall::before{display:none}
              .smx-vision{position:absolute;inset:0;pointer-events:none;z-index:3;border-radius:22px;
                background:radial-gradient(circle at var(--fogX) var(--fogY),
                  rgba(2,6,23,0.02) 0px,
                  rgba(2,6,23,0.10) calc(var(--fogR) * 0.55),
                  rgba(2,6,23,0.55) calc(var(--fogR) * 1.0),
                  rgba(2,6,23,0.82) calc(var(--fogR) * 1.0 + 14px),
                  rgba(2,6,23,0.92) 100%);
              }
              .smx-goal{border-color:rgba(52,211,153,0.42);box-shadow:0 0 0 2px rgba(52,211,153,0.10), inset 0 0 0 1px rgba(255,255,255,0.02);}

              .smx-starCell{display:flex;align-items:center;justify-content:center;}
              .smx-starIcon{font-size:18px;filter:drop-shadow(0 6px 14px rgba(0,0,0,0.45));}
              .smx-starCollected{opacity:0.12;filter:none}

              .smx-previewNum{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;color:rgba(226,232,240,0.90);text-shadow:0 8px 18px rgba(0,0,0,0.7);}
              .smx-previewRing{position:absolute;inset:14%;border-radius:999px;border:2px solid rgba(252,211,77,0.50);box-shadow:0 0 0 2px rgba(252,211,77,0.10)}

              .smx-robot{position:absolute;top:0;left:0;border-radius:18px;display:flex;align-items:center;justify-content:center;
                background:linear-gradient(180deg, rgba(99,102,241,0.22), rgba(15,23,42,0.10));
                border:1px solid rgba(129,140,248,0.45);
                box-shadow:0 10px 30px rgba(0,0,0,0.45), 0 0 0 2px rgba(129,140,248,0.10);
                transition:transform 240ms cubic-bezier(.2,.9,.2,1);
              }
              .smx-robotFace{font-size:22px;filter:drop-shadow(0 6px 14px rgba(0,0,0,0.45));animation:smxBob 1.1s ease-in-out infinite;}
              @keyframes smxBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-2px)}}

              .smx-tray{display:grid;gap:8px;padding:12px;border-radius:18px;border:1px solid rgba(148,163,184,0.18);background:rgba(2,6,23,0.22);}
              .smx-trayTop{display:flex;align-items:center;justify-content:space-between;gap:10px;}
              .smx-stackScroll{display:flex;gap:8px;overflow:auto;padding-bottom:2px;}
              .smx-card{min-width:48px;height:44px;border-radius:16px;border:1px solid rgba(148,163,184,0.20);background:rgba(15,23,42,0.30);
                display:flex;align-items:center;justify-content:center;font-weight:900;
                box-shadow:inset 0 0 0 1px rgba(255,255,255,0.02);
              }
              .smx-cardTop{border-color:rgba(252,211,77,0.38);background:rgba(245,158,11,0.10);}

              .smx-controls{position:sticky;bottom:0;z-index:5;margin-top:4px;padding-bottom:calc(env(safe-area-inset-bottom) + 10px);}
              .smx-bar{display:flex;gap:12px;align-items:center;justify-content:space-between;
                padding:12px;border-radius:22px;border:1px solid rgba(148,163,184,0.18);
                background:rgba(2,6,23,0.55);backdrop-filter:blur(10px);
              }
              .smx-dpad{display:grid;grid-template-columns:var(--smxBtn, 52px) var(--smxBtn, 52px) var(--smxBtn, 52px);grid-template-rows:var(--smxBtn, 52px) var(--smxBtn, 52px) var(--smxBtn, 52px);gap:8px;}
              .smx-dbtn{border-radius:18px;font-weight:900;}
              .smx-dbtnGhost{opacity:0.28;pointer-events:none;}
              .smx-actions{display:grid;gap:8px;min-width:154px;}
              .smx-actionsRow{display:flex;gap:8px;}

              @media (max-width:520px){
                .smx-cell{border-radius:16px}
                .smx-board{width:min(95vw, 58vh, 480px)}
              }
            `}</style>

            <div ref={hudRef} className="smx-hud">
              <div className="smx-hudRow">
                <div>
                  <div className="smx-title">Stack Maze</div>
                  <div className="smx-mini">Program 🤖 with a Stack (LIFO). Collect ⭐ then reach 🏁.</div>
                </div>
                <div className="smx-pill">
                  <div className="smx-stars" aria-label="Stars">
                    {Array.from({ length: starTotal }).map((_, i) => (
                      <span key={i} className={cn("smx-star", i < starGot ? "" : "smx-starDim")}>
                        ⭐
                      </span>
                    ))}
                  </div>
                  <div className="muted" style={{ fontSize: 12 }}>
                    {starGot}/{starTotal}
                  </div>
                </div>
              </div>

              <div className="smx-hudRow" style={{ gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <Progress value={energyPct} />
                  <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
                    Energy: <strong>{energy}</strong> · Crashes: <strong>{crashes}</strong> · {difficulty} · {size}×{size}
                  </div>
                </div>
                <Button
                  variant={showPreview ? "secondary" : "ghost"}
                  disabled={!config.allowPreview || running || status !== "playing"}
                  onClick={() => {
                    haptic(10);
                    sfx(playUiTapSfx);
                    setShowPreview((x) => !x);
                  }}
                >
                  {!config.allowPreview ? "No preview" : showPreview ? "Hide" : "Preview"}
                </Button>
              </div>
            </div>

            <div className="smx-boardWrap">
              <div className="smx-board" ref={boardRef}>
                <div className="smx-grid" style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}>
                  {grid.map((row, r) =>
                    row.map((cell, c) => {
                      const isGoal = goal.r === r && goal.c === c;
                      const isWall = cell === 1;
                      const star = stars.find((s) => s.r === r && s.c === c);
                      const starKey = star ? `${star.r},${star.c}` : null;
                      const hasStar = Boolean(star);
                      const starCollected = starKey ? collected.has(starKey) : false;

                      let previewIndex = -1;
                      if (preview && !isWall) {
                        previewIndex = preview.path.findIndex((p) => p.r === r && p.c === c);
                      }

                      return (
                        <div
                          key={`${r}-${c}`}
                          className={cn(
                            "smx-cell",
                            isWall && "smx-wall",
                            isGoal && "smx-goal",
                            hasStar && "smx-starCell",
                          )}
                        >
                          {hasStar && (
                            <span className={cn("smx-starIcon", starCollected && "smx-starCollected")}>
                              ⭐
                            </span>
                          )}
                          {isGoal && (
                            <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, filter: "drop-shadow(0 6px 14px rgba(0,0,0,0.45))" }}>
                              🏁
                            </span>
                          )}

                          {preview && previewIndex > 0 && (
                            <>
                              <div className="smx-previewRing" />
                              <div className="smx-previewNum">{previewIndex}</div>
                            </>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {config.fog ? (
                  <div
                    className="smx-vision"
                    style={fogStyle || undefined}
                    aria-hidden="true"
                  />
                ) : null}

                <div className="smx-robot" style={robotStyle}>
                  <div className="smx-robotFace">🤖</div>
                </div>
              </div>
            </div>

            <div className="smx-tray">
              <div className="smx-trayTop">
                <div style={{ fontWeight: 750 }}>Move stack</div>
                <div className="muted" style={{ fontSize: 12 }}>
                  Top executes next (LIFO)
                </div>
              </div>
              <div className="smx-stackScroll" aria-label="Stack">
                {stack.length === 0 ? (
                  <div className="muted">Tap the D-pad to add moves.</div>
                ) : (
                  stack.map((d, i) => (
                    <div key={i} className={cn("smx-card", i === stack.length - 1 && "smx-cardTop")}>
                      {d === "U" ? "↑" : d === "D" ? "↓" : d === "L" ? "←" : "→"}
                    </div>
                  ))
                )}
              </div>
              {showPreview && preview && (
                <div className="muted" style={{ fontSize: 12 }}>
                  Preview ends at <strong>({preview.endPos.r + 1},{preview.endPos.c + 1})</strong> · energy left <strong>{preview.energyLeft}</strong> · crashes <strong>{preview.crashes}</strong>
                </div>
              )}
            </div>

            <div ref={controlsRef} className="smx-controls">
              <div className="smx-bar">
                <div className="smx-dpad" aria-label="D-pad">
                  <Button className="smx-dbtn smx-dbtnGhost" variant="ghost" />
                  <Button className="smx-dbtn" onClick={() => pushMove("U")} disabled={running || status !== "playing"}>↑</Button>
                  <Button className="smx-dbtn smx-dbtnGhost" variant="ghost" />
                  <Button className="smx-dbtn" onClick={() => pushMove("L")} disabled={running || status !== "playing"}>←</Button>
                  <Button className="smx-dbtn" onClick={popMove} disabled={running || status !== "playing" || stack.length === 0} variant="secondary">↩</Button>
                  <Button className="smx-dbtn" onClick={() => pushMove("R")} disabled={running || status !== "playing"}>→</Button>
                  <Button className="smx-dbtn smx-dbtnGhost" variant="ghost" />
                  <Button className="smx-dbtn" onClick={() => pushMove("D")} disabled={running || status !== "playing"}>↓</Button>
                  <Button className="smx-dbtn smx-dbtnGhost" variant="ghost" />
                </div>

                <div className="smx-actions">
                  <Button
                    onClick={() => {
                      haptic(12);
                      sfx(playUiTapSfx);
                      setRunning((x) => !x);
                    }}
                    disabled={status !== "playing" || stack.length === 0}
                    variant={running ? "danger" : "success"}
                    style={{ height: 52, borderRadius: 18, fontWeight: 800 }}
                  >
                    {running ? "Stop" : "Run"}
                  </Button>
                  <div className="smx-actionsRow">
                    <Button onClick={reset} variant="ghost" disabled={running} style={{ flex: 1, borderRadius: 18 }}>
                      New
                    </Button>
                    <Link to="/play" style={{ flex: 1 }}>
                      <Button variant="ghost" style={{ width: "100%", borderRadius: 18 }}>
                        Back
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {status !== "playing" && (
              <ResultSubmitPanel
                category="STACK_MAZE"
                difficulty={difficulty}
                timeMs={timeMs}
                errors={crashes}
                won={status === "won"}
                onPlayAgain={reset}
                challengeId={challenge?.challengeInstanceId}
              />
            )}
          </div>
        );
      })()}
    </AppShell>
  );
}
