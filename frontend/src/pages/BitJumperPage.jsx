import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import ResultSubmitPanel from "../components/ResultSubmitPanel";

// Bit Jumper (vertical platform jumper) — Arcade first, learning hidden in token pattern routing.

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

function makeFixedToken(op, bit) {
  return { op, bit };
}

function makeBlankToken() {
  return { op: "BLANK", bit: null };
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
    countdown: 0,
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
      countdown: 0,
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

    // Create the learning pattern up-front so platform spawning can always
    // offer the correct next-bit choices from the very first jump.
    const pattern = makePattern(diff);
    let patternIndex = 0;

    function spawnPlatform(y, mustTypeOrNull = null, forceBlank = false) {
      const type = forceBlank
        ? "BLANK"
        : mustTypeOrNull ||
          pickWeighted([
        { v: "STATIC", w: 1.0 },
        { v: "MOVING", w: cfg.moveW },
        { v: "BREAKING", w: cfg.breakW },
        { v: "BOUNCY", w: cfg.bouncyW },
      ]);

      const x = randInt(12, Math.max(12, W - PLATFORM_W - 12));
      const token = forceBlank ? makeBlankToken() : makeToken(cfg.ops);
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

    // Two-choice layout per height band: left vs right (decisive 0/1 choice).
    function spreadBandX2() {
      const margin = 12;
      const maxX = Math.max(margin, W - PLATFORM_W - margin);
      const left = clamp(Math.round(W * 0.26 - PLATFORM_W / 2), margin, maxX);
      const right = clamp(Math.round(W * 0.74 - PLATFORM_W / 2), margin, maxX);
      return [left, right];
    }

    // initial platforms (mobile-first):
    // - spawn on a BLANK platform
    // - after the countdown, the first decision is a clear left/right 0-vs-1 choice
    const platforms = [];
    function pushBand(y, mustTypeOrNull = null) {
      const want = pattern[patternIndex] || makeToken(cfg.ops);
      const op = want?.op || cfg.ops[0] || "SET";

      const pA = spawnPlatform(y, mustTypeOrNull, false);
      const pB = spawnPlatform(y, mustTypeOrNull, false);

      // Randomize which side is 0/1 so you must react, but always a decisive choice.
      const leftIsZero = Math.random() < 0.5;
      pA.token = makeFixedToken(op, leftIsZero ? 0 : 1);
      pB.token = makeFixedToken(op, leftIsZero ? 1 : 0);

      const [xL, xR] = spreadBandX2();
      pA.x = xL;
      pB.x = xR;

      platforms.push(pA, pB);
    }

    // Start: BLANK only (player spawns here during the countdown).
    let startBlank = null;
    {
      const blank = spawnPlatform(startY + 44, "STATIC", true);
      // Always start on a BLANK platform.
      blank.x = Math.round(startX - PLATFORM_W / 2);
      platforms.push(blank);
      startBlank = blank;
    }
    // First decision band: further away so you don't instantly land on the next platform.
    // This also ensures you must actually steer into a 0/1 choice.
    const firstGap = cfg.gap * 1.9;
    pushBand(startY - firstGap, "MOVING");
    pushBand(startY - (firstGap + cfg.gap * 1.0), "BREAKING");
    pushBand(startY - (firstGap + cfg.gap * 2.0), "BOUNCY");
    for (let i = 4; i < 9; i++) {
      pushBand(startY - (firstGap + cfg.gap * (i - 1)));
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
        // Spawn standing on the BLANK platform (no bit).
        x: startBlank ? startBlank.x + startBlank.w / 2 : startX,
        y: startBlank ? startBlank.y - PLAYER_R - 1 : startY,
        vy: 0,
      },
      platforms,
      highestY: startY,
      score: 0,
      best: loadBest(diff),
      combo: 0,
      pattern,
      patternIndex,
      shakeT: 0,
      shakeAmp: 0,
      errors: 0,
      completed: 0,
      // Countdown phase: start timer after "GO".
      phase: "countdown",
      countdownStart: now,
      countdownMs: 3000,
      startedAt: 0,
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
      countdown: 3,
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

      // Countdown: show 3..2..1 and start with a jump.
      if (!s.gameOver && s.phase === "countdown") {
        const left = Math.max(0, s.countdownMs - (now - s.countdownStart));
        const n = left <= 0 ? 0 : Math.ceil(left / 1000);
        s._countdown = n;
        if (left <= 0) {
          s.phase = "playing";
          s.startedAt = now;
          // Kick off the run with a jump from the BLANK start platform.
          s.player.vy = s.JUMP_VY;
          s._countdown = 0;
        }
      }

      if (!s.gameOver && s.phase === "playing") {
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
          countdown: s._countdown || 0,
          gameOver: s.gameOver,
          errors: s.errors,
          startedAt: s.startedAt || u.startedAt,
          timeMs: s.gameOver
            ? Math.max(0, Math.round((s.startedAt ? now - s.startedAt : 0)))
            : s.phase === "playing" && s.startedAt
            ? Math.max(0, Math.round(now - s.startedAt))
            : u.timeMs,
        }));
      }
    }

    function endGame(s, now, won) {
      if (s.gameOver) return;
      s.gameOver = true;

      const finalScore = Math.max(0, Math.round(s.score));
      if (finalScore > s.best) {
        s.best = finalScore;
        saveBest(diff, finalScore);
      }

      const survivedMs = Math.round(now - s.startedAt);
      setUi((u) => ({
        ...u,
        gameOver: true,
        timeMs: survivedMs,
        won: !!won,
        best: s.best,
        score: finalScore,
        errors: s.errors,
        pattern: s.pattern,
        patternIndex: s.patternIndex,
        combo: s.combo,
      }));
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

          // Token check — BLANK platforms are neutral so you can "wait" for the right token.
          if (pl.token?.op === "BLANK") {
            // tiny reward for safe landings to keep flow; no pattern reset.
            s.score += 2;
          } else {
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
              // Wrong token = instant loss (mobile-arcade feel).
              s.errors += 1;
              s.combo = 0;
              s.shakeT = s.SHAKE_MS;
              s.shakeAmp = s.SHAKE_PX;
              haptic([18, 40, 18]);
              endGame(s, now, false);
            }
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

      // Remove broken/off platforms + spawn new.
      // Each height band has *max 2 platforms* (a decisive 0 vs 1 choice).
      s.platforms = s.platforms.filter((pl) => !pl.brokeAt && pl.y < H + 120);
      let topMost = s.platforms.reduce((m, pl) => Math.min(m, pl.y), Infinity);

      function spreadBandXRuntime2() {
        const margin = 12;
        const maxX = Math.max(margin, s.W - s.PLATFORM_W - margin);
        const left = clamp(Math.round(s.W * 0.26 - s.PLATFORM_W / 2), margin, maxX);
        const right = clamp(Math.round(s.W * 0.74 - s.PLATFORM_W / 2), margin, maxX);
        return [left, right];
      }

      function pushBandRuntime(y) {
        const want = s.pattern[s.patternIndex] || makeToken(s.cfg.ops);
        const op = want?.op || s.cfg.ops[0] || "SET";

        const pA = spawnPlatformRuntime(s, y, false);
        const pB = spawnPlatformRuntime(s, y, false);
        const leftIsZero = Math.random() < 0.5;
        pA.token = makeFixedToken(op, leftIsZero ? 0 : 1);
        pB.token = makeFixedToken(op, leftIsZero ? 1 : 0);

        const [xL, xR] = spreadBandXRuntime2();
        pA.x = xL;
        pB.x = xR;

        s.platforms.push(pA, pB);
      }

      const DESIRED = 14;
      while (s.platforms.length < DESIRED) {
        const y = Math.min(topMost - s.cfg.gap, -randInt(20, 60));
        pushBandRuntime(y);
        topMost = Math.min(topMost, y);
      }
      // Ensure we always have some above the screen.
      while (topMost > -140) {
        const y = topMost - s.cfg.gap;
        pushBandRuntime(y);
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
        // "Won" heuristic for board scoring: survive longer / complete at least one pattern.
        // Keeps it arcade-first while still fitting the existing points formula.
        const survivedMs = Math.round(now - s.startedAt);
        const targetMs = diff === "HARD" ? 25000 : diff === "MEDIUM" ? 20000 : 15000;
        const won = survivedMs >= targetMs || s.completed >= 1;
        endGame(s, now, won);
      }
    }

    function spawnPlatformRuntime(s, y, forceBlank = false) {
      const cfg = s.cfg;
      const W = s.W;
      const type = forceBlank
        ? "BLANK"
        : pickWeighted([
            { v: "STATIC", w: 1.0 },
            { v: "MOVING", w: cfg.moveW },
            { v: "BREAKING", w: cfg.breakW },
            { v: "BOUNCY", w: cfg.bouncyW },
          ]);
      const x = randInt(12, Math.max(12, W - s.PLATFORM_W - 12));
      const token = forceBlank ? makeBlankToken() : makeToken(cfg.ops);
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
        const isBlank = pl.type === "BLANK" || pl.token?.op === "BLANK";
        const opInfo = OPS[pl.token.op] || OPS.SET;

        // base platform
        ctx.fillStyle = isBlank ? "rgba(255,255,255,0.16)" : "rgba(255,255,255,0.10)";
        ctx.fillRect(pl.x, pl.y, pl.w, pl.h);

        if (!isBlank) {
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
        } else {
          // blank indicator
          ctx.strokeStyle = "rgba(255,255,255,0.22)";
          ctx.setLineDash([6, 5]);
          ctx.strokeRect(pl.x - 1, pl.y - 1, pl.w + 2, pl.h + 2);
          ctx.setLineDash([]);
        }

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
        if (!isBlank) {
          ctx.fillStyle = "rgba(0,0,0,0.35)";
          const tagW = 40;
          const tagH = 16;
          ctx.fillRect(pl.x + 6, pl.y - tagH - 2, tagW, tagH);
          ctx.fillStyle = "rgba(255,255,255,0.92)";
          ctx.font = `${Math.round(10)}px ui-sans-serif, system-ui, -apple-system`;
          ctx.textAlign = "left";
          ctx.fillText(opInfo.label, pl.x + 10, pl.y - tagH / 2 - 2);
        }
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

  useEffect(() => {
    // lock scroll for a true mobile-game feel
    const prevOverflow = document.body.style.overflow;
    const prevOverscroll = document.body.style.overscrollBehavior;
    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.overscrollBehavior = prevOverscroll;
    };
  }, []);

  const Pill = ({ children }) => (
    <div
      style={{
        padding: "8px 10px",
        borderRadius: 999,
        background: "rgba(2,6,23,0.55)",
        border: "1px solid rgba(148,163,184,0.22)",
        color: "rgba(255,255,255,0.92)",
        fontSize: 12,
        fontWeight: 800,
        letterSpacing: 0.2,
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
      }}
    >
      {children}
    </div>
  );

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#050b10",
        color: "rgba(255,255,255,0.95)",
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
        paddingLeft: "env(safe-area-inset-left)",
        paddingRight: "env(safe-area-inset-right)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* HUD */}
      <div
        style={{
          flex: "0 0 auto",
          padding: "12px 12px 10px",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <Pill>
              ⭐ <span style={{ opacity: 0.9 }}>Score</span> {ui.score}
            </Pill>
            <Pill>
              🏁 <span style={{ opacity: 0.9 }}>Best</span> {ui.best}
            </Pill>
            {ui.combo > 0 ? (
              <Pill>
                ⚡ <span style={{ opacity: 0.9 }}>Combo</span> x{ui.combo}
              </Pill>
            ) : null}
          </div>

          <Pill>
            {diff === "HARD" ? "H" : diff === "MEDIUM" ? "M" : "E"}
          </Pill>
        </div>

        {/* target pattern (tiny, game-relevant) */}
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
          {ui.pattern.map((t, i) => {
            const op = OPS[t.op] || OPS.SET;
            const isActive = i === ui.patternIndex;
            const isDone = i < ui.patternIndex;
            return (
              <div
                key={`${t.op}${t.bit}${i}`}
                style={{
                  padding: "7px 10px",
                  borderRadius: 14,
                  border: "1px solid rgba(148,163,184,0.18)",
                  background: isDone
                    ? "rgba(34,197,94,0.14)"
                    : isActive
                    ? "rgba(59,130,246,0.16)"
                    : "rgba(2,6,23,0.45)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  transform: isActive ? "translateY(-1px)" : "none",
                  boxShadow: isActive ? "0 12px 24px rgba(0,0,0,0.35)" : "none",
                }}
              >
                <span style={{ fontWeight: 900, fontSize: 11, color: op.color }}>{t.op}</span>
                <span style={{ fontWeight: 950, fontSize: 12 }}>{t.bit}</span>
              </div>
            );
          })}
          {active ? (
            <div style={{ marginLeft: "auto" }}>
              <Pill>
                Next: <span style={{ color: (OPS[active.op] || OPS.SET).color, fontWeight: 950 }}>{active.op}</span> {active.bit}
              </Pill>
            </div>
          ) : null}
        </div>

        <div style={{ height: 6, borderRadius: 999, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
          <div
            style={{
              height: "100%",
              width: `${ui.pattern.length ? Math.round((ui.patternIndex / ui.pattern.length) * 100) : 0}%`,
              background: "rgba(255,255,255,0.55)",
              transition: "width 160ms ease",
            }}
          />
        </div>
      </div>

      {/* Play area */}
      <div style={{ flex: "1 1 auto", minHeight: 0, padding: "0 12px 12px" }}>
        <div
          style={{
            width: "100%",
            height: "100%",
            borderRadius: 18,
            overflow: "hidden",
            border: "1px solid rgba(148,163,184,0.18)",
            background: "rgba(2,6,23,0.25)",
            position: "relative",
          }}
        >
          <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} />

          {/* Countdown overlay */}
          {ui.countdown > 0 ? (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "grid",
                placeItems: "center",
                background: "rgba(0,0,0,0.35)",
                backdropFilter: "blur(2px)",
                WebkitBackdropFilter: "blur(2px)",
                pointerEvents: "none",
              }}
            >
              <div
                style={{
                  fontSize: 84,
                  fontWeight: 950,
                  lineHeight: 1,
                  letterSpacing: -2,
                  textShadow: "0 18px 40px rgba(0,0,0,0.6)",
                }}
              >
                {ui.countdown}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Auto-submit to board when the run ends */}
      {typeof ui.won === "boolean" ? (
        <div style={{ flex: "0 0 auto", padding: "0 12px 12px" }}>
          <ResultSubmitPanel
            category="BIT_JUMPER"
            difficulty={diff}
            timeMs={ui.timeMs}
            errors={ui.errors}
            won={ui.won}
            challengeId={challenge?.challengeInstanceId}
          />
        </div>
      ) : null}
    </div>
  );
}
