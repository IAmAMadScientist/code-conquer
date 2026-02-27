import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../components/AppShell";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { useToast } from "../components/ui/use-toast";
import { getSession, clearSession } from "../lib/session";
import { clearPlayer, fetchLobby } from "../lib/player";
import { API_BASE } from "../lib/api";
import { cn } from "../lib/utils";

export default function Endscreen() {
  const nav = useNavigate();
  const { toast } = useToast();
  const session = useMemo(() => getSession(), []);

  const [state, setState] = useState(null);
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState(null);

  useEffect(() => {
    if (err) toast({ title: "MISSION ERROR", description: err, variant: "destructive" });
  }, [err, toast]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!session?.sessionId) return;
      setErr(null);
      try {
        const s = await fetchLobby(session.sessionId);
        if (cancelled) return;
        setState(s);
        const qs = new URLSearchParams();
        qs.set("sessionId", session.sessionId);
        const res = await fetch(`${API_BASE}/leaderboard?${qs.toString()}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
        if (!cancelled) setRows(Array.isArray(data) ? data : []);
      } catch (e) {
        if (!cancelled) setErr(e?.message || "DEBRIEFING LOAD FAILED");
      }
    }
    load();
    return () => { cancelled = true; };
  }, [session?.sessionId]);

  function leaveToMenu() {
    clearPlayer(); clearSession(); nav("/");
  }

  const winner = (state?.players || []).find((p) => p.id === state?.winnerPlayerId);

  return (
    <AppShell title="Mission Complete" showBrand activeTab="leaderboard" backTo={false}>
      <div className="w-full max-w-md mx-auto space-y-s4 pb-8 animate-in fade-in duration-700">
        
        {/* Victory Header */}
        <div className="text-center space-y-2 py-4">
          <div className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em]">Sequence Terminated</div>
          <div className="text-3xl font-black text-white tracking-tight uppercase">Final Debriefing</div>
        </div>

        {/* Winner Hero */}
        <Card className="border-amber-500/30 bg-amber-500/5 shadow-[0_0_40px_rgba(245,158,11,0.15)] relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10 text-6xl rotate-12">🏆</div>
          <CardContent className="p-8 text-center space-y-4">
            <div className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Mission MVP</div>
            <div className="flex flex-col items-center gap-3">
              <div className="w-24 h-24 rounded-full bg-amber-500/20 border-2 border-amber-500/40 flex items-center justify-center text-5xl shadow-inner animate-bounce">
                {winner?.icon || "👑"}
              </div>
              <div className="space-y-1">
                <div className="text-3xl font-black text-white uppercase tracking-tight">
                  {winner ? winner.name : "SEQUENCE ABORTED"}
                </div>
                <div className="text-[11px] font-bold text-amber-500/60 uppercase">Dominance established in grid</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Final Standings */}
        <Card className="border-white/5 bg-transparent">
          <CardContent className="p-0">
            <div className="p-4 border-b border-white/5 bg-white/5 flex items-center justify-between">
              <div className="text-[10px] font-black uppercase tracking-widest text-muted">Final Manifest</div>
              <Badge variant="secondary" className="px-2 py-0 text-[10px] font-black uppercase tracking-tight">Node #{session?.sessionCode}</Badge>
            </div>
            
            <div className="divide-y divide-white/5">
              {rows.map((r, idx) => (
                <div key={r.playerId || idx} className={cn("px-4 py-4 flex items-center justify-between transition-colors", idx === 0 && "bg-amber-500/[0.03]")}>
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-xl border", idx === 0 ? "border-amber-500/40 bg-amber-500/10" : "border-white/5 bg-white/5")}>
                        {r.icon || "🙂"}
                      </div>
                      <div className={cn("absolute -top-1.5 -left-1.5 w-5 h-5 rounded flex items-center justify-center text-[9px] font-black border shadow-md", idx === 0 ? "bg-amber-500 border-amber-400 text-bg0" : "bg-bg2 border-border text-muted")}>
                        {idx + 1}
                      </div>
                    </div>
                    <div className="min-w-0 text-left">
                      <div className="text-sm font-black text-white truncate">{r.playerName}</div>
                      <div className="text-[9px] font-bold text-muted/60 uppercase tracking-tighter">Mission Efficiency Data</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={cn("text-base font-black tracking-tight", idx === 0 ? "text-amber-400" : "text-white")}>{r.totalScore ?? 0}</div>
                    <div className="text-[8px] font-bold text-muted/40 uppercase tracking-widest">PTS</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Final Actions */}
        <div className="grid gap-3 pt-4">
          <Button variant="primary" onClick={leaveToMenu} className="h-14 rounded-2xl font-black text-lg shadow-xl uppercase tracking-widest transition-all active:scale-95">
            Return to Command Center
          </Button>
          <Button variant="secondary" onClick={() => nav("/leaderboard")} className="h-12 rounded-xl font-black text-xs uppercase tracking-widest border-white/5">
            View Global Archive
          </Button>
        </div>

        <div className="text-center pt-4 opacity-20">
          <div className="text-[9px] font-black uppercase tracking-[0.3em]">End of Transmission</div>
        </div>
      </div>
    </AppShell>
  );
}