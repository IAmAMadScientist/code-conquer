import React, { useEffect, useRef, useState } from "react";
import AppShell from "../components/AppShell";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Progress } from "../components/ui/progress";
import { cn } from "../lib/utils";
import { Link, useLocation } from "react-router-dom";
import ResultSubmitPanel from "../components/ResultSubmitPanel";

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
    return { size: 10, wallDensity: 0.24, maxEnergy: 22, stepMs: 280 };
  }
  if (d === "MEDIUM") {
    return { size: 8, wallDensity: 0.19, maxEnergy: 20, stepMs: 320 };
  }
  return { size: 6, wallDensity: 0.13, maxEnergy: 18, stepMs: 350 };
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

  // timing
  const startRef = useRef(Date.now());
  const [timeMs, setTimeMs] = useState(0);

  const goal = { r: size - 1, c: size - 1 };

  function reset() {
    startRef.current = Date.now();
    setTimeMs(0);
    setGrid(makeMaze(size, config.wallDensity));
    setPos({ r: 0, c: 0 });
    setStack([]);
    setRunning(false);
    setStatus("playing");
    setEnergy(config.maxEnergy);
    setCrashes(0);
  }

  function pushMove(d) {
    if (status !== "playing" || running) return;
    if (stack.length >= 20) return;
    setStack((s) => s.concat(d));
  }

  function popMove() {
    if (status !== "playing" || running) return;
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
          return p;
        }
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

    if (pos.r === goal.r && pos.c === goal.c) {
      setStatus("won");
      setRunning(false);
    } else if (energy <= 0) {
      setStatus("lost");
      setRunning(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pos, energy, status]);

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
      subtitle="Stack Maze (LIFO) — a category minigame"
      headerBadges={
        <>
          <Badge>Category: STACK_MAZE</Badge>
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
            <Link to="/categories">
              <Button variant="ghost">Back to categories</Button>
            </Link>
          </div>
        </div>
      }
    >
      <div style={{ display: "grid", gap: 12 }}>
        <style>{`
          .sm-boardWrap{display:flex;justify-content:center;}
          .sm-board{width:min(92vw, 640px);}
          .sm-grid{display:grid;gap:8px;}
          .sm-cell{aspect-ratio:1/1;display:flex;align-items:center;justify-content:center;border-radius:18px;border:1px solid rgba(51,65,85,0.45);background:rgba(2,6,23,0.20);box-shadow:inset 0 0 0 1px rgba(255,255,255,0.02);position:relative;overflow:hidden;}
          .sm-cellWall{background:linear-gradient(180deg, rgba(30,41,59,0.60), rgba(15,23,42,0.55));}
          .sm-cellGoal{border-color:rgba(52,211,153,0.40);box-shadow:0 0 0 2px rgba(52,211,153,0.10), inset 0 0 0 1px rgba(255,255,255,0.02);}
          .sm-cellMe{border-color:rgba(129,140,248,0.45);box-shadow:0 0 0 2px rgba(129,140,248,0.12), inset 0 0 0 1px rgba(255,255,255,0.02);}
          .sm-spark{position:absolute;inset:-40%;background:radial-gradient(circle at 30% 30%, rgba(99,102,241,0.18), transparent 60%);filter:blur(6px);}
          .sm-robot{font-size:22px;filter:drop-shadow(0 6px 14px rgba(0,0,0,0.45));animation:smBob 1.15s ease-in-out infinite;}
          .sm-rock{font-size:18px;opacity:0.95;filter:drop-shadow(0 4px 10px rgba(0,0,0,0.45));}
          .sm-flag{font-size:18px;filter:drop-shadow(0 4px 10px rgba(0,0,0,0.45));}
          @keyframes smBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-2px)}}
          @media (max-width:520px){.sm-grid{gap:6px}.sm-cell{border-radius:16px}.sm-robot{font-size:20px}}
        `}</style>
        <div className="muted" style={{ fontSize: 14 }}>
          Program the robot with a <strong style={{ color: "rgba(199,210,254,0.95)" }}>Stack</strong> (LIFO).
        </div>

        <Progress value={energyPct} />

        <div className="sm-boardWrap">
          <div className="sm-board">
            <div className="muted" style={{ fontSize: 12, marginBottom: 8 }}>
              Difficulty: <strong>{difficulty}</strong> · Size: <strong>{size}×{size}</strong>
            </div>
            <div className="sm-grid" style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}>
              {grid.map((row, r) =>
                row.map((cell, c) => {
                  const isWall = cell === 1;
                  const isMe = pos.r === r && pos.c === c;
                  const isGoal = goal.r === r && goal.c === c;
                  return (
                    <div
                      key={`${r}-${c}`}
                      className={cn(
                        "sm-cell",
                        isWall && "sm-cellWall",
                        isGoal && "sm-cellGoal",
                        isMe && "sm-cellMe",
                      )}
                    >
                      {!isWall && <div className="sm-spark" />}
                      {isWall ? (
                        <span className="sm-rock">🪨</span>
                      ) : isMe ? (
                        <span className="sm-robot">🤖</span>
                      ) : isGoal ? (
                        <span className="sm-flag">🏁</span>
                      ) : (
                        ""
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <div className="panel">
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
            <div style={{ fontWeight: 650 }}>Stack (Top executes next)</div>
            <div className="muted" style={{ fontSize: 13 }}>Top = last item</div>
          </div>

          <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
            {stack.length === 0 ? (
              <div className="muted">(empty)</div>
            ) : (
              stack.map((d, i) => (
                <Badge key={i} style={{
                  borderColor: i === stack.length - 1 ? "rgba(252,211,77,0.35)" : undefined,
                  background: i === stack.length - 1 ? "rgba(245,158,11,0.10)" : undefined
                }}>
                  {d}
                </Badge>
              ))
            )}
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {["U", "L", "D", "R"].map((d) => (
              <Button key={d} onClick={() => pushMove(d)} disabled={status !== "playing" || running}>
                {d}
              </Button>
            ))}
            <Button
              onClick={popMove}
              disabled={status !== "playing" || running || stack.length === 0}
              variant="ghost"
            >
              Pop
            </Button>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Button
              onClick={() => setRunning((x) => !x)}
              disabled={status !== "playing" || stack.length === 0}
              variant={running ? "danger" : "success"}
            >
              {running ? "Stop" : "Run"}
            </Button>
            <Button onClick={reset} variant="ghost">
              New level
            </Button>
          </div>
        </div>

        <div className="muted" style={{ fontSize: 12 }}>
          Skillcheck: plan moves “wrong way around” and you feel it instantly — Stack = LIFO.
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
    </AppShell>
  );
}
