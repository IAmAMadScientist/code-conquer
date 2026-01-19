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

function makeMaze(size) {
  const grid = Array.from({ length: size }, () => Array.from({ length: size }, () => 0));
  const wallCount = Math.floor(size * size * 0.18);
  for (let k = 0; k < wallCount; k++) {
    const r = randInt(0, size - 1);
    const c = randInt(0, size - 1);
    grid[r][c] = 1;
  }
  grid[0][0] = 0;
  grid[size - 1][size - 1] = 0;
  if (size >= 2) {
    grid[0][1] = 0;
    grid[1][0] = 0;
    grid[size - 2][size - 1] = 0;
    grid[size - 1][size - 2] = 0;
  }
  return grid;
}

export default function StackMazePage() {
  const size = 7;
  const loc = useLocation();
  const challenge = loc.state?.challenge;
  const difficulty = challenge?.difficulty || "EASY";

  const [grid, setGrid] = useState(() => makeMaze(size));
  const [pos, setPos] = useState({ r: 0, c: 0 });
  const [stack, setStack] = useState([]);
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState("playing"); // "playing" | "won" | "lost"
  const [energy, setEnergy] = useState(14);
  const [crashes, setCrashes] = useState(0);

  // timing
  const startRef = useRef(Date.now());
  const [timeMs, setTimeMs] = useState(0);

  const goal = { r: size - 1, c: size - 1 };

  function reset() {
    startRef.current = Date.now();
    setTimeMs(0);
    setGrid(makeMaze(size));
    setPos({ r: 0, c: 0 });
    setStack([]);
    setRunning(false);
    setStatus("playing");
    setEnergy(14);
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
    const t = setInterval(() => stepOnce(), 350);
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

  const energyPct = Math.round((energy / 14) * 100);

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
        <div className="muted" style={{ fontSize: 14 }}>
          Program the robot with a <strong style={{ color: "rgba(199,210,254,0.95)" }}>Stack</strong> (LIFO).
        </div>

        <Progress value={energyPct} />

        <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(7, minmax(0, 1fr))" }}>
          {grid.map((row, r) =>
            row.map((cell, c) => {
              const isWall = cell === 1;
              const isMe = pos.r === r && pos.c === c;
              const isGoal = goal.r === r && goal.c === c;
              return (
                <div
                  key={`${r}-${c}`}
                  className={cn(
                    "h-11 rounded-2xl border flex items-center justify-center text-xs",
                    isWall ? "panel" : "panel",
                  )}
                  style={{
                    background: isWall ? "rgba(30,41,59,0.5)" : "rgba(2,6,23,0.22)",
                    borderColor: isGoal ? "rgba(52,211,153,0.35)" : isMe ? "rgba(129,140,248,0.35)" : "rgba(51,65,85,0.4)",
                  }}
                >
                  {isWall ? "█" : isMe ? "🤖" : isGoal ? "🏁" : ""}
                </div>
              );
            })
          )}
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
