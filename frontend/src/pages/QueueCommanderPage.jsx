import React, { useEffect, useMemo, useRef, useState } from "react";
import AppShell from "../components/AppShell";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Progress } from "../components/ui/progress";
import { Link, useLocation } from "react-router-dom";
import ResultSubmitPanel from "../components/ResultSubmitPanel";

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function randInt(a, b) {
  return Math.floor(Math.random() * (b - a + 1)) + a;
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(0, i);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function difficultyConfig(difficulty, level) {
  // Keep it simple and very noticeable.
  const L = clamp(level, 1, 10);
  if (difficulty === "HARD") {
    return {
      n: clamp(10 + Math.floor(L / 2), 10, 12),
      capacity: 3,
      rotateTokens: clamp(5 - Math.floor(L / 4), 3, 5),
    };
  }
  if (difficulty === "MEDIUM") {
    return {
      n: clamp(8 + Math.floor(L / 2), 8, 10),
      capacity: 4,
      rotateTokens: clamp(8 - Math.floor(L / 3), 5, 8),
    };
  }
  // EASY default
  return {
    n: clamp(6 + Math.floor(L / 2), 6, 8),
    capacity: 4,
    rotateTokens: clamp(12 - Math.floor(L / 2), 8, 12),
  };
}

// Generate a guaranteed-solvable "switchyard" puzzle:
// - incoming is a fixed stream
// - you have a FIFO queue buffer with limited capacity
// - you can rotate (front -> back) with a limited token count
// Target is created by simulating legal operations with the same constraints.
function makeLevel({ difficulty, level, seed }) {
  const cfg = difficultyConfig(difficulty, level);
  const n = cfg.n;

  // pseudo-seed by consuming random a few times (cheap but good enough for this minigame)
  for (let i = 0; i < (seed % 17); i++) Math.random();

  const incoming = shuffle(Array.from({ length: n }, (_, i) => i + 1));

  function simulateTarget() {
    const queue = [];
    const target = [];
    let idx = 0;
    let rot = cfg.rotateTokens;

    // Safety cap to avoid infinite loops (should never hit)
    for (let step = 0; step < 5000 && target.length < n; step++) {
      const canEnq = idx < n && queue.length < cfg.capacity;
      const canRot = queue.length > 1 && rot > 0;
      const canDeq = queue.length > 0;

      // Weighted choices to make puzzles interesting but solvable.
      // Prefer enqueue early, then rotate/dequeue mix.
      let action = "";
      const progress = target.length / n;
      const wantEnq = canEnq && (queue.length === 0 || Math.random() < (0.55 - progress * 0.25));
      const wantRot = canRot && Math.random() < (0.22 + progress * 0.12);
      const wantDeq = canDeq && (!canEnq || Math.random() < 0.40);

      if (wantEnq) action = "ENQ";
      else if (wantRot) action = "ROT";
      else if (wantDeq) action = "DEQ";
      else if (canDeq) action = "DEQ";
      else if (canEnq) action = "ENQ";
      else break;

      if (action === "ENQ") {
        queue.push(incoming[idx++]);
      } else if (action === "ROT") {
        queue.push(queue.shift());
        rot -= 1;
      } else {
        target.push(queue.shift());
      }
    }

    // flush
    while (target.length < n && queue.length) target.push(queue.shift());

    // If we still haven't consumed all incoming (shouldn't happen often), enqueue & flush.
    while (idx < n) {
      if (queue.length < cfg.capacity) {
        queue.push(incoming[idx++]);
      } else {
        target.push(queue.shift());
      }
    }
    while (queue.length) target.push(queue.shift());

    return target.slice(0, n);
  }

  // Ensure non-trivial (target != incoming) while staying solvable.
  let target = simulateTarget();
  let guard = 0;
  while (guard++ < 12 && target.join(",") === incoming.join(",")) {
    target = simulateTarget();
  }

  return {
    level: clamp(level, 1, 10),
    capacity: cfg.capacity,
    rotateTokens: cfg.rotateTokens,
    incoming,
    target,
  };
}

function tokenStyle(kind, isActive = false) {
  const base = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 42,
    height: 34,
    padding: "0 12px",
    borderRadius: 14,
    border: "1px solid rgba(51,65,85,0.55)",
    background: "rgba(2,6,23,0.25)",
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
    fontSize: 13,
    fontWeight: 800,
    userSelect: "none",
    transition: "transform 120ms ease, box-shadow 120ms ease, border-color 120ms ease",
  };

  const glow = isActive ? { boxShadow: "0 0 0 3px rgba(99,102,241,0.18)", transform: "translateY(-1px)" } : {};

  if (kind === "incoming") return { ...base, ...glow, borderColor: "rgba(129,140,248,0.55)", background: "rgba(99,102,241,0.12)" };
  if (kind === "queue") return { ...base, ...glow, borderColor: "rgba(252,211,77,0.55)", background: "rgba(245,158,11,0.10)" };
  if (kind === "output") return { ...base, ...glow, borderColor: "rgba(52,211,153,0.55)", background: "rgba(16,185,129,0.10)" };
  if (kind === "target") return { ...base, ...glow, borderColor: "rgba(148,163,184,0.50)", background: "rgba(15,23,42,0.18)" };
  return { ...base, ...glow };
}

export default function QueueCommanderPage() {
  const loc = useLocation();
  const challenge = loc.state?.challenge;
  const difficulty = challenge?.difficulty || "EASY";

  const [seed, setSeed] = useState(0);
  const [level, setLevel] = useState(1);

  const data = useMemo(() => makeLevel({ difficulty, level, seed }), [difficulty, level, seed]);
  const { capacity, rotateTokens: rotateStart, incoming, target } = data;

  const [incomingIdx, setIncomingIdx] = useState(0);
  const [queue, setQueue] = useState([]);
  const [output, setOutput] = useState([]);
  const [rotLeft, setRotLeft] = useState(rotateStart);

  const [status, setStatus] = useState("playing"); // playing | won | lost
  const [msg, setMsg] = useState("");
  const [shake, setShake] = useState(false);

  const startRef = useRef(Date.now());
  const [timeMs, setTimeMs] = useState(0);
  const [errors, setErrors] = useState(0);

  const nextIncoming = incomingIdx < incoming.length ? incoming[incomingIdx] : null;
  const expectedNext = output.length < target.length ? target[output.length] : null;

  const done = output.length === target.length;
  const progressPct = Math.round((output.length / target.length) * 100);

  function hardReset() {
    startRef.current = Date.now();
    setTimeMs(0);
    setErrors(0);
    setIncomingIdx(0);
    setQueue([]);
    setOutput([]);
    setRotLeft(rotateStart);
    setStatus("playing");
    setMsg("");
  }

  function newLevel() {
    setSeed((s) => s + 1);
    // rotateStart depends on seed, so reset after new data computed
    setTimeout(() => {
      hardReset();
    }, 0);
  }

  // When difficulty/level changes, refresh the whole state.
  useEffect(() => {
    hardReset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [difficulty, level, seed]);

  function bumpError(text) {
    setErrors((e) => e + 1);
    setMsg(text);
    setShake(true);
    window.setTimeout(() => setShake(false), 280);
  }

  function enqueue() {
    if (status !== "playing") return;
    if (nextIncoming == null) return bumpError("No more incoming items.");
    if (queue.length >= capacity) return bumpError(`Queue full (capacity ${capacity}).`);
    setMsg("");
    setQueue((q) => q.concat(nextIncoming));
    setIncomingIdx((i) => i + 1);
  }

  function rotate() {
    if (status !== "playing") return;
    if (queue.length < 2) return bumpError("Need at least 2 items to rotate.");
    if (rotLeft <= 0) return bumpError("No rotate tokens left.");
    setMsg("");
    setRotLeft((r) => r - 1);
    setQueue((q) => q.slice(1).concat(q[0]));
  }

  function dequeueToOutput() {
    if (status !== "playing") return;
    if (queue.length === 0) return bumpError("Queue empty. Enqueue first.");
    const front = queue[0];
    if (front !== expectedNext) {
      setErrors((e) => e + 1);
      setStatus("lost");
      setTimeMs(Date.now() - startRef.current);
      setMsg(`❌ Wrong! Front is ${front}, but next target is ${expectedNext}.`);
      setShake(true);
      window.setTimeout(() => setShake(false), 280);
      return;
    }
    setMsg("");
    setQueue((q) => q.slice(1));
    setOutput((o) => o.concat(front));
  }

  // Auto-detect deadlocks: no legal moves left and not done.
  useEffect(() => {
    if (status !== "playing") return;
    if (done) return;

    const canEnq = nextIncoming != null && queue.length < capacity;
    const canRot = rotLeft > 0 && queue.length > 1;
    const canDeq = queue.length > 0 && queue[0] === expectedNext;
    if (!canEnq && !canRot && !canDeq) {
      setStatus("lost");
      setTimeMs(Date.now() - startRef.current);
      setMsg("❌ Stuck! No legal moves left. Try a new level.");
    }
  }, [status, done, nextIncoming, queue, capacity, rotLeft, expectedNext]);

  useEffect(() => {
    if (status !== "playing") return;
    if (!done) return;
    setStatus("won");
    setTimeMs(Date.now() - startRef.current);
    setMsg("✅ Perfect routing! You matched the target output.");
  }, [done, status]);

  const canEnqueue = status === "playing" && nextIncoming != null && queue.length < capacity;
  const canRotate = status === "playing" && queue.length > 1 && rotLeft > 0;
  const canDequeue = status === "playing" && queue.length > 0 && queue[0] === expectedNext;

  return (
    <AppShell
      title="Code & Conquer"
      subtitle="Queue Switchyard (FIFO) — route crates using a limited buffer"
      headerBadges={
        <>
          <Badge>Category: QUEUE_COMMANDER</Badge>
          <Badge>Level: {level}</Badge>
          <Badge>Diff: {difficulty}</Badge>
          <Badge>Errors: {errors}</Badge>
          <Badge>Cap: {capacity}</Badge>
          <Badge>Rot: {rotLeft}/{rotateStart}</Badge>
          {status === "won" && <Badge style={{ borderColor: "rgba(52,211,153,0.45)" }}>WON</Badge>}
          {status === "lost" && <Badge style={{ borderColor: "rgba(251,113,133,0.45)" }}>LOST</Badge>}
        </>
      }
      rightPanel={
        <div className="panel">
          <div style={{ fontSize: 16, fontWeight: 750 }}>How it works</div>
          <div className="muted" style={{ marginTop: 10, fontSize: 14, lineHeight: 1.45 }}>
            <div style={{ marginTop: 6 }}>
              You must build the <strong>Target Output</strong> exactly.
            </div>
            <div style={{ marginTop: 10 }}>
              <strong>Enqueue</strong> takes the next incoming crate and puts it at the <em>back</em>.
            </div>
            <div style={{ marginTop: 6 }}>
              <strong>Dequeue</strong> sends the <em>front</em> crate to output — <strong>only</strong> if it matches the next target.
            </div>
            <div style={{ marginTop: 6 }}>
              <strong>Rotate</strong> moves <em>front → back</em> using a limited token.
            </div>
            <div style={{ marginTop: 10 }}>
              Tip: plan around your buffer. Hard mode has less space and fewer rotates.
            </div>
          </div>

          <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
            <Link to="/play">
              <Button variant="ghost">Back to game</Button>
            </Link>
          </div>
        </div>
      }
    >
      <div style={{ display: "grid", gap: 12 }}>
        {/* Target */}
        <div className="panel">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
            <div style={{ fontWeight: 750 }}>Target Output</div>
            <div className="muted" style={{ fontSize: 13 }}>
              Next expected: <strong style={{ color: "rgba(252,211,77,0.95)" }}>{expectedNext ?? "-"}</strong>
            </div>
          </div>

          <div style={{ marginTop: 10 }}>
            <Progress value={progressPct} />
            <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
              Completed: {output.length}/{target.length}
            </div>
          </div>

          <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 8 }}>
            {target.map((t, i) => {
              const isDone = i < output.length;
              return (
                <span
                  key={`t-${t}-${i}`}
                  style={{
                    ...tokenStyle("target", i === output.length),
                    opacity: isDone ? 0.35 : 1,
                    borderColor: isDone ? "rgba(52,211,153,0.35)" : tokenStyle("target").borderColor,
                    background: isDone ? "rgba(16,185,129,0.08)" : tokenStyle("target").background,
                  }}
                >
                  {t}
                </span>
              );
            })}
          </div>
        </div>

        {msg && (
          <div
            className="panel"
            style={{
              borderColor:
                status === "lost"
                  ? "rgba(251,113,133,0.45)"
                  : status === "won"
                    ? "rgba(52,211,153,0.45)"
                    : "rgba(129,140,248,0.35)",
            }}
          >
            {msg}
          </div>
        )}

        {status !== "playing" && (
          <ResultSubmitPanel
            category="QUEUE_COMMANDER"
            difficulty={difficulty}
            timeMs={timeMs}
            errors={errors}
            won={status === "won"}
            onPlayAgain={hardReset}
            challengeId={challenge?.challengeInstanceId}
          />
        )}

        {/* Switchyard */}
        <div className="panel">
          <div
            style={{
              display: "grid",
              gap: 14,
            }}
          >
            <div>
              <div style={{ fontWeight: 750, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
                <span>Incoming Belt</span>
                <span className="muted" style={{ fontSize: 13 }}>
                  Next: <strong style={{ color: "rgba(129,140,248,0.95)" }}>{nextIncoming ?? "—"}</strong>
                </span>
              </div>
              <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 8 }}>
                {incoming.map((x, i) => {
                  const passed = i < incomingIdx;
                  const isNext = i === incomingIdx;
                  return (
                    <span
                      key={`in-${x}-${i}`}
                      style={{
                        ...tokenStyle("incoming", isNext),
                        opacity: passed ? 0.18 : 1,
                        borderColor: isNext ? "rgba(129,140,248,0.85)" : tokenStyle("incoming").borderColor,
                      }}
                    >
                      {x}
                    </span>
                  );
                })}
              </div>
            </div>

            <div>
              <div style={{ fontWeight: 750, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
                <span>Your Buffer Queue (FIFO)</span>
                <span className="muted" style={{ fontSize: 13 }}>
                  Front = left • Back = right • {queue.length}/{capacity} • Rotates left: {rotLeft}
                </span>
              </div>

              <div
                style={{
                  marginTop: 10,
                  display: "grid",
                  gridTemplateColumns: `repeat(${capacity}, minmax(54px, 1fr))`,
                  gap: 8,
                  alignItems: "stretch",
                }}
                className={shake ? "qc-shake" : ""}
              >
                {Array.from({ length: capacity }).map((_, idx) => {
                  const v = queue[idx];
                  const isFront = idx === 0 && queue.length > 0;
                  const isMatch = isFront && v === expectedNext;
                  return (
                    <div
                      key={`slot-${idx}`}
                      style={{
                        height: 54,
                        borderRadius: 16,
                        border: "1px solid rgba(51,65,85,0.55)",
                        background: "rgba(2,6,23,0.20)",
                        display: "grid",
                        placeItems: "center",
                        position: "relative",
                        outline: isFront ? "2px solid rgba(252,211,77,0.22)" : "none",
                        boxShadow: isMatch ? "0 0 0 3px rgba(52,211,153,0.12)" : "none",
                      }}
                      title={isFront ? "FRONT (dequeue here)" : ""}
                    >
                      {typeof v === "number" ? (
                        <span style={tokenStyle("queue", isFront)}>{v}</span>
                      ) : (
                        <span className="muted" style={{ fontSize: 12 }}>
                          empty
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="muted" style={{ fontSize: 12, marginTop: 8, lineHeight: 1.35 }}>
                Rule: You can only send to output if the <strong>front</strong> equals the next target value.
              </div>
            </div>

            <div>
              <div style={{ fontWeight: 750, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
                <span>Output</span>
                <span className="muted" style={{ fontSize: 13 }}>
                  Must match target exactly
                </span>
              </div>
              <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 8 }}>
                {output.length === 0 ? (
                  <span className="muted">(empty)</span>
                ) : (
                  output.map((x, i) => (
                    <span key={`out-${x}-${i}`} style={tokenStyle("output", i === output.length - 1)}>
                      {x}
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* controls */}
        <div className="panel">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "space-between", alignItems: "center" }}>
            <div className="muted" style={{ fontSize: 13 }}>
              Tip: Enqueue to buffer, rotate to bring the right crate to the front, then dequeue when it matches.
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              <Button variant="primary" onClick={enqueue} disabled={!canEnqueue}>
                Enqueue
              </Button>
              <Button variant="secondary" onClick={rotate} disabled={!canRotate}>
                Rotate
              </Button>
              <Button variant="secondary" onClick={dequeueToOutput} disabled={!canDequeue}>
                Dequeue → Output
              </Button>

              <Button variant="ghost" onClick={hardReset}>
                Reset
              </Button>

              <Button
                variant="ghost"
                onClick={() => {
                  setLevel((l) => clamp(l + 1, 1, 10));
                  setSeed((s) => s + 1);
                }}
                disabled={status === "playing"}
              >
                Next Level
              </Button>

              <Button variant="ghost" onClick={newLevel}>
                New Level
              </Button>
            </div>
          </div>
        </div>

        <div className="muted" style={{ fontSize: 12 }}>
          Skillcheck: Queue = FIFO. Rotating is like a circular queue — limited tokens force you to plan.
        </div>
      </div>

      {/* Tiny local CSS for shake + mobile safety */}
      <style>{`
        .qc-shake { animation: qcshake 260ms ease-in-out; }
        @keyframes qcshake {
          0% { transform: translateX(0); }
          25% { transform: translateX(-3px); }
          55% { transform: translateX(3px); }
          85% { transform: translateX(-2px); }
          100% { transform: translateX(0); }
        }
        @media (max-width: 520px) {
          .panel { padding: 14px !important; }
        }
      `}</style>
    </AppShell>
  );
}
