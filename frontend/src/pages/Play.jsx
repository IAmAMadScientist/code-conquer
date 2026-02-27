import { TURN_STATUS, SESSION_STATUS, SPECIAL_CARD, FIELD_TYPE, UI_STRINGS } from "../lib/constants";
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../components/AppShell";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Card, CardContent } from "../components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { useToast } from "../components/ui/use-toast";
import { toastError, toastInfo } from "../lib/toast-helpers";
import { getSession, setSessionStarted } from "../lib/session";
import { getPlayer, fetchLobby, leaveSession, clearPlayer, rollTurnD6, chooseTurnPath, startTurnChallenge, applySpecialCard } from "../lib/player";
import D6Die from "../components/D6Die";
import EventFeed from "../components/EventFeed";
import ConfirmModal from "../components/ConfirmModal";
import MapModal from "../components/MapModal";
import SpecialCardDialog from "../components/SpecialCardDialog";
import { useGameSocket } from "../lib/useGameSocket";
import { cn } from "../lib/utils";
import { playUiTap } from "../lib/diceSound";

export default function Play() {
  const nav = useNavigate();
  const { toast } = useToast();
  const session = useMemo(() => getSession(), []);
  const me = useMemo(() => getPlayer(), []);

  const [state, setState] = useState(null);
  const [pendingChoices, setPendingChoices] = useState(null);
  const [pathDialogOpen, setPathDialogOpen] = useState(false);
  const [specialOpen, setSpecialOpen] = useState(false);
  const [specialCard, setSpecialCard] = useState(SPECIAL_CARD.BOOST);
  const [specialTarget, setSpecialTarget] = useState("");
  const [boostOptions, setBoostOptions] = useState([]);
  const [boostTo, setBoostTo] = useState("");
  const [specialSubmitting, setSpecialSubmitting] = useState(false);
  const [confirmLeaveOpen, setConfirmLeaveOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);

  const canView = !!(session?.sessionId && me?.playerId);

  useEffect(() => { setBoostOptions([]); setBoostTo(""); }, [specialCard]);

  const load = React.useCallback(async () => {
    if (!session?.sessionId) return;
    try {
      const s = await fetchLobby(session.sessionId);
      setState(s);
      setSessionStarted(!!s?.started);
      if (s?.sessionStatus === SESSION_STATUS.FINISHED) { nav("/end", { replace: true }); return; }
      if (s?.turnStatus !== TURN_STATUS.AWAITING_PATH_CHOICE) setPendingChoices(null);
      if (s?.currentPlayerId === me.playerId && s?.turnStatus === TURN_STATUS.AWAITING_PATH_CHOICE && s?.pendingForkNodeId) {
        setPendingChoices(prev => ({ ...prev, forkNodeId: s.pendingForkNodeId, remainingSteps: s.pendingRemainingSteps, options: s.pendingForkOptions || [] }));
      }
    } catch (e) { toastError(toast, e, "Failed to load game state"); }
  }, [session?.sessionId, me?.playerId, nav, toast]);

  useEffect(() => { if (canView) load(); }, [canView, load]);
  useGameSocket(session?.sessionId, load);

  useEffect(() => {
    const awaiting = state?.turnStatus === TURN_STATUS.AWAITING_SPECIAL_CARD;
    const amCurrent = state?.currentPlayerId === me.playerId;
    setSpecialOpen(awaiting && amCurrent);
  }, [state?.turnStatus, state?.currentPlayerId, me.playerId]);

  async function doStartChallenge() {
    try {
      const ch = await startTurnChallenge(session.sessionId, me.playerId);
      nav(ch.route, { state: { challenge: ch } });
    } catch (e) { toastError(toast, e, "Failed to start challenge"); }
  }

  async function doRollD6() {
    try {
      const r = await rollTurnD6(session.sessionId, me.playerId);
      if (r?.turnStatus === TURN_STATUS.AWAITING_PATH_CHOICE) setPendingChoices({ forkNodeId: r.forkNodeId, remainingSteps: r.remainingSteps, options: r.options || [], diceRoll: r.diceRoll });
      load(); return r;
    } catch (e) { toastError(toast, e, "Roll failed"); throw e; }
  }

  async function doChoosePath(toNodeId) {
    try {
      const r = await chooseTurnPath(session.sessionId, me.playerId, toNodeId);
      if (r?.turnStatus === TURN_STATUS.AWAITING_PATH_CHOICE) setPendingChoices({ forkNodeId: r.forkNodeId, remainingSteps: r.remainingSteps, options: r.options || [] });
      else setPendingChoices(null);
      load();
    } catch (e) { toastError(toast, e, "Choice failed"); }
  }

  async function doApplySpecial() {
    if (specialSubmitting) return;
    setSpecialSubmitting(true);
    try {
      if (specialCard === SPECIAL_CARD.BOOST && boostOptions.length > 0 && !boostTo) {
        toastInfo(toast, "Choice required", "Pick a path for the boost.");
        setSpecialSubmitting(false); return;
      }
      const r = await applySpecialCard(session.sessionId, me.playerId, specialCard, specialTarget || undefined, specialCard === SPECIAL_CARD.BOOST ? (boostTo || undefined) : undefined);
      if (r?.needChoice) { setBoostOptions(r.options || []); setBoostTo(""); toastInfo(toast, "Choose a path", UI_STRINGS.BOOST_FORK); setSpecialSubmitting(false); return; }
      setSpecialOpen(false); setSpecialSubmitting(false); load();
    } catch (e) { setSpecialSubmitting(false); toastError(toast, e, "Special card failed"); }
  }

  async function performLeaveGame() {
    if (session?.sessionId && me?.playerId) { try { await leaveSession(session.sessionId, me.playerId); } catch {} }
    clearPlayer(); clearPlayer(); nav("/");
  }

  if (!canView) return <AppShell title="Play" showTabs activeTab="play" backTo={false} showBrand><div className="p-s4 text-center"><Badge variant="outline" className="mb-4">OFFLINE</Badge><div className="text-xl font-black uppercase">Mission Sequencer Unavailable</div><p className="text-sm text-muted mt-2">Establish an uplink by joining a match.</p></div></AppShell>;

  const players = (state?.players || []).slice().sort((a, b) => a.turnOrder - b.turnOrder);
  const currentPlayer = players.find(p => p.id === state?.currentPlayerId);
  const meState = players.find(p => p.id === me?.playerId);
  const isMyTurn = state?.started && state?.currentPlayerId === me.playerId;
  const waitingForDice = state?.turnStatus === TURN_STATUS.AWAITING_D6_ROLL;
  const waitingForPath = state?.turnStatus === TURN_STATUS.AWAITING_PATH_CHOICE;
  const canStartChallenge = isMyTurn && state?.turnStatus === TURN_STATUS.IDLE;
  const hasChallengeOnField = [FIELD_TYPE.EASY, FIELD_TYPE.MEDIUM, FIELD_TYPE.HARD, FIELD_TYPE.FORK].includes(meState?.positionType);

  const turnLabel = state?.started ? (isMyTurn ? "YOUR TURN" : (currentPlayer ? `${currentPlayer.name.toUpperCase()}'S TURN` : "SYNCING...")) : "WAITING";

  const primaryAction = isMyTurn ? (
    state?.turnStatus === TURN_STATUS.AWAITING_SPECIAL_CARD ? { label: "Pick card", onClick: () => setSpecialOpen(true) } :
    waitingForDice ? { label: "Roll", onClick: doRollD6 } :
    waitingForPath ? { label: "Choose path", onClick: () => setPathDialogOpen(true) } :
    (canStartChallenge && hasChallengeOnField) ? { label: "Start challenge", onClick: doStartChallenge } : null
  ) : null;

  return (
    <AppShell
      title="Play" showTabs activeTab="play" backTo={false} showBrand
      headerBadges={<Badge variant={isMyTurn ? "secondary" : "outline"} className="px-2 py-0 text-[10px] font-black uppercase tracking-tight">{turnLabel}</Badge>}
      actions={
        <div className="grid grid-cols-3 gap-3 w-full max-w-md mx-auto">
          <Button variant="primary" onClick={() => { playUiTap(); primaryAction?.onClick(); }} disabled={!primaryAction} className="h-12 rounded-xl font-black uppercase tracking-widest">{primaryAction?.label || "WAIT TURN"}</Button>
          <Button variant="secondary" onClick={() => { playUiTap(); setMapOpen(true); }} className="h-12 rounded-xl font-black uppercase tracking-widest">MAP</Button>
          <Button variant="ghost" onClick={() => { playUiTap(); setConfirmLeaveOpen(true); }} className="h-12 rounded-xl font-bold text-[10px] text-muted tracking-widest uppercase">Leave</Button>
        </div>
      }
    >
      <div className="w-full max-w-md mx-auto space-y-4 pb-4">
        <Card className={cn("overflow-hidden transition-all duration-500", isMyTurn ? "border-indigo-500 shadow-xl" : "border-white/5 opacity-90")}>
          <CardContent className="p-6 text-center space-y-4">
            <div className="space-y-1">
              <div className={cn("text-[10px] font-black uppercase tracking-[0.2em]", isMyTurn ? "text-indigo-400" : "text-muted")}>{isMyTurn ? "Mission Control Active" : "Telemetry Receiving"}</div>
              <div className="text-2xl font-black tracking-tight text-white uppercase">{isMyTurn ? "Execute Move" : (currentPlayer ? currentPlayer.name : "Syncing...")}</div>
            </div>
            {waitingForDice && isMyTurn && <div className="py-2 animate-in zoom-in duration-500 flex flex-col items-center gap-2"><D6Die onRoll={doRollD6} /><div className="text-[10px] font-black text-indigo-300 uppercase tracking-widest animate-pulse">Touch die to roll</div></div>}
            {isMyTurn && waitingForPath && <div className="p-4 rounded-2xl bg-bg2/50 border border-indigo-500/20 space-y-3"><div className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">Select path</div><div className="flex flex-wrap gap-2 justify-center">{(pendingChoices?.options || []).map(opt => (<Button key={opt?.to || opt} variant="secondary" onClick={() => { playUiTap(); doChoosePath(opt?.to || opt); }} className="h-10 px-4 rounded-xl font-black uppercase text-xs">{opt?.label || "PATH"}</Button>))}</div></div>}
            {canStartChallenge && hasChallengeOnField && <div className="py-2"><Button variant="primary" size="lg" onClick={() => { playUiTap(); doStartChallenge(); }} className="h-14 px-8 rounded-xl font-black text-lg shadow-lg animate-bounce bg-indigo-600">🚀 START CHALLENGE</Button></div>}
            <div className="flex flex-wrap gap-2 justify-center"><Badge variant="outline" className="px-2 py-0 text-[10px] font-black border-white/10 text-muted/60 uppercase">{state?.turnStatus?.replace("_", " ") || "IDLE"}</Badge>{state?.lastDiceRoll && <Badge variant="secondary" className="px-2 py-0 text-[10px] font-black italic bg-indigo-500/20 border-indigo-500/30">D6: {state.lastDiceRoll}</Badge>}</div>
          </CardContent>
        </Card>
        <div className="px-1"><EventFeed sessionId={session?.sessionId} title="Mission Log" limit={4} /></div>
      </div>

      <Dialog open={pathDialogOpen} onOpenChange={setPathDialogOpen}>
        <DialogContent className="w-[min(94vw,400px)] border-indigo-500/20 bg-bg0 p-6">
          <DialogHeader><DialogTitle className="font-black uppercase text-center">Navigation Required</DialogTitle></DialogHeader>
          <div className="grid gap-3 pt-4">{(pendingChoices?.options || []).map(opt => (<Button key={opt?.to || opt} variant="primary" onClick={() => { playUiTap(); setPathDialogOpen(false); doChoosePath(opt?.to || opt); }} className="h-14 rounded-xl font-black uppercase">{opt?.label || "SELECT PATH"}</Button>))}</div>
        </DialogContent>
      </Dialog>

      <SpecialCardDialog 
        open={specialOpen} onOpenChange={setSpecialOpen} isMyTurn={isMyTurn}
        specialCard={specialCard} setSpecialCard={setSpecialCard} 
        specialTarget={specialTarget} setSpecialTarget={setSpecialTarget}
        specialSubmitting={specialSubmitting} onApply={doApplySpecial}
        players={state?.players || []} meId={me?.playerId}
      />

      <MapModal open={mapOpen} onClose={() => setMapOpen(false)} playerNodeId={meState?.positionNodeId} />

      <ConfirmModal open={confirmLeaveOpen} title="LEAVE GAME?" message="Abandon the mission sequence? Positional data will be reset." confirmText="LEAVE" cancelText="STAY" danger onConfirm={() => { playUiTap(); setConfirmLeaveOpen(false); performLeaveGame(); }} onClose={() => setConfirmLeaveOpen(false)} />
    </AppShell>
  );
}
