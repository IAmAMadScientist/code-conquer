import { TURN_STATUS, SESSION_STATUS, SPECIAL_CARD, FIELD_TYPE } from "../lib/constants";
import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import AppShell from "../components/AppShell";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Card, CardContent } from "../components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { useToast } from "../components/ui/use-toast";
import { toastError, toastInfo } from "../lib/toast-helpers";
import { getSession, clearSession, setSessionStarted } from "../lib/session";
import { getPlayer, fetchLobby, leaveSession, clearPlayer, rollTurnD6, chooseTurnPath, startTurnChallenge, applySpecialCard } from "../lib/player";
import D6Die from "../components/D6Die";
import EventFeed from "../components/EventFeed";
import PullToRefresh from "../components/PullToRefresh";
import ConfirmModal from "../components/ConfirmModal";
import mapImg from "../assets/map.png";
import nodeMapPositions from "../assets/nodeMapPositions.json";
// Sound toggle is global (AppShell header) and dice SFX timing is handled by the dice overlay.

export default function Play() {
  const nav = useNavigate();
  const { toast } = useToast();
  const session = useMemo(() => getSession(), []);
  const me = useMemo(() => getPlayer(), []);

  const [state, setState] = useState(null);
  
  const [pendingChoices, setPendingChoices] = useState(null);
  const [pathDialogOpen, setPathDialogOpen] = useState(false);

  // Standardize errors as toasts
  // Special deck modal (when landing on SPECIAL)
  const [specialOpen, setSpecialOpen] = useState(false);
  const [specialCard, setSpecialCard] = useState(SPECIAL_CARD.BOOST);
  const [specialTarget, setSpecialTarget] = useState("");
  const [boostOptions, setBoostOptions] = useState([]);
  const [boostTo, setBoostTo] = useState("");
  const [specialSubmitting, setSpecialSubmitting] = useState(false);

  const [confirmLeaveOpen, setConfirmLeaveOpen] = useState(false);

  const [mapOpen, setMapOpen] = useState(false);
  const canView = !!(session?.sessionId && me?.playerId);

  // Reset per-card sub-selections when switching card.
  useEffect(() => {
    setBoostOptions([]);
    setBoostTo("");
  }, [specialCard]);

  useEffect(() => {
    if (!mapOpen) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") setMapOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mapOpen]);

  async function load() {
    if (!session?.sessionId) return;
    try {
      const s = await fetchLobby(session.sessionId);
      setState(s);

      const amCurrent = !!(s?.currentPlayerId && me?.playerId && s.currentPlayerId === me.playerId);

      // Keep a lightweight shared flag so the bottom tab can switch between Lobby/Play.
      setSessionStarted(!!s?.started);

      // If the match is finished, go to endscreen.
      if (s?.sessionStatus === SESSION_STATUS.FINISHED) {
        nav("/end", { replace: true });
        return;
      }

      // If the session is no longer waiting for a path choice, clear any stale local UI.
      if (s?.turnStatus !== TURN_STATUS.AWAITING_PATH_CHOICE) {
        setPendingChoices(null);
      }

      // Sync pending fork choices on refresh/polling.
      if (amCurrent && s?.turnStatus === TURN_STATUS.AWAITING_PATH_CHOICE && s?.pendingForkNodeId) {
        const opts = Array.isArray(s?.pendingForkOptions) ? s.pendingForkOptions : null;
        setPendingChoices((prev) => {
          // Keep existing options if we already have them, otherwise take from lobby payload.
          if (prev && prev.forkNodeId === s.pendingForkNodeId) {
            if ((!prev.options || prev.options.length === 0) && opts && opts.length) {
              return { ...prev, remainingSteps: s.pendingRemainingSteps, options: opts };
            }
            return { ...prev, remainingSteps: s.pendingRemainingSteps };
          }
          return { forkNodeId: s.pendingForkNodeId, remainingSteps: s.pendingRemainingSteps, options: opts || [] };
        });
      } else {
        setPendingChoices(null);
      }

      // Options are now included in lobby payload (pendingForkOptions) so refresh is safe.

    } catch (e) {
      toastError(toast, e, "Failed to load game state");
    }
  }

  async function resync() {
    await load();
    toastInfo(toast, "Synced", "Game state refreshed.");
  }

  useEffect(() => {
    if (!canView) return;
    load();
    const t = setInterval(load, 1500);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);



  // Auto-open the Special deck modal when the backend requests it.
  useEffect(() => {
    const ts = String(state?.turnStatus || "");
    const awaiting = ts === TURN_STATUS.AWAITING_SPECIAL_CARD;
    const amCurrent = !!(state?.currentPlayerId && me?.playerId && state.currentPlayerId === me.playerId);

    // Only open when the backend is explicitly waiting for a Special card.
    // (Opening just because we *saw* a SPECIAL event can desync with the backend and cause a 423 Locked loop.)
    // Only the current player (who landed on SPECIAL) should see the selection modal.
    if (awaiting && amCurrent) {
      setSpecialOpen(true);
      return;
    }

    setSpecialOpen(false);
    setSpecialTarget("");
    setBoostOptions([]);
    setBoostTo("");
    setSpecialSubmitting(false);
  }, [state?.turnStatus, state?.currentPlayerId, state?.lastEventType, me?.playerId]);


  async function doStartChallenge() {
    if (!session?.sessionId || !me?.playerId) return;
    if (!state?.started || state?.currentPlayerId !== me.playerId || state?.turnStatus !== TURN_STATUS.IDLE) {
      toastInfo(toast, "Not now", "You can only start a challenge on your turn after moving.");
      return;
    }
    try {
      const ch = await startTurnChallenge(session.sessionId, me.playerId);
      nav(ch.route, { state: { challenge: ch } });
    } catch (e) {
      toastError(toast, e, "Failed to start challenge");
    }
  }

  async function doRollD6() {
    if (!session?.sessionId || !me?.playerId) return;
    if (!state?.started || state?.currentPlayerId !== me.playerId || state?.turnStatus !== TURN_STATUS.AWAITING_D6_ROLL) {
      toastInfo(toast, "Not now", "You can only roll when it's your turn and the game is waiting for the D6.");
      return;
    }
    try {
      const r = await rollTurnD6(session.sessionId, me.playerId);
      if (r?.turnStatus === TURN_STATUS.AWAITING_PATH_CHOICE) {
        setPendingChoices({
          forkNodeId: r.forkNodeId,
          remainingSteps: r.remainingSteps,
          options: r.options || [],
          diceRoll: r.diceRoll,
        });
      } else {
        setPendingChoices(null);
      }
      // Refresh lobby state so other UI updates (turnStatus/position) are shown.
      load();
      return r;
    } catch (e) {
      toastError(toast, e, "Roll failed");
      throw e;
    }
  }

  async function doChoosePath(toNodeId) {
    if (!session?.sessionId || !me?.playerId) return;
    if (!state?.started || state?.currentPlayerId !== me.playerId || state?.turnStatus !== TURN_STATUS.AWAITING_PATH_CHOICE) {
      toastInfo(toast, "Not now", "You can only choose a path when it's your turn and a fork is active.");
      return;
    }
    try {
      const r = await chooseTurnPath(session.sessionId, me.playerId, toNodeId);
      if (r?.turnStatus === TURN_STATUS.AWAITING_PATH_CHOICE) {
        setPendingChoices({
          forkNodeId: r.forkNodeId,
          remainingSteps: r.remainingSteps,
          options: r.options || [],
          diceRoll: r.diceRoll,
        });
      } else {
        setPendingChoices(null);
      }
      load();
    } catch (e) {
      toastError(toast, e, "Choice failed");
    }
  }

  const SPECIAL_CARDS = [
    { id: SPECIAL_CARD.PERMISSION_DENIED, label: "Permission denied", img: "/specialcards/permission_denied.png", needsTarget: true },
    { id: SPECIAL_CARD.RAGE_BAIT, label: "Rage Bait", img: "/specialcards/rage_bait.png", needsTarget: true },
    { id: SPECIAL_CARD.REFACTOR, label: "Refactor", img: "/specialcards/refactor.png", needsTarget: false },
    { id: SPECIAL_CARD.SECOND_CHANCE, label: "Second Chance", img: "/specialcards/second_chance.png", needsTarget: false },
    { id: SPECIAL_CARD.SHORTCUT_FOUND, label: "Shortcut found", img: "/specialcards/shortcut_found.png", needsTarget: false },
    { id: SPECIAL_CARD.ROLLBACK, label: "Rollback", img: "/specialcards/rollback.png", needsTarget: true },
    { id: SPECIAL_CARD.BOOST, label: "Boost", img: "/specialcards/boost.png", needsTarget: false },
    { id: SPECIAL_CARD.JAIL, label: "JAIL", img: "/specialcards/jail.png", needsTarget: false },
  ];

  async function doApplySpecial() {
    if (!session?.sessionId || !me?.playerId) return;
    if (specialSubmitting) return;
    setSpecialSubmitting(true);
    try {
      const cardDef = SPECIAL_CARDS.find((c) => c.id === specialCard);
      if (cardDef?.needsTarget && !specialTarget) {
        toastInfo(toast, "Action required", "Please choose a target player for this card.");
        setSpecialSubmitting(false);
        return;
      }
      // BOOST: if backend detected a fork, it will respond with needChoice + options.
      if (specialCard === SPECIAL_CARD.BOOST && boostOptions.length > 0 && !boostTo) {
        toastInfo(toast, "Action required", "Please choose a path for Boost.");
        setSpecialSubmitting(false);
        return;
      }

      const r = await applySpecialCard(
        session.sessionId,
        me.playerId,
        specialCard,
        specialTarget || undefined,
        specialCard === SPECIAL_CARD.BOOST ? (boostTo || undefined) : undefined
      );

      if (r?.needChoice) {
        setBoostOptions(r.options || []);
        setBoostTo("");
        toastInfo(toast, "Choose a path", "Boost hit a fork — please choose the path.");
        setSpecialSubmitting(false);
        return;
      }
      setSpecialOpen(false);
      setSpecialTarget("");
      setBoostOptions([]);
      setBoostTo("");
      setSpecialSubmitting(false);
      load();
    } catch (e) {
      const msg = String(e?.message || "");
      // If the backend says the action is locked, we likely desynced (already resolved or no longer awaiting).
      // Sync state and don't leave the user stuck in the modal.
      if (msg.includes("423") || msg.toLowerCase().includes("locked")) {
        setSpecialSubmitting(false);
        setSpecialOpen(false);
        setSpecialTarget("");
        setBoostOptions([]);
        setBoostTo("");
        load();
        return;
      }
      setSpecialSubmitting(false);
      toastError(toast, e, "Special card failed");
    }
  }

  async function leaveGame() {
    setConfirmLeaveOpen(true);
  }

  async function performLeaveGame() {
    if (session?.sessionId && me?.playerId) {
      try { await leaveSession(session.sessionId, me.playerId); } catch {}
    }
    clearPlayer();
    clearSession();
    nav("/");
  }



  if (!canView) {
    return (
      <AppShell title="Play" subtitle="Join a match and set your profile first." showTabs activeTab="play" backTo={false} showBrand>
        <Card>
          <CardContent className="space-y-s2">
            <div className="text-fs3 font-extrabold">Not ready</div>
            <div className="text-muted">You need to be in a match and have a player profile.</div>
          </CardContent>
        </Card>
      </AppShell>
    );
  }

  const players = (state?.players || []).slice().sort((a, b) => a.turnOrder - b.turnOrder);
  const currentPlayer = players.find((p) => p.id === state?.currentPlayerId);
  const meState = players.find((p) => p.id === me?.playerId);
  const isMyTurn = !!(state?.started && state?.currentPlayerId && state.currentPlayerId === me.playerId);
  const waitingForDice = state?.turnStatus === TURN_STATUS.AWAITING_D6_ROLL;
  const waitingForPath = state?.turnStatus === TURN_STATUS.AWAITING_PATH_CHOICE;
  const awaitingSpecial = state?.turnStatus === TURN_STATUS.AWAITING_SPECIAL_CARD;
  const canStartChallenge = isMyTurn && state?.turnStatus === TURN_STATUS.IDLE;
  const myFieldType = meState?.positionType || null;
  // Fork nodes stay FORK fields, but if you END your move on a fork (turnStatus === IDLE)
  // they should behave like a MEDIUM challenge field.
  const hasChallengeOnField = myFieldType === FIELD_TYPE.EASY || myFieldType === FIELD_TYPE.MEDIUM || myFieldType === FIELD_TYPE.HARD || myFieldType === FIELD_TYPE.FORK;
  const statusLabel = useMemo(() => {
    const ts = String(state?.turnStatus || "");
    if (!state?.started) return "WAITING";
    if (ts === TURN_STATUS.AWAITING_D6_ROLL) return "ROLL";
    if (ts === TURN_STATUS.AWAITING_PATH_CHOICE) return "CHOOSE PATH";
    if (ts === TURN_STATUS.AWAITING_SPECIAL_CARD) return "SPECIAL";
    if (ts === TURN_STATUS.IN_CHALLENGE) return "IN CHALLENGE";
    if (ts === TURN_STATUS.IDLE) return "ACTION";
    return ts || "";
  }, [state?.turnStatus, state?.started]);

  const primaryAction = useMemo(() => {
    if (!isMyTurn) return null;
    if (awaitingSpecial) {
      return { label: "Pick card", onClick: () => setSpecialOpen(true), disabled: false };
    }
    if (waitingForDice) {
      return { label: "Roll", onClick: doRollD6, disabled: false };
    }
    if (waitingForPath) {
      return { label: "Choose path", onClick: () => setPathDialogOpen(true), disabled: false };
    }
    if (canStartChallenge && hasChallengeOnField) {
      return { label: "Start challenge", onClick: doStartChallenge, disabled: false };
    }
    return null;
  }, [isMyTurn, awaitingSpecial, waitingForDice, waitingForPath, canStartChallenge, hasChallengeOnField]);

  // Player-facing turn indicator (no internal node ids).
  const turnLabel = useMemo(() => {
    if (!state?.started) return "Waiting for start";
    if (!players.length || !me?.playerId || !state?.currentPlayerId) return "";
    if (isMyTurn) return "Your turn: NOW";

    const idxMe = players.findIndex((p) => p.id === me.playerId);
    const idxCur = players.findIndex((p) => p.id === state.currentPlayerId);
    if (idxMe < 0 || idxCur < 0) return "";
    const n = players.length;
    const dist = (idxMe - idxCur + n) % n;
    if (dist === 1) return "Your turn: NEXT";
    return `Your turn in: ${dist} turns`;
  }, [state?.started, state?.currentPlayerId, players, me?.playerId, isMyTurn]);

  return (
    <AppShell
      title="Play"
      subtitle={""}
      showTabs
      activeTab="play"
      backTo={false}
      showBrand
      headerBadges={
        <>
          {session?.sessionCode ? <Badge variant="secondary">Match: {session.sessionCode}</Badge> : null}
          {me?.playerName ? <Badge variant="secondary">You: {me.playerIcon || "🙂"} {me.playerName}</Badge> : null}
          <Badge variant={isMyTurn ? "secondary" : "outline"}>{turnLabel}</Badge>
        </>
      }
      rightPanel={
        <Card>
          <CardContent className="space-y-s3">
            <div>
              <div className="text-fs2 font-extrabold">Quick actions</div>
              <div className="mt-s2 text-muted leading-relaxed">
                Open the board map and keep an eye on the turn status.
              </div>
            </div>
            <Button variant="secondary" onClick={() => setMapOpen(true)}>
              Show map
            </Button>
          </CardContent>
        </Card>
      }
      actions={
        <div className="flex w-full items-center gap-s3">
          {primaryAction ? (
            <Button variant="primary" onClick={primaryAction.onClick} disabled={primaryAction.disabled}>
              {primaryAction.label}
            </Button>
          ) : (
            <Button variant="primary" disabled>
              {isMyTurn ? "Waiting…" : "Not your turn"}
            </Button>
          )}
          <Button variant="secondary" onClick={() => setMapOpen(true)} title="Show board map">
            Map
          </Button>
          <Button variant="ghost" onClick={resync} title="Resync game state">
            Resync
          </Button>
          <Button variant="ghost" onClick={leaveGame} className="ml-auto">
            Leave
          </Button>
        </div>
      }
    >

      <Dialog open={pathDialogOpen} onOpenChange={setPathDialogOpen}>
        <DialogContent className="w-[min(92vw,520px)]">
          <DialogHeader>
            <DialogTitle>Choose your path</DialogTitle>
            <DialogDescription>Fork detected — pick the next tile.</DialogDescription>
          </DialogHeader>
          <div className="mt-s3 flex flex-wrap gap-s2">
            {(pendingChoices?.options || []).map((opt) => (
              <Button
                key={opt?.to || opt}
                variant="secondary"
                onClick={() => {
                  setPathDialogOpen(false);
                  doChoosePath(opt?.to || opt);
                }}
              >
                {opt?.label ? opt.label : "Choose"}
              </Button>
            ))}
            {!pendingChoices?.options?.length ? <div className="text-muted">Loading options…</div> : null}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPathDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={specialOpen} onOpenChange={(o) => setSpecialOpen(o)}>
        <DialogContent
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
          className="w-[min(92vw,560px)]"
        >
          <DialogHeader>
            <DialogTitle>🃏 Special Field</DialogTitle>
            <DialogDescription className="leading-relaxed">
              Draw <strong>a real-life card</strong> from the Special deck and select it here.
            </DialogDescription>
          </DialogHeader>

          {!isMyTurn ? (
            <div className="mt-s3 rounded-lg border border-border bg-surface2 p-s4">
              <div className="font-extrabold">⏳ Waiting…</div>
              <div className="mt-1 text-sm text-muted">The current player is selecting their Special card.</div>
            </div>
          ) : null}

          <div className="mt-s4 grid gap-s3">
            <label className="grid gap-2">
              <div className="text-sm font-extrabold">Which card did you draw?</div>
              <Select value={specialCard} onValueChange={(v) => setSpecialCard(v)} disabled={!isMyTurn}>
                <SelectTrigger>
                  <SelectValue placeholder="Select…" />
                </SelectTrigger>
                <SelectContent>
                  {SPECIAL_CARDS.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>

            {SPECIAL_CARDS.find((c) => c.id === specialCard)?.img ? (
              <div className="grid place-items-center">
                <img
                  src={SPECIAL_CARDS.find((c) => c.id === specialCard).img}
                  alt={specialCard}
                  className="block h-auto w-[min(300px,86vw)] rounded-md border border-border"
                />
              </div>
            ) : null}

            {SPECIAL_CARDS.find((c) => c.id === specialCard)?.needsTarget ? (
              <label className="grid gap-2">
                <div className="text-sm font-extrabold">Target player</div>
                <Select value={specialTarget} onValueChange={(v) => setSpecialTarget(v)} disabled={!isMyTurn}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select…" />
                  </SelectTrigger>
                  <SelectContent>
                    {(state?.players || [])
                      .filter((p) => p.id !== me?.playerId)
                      .map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {(p.icon || "🙂") + " " + (p.name || "Player")}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </label>
            ) : null}

            {specialCard === "BOOST" && boostOptions.length > 0 ? (
              <label className="grid gap-2">
                <div className="text-sm font-extrabold">Boost: choose the path (fork)</div>
                <Select value={boostTo} onValueChange={(v) => setBoostTo(v)} disabled={!isMyTurn}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select…" />
                  </SelectTrigger>
                  <SelectContent>
                    {boostOptions.map((o) => (
                      <SelectItem key={o.to} value={o.to}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
            ) : null}
          </div>

          <DialogFooter>
            <Button onClick={doApplySpecial} disabled={!isMyTurn || specialSubmitting}>
              Activate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

{mapOpen ? createPortal((
  <div
    className="fixed inset-0 z-[250] flex items-center justify-center bg-black/70"
    style={{
      padding: "max(env(safe-area-inset-top), 12px) 12px max(env(safe-area-inset-bottom), 12px)",
    }}
    onClick={() => setMapOpen(false)}
  >
    <Card
      className="relative w-[min(900px,96vw)] max-w-[96vw] overflow-hidden"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        onClick={() => setMapOpen(false)}
        aria-label="Close map"
        className="absolute right-s3 top-s3 z-[5] grid h-11 w-11 place-items-center rounded-full border border-border bg-surface2 text-text"
      >
        ✕
      </button>

      <div className="relative h-full w-full">
        <img
          src={mapImg}
          alt="Map"
          className="block h-auto max-h-[90dvh] w-full object-contain"
        />

        {/* Player marker */}
        {(() => {
          const nodeId = meState?.positionNodeId; // e.g. "n23"
          const pos = nodeId ? nodeMapPositions[nodeId] : null; // { x: 0..1, y: 0..1 }
          if (!pos) return null;

          return (
            <div
              style={{
                position: "absolute",
                left: `${pos.x * 100}%`,
                top: `${pos.y * 100}%`,
                transform: "translate(-50%, -50%)",
                width: 16,
                height: 16,
                borderRadius: 999,
                background: "rgba(255, 60, 60, 0.95)",
                boxShadow: "0 0 18px rgba(255,60,60,0.95), 0 0 40px rgba(255,60,60,0.55)",
              }}
            />
          );
        })()}
      </div>
    </Card>
  </div>
), document.body) : null}

      <PullToRefresh onRefresh={load}>
        <div className="h-full flex min-h-0 flex-col gap-s4">
          <EventFeed sessionId={session.sessionId} title="Game feed" limit={5} />

          <Card className="flex-1 min-h-0 overflow-hidden">
            <CardContent className="h-full space-y-s4 overflow-auto">
              {/* Errors are shown via toast */}

              {!state?.started ? (
                <div className="text-muted leading-relaxed">
                  Match not started yet. Use the <strong>Lobby</strong> tab below to roll the D20 and press Ready.
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap gap-s2">
                    {currentPlayer ? (
                      <Badge variant="secondary">Current: {currentPlayer.icon || "🙂"} {currentPlayer.name}</Badge>
                    ) : null}
                    {statusLabel ? (
                      <Badge variant={isMyTurn ? "secondary" : "outline"}>Status: {statusLabel}</Badge>
                    ) : null}
                    {isMyTurn && typeof pendingChoices?.remainingSteps === "number" ? (
                      <Badge variant="outline">Steps left: {pendingChoices.remainingSteps}</Badge>
                    ) : null}
                    {typeof state?.lastDiceRoll === "number" ? (
                      <Badge variant="outline">Last D6: {state.lastDiceRoll}</Badge>
                    ) : null}
                    {myFieldType ? (
                      <Badge variant="outline">Field: {myFieldType}</Badge>
                    ) : null}
                  </div>

                  {/* D6 roll */}
                  {isMyTurn && waitingForDice ? (
                    <div className="space-y-s2">
                      <D6Die value={state?.lastDiceRoll || null} onRoll={doRollD6} disabled={!isMyTurn || !waitingForDice} />
                    </div>
                  ) : null}

                  {/* Fork choice */}
                  {isMyTurn && waitingForPath ? (
                    <div className="space-y-s2">
                      <div className="text-muted">Fork! Choose your path:</div>
                      <div className="flex flex-wrap gap-s2">
                        {(pendingChoices?.options || []).map((opt) => (
                          <Button key={opt?.to || opt} variant="secondary" onClick={() => doChoosePath(opt?.to || opt)}>
                            {opt?.label ? opt.label : "Choose"}
                          </Button>
                        ))}
                        {!pendingChoices?.options?.length ? <div className="text-muted">(Loading options…)</div> : null}
                      </div>
                    </div>
                  ) : null}

                  {!canStartChallenge ? (
                    <div className="text-muted text-fs0">
                      {waitingForDice ? "Roll the D6." : waitingForPath ? "Choose a fork path." : ""}
                    </div>
                  ) : null}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </PullToRefresh>

      <ConfirmModal
        open={confirmLeaveOpen}
        title="Leave game?"
        message={
          "Do you really want to leave the game?\n\n" +
          "You will leave the match and will need to choose your name + icon again the next time you join via QR."
        }
        confirmText="Leave"
        cancelText="Stay"
        danger
        onConfirm={() => {
          setConfirmLeaveOpen(false);
          performLeaveGame();
        }}
        onClose={() => setConfirmLeaveOpen(false)}
      />
    </AppShell>
  );
}