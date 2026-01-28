import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";

import { Button } from "../components/ui/button";
import ResultSubmitPanel from "../components/ResultSubmitPanel";

// QueueCommanderPage (file name + route kept)
// New minigame: "Queue Puzzle" (turn-based FIFO thinking)
// - You see an incoming stream of numbers.
// - Build the required OUTPUT sequence using a FIFO queue.
// - Actions:
//   ENQUEUE: put the current incoming number at the back of the queue
//   DISCARD: throw away the current incoming number
//   DEQUEUE: remove the FRONT of the queue and send it to output
// - Only a correct DEQUEUE (matching next target number) is allowed.

function randInt(a, b) {
  return Math.floor(Math.random() * (b - a + 1)) + a;
}

function vibrate(pattern) {
  try {
    if (navigator.vibrate) navigator.vibrate(pattern);
  } catch {
    // ignore
  }
}

function cfgFor(difficulty) {
  if (difficulty === "HARD") {
    return { targetLen: 10, maxDigit: 15, queueCap: 6, removeCharges: 2, timeLimitSec: 45 };
  }
  if (difficulty === "MEDIUM") {
    return { targetLen: 8, maxDigit: 12, queueCap: 5, removeCharges: 2, timeLimitSec: 60 };
  }
  return { targetLen: 6, maxDigit: 9, queueCap: 4, removeCharges: 1, timeLimitSec: 75 };
}

function mulberry32(a) {
  return function () {
    let t = (a += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function generatePuzzle({ targetLen, maxDigit }) {
  const seed = (Date.now() ^ (Math.random() * 0xffffffff)) >>> 0;
  const r = mulberry32(seed);
  const target = Array.from({ length: targetLen }, () => Math.floor(r() * (maxDigit + 1)));
  return { target, seed };
}

function incomingValue({ seed, maxDigit, target, idx, outIdx, queueLen, queueCap }) {
  // Infinite stream. Strong bias to show *future* targets (not only the next one), so
  // input is NOT similar to the desired output, while still guaranteeing solvability.
  const pr = mulberry32((seed ^ Math.imul(idx + 1, 0x9e3779b9)) >>> 0);
  const p = pr();

  // More pressure when queue is near full -> emit fewer "tempting" values.
  const nearFull = queueLen >= Math.max(0, queueCap - 1);
  const biasFuture = nearFull ? 0.22 : 0.40;
  const biasNext = nearFull ? 0.14 : 0.22;

  if (target.length > 0 && p < biasFuture) {
    const look = 1 + Math.floor(pr() * Math.min(4, Math.max(1, target.length - outIdx)));
    const j = Math.min(target.length - 1, outIdx + look);
    return target[j];
  }
  if (target.length > 0 && p < biasFuture + biasNext) {
    return target[Math.min(outIdx, target.length - 1)];
  }

  // Decoy (sometimes target-like, often random)
  if (target.length > 0 && pr() < 0.35) {
    return target[Math.floor(pr() * target.length)];
  }
  return Math.floor(pr() * (maxDigit + 1));
}

export default function QueueCommanderPage() {
  const loc = useLocation();
  const challenge = loc.state?.challenge;
  const difficulty = challenge?.difficulty || "EASY";
  const cfg = useMemo(() => cfgFor(difficulty), [difficulty]);

  const startTsRef = useRef(performance.now());
  const endAtRef = useRef(performance.now() + cfg.timeLimitSec * 1000);

  const [{ target, seed }, setPuzzle] = useState(() => generatePuzzle(cfg));

  const [idx, setIdx] = useState(0); // input index
  const [queue, setQueue] = useState([]);
  const [outIdx, setOutIdx] = useState(0); // target index

  const [status, setStatus] = useState("playing"); // playing | won | lost
  const [timeMs, setTimeMs] = useState(0);
  const [remainingMs, setRemainingMs] = useState(cfg.timeLimitSec * 1000);
  const [errors, setErrors] = useState(0);
  const [hint, setHint] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(-1);
  const [removeCharges, setRemoveCharges] = useState(cfg.removeCharges);

  // If difficulty changes (rare), regenerate puzzle.
  useEffect(() => {
    const next = generatePuzzle(cfg);
    setPuzzle(next);
    setIdx(0);
    setQueue([]);
    setOutIdx(0);
    setStatus("playing");
    setErrors(0);
    setHint("");
    setSelectedIdx(-1);
    setRemoveCharges(cfg.removeCharges);
    startTsRef.current = performance.now();
    endAtRef.current = startTsRef.current + cfg.timeLimitSec * 1000;
    setRemainingMs(cfg.timeLimitSec * 1000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cfg.targetLen, cfg.maxDigit, cfg.queueCap, cfg.removeCharges]);

  // Countdown timer
  useEffect(() => {
    if (status !== "playing") return;
    const id = window.setInterval(() => {
      const left = Math.max(0, Math.round(endAtRef.current - performance.now()));
      setRemainingMs(left);
      if (left <= 0) {
        setErrors(1);
        end("lost", "Time's up!");
      }
    }, 150);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  // Mobile fullscreen: prevent page scrolling while this minigame is mounted.
  useEffect(() => {
    const prevHtml = document.documentElement.style.overflow;
    const prevBody = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = prevHtml;
      document.body.style.overflow = prevBody;
    };
  }, []);

  function end(nextStatus, msg = "") {
    setStatus(nextStatus);
    setTimeMs(Math.max(0, Math.round(performance.now() - startTsRef.current)));
    setHint(msg);
    vibrate(nextStatus === "won" ? [18, 30, 18] : [20, 45, 20]);
  }

  const timeLabel = useMemo(() => {
    const s = Math.ceil(remainingMs / 1000);
    const mm = String(Math.floor(s / 60)).padStart(2, "0");
    const ss = String(s % 60).padStart(2, "0");
    return `${mm}:${ss}`;
  }, [remainingMs]);

  const incoming = status === "playing"
    ? incomingValue({
        seed,
        maxDigit: cfg.maxDigit,
        target,
        idx,
        outIdx,
        queueLen: queue.length,
        queueCap: cfg.queueCap,
      })
    : null;
  const nextTarget = outIdx < target.length ? target[outIdx] : null;

  const canEnqueue = status === "playing" && queue.length < cfg.queueCap;
  const canDiscard = status === "playing";
  const canDequeue = status === "playing" && queue.length > 0;
  const canRemove = status === "playing" && selectedIdx >= 0 && selectedIdx < queue.length && removeCharges > 0;

  function enqueue() {
    if (!canEnqueue) return;
    setQueue((q) => [...q, incoming]);
    setIdx((v) => v + 1);
    setHint("");
  }

  function discard() {
    if (!canDiscard) return;
    setIdx((v) => v + 1);
    setHint("");
  }

  function dequeue() {
    if (!canDequeue) return;
    const front = queue[0];
    if (front !== nextTarget) {
      setErrors(1);
      end("lost", `Wrong output: expected ${nextTarget}, got ${front}`);
      return;
    }

    // Correct output
    setQueue((q) => q.slice(1));
    setHint("");
    setOutIdx((prev) => {
      const next = prev + 1;
      if (next >= target.length) {
        end("won", "Perfect FIFO!");
      }
      return next;
    });
  }

  function removeSelected() {
    if (!canRemove) return;
    setQueue((q) => q.filter((_, i) => i !== selectedIdx));
    setRemoveCharges((c) => Math.max(0, c - 1));
    setSelectedIdx(-1);
    setHint("Removed from queue");
    vibrate(12);
  }

  // Infinite input: no "out of numbers" failure.

  // Keyboard support (desktop)
  useEffect(() => {
    const onKeyDown = (e) => {
      if (status !== "playing") return;
      const k = (e.key || "").toLowerCase();
      if (k === "a" || k === "arrowleft" || k === "1") {
        e.preventDefault();
        enqueue();
      }
      if (k === "d" || k === "arrowright" || k === "2") {
        e.preventDefault();
        discard();
      }
      if (k === " " || k === "enter" || k === "arrowup") {
        e.preventDefault();
        dequeue();
      }
    };
    window.addEventListener("keydown", onKeyDown, { passive: false });
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, canEnqueue, canDiscard, canDequeue, incoming, nextTarget, idx, outIdx, queue.length]);

  const targetWindow = target.slice(outIdx, outIdx + 6);

  return (
    <div
      className="appRoot"
      style={{
        height: "100dvh",
        overflow: "hidden",
        display: "grid",
        gridTemplateRows: "auto 1fr auto",
        paddingTop: 12,
        paddingLeft: 12,
        paddingRight: 12,
        // Extra space so bottom controls never get clipped by mobile browser UI.
        paddingBottom: "calc(96px + env(safe-area-inset-bottom))",
        gap: 12,
      }}
    >
      {/* Minimal header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div style={{ fontWeight: 900, letterSpacing: 0.3, fontSize: 18 }}>Queue Puzzle</div>
        <div className="muted" style={{ fontSize: 12, fontWeight: 800, opacity: 0.9, display: "flex", gap: 10 }}>
          <span>{timeLabel}</span>
          <span>FIFO · {difficulty}</span>
        </div>
      </div>

      {/* Main */}
      <div
        className="panel"
        style={{
          borderRadius: 24,
          padding: 14,
          display: "grid",
          gap: 14,
          alignContent: "start",
          minHeight: 0,
          paddingBottom: 24,
          overflow: "hidden",
        }}
      >
        {/* Incoming + target */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
          <div className="panel" style={{ borderRadius: 18, padding: 12 }}>
            <div className="muted" style={{ fontSize: 12, fontWeight: 800, marginBottom: 8 }}>
              Incoming
            </div>
            <div
              style={{
                height: 74,
                display: "grid",
                placeItems: "center",
                fontSize: "clamp(36px, 8vw, 48px)",
                fontWeight: 900,
                borderRadius: 16,
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(148,163,184,0.18)",
              }}
            >
              {incoming === null ? "—" : incoming}
            </div>
            <div className="muted" style={{ marginTop: 8, fontSize: 12 }}>
              Card {idx + 1}
            </div>
          </div>

          <div className="panel" style={{ borderRadius: 18, padding: 12 }}>
            <div className="muted" style={{ fontSize: 12, fontWeight: 800, marginBottom: 8 }}>
              Target output
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {targetWindow.map((v, i) => (
                <div
                  key={`${outIdx}-${i}-${v}`}
                  style={{
                    minWidth: 34,
                    height: 34,
                    padding: "0 10px",
                    borderRadius: 999,
                    display: "grid",
                    placeItems: "center",
                    fontWeight: 900,
                    background: i === 0 ? "rgba(255,255,255,0.16)" : "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(148,163,184,0.18)",
                  }}
                >
                  {v}
                </div>
              ))}
              {targetWindow.length === 0 ? (
                <div className="muted" style={{ fontSize: 12 }}>Done</div>
              ) : null}
            </div>
            <div className="muted" style={{ marginTop: 8, fontSize: 12 }}>
              {outIdx}/{target.length}
            </div>
          </div>
        </div>

        {/* Queue */}
        <div className="panel" style={{ borderRadius: 18, padding: 12 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <div className="muted" style={{ fontSize: 12, fontWeight: 800 }}>Queue (front →)</div>
            <div className="muted" style={{ fontSize: 12 }}>{queue.length}/{cfg.queueCap}</div>
          </div>
          <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap", minHeight: 42 }}>
            {queue.length ? (
              queue.map((v, i) => (
                <div
                  key={`${i}-${v}`}
                  style={{
                    minWidth: 36,
                    height: 36,
                    padding: "0 10px",
                    borderRadius: 14,
                    display: "grid",
                    placeItems: "center",
                    fontWeight: 900,
                    background:
                      i === selectedIdx
                        ? "rgba(255,255,255,0.22)"
                        : i === 0
                          ? "rgba(255,255,255,0.14)"
                          : "rgba(255,255,255,0.06)",
                    border:
                      i === selectedIdx
                        ? "1px solid rgba(255,255,255,0.35)"
                        : "1px solid rgba(148,163,184,0.18)",
                    cursor: "pointer",
                  }}
                  title={i === 0 ? "Front" : ""}
                  onClick={() => setSelectedIdx((cur) => (cur === i ? -1 : i))}
                >
                  {v}
                </div>
              ))
            ) : (
              <div className="muted" style={{ fontSize: 12 }}>Empty</div>
            )}
          </div>
          <div className="muted" style={{ marginTop: 10, fontSize: 12 }}>
            Tap a queue item to select it • Removes left: <b>{removeCharges}</b>
          </div>
        </div>

        {hint ? (
          <div className="panel" style={{ borderRadius: 18, padding: 12, border: "1px solid rgba(148,163,184,0.22)" }}>
            <div style={{ fontWeight: 800 }}>{hint}</div>
          </div>
        ) : null}
      </div>

      {/* Controls */}
      <div style={{ display: "grid", gap: 10, paddingBottom: "calc(64px + env(safe-area-inset-bottom))" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 }}>
          <Button
            style={{ height: 60, fontSize: "clamp(14px, 4.2vw, 18px)", fontWeight: 900, borderRadius: 18, minWidth: 0, width: "100%" }}
            onClick={enqueue}
            disabled={!canEnqueue}
          >
            ENQUEUE
          </Button>
          <Button
            style={{ height: 60, fontSize: "clamp(14px, 4.2vw, 18px)", fontWeight: 900, borderRadius: 18, minWidth: 0, width: "100%" }}
            variant="outline"
            onClick={dequeue}
            disabled={!canDequeue}
          >
            DEQUEUE
          </Button>
          <Button
            style={{ height: 60, fontSize: "clamp(14px, 4.2vw, 18px)", fontWeight: 900, borderRadius: 18, minWidth: 0, width: "100%" }}
            variant="secondary"
            onClick={discard}
            disabled={!canDiscard}
          >
            DISCARD
          </Button>
        </div>

        <Button
          style={{ height: 54, fontSize: "clamp(13px, 3.8vw, 16px)", fontWeight: 900, borderRadius: 18, minWidth: 0, width: "100%" }}
          variant="destructive"
          onClick={removeSelected}
          disabled={!canRemove}
        >
          REMOVE SELECTED ({removeCharges})
        </Button>

        {status !== "playing" ? (
          <ResultSubmitPanel
            category="QUEUE_COMMANDER"
            difficulty={difficulty}
            timeMs={timeMs}
            errors={errors}
            won={status === "won"}
            challengeId={challenge?.challengeId}
          />
        ) : null}
      </div>
    </div>
  );
}
