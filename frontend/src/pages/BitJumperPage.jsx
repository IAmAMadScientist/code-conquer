import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import ResultSubmitPanel from "../components/ResultSubmitPanel";

// Bit Jumper — arcade platformer.
// Platforms are only for movement; bits are collectibles.

const DIFF_CFG = {
  // Platform density is tuned to feel like a classic vertical jumper:
  // fewer platforms on screen, bigger vertical gaps, but still consistently reachable.
  // Bit collectibles are intentionally rare and always avoidable.
  // Coins are optional and give +1 score each.
  EASY: { bitsLen: 3, gap: 148, moveW: 0.14, breakW: 0.12, bouncyW: 0.12, bitEvery: 8, coinP: 0.16, collectibleMatchP: 0.72 },
  MEDIUM: { bitsLen: 4, gap: 158, moveW: 0.18, breakW: 0.14, bouncyW: 0.14, bitEvery: 7, coinP: 0.15, collectibleMatchP: 0.68 },
  HARD: { bitsLen: 6, gap: 168, moveW: 0.22, breakW: 0.16, bouncyW: 0.16, bitEvery: 6, coinP: 0.14, collectibleMatchP: 0.64 },
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

function bitsToStr(bits) {
  return bits.map((b) => (b ? "1" : "0")).join("");
}

function strToBits(s) {
  return String(s)
    .split("")
    .map((ch) => (ch === "1" ? 1 : 0));
}

function bitwiseOp(aBits, bBits, op) {
  const out = [];
  for (let i = 0; i < aBits.length; i++) {
    const a = aBits[i] ? 1 : 0;
    const b = bBits[i] ? 1 : 0;
    out.push(op === "AND" ? (a & b) : (a | b));
  }
  return out;
}

function makePuzzle(diff) {
  const cfg = DIFF_CFG[diff] || DIFF_CFG.EASY;
  const L = cfg.bitsLen;
  const a = Array.from({ length: L }, () => (Math.random() < 0.5 ? 0 : 1));
  const b = Array.from({ length: L }, () => (Math.random() < 0.5 ? 0 : 1));
  const op = Math.random() < 0.5 ? "AND" : "OR";
  const result = bitwiseOp(a, b, op);
  return { aBits: a, bBits: b, op, resultBits: result };
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
    puzzle: makePuzzle(diff),
    pattern: makePuzzle(diff).resultBits,
    patternIndex: 0,
    countdown: 0,
    gameOver: false,
    startedAt: 0,
    timeMs: 0,
    errors: 0,
    won: null,
  });

  useEffect(() => {
    const puzzle = makePuzzle(diff);
    setUi((u) => ({
      ...u,
      diff,
      best: loadBest(diff),
      puzzle,
      pattern: puzzle.resultBits,
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

    // Puzzle defines the required bit sequence (bitwise AND/OR result).
    const puzzle = makePuzzle(diff);
    const pattern = puzzle.resultBits;
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
      const vx = type === "MOVING" ? (Math.random() < 0.5 ? -1 : 1) * randInt(70, 120) : 0;
      return {
        id: `${Math.random().toString(16).slice(2)}${Date.now().toString(16)}`,
        x,
        y,
        w: PLATFORM_W,
        h: PLATFORM_H,
        type,
        vx,
        brokeAt: null,
        breakAt: null,
        respawnAt: null,
      };
    }

    // Build varied rows of platforms. Guarantee one is reasonably reachable from the last platform.
    function makeRow(y, lastXCenter, forceAtLeastTwo = false) {
      const baseCount = pickWeighted([
        { v: 1, w: 0.70 },
        { v: 2, w: 0.25 },
        { v: 3, w: 0.05 },
      ]);
      const count = forceAtLeastTwo ? Math.max(2, baseCount) : baseCount;
      const row = [];

      const margin = 12;
      const minX = margin;
      const maxX = Math.max(margin, W - PLATFORM_W - margin);

      // Anchor platform: keep horizontal delta limited so there is always a path upward.
      const maxDx = Math.max(120, Math.round(W * 0.32));
      const anchorCenter = clamp(lastXCenter + randInt(-maxDx, maxDx), minX + PLATFORM_W / 2, maxX + PLATFORM_W / 2);
      const anchor = spawnPlatform(y, null, false);
      anchor.x = clamp(Math.round(anchorCenter - PLATFORM_W / 2), minX, maxX);
      row.push(anchor);

      for (let i = 1; i < count; i++) {
        const pl = spawnPlatform(y, null, false);
        // Try to spread out without heavy overlap
        let tries = 0;
        while (tries < 8) {
          const ok = row.every((o) => Math.abs((pl.x + pl.w / 2) - (o.x + o.w / 2)) > Math.max(PLATFORM_W * 0.65, 70));
          if (ok) break;
          pl.x = randInt(minX, maxX);
          tries++;
        }
        row.push(pl);
      }

      return row;
    }

    function decideCollectibleBit(wantBit) {
      const matchP = cfg.collectibleMatchP ?? 0.7;
      if (Math.random() < matchP) return wantBit;
      return wantBit === 0 ? 1 : 0;
    }

    const platforms = [];
    /** collectibles: {id,x,y,kind:'bit'|'coin',bit?,collected} */
    const collectibles = [];

    // Start: BLANK only (player spawns here during the countdown).
    const startBlank = spawnPlatform(startY + 44, "STATIC", true);
    startBlank.x = Math.round(startX - PLATFORM_W / 2);
    platforms.push(startBlank);

    // First gap: reachable from spawn, but not so close that you instantly chain-land.
    // First jump must always be reachable from spawn.
    // With current physics the max vertical reach is ~180px, so keep this conservative.
    const firstGap = clamp(Math.round((cfg.gap || 140) * 0.85), 110, 150);

    // Build initial world above the start.
    let lastXCenter = startBlank.x + startBlank.w / 2;
    const initialRows = 10;
    const baseY = startBlank.y - firstGap;
    for (let rowIdx = 0; rowIdx < initialRows; rowIdx++) {
      const y = baseY - rowIdx * cfg.gap;
      const isBitRow = rowIdx > 0 && (rowIdx % (cfg.bitEvery || 8) === 0);
      // When we spawn a bit-collectible, force at least 2 platforms so the player can always avoid a wrong bit.
      const row = makeRow(y, lastXCenter, isBitRow);
      platforms.push(...row);
      lastXCenter = row[0].x + row[0].w / 2;

      // Bit collectible: rare, but guaranteed when scheduled.
      if (isBitRow && row.length >= 2) {
        const wantBit = pattern[patternIndex] ?? 0;
        const bit = decideCollectibleBit(wantBit);
        // Place above a random platform in the row so the other platform(s) are a safe bypass.
        const pick = row[randInt(0, row.length - 1)];
        collectibles.push({
          id: `c_${Math.random().toString(16).slice(2)}${Date.now().toString(16)}`,
          x: pick.x + pick.w / 2,
          y: pick.y - 28,
          kind: "bit",
          bit,
          collected: false,
        });
      }

      // Coin: optional, small score bonus (+1). Can appear on any row, but keep it sparse.
      if (Math.random() < (cfg.coinP ?? 0.15)) {
        const pick = row[randInt(0, row.length - 1)];
        collectibles.push({
          id: `k_${Math.random().toString(16).slice(2)}${Date.now().toString(16)}`,
          x: pick.x + pick.w / 2,
          y: pick.y - 52,
          kind: "coin",
          collected: false,
        });
      }
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
      lastXCenter,
      spawnRowIndex: initialRows,
      collectibles,
      highestY: startY,
      score: 0,
      best: loadBest(diff),
      combo: 0,
      puzzle,
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
      puzzle: s.puzzle,
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
          puzzle: s.puzzle,
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
        puzzle: s.puzzle,
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
        if (pl.type === "BREAKING") {
          // Trigger break after a short delay when stepped on, then respawn a bit later.
          if (!pl.brokeAt && pl.breakAt && now >= pl.breakAt) {
            pl.brokeAt = now;
            pl.respawnAt = now + 2600;
          }
          if (pl.brokeAt && pl.respawnAt && now >= pl.respawnAt) {
            pl.brokeAt = null;
            pl.breakAt = null;
            pl.respawnAt = null;
          }
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

          // Platforms are only movement.
          // Tiny reward for landings to keep flow (collectibles are the real progress).
          s.score += 2;

          break;
        }
      }

      // Camera / scoring by height (scroll world down)
      const camY = H * 0.36;
      if (p.y < camY) {
        const dy = camY - p.y;
        p.y = camY;
        for (const pl of s.platforms) pl.y += dy;
        for (const c of s.collectibles) c.y += dy;

        s.highestY = Math.min(s.highestY, p.y);
        s.score += Math.round(dy * 0.12);
      }

      // Collectibles pickup.
      {
        const pickR = Math.max(16, s.PLAYER_R * 1.25);
        for (const c of s.collectibles) {
          if (c.collected) continue;
          const dx = p.x - c.x;
          const dy = p.y - c.y;
          if (dx * dx + dy * dy <= pickR * pickR) {
            c.collected = true;

            if (c.kind === "coin") {
              // coin = small bonus
              s.score += 1;
              haptic(6);
              continue;
            }

            // bit collectible: wrong bit = instant loss; right bit advances the required sequence.
            const want = s.pattern[s.patternIndex];
            if (c.bit !== want) {
              s.errors += 1;
              s.combo = 0;
              s.shakeT = s.SHAKE_MS;
              s.shakeAmp = s.SHAKE_PX;
              haptic([18, 40, 18]);
              endGame(s, now, false);
              return;
            }

            // correct
            s.patternIndex += 1;
            s.combo = Math.min(999, s.combo + 1);
            s.score += 60 + Math.round(s.combo * 6);
            haptic(12);
            if (s.patternIndex >= s.pattern.length) {
              haptic([20, 30, 20]);
              endGame(s, now, true);
              return;
            }
          }
        }
      }

      // Remove platforms that are far below the screen. Breaking platforms now respawn.
      s.platforms = s.platforms.filter((pl) => pl.y < H + 140);
      s.collectibles = s.collectibles.filter((c) => !c.collected && c.y < H + 160);

      let topMost = s.platforms.reduce((m, pl) => Math.min(m, pl.y), Infinity);
      // Keep the on-screen count low to avoid visual clutter.
      const desiredPlatforms = 10;

      function spawnPlatformRuntime(y) {
        const cfg = s.cfg;
        const type = pickWeighted([
          { v: "STATIC", w: 1.0 },
          { v: "MOVING", w: cfg.moveW },
          { v: "BREAKING", w: cfg.breakW },
          { v: "BOUNCY", w: cfg.bouncyW },
        ]);

        const x = randInt(12, Math.max(12, s.W - s.PLATFORM_W - 12));
        const vx = type === "MOVING" ? (Math.random() < 0.5 ? -1 : 1) * randInt(70, 135) : 0;
        return {
          id: `${Math.random().toString(16).slice(2)}${Date.now().toString(16)}`,
          x,
          y,
          w: s.PLATFORM_W,
          h: s.PLATFORM_H,
          type,
          vx,
          brokeAt: null,
          breakAt: null,
          respawnAt: null,
        };
      }

      function makeRowRuntime(y, forceAtLeastTwo = false) {
        const baseCount = pickWeighted([
          { v: 1, w: 0.70 },
          { v: 2, w: 0.25 },
          { v: 3, w: 0.05 },
        ]);
        const count = forceAtLeastTwo ? Math.max(2, baseCount) : baseCount;
        const row = [];

        const margin = 12;
        const minX = margin;
        const maxX = Math.max(margin, s.W - s.PLATFORM_W - margin);

        const maxDx = Math.max(120, Math.round(s.W * 0.34));
        const anchorCenter = clamp(s.lastXCenter + randInt(-maxDx, maxDx), minX + s.PLATFORM_W / 2, maxX + s.PLATFORM_W / 2);
        const anchor = spawnPlatformRuntime(y);
        anchor.x = clamp(Math.round(anchorCenter - s.PLATFORM_W / 2), minX, maxX);
        row.push(anchor);

        for (let i = 1; i < count; i++) {
          const pl = spawnPlatformRuntime(y);
          let tries = 0;
          while (tries < 8) {
            const ok = row.every((o) => Math.abs((pl.x + pl.w / 2) - (o.x + o.w / 2)) > Math.max(s.PLATFORM_W * 0.65, 70));
            if (ok) break;
            pl.x = randInt(minX, maxX);
            tries++;
          }
          row.push(pl);
        }
        return row;
      }

      function spawnBitOnRow(row) {
        // Ensure there is always an alternative platform to avoid a wrong bit.
        if (!row || row.length < 2) return;
        const want = s.pattern[s.patternIndex] ?? 0;
        const matchP = s.cfg.collectibleMatchP ?? 0.7;
        const bit = Math.random() < matchP ? want : want === 0 ? 1 : 0;

        const pick = row[randInt(0, row.length - 1)];
        s.collectibles.push({
          id: `c_${Math.random().toString(16).slice(2)}${Date.now().toString(16)}`,
          x: pick.x + pick.w / 2,
          y: pick.y - 28,
          kind: "bit",
          bit,
          collected: false,
        });
      }

      function spawnCoinOnRow(row) {
        if (!row || row.length < 1) return;
        const pick = row[randInt(0, row.length - 1)];
        s.collectibles.push({
          id: `k_${Math.random().toString(16).slice(2)}${Date.now().toString(16)}`,
          x: pick.x + pick.w / 2,
          y: pick.y - 52,
          kind: "coin",
          collected: false,
        });
      }

      // Ensure we always have a few rows above the screen.
      while (topMost > -180 || s.platforms.length < desiredPlatforms) {
        const y = Math.min(topMost - s.cfg.gap, -randInt(24, 70));
        const every = s.cfg.bitEvery || 8;
        const nextRowIndex = s.spawnRowIndex + 1;
        const isBitRow = nextRowIndex > 0 && (nextRowIndex % every === 0);
        // If a collectible is scheduled, force at least 2 platforms so it's always avoidable.
        const row = makeRowRuntime(y, isBitRow);
        s.platforms.push(...row);
        s.lastXCenter = row[0].x + row[0].w / 2;
        s.spawnRowIndex = nextRowIndex;
        if (isBitRow) spawnBitOnRow(row);
        if (Math.random() < (s.cfg.coinP ?? 0.15)) spawnCoinOnRow(row);
        topMost = Math.min(topMost, y);
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
        endGame(s, now, false);
      }
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
        const isBroken = !!pl.brokeAt;

        const isBlank = pl.type === "BLANK";
        const baseFill = isBlank ? 0.16 : 0.10;
        ctx.fillStyle = `rgba(255,255,255,${isBroken ? baseFill * 0.35 : baseFill})`;
        ctx.fillRect(pl.x, pl.y, pl.w, pl.h);

        // type indicators
        ctx.strokeStyle = "rgba(255,255,255,0.35)";
        ctx.lineWidth = 2;
        if (isBroken) {
          ctx.setLineDash([6, 6]);
          ctx.strokeStyle = "rgba(255,255,255,0.20)";
          ctx.strokeRect(pl.x - 1, pl.y - 1, pl.w + 2, pl.h + 2);
          ctx.setLineDash([]);
          continue;
        }

        if (isBlank) {
          ctx.setLineDash([6, 5]);
          ctx.strokeRect(pl.x - 1, pl.y - 1, pl.w + 2, pl.h + 2);
          ctx.setLineDash([]);
        } else if (pl.type === "MOVING") {
          ctx.strokeRect(pl.x - 1, pl.y - 1, pl.w + 2, pl.h + 2);
          ctx.fillStyle = "rgba(255,255,255,0.8)";
          ctx.font = `700 ${Math.round(12)}px ui-sans-serif, system-ui, -apple-system`;
          ctx.textAlign = "left";
          ctx.textBaseline = "middle";
          ctx.fillText("↔", pl.x + 10, pl.y + pl.h / 2);
        } else if (pl.type === "BOUNCY") {
          ctx.strokeStyle = "rgba(255,255,255,0.55)";
          ctx.strokeRect(pl.x - 1, pl.y - 1, pl.w + 2, pl.h + 2);
          ctx.fillStyle = "rgba(255,255,255,0.85)";
          ctx.font = `700 ${Math.round(12)}px ui-sans-serif, system-ui, -apple-system`;
          ctx.textAlign = "left";
          ctx.textBaseline = "middle";
          ctx.fillText("↑", pl.x + 10, pl.y + pl.h / 2);
        } else if (pl.type === "BREAKING") {
          ctx.setLineDash([5, 4]);
          ctx.strokeStyle = "rgba(255,255,255,0.40)";
          ctx.strokeRect(pl.x - 1, pl.y - 1, pl.w + 2, pl.h + 2);
          ctx.setLineDash([]);
          ctx.fillStyle = "rgba(255,255,255,0.75)";
          ctx.font = `700 ${Math.round(11)}px ui-sans-serif, system-ui, -apple-system`;
          ctx.textAlign = "left";
          ctx.textBaseline = "middle";
          ctx.fillText("⟂", pl.x + 10, pl.y + pl.h / 2);
        }
      }

      // collectibles
      for (const c of s.collectibles) {
        if (c.collected) continue;
        const r = c.kind === "coin" ? 14 : 16;

        // soft shadow
        ctx.fillStyle = "rgba(0,0,0,0.35)";
        ctx.beginPath();
        ctx.arc(c.x, c.y, r + 3, 0, Math.PI * 2);
        ctx.fill();

        if (c.kind === "coin") {
          // coin (+1 score)
          ctx.fillStyle = "rgba(255, 215, 64, 0.92)";
          ctx.beginPath();
          ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "rgba(0,0,0,0.35)";
          ctx.lineWidth = 2;
          ctx.stroke();

          // highlight
          ctx.fillStyle = "rgba(255,255,255,0.55)";
          ctx.beginPath();
          ctx.arc(c.x - 4, c.y - 5, 3.5, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // bit collectible (0/1)
          ctx.fillStyle = "rgba(255,255,255,0.92)";
          ctx.beginPath();
          ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "rgba(0,0,0,0.75)";
          ctx.font = `900 ${Math.round(18)}px ui-sans-serif, system-ui, -apple-system`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(String(c.bit), c.x, c.y + 0.5);
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

  const aStr = ui.puzzle ? bitsToStr(ui.puzzle.aBits) : "";
  const bStr = ui.puzzle ? bitsToStr(ui.puzzle.bBits) : "";
  const opStr = ui.puzzle?.op || "";

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

        {/* Puzzle + progress (only what you need to play) */}
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <Pill>
            <span style={{ opacity: 0.9, fontWeight: 900 }}>{aStr}</span>
          </Pill>
          <Pill>
            <span style={{ opacity: 0.9, fontWeight: 900 }}>{opStr}</span>
          </Pill>
          <Pill>
            <span style={{ opacity: 0.9, fontWeight: 900 }}>{bStr}</span>
          </Pill>

          <div style={{ flex: "1 1 auto" }} />

          <Pill>
            <span style={{ opacity: 0.85 }}>Result</span>
          </Pill>

          {ui.pattern.map((bit, i) => {
            const isActive = i === ui.patternIndex;
            const isDone = i < ui.patternIndex;
            return (
              <div
                key={`r_${i}`}
                style={{
                  width: 34,
                  height: 30,
                  borderRadius: 12,
                  border: "1px solid rgba(148,163,184,0.18)",
                  background: isDone
                    ? "rgba(34,197,94,0.14)"
                    : isActive
                    ? "rgba(59,130,246,0.16)"
                    : "rgba(2,6,23,0.45)",
                  display: "grid",
                  placeItems: "center",
                  transform: isActive ? "translateY(-1px)" : "none",
                  boxShadow: isActive ? "0 12px 24px rgba(0,0,0,0.35)" : "none",
                }}
              >
                <span style={{ fontWeight: 950, fontSize: 14 }}>{isDone ? bit : "?"}</span>
              </div>
            );
          })}
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
