import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { cn } from "../lib/utils";
import { computePoints, formatTime, normalizeDifficulty } from "../lib/scoring";
import { getSession } from "../lib/session";
import { getPlayer } from "../lib/player";
import { API_BASE } from "../lib/api";
import { getHapticsEnabled, getSoundEnabled, playFailSfx, playWinSfx } from "../lib/diceSound";

async function parseJsonOrThrow(res) {
  let data = null;
  try { data = await res.json(); } catch {}
  if (!res.ok) {
    const msg = data?.error || data?.message || `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data;
}

export default function ResultSubmitPanel({
  category,
  difficulty,
  timeMs,
  errors,
  won,
  challengeId,
  explanation,
}) {
  if (typeof won !== "boolean") return null;

  const nav = useNavigate();
  const session = useMemo(() => getSession(), []);
  const player = useMemo(() => getPlayer(), []);
  const diffNorm = normalizeDifficulty(difficulty);
  const points = computePoints({ difficulty: diffNorm, timeMs, errors, won });

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState(null);
  const submittedRef = useRef(false);

  async function submitOnce() {
    if (submittedRef.current) return;
    submittedRef.current = true;
    if (!player?.playerId || !session?.sessionId || !challengeId) {
      setErr("Session context missing. Could not synchronize score.");
      return;
    }

    try { if (getHapticsEnabled() && navigator.vibrate) navigator.vibrate(won ? 30 : [20, 50, 20]); } catch {}
    try { if (getSoundEnabled()) (won ? playWinSfx : playFailSfx)(); } catch {}

    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/scores`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: session.sessionId, sessionCode: session.sessionCode || "",
          playerId: player.playerId, challengeId, category,
          difficulty: diffNorm, points, timeMs, errors,
        }),
      });
      await parseJsonOrThrow(res);
      setSaved(true);
    } catch (e) {
      setErr(e?.message || "Cloud sync failed.");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => { if (!saved && !saving) submitOnce(); }, [won]);

  const theme = won ? {
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    glow: "shadow-[0_0_40px_rgba(16,185,129,0.2)]",
    icon: "🎉",
    label: "Mission Clear"
  } : {
    color: "text-rose-400",
    bg: "bg-rose-500/10",
    border: "border-rose-500/20",
    glow: "shadow-[0_0_40px_rgba(244,63,94,0.2)]",
    icon: "💥",
    label: "Mission Failed"
  };

  return (
    <Dialog open={true}>
      <DialogContent
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        className={cn("w-[min(94vw,480px)] p-0 overflow-hidden border-border bg-bg0", theme.glow)}
      >
        <div className={cn("p-8 text-center space-y-4", theme.bg)}>
          <div className="text-6xl animate-bounce drop-shadow-lg">{theme.icon}</div>
          <div>
            <div className={cn("text-[10px] font-black uppercase tracking-[0.3em] mb-1 opacity-80", theme.color)}>{theme.label}</div>
            <DialogTitle className="text-3xl font-black tracking-tight text-white">{won ? "Victory!" : "Defeat"}</DialogTitle>
          </div>
          <DialogDescription className="text-sm font-medium text-text/60 leading-relaxed max-w-[280px] mx-auto">
            {explanation || (won ? "Objective completed with high efficiency." : "System synchronization error detected.")}
          </DialogDescription>
        </div>

        <div className="p-6 space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            <StatItem label="Category" value={category.replace("_", " ")} />
            <StatItem label="Time" value={formatTime(timeMs)} />
            <StatItem label="Strikes" value={errors || 0} />
            <StatItem label="Efficiency" value={diffNorm} />
          </div>

          {/* Points Banner */}
          <div className="relative overflow-hidden rounded-2xl bg-indigo-500/10 border border-indigo-500/20 p-4 flex items-center justify-between group">
            <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500" />
            <div>
              <div className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Points Gained</div>
              <div className="text-2xl font-black text-white group-hover:scale-110 transition-transform duration-500">+{points}</div>
            </div>
            <div className="text-3xl opacity-20 group-hover:opacity-40 transition-opacity">🏆</div>
          </div>

          {/* Status / Errors */}
          {err && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-[11px] font-bold text-rose-400 text-center animate-in shake-1">
              ⚠️ {err}
            </div>
          )}

          {/* Footer Actions */}
          <div className="space-y-3">
            <Button
              variant="primary"
              onClick={() => nav("/play", { replace: true, state: { turnSummary: { saved: Boolean(saved), error: err || null } } })}
              disabled={saving || !saved}
              className="w-full h-14 rounded-2xl font-black text-lg shadow-xl active:scale-95 transition-all"
            >
              {saving ? "SYNCING..." : "RETURN TO BOARD"}
            </Button>
            
            {err && (
              <button 
                onClick={() => { submittedRef.current = false; submitOnce(); }}
                disabled={saving}
                className="w-full text-[10px] font-black text-muted uppercase tracking-widest hover:text-white transition-colors"
              >
                Retry Cloud Sync
              </button>
            )}
            
            {!saved && !err && (
              <div className="text-[9px] text-muted/40 text-center font-bold uppercase tracking-tighter">
                Establishing secure uplink to game server...
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StatItem({ label, value }) {
  return (
    <div className="bg-white/5 border border-white/5 rounded-xl p-3">
      <div className="text-[9px] font-black text-muted uppercase tracking-wider mb-0.5">{label}</div>
      <div className="text-sm font-bold text-text/90 truncate capitalize">{value}</div>
    </div>
  );
}