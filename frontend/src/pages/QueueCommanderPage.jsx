import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";

import { Button } from "../components/ui/button";
import ResultSubmitPanel from "../components/ResultSubmitPanel";

// QueueCommanderPage (kept name for routing/back-end category)
// Reworked minigame: "Queue Panic!" (casual, reaction-based)
// A line of silly characters approaches the counter. Each flashes an icon.
// Tap the matching icon before they reach the counter. Wrong tap or miss = lose.

const LS_BEST = "cc_queuepanic_best_v1";

const ICONS = [
  { key: "FIRE", emoji: "🔥" },
  { key: "WATER", emoji: "💧" },
  { key: "ELECTRIC", emoji: "⚡" },
  { key: "FOOD", emoji: "🍔" },
];

const FACES = ["😀", "😎", "🤖", "👽", "🐸", "🦊", "🐵", "🐼", "😺", "🧠"];

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function randInt(a, b) {
  return Math.floor(Math.random() * (b - a + 1)) + a;
}

function choice(arr) {
  return arr[randInt(0, arr.length - 1)];
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
      target: 20,
      baseSpeed: 0.28,
      speedUp: 0.013,
      fakeChance: 0.38,
      doubleFrom: 6,
      doubleChance: 0.45,
    };
  }
  if (difficulty === "MEDIUM") {
    return {
      target: 16,
      baseSpeed: 0.23,
      speedUp: 0.010,
      fakeChance: 0.26,
      doubleFrom: 8,
      doubleChance: 0.30,
    };
  }
  return {
    target: 12,
    baseSpeed: 0.18,
    speedUp: 0.008,
    fakeChance: 0.12,
    doubleFrom: 999,
    doubleChance: 0,
  };
}

function makeCustomer(score, cfg) {
  const primary = choice(ICONS);
  const targets = [primary.key];

  // Later rounds: allow "double icon" (either input is accepted).
  if (score >= cfg.doubleFrom && Math.random() < cfg.doubleChance) {
    let secondary = choice(ICONS);
    let guard = 0;
    while (guard++ < 20 && secondary.key === primary.key) secondary = choice(ICONS);
    targets.push(secondary.key);
  }

  const fake = Math.random() < cfg.fakeChance;
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    face: choice(FACES),
    targets,
    fake,
    spawnedAt: performance.now(),
  };
}

export default function QueueCommanderPage() {
  const loc = useLocation();
  const challenge = loc.state?.challenge;
  const difficulty = challenge?.difficulty || "EASY";

  const cfg = useMemo(() => diffCfg(difficulty), [difficulty]);

  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const rafRef = useRef(0);
  const lastTsRef = useRef(0);

  // "Front progress" in normalized lane space (0..1). When it reaches 1 => miss.
  const leadRef = useRef(0.10);
  const speedRef = useRef(cfg.baseSpeed);
  const qRef = useRef([]);

  const startTsRef = useRef(0);

  const [status, setStatus] = useState("playing"); // playing | won | lost
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(safeGetBest());
  const [timeMs, setTimeMs] = useState(0);
  const [errors, setErrors] = useState(0);
  const [message, setMessage] = useState("");

  const remaining = Math.max(0, cfg.target - score);

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

  function endGame(nextStatus, reason = "") {
    cancelAnimationFrame(rafRef.current);
    setStatus(nextStatus);
    const t = Math.max(0, Math.round(performance.now() - startTsRef.current));
    setTimeMs(t);
    if (nextStatus === "won") {
      vibrate([20, 35, 20]);
      setMessage("Perfect service! ✨");
    } else {
      vibrate([18, 40, 18]);
      setMessage(reason === "wrong" ? "Wrong! ❌" : "Too slow! 💥");
      setErrors(1);
    }
  }

  function resetGame() {
    cancelAnimationFrame(rafRef.current);
    setStatus("playing");
    setScore(0);
    setErrors(0);
    setTimeMs(0);
    setMessage("");

    startTsRef.current = performance.now();
    lastTsRef.current = 0;
    leadRef.current = 0.10;
    speedRef.current = cfg.baseSpeed;

    // Start with 5 customers in line.
    const startQ = [];
    for (let i = 0; i < 5; i++) startQ.push(makeCustomer(0, cfg));
    qRef.current = startQ;

    rafRef.current = requestAnimationFrame(tick);
  }

  function serveIfCorrect(iconKey) {
    if (status !== "playing") return;
    const q = qRef.current;
    const front = q[0];
    if (!front) return;

    const ok = front.targets.includes(iconKey);
    if (!ok) {
      setErrors(1);
      endGame("lost", "wrong");
      return;
    }

    // correct
    vibrate(10);
    q.shift();
    q.push(makeCustomer(score + 1, cfg));
    qRef.current = q;

    // When serving, pull the line back a bit so it doesn't feel like a teleport.
    // spacing is normalized; see tick()/draw.
    const spacing = 0.14;
    leadRef.current = Math.max(0, leadRef.current - spacing);

    const nextScore = score + 1;
    setScore(nextScore);

    // Speed ramps up.
    speedRef.current = speedRef.current + cfg.speedUp;

    if (nextScore > best) {
      setBest(nextScore);
      safeSetBest(nextScore);
    }

    if (nextScore >= cfg.target) {
      endGame("won");
    }
  }

  function tick(ts) {
    if (status !== "playing") return;
    if (!lastTsRef.current) lastTsRef.current = ts;
    const dt = Math.min(0.05, Math.max(0, (ts - lastTsRef.current) / 1000));
    lastTsRef.current = ts;

    // Advance front customer.
    leadRef.current += speedRef.current * dt;
    if (leadRef.current >= 1) {
      endGame("lost");
      return;
    }

    draw(ts);
    rafRef.current = requestAnimationFrame(tick);
  }

  function draw(nowTs) {
    const c = canvasRef.current;
    const w = wrapRef.current;
    if (!c || !w) return;

    resizeCanvas();
    const ctx = c.getContext("2d");
    if (!ctx) return;

    const pxW = c.width;
    const pxH = c.height;
    const dpr = pxW / Math.max(1, w.getBoundingClientRect().width);

    // Background
    ctx.clearRect(0, 0, pxW, pxH);
    const g = ctx.createLinearGradient(0, 0, 0, pxH);
    g.addColorStop(0, "rgba(2,6,23,0.96)");
    g.addColorStop(1, "rgba(2,6,23,0.88)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, pxW, pxH);

    // Lane
    const pad = 14 * dpr;
    const laneX = pad;
    const laneW = pxW - pad * 2;
    const laneTop = 10 * dpr;
    const laneBottom = pxH - 10 * dpr;
    const counterY = laneTop + 70 * dpr;

    // Counter bar
    ctx.fillStyle = "rgba(255,255,255,0.10)";
    ctx.fillRect(laneX, counterY - 2 * dpr, laneW, 4 * dpr);
    ctx.fillStyle = "rgba(255,255,255,0.30)";
    ctx.font = `${Math.floor(12 * dpr)}px system-ui, -apple-system, Segoe UI, Roboto`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText("COUNTER", laneX, counterY - 18 * dpr);

    // Customers
    const q = qRef.current;
    const spacing = 0.14; // normalized
    const lead = leadRef.current;
    const laneLen = laneBottom - counterY - 34 * dpr;
    const radius = Math.min(34 * dpr, laneW * 0.12);

    for (let i = 0; i < q.length; i++) {
      const customer = q[i];
      const prog = lead - i * spacing;
      // Prog < 0 means off-screen bottom; allow a bit of pre-roll.
      if (prog < -0.25) continue;

      const y = counterY + 34 * dpr + clamp(prog, -0.25, 1.2) * laneLen;
      const x = laneX + laneW * 0.5;

      // Shadow
      ctx.beginPath();
      ctx.fillStyle = "rgba(0,0,0,0.25)";
      ctx.ellipse(x, y + radius * 0.85, radius * 0.85, radius * 0.35, 0, 0, Math.PI * 2);
      ctx.fill();

      // Body
      ctx.beginPath();
      ctx.fillStyle = i === 0 ? "rgba(99,102,241,0.28)" : "rgba(255,255,255,0.10)";
      ctx.strokeStyle = i === 0 ? "rgba(99,102,241,0.55)" : "rgba(255,255,255,0.16)";
      ctx.lineWidth = 2 * dpr;
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Face
      ctx.fillStyle = "rgba(255,255,255,0.95)";
      ctx.font = `${Math.floor(radius * 0.9)}px system-ui, -apple-system, Segoe UI, Roboto`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(customer.face, x, y + 1 * dpr);

      // Icon bubble (show correct icon, sometimes fake-out flashes)
      const bubbleW = radius * 1.55;
      const bubbleH = radius * 0.78;
      const bx = x + radius * 0.95;
      const by = y - radius * 0.95;
      ctx.beginPath();
      ctx.fillStyle = "rgba(0,0,0,0.40)";
      ctx.strokeStyle = "rgba(255,255,255,0.18)";
      ctx.lineWidth = 2 * dpr;
      const r = bubbleH * 0.45;
      // rounded rect
      const x0 = bx - bubbleW * 0.5;
      const y0 = by - bubbleH * 0.5;
      const x1 = x0 + bubbleW;
      const y1 = y0 + bubbleH;
      ctx.moveTo(x0 + r, y0);
      ctx.arcTo(x1, y0, x1, y1, r);
      ctx.arcTo(x1, y1, x0, y1, r);
      ctx.arcTo(x0, y1, x0, y0, r);
      ctx.arcTo(x0, y0, x1, y0, r);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      let shownTargets = customer.targets;
      if (customer.fake) {
        const age = nowTs - customer.spawnedAt;
        // Brief fake-out: first ~220ms show wrong icon; then correct.
        if (age < 220) {
          const wrong = choice(ICONS.filter((ic) => !customer.targets.includes(ic.key)));
          shownTargets = [wrong.key];
        }
      }

      const iconsText = shownTargets
        .map((k) => ICONS.find((ic) => ic.key === k)?.emoji)
        .filter(Boolean)
        .join("");
      ctx.fillStyle = "rgba(255,255,255,0.95)";
      ctx.font = `${Math.floor(bubbleH * 0.72)}px system-ui, -apple-system, Segoe UI, Roboto`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(iconsText, bx, by + 1 * dpr);
    }

    // Danger pulse when close
    const danger = clamp((lead - 0.78) / 0.22, 0, 1);
    if (danger > 0) {
      ctx.fillStyle = `rgba(239,68,68,${0.08 + danger * 0.10})`;
      ctx.fillRect(0, 0, pxW, pxH);
    }
  }

  // Setup loop + resize
  useEffect(() => {
    resetGame();

    const onResize = () => {
      resizeCanvas();
    };
    window.addEventListener("resize", onResize);

    let ro = null;
    if (window.ResizeObserver && wrapRef.current) {
      ro = new ResizeObserver(() => resizeCanvas());
      ro.observe(wrapRef.current);
    }

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", onResize);
      if (ro) ro.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [difficulty]);

  // Keyboard (desktop test): 1-4
  useEffect(() => {
    const onKey = (e) => {
      if (status !== "playing") return;
      const k = e.key;
      if (k === "1") return serveIfCorrect("FIRE");
      if (k === "2") return serveIfCorrect("WATER");
      if (k === "3") return serveIfCorrect("ELECTRIC");
      if (k === "4") return serveIfCorrect("FOOD");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [status, score, cfg]);

  const pill = {
    padding: "6px 10px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.10)",
    border: "1px solid rgba(255,255,255,0.12)",
    color: "rgba(255,255,255,0.92)",
    fontWeight: 800,
    fontSize: 12,
  };

  return (
    <div
      className="qpFS"
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        paddingTop: "calc(env(safe-area-inset-top) + 10px)",
        paddingBottom: "calc(env(safe-area-inset-bottom) + 10px)",
        paddingLeft: "calc(env(safe-area-inset-left) + 10px)",
        paddingRight: "calc(env(safe-area-inset-right) + 10px)",
        background:
          "radial-gradient(1200px 650px at 50% -10%, rgba(99,102,241,0.20), transparent 55%), linear-gradient(180deg, rgba(2,6,23,0.96), rgba(2,6,23,0.92))",
        color: "rgba(255,255,255,0.92)",
        userSelect: "none",
        WebkitTapHighlightColor: "transparent",
        touchAction: "none",
      }}
      aria-label="Queue Panic"
    >
      <style>{`
        .qpBtn{ height: 64px; border-radius: 18px; font-weight: 900; font-size: 20px; }
        @media (max-width: 420px){ .qpBtn{ height: 60px; font-size: 18px; } }
      `}</style>

      {/* HUD */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <div style={pill}>⭐ {score}</div>
          <div style={pill}>🎯 {remaining}</div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", justifyContent: "flex-end" }}>
          <div style={pill}>🏆 {best}</div>
        </div>
      </div>

      {/* Playfield */}
      <div
        ref={wrapRef}
        style={{
          marginTop: 10,
          flex: 1,
          minHeight: 0,
          borderRadius: 18,
          overflow: "hidden",
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.10)",
        }}
      >
        <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} />
      </div>

      {/* Feedback */}
      {message ? (
        <div style={{ marginTop: 10, textAlign: "center" }}>
          <div
            style={{
              display: "inline-block",
              padding: "8px 12px",
              borderRadius: 999,
              background: "rgba(0,0,0,0.35)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "rgba(255,255,255,0.88)",
              fontWeight: 800,
              fontSize: 12,
              maxWidth: 560,
              width: "100%",
            }}
          >
            {message}
          </div>
        </div>
      ) : null}

      {/* Controls */}
      <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
        {ICONS.map((ic) => (
          <Button
            key={ic.key}
            className="qpBtn"
            onClick={() => serveIfCorrect(ic.key)}
            disabled={status !== "playing"}
            aria-label={ic.key}
          >
            {ic.emoji}
          </Button>
        ))}
      </div>

      {status !== "playing" && (
        <ResultSubmitPanel
          category="QUEUE_COMMANDER"
          difficulty={difficulty}
          timeMs={timeMs}
          errors={errors}
          won={status === "won"}
          onPlayAgain={resetGame}
          challengeId={challenge?.challengeInstanceId}
        />
      )}
    </div>
  );
}
