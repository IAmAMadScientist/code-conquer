import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import ResultSubmitPanel from "../components/ResultSubmitPanel";
import {
  getHapticsEnabled,
  getSoundEnabled,
  playFailSfx,
  playMoveSfx,
  playUiTapSfx,
  playWinSfx,
} from "../lib/diceSound";

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function randInt(a, b) {
  return Math.floor(Math.random() * (b - a + 1)) + a;
}

function vibrate(ms) {
  try {
    if (getHapticsEnabled() && navigator?.vibrate) navigator.vibrate(ms);
  } catch {
    // ignore
  }
}

function sfx(fn) {
  try {
    if (getSoundEnabled()) fn();
  } catch {
    // ignore
  }
}

function configFor(difficulty) {
  const d = (difficulty || "EASY").toUpperCase();
  if (d === "HARD") {
    return {
      lanes: 5,
      maxStack: 5,
      durationMs: 22000,
      cmdSpawnMs: 520,
      cmdSpeed: 520, // px/s
      obstacleSpawnMs: 780,
      obstacleSpeed: 360,
      coinChance: 0.35,
      fakeChance: 0.22,
      targetCoins: 10,
      executeStepMs: 150,
    };
  }
  if (d === "MEDIUM") {
    return {
      lanes: 5,
      maxStack: 4,
      durationMs: 18000,
      cmdSpawnMs: 700,
      cmdSpeed: 440,
      obstacleSpawnMs: 900,
      obstacleSpeed: 300,
      coinChance: 0.45,
      fakeChance: 0,
      targetCoins: 6,
      executeStepMs: 165,
    };
  }
  return {
    lanes: 5,
    maxStack: 3,
    durationMs: 10000,
    cmdSpawnMs: 900,
    cmdSpeed: 380,
    obstacleSpawnMs: 1100,
    obstacleSpeed: 250,
    coinChance: 0.35,
    fakeChance: 0,
    targetCoins: 0,
    executeStepMs: 180,
  };
}

function cmdLabel(type) {
  if (type === "LEFT") return "⬅️";
  if (type === "RIGHT") return "➡️";
  if (type === "WAIT") return "⏸";
  return "?";
}

export default function StackDropPage() {
  const loc = useLocation();
  const challenge = loc.state?.challenge;
  const difficulty = (challenge?.difficulty || "EASY").toUpperCase();
  const cfg = useMemo(() => configFor(difficulty), [difficulty]);

  // Fullscreen mobile game: prevent page scroll / overscroll while playing.
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    const prevTouch = document.body.style.touchAction;
    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.touchAction = prevTouch;
    };
  }, []);

  // Desktop testing support: enable keyboard controls and hover effects on non-touch devices.
  const isTouchDevice = useMemo(() => {
    try {
      return (
        "ontouchstart" in window ||
        navigator?.maxTouchPoints > 0 ||
        window.matchMedia?.("(pointer: coarse)")?.matches
      );
    } catch {
      return false;
    }
  }, []);
  const isDesktop = !isTouchDevice;

  const [status, setStatus] = useState("playing"); // playing | won | lost
  const [errors, setErrors] = useState(0);
  const [coins, setCoins] = useState(0);
  const [timeMs, setTimeMs] = useState(0);

  const [stack, setStack] = useState([]); // array of cmd types
  const [executing, setExecuting] = useState(false);

  // game world
  const [lane, setLane] = useState(2);
  const [cmds, setCmds] = useState([]); // falling commands {id,type,y,isFake}
  const [things, setThings] = useState([]); // obstacles/coins {id,kind,lane,y}
  const [shake, setShake] = useState(false);
  const [hoverCmdId, setHoverCmdId] = useState(null);

  // Responsive scaling for a fixed-size world (mobile fullscreen without overlap).
  const playAreaRef = useRef(null);
  const [playAreaSize, setPlayAreaSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = playAreaRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries?.[0]?.contentRect;
      if (!r) return;
      setPlayAreaSize({ w: r.width, h: r.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const startRef = useRef(Date.now());
  const rafRef = useRef(null);
  const lastTsRef = useRef(null);
  const cmdAccRef = useRef(0);
  const thingAccRef = useRef(0);
  const idRef = useRef(1);
  const executingRef = useRef(false);
  const laneRef = useRef(lane);
  useEffect(() => {
    laneRef.current = lane;
  }, [lane]);

  function bumpError(msg) {
    setErrors((e) => e + 1);
    setShake(true);
    setTimeout(() => setShake(false), 220);
    vibrate(35);
    sfx(playFailSfx);
    // msg reserved (later could show)
    void msg;
  }

  function endLost(reason) {
    if (status !== "playing") return;
    bumpError(reason);
    setStatus("lost");
  }

  function endWon() {
    if (status !== "playing") return;
    setStatus("won");
    vibrate(55);
    sfx(playWinSfx);
  }

  function resetAll() {
    startRef.current = Date.now();
    setStatus("playing");
    setErrors(0);
    setCoins(0);
    setTimeMs(0);
    setStack([]);
    setExecuting(false);
    executingRef.current = false;
    setLane(2);
    setCmds([]);
    setThings([]);
    cmdAccRef.current = 0;
    thingAccRef.current = 0;
    lastTsRef.current = null;
  }

  // Initial reset when opened
  useEffect(() => {
    resetAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [difficulty, challenge?.challengeInstanceId]);

  function spawnCmd() {
    const pool = difficulty === "EASY" ? ["LEFT", "RIGHT"] : difficulty === "MEDIUM" ? ["LEFT", "RIGHT", "WAIT"] : ["LEFT", "RIGHT", "WAIT"];
    const type = pool[randInt(0, pool.length - 1)];
    const isFake = difficulty === "HARD" && Math.random() < cfg.fakeChance;
    const id = idRef.current++;
    setCmds((a) => [...a, { id, type, y: -40, isFake }]);
  }

  function spawnThing() {
    const id = idRef.current++;
    const laneIdx = randInt(0, cfg.lanes - 1);
    const kind = Math.random() < cfg.coinChance ? "COIN" : "WALL";
    setThings((a) => [...a, { id, kind, lane: laneIdx, y: -40 }]);
  }

  function pushCmd(cmd) {
    if (status !== "playing") return;
    if (executingRef.current) return; // keep it snappy: no editing while executing
    if (cmd.isFake) {
      bumpError("fake");
      return;
    }
    setCmds((a) => a.filter((c) => c.id !== cmd.id));
    setStack((s) => {
      if (s.length >= cfg.maxStack) {
        bumpError("overflow");
        return s;
      }
      sfx(playUiTapSfx);
      vibrate(18);
      return [...s, cmd.type];
    });
  }

  // Desktop keyboard controls: push commands onto the stack directly.
  // If a matching falling command exists, consume the closest one (nice UX),
  // but never require pixel-perfect timing just to test the game on desktop.
  function pushType(type) {
    if (status !== "playing") return;
    if (executingRef.current) return;
    // Opportunistically consume a matching on-screen command so desktop and touch
    // share the same "catch" vibe, but don't block input if none is present.
    setCmds((a) => {
      const candidates = a
        .filter((c) => !c.isFake && c.type === type)
        .sort((x, y) => y.y - x.y); // closest to player first
      if (!candidates.length) return a;
      const picked = candidates[0];
      return a.filter((c) => c.id !== picked.id);
    });

    setStack((s) => {
      if (s.length >= cfg.maxStack) {
        bumpError("overflow");
        return s;
      }
      sfx(playUiTapSfx);
      vibrate(18);
      return [...s, type];
    });
  }

  function clearStack() {
    if (status !== "playing") return;
    if (executingRef.current) return;
    setStack([]);
    vibrate(12);
    sfx(playUiTapSfx);
  }

  // Keyboard bindings (desktop only): A/D/S push, SPACE execute, ESC clear.
  useEffect(() => {
    if (!isDesktop) return;
    const onKeyDown = (e) => {
      if (e.repeat) return;
      if (status !== "playing") return;
      const code = e.code;
      // Desktop QA convenience: arrow keys move instantly.
      // A/D/S keep the intended "push to stack" feel.
      if (code === "ArrowLeft") {
        setLane((l) => clamp(l - 1, 0, cfg.lanes - 1));
        vibrate(10);
        sfx(playMoveSfx);
      } else if (code === "ArrowRight") {
        setLane((l) => clamp(l + 1, 0, cfg.lanes - 1));
        vibrate(10);
        sfx(playMoveSfx);
      } else if (code === "KeyA") {
        pushType("LEFT");
      } else if (code === "KeyD") {
        pushType("RIGHT");
      } else if (code === "KeyS" || code === "ArrowDown") {
        pushType("WAIT");
      } else if (code === "Space" || code === "Enter") {
        e.preventDefault();
        executeStack();
      } else if (code === "Escape") {
        clearStack();
      }
    };
    window.addEventListener("keydown", onKeyDown, { passive: false });
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDesktop, status, stack.length, difficulty]);

  async function executeStack() {
    if (status !== "playing") return;
    if (executingRef.current) return;
    if (stack.length === 0) {
      vibrate(12);
      sfx(playUiTapSfx);
      return;
    }
    executingRef.current = true;
    setExecuting(true);
    sfx(playMoveSfx);
    vibrate(20);

    // Execute LIFO
    let local = stack.slice();
    setStack([]);

    while (local.length) {
      const cmd = local.pop();
      if (cmd === "LEFT") {
        setLane((l) => clamp(l - 1, 0, cfg.lanes - 1));
        vibrate(10);
        sfx(playMoveSfx);
      } else if (cmd === "RIGHT") {
        setLane((l) => clamp(l + 1, 0, cfg.lanes - 1));
        vibrate(10);
        sfx(playMoveSfx);
      } else {
        // WAIT
        vibrate(6);
      }
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, cfg.executeStepMs));
    }
    executingRef.current = false;
    setExecuting(false);
  }

  // Main loop
  useEffect(() => {
    if (status !== "playing") {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      return;
    }

    function tick(ts) {
      if (lastTsRef.current == null) lastTsRef.current = ts;
      const dt = Math.min(0.05, (ts - lastTsRef.current) / 1000);
      lastTsRef.current = ts;

      const elapsed = Date.now() - startRef.current;
      setTimeMs(elapsed);
      if (elapsed >= cfg.durationMs) {
        // EASY wins purely by survival; Medium/Hard usually by coins but also allow survival.
        if (difficulty === "EASY" || coins >= cfg.targetCoins) endWon();
        else endWon();
        return;
      }

      // Spawn falling commands
      cmdAccRef.current += dt * 1000;
      if (cmdAccRef.current >= cfg.cmdSpawnMs) {
        cmdAccRef.current = cmdAccRef.current % cfg.cmdSpawnMs;
        spawnCmd();
      }

      // Spawn obstacles/coins
      thingAccRef.current += dt * 1000;
      if (thingAccRef.current >= cfg.obstacleSpawnMs) {
        thingAccRef.current = thingAccRef.current % cfg.obstacleSpawnMs;
        spawnThing();
      }

      // Advance commands
      setCmds((a) => {
        const next = [];
        for (const c of a) {
          const ny = c.y + cfg.cmdSpeed * dt;
          // Missed command → small penalty
          if (ny > 320) {
            bumpError("miss");
            continue;
          }
          next.push({ ...c, y: ny });
        }
        return next;
      });

      // Advance obstacles/coins
      setThings((a) => {
        const next = [];
        for (const t of a) {
          const ny = t.y + cfg.obstacleSpeed * dt;
          // collision window around player y
          const playerY = 520;
          const hit = ny >= playerY - 18 && ny <= playerY + 18 && t.lane === laneRef.current;
          if (hit) {
            if (t.kind === "COIN") {
              setCoins((c) => c + 1);
              vibrate(12);
              sfx(playUiTapSfx);
            } else {
              endLost("crash");
              return [];
            }
            continue;
          }
          if (ny > 640) continue;
          next.push({ ...t, y: ny });
        }
        return next;
      });

      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, difficulty, cfg.durationMs, cfg.cmdSpawnMs, cfg.cmdSpeed, cfg.obstacleSpawnMs, cfg.obstacleSpeed, cfg.targetCoins, coins]);

  const progressPct = Math.round((timeMs / cfg.durationMs) * 100);
  const won = status === "won" ? true : status === "lost" ? false : null;

  const laneW = 58;
  const fieldW = cfg.lanes * laneW;
  const fieldH = 640;
  const scale = useMemo(() => {
    if (!playAreaSize.w || !playAreaSize.h) return 1;
    return clamp(Math.min(playAreaSize.w / fieldW, playAreaSize.h / fieldH), 0.65, 1.35);
  }, [playAreaSize.w, playAreaSize.h, fieldW]);
  const scaledW = Math.round(fieldW * scale);
  const scaledH = Math.round(fieldH * scale);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        background:
          "radial-gradient(1200px 700px at 50% -10%, rgba(99,102,241,0.18), transparent 60%), linear-gradient(180deg, rgba(2,6,23,0.96), rgba(2,6,23,0.92))",
        color: "rgba(255,255,255,0.92)",
        paddingTop: "max(env(safe-area-inset-top), 10px)",
        paddingBottom: "max(env(safe-area-inset-bottom), 10px)",
        overflow: "hidden",
        WebkitTapHighlightColor: "transparent",
        touchAction: "manipulation",
        userSelect: "none",
      }}
    >
      {/* HUD */}
      <div style={{ display: "flex", gap: 10, padding: "10px 12px", alignItems: "center", flexWrap: "wrap" }}>
        <Badge variant="secondary">⏱️ {Math.max(0, Math.ceil((cfg.durationMs - timeMs) / 1000))}s</Badge>
        <Badge variant="secondary">
          🪙 {coins}
          {cfg.targetCoins ? `/${cfg.targetCoins}` : ""}
        </Badge>
        <Badge variant="secondary">💥 {errors}</Badge>
        <Badge variant="secondary">📦 {stack.length}/{cfg.maxStack}</Badge>
        <div style={{ flex: 1 }} />
        {isDesktop ? (
          <div style={{ opacity: 0.7, fontSize: 12, whiteSpace: "nowrap" }}>
            ←/→ move · A/D/S push · SPACE execute · ESC clear
          </div>
        ) : null}
      </div>

      {/* Time bar */}
      <div style={{ padding: "0 12px 10px 12px" }}>
        <div style={{ height: 6, borderRadius: 999, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${clamp(progressPct, 0, 100)}%`, background: "rgba(99,102,241,0.85)" }} />
        </div>
      </div>

      {/* Play area (scales to avoid overlap) */}
      <div
        ref={playAreaRef}
        style={{ flex: 1, padding: "0 12px", display: "flex", alignItems: "center", justifyContent: "center" }}
      >
        <div style={{ width: scaledW, height: scaledH, position: "relative" }}>
          <div
            style={{
              width: fieldW,
              height: fieldH,
              transform: shake ? `scale(${scale}) translateX(-2px)` : `scale(${scale})`,
              transformOrigin: "top left",
              transition: "transform 120ms ease",
              borderRadius: 22,
              position: "relative",
              background: "rgba(2,6,23,0.28)",
              border: "1px solid rgba(148,163,184,0.18)",
              boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.02)",
              overflow: "hidden",
            }}
          >
            {/* lane guides */}
            {Array.from({ length: cfg.lanes }).map((_, i) => (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: i * laneW,
                  top: 0,
                  bottom: 0,
                  width: laneW,
                  borderRight: i === cfg.lanes - 1 ? "none" : "1px solid rgba(255,255,255,0.04)",
                }}
              />
            ))}

            {/* falling commands (tap to push) */}
            {cmds.map((c) => (
              <button
                key={c.id}
                onClick={() => pushCmd(c)}
                onMouseEnter={isDesktop ? () => setHoverCmdId(c.id) : undefined}
                onMouseLeave={isDesktop ? () => setHoverCmdId(null) : undefined}
                style={{
                  position: "absolute",
                  left: (fieldW - 120) / 2,
                  top: c.y,
                  width: 120,
                  height: 44,
                  borderRadius: 16,
                  border: c.isFake ? "1px solid rgba(244,63,94,0.65)" : "1px solid rgba(99,102,241,0.55)",
                  background: c.isFake ? "rgba(244,63,94,0.10)" : "rgba(99,102,241,0.12)",
                  color: "rgba(255,255,255,0.95)",
                  fontWeight: 900,
                  fontSize: 18,
                  letterSpacing: 0.3,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow:
                    hoverCmdId === c.id
                      ? "0 14px 34px rgba(0,0,0,0.35), 0 0 0 2px rgba(255,255,255,0.06)"
                      : "0 10px 24px rgba(0,0,0,0.25)",
                  WebkitTapHighlightColor: "transparent",
                  transform: hoverCmdId === c.id ? "translateY(-2px) scale(1.04)" : "none",
                  transition: "transform 90ms ease, box-shadow 90ms ease",
                  cursor: "pointer",
                }}
                aria-label="push command"
              >
                {cmdLabel(c.type)}
                {c.isFake ? <span style={{ marginLeft: 8, fontSize: 12, opacity: 0.9 }}>TRAP</span> : null}
              </button>
            ))}

            {/* obstacles & coins */}
            {things.map((t) => (
              <div
                key={t.id}
                style={{
                  position: "absolute",
                  left: t.lane * laneW + (laneW - 34) / 2,
                  top: t.y,
                  width: 34,
                  height: 34,
                  borderRadius: t.kind === "COIN" ? 999 : 12,
                  background: t.kind === "COIN" ? "rgba(250,204,21,0.18)" : "rgba(148,163,184,0.10)",
                  border: t.kind === "COIN" ? "1px solid rgba(250,204,21,0.55)" : "1px solid rgba(148,163,184,0.40)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 18,
                  userSelect: "none",
                }}
              >
                {t.kind === "COIN" ? "🪙" : "⬛"}
              </div>
            ))}

            {/* player */}
            <div
              style={{
                position: "absolute",
                left: lane * laneW + (laneW - 42) / 2,
                top: 520,
                width: 42,
                height: 42,
                borderRadius: 16,
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(99,102,241,0.35)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 22,
                transition: "left 140ms cubic-bezier(.2,.8,.2,1)",
                boxShadow: "0 12px 26px rgba(0,0,0,0.28)",
              }}
            >
              🤖
            </div>
          </div>
        </div>
      </div>

      {/* Bottom controls + stack tray (never overlaps playfield) */}
      <div style={{ padding: "10px 12px 12px 12px", display: "grid", gap: 10 }}>
        <div
          style={{
            display: "flex",
            gap: 8,
            overflowX: "auto",
            paddingBottom: 2,
            WebkitOverflowScrolling: "touch",
          }}
          aria-label="stack tray"
        >
          {Array.from({ length: cfg.maxStack }).map((_, idx) => {
            const v = stack[idx];
            const filled = idx < stack.length;
            return (
              <div
                key={idx}
                style={{
                  minWidth: 44,
                  height: 34,
                  borderRadius: 14,
                  border: "1px solid rgba(148,163,184,0.18)",
                  background: filled ? "rgba(99,102,241,0.14)" : "rgba(15,23,42,0.14)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 900,
                  color: "rgba(255,255,255,0.92)",
                  opacity: filled ? 1 : 0.45,
                }}
              >
                {filled ? cmdLabel(v) : ""}
              </div>
            );
          })}
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <Button variant="ghost" onClick={clearStack} disabled={status !== "playing" || executing} style={{ flex: 1, minHeight: 48 }}>
            Clear
          </Button>
          <Button
            variant={executing ? "ghost" : "primary"}
            disabled={status !== "playing"}
            onClick={executeStack}
            style={{ flex: 2, minHeight: 48 }}
          >
            {executing ? "Executing…" : "EXECUTE"}
          </Button>
        </div>

        {typeof won === "boolean" ? (
          <div style={{ display: "grid", gap: 10 }}>
            <Button variant="primary" onClick={resetAll} style={{ minHeight: 48 }}>
              Play again
            </Button>
            <ResultSubmitPanel
              category="STACK_DROP"
              difficulty={difficulty}
              timeMs={timeMs}
              errors={errors}
              won={won}
              challengeId={challenge?.challengeInstanceId}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
