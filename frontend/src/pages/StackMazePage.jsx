import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Button } from "../components/ui/button";
import { cn } from "../lib/utils";
import { useLocation } from "react-router-dom";
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
      // Fog-of-war removed: it's frustrating on mobile + in short boardgame sessions.
      fog: false,
      fogRadius: 99,
      allowPreview: false,
      // Per-difficulty timer (boardgame-friendly quick session)
      timeLimitMs: 45_000,
    };
  }
  if (d === "MEDIUM") {
    return {
      size: 7,
      wallDensity: 0.22,
      maxEnergy: 22,
      stepMs: 300,
      maxStack: 20,
      // Fog-of-war removed: it's frustrating on mobile + in short boardgame sessions.
      fog: false,
      fogRadius: 99,
      allowPreview: true,
      timeLimitMs: 60_000,
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
    timeLimitMs: 75_000,
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
  const [lostReason, setLostReason] = useState(""); // "" | "energy" | "out_of_moves" | "time"
  const [energy, setEnergy] = useState(config.maxEnergy);
  const [crashes, setCrashes] = useState(0);
  const [stars, setStars] = useState(() => placeStars(grid, difficulty === "HARD" ? 4 : difficulty === "MEDIUM" ? 3 : 2));
  const [collected, setCollected] = useState(() => new Set());
  // Mobile-first UI: keep the screen clean (no preview/info panels).
  // Fog-of-war is implemented as a single soft vision mask overlay, so we don't
  // need per-tile discovery state.

  // Board measurement for smooth robot movement
  const boardRef = useRef(null);
  const rootRef = useRef(null);
  const hudRef = useRef(null);
  const trayRef = useRef(null);
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
      const trayH = trayRef.current ? trayRef.current.getBoundingClientRect().height : 0;
      const ctlH = ctlEl ? ctlEl.getBoundingClientRect().height : 180;

      // Small paddings + safe areas.
      const safeTop = 8;
      const safeBottom = 18;
      // IMPORTANT: account for the stack tray too, otherwise the board can push controls off-screen on phones.
      const availH = Math.max(200, vh - hudBottom - trayH - ctlH - safeTop - safeBottom);

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

  // Prevent vertical page scrolling on mobile during the minigame.
  useEffect(() => {
    const prev = document.body.style.overflowY;
    document.body.style.overflowY = "hidden";
    return () => {
      document.body.style.overflowY = prev;
    };
  }, []);

  // timing
  const startRef = useRef(Date.now());
  const [timeMs, setTimeMs] = useState(0);

  // Update timer during play + enforce difficulty time limit.
  useEffect(() => {
    if (status !== "playing") return;
    const t = setInterval(() => {
      const elapsed = Date.now() - startRef.current;
      setTimeMs(elapsed);
      if (config.timeLimitMs && elapsed >= config.timeLimitMs) {
        setRunning(false);
        setLostReason("time");
        setStatus("lost");
      }
    }, 120);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, config.timeLimitMs]);

  const goal = { r: size - 1, c: size - 1 };
  const statusRef = useRef(status);
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  // Live timer + timeout. (Quick sessions for hybrid boardgame.)
  useEffect(() => {
    if (status !== "playing") return;
    const id = setInterval(() => {
      const elapsed = Date.now() - startRef.current;
      setTimeMs(elapsed);
      if (config.timeLimitMs && elapsed >= config.timeLimitMs && statusRef.current === "playing") {
        setLostReason("time");
        setStatus("lost");
        setRunning(false);
      }
    }, 100);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, config.timeLimitMs]);

  // Refs for interval-safe reads
  const posRef = useRef(pos);
  const stackRef = useRef(stack);
  const energyRef = useRef(energy);
  useEffect(() => {
    posRef.current = pos;
  }, [pos]);
  useEffect(() => {
    stackRef.current = stack;
  }, [stack]);
  useEffect(() => {
    energyRef.current = energy;
  }, [energy]);

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
    setLostReason("");
    setEnergy(config.maxEnergy);
    setCrashes(0);
    setCollected(new Set());
    setStars(placeStars(g, difficulty === "HARD" ? 4 : difficulty === "MEDIUM" ? 3 : 2));
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
      if (s.length === 0) {
        // Prevent the "stuck running forever" state: if the stack is empty and
        // we're not at the goal, the run is over.
        setRunning(false);
        const p = posRef.current;
        if (!(p.r === goal.r && p.c === goal.c) && statusRef.current === "playing") {
          setLostReason("out_of_moves");
          setStatus("lost");
        }
        return s;
      }
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
      setLostReason("energy");
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

  const starTotal = stars.length;
  const starGot = collected.size;
  const timeLeftS = Math.max(0, Math.ceil((config.timeLimitMs - timeMs) / 1000));

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
      className="smxfs"
      style={{ "--smxGap": `${gap}px`, "--smxBtn": `${btn}px`, "--smxBoardPx": `${boardSizePx}px` }}
    >
      <style>{`
        /* True fullscreen: looks/feels like a mobile game */
        .smxfs{position:fixed;inset:0;z-index:50;display:flex;flex-direction:column;min-height:0;
          padding:calc(env(safe-area-inset-top) + 8px) 10px calc(env(safe-area-inset-bottom) + 10px);
          background:radial-gradient(1200px 600px at 50% -200px, rgba(99,102,241,0.22), transparent 60%),
                     linear-gradient(180deg, rgba(2,6,23,0.96), rgba(2,6,23,0.92));
          overscroll-behavior:none;
          touch-action:manipulation;
        }
        .smx-top{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:6px 2px;}
        .smx-pills{display:flex;gap:8px;align-items:center;}
        .smx-pill{display:inline-flex;align-items:center;gap:8px;padding:8px 10px;border-radius:999px;
          border:1px solid rgba(148,163,184,0.18);background:rgba(2,6,23,0.40);backdrop-filter:blur(10px);
          font-weight:850;font-size:13px;line-height:1;
          box-shadow:0 10px 28px rgba(0,0,0,0.35);
        }
        .smx-pillDim{opacity:0.85}

        .smx-boardWrap{flex:1;min-height:0;display:flex;align-items:center;justify-content:center;padding:6px 0;}
        .smx-board{position:relative;width:var(--smxBoardPx);height:var(--smxBoardPx);}
        .smx-grid{display:grid;gap:var(--smxGap, 6px);}
        .smx-cell{aspect-ratio:1/1;border-radius:18px;border:1px solid rgba(51,65,85,0.40);background:rgba(2,6,23,0.20);position:relative;overflow:hidden;}
        .smx-cell::before{content:"";position:absolute;inset:-40%;background:radial-gradient(circle at 30% 30%, rgba(99,102,241,0.16), transparent 60%);filter:blur(8px);}
        .smx-wall{background:linear-gradient(180deg, rgba(30,41,59,0.72), rgba(15,23,42,0.55));}
        .smx-wall::before{display:none}
        .smx-goal{border-color:rgba(52,211,153,0.42);box-shadow:0 0 0 2px rgba(52,211,153,0.10), inset 0 0 0 1px rgba(255,255,255,0.02);}
        .smx-starCell{display:flex;align-items:center;justify-content:center;}
        .smx-starIcon{font-size:18px;filter:drop-shadow(0 6px 14px rgba(0,0,0,0.45));}
        .smx-starCollected{opacity:0.12;filter:none}
        .smx-vision{position:absolute;inset:0;pointer-events:none;z-index:3;border-radius:22px;
          background:radial-gradient(circle at var(--fogX) var(--fogY),
            rgba(2,6,23,0.02) 0px,
            rgba(2,6,23,0.10) calc(var(--fogR) * 0.55),
            rgba(2,6,23,0.55) calc(var(--fogR) * 1.0),
            rgba(2,6,23,0.82) calc(var(--fogR) * 1.0 + 14px),
            rgba(2,6,23,0.92) 100%);
        }
        .smx-robot{position:absolute;top:0;left:0;border-radius:18px;display:flex;align-items:center;justify-content:center;
          background:linear-gradient(180deg, rgba(99,102,241,0.22), rgba(15,23,42,0.10));
          border:1px solid rgba(129,140,248,0.45);
          box-shadow:0 10px 30px rgba(0,0,0,0.45), 0 0 0 2px rgba(129,140,248,0.10);
          transition:transform 240ms cubic-bezier(.2,.9,.2,1);
        }
        .smx-robotFace{font-size:22px;filter:drop-shadow(0 6px 14px rgba(0,0,0,0.45));animation:smxBob 1.1s ease-in-out infinite;}
        @keyframes smxBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-2px)}}

        .smx-tray{padding:10px 8px;border-radius:18px;border:1px solid rgba(148,163,184,0.14);background:rgba(2,6,23,0.30);
          backdrop-filter:blur(10px);
        }
        .smx-stackScroll{display:flex;gap:8px;overflow:auto;padding-bottom:2px;}
        .smx-card{min-width:48px;height:44px;border-radius:16px;border:1px solid rgba(148,163,184,0.20);background:rgba(15,23,42,0.30);
          display:flex;align-items:center;justify-content:center;font-weight:900;
          box-shadow:inset 0 0 0 1px rgba(255,255,255,0.02);
        }
        .smx-cardTop{border-color:rgba(252,211,77,0.38);background:rgba(245,158,11,0.10);}

        .smx-controls{padding-top:10px;}
        .smx-bar{display:flex;gap:12px;align-items:center;justify-content:space-between;
          padding:12px;border-radius:22px;border:1px solid rgba(148,163,184,0.18);
          background:rgba(2,6,23,0.60);backdrop-filter:blur(10px);
        }
        .smx-dpad{display:grid;grid-template-columns:var(--smxBtn, 52px) var(--smxBtn, 52px) var(--smxBtn, 52px);
          grid-template-rows:var(--smxBtn, 52px) var(--smxBtn, 52px) var(--smxBtn, 52px);gap:8px;}
        .smx-dbtn{border-radius:18px;font-weight:900;font-size:20px;}
        .smx-dbtnGhost{opacity:0.20;pointer-events:none;}
        .smx-actions{display:grid;gap:8px;min-width:154px;}

        @media (max-width:440px){
          .smx-bar{flex-direction:column;align-items:stretch;gap:10px;padding:10px;}
          .smx-dpad{justify-content:center;align-self:center;}
          .smx-actions{min-width:unset;width:100%;}
        }
      `}</style>

      <div ref={hudRef} className="smx-top" aria-label="HUD">
        <div className="smx-pills">
          <div className="smx-pill" aria-label="Time left">⏱️ {timeLeftS}</div>
          <div className="smx-pill" aria-label="Stars">⭐ {starGot}/{starTotal}</div>
        </div>
        <div className="smx-pills">
          <div className="smx-pill smx-pillDim" aria-label="Energy">⚡ {energy}</div>
          <div className="smx-pill smx-pillDim" aria-label="Crashes">💥 {crashes}</div>
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
                      <span className={cn("smx-starIcon", starCollected && "smx-starCollected")}>⭐</span>
                    )}
                    {isGoal && (
                      <span
                        style={{
                          position: "absolute",
                          inset: 0,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 18,
                          filter: "drop-shadow(0 6px 14px rgba(0,0,0,0.45))",
                        }}
                      >
                        🏁
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {config.fog ? <div className="smx-vision" style={fogStyle || undefined} aria-hidden="true" /> : null}

          <div className="smx-robot" style={robotStyle}>
            <div className="smx-robotFace">🤖</div>
          </div>
        </div>
      </div>

      <div ref={trayRef} className="smx-tray" aria-label="Stack">
        <div className="smx-stackScroll">
          {stack.map((d, i) => (
            <div key={i} className={cn("smx-card", i === stack.length - 1 && "smx-cardTop")}>
              {d === "U" ? "↑" : d === "D" ? "↓" : d === "L" ? "←" : "→"}
            </div>
          ))}
        </div>
      </div>

      <div ref={controlsRef} className="smx-controls" aria-label="Controls">
        <div className="smx-bar">
          <div className="smx-dpad" aria-label="D-pad">
            <Button className="smx-dbtn smx-dbtnGhost" variant="ghost" />
            <Button className="smx-dbtn" onClick={() => pushMove("U")} disabled={running || status !== "playing"} aria-label="Up">↑</Button>
            <Button className="smx-dbtn smx-dbtnGhost" variant="ghost" />
            <Button className="smx-dbtn" onClick={() => pushMove("L")} disabled={running || status !== "playing"} aria-label="Left">←</Button>
            <Button className="smx-dbtn" onClick={popMove} disabled={running || status !== "playing" || stack.length === 0} variant="secondary" aria-label="Pop">↩</Button>
            <Button className="smx-dbtn" onClick={() => pushMove("R")} disabled={running || status !== "playing"} aria-label="Right">→</Button>
            <Button className="smx-dbtn smx-dbtnGhost" variant="ghost" />
            <Button className="smx-dbtn" onClick={() => pushMove("D")} disabled={running || status !== "playing"} aria-label="Down">↓</Button>
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
              style={{ height: 56, borderRadius: 18, fontWeight: 900, fontSize: 18 }}
              aria-label={running ? "Stop" : "Run"}
            >
              {running ? "⏹" : "▶"}
            </Button>
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
}
