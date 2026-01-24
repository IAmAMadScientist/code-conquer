import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import AppShell from "../components/AppShell";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { getSession, clearSession } from "../lib/session";
import { getPlayer, fetchLobby, leaveSession, clearPlayer, rollTurnD6, chooseTurnPath, startTurnChallenge } from "../lib/player";
import D6Die from "../components/D6Die";
import EventFeed from "../components/EventFeed";
import PullToRefresh from "../components/PullToRefresh";
// Sound toggle is global (AppShell header) and dice SFX timing is handled by the dice overlay.

export default function Play() {
  const nav = useNavigate();
  const loc = useLocation();
  const session = useMemo(() => getSession(), []);
  const me = useMemo(() => getPlayer(), []);

  const [state, setState] = useState(null);
  const [err, setErr] = useState(null);
  const [summary, setSummary] = useState(loc.state?.turnSummary || null);
  const [turnMsg, setTurnMsg] = useState(null);
  const [pendingChoices, setPendingChoices] = useState(null);

  const canView = !!(session?.sessionId && me?.playerId);

  async function load() {
    if (!session?.sessionId) return;
    setErr(null);
    try {
      const s = await fetchLobby(session.sessionId);
      setState(s);

      // If the match is finished, go to endscreen.
      if (s?.sessionStatus === "FINISHED") {
        nav("/end", { replace: true });
        return;
      }

      // If the session is no longer waiting for a path choice, clear any stale local UI.
      if (s?.turnStatus !== "AWAITING_PATH_CHOICE") {
        setPendingChoices(null);
      }

      // Sync pending fork choices on refresh/polling.
      if (s?.turnStatus === "AWAITING_PATH_CHOICE" && s?.pendingForkNodeId) {
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
      setErr(e?.message || "Failed to load game state");
    }
  }

  useEffect(() => {
    if (!canView) return;
    load();
    const t = setInterval(load, 1500);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

useEffect(() => {
  if (!summary) return;
  const t = setTimeout(() => setSummary(null), 4500);
  return () => clearTimeout(t);
}, [summary]);


  async function doStartChallenge() {
    if (!session?.sessionId || !me?.playerId) return;
    setErr(null);
    try {
      const ch = await startTurnChallenge(session.sessionId, me.playerId);
      nav(ch.route, { state: { challenge: ch } });
    } catch (e) {
      setErr(e?.message || "Failed to start challenge");
    }
  }

  async function doRollD6() {
    if (!session?.sessionId || !me?.playerId) return;
    setErr(null);
    try {
      const r = await rollTurnD6(session.sessionId, me.playerId);
      if (r?.turnStatus === "AWAITING_PATH_CHOICE") {
        setPendingChoices({
          forkNodeId: r.forkNodeId,
          remainingSteps: r.remainingSteps,
          options: r.options || [],
          diceRoll: r.diceRoll,
        });
        setTurnMsg(`🎲 Rolled ${r.diceRoll}. Choose a path.`);
      } else {
        setPendingChoices(null);
        if (r?.diceRoll) setTurnMsg(`🎲 Rolled ${r.diceRoll}. Moved to ${r.positionNodeId} (${r.positionType}).`);
      }
      // Refresh lobby state so other UI updates (turnStatus/position) are shown.
      load();
      setTimeout(() => setTurnMsg(null), 4500);
      return r;
    } catch (e) {
      setErr(e?.message || "Roll failed");
      throw e;
    }
  }

  async function doChoosePath(toNodeId) {
    if (!session?.sessionId || !me?.playerId) return;
    setErr(null);
    try {
      const r = await chooseTurnPath(session.sessionId, me.playerId, toNodeId);
      if (r?.turnStatus === "AWAITING_PATH_CHOICE") {
        setPendingChoices({
          forkNodeId: r.forkNodeId,
          remainingSteps: r.remainingSteps,
          options: r.options || [],
          diceRoll: r.diceRoll,
        });
        setTurnMsg(`➡️ Choose next path (remaining ${r.remainingSteps}).`);
      } else {
        setPendingChoices(null);
        setTurnMsg(`✅ Moved to ${r.positionNodeId} (${r.positionType}).`);
      }
      load();
      setTimeout(() => setTurnMsg(null), 4500);
    } catch (e) {
      setErr(e?.message || "Choice failed");
    }
  }

  async function leaveGame() {
    const ok = window.confirm(
      "Willst du das Spiel wirklich verlassen?\n\n" +
      "Du verlässt das Match und musst beim nächsten QR-Join wieder Name + Icon auswählen."
    );
    if (!ok) return;

    if (session?.sessionId && me?.playerId) {
      try { await leaveSession(session.sessionId, me.playerId); } catch {}
    }
    clearPlayer();
    clearSession();
    nav("/");
  }

  if (!canView) {
    return (
      <AppShell title="Play" subtitle="Join a match and set your profile first." showTabs activeTab="play" backTo="/">
        <div className="panel">
          <div style={{ fontWeight: 750, marginBottom: 8 }}>Not ready</div>
          <div className="muted">You need to be in a match and have a player profile.</div>
        </div>
      </AppShell>
    );
  }

  const players = (state?.players || []).slice().sort((a, b) => a.turnOrder - b.turnOrder);
  const currentPlayer = players.find((p) => p.id === state?.currentPlayerId);
  const meState = players.find((p) => p.id === me?.playerId);
  const isMyTurn = !!(state?.started && state?.currentPlayerId && state.currentPlayerId === me.playerId);
  const waitingForDice = state?.turnStatus === "AWAITING_D6_ROLL";
  const waitingForPath = state?.turnStatus === "AWAITING_PATH_CHOICE";
  const canStartChallenge = isMyTurn && state?.turnStatus === "IDLE";
  const myFieldType = meState?.positionType || null;
  const hasChallengeOnField = myFieldType === "EASY" || myFieldType === "MEDIUM" || myFieldType === "HARD";

  return (
    <AppShell
      title="Play"
      subtitle="Roll the D6 to move. Difficulty comes from the board."
      showTabs
      activeTab="play"
      backTo="/lobby"
      headerBadges={
        <>
          {session?.sessionCode ? <Badge variant="secondary">Match: {session.sessionCode}</Badge> : null}
          {me?.playerName ? <Badge variant="secondary">You: {me.playerIcon || "🙂"} {me.playerName}</Badge> : null}
          {state?.started ? <Badge variant="secondary">Started</Badge> : <Badge>Not started</Badge>}
        </>
      }
      rightPanel={
        <div className="panel">
          <div style={{ fontSize: 16, fontWeight: 650 }}>Turn</div>
          <div className="muted" style={{ fontSize: 14, marginTop: 10, lineHeight: 1.5 }}>
            {state?.started
              ? "Wait if it's not your turn. After a player finishes a minigame, the turn automatically advances."
              : "Waiting in lobby… The game starts automatically when everyone is ready."}
          </div>
        </div>
      }
    >
      <PullToRefresh onRefresh={load}>
      <div className="panel mobileCenter" style={{ display: "grid", gap: 12 }}>
        {err ? <div style={{ opacity: 0.9 }}>⚠️ {err}</div> : null}
        <EventFeed sessionId={session.sessionId} title="Game feed" limit={5} />

        {turnMsg ? (
          <div className="panel" style={{ border: "1px solid rgba(148,163,184,0.22)" }}>
            <div style={{ fontWeight: 800 }}>ℹ️ {turnMsg}</div>
          </div>
        ) : null}
{summary ? (
  <div className="panel" style={{ border: "1px solid rgba(148,163,184,0.22)" }}>
    <div style={{ fontWeight: 800, marginBottom: 6 }}>
      {summary.saved ? "✅ Score saved" : "⚠️ Score not saved"}
    </div>
    {summary.error ? <div className="muted" style={{ marginBottom: 6 }}>{summary.error}</div> : null}
    {summary.next ? (
      <div className="muted">
        Next turn: <strong>{summary.next.icon || "🙂"} {summary.next.name}</strong> (#{summary.next.turnOrder})
      </div>
    ) : (
      <div className="muted">Next turn is ready.</div>
    )}
  </div>
) : null}


        {!state?.started ? (
          <div className="muted">
            Game not started yet. (Lobby is only for the start. If you’re stuck here, someone didn’t ready up.)
          </div>
        ) : (
          <>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <Badge variant={isMyTurn ? "secondary" : "outline"}>{isMyTurn ? "Your turn" : "Waiting"}</Badge>
              {currentPlayer ? (
                <Badge variant="secondary">Current: {currentPlayer.icon || "🙂"} {currentPlayer.name}</Badge>
              ) : null}
              {meState?.positionNodeId ? (
                <Badge variant="outline">You at: {meState.positionNodeId}</Badge>
              ) : null}
              {typeof state?.lastDiceRoll === "number" ? (
                <Badge variant="outline">Last D6: {state.lastDiceRoll}</Badge>
              ) : null}
              {typeof meState?.lobbyRoll === "number" ? (
                <Badge variant="outline">Your D20: {meState.lobbyRoll}</Badge>
              ) : null}
            </div>

            {/* Phase 2B: D6 roll + fork choice */}
            {isMyTurn && waitingForDice ? (
              <div style={{ display: "grid", gap: 10, marginTop: 6 }}>
                <div className="muted">Roll the D6 to move on the board:</div>
                <div className="mobileRow" style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                  <D6Die
                    value={state?.lastDiceRoll || null}
                    onRoll={doRollD6}
                    disabled={!isMyTurn}
                  />
                  <div className="muted" style={{ lineHeight: 1.4 }}>
                    {state?.lastDiceRoll ? <>Last roll: <strong>{state.lastDiceRoll}</strong></> : ""}
                  </div>
                </div>
              </div>
            ) : null}

            {isMyTurn && waitingForPath ? (
              <div style={{ display: "grid", gap: 10, marginTop: 6 }}>
                <div className="muted">Fork! Choose your path:</div>
                <div className="mobileRow" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {(pendingChoices?.options || []).map((opt) => (
                    <Button key={opt?.to || opt} variant="secondary" onClick={() => doChoosePath(opt?.to || opt)}>
                      {opt?.label ? opt.label : "Choose"}
                    </Button>
                  ))}
                  {!pendingChoices?.options?.length ? (
                    <div className="muted">(Loading options…)</div>
                  ) : null}
                </div>
              </div>
            ) : null}

            <div className="muted">Challenge:</div>
            {myFieldType ? (
              <div className="muted" style={{ fontSize: 13 }}>
                Current field: <strong>{myFieldType}</strong>
              </div>
            ) : null}
            {!canStartChallenge ? (
              <div className="muted" style={{ fontSize: 13 }}>
                {waitingForDice ? "Roll the D6 first." : waitingForPath ? "Finish the fork choice first." : ""}
              </div>
            ) : null}
            <div className={"stickyActions hasTabs"}>
              <div className="stickyActionsRow">
                <Button
                  className="fullWidthBtn"
                  variant="primary"
                  onClick={doStartChallenge}
                  disabled={!canStartChallenge || !hasChallengeOnField}
                >
                  Start challenge
                </Button>
                {canStartChallenge && !hasChallengeOnField ? (
                  <div className="muted" style={{ fontSize: 12, textAlign: "center" }}>
                    No challenge on this field.
                  </div>
                ) : null}
              </div>
            </div>
          </>
        )}

        <div className="mobileRow" style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 6 }}>
          <Link to="/leaderboard">
            <Button variant="ghost">Leaderboard</Button>
          </Link>
          <Button variant="ghost" onClick={leaveGame}>Leave game</Button>
        </div>
      </div>
      </PullToRefresh>
    </AppShell>
  );
}
