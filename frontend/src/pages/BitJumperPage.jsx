import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import AppShell from "../components/AppShell";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import ResultSubmitPanel from "../components/ResultSubmitPanel";

// Bit Jumper (Doodle Jump-ish) — Arcade first, learning hidden in token pattern routing.

const OPS = {
  SET: { label: "SET", color: "#3b82f6" },
  AND: { label: "AND", color: "#22c55e" },
  OR: { label: "OR", color: "#f97316" },
  XOR: { label: "XOR", color: "#a855f7" },
};

const DIFF_CFG = {
  EASY: { patternLen: 4, ops: ["SET"], gap: 86, moveW: 0.14, breakW: 0.12, bouncyW: 0.12 },
  MEDIUM: { patternLen: 5, ops: ["SET", "AND", "OR"], gap: 92, moveW: 0.18, breakW: 0.14, bouncyW: 0.14 },
  HARD: { patternLen: 6, ops: ["SET", "AND", "OR", "XOR"], gap: 98, moveW: 0.22, breakW: 0.16, bouncyW: 0.16 },
};

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function randInt(a, b) {
  return Math.floor(Math.random() * (b - a + 1)) + a;
}

function pickWeighted(items) {
  // items: [{v, w}]
  const sum = items.reduce((s, it) => s + it.w, 0);
  let r = Math.random() * sum;
  for (const it of items) {
    r -= it.w;
    if (r <= 0) return it.v;
  }
  return items[items.length - 1].v;
}

function haptic(patternOrMs) {
  try {
    if (!navigator?.vibrate) return;
    navigator.vibrate(patternOrMs);
  } catch {
    // ignore
  }
}

function bestKey(diff) {
  return `bitjumper_best_${diff}`;
}

function loadBest(diff) {
  try {
    const v = localStorage.getItem(bestKey(diff));
    const n = v ? Number(v) : 0;
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

function saveBest(diff, v) {
  try {
    localStorage.setItem(bestKey(diff), String(v));
  } catch {
    // ignore
  }
}

function makeToken(allowedOps) {
  const op = allowedOps[randInt(0, allowedOps.length - 1)];
  const bit = Math.random() < 0.5 ? 0 : 1;
  return { op, bit };
}

function makePattern(diff) {
  const cfg = DIFF_CFG[diff] || DIFF_CFG.EASY;
  return Array.from({ length: cfg.patternLen }, () => makeToken(cfg.ops));
}

function tokenEq(a, b) {
  return a?.op === b?.op && a?.bit === b?.bit;
}

export default function BitJumperPage() {
  const loc = useLocation();
  const challenge = loc.state?.challenge || null;
  const difficulty = (challenge?.difficulty || "EASY").toUpperCase();
  const diff = DIFF_CFG[difficulty] ? difficulty : "EASY";

  const best0 = useMemo(() => loadBest(diff), [diff]);

  const canvasRef = useRef(null);
  const rafRef = useRef(0);

  const inputRef = useRef({
    xNorm: 0.5,
    down: false,
  });

  const stateRef = useRef(null);

  const [ui, setUi] = useState({
    score: 0,
    best: best0,
    combo: 0,
    diff,
    pattern: makePattern(diff),
    patternIndex: 0,
    gameOver: false,
    startedAt: 0,
    timeMs: 0,
    errors: 0,
    won: null,
  });

  useEffect(() => {
    setUi((u) => ({
      ...u,
      diff,
      best: loadBest(diff),
      pattern: makePattern(diff),
      patternIndex: 0,
      score: 0,
      combo: 0,
      gameOver: false,
      startedAt: 0,
      timeMs: 0,
      errors: 0,
      won: null,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diff]);

  function resetGame() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const W = canvas.width;
    const H = canvas.height;

    const cfg = DIFF_CFG[diff] || DIFF_CFG.EASY;
    const now = performance.now();

    // Physics + feel (tunable)
    const GRAVITY = 2600; // px/s^2
    const JUMP_VY = -980; // px/s
    const HCTRL = 12.5; // lerp strength
    const WRAP = true;

    const COYOTE_PX = 10;
    const COYOTE_X_PAD = 10;

    const BREAK_DELAY_MS = 250;
    const BOUNCY_MULT = 1.28;

    const SHAKE_MS = 160;
    const SHAKE_PX = 9;

    const PENALTY_VY = 520;

    const PLAYER_R = Math.max(12, Math.round(Math.min(W, H) * 0.03));
    const PLATFORM_W = clamp(Math.round(W * 0.22), 62, 124);
    const PLATFORM_H = 14;

    const startY = H - 90;
    const startX = W * 0.5;

    function spawnPlatform(y, mustTypeOrNull = null) {
      const type = mustTypeOrNull || pickWeighted([
        { v: "STATIC", w: 1.0 },
        { v: "MOVING", w: cfg.moveW },
        { v: "BREAKING", w: cfg.breakW },
        { v: "BOUNCY", w: cfg.bouncyW },
      ]);

      const x = randInt(12, Math.max(12, W - PLATFORM_W - 12));
      const token = makeToken(cfg.ops);
      const vx = type === "MOVING" ? (Math.random() < 0.5 ? -1 : 1) * randInt(70, 120) : 0;
      return {
        id: `${Math.random().toString(16).slice(2)}${Date.now().toString(16)}`,
        x,
        y,
        w: PLATFORM_W,
        h: PLATFORM_H,
        type,
        vx,
        token,
        brokeAt: null,
        breakAt: null,
      };
    }

    // initial platforms (ensure variety is visible)
    const platforms = [];
    platforms.push({ ...spawnPlatform(startY + 44, "STATIC"), x: Math.round(startX - PLATFORM_W / 2) });
    platforms.push(spawnPlatform(startY - cfg.gap * 1.0, "MOVING"));
    platforms.push(spawnPlatform(startY - cfg.gap * 2.0, "BREAKING"));
    platforms.push(spawnPlatform(startY - cfg.gap * 3.0, "BOUNCY"));
    for (let i = 4; i < 11; i++) {
      platforms.push(spawnPlatform(startY - cfg.gap * i));
    }

    const s = {
      now,
      W,
      H,
      cfg,
      // tuning
      GRAVITY,
      JUMP_VY,
      HCTRL,
      WRAP,
      COYOTE_PX,
      COYOTE_X_PAD,
      BREAK_DELAY_MS,
      BOUNCY_MULT,
      SHAKE_MS,
      SHAKE_PX,
      PENALTY_VY,
      PLAYER_R,
      PLATFORM_H,
      PLATFORM_W,
      // game
      player: {
        x: startX,
        y: startY,
        vy: 0,
      },
      platforms,
      highestY: startY,
      score: 0,
      best: loadBest(diff),
      combo: 0,
      pattern: makePattern(diff),
      patternIndex: 0,
      shakeT: 0,
      shakeAmp: 0,
      errors: 0,
      completed: 0,
      startedAt: now,
      gameOver: false,
    };

    stateRef.current = s;
    setUi((u) => ({
      ...u,
      score: 0,
      best: s.best,
      combo: 0,
      pattern: s.pattern,
      patternIndex: 0,
      gameOver: false,
      startedAt: s.startedAt,
      timeMs: 0,
      errors: 0,
      won: null,
    }));
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Make canvas crisp on mobile.
    function resize() {
      const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
      const rect = canvas.getBoundingClientRect();
      const w = Math.max(1, Math.floor(rect.width * dpr));
      const h = Math.max(1, Math.floor(rect.height * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        // restart with new sizes (keeps feel stable)
        resetGame();
      }
    }

    resize();
    const onResize = () => resize();
    window.addEventListener("resize", onResize, { passive: true });
    window.addEventListener("orientationchange", onResize, { passive: true });

    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diff]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Input
    const el = canvas;
    el.style.touchAction = "none";

    function setFromClientX(clientX) {
      const rect = el.getBoundingClientRect();
      const x = clamp((clientX - rect.left) / Math.max(1, rect.width), 0, 1);
      inputRef.current.xNorm = x;
    }

    function onPointerDown(e) {
      inputRef.current.down = true;
      setFromClientX(e.clientX);
    }
    function onPointerMove(e) {
      if (!inputRef.current.down) return;
      setFromClientX(e.clientX);
    }
    function onPointerUp() {
      inputRef.current.down = false;
    }

    // Mouse for testing.
    function onMouseMove(e) {
      if (inputRef.current.down) return;
      setFromClientX(e.clientX);
    }

    el.addEventListener("pointerdown", onPointerDown, { passive: true });
    el.addEventListener("pointermove", onPointerMove, { passive: true });
    el.addEventListener("pointerup", onPointerUp, { passive: true });
    el.addEventListener("pointercancel", onPointerUp, { passive: true });
    window.addEventListener("mousemove", onMouseMove, { passive: true });

    return () => {
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerup", onPointerUp);
      el.removeEventListener("pointercancel", onPointerUp);
      window.removeEventListener("mousemove", onMouseMove);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false, desynchronized: true });
    if (!ctx) return;

    let last = performance.now();

    function step(now) {
      rafRef.current = requestAnimationFrame(step);
      const s = stateRef.current;
      if (!s) return;
      const dt = clamp((now - last) / 1000, 0, 1 / 20);
      last = now;

      if (!s.gameOver) {
        update(s, dt, now);
      }
      render(s, ctx, now);

      // UI throttle (~30fps)
      if (!s._uiNext || now >= s._uiNext) {
        s._uiNext = now + 33;
        setUi((u) => ({
          ...u,
          score: s.score,
          best: s.best,
          combo: s.combo,
          pattern: s.pattern,
          patternIndex: s.patternIndex,
          gameOver: s.gameOver,
          errors: s.errors,
          timeMs: s.gameOver ? Math.max(0, Math.round(now - s.startedAt)) : u.timeMs,
        }));
      }
    }

    function update(s, dt, now) {
      const { W, H } = s;
      const p = s.player;
      const inputX = s.W * inputRef.current.xNorm;
      p.x = lerp(p.x, inputX, 1 - Math.exp(-s.HCTRL * dt));

      if (s.WRAP) {
        const r = s.PLAYER_R;
        if (p.x < -r) p.x = W + r;
        if (p.x > W + r) p.x = -r;
      } else {
        p.x = clamp(p.x, s.PLAYER_R, W - s.PLAYER_R);
      }

      const prevY = p.y;
      p.vy += s.GRAVITY * dt;
      p.y += p.vy * dt;

      // Moving platforms
      for (const pl of s.platforms) {
        if (pl.type === "MOVING") {
          pl.x += pl.vx * dt;
          if (pl.x < 6) {
            pl.x = 6;
            pl.vx = Math.abs(pl.vx);
          }
          if (pl.x + pl.w > W - 6) {
            pl.x = W - 6 - pl.w;
            pl.vx = -Math.abs(pl.vx);
          }
        }
        if (pl.type === "BREAKING" && pl.breakAt && now >= pl.breakAt) {
          pl.brokeAt = pl.brokeAt || now;
        }
      }

      // Collision + landing (forgiving)
      if (p.vy > 0) {
        const bottomPrev = prevY + s.PLAYER_R;
        const bottomNow = p.y + s.PLAYER_R;
        for (const pl of s.platforms) {
          if (pl.brokeAt) continue;
          const top = pl.y;
          const withinY = (bottomPrev <= top && bottomNow >= top) || Math.abs(bottomNow - top) <= s.COYOTE_PX;
          if (!withinY) continue;

          const pxL = p.x - s.PLAYER_R;
          const pxR = p.x + s.PLAYER_R;
          const plL = pl.x - s.COYOTE_X_PAD;
          const plR = pl.x + pl.w + s.COYOTE_X_PAD;
          const overlapX = pxR >= plL && pxL <= plR;
          if (!overlapX) continue;

          // Land
          p.y = top - s.PLAYER_R;
          const jumpVy = pl.type === "BOUNCY" ? s.JUMP_VY * s.BOUNCY_MULT : s.JUMP_VY;
          p.vy = jumpVy;

          // breaking arm
          if (pl.type === "BREAKING" && !pl.breakAt) {
            pl.breakAt = now + s.BREAK_DELAY_MS;
          }

          // Token check
          const want = s.pattern[s.patternIndex];
          if (tokenEq(pl.token, want)) {
            s.patternIndex += 1;
            s.combo = Math.min(999, s.combo + 1);

            const comboBonus = Math.min(4.5, 1 + s.combo * 0.08);
            s.score += Math.round(18 * comboBonus);

            if (s.patternIndex >= s.pattern.length) {
              // completed pattern
              s.completed += 1;
              s.score += 220 + s.combo * 6;
              s.combo += 3;
              s.pattern = makePattern(diff);
              s.patternIndex = 0;
              haptic([20, 30, 20]);
            } else {
              haptic(10);
            }
          } else {
            s.patternIndex = 0;
            s.combo = 0;
            s.errors += 1;
            p.vy += s.PENALTY_VY;
            s.shakeT = s.SHAKE_MS;
            s.shakeAmp = s.SHAKE_PX;
            haptic(18);
          }

          break;
        }
      }

      // Camera / scoring by height (scroll world down)
      const camY = H * 0.36;
      if (p.y < camY) {
        const dy = camY - p.y;
        p.y = camY;
        for (const pl of s.platforms) pl.y += dy;

        s.highestY = Math.min(s.highestY, p.y);
        s.score += Math.round(dy * 0.12);
      }

      // Remove broken/off platforms + spawn new
      s.platforms = s.platforms.filter((pl) => !pl.brokeAt && pl.y < H + 120);
      let topMost = s.platforms.reduce((m, pl) => Math.min(m, pl.y), Infinity);
      while (s.platforms.length < 18) {
        const y = Math.min(topMost - s.cfg.gap, -randInt(20, 60));
        s.platforms.push(spawnPlatformRuntime(s, y));
        topMost = Math.min(topMost, y);
      }
      // Ensure we always have some above the screen.
      while (topMost > -140) {
        const y = topMost - s.cfg.gap;
        s.platforms.push(spawnPlatformRuntime(s, y));
        topMost = y;
      }

      // shake decay
      if (s.shakeT > 0) {
        s.shakeT -= dt * 1000;
        if (s.shakeT <= 0) {
          s.shakeT = 0;
          s.shakeAmp = 0;
        }
      }

      // Game over
      if (p.y - s.PLAYER_R > H + 90) {
        s.gameOver = true;
        const finalScore = Math.max(0, Math.round(s.score));
        if (finalScore > s.best) {
          s.best = finalScore;
          saveBest(diff, finalScore);
        }

        // "Won" heuristic for board scoring: survive longer / complete at least one pattern.
        // Keeps it arcade-first while still fitting the existing points formula.
        const survivedMs = Math.round(now - s.startedAt);
        const targetMs = diff === "HARD" ? 25000 : diff === "MEDIUM" ? 20000 : 15000;
        const won = survivedMs >= targetMs || s.completed >= 1;
        setUi((u) => ({
          ...u,
          gameOver: true,
          timeMs: survivedMs,
          won,
          best: s.best,
          score: finalScore,
          errors: s.errors,
          pattern: s.pattern,
          patternIndex: s.patternIndex,
          combo: s.combo,
        }));
      }
    }

    function spawnPlatformRuntime(s, y) {
      const cfg = s.cfg;
      const W = s.W;
      const type = pickWeighted([
        { v: "STATIC", w: 1.0 },
        { v: "MOVING", w: cfg.moveW },
        { v: "BREAKING", w: cfg.breakW },
        { v: "BOUNCY", w: cfg.bouncyW },
      ]);
      const x = randInt(12, Math.max(12, W - s.PLATFORM_W - 12));
      const token = makeToken(cfg.ops);
      const vx = type === "MOVING" ? (Math.random() < 0.5 ? -1 : 1) * randInt(70, 135) : 0;
      return {
        id: `${Math.random().toString(16).slice(2)}${Date.now().toString(16)}`,
        x,
        y,
        w: s.PLATFORM_W,
        h: s.PLATFORM_H,
        type,
        vx,
        token,
        brokeAt: null,
        breakAt: null,
      };
    }

    function render(s, ctx, now) {
      const { W, H } = s;

      // screen shake
      let shakeX = 0;
      let shakeY = 0;
      if (s.shakeT > 0) {
        const t = s.shakeT / s.SHAKE_MS;
        const amp = s.shakeAmp * t;
        shakeX = (Math.random() * 2 - 1) * amp;
        shakeY = (Math.random() * 2 - 1) * amp;
      }

      ctx.save();
      ctx.translate(shakeX, shakeY);

      // background
      ctx.fillStyle = "#071018";
      ctx.fillRect(0, 0, W, H);

      // subtle stars
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = "#ffffff";
      for (let i = 0; i < 24; i++) {
        const x = ((i * 997) % W) + ((now / 70) % 7);
        const y = ((i * 541) % H) + ((now / 90) % 9);
        ctx.fillRect(x % W, y % H, 2, 2);
      }
      ctx.globalAlpha = 1;

      // platforms
      for (const pl of s.platforms) {
        if (pl.brokeAt) continue;
        const opInfo = OPS[pl.token.op] || OPS.SET;

        // base platform
        ctx.fillStyle = "rgba(255,255,255,0.10)";
        ctx.fillRect(pl.x, pl.y, pl.w, pl.h);

        // token stripe
        ctx.fillStyle = opInfo.color;
        ctx.fillRect(pl.x, pl.y, pl.w, Math.max(3, Math.floor(pl.h * 0.55)));

        // bit bubble
        ctx.fillStyle = "rgba(0,0,0,0.35)";
        const r = 9;
        const cx = pl.x + pl.w - (r + 6);
        const cy = pl.y + pl.h / 2;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "rgba(255,255,255,0.95)";
        ctx.font = `${Math.round(12)}px ui-sans-serif, system-ui, -apple-system`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(String(pl.token.bit), cx, cy + 0.5);

        // type indicators
        ctx.strokeStyle = "rgba(255,255,255,0.35)";
        ctx.lineWidth = 2;
        if (pl.type === "MOVING") {
          ctx.strokeRect(pl.x - 1, pl.y - 1, pl.w + 2, pl.h + 2);
          ctx.fillStyle = "rgba(255,255,255,0.8)";
          ctx.font = `700 ${Math.round(12)}px ui-sans-serif, system-ui, -apple-system`;
          ctx.fillText("↔", pl.x + 14, pl.y + pl.h / 2);
        } else if (pl.type === "BOUNCY") {
          ctx.strokeStyle = "rgba(255,255,255,0.55)";
          ctx.strokeRect(pl.x - 1, pl.y - 1, pl.w + 2, pl.h + 2);
          ctx.fillStyle = "rgba(255,255,255,0.85)";
          ctx.font = `700 ${Math.round(12)}px ui-sans-serif, system-ui, -apple-system`;
          ctx.fillText("↑", pl.x + 14, pl.y + pl.h / 2);
        } else if (pl.type === "BREAKING") {
          ctx.setLineDash([5, 4]);
          ctx.strokeStyle = "rgba(255,255,255,0.40)";
          ctx.strokeRect(pl.x - 1, pl.y - 1, pl.w + 2, pl.h + 2);
          ctx.setLineDash([]);
          ctx.fillStyle = "rgba(255,255,255,0.75)";
          ctx.font = `700 ${Math.round(11)}px ui-sans-serif, system-ui, -apple-system`;
          ctx.fillText("⟂", pl.x + 14, pl.y + pl.h / 2);
        }

        // mini op label
        ctx.fillStyle = "rgba(0,0,0,0.35)";
        const tagW = 40;
        const tagH = 16;
        ctx.fillRect(pl.x + 6, pl.y - tagH - 2, tagW, tagH);
        ctx.fillStyle = "rgba(255,255,255,0.92)";
        ctx.font = `${Math.round(10)}px ui-sans-serif, system-ui, -apple-system`;
        ctx.textAlign = "left";
        ctx.fillText(opInfo.label, pl.x + 10, pl.y - tagH / 2 - 2);
      }

      // player
      const p = s.player;
      ctx.fillStyle = "rgba(255,255,255,0.95)";
      ctx.beginPath();
      ctx.arc(p.x, p.y, s.PLAYER_R, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.beginPath();
      ctx.arc(p.x + s.PLAYER_R * 0.28, p.y - s.PLAYER_R * 0.18, 3, 0, Math.PI * 2);
      ctx.arc(p.x - s.PLAYER_R * 0.28, p.y - s.PLAYER_R * 0.18, 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      // Game over overlay in-canvas (fast)
      if (s.gameOver) {
        ctx.fillStyle = "rgba(0,0,0,0.55)";
        ctx.fillRect(0, 0, W, H);

        ctx.fillStyle = "rgba(255,255,255,0.95)";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = `800 ${Math.round(28)}px ui-sans-serif, system-ui, -apple-system`;
        ctx.fillText("Game Over", W / 2, H * 0.44);
        ctx.font = `600 ${Math.round(14)}px ui-sans-serif, system-ui, -apple-system`;
        ctx.fillText("Tap / Click to restart", W / 2, H * 0.52);
      }
    }

    rafRef.current = requestAnimationFrame(step);

    // restart on tap when game over
    function onRestartTap() {
      const s = stateRef.current;
      if (!s?.gameOver) return;
      resetGame();
    }
    canvas.addEventListener("click", onRestartTap, { passive: true });
    canvas.addEventListener("touchend", onRestartTap, { passive: true });

    return () => {
      cancelAnimationFrame(rafRef.current);
      canvas.removeEventListener("click", onRestartTap);
      canvas.removeEventListener("touchend", onRestartTap);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diff]);

  useEffect(() => {
    // initial start
    if (!stateRef.current) resetGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diff]);

  const active = ui.pattern[ui.patternIndex] || null;

  return (
    <AppShell
      title="Bit Jumper"
      subtitle="One finger. Hit the token pattern. Don’t fall."
      showTabs
      activeTab="play"
      backTo="/play"
      headerBadges={
        <>
          <Badge variant="secondary">Diff: {diff}</Badge>
          <Badge variant="secondary">Score: {ui.score}</Badge>
          <Badge variant="secondary">Best: {ui.best}</Badge>
          {ui.combo > 0 ? <Badge>Combo x{ui.combo}</Badge> : null}
        </>
      }
      rightPanel={
        <div className="panel">
          <div style={{ fontSize: 16, fontWeight: 750 }}>How to play</div>
          <div className="muted" style={{ marginTop: 10, fontSize: 13, lineHeight: 1.5 }}>
            Move left/right with your finger (or mouse). You auto-jump on landing.
            <br />
            Match the token pattern in order — wrong token resets progress and gives you a nasty drop.
          </div>
          <div className="muted" style={{ marginTop: 10, fontSize: 12, opacity: 0.9 }}>
            Platform types: ↔ moving · ⟂ breaking · ↑ bouncy
          </div>
        </div>
      }
    >
      <div className="panel" style={{ padding: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <Badge>Target</Badge>
            {ui.pattern.map((t, i) => {
              const op = OPS[t.op] || OPS.SET;
              const isActive = i === ui.patternIndex;
              const isDone = i < ui.patternIndex;
              return (
                <div
                  key={`${t.op}${t.bit}${i}`}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 10px",
                    borderRadius: 12,
                    border: "1px solid rgba(148,163,184,0.25)",
                    background: isDone
                      ? "rgba(34,197,94,0.14)"
                      : isActive
                      ? "rgba(59,130,246,0.16)"
                      : "rgba(2,6,23,0.35)",
                    transform: isActive ? "translateY(-1px)" : "none",
                    boxShadow: isActive ? "0 10px 24px rgba(0,0,0,0.25)" : "none",
                  }}
                >
                  <span style={{ fontWeight: 800, color: op.color, fontSize: 12 }}>{t.op}</span>
                  <span style={{ fontWeight: 900, fontSize: 12 }}>{t.bit}</span>
                </div>
              );
            })}
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <Link to="/play">
              <Button variant="ghost">Back</Button>
            </Link>
            <Button
              variant="secondary"
              onClick={() => {
                resetGame();
                haptic(12);
              }}
            >
              Restart
            </Button>
          </div>
        </div>

        {active ? (
          <div className="muted" style={{ marginTop: 8, fontSize: 12 }}>
            Next: <strong style={{ color: (OPS[active.op] || OPS.SET).color }}>{active.op}</strong> <strong>{active.bit}</strong>
          </div>
        ) : null}

        <div
          style={{
            marginTop: 12,
            width: "100%",
            height: "min(66vh, 720px)",
            borderRadius: 16,
            overflow: "hidden",
            border: "1px solid rgba(148,163,184,0.20)",
          }}
        >
          <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} />
        </div>

        {/* Auto-submit to board when the run ends */}
        {typeof ui.won === "boolean" ? (
          <ResultSubmitPanel
            category="BIT_JUMPER"
            difficulty={diff}
            timeMs={ui.timeMs}
            errors={ui.errors}
            won={ui.won}
            challengeId={challenge?.challengeInstanceId}
          />
        ) : null}

        <div className="muted" style={{ marginTop: 10, fontSize: 12, lineHeight: 1.5 }}>
          Balancing knobs: gravity ({diff === "HARD" ? "snappy" : "stable"}), jumpVy, gap (~{(DIFF_CFG[diff] || DIFF_CFG.EASY).gap}px),
          weights (moving/break/bouncy), penaltyVy (mismatch drop), COYOTE_PX/X_PAD (landing forgiveness).
        </div>
      </div>
    </AppShell>
  );
}
