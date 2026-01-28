import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { Button } from "../components/ui/button";
import ResultSubmitPanel from "../components/ResultSubmitPanel";

// Queue Commander (v5): Crowd Control (TACTICAL)
// Goal: calm, readable, one-finger mobile gameplay.
// Key change vs v4: NO real-time spawning or time pressure.
// New loop: you take actions; after each action ONE new person arrives from a visible "NEXT" preview.
// That makes it tactical (plan around FIFO), not stressful.

const LS_BEST = "cc_queuecommander_best_v5";

function randInt(a, b) {
  return Math.floor(Math.random() * (b - a + 1)) + a;
}

function choice(arr) {
  return arr[randInt(0, arr.length - 1)];
}

function getBest() {
  try {
    const v = Number(localStorage.getItem(LS_BEST) || "0");
    return Number.isFinite(v) ? v : 0;
  } catch {
    return 0;
  }
}

function setBest(v) {
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

const TYPES = [
  { key: "SET", label: "SET", color: "rgba(59,130,246,0.95)" }, // blue
  { key: "AND", label: "AND", color: "rgba(34,197,94,0.95)" }, // green
  { key: "OR", label: "OR", color: "rgba(249,115,22,0.95)" }, // orange
  { key: "XOR", label: "XOR", color: "rgba(168,85,247,0.95)" }, // purple
  { key: "NOT", label: "NOT", color: "rgba(236,72,153,0.95)" }, // pink
];

function diffCfg(difficulty) {
  // Tactical defaults: fewer types on easy, more planning tools (rotations), and a small mission target.
  if (difficulty === "HARD") {
    return {
      cap: 7,
      typeCount: 5,
      ruleLen: 5,
      lives: 2,
      rotMax: 2,
      // mission
      targetRules: 5,
      // preview depth
      previewN: 3,
    };
  }
  if (difficulty === "MEDIUM") {
    return {
      cap: 8,
      typeCount: 4,
      ruleLen: 4,
      lives: 3,
      rotMax: 3,
      targetRules: 4,
      previewN: 3,
    };
  }
  return {
    cap: 9,
    typeCount: 3,
    ruleLen: 3,
    lives: 3,
    rotMax: 4,
    targetRules: 3,
    previewN: 3,
  };
}

function makeRule(typeCount, ruleLen) {
  const pool = TYPES.slice(0, typeCount);
  const rule = [];
  let last = null;
  for (let i = 0; i < ruleLen; i++) {
    let t = choice(pool);
    let guard = 0;
    while (guard++ < 12 && last && t.key === last.key) t = choice(pool);
    rule.push(t.key);
    last = t;
  }
  return rule;
}

function roundedRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function drawToken(ctx, key, x, y, size, isActive, isDone) {
  const t = TYPES.find((tt) => tt.key === key) || TYPES[0];
  const r = size * 0.22;

  ctx.save();
  ctx.globalAlpha = isDone ? 0.55 : 1;

  roundedRect(ctx, x, y, size, size, size * 0.18);
  ctx.fillStyle = "rgba(255,255,255,0.10)";
  ctx.fill();
  ctx.lineWidth = isActive ? Math.max(2, size * 0.06) : Math.max(1.5, size * 0.04);
  ctx.strokeStyle = isActive ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.25)";
  ctx.stroke();

  // icon
  ctx.fillStyle = t.color;
  const cx = x + size / 2;
  const cy = y + size / 2;
  ctx.beginPath();
  if (key === "SET") {
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
  } else if (key === "AND") {
    ctx.moveTo(cx - r, cy);
    ctx.lineTo(cx, cy - r);
    ctx.lineTo(cx + r, cy);
    ctx.lineTo(cx, cy + r);
    ctx.closePath();
  } else if (key === "OR") {
    ctx.rect(cx - r, cy - r, r * 2, r * 2);
  } else if (key === "XOR") {
    ctx.moveTo(cx, cy - r);
    ctx.lineTo(cx + r, cy);
    ctx.lineTo(cx, cy + r);
    ctx.lineTo(cx - r, cy);
    ctx.closePath();
  } else {
    ctx.moveTo(cx - r, cy + r * 0.15);
    ctx.lineTo(cx, cy - r);
    ctx.lineTo(cx + r, cy + r * 0.15);
    ctx.closePath();
  }
  ctx.fill();

  // label
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  roundedRect(ctx, x + size * 0.12, y + size * 0.68, size * 0.76, size * 0.22, size * 0.12);
  ctx.fill();
  ctx.globalAlpha = isDone ? 0.65 : 0.95;
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.font = `${Math.floor(size * 0.20)}px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(t.label, x + size / 2, y + size * 0.79);

  ctx.restore();
}

export default function QueueCommanderPage() {
  const loc = useLocation();
  const challenge = loc.state?.challenge;
  const difficulty = challenge?.difficulty || "EASY";

  const cfg = useMemo(() => diffCfg(difficulty), [difficulty]);

  const [status, setStatus] = useState("playing"); // playing | won | lost
  const [score, setScore] = useState(0);
  const [best, setBestState] = useState(getBest());
  const [combo, setCombo] = useState(0);
  const [ruleStep, setRuleStep] = useState(0);
  const [rulesDone, setRulesDone] = useState(0);
  const [lives, setLives] = useState(cfg.lives);
  const [rotCharges, setRotCharges] = useState(cfg.rotMax);
  const [hint, setHint] = useState("Tap = Serve · Swipe down = Send Back · WAIT is safe");

  // Timer for scoring + result submit
  const startRef = useRef(performance.now());
  const [timeMs, setTimeMs] = useState(0);

  const canvasRef = useRef(null);
  const canvasWrapRef = useRef(null);
  const rafRef = useRef(0);

  const simRef = useRef({
    queue: [],
    preview: [],
    rule: makeRule(cfg.typeCount, cfg.ruleLen),
    ruleIdx: 0,
    score: 0,
    combo: 0,
    rulesDone: 0,
    lives: cfg.lives,
    rot: cfg.rotMax,
    running: true,
    // juice
    shakeT: 0,
    shakeMs: 0,
    shakePx: 0,
    flashT: 0,
    flashMs: 0,
    flashGood: false,
  });

  const inputRef = useRef({ down: false, sx: 0, sy: 0 });

  function syncUIFromSim() {
    const s = simRef.current;
    setScore(s.score);
    setCombo(s.combo);
    setRulesDone(s.rulesDone);
    setLives(s.lives);
    setRotCharges(s.rot);
    setRuleStep(s.ruleIdx);
  }

  function randomTypeKey() {
    const pool = TYPES.slice(0, cfg.typeCount);
    return choice(pool).key;
  }

  function resetGame() {
    const s = simRef.current;

    startRef.current = performance.now();
    setTimeMs(0);

    s.queue = [];
    s.preview = [];
    s.rule = makeRule(cfg.typeCount, cfg.ruleLen);
    s.ruleIdx = 0;
    s.score = 0;
    s.combo = 0;
    s.rulesDone = 0;
    s.lives = cfg.lives;
    s.rot = cfg.rotMax;
    s.running = true;

    s.shakeT = 0;
    s.shakeMs = 0;
    s.shakePx = 0;
    s.flashT = 0;
    s.flashMs = 0;
    s.flashGood = false;

    // fill preview + initial queue
    for (let i = 0; i < cfg.previewN; i++) s.preview.push(randomTypeKey());
    const initial = Math.min(cfg.cap - 2, 5);
    for (let i = 0; i < initial; i++) {
      s.queue.push({ key: s.preview.shift(), born: performance.now() });
      s.preview.push(randomTypeKey());
    }

    setStatus("playing");
    setHint("Tap = Serve · Swipe down = Send Back · WAIT is safe");
    syncUIFromSim();
  }

  function lose(reason) {
    const s = simRef.current;
    if (!s.running) return;
    s.running = false;
    setTimeMs(Math.round(performance.now() - startRef.current));
    setStatus("lost");
    setHint(reason);

    const b = Math.max(best, s.score);
    setBestState(b);
    setBest(b);
  }

  function win() {
    const s = simRef.current;
    if (!s.running) return;
    s.running = false;
    setTimeMs(Math.round(performance.now() - startRef.current));
    setStatus("won");
    setHint("Mission complete!");

    const b = Math.max(best, s.score);
    setBestState(b);
    setBest(b);

    vibrate([18, 30, 18]);
  }

  function juiceBad() {
    const s = simRef.current;
    s.shakeT = performance.now();
    s.shakeMs = 180;
    s.shakePx = 10;
    s.flashT = performance.now();
    s.flashMs = 120;
    s.flashGood = false;
    vibrate(20);
  }

  function juiceGood() {
    const s = simRef.current;
    s.flashT = performance.now();
    s.flashMs = 120;
    s.flashGood = true;
  }

  function advanceArrival() {
    // After EACH action: one person arrives from NEXT.
    const s = simRef.current;
    if (!s.running) return;

    if (s.queue.length >= cfg.cap) {
      // tactical: overflow is your fault, immediate loss (no stress timer)
      juiceBad();
      syncUIFromSim();
      lose("Overflow");
      return;
    }

    const k = s.preview.shift();
    s.queue.push({ key: k, born: performance.now() });
    s.preview.push(randomTypeKey());
  }

  function serveFront() {
    const s = simRef.current;
    if (!s.running) return;

    if (s.queue.length === 0) {
      // nothing to serve -> small penalty, still advances (keeps it tactical)
      s.combo = 0;
      s.score = Math.max(0, s.score - 1);
      juiceBad();
      advanceArrival();
      syncUIFromSim();
      return;
    }

    const front = s.queue[0];
    const want = s.rule[s.ruleIdx];

    if (front.key === want) {
      s.queue.shift();
      s.ruleIdx += 1;
      s.combo = Math.min(30, s.combo + 1);
      s.score += 6 + Math.min(6, s.combo);
      juiceGood();

      if (s.ruleIdx >= s.rule.length) {
        s.rulesDone += 1;
        s.score += 25 + s.combo * 2;
        s.combo += 1;
        s.rule = makeRule(cfg.typeCount, cfg.ruleLen);
        s.ruleIdx = 0;
        // reward: regain 1 rotate (up to max)
        s.rot = Math.min(cfg.rotMax, s.rot + 1);
        vibrate([12, 20, 12]);

        if (s.rulesDone >= cfg.targetRules) {
          syncUIFromSim();
          win();
          return;
        }
      }

      advanceArrival();
      syncUIFromSim();
      return;
    }

    // mismatch
    s.queue.shift();
    s.combo = 0;
    s.lives -= 1;
    s.score = Math.max(0, s.score - 6);
    juiceBad();

    if (s.lives <= 0) {
      syncUIFromSim();
      lose("No lives");
      return;
    }

    advanceArrival();
    syncUIFromSim();
  }

  function sendBack() {
    const s = simRef.current;
    if (!s.running) return;

    if (s.rot <= 0) {
      juiceBad();
      syncUIFromSim();
      return;
    }

    if (s.queue.length <= 1) {
      // rotate doesn't help, but don't punish.
      advanceArrival();
      syncUIFromSim();
      return;
    }

    const front = s.queue.shift();
    s.queue.push(front);
    s.rot -= 1;

    advanceArrival();
    syncUIFromSim();
  }

  function waitTurn() {
    // Safe "do nothing" action (still adds ONE arrival).
    // This keeps the game moving without stress.
    const s = simRef.current;
    if (!s.running) return;
    s.combo = Math.max(0, s.combo - 1);
    s.score = Math.max(0, s.score - 1);
    advanceArrival();
    syncUIFromSim();
  }

  function draw() {
    const canvas = canvasRef.current;
    const wrap = canvasWrapRef.current;
    if (!canvas || !wrap) return;

    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const w = wrap.clientWidth;
    const h = wrap.clientHeight;

    const targetW = Math.max(1, Math.floor(w * dpr));
    const targetH = Math.max(1, Math.floor(h * dpr));
    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const s = simRef.current;

    // shake
    let ox = 0,
      oy = 0;
    if (s.shakeMs > 0) {
      const t = performance.now() - s.shakeT;
      if (t <= s.shakeMs) {
        const p = 1 - t / s.shakeMs;
        const mag = s.shakePx * p;
        ox = (Math.random() * 2 - 1) * mag;
        oy = (Math.random() * 2 - 1) * mag;
      } else {
        s.shakeMs = 0;
      }
    }

    ctx.save();
    ctx.translate(ox, oy);

    // background
    ctx.clearRect(0, 0, w, h);
    const grd = ctx.createLinearGradient(0, 0, 0, h);
    grd.addColorStop(0, "rgba(15,23,42,1)");
    grd.addColorStop(1, "rgba(2,6,23,1)");
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, w, h);

    // subtle grid
    ctx.globalAlpha = 0.12;
    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.lineWidth = 1;
    const grid = 36;
    for (let x = 0; x <= w; x += grid) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y <= h; y += grid) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // flash overlay
    if (s.flashMs > 0) {
      const t = performance.now() - s.flashT;
      if (t <= s.flashMs) {
        const p = 1 - t / s.flashMs;
        ctx.globalAlpha = 0.22 * p;
        ctx.fillStyle = s.flashGood ? "rgba(34,197,94,1)" : "rgba(239,68,68,1)";
        ctx.fillRect(0, 0, w, h);
        ctx.globalAlpha = 1;
      } else {
        s.flashMs = 0;
      }
    }

    // layout
    const pad = 14;
    const headerH = 108;
    const queueTop = headerH + pad;
    const queueH = h - queueTop - pad;

    // header panel
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    roundedRect(ctx, pad, pad, w - pad * 2, headerH, 16);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.lineWidth = 2;
    ctx.stroke();

    // title
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.font = "700 16px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto";
    ctx.textBaseline = "top";
    ctx.textAlign = "left";
    ctx.fillText("CROWD CONTROL", pad + 12, pad + 10);

    ctx.globalAlpha = 0.85;
    ctx.font = "500 12px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto";
    ctx.fillText("Tactical FIFO: plan with NEXT", pad + 12, pad + 32);
    ctx.globalAlpha = 1;

    // rule tokens (right)
    const tile = 40;
    const gap = 10;
    const ruleW = s.rule.length * tile + (s.rule.length - 1) * gap;
    const rx = w - pad - 12 - ruleW;
    const ry = pad + 18;
    for (let i = 0; i < s.rule.length; i++) {
      drawToken(ctx, s.rule[i], rx + i * (tile + gap), ry, tile, i === s.ruleIdx, i < s.ruleIdx);
    }

    // NEXT preview (left, under title)
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.font = "700 12px ui-sans-serif, system-ui";
    ctx.textAlign = "left";
    ctx.fillText("NEXT", pad + 12, pad + 58);
    ctx.globalAlpha = 1;

    const nextSize = 34;
    for (let i = 0; i < Math.min(3, s.preview.length); i++) {
      drawToken(ctx, s.preview[i], pad + 12 + i * (nextSize + 8), pad + 70, nextSize, false, false);
    }

    // queue lane
    const laneX = pad;
    const laneY = queueTop;
    const laneW = w - pad * 2;
    const laneH = queueH;

    ctx.fillStyle = "rgba(255,255,255,0.05)";
    roundedRect(ctx, laneX, laneY, laneW, laneH, 18);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.14)";
    ctx.lineWidth = 2;
    ctx.stroke();

    // queue cards
    const cardPad = 14;
    const cardH = 52;
    const cardGap = 10;
    const maxVisible = Math.max(1, Math.floor((laneH - cardPad * 2) / (cardH + cardGap)));

    const visible = s.queue.slice(0, maxVisible);
    for (let i = 0; i < visible.length; i++) {
      const p = visible[i];
      const t = TYPES.find((tt) => tt.key === p.key) || TYPES[0];
      const x = laneX + cardPad;
      const y = laneY + cardPad + i * (cardH + cardGap);
      const cw = laneW - cardPad * 2;

      const isFront = i === 0;

      ctx.fillStyle = isFront ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.08)";
      roundedRect(ctx, x, y, cw, cardH, 16);
      ctx.fill();
      ctx.strokeStyle = isFront ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.18)";
      ctx.lineWidth = isFront ? 3 : 2;
      ctx.stroke();

      // token pill
      const pillW = 84;
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      roundedRect(ctx, x + 12, y + 10, pillW, 32, 18);
      ctx.fill();

      // icon
      ctx.fillStyle = t.color;
      const cx = x + 12 + 22;
      const cy = y + 10 + 16;
      const r = 10;
      ctx.beginPath();
      if (t.key === "SET") ctx.arc(cx, cy, r, 0, Math.PI * 2);
      else if (t.key === "AND") {
        ctx.moveTo(cx - r, cy);
        ctx.lineTo(cx, cy - r);
        ctx.lineTo(cx + r, cy);
        ctx.lineTo(cx, cy + r);
        ctx.closePath();
      } else if (t.key === "OR") ctx.rect(cx - r, cy - r, r * 2, r * 2);
      else if (t.key === "XOR") {
        ctx.moveTo(cx, cy - r);
        ctx.lineTo(cx + r, cy);
        ctx.lineTo(cx, cy + r);
        ctx.lineTo(cx - r, cy);
        ctx.closePath();
      } else {
        ctx.moveTo(cx - r, cy + r * 0.15);
        ctx.lineTo(cx, cy - r);
        ctx.lineTo(cx + r, cy + r * 0.15);
        ctx.closePath();
      }
      ctx.fill();

      // label
      ctx.fillStyle = "rgba(255,255,255,0.92)";
      ctx.font = "700 12px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(t.label, x + 12 + 42, y + 10 + 16);

      if (isFront) {
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        ctx.font = "700 12px ui-sans-serif, system-ui";
        ctx.textAlign = "right";
        ctx.fillText("FRONT", x + cw - 12, y + cardH / 2);
        ctx.globalAlpha = 1;
      }
    }

    // cap indicator
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = "rgba(255,255,255,0.70)";
    ctx.font = "600 12px ui-sans-serif, system-ui";
    ctx.textAlign = "right";
    ctx.textBaseline = "top";
    ctx.fillText(`CAP ${cfg.cap}`, laneX + laneW - 12, laneY + 10);
    ctx.globalAlpha = 1;

    ctx.restore();
  }

  // main loop: draw only (no real-time sim)
  useEffect(() => {
    const tick = () => {
      rafRef.current = requestAnimationFrame(tick);
      draw();
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cfg.cap, cfg.typeCount, cfg.ruleLen]);

  // reset when difficulty changes / first mount
  useEffect(() => {
    resetGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [difficulty]);

  // pointer/touch on canvas: tap=serve, swipe down=send back
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const getPoint = (e) => {
      const rect = canvas.getBoundingClientRect();
      const clientX = e.touches?.[0]?.clientX ?? e.changedTouches?.[0]?.clientX ?? e.clientX;
      const clientY = e.touches?.[0]?.clientY ?? e.changedTouches?.[0]?.clientY ?? e.clientY;
      return { x: clientX - rect.left, y: clientY - rect.top };
    };

    const onDown = (e) => {
      if (status !== "playing") return;
      inputRef.current.down = true;
      const pt = getPoint(e);
      inputRef.current.sx = pt.x;
      inputRef.current.sy = pt.y;
    };

    const onMove = (e) => {
      if (!inputRef.current.down) return;
      if (e.cancelable) e.preventDefault();
    };

    const onUp = (e) => {
      if (!inputRef.current.down) return;
      inputRef.current.down = false;
      const pt = getPoint(e);
      const dy = pt.y - inputRef.current.sy;

      if (dy > 40) sendBack();
      else serveFront();
    };

    canvas.addEventListener("pointerdown", onDown, { passive: true });
    canvas.addEventListener("pointermove", onMove, { passive: false });
    canvas.addEventListener("pointerup", onUp, { passive: true });
    canvas.addEventListener("pointercancel", onUp, { passive: true });

    canvas.addEventListener("touchstart", onDown, { passive: true });
    canvas.addEventListener("touchmove", onMove, { passive: false });
    canvas.addEventListener("touchend", onUp, { passive: true });
    canvas.addEventListener("touchcancel", onUp, { passive: true });

    return () => {
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);

      canvas.removeEventListener("touchstart", onDown);
      canvas.removeEventListener("touchmove", onMove);
      canvas.removeEventListener("touchend", onUp);
      canvas.removeEventListener("touchcancel", onUp);
    };
  }, [status, rotCharges]);

  useEffect(() => {
    setBestState(getBest());
  }, []);

  // Keyboard / desktop support
  useEffect(() => {
    const onKeyDown = (e) => {
      if (status !== "playing") return;

      const k = (e.key || "").toLowerCase();
      if (k === " " || k === "spacebar" || k === "enter") {
        e.preventDefault();
        serveFront();
        return;
      }
      if (k === "s" || k === "backspace") {
        if (rotCharges <= 0) return;
        e.preventDefault();
        sendBack();
        return;
      }
      if (k === "w") {
        e.preventDefault();
        waitTurn();
      }
    };

    window.addEventListener("keydown", onKeyDown, { passive: false });
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [status, rotCharges]);

  const showResult = status !== "playing";
  const remaining = Math.max(0, cfg.targetRules - rulesDone);
  const errors = Math.max(0, cfg.lives - lives);

  const pillStyle = {
    padding: "6px 10px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.10)",
    border: "1px solid rgba(255,255,255,0.10)",
    color: "rgba(255,255,255,0.92)",
    fontSize: 12,
    fontWeight: 800,
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100dvh",
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ ...pillStyle, fontWeight: 900 }}>⭐ {score}</div>
          <div style={pillStyle}>🎯 {remaining}</div>
          <div style={pillStyle}>❤️ {lives}</div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <div style={pillStyle}>↩ {rotCharges}</div>
          <div style={pillStyle}>🔥 {combo}</div>
          <div style={{ color: "rgba(255,255,255,0.65)", fontSize: 12, fontWeight: 700 }}>Best {best}</div>
        </div>
      </div>

      {/* Playfield */}
      <div
        style={{
          marginTop: 10,
          flex: 1,
          minHeight: 0,
          borderRadius: 18,
          overflow: "hidden",
          background: "rgba(0,0,0,0.18)",
          border: "1px solid rgba(255,255,255,0.10)",
        }}
        ref={canvasWrapRef}
      >
        <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block", touchAction: "none" }} />
      </div>

      {/* Controls (only what's needed) */}
      <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
        <Button
          style={{ height: 58, fontSize: 18, fontWeight: 900, borderRadius: 18 }}
          onClick={() => waitTurn()}
          disabled={status !== "playing"}
          variant="outline"
        >
          WAIT
        </Button>
        <Button
          style={{ height: 58, fontSize: 18, fontWeight: 900, borderRadius: 18 }}
          onClick={() => serveFront()}
          disabled={status !== "playing"}
        >
          SERVE
        </Button>
        <Button
          style={{ height: 58, fontSize: 18, fontWeight: 900, borderRadius: 18 }}
          variant="secondary"
          onClick={() => sendBack()}
          disabled={status !== "playing" || rotCharges <= 0}
        >
          BACK
        </Button>
      </div>

      {showResult && (
        <div style={{ marginTop: 12 }}>
          <ResultSubmitPanel
            category="QUEUE_COMMANDER"
            difficulty={difficulty}
            timeMs={timeMs}
            errors={errors}
            won={status === "won"}
            challengeId={challenge?.challengeInstanceId}
          />
        </div>
      )}
    </div>
  );
}
