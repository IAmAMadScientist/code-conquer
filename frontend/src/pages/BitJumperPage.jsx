import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { Badge } from "../components/ui/badge";
import { cn } from "../lib/utils";
import ResultSubmitPanel from "../components/ResultSubmitPanel";
import TutorialModal from "../components/TutorialModal";
import { getPlayer } from "../lib/player";
import { getTutorial, tutorialKey } from "../lib/tutorials";
import { DIFFICULTY } from "../lib/constants";
import {
  getHapticsEnabled,
  getSoundEnabled,
  playFailSfx,
  playMoveSfx,
  playUiTapSfx,
  playWinSfx,
} from "../lib/diceSound";

const DIFF_CFG = {
  [DIFFICULTY.EASY]: { bitsLen: 3, gap: 148, moveW: 0.14, breakW: 0.12, bouncyW: 0.12, bitEvery: 8, coinP: 0.16, collectibleMatchP: 0.72 },
  [DIFFICULTY.MEDIUM]: { bitsLen: 4, gap: 158, moveW: 0.18, breakW: 0.14, bouncyW: 0.14, bitEvery: 7, coinP: 0.15, collectibleMatchP: 0.68 },
  [DIFFICULTY.HARD]: { bitsLen: 6, gap: 168, moveW: 0.22, breakW: 0.16, bouncyW: 0.16, bitEvery: 6, coinP: 0.14, collectibleMatchP: 0.64 },
};

function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
function lerp(a, b, t) { return a + (b - a) * t; }
function randInt(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; }
function pickWeighted(items) {
  const sum = items.reduce((s, it) => s + it.w, 0);
  let r = Math.random() * sum;
  for (const it of items) { r -= it.w; if (r <= 0) return it.v; }
  return items[items.length - 1].v;
}
function haptic(patternOrMs) { try { if (navigator?.vibrate) navigator.vibrate(patternOrMs); } catch {} }
function bestKey(diff) { return `bitjumper_best_${diff}`; }
function loadBest(diff) { try { const v = localStorage.getItem(bestKey(diff)); return v ? Number(v) : 0; } catch { return 0; } }
function saveBest(diff, v) { try { localStorage.setItem(bestKey(diff), String(v)); } catch {} }
function bitsToStr(bits) { return bits.map((b) => (b ? "1" : "0")).join(""); }
function bitwiseOp(aBits, bBits, op) {
  const out = [];
  for (let i = 0; i < aBits.length; i++) {
    const a = aBits[i] ? 1 : 0, b = bBits[i] ? 1 : 0;
    out.push(op === "AND" ? (a & b) : (a | b));
  }
  return out;
}
function makePuzzle(diff) {
  const cfg = DIFF_CFG[diff] || DIFF_CFG[DIFFICULTY.EASY], L = cfg.bitsLen;
  const a = Array.from({ length: L }, () => (Math.random() < 0.5 ? 0 : 1));
  const b = Array.from({ length: L }, () => (Math.random() < 0.5 ? 0 : 1));
  const op = Math.random() < 0.5 ? "AND" : "OR";
  return { aBits: a, bBits: b, op, resultBits: bitwiseOp(a, b, op) };
}

export default function BitJumperPage() {
  const loc = useLocation();
  const challenge = loc.state?.challenge || null;
  const difficulty = (challenge?.difficulty || DIFFICULTY.EASY).toUpperCase();
  const diff = DIFF_CFG[difficulty] ? difficulty : DIFFICULTY.EASY;
  const player = useMemo(() => getPlayer(), []);
  const tutorial = useMemo(() => getTutorial("BIT_JUMPER"), []);
  const tutKey = useMemo(() => tutorialKey({ playerId: player?.playerId, category: "BIT_JUMPER" }), [player?.playerId]);

  const [tutorialOpen, setTutorialOpen] = useState(() => {
    if (!challenge) return false;
    try { return localStorage.getItem(tutKey) !== "1"; } catch { return false; }
  });

  const [started, setStarted] = useState(() => !tutorialOpen);
  const canvasRef = useRef(null);
  const rafRef = useRef(0);
  const inputRef = useRef({ xNorm: 0.5, down: false });
  const stateRef = useRef(null);
  const [ui, setUi] = useState({ score: 0, best: loadBest(diff), combo: 0, diff, puzzle: makePuzzle(diff), pattern: [], patternIndex: 0, countdown: 0, gameOver: false, timeMs: 0, errors: 0, won: null });
  const uiRef = useRef(ui);
  useEffect(() => { uiRef.current = ui; }, [ui]);

  useEffect(() => {
    const p = makePuzzle(diff);
    setUi(u => ({ ...u, diff, best: loadBest(diff), puzzle: p, pattern: p.resultBits, patternIndex: 0, score: 0, combo: 0, countdown: 0, gameOver: false, timeMs: 0, errors: 0, won: null }));
  }, [diff, started]);

  function resetGame() {
    const canvas = canvasRef.current; if (!canvas) return;
    const W = canvas.width, H = canvas.height, cfg = DIFF_CFG[diff], now = performance.now();
    const GRAVITY = 2600, JUMP_VY = -980, HCTRL = 12.5, WRAP = true, COYOTE_PX = 10, COYOTE_X_PAD = 10, BREAK_DELAY_MS = 250, BOUNCY_MULT = 1.28, SHAKE_MS = 160, SHAKE_PX = 9, PENALTY_VY = 520;
    const PLAYER_R = Math.max(12, Math.round(Math.min(W, H) * 0.03)), PLATFORM_W = clamp(Math.round(W * 0.22), 62, 124), PLATFORM_H = 14;
    const startY = H - 90, startX = W * 0.5, puzzle = makePuzzle(diff), pattern = puzzle.resultBits;
    
    function spawnPlatform(y, typeOverride = null, forceBlank = false) {
      const type = forceBlank ? "BLANK" : typeOverride || pickWeighted([{ v: "STATIC", w: 1.0 }, { v: "MOVING", w: cfg.moveW }, { v: "BREAKING", w: cfg.breakW }, { v: "BOUNCY", w: cfg.bouncyW }]);
      return { id: Math.random().toString(16), x: randInt(12, Math.max(12, W - PLATFORM_W - 12)), y, w: PLATFORM_W, h: PLATFORM_H, type, vx: type === "MOVING" ? (Math.random() < 0.5 ? -1 : 1) * randInt(70, 120) : 0, brokeAt: null, breakAt: null, respawnAt: null };
    }

    const platforms = [], startBlank = spawnPlatform(startY + 44, "STATIC", true);
    startBlank.x = Math.round(startX - PLATFORM_W / 2); platforms.push(startBlank);
    let lastXCenter = startBlank.x + startBlank.w / 2, collectibles = [];
    for (let i = 0; i < 10; i++) {
      const y = startBlank.y - 120 - i * cfg.gap, isBit = i > 0 && (i % cfg.bitEvery === 0), row = [spawnPlatform(y)];
      platforms.push(...row); lastXCenter = row[0].x + row[0].w / 2;
      if (isBit) collectibles.push({ id: `c_${i}`, x: row[0].x + row[0].w / 2, y: y - 28, kind: "bit", bit: Math.random() < cfg.collectibleMatchP ? (pattern[0]||0) : (pattern[0]===0?1:0), collected: false });
      if (Math.random() < cfg.coinP) collectibles.push({ id: `k_${i}`, x: row[0].x + row[0].w / 2, y: y - 52, kind: "coin", collected: false });
    }

    stateRef.current = { now, W, H, cfg, GRAVITY, JUMP_VY, HCTRL, WRAP, COYOTE_PX, COYOTE_X_PAD, BREAK_DELAY_MS, BOUNCY_MULT, SHAKE_MS, SHAKE_PX, PENALTY_VY, PLAYER_R, PLATFORM_H, PLATFORM_W, player: { x: startBlank.x + startBlank.w / 2, y: startBlank.y - PLAYER_R - 1, vy: 0 }, platforms, collectibles, highestY: startY, score: 0, best: loadBest(diff), combo: 0, puzzle, pattern, patternIndex: 0, shakeT: 0, shakeAmp: 0, errors: 0, phase: "countdown", countdownStart: now, countdownMs: 3000, startedAt: 0, gameOver: false };
    setUi(u => ({ ...u, score: 0, combo: 0, countdown: 3, gameOver: false, won: null }));
  }

  useEffect(() => {
    if (!started) return;
    const canvas = canvasRef.current; if (!canvas) return;
    function resize() {
      const dpr = window.devicePixelRatio || 1, rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr; canvas.height = rect.height * dpr; resetGame();
    }
    resize(); window.addEventListener("resize", resize); return () => window.removeEventListener("resize", resize);
  }, [started, diff]);

  useEffect(() => {
    if (!started) return;
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    let last = performance.now();
    function loop(now) {
      rafRef.current = requestAnimationFrame(loop);
      const s = stateRef.current; if (!s) return;
      const dt = clamp((now - last) / 1000, 0, 0.05); last = now;
      if (!s.gameOver && s.phase === "countdown") {
        const left = Math.max(0, s.countdownMs - (now - s.countdownStart));
        s._countdown = Math.ceil(left / 1000);
        if (left <= 0) { s.phase = "playing"; s.startedAt = now; s.player.vy = s.JUMP_VY; s._countdown = 0; }
      }
      if (!s.gameOver && s.phase === "playing") update(s, dt, now);
      render(s, ctx, now);
      if (!s._uiNext || now >= s._uiNext) {
        s._uiNext = now + 33;
        setUi(u => ({ ...u, score: s.score, combo: s.combo, patternIndex: s.patternIndex, countdown: s._countdown||0, gameOver: s.gameOver, errors: s.errors, timeMs: s.gameOver ? Math.round(now - s.startedAt) : (s.startedAt ? Math.round(now - s.startedAt) : 0) }));
      }
    }
    function update(s, dt, now) {
      const p = s.player, inputX = s.W * inputRef.current.xNorm;
      p.x = lerp(p.x, inputX, 1 - Math.exp(-s.HCTRL * dt));
      if (s.WRAP) { if (p.x < -s.PLAYER_R) p.x = s.W + s.PLAYER_R; if (p.x > s.W + s.PLAYER_R) p.x = -s.PLAYER_R; }
      const prevY = p.y; p.vy += s.GRAVITY * dt; p.y += p.vy * dt;
      for (const pl of s.platforms) {
        if (pl.type === "MOVING") { pl.x += pl.vx * dt; if (pl.x < 6 || pl.x + pl.w > s.W - 6) pl.vx *= -1; }
        if (pl.type === "BREAKING") { if (!pl.brokeAt && pl.breakAt && now >= pl.breakAt) { pl.brokeAt = now; pl.respawnAt = now + 2600; } if (pl.brokeAt && pl.respawnAt && now >= pl.respawnAt) { pl.brokeAt = pl.breakAt = pl.respawnAt = null; } }
      }
      if (p.vy > 0) {
        for (const pl of s.platforms) {
          if (pl.brokeAt) continue;
          if ((prevY + s.PLAYER_R <= pl.y && p.y + s.PLAYER_R >= pl.y) && (p.x + s.PLAYER_R >= pl.x && p.x - s.PLAYER_R <= pl.x + pl.w)) {
            p.y = pl.y - s.PLAYER_R; p.vy = pl.type === "BOUNCY" ? s.JUMP_VY * s.BOUNCY_MULT : s.JUMP_VY;
            if (pl.type === "BREAKING" && !pl.breakAt) pl.breakAt = now + s.BREAK_DELAY_MS;
            if (getSoundEnabled()) playUiTapSfx();
            s.score += 2; break;
          }
        }
      }
      const camY = s.H * 0.36;
      if (p.y < camY) { const dy = camY - p.y; p.y = camY; s.platforms.forEach(pl => pl.y += dy); s.collectibles.forEach(c => c.y += dy); s.score += Math.round(dy * 0.12); }
      for (const c of s.collectibles) {
        if (c.collected) continue;
        if (Math.hypot(p.x - c.x, p.y - c.y) < s.PLAYER_R + 10) {
          c.collected = true; 
          haptic(c.kind === "coin" ? 6 : 12);
          if (c.kind === "coin") { 
            if (getSoundEnabled()) playMoveSfx();
            s.score += 10; continue; 
          }
          if (c.bit !== s.pattern[s.patternIndex]) { 
            s.errors++; 
            if (getSoundEnabled()) playFailSfx();
            endGame(s, now, false); return; 
          }
          s.patternIndex++; s.combo++; s.score += 100 * s.combo;
          if (getSoundEnabled()) playUiTapSfx();
          if (s.patternIndex >= s.pattern.length) { 
            if (getSoundEnabled()) playWinSfx();
            endGame(s, now, true); return; 
          }
        }
      }
      s.platforms = s.platforms.filter(pl => pl.y < s.H + 200); s.collectibles = s.collectibles.filter(c => !c.collected && c.y < s.H + 200);
      while (s.platforms.length < 12) {
        const topY = Math.min(...s.platforms.map(pl => pl.y));
        const pl = spawnPlatform(topY - s.cfg.gap); s.platforms.push(pl);
        if (Math.random() < 0.2) s.collectibles.push({ id: Math.random(), x: pl.x + pl.w/2, y: pl.y - 30, kind: "bit", bit: Math.random() < 0.5 ? 0 : 1, collected: false });
      }
      if (p.y > s.H + 100) endGame(s, now, false);
    }
    function render(s, ctx, now) {
      ctx.fillStyle = "#020617"; ctx.fillRect(0, 0, s.W, s.H);
      ctx.fillStyle = "#1e293b"; for (let i=0; i<30; i++) ctx.fillRect((i*137)%s.W, (i*223+now/50)%s.H, 2, 2);
      for (const pl of s.platforms) {
        ctx.fillStyle = pl.brokeAt ? "#0f172a" : (pl.type === "BOUNCY" ? "#312e81" : "#1e293b");
        ctx.fillRect(pl.x, pl.y, pl.w, pl.h);
        ctx.strokeStyle = "rgba(255,255,255,0.1)"; ctx.strokeRect(pl.x, pl.y, pl.w, pl.h);
      }
      for (const c of s.collectibles) {
        if (c.collected) continue;
        ctx.fillStyle = c.kind === "coin" ? "#fbbf24" : "#fff";
        ctx.beginPath(); ctx.arc(c.x, c.y, 12, 0, Math.PI*2); ctx.fill();
        if (c.kind === "bit") { ctx.fillStyle = "#000"; ctx.font = "bold 12px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(c.bit, c.x, c.y); }
      }
      ctx.fillStyle = "#6366f1"; ctx.beginPath(); ctx.arc(s.player.x, s.player.y, s.PLAYER_R, 0, Math.PI*2); ctx.fill();
      ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.stroke();
    }
    function endGame(s, now, won) {
      if (s.gameOver) return; s.gameOver = true; haptic(won ? [20, 30, 20] : 40);
      if (s.score > s.best) saveBest(diff, s.score);
      setUi(u => ({ ...u, gameOver: true, won, timeMs: Math.round(now - s.startedAt), best: Math.max(s.score, u.best) }));
    }
    function spawnPlatform(y) {
      const type = pickWeighted([{ v: "STATIC", w: 1 }, { v: "MOVING", w: 0.2 }, { v: "BREAKING", w: 0.2 }, { v: "BOUNCY", w: 0.2 }]);
      return { id: Math.random(), x: randInt(10, stateRef.current.W - 100), y, w: stateRef.current.PLATFORM_W, h: stateRef.current.PLATFORM_H, type, vx: 100, brokeAt: null, breakAt: null };
    }
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [started, diff]);

  const onPointerDown = (e) => { inputRef.current.down = true; updateInput(e.clientX); };
  const onPointerMove = (e) => { if (inputRef.current.down) updateInput(e.clientX); };
  const updateInput = (cx) => { const r = canvasRef.current.getBoundingClientRect(); inputRef.current.xNorm = clamp((cx - r.left) / r.width, 0, 1); };

  return (
    <div className="h-full flex flex-col bg-bg0 text-text overflow-hidden p-s3 sm:p-s4">
      {/* HUD */}
      <div className="flex justify-between items-center mb-s3 animate-in fade-in slide-in-from-top-2 duration-300">
        <div className="flex gap-2">
          <Badge variant="secondary" className="px-3 py-1 font-bold">⭐ {ui.score}</Badge>
          <Badge variant="outline" className="px-3 py-1 font-bold border-indigo-500/30 text-indigo-300">🏆 {ui.best}</Badge>
        </div>
        <div className="flex gap-2">
          <Badge variant="secondary" className="px-3 py-1 font-bold">Combo x{ui.combo}</Badge>
        </div>
      </div>

      {/* Puzzle View */}
      <div className="bg-bg1/40 rounded-2xl border border-border p-3 mb-4 flex items-center justify-between">
        <div className="flex gap-2 items-center">
          <code className="text-xs font-black px-2 py-1 bg-bg2 rounded border border-white/5">{bitsToStr(ui.puzzle.aBits)}</code>
          <span className="text-[10px] font-black text-indigo-400">{ui.puzzle.op}</span>
          <code className="text-xs font-black px-2 py-1 bg-bg2 rounded border border-white/5">{bitsToStr(ui.puzzle.bBits)}</code>
        </div>
        <div className="flex gap-1">
          {ui.pattern.map((bit, i) => (
            <div key={i} className={cn("w-6 h-6 rounded flex items-center justify-center text-[10px] font-black border transition-all", i < ui.patternIndex ? "bg-emerald-500 border-emerald-300 text-bg0" : (i === ui.patternIndex ? "bg-indigo-500 border-indigo-300 animate-pulse" : "bg-bg2 border-border text-muted"))}>
              {i < ui.patternIndex ? bit : "?"}
            </div>
          ))}
        </div>
      </div>

      {/* Game Canvas */}
      <div className="flex-1 min-h-0 bg-bg1/20 rounded-2xl border border-border relative overflow-hidden group shadow-inner">
        <canvas ref={canvasRef} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={() => inputRef.current.down = false} className="w-full h-full touch-none" />
        {ui.countdown > 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-bg0/40 backdrop-blur-sm z-20 pointer-events-none">
            <span className="text-8xl font-black italic text-white drop-shadow-[0_0_30px_rgba(99,102,241,0.8)] animate-ping">{ui.countdown}</span>
          </div>
        )}
        {ui.gameOver && (
          <div onClick={resetGame} className="absolute inset-0 flex flex-col items-center justify-center bg-bg0/60 backdrop-blur-md z-30 cursor-pointer animate-in fade-in duration-500">
            <h2 className="text-4xl font-black mb-2">{ui.won ? "MISSION CLEAR" : "SYSTEM CRASH"}</h2>
            <p className="text-sm font-bold opacity-60 uppercase tracking-widest">Tap to Try Again</p>
          </div>
        )}
      </div>

      {typeof ui.won === "boolean" && (
        <div className="mt-4 animate-in slide-in-from-bottom-4 duration-500">
          <ResultSubmitPanel category="BIT_JUMPER" difficulty={diff} timeMs={ui.timeMs} errors={ui.errors} won={ui.won} challengeId={challenge?.challengeInstanceId} explanation={ui.won ? "Sequence synchronized successfully!" : "Data corruption detected during ascent."} />
        </div>
      )}

      <TutorialModal open={tutorialOpen} tutorial={tutorial} difficulty={diff} onConfirm={() => { try { localStorage.setItem(tutKey, "1"); } catch {} setTutorialOpen(false); setStarted(true); }} />
    </div>
  );
}