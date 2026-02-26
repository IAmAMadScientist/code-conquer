import { DIFFICULTY, UI_STRINGS } from "../lib/constants";
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { cn } from "../lib/utils";
import { useLocation } from "react-router-dom";
import ResultSubmitPanel from "../components/ResultSubmitPanel";
import TutorialModal from "../components/TutorialModal";
import { getPlayer } from "../lib/player";
import { getTutorial, tutorialKey } from "../lib/tutorials";
import {
  getHapticsEnabled,
  getSoundEnabled,
  playFailSfx,
  playMoveSfx,
  playUiTapSfx,
  playWinSfx,
} from "../lib/diceSound";

function randInt(a, b) {
  return Math.floor(Math.random() * (b - a + 1)) + a;
}

function hasPath(grid) {
  const n = grid.length;
  const q = [{ r: 0, c: 0 }];
  const seen = new Set(["0,0"]);
  const dirs = [{ dr: -1, dc: 0 }, { dr: 1, dc: 0 }, { dr: 0, dc: -1 }, { dr: 0, dc: 1 }];
  while (q.length) {
    const cur = q.shift();
    if (cur.r === n - 1 && cur.c === n - 1) return true;
    for (const d of dirs) {
      const nr = cur.r + d.dr, nc = cur.c + d.dc;
      if (nr < 0 || nc < 0 || nr >= n || nc >= n || grid[nr][nc] === 1) continue;
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
      const nr = cur.r + d.dr, nc = cur.c + d.dc;
      if (nr < 0 || nc < 0 || nr >= n || nc >= n || grid[nr][nc] === 1) continue;
      const k = `${nr},${nc}`;
      if (seen.has(k)) continue;
      seen.add(k);
      q.push({ r: nr, c: nc });
    }
  }
  return seen;
}

function placeStars(grid, count) {
  const n = grid.length;
  const reachable = reachableCells(grid);
  const candidates = [];
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (grid[r][c] === 1 || (r === 0 && c === 0) || (r === n - 1 && c === n - 1) || !reachable.has(`${r},${c}`)) continue;
      candidates.push({ r, c });
    }
  }
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  return candidates.slice(0, Math.min(count, candidates.length));
}

function makeMaze(size, wallDensity) {
  for (let attempt = 0; attempt < 40; attempt++) {
    const grid = Array.from({ length: size }, () => Array.from({ length: size }, () => 0));
    const wallCount = Math.floor(size * size * wallDensity);
    for (let k = 0; k < wallCount; k++) {
      const r = randInt(0, size - 1), c = randInt(0, size - 1);
      grid[r][c] = 1;
    }
    grid[0][0] = 0; grid[size - 1][size - 1] = 0;
    if (size >= 2) {
      grid[0][1] = 0; grid[1][0] = 0;
      grid[size - 2][size - 1] = 0; grid[size - 1][size - 2] = 0;
    }
    if (hasPath(grid)) return grid;
  }
  return Array.from({ length: size }, () => Array.from({ length: size }, () => 0));
}

function getConfig(difficulty) {
  const d = (difficulty || DIFFICULTY.EASY).toUpperCase();
  if (d === DIFFICULTY.HARD) return { size: 9, wallDensity: 0.30, maxEnergy: 18, stepMs: 220, maxStack: 16, timeLimitMs: 45_000 };
  if (d === DIFFICULTY.MEDIUM) return { size: 7, wallDensity: 0.22, maxEnergy: 22, stepMs: 260, maxStack: 20, timeLimitMs: 60_000 };
  return { size: 5, wallDensity: 0.12, maxEnergy: 28, stepMs: 300, maxStack: 24, timeLimitMs: 75_000 };
}

export default function StackMazePage() {
  const loc = useLocation();
  const challenge = loc.state?.challenge;
  const difficulty = challenge?.difficulty || DIFFICULTY.EASY;
  const config = useMemo(() => getConfig(difficulty), [difficulty]);
  const size = config.size;

  const player = useMemo(() => getPlayer(), []);
  const tutorial = useMemo(() => getTutorial("STACK_MAZE"), []);
  const tutKey = useMemo(() => tutorialKey({ playerId: player?.playerId, category: "STACK_MAZE" }), [player?.playerId]);

  const [tutorialOpen, setTutorialOpen] = useState(() => {
    if (!challenge) return false;
    try { return localStorage.getItem(tutKey) !== "1"; } catch { return false; }
  });

  const [started, setStarted] = useState(() => !tutorialOpen);
  const [grid, setGrid] = useState(() => makeMaze(size, config.wallDensity));
  const [pos, setPos] = useState({ r: 0, c: 0 });
  const [stack, setStack] = useState([]);
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState(() => (tutorialOpen ? "waiting" : "playing"));
  const [lostReason, setLostReason] = useState("");
  const [energy, setEnergy] = useState(config.maxEnergy);
  const [crashes, setCrashes] = useState(0);
  const [stars, setStars] = useState(() => placeStars(grid, difficulty === DIFFICULTY.HARD ? 4 : difficulty === DIFFICULTY.MEDIUM ? 3 : 2));
  const [collected, setCollected] = useState(() => new Set());

  const rootRef = useRef(null);
  const hudRef = useRef(null);
  const trayRef = useRef(null);
  const controlsRef = useRef(null);
  const [boardSizePx, setBoardSizePx] = useState(300);
  const [cellPx, setCellPx] = useState(40);

  useLayoutEffect(() => {
    function recalc() {
      const vh = window.innerHeight, vw = window.innerWidth;
      const hudH = hudRef.current?.offsetHeight || 40;
      const trayH = trayRef.current?.offsetHeight || 60;
      const ctlH = controlsRef.current?.offsetHeight || 160;
      const availH = vh - hudH - trayH - ctlH - 80;
      const px = Math.floor(Math.min(vw - 32, availH, 500));
      setBoardSizePx(px);
      setCellPx(px / size);
    }
    recalc();
    window.addEventListener("resize", recalc);
    return () => window.removeEventListener("resize", recalc);
  }, [size]);

  const startRef = useRef(Date.now());
  const [timeMs, setTimeMs] = useState(0);

  useEffect(() => {
    if (!started || status !== "playing") return;
    const t = setInterval(() => {
      const elapsed = Date.now() - startRef.current;
      setTimeMs(elapsed);
      if (config.timeLimitMs && elapsed >= config.timeLimitMs) {
        setRunning(false); setLostReason("time"); setStatus("lost");
      }
    }, 100);
    return () => clearInterval(t);
  }, [started, status, config.timeLimitMs]);

  const goal = { r: size - 1, c: size - 1 };
  const posRef = useRef(pos);
  useEffect(() => { posRef.current = pos; }, [pos]);

  function haptic(ms = 12) { if (getHapticsEnabled() && navigator.vibrate) navigator.vibrate(ms); }
  function sfx(fn) { if (getSoundEnabled()) fn(); }

  function reset() {
    startRef.current = Date.now(); setTimeMs(0);
    const g = makeMaze(size, config.wallDensity);
    setGrid(g); setPos({ r: 0, c: 0 }); setStack([]); setRunning(false);
    setStatus("playing"); setLostReason(""); setEnergy(config.maxEnergy);
    setCrashes(0); setCollected(new Set());
    setStars(placeStars(g, difficulty === DIFFICULTY.HARD ? 4 : difficulty === DIFFICULTY.MEDIUM ? 3 : 2));
  }

  function pushMove(d) {
    if (status !== "playing" || running || stack.length >= config.maxStack) return;
    haptic(8); sfx(playUiTapSfx);
    setStack((s) => s.concat(d));
  }

  function popMove() {
    if (status !== "playing" || running || stack.length === 0) return;
    haptic(8); sfx(playUiTapSfx);
    setStack((s) => s.slice(0, -1));
  }

  function stepOnce() {
    setStack((s) => {
      if (s.length === 0) {
        setRunning(false);
        if (!(posRef.current.r === goal.r && posRef.current.c === goal.c)) {
          setLostReason("out_of_moves"); setStatus("lost");
        }
        return s;
      }
      const d = s[s.length - 1];
      setEnergy((e) => e - 1);
      setPos((p) => {
        let nr = p.r, nc = p.c;
        if (d === "U") nr--; else if (d === "D") nr++; else if (d === "L") nc--; else if (d === "R") nc++;
        if (nr < 0 || nc < 0 || nr >= size || nc >= size || grid[nr][nc] === 1) {
          setCrashes((x) => x + 1); haptic(18); sfx(playFailSfx); return p;
        }
        sfx(playMoveSfx); return { r: nr, c: nc };
      });
      return s.slice(0, -1);
    });
  }

  useEffect(() => {
    if (!running || status !== "playing") return;
    const t = setInterval(stepOnce, config.stepMs);
    return () => clearInterval(t);
  }, [running, status, config.stepMs]);

  useEffect(() => {
    if (status !== "playing") return;
    const starHere = stars.find((s) => s.r === pos.r && s.c === pos.c);
    if (starHere) {
      const k = `${starHere.r},${starHere.c}`;
      if (!collected.has(k)) {
        setCollected((prev) => new Set(prev).add(k));
        haptic(16); sfx(playUiTapSfx);
      }
    }
    if (pos.r === goal.r && pos.c === goal.c) { setStatus("won"); setRunning(false); }
    else if (energy <= 0) { setLostReason("energy"); setStatus("lost"); setRunning(false); }
  }, [pos, energy, status, stars, collected]);

  useEffect(() => {
    if (status === "won") { haptic(28); sfx(playWinSfx); }
    if (status === "lost") { haptic(24); sfx(playFailSfx); }
  }, [status]);

  const timeLeftS = Math.max(0, Math.ceil((config.timeLimitMs - timeMs) / 1000));

  return (
    <div ref={rootRef} className="h-full flex flex-col bg-bg0 text-text overflow-hidden p-s3 sm:p-s4">
      {/* HUD */}
      <div ref={hudRef} className="flex justify-between items-center mb-s3 animate-in fade-in slide-in-from-top-2 duration-300">
        <div className="flex gap-2">
          <Badge variant="secondary" className="px-3 py-1 font-bold">⏱️ {timeLeftS}s</Badge>
          <Badge variant="secondary" className="px-3 py-1 font-bold">⭐ {collected.size}/{stars.length}</Badge>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className={cn("px-3 py-1 font-bold transition-colors", energy < 5 ? "bg-rose-500/20 border-rose-500/40 text-rose-300" : "bg-indigo-500/10 border-indigo-500/30 text-indigo-200")}>
            ⚡ {energy}
          </Badge>
          <Badge variant="outline" className="px-3 py-1 font-bold text-muted opacity-70">💥 {crashes}</Badge>
        </div>
      </div>

      {/* Board Container */}
      <div className="flex-1 flex items-center justify-center min-h-0 py-2">
        <div 
          className="relative bg-bg1/40 rounded-2xl border border-border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500"
          style={{ width: boardSizePx, height: boardSizePx }}
        >
          {/* Grid Layer */}
          <div 
            className="grid h-full w-full" 
            style={{ 
              gridTemplateColumns: `repeat(${size}, 1fr)`,
              gridTemplateRows: `repeat(${size}, 1fr)` 
            }}
          >
            {grid.map((row, r) => row.map((cell, c) => (
              <div 
                key={`${r}-${c}`} 
                className={cn(
                  "relative flex items-center justify-center border border-white/5",
                  cell === 1 ? "bg-slate-800/80" : "bg-bg0/30",
                  goal.r === r && goal.c === c && "bg-emerald-500/10"
                )}
              >
                {stars.find(s => s.r === r && s.c === c) && (
                  <span className={cn("text-lg drop-shadow-md", collected.has(`${r},${c}`) ? "opacity-10 scale-50" : "animate-pulse")}>⭐</span>
                )}
                {goal.r === r && goal.c === c && <span className="text-xl animate-bounce">🏁</span>}
              </div>
            )))}
          </div>
          
          {/* Actor Layer (Robot) */}
          <div 
            className="absolute top-0 left-0 transition-all duration-200 flex items-center justify-center z-20 pointer-events-none"
            style={{ 
              width: cellPx, height: cellPx, 
              transform: `translate(${pos.c * cellPx}px, ${pos.r * cellPx}px)` 
            }}
          >
            <div className="text-2xl drop-shadow-[0_0_10px_rgba(99,102,241,0.8)] animate-bounce" style={{ animationDuration: '2s' }}>
              🤖
            </div>
          </div>
        </div>
      </div>

      {/* Tray */}
      <div ref={trayRef} className="my-s3 p-s3 rounded-2xl bg-surface border border-border overflow-hidden">
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar min-h-[44px]">
          {stack.length === 0 && <div className="w-full flex items-center justify-center text-xs text-muted/40 italic">Building stack...</div>}
          {stack.map((d, i) => (
            <div key={i} className={cn("flex-none w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg border transition-all", i === stack.length - 1 ? "bg-indigo-500 border-indigo-300 shadow-lg scale-105 z-10" : "bg-bg2 border-border text-muted")}>
              {d === "U" ? "↑" : d === "D" ? "↓" : d === "L" ? "←" : "→"}
            </div>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div ref={controlsRef} className="flex gap-s4 items-center justify-between pb-s2">
        <div className="grid grid-cols-3 gap-2">
          <div />
          <ControlButton onClick={() => pushMove("U")} icon="↑" disabled={running} />
          <div />
          <ControlButton onClick={() => pushMove("L")} icon="←" disabled={running} />
          <ControlButton onClick={popMove} icon="↩" disabled={running || stack.length === 0} variant="secondary" />
          <ControlButton onClick={() => pushMove("R")} icon="→" disabled={running} />
          <div />
          <ControlButton onClick={() => pushMove("D")} icon="↓" disabled={running} />
          <div />
        </div>

        {/* Action Button */}
        <div className="flex-1 flex flex-col gap-2 pl-s2">
          <Button
            onClick={() => { haptic(12); sfx(playUiTapSfx); setRunning(!running); }}
            disabled={status !== "playing" || stack.length === 0}
            variant={running ? "danger" : "primary"}
            className="h-16 rounded-2xl text-xl font-black shadow-xl"
          >
            {running ? "⏹ STOP" : "▶ RUN"}
          </Button>
        </div>
      </div>

      {(status === "won" || status === "lost") && (
        <ResultSubmitPanel
          category="STACK_MAZE" difficulty={difficulty} timeMs={timeMs} errors={crashes}
          won={status === "won"} challengeId={challenge?.challengeInstanceId}
          explanation={status === "won" ? UI_STRINGS.MAZE_GOAL_REACHED : UI_STRINGS[`MAZE_${lostReason.toUpperCase()}_OUT`] || UI_STRINGS.MAZE_GENERIC_LOSS}
        />
      )}

      <TutorialModal open={tutorialOpen} tutorial={tutorial} onConfirm={() => {
        try { localStorage.setItem(tutKey, "1"); } catch {}
        setTutorialOpen(false); setStarted(true); setStatus("playing");
        startRef.current = Date.now(); setTimeMs(0);
      }} />
    </div>
  );
}

function ControlButton({ onClick, icon, disabled, variant = "primary" }) {
  return (
    <button
      type="button" onClick={onClick} disabled={disabled}
      className={cn(
        "w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold border transition-all active:scale-90 disabled:opacity-20",
        variant === "primary" ? "bg-bg2 border-border text-text" : "bg-indigo-500/10 border-indigo-500/30 text-indigo-300"
      )}
    >
      {icon}
    </button>
  );
}