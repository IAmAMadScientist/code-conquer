import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";

import { Button } from "../components/ui/button";
import ResultSubmitPanel from "../components/ResultSubmitPanel";

// QueueCommanderPage (name kept for routing/back-end category)
// Reworked minigame: "Queue Sort" (casual, skill + light planning)
// A number falls toward the decision line.
// Swipe / tap LEFT to ENQUEUE (keep), RIGHT to DISCARD (throw away).
// Your queued numbers automatically output FIFO when the front matches the next target.
// Miss (no decision) or overflow the queue = lose.

const LS_BEST = "cc_queuesort_best_v1";

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function randInt(a, b) {
  return Math.floor(Math.random() * (b - a + 1)) + a;
}

function safeGetBest() {
  try {
    const v = Number(localStorage.getItem(LS_BEST) || "0");
    return Number.isFinite(v) ? v : 0;
  } catch {
    return 0;
  }
}

function safeSetBest(v) {
  try {
    localStorage.setItem(LS_BEST, String(v));
  } catch {
    // ignore
  }
}

function vibrate(pattern) {
  try {
    if (navigator.vibrate) navigator.vibrate(pattern);
  } catch {
    // ignore
  }
}

function diffCfg(difficulty) {
  if (difficulty === "HARD") {
    return {
      targetLen: 10,
      maxDigit: 15,
      queueCap: 5,
      baseSpeed: 360,
      speedUp: 14,
      // Keep this LOW so the falling numbers are not already in the target order.
      biasToNext: 0.28,
      deleteCharges: 3,
    };
  }
  if (difficulty === "MEDIUM") {
    return {
      targetLen: 8,
      maxDigit: 12,
      queueCap: 5,
      baseSpeed: 320,
      speedUp: 12,
      biasToNext: 0.30,
      deleteCharges: 3,
    };
  }
  return {
    targetLen: 6,
    maxDigit: 9,
    queueCap: 4,
    baseSpeed: 290,
    speedUp: 10,
    biasToNext: 0.32,
    deleteCharges: 2,
  };
}

function makeTarget(len, maxDigit) {
  const out = [];
  for (let i = 0; i < len; i++) out.push(randInt(0, maxDigit));
  return out;
}

function makeFalling(nextNeeded, maxDigit, biasToNext) {
  // IMPORTANT: do NOT drop digits in the exact target order.
  // We keep a small bias so the needed digit appears often enough,
  // but when not biased, we avoid spawning the needed digit to prevent "always enqueue" trivial play.
  let v;
  if (Math.random() < biasToNext) {
    v = nextNeeded;
  } else {
    v = randInt(0, maxDigit);
    if (maxDigit >= 1) {
      let guard = 0;
      while (v === nextNeeded && guard < 6) {
        v = randInt(0, maxDigit);
        guard += 1;
      }
    }
  }
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    value: v,
    xN: 0.5 + (Math.random() * 0.18 - 0.09), // normalized center-ish
    y: -80,
    vy: 0,
    state: "fall", // fall | left | right
    t: 0,
  };
}

export default function QueueCommanderPage() {
  const loc = useLocation();
  const challenge = loc.state?.challenge;
  const difficulty = challenge?.difficulty || "EASY";

  const cfg = useMemo(() => diffCfg(difficulty), [difficulty]);

  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const layoutRef = useRef({ queueBoxes: [], canvasRect: null, dpr: 1 });
  const rafRef = useRef(0);
  const lastTsRef = useRef(0);

  const startTsRef = useRef(0);

  const fallingRef = useRef(null);
  const queueRef = useRef([]);
  const targetRef = useRef([]);
  const targetIdxRef = useRef(0);
  const speedRef = useRef(cfg.baseSpeed);

  const [status, setStatus] = useState("playing"); // playing | won | lost
  const [best, setBest] = useState(safeGetBest());
  const [timeMs, setTimeMs] = useState(0);
  const [errors, setErrors] = useState(0);
  const [score, setScore] = useState(0);
  const [msg, setMsg] = useState("");
  const [targetUI, setTargetUI] = useState([]);
  const [targetIdxUI, setTargetIdxUI] = useState(0);
  const [queueUI, setQueueUI] = useState([]);
  const [selectedIdx, setSelectedIdx] = useState(-1);
  const [deleteCharges, setDeleteCharges] = useState(cfg.deleteCharges || 0);

  const pointerRef = useRef({ active: false, x0: 0, y0: 0, x: 0, y: 0 });

  function resizeCanvas() {
    const c = canvasRef.current;
    const w = wrapRef.current;
    if (!c || !w) return;
    const rect = w.getBoundingClientRect();
    const dpr = Math.max(1, Math.min(2.5, window.devicePixelRatio || 1));
    const nextW = Math.max(1, Math.floor(rect.width * dpr));
    const nextH = Math.max(1, Math.floor(rect.height * dpr));
    if (c.width !== nextW || c.height !== nextH) {
      c.width = nextW;
      c.height = nextH;
    }
  }

  function syncUI() {
    setTargetUI([...targetRef.current]);
    setTargetIdxUI(targetIdxRef.current);
    setQueueUI([...queueRef.current]);
    // Clamp selected index to current queue.
    setSelectedIdx((prev) => (prev >= 0 && prev < queueRef.current.length ? prev : -1));
  }

  function removeFromQueue(idx) {
    if (status !== "playing") return;
    if (deleteCharges <= 0) return;
    const q = queueRef.current;
    if (!q || idx < 0 || idx >= q.length) return;

    q.splice(idx, 1);
    setDeleteCharges((c) => Math.max(0, c - 1));
    setSelectedIdx(-1);
    setMsg("Removed");
    vibrate(12);
    // Re-run auto output in case the removal exposes a match at the front.
    autoOutput();
    syncUI();
    setTimeout(() => setMsg(""), 800);
  }

  function endGame(nextStatus, reason = "") {
    cancelAnimationFrame(rafRef.current);
    setStatus(nextStatus);
    const t = Math.max(0, Math.round(performance.now() - startTsRef.current));
    setTimeMs(t);

    if (nextStatus === "won") {
      const finalScore = targetIdxRef.current;
      vibrate([20, 35, 20]);
      setMsg("Clean output!");
      setErrors(0);
      if (finalScore > best) {
        setBest(finalScore);
        safeSetBest(finalScore);
      }
    } else {
      vibrate([18, 40, 18]);
      setErrors(1);
      if (reason === "miss") setMsg("Too slow!");
      else if (reason === "overflow") setMsg("Queue overflow!");
      else setMsg("Wrong move!");
    }
  }

  function autoOutput() {
    let progressed = 0;
    while (queueRef.current.length > 0 && targetIdxRef.current < targetRef.current.length) {
      const front = queueRef.current[0];
      const need = targetRef.current[targetIdxRef.current];
      if (front !== need) break;
      queueRef.current.shift();
      targetIdxRef.current += 1;
      progressed += 1;
    }

    if (progressed > 0) {
      // Score is number of correctly output digits.
      const nextScore = targetIdxRef.current;
      setScore(nextScore);
      if (nextScore > best) {
        setBest(nextScore);
        safeSetBest(nextScore);
      }
      vibrate(10);
    }

    if (targetIdxRef.current >= targetRef.current.length) {
      endGame("won");
    }
  }

  function decide(dir) {
    // dir: 'enqueue' | 'discard'
    if (status !== "playing") return;
    const f = fallingRef.current;
    if (!f || f.state !== "fall") return;

    if (dir === "enqueue") {
      queueRef.current.push(f.value);
      if (queueRef.current.length > cfg.queueCap) {
        setErrors(1);
        endGame("lost", "overflow");
        return;
      }
      f.state = "left";
      f.t = 0;
      autoOutput();
    } else {
      f.state = "right";
      f.t = 0;
    }

    // Slight speed-up with progress to keep tension.
    speedRef.current = cfg.baseSpeed + cfg.speedUp * targetIdxRef.current;
    syncUI();
  }

  function resetGame() {
    cancelAnimationFrame(rafRef.current);
    setStatus("playing");
    setErrors(0);
    setTimeMs(0);
    setMsg("");
    setSelectedIdx(-1);
    setDeleteCharges(cfg.deleteCharges || 0);

    startTsRef.current = performance.now();
    lastTsRef.current = 0;

    queueRef.current = [];
    targetRef.current = makeTarget(cfg.targetLen, cfg.maxDigit);
    targetIdxRef.current = 0;
    speedRef.current = cfg.baseSpeed;

    fallingRef.current = makeFalling(targetRef.current[0], cfg.maxDigit, cfg.biasToNext);
    setScore(0);
    syncUI();

    rafRef.current = requestAnimationFrame(tick);
  }

  function tick(ts) {
    const c = canvasRef.current;
    const w = wrapRef.current;
    if (!c || !w) {
      rafRef.current = requestAnimationFrame(tick);
      return;
    }

    if (!lastTsRef.current) lastTsRef.current = ts;
    const dt = clamp((ts - lastTsRef.current) / 1000, 0, 0.033);
    lastTsRef.current = ts;

    resizeCanvas();

    // Cache rect for hit testing (tap-to-select queue slots)
    try {
      layoutRef.current.canvasRect = c.getBoundingClientRect();
      layoutRef.current.dpr = c.width / Math.max(1, layoutRef.current.canvasRect.width);
    } catch {
      // ignore
    }

    const ctx = c.getContext("2d");
    const W = c.width;
    const H = c.height;
    const dpr = Math.max(1, Math.min(2.5, window.devicePixelRatio || 1));

    // Layout
    const pad = 18 * dpr;
    const lineY = H * 0.78;
    const laneW = W - pad * 2;
    const centerX = pad + laneW * 0.5;

    // Background
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "rgba(0,0,0,0.22)";
    ctx.fillRect(0, 0, W, H);

    // Decision line
    ctx.strokeStyle = "rgba(255,255,255,0.14)";
    ctx.lineWidth = 2 * dpr;
    ctx.beginPath();
    ctx.moveTo(pad, lineY);
    ctx.lineTo(W - pad, lineY);
    ctx.stroke();

    // Left / right hint zones
    ctx.fillStyle = "rgba(255,255,255,0.03)";
    ctx.fillRect(pad, lineY, laneW * 0.5, H - lineY);
    ctx.fillStyle = "rgba(255,255,255,0.02)";
    ctx.fillRect(pad + laneW * 0.5, lineY, laneW * 0.5, H - lineY);

    // Update falling number
    const f = fallingRef.current;
    if (status === "playing" && f) {
      if (f.state === "fall") {
        f.vy = speedRef.current;
        f.y += f.vy * dt;
        if (f.y >= lineY - 40 * dpr) {
          // Reached decision line without input
          endGame("lost", "miss");
          return;
        }
      } else {
        // Exit animation
        f.t += dt;
        const k = clamp(f.t / 0.18, 0, 1);
        const offX = (laneW * 0.55) * (f.state === "left" ? -1 : 1);
        f.y += speedRef.current * dt * 0.9;
        f.xN = (centerX + offX * k - pad) / laneW;
        if (k >= 1) {
          // spawn next
          const idx = targetIdxRef.current;
          const nextNeed = targetRef.current[Math.min(idx, targetRef.current.length - 1)] ?? 0;
          fallingRef.current = makeFalling(nextNeed, cfg.maxDigit, cfg.biasToNext);
          syncUI();
        }
      }
    }

    // Draw falling chip
    if (f) {
      const chipW = 86 * dpr;
      const chipH = 62 * dpr;
      const x = pad + laneW * clamp(f.xN, 0.1, 0.9) - chipW / 2;
      const y = f.y;

      // chip
      ctx.fillStyle = "rgba(255,255,255,0.10)";
      ctx.strokeStyle = "rgba(255,255,255,0.16)";
      ctx.lineWidth = 2 * dpr;

      const r = 16 * dpr;
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + chipW, y, x + chipW, y + chipH, r);
      ctx.arcTo(x + chipW, y + chipH, x, y + chipH, r);
      ctx.arcTo(x, y + chipH, x, y, r);
      ctx.arcTo(x, y, x + chipW, y, r);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // number
      ctx.fillStyle = "rgba(255,255,255,0.95)";
      ctx.font = `${Math.floor(30 * dpr)}px ui-sans-serif, system-ui, -apple-system`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(f.value), x + chipW / 2, y + chipH / 2 + 1 * dpr);
    }

    // Draw queue preview (FIFO)
    const q = queueRef.current;
    const qY = H * 0.82;
    const box = 46 * dpr;
    const gap = 10 * dpr;
    const totalW = cfg.queueCap * box + (cfg.queueCap - 1) * gap;
    let qX = centerX - totalW / 2;

    // store hitboxes for tap selection
    layoutRef.current.queueBoxes = [];

    for (let i = 0; i < cfg.queueCap; i++) {
      const has = i < q.length;
      const bx = qX + i * (box + gap);
      layoutRef.current.queueBoxes.push({ i, x: bx, y: qY, w: box, h: box, has });
      ctx.fillStyle = has ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.04)";
      const isSel = has && i === selectedIdx;
      ctx.strokeStyle = isSel ? "rgba(99,102,241,0.75)" : "rgba(255,255,255,0.12)";
      ctx.lineWidth = 2 * dpr;
      const rr = 12 * dpr;
      ctx.beginPath();
      ctx.moveTo(bx + rr, qY);
      ctx.arcTo(bx + box, qY, bx + box, qY + box, rr);
      ctx.arcTo(bx + box, qY + box, bx, qY + box, rr);
      ctx.arcTo(bx, qY + box, bx, qY, rr);
      ctx.arcTo(bx, qY, bx + box, qY, rr);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      if (has) {
        ctx.fillStyle = "rgba(255,255,255,0.92)";
        ctx.font = `${Math.floor(20 * dpr)}px ui-sans-serif, system-ui, -apple-system`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(String(q[i]), bx + box / 2, qY + box / 2 + 1 * dpr);
      }
    }

    rafRef.current = requestAnimationFrame(tick);
  }

  // Init
  useEffect(() => {
    resetGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [difficulty]);

  // Resize listener
  useEffect(() => {
    const onResize = () => resizeCanvas();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Keyboard (desktop): Left/Right arrows, A/D, or 1/2.
  useEffect(() => {
    const onKeyDown = (e) => {
      if (status !== "playing") return;
      const k = (e.key || "").toLowerCase();
      if (k === "arrowleft" || k === "a" || k === "1") {
        e.preventDefault();
        decide("enqueue");
      }
      if (k === "arrowright" || k === "d" || k === "2") {
        e.preventDefault();
        decide("discard");
      }
      if (k === "x" || k === "delete" || k === "backspace") {
        if (selectedIdx >= 0) {
          e.preventDefault();
          removeFromQueue(selectedIdx);
        }
      }
    };
    window.addEventListener("keydown", onKeyDown, { passive: false });
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, selectedIdx, deleteCharges]);

  // Pointer swipe (mobile): swipe left = enqueue, right = discard.
  function onPointerDown(e) {
    if (status !== "playing") return;

    // Tap-to-select queue slot
    const rect = layoutRef.current.canvasRect;
    const dprHit = layoutRef.current.dpr || 1;
    if (rect) {
      const xC = (e.clientX - rect.left) * dprHit;
      const yC = (e.clientY - rect.top) * dprHit;
      const boxes = layoutRef.current.queueBoxes || [];
      for (const b of boxes) {
        if (!b.has) continue;
        if (xC >= b.x && xC <= b.x + b.w && yC >= b.y && yC <= b.y + b.h) {
          setSelectedIdx(b.i);
          vibrate(8);
          return;
        }
      }
    }

    pointerRef.current.active = true;
    pointerRef.current.x0 = e.clientX;
    pointerRef.current.y0 = e.clientY;
    pointerRef.current.x = e.clientX;
    pointerRef.current.y = e.clientY;
  }
  function onPointerMove(e) {
    if (!pointerRef.current.active) return;
    pointerRef.current.x = e.clientX;
    pointerRef.current.y = e.clientY;
  }
  function onPointerUp() {
    if (!pointerRef.current.active) return;
    pointerRef.current.active = false;
    const dx = pointerRef.current.x - pointerRef.current.x0;
    const dy = pointerRef.current.y - pointerRef.current.y0;
    if (Math.abs(dx) < 28 || Math.abs(dx) < Math.abs(dy)) return;
    decide(dx < 0 ? "enqueue" : "discard");
  }

  const remaining = Math.max(0, targetUI.length - targetIdxUI);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        paddingTop: "calc(12px + env(safe-area-inset-top))",
        paddingBottom: "calc(12px + env(safe-area-inset-bottom))",
        paddingLeft: "calc(12px + env(safe-area-inset-left))",
        paddingRight: "calc(12px + env(safe-area-inset-right))",
        boxSizing: "border-box",
        touchAction: "none",
      }}
    >
      {/* HUD */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <div className="panel" style={{ padding: "8px 12px", borderRadius: 999, fontWeight: 900 }}>
            Score {score}
          </div>
          <div className="panel" style={{ padding: "8px 12px", borderRadius: 999, opacity: 0.9, fontWeight: 800 }}>
            Remaining {remaining}
          </div>
          <div className="panel" style={{ padding: "8px 12px", borderRadius: 999, opacity: 0.85, fontWeight: 800 }}>
            Queue {queueUI.length}/{cfg.queueCap}
          </div>
          <div className="panel" style={{ padding: "8px 12px", borderRadius: 999, opacity: 0.85, fontWeight: 800 }}>
            Removes {deleteCharges}
          </div>
        </div>
        <div className="panel" style={{ padding: "8px 12px", borderRadius: 999, opacity: 0.7, fontWeight: 800 }}>
          Best {best}
        </div>
      </div>

      {/* Target output */}
      <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        {targetUI.map((n, i) => {
          const done = i < targetIdxUI;
          const next = i === targetIdxUI;
          return (
            <div
              key={`${n}-${i}`}
              style={{
                minWidth: 40,
                height: 38,
                padding: "0 10px",
                borderRadius: 999,
                display: "grid",
                placeItems: "center",
                fontWeight: 900,
                border: "1px solid rgba(255,255,255,0.12)",
                background: done ? "rgba(255,255,255,0.08)" : next ? "rgba(99,102,241,0.28)" : "rgba(255,255,255,0.05)",
                color: "rgba(255,255,255,0.92)",
              }}
            >
              {n}
            </div>
          );
        })}
      </div>

      {/* Playfield */}
      <div
        ref={wrapRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{
          marginTop: 10,
          flex: 1,
          minHeight: 0,
          borderRadius: 18,
          overflow: "hidden",
          background: "rgba(0,0,0,0.16)",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} />
      </div>

      {/* Controls */}
      <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
        <Button
          style={{ height: 58, fontSize: 18, fontWeight: 900, borderRadius: 18 }}
          onClick={() => decide("enqueue")}
          disabled={status !== "playing"}
        >
          ENQUEUE
        </Button>
        <Button
          style={{ height: 58, fontSize: 18, fontWeight: 900, borderRadius: 18 }}
          variant="secondary"
          onClick={() => decide("discard")}
          disabled={status !== "playing"}
        >
          DISCARD
        </Button>
        <Button
          style={{ height: 58, fontSize: 18, fontWeight: 900, borderRadius: 18 }}
          variant="outline"
          onClick={() => removeFromQueue(selectedIdx)}
          disabled={status !== "playing" || selectedIdx < 0 || deleteCharges <= 0}
        >
          REMOVE
        </Button>
      </div>

      {msg ? (
        <div style={{ marginTop: 8, textAlign: "center", color: "rgba(255,255,255,0.85)", fontWeight: 800 }}>
          {msg}
        </div>
      ) : null}

      {status !== "playing" && (
        <ResultSubmitPanel
          category="QUEUE_COMMANDER"
          difficulty={difficulty}
          timeMs={timeMs}
          errors={errors}
          won={status === "won"}
          challengeId={challenge?.challengeInstanceId}
        />
      )}
    </div>
  );
}
