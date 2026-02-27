import { SESSION_STATUS, UI_STRINGS } from "../lib/constants";
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../components/AppShell";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import QRCode from "react-qr-code";
import ConfirmModal from "../components/ConfirmModal";
import { useToast } from "../components/ui/use-toast";
import { toastError, toastInfo } from "../lib/toast-helpers";
import { useDiceOverlay } from "../components/dice/DiceOverlayProvider";
import D20Die from "../components/D20Die";
import { getSession, clearSession, setSessionStarted } from "../lib/session";
import { getPlayer, fetchLobby, setReady, leaveSession, clearPlayer, rollLobbyD20 } from "../lib/player";
import { useGameSocket } from "../lib/useGameSocket";
import { cn } from "../lib/utils";

import { playUiTap } from "../lib/diceSound";

export default function Lobby() {
  const nav = useNavigate();
  const session = useMemo(() => getSession(), []);
  const me = useMemo(() => getPlayer(), []);
  const diceOverlay = useDiceOverlay();
  const { toast } = useToast();

  const [state, setState] = useState(null);
  const [busy, setBusy] = useState(false);
  const [rolling, setRolling] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [confirmLeaveOpen, setConfirmLeaveOpen] = useState(false);

  const canView = !!(session?.sessionId && me?.playerId);
  const joinUrl = session?.sessionCode ? `${window.location.origin}/join/${session.sessionCode}` : "";

  const load = React.useCallback(async () => {
    if (!session?.sessionId) return;
    try {
      const s = await fetchLobby(session.sessionId);
      setState(s);
      setSessionStarted(!!s?.started);
      if (s?.sessionStatus === SESSION_STATUS.FINISHED) { nav("/end", { replace: true }); return; }
      if (s?.started) nav("/play");
    } catch (e) { toastError(toast, e, UI_STRINGS.LOBBY_LOAD_FAILED); }
  }, [session?.sessionId, nav, toast]);

  useEffect(() => { if (canView) load(); }, [canView, load]);
  const socketStatus = useGameSocket(session?.sessionId, load);

  async function toggleReady() {
    if (!session?.sessionId || !me?.playerId) return;
    const currentlyReady = !!state?.players?.find(p => p.id === me.playerId)?.ready;
    setBusy(true);
    try { await setReady(session.sessionId, me.playerId, !currentlyReady); await load(); }
    catch (e) { toastError(toast, e, UI_STRINGS.SET_READY_FAILED); }
    finally { setBusy(false); }
  }

  async function doLobbyRoll() {
    if (!session?.sessionId || !me?.playerId) return;
    setRolling(true); setBusy(true);
    try {
      await diceOverlay.rollD20(() => rollLobbyD20(session.sessionId, me.playerId));
      await load();
    } catch (e) { toastError(toast, e, UI_STRINGS.ROLL_FAILED); await load(); }
    finally { setTimeout(() => setRolling(false), 980); setBusy(false); }
  }

  async function performLeaveGame() {
    if (session?.sessionId && me?.playerId) {
      try { await leaveSession(session.sessionId, me.playerId); } catch {}
    }
    clearPlayer();
    clearSession();
    nav("/");
  }

  const players = (state?.players || []).slice().sort((a, b) => (a.turnOrder || 0) - (b.turnOrder || 0));
  const meRow = players.find(p => p.id === me.playerId);
  const canRoll = !state?.started && !state?.turnOrderLocked && !!meRow && (meRow.lobbyRoll == null || meRow.tied);
  const canReady = !!meRow && !state?.started && (meRow.lobbyRoll != null) && !meRow.tied;

  if (!canView) return null;

  return (
    <AppShell
      title="Lobby"
      subtitle={state?.turnOrderLocked ? "SEQUENCE ESTABLISHED" : "ROLL FOR MISSION ORDER"}
      showTabs activeTab="play" backTo={false}
      socketStatus={socketStatus}
      headerBadges={<Badge variant="secondary" className="px-2 py-0 text-[10px] font-black tracking-tight uppercase">#{session?.sessionCode}</Badge>}
      rightPanel={
        <Card className="border-indigo-500/20 bg-indigo-500/5">
          <CardContent className="space-y-s4 p-s4">
            <div className="space-y-1">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400">Join Uplink</div>
              <div className="text-fs3 font-black text-white">Let others join</div>
            </div>
            <div className="space-y-s3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
                <div className="font-mono text-xl font-black text-indigo-300 tracking-widest">{session.sessionCode}</div>
                <Button variant="secondary" size="sm" onClick={() => setQrOpen(true)}>SHOW QR</Button>
              </div>
              <p className="text-[11px] text-muted leading-relaxed opacity-70 italic font-medium">Tip: Use a modern mobile browser for the best mission experience.</p>
            </div>
          </CardContent>
        </Card>
      }
      actions={
        <div className="grid grid-cols-2 gap-3 w-full max-w-md mx-auto">
          <Button variant="secondary" onClick={() => { playUiTap(); setQrOpen(true); }} className="h-12 rounded-xl font-black uppercase tracking-widest">QR Code</Button>
          <Button variant="primary" onClick={() => { playUiTap(); toggleReady(); }} disabled={busy || (!meRow?.ready && !canReady)} className="h-12 rounded-xl font-black uppercase tracking-widest">
            {meRow?.ready ? "Stand Down" : "Init Ready"}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-s4 w-full max-w-md mx-auto">
        {/* Roll Area */}
        <Card className={cn("overflow-hidden transition-all duration-500 border-2 shrink-0", canRoll ? "border-indigo-500 shadow-[0_0_30px_rgba(99,102,241,0.2)]" : "border-white/5")}>
          <CardContent className="p-0">
            <div className={cn("p-6 flex items-center justify-between gap-6", canRoll ? "bg-indigo-500/10" : "bg-white/5")}>
              <div className="space-y-1 flex-1">
                <div className={cn("text-[10px] font-black uppercase tracking-[0.2em]", canRoll ? "text-indigo-400" : "text-muted")}>
                  {state?.turnOrderLocked ? "Sequence Logged" : "Phase 1: Roll D20"}
                </div>
                <div className="text-2xl font-black tracking-tight text-white leading-none">
                  {canRoll ? (meRow?.tied ? "Tie Detected!" : "Your Turn") : (meRow?.lobbyRoll != null ? "Roll Secured" : "Wait...")}
                </div>
                <div className="text-[11px] font-medium text-muted/60 mt-1 uppercase tracking-tighter">
                  {canRoll ? (meRow?.tied ? "SECONDARY ROLL REQUIRED" : "TAP THE DIE TO BEGIN") : "POSITIONAL DATA SYNCED"}
                </div>
              </div>
              
              <div className="w-[110px] flex-none">
                <D20Die value={meRow?.tied ? "TIE" : (meRow?.lobbyRoll ?? "?")} rolling={rolling} disabled={!canRoll || busy} onClick={doLobbyRoll} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Player List */}
        <Card className="overflow-hidden border-white/5 bg-transparent shrink-0">
          <CardContent className="p-0 space-y-s2">
            <div className="p-4 border-b border-white/5 bg-white/5 flex items-center justify-between">
              <div className="text-[10px] font-black uppercase tracking-widest text-muted">Active Manifest</div>
              {players.every(p => p.ready) && players.length > 0 && <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[9px] font-black uppercase">All Clear</Badge>}
            </div>
            
            <div className="divide-y divide-white/5 max-h-[40vh] overflow-y-auto custom-scrollbar px-1">
              {players.map((p) => (
                <div key={p.id} className={cn("px-4 py-4 flex items-center justify-between transition-colors rounded-lg my-1", p.id === me.playerId && "bg-white/[0.03]")}>
                  <div className="flex items-center gap-4">
                    <div className={cn("w-10 h-10 rounded-full flex items-center justify-center text-2xl border transition-all duration-500", p.ready ? "border-emerald-500/40 bg-emerald-500/10 shadow-[0_0_15px_rgba(16,185,129,0.2)]" : "border-white/5 bg-white/5")}>
                      {p.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-black truncate flex items-center gap-2 text-white">
                        {p.name} {p.id === me.playerId && <Badge variant="outline" className="text-[8px] px-1 py-0 border-indigo-500/30 text-indigo-400 bg-indigo-500/5">YOU</Badge>}
                      </div>
                      <div className="text-[10px] font-bold text-muted/60 uppercase tracking-tight">
                        {p.lobbyRoll != null ? `Sequence Roll: ${p.lobbyRoll}` : "Establishing Uplink..."}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {p.tied && <Badge variant="secondary" className="bg-rose-500/20 text-rose-300 border-rose-500/30 text-[9px] font-black">TIE</Badge>}
                    <div className={cn("text-[10px] font-black px-3 py-1 rounded-full border transition-all duration-500", p.ready ? "border-emerald-500/40 text-emerald-400 bg-emerald-500/5" : "border-white/10 text-muted/40")}>
                      {p.ready ? "READY" : "WAITING"}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 flex items-center justify-between gap-4 border-t border-white/5">
              <Button variant="ghost" size="sm" onClick={() => setConfirmLeaveOpen(true)} className="text-[10px] font-black text-muted uppercase tracking-widest hover:text-rose-400 transition-colors">Abandon</Button>
              <div className="text-[9px] font-bold text-muted/30 text-right uppercase tracking-tighter max-w-[160px] leading-tight">Match launches automatically once all users confirm readiness</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {qrOpen && (
        <div className="fixed inset-0 z-[240] flex items-center justify-center bg-black/80 backdrop-blur-md p-s4" onClick={() => setQrOpen(false)}>
          <Card className="w-full max-w-sm rounded-3xl shadow-2xl animate-in zoom-in-95 duration-300 border-indigo-500/20 overflow-hidden bg-bg0" onClick={e => e.stopPropagation()}>
            <div className="p-6 bg-indigo-500/10 border-b border-white/5 text-center relative">
              <button onClick={() => setQrOpen(false)} className="absolute right-4 top-4 text-muted/40 hover:text-white transition-colors font-bold">✕</button>
              <div className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-1">Access Credentials</div>
              <div className="text-2xl font-black text-white uppercase">Initialize Join</div>
            </div>
            <CardContent className="p-8 flex flex-col items-center gap-6">
              <div className="w-full aspect-square bg-white rounded-2xl p-6 shadow-inner flex items-center justify-center">
                <QRCode value={joinUrl} size={256} style={{ height: "auto", maxWidth: "100%", width: "100%" }} />
              </div>
              <div className="text-center space-y-1">
                <div className="text-2xl font-black text-white tracking-tighter">#{session.sessionCode}</div>
                <div className="text-[10px] font-medium text-muted break-all opacity-60 px-4 leading-tight">{joinUrl}</div>
              </div>
              <Button variant="primary" onClick={() => setQrOpen(false)} className="w-full h-14 rounded-2xl font-black text-lg shadow-xl uppercase tracking-widest">Completed</Button>
            </CardContent>
          </Card>
        </div>
      )}

      <ConfirmModal open={confirmLeaveOpen} title="ABANDON SEQUENCE?" message="You will be disconnected from the active mission uplink. Your positional data will be reset." confirmText="LEAVE" cancelText="STAY" danger onConfirm={() => { setConfirmLeaveOpen(false); performLeaveGame(); }} onClose={() => setConfirmLeaveOpen(false)} />
    </AppShell>
  );
}