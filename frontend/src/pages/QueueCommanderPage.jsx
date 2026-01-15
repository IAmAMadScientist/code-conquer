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

// Make a small FIFO puzzle:
// - incoming: list of items arriving
// - target: the exact output order you must produce by FIFO operations
// - capacity: queue capacity
function makeLevel(level) {
  const L = clamp(level, 1, 8);

  // difficulty knobs
  const capacity = clamp(4 + Math.floor((L - 1) / 2), 4, 7);
  const incomingCount = clamp(8 + (L - 1), 8, 14);

  // items are unique so it's easy to see correctness
  const items = shuffle(Array.from({ length: incomingCount }, (_, i) => i + 1));

  // target pattern:
  // Level 1-2: same as incoming (trivial)
  // Level 3-4: chunked FIFO with pauses (still easy)
  // Level 5+: "batching" — you must enqueue multiple before dequeue to match target
  let target;
  if (L <= 2) {
    target = items.slice();
  } else if (L <= 4) {
    // reverse each chunk of 3? (still doable with FIFO by batching)
    // Actually FIFO cannot reverse arbitrary chunks; so instead:
    // target is produced by "enqueue 2, dequeue 1" repeating (a realistic scheduling pattern)
    target = [];
    const q = [];
    let i = 0;
    while (i < items.length) {
      // enqueue up to 2 if possible
      for (let k = 0; k < 2 && i < items.length; k++) {
        q.push(items[i++]);
      }
      // dequeue 1
      if (q.length) target.push(q.shift());
    }
    // flush
    while (q.length) target.push(q.shift());
  } else {
    // harder: varying batch sizes 1..3
    target = [];
    const q = [];
    let i = 0;
    while (i < items.length) {
      const batch = randInt(1, 3);
      for (let k = 0; k < batch && i < items.length; k++) q.push(items[i++]);
      const popCount = randInt(1, 2);
      for (let k = 0; k < popCount; k++) if (q.length) target.push(q.shift());
    }
    while (q.length) target.push(q.shift());
  }

  // Ensure target length equals incomingCount
  if (target.length !== incomingCount) {
    // fallback to safe target
    target = items.slice();
  }

  return {
    level: L,
    capacity,
    incoming: items,
    target,
  };
}

function tokenStyle(kind) {
  // kind: "incoming" | "queue" | "output" | "target"
  const base = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 36,
    height: 32,
    padding: "0 10px",
    borderRadius: 999,
    border: "1px solid rgba(51,65,85,0.5)",
    background: "rgba(15,23,42,0.35)",
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
    fontSize: 13,
    fontWeight: 700,
    userSelect: "none",
  };

  if (kind === "incoming") return { ...base, borderColor: "rgba(129,140,248,0.35)", background: "rgba(99,102,241,0.10)" };
  if (kind === "queue") return { ...base, borderColor: "rgba(252,211,77,0.35)", background: "rgba(245,158,11,0.10)" };
  if (kind === "output") return { ...base, borderColor: "rgba(52,211,153,0.35)", background: "rgba(16,185,129,0.10)" };
  if (kind === "target") return { ...base, borderColor: "rgba(148,163,184,0.40)", background: "rgba(2,6,23,0.18)" };
  return base;
}

export default function QueueCommanderPage() {
  const loc = useLocation();
  const challenge = loc.state?.challenge;
  const difficulty = challenge?.difficulty || "EASY";

  const [seed, setSeed] = useState(0);
  const [level, setLevel] = useState(1);

  const data = useMemo(() => makeLevel(level + seed * 0), [level, seed]); // seed included for "new level" reroll
  const { capacity, incoming, target } = data;

  const [incomingIdx, setIncomingIdx] = useState(0);
  const [queue, setQueue] = useState([]);
  const [output, setOutput] = useState([]);

  const [status, setStatus] = useState("playing"); // playing | won | lost
  const [msg, setMsg] = useState("");

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
    setStatus("playing");
    setMsg("");
  }

  function newLevel() {
    // reroll same difficulty by bumping seed (optional); simplest: just reset with same pattern
    setSeed((s) => s + 1);
    hardReset();
  }

  function enqueue() {
    if (status !== "playing") return;
    if (nextIncoming == null) {
      setErrors((e) => e + 1);
      setMsg("No more incoming items.");
      return;
    }
    if (queue.length >= capacity) {
      setErrors((e) => e + 1);
      setMsg(`Queue full (capacity ${capacity}). Dequeue first.`);
      return;
    }
    setMsg("");
    setQueue((q) => q.concat(nextIncoming));
    setIncomingIdx((i) => i + 1);
  }

  function dequeue() {
    if (status !== "playing") return;
    if (queue.length === 0) {
      setErrors((e) => e + 1);
      setMsg("Queue empty. Enqueue something first.");
      return;
    }
    const front = queue[0];

    // must match expected target output
    if (front !== expectedNext) {
      setErrors((e) => e + 1);
      setStatus("lost");
      setTimeMs(Date.now() - startRef.current);
      setMsg(`❌ Wrong! You dequeued ${front}, but expected ${expectedNext}.`);
      return;
    }

    setMsg("");
    setQueue((q) => q.slice(1));
    setOutput((o) => o.concat(front));
  }

  function checkWinIfDone() {
    if (!done) return;
    setStatus("won");
    setTimeMs(Date.now() - startRef.current);
    const bonus = Math.max(0, (incoming.length - incomingIdx) * 5) + Math.max(0, (capacity - queue.length) * 8);
    setMsg(`✅ Perfect schedule! Bonus moves: ${Math.round(bonus)}.`);
  }

  // if done becomes true, finish
  if (status === "playing" && done) {
    // safe: sync-set during render isn't ideal; but it’s stable here.
    // If you want perfect React style, convert to useEffect([done]).
    checkWinIfDone();
  }

  const canEnqueue = status === "playing" && nextIncoming != null && queue.length < capacity;
  const canDequeue = status === "playing" && queue.length > 0;

  return (
    <AppShell
      title="Code & Conquer"
      subtitle="Queue Commander (FIFO) — schedule items in the correct output order"
      headerBadges={
        <>
          <Badge>Category: QUEUE_COMMANDER</Badge>
          <Badge>Level: {level}</Badge>
          <Badge>Diff: {difficulty}</Badge>
          <Badge>Errors: {errors}</Badge>
          <Badge>Cap: {capacity}</Badge>
          {status === "won" && <Badge style={{ borderColor: "rgba(52,211,153,0.45)" }}>WON</Badge>}
          {status === "lost" && <Badge style={{ borderColor: "rgba(251,113,133,0.45)" }}>LOST</Badge>}
        </>
      }
      rightPanel={
        <div className="panel">
          <div style={{ fontSize: 16, fontWeight: 650 }}>Hint: Queue (FIFO)</div>
          <div className="muted" style={{ marginTop: 10, fontSize: 14, lineHeight: 1.45 }}>
            <div><strong>FIFO:</strong> First In, First Out.</div>
            <div style={{ marginTop: 8 }}>
              <strong>Enqueue</strong> adds to the <em>back</em>.<br />
              <strong>Dequeue</strong> removes from the <em>front</em>.
            </div>
            <div style={{ marginTop: 10 }}>
              Your job: produce the <strong>Target Output</strong> exactly.
            </div>
          </div>

          <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
            <Link to="/categories">
              <Button variant="ghost">Back to categories</Button>
            </Link>
          </div>
        </div>
      }
    >
      <div style={{ display: "grid", gap: 12 }}>
        {/* progress */}
        <div className="panel">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
            <div style={{ fontWeight: 650 }}>Target Output</div>
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
              const doneItem = i < output.length;
              return (
                <span
                  key={`t-${t}-${i}`}
                  style={{
                    ...tokenStyle("target"),
                    opacity: doneItem ? 0.35 : 1,
                    borderColor: doneItem ? "rgba(52,211,153,0.35)" : tokenStyle("target").borderColor,
                    background: doneItem ? "rgba(16,185,129,0.08)" : tokenStyle("target").background,
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
          />
        )}

        {/* incoming + queue + output */}
        <div className="panel">
          <div style={{ display: "grid", gap: 14 }}>
            <div>
              <div style={{ fontWeight: 650, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
                <span>Incoming</span>
                <span className="muted" style={{ fontSize: 13 }}>
                  Next: {nextIncoming ?? "—"}
                </span>
              </div>

              <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 8 }}>
                {incoming.map((x, i) => {
                  const isPassed = i < incomingIdx;
                  const isNext = i === incomingIdx;
                  return (
                    <span
                      key={`in-${x}-${i}`}
                      style={{
                        ...tokenStyle("incoming"),
                        opacity: isPassed ? 0.22 : 1,
                        borderColor: isNext ? "rgba(129,140,248,0.75)" : tokenStyle("incoming").borderColor,
                      }}
                    >
                      {x}
                    </span>
                  );
                })}
              </div>
            </div>

            <div>
              <div style={{ fontWeight: 650, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
                <span>Your Queue (FIFO)</span>
                <span className="muted" style={{ fontSize: 13 }}>
                  Front = left • Back = right • {queue.length}/{capacity}
                </span>
              </div>

              <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                {Array.from({ length: capacity }).map((_, idx) => {
                  const v = queue[idx];
                  const isFront = idx === 0 && queue.length > 0;
                  return (
                    <div
                      key={`slot-${idx}`}
                      style={{
                        width: 56,
                        height: 46,
                        borderRadius: 18,
                        border: "1px solid rgba(51,65,85,0.45)",
                        background: "rgba(2,6,23,0.18)",
                        display: "grid",
                        placeItems: "center",
                        position: "relative",
                        outline: isFront ? "2px solid rgba(252,211,77,0.30)" : "none",
                      }}
                      title={isFront ? "FRONT (dequeue here)" : ""}
                    >
                      {typeof v === "number" ? (
                        <span style={tokenStyle("queue")}>{v}</span>
                      ) : (
                        <span className="muted" style={{ fontSize: 12 }}>empty</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <div style={{ fontWeight: 650, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
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
                    <span key={`out-${x}-${i}`} style={tokenStyle("output")}>
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
              Tip: If the queue is full, you must dequeue — but only if the front equals the next target value.
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              <Button variant="primary" onClick={enqueue} disabled={!canEnqueue}>
                Enqueue
              </Button>
              <Button variant="secondary" onClick={dequeue} disabled={!canDequeue}>
                Dequeue
              </Button>

              <Button variant="ghost" onClick={hardReset}>
                Reset
              </Button>

              <Button
                variant="ghost"
                onClick={() => {
                  setLevel((l) => clamp(l + 1, 1, 8));
                  setSeed((s) => s + 1);
                  hardReset();
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
          Skillcheck: Queue = FIFO. If you think in LIFO (like StackMaze), you’ll fail instantly.
        </div>
      </div>
    </AppShell>
  );
}
