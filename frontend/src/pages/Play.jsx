import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import AppShell from "../components/AppShell";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { getSession, clearSession } from "../lib/session";
import { getPlayer, fetchLobby, leaveSession, clearPlayer, rollTurnD6, chooseTurnPath } from "../lib/player";
import D6Die from "../components/D6Die";

export default function Play() {
  const nav = useNavigate();
  const loc = useLocation();
  const session = useMemo(() => getSession(), []);
  const me = useMemo(() => getPlayer(), []);

  const [state, setState] = useState(null);
  const [eventMsg, setEventMsg] = useState(null);
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

      // If the session is no longer waiting for a path choice, clear any stale local UI.
      if (s?.turnStatus !== "AWAITING_PATH_CHOICE") {
        setPendingChoices(null);
      }

      // Sync pending fork choices on refresh
      if (s?.turnStatus === "AWAITING_PATH_CHOICE" && s?.pendingForkNodeId) {
        // We don't know the options from lobby state alone, but the next action will call choosePath.
        // Keep UI in a "choose" mode and show the fork node id.
        if (!pendingChoices) {
          setPendingChoices({ forkNodeId: s.pendingForkNodeId, remainingSteps: s.pendingRemainingSteps, options: null });
        }
      } else {
        setPendingChoices(null);
      }

      // If we are in a fork choice state, expose options (only the current player can act).
      if (s?.turnStatus === "AWAITING_PATH_CHOICE" && s?.pendingForkNodeId) {
        // Options are not included in lobby payload; we keep them from the last API response.
        // If user refreshes, they can roll again after we implement full option listing.
      }

      // Lightweight event display (e.g. player left)
      if (s?.lastEventSeq && s?.lastEventMessage) {
        const key = `cc_evt_${session.sessionId}`;
        const lastSeen = Number(sessionStorage.getItem(key) || "0");
        if (s.lastEventSeq > lastSeen) {
          sessionStorage.setItem(key, String(s.lastEventSeq));
          setEventMsg(s.lastEventMessage);
          setTimeout(() => setEventMsg(null), 4500);
        }
      }
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


  function go(diff) {
    nav(`/challenge?difficulty=${encodeURIComponent(diff)}`);
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
    } catch (e) {
      setErr(e?.message || "Roll failed");
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
      <AppShell title="Play" subtitle="Join a match and set your profile first.">
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
  const canChooseDifficulty = isMyTurn && state?.turnStatus === "IDLE";

  return (
    <AppShell
      title="Difficulty"
      subtitle="Only the current player can choose."
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
      <div className="panel" style={{ display: "grid", gap: 12 }}>
        {err ? <div style={{ opacity: 0.9 }}>⚠️ {err}</div> : null}
        {eventMsg ? (
          <div className="panel" style={{ border: "1px solid rgba(148,163,184,0.22)" }}>
            <div style={{ fontWeight: 800 }}>ℹ️ {eventMsg}</div>
          </div>
        ) : null}

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
            </div>

            {/* Phase 2B: D6 roll + fork choice */}
            {isMyTurn && waitingForDice ? (
              <div style={{ display: "grid", gap: 10, marginTop: 6 }}>
                <div className="muted">Roll the D6 to move on the board:</div>
                <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                  <D6Die value={state?.lastDiceRoll || null} onRoll={doRollD6} disabled={!isMyTurn} />
                  <div className="muted" style={{ lineHeight: 1.4 }}>
                    {state?.lastDiceRoll ? <>Last roll: <strong>{state.lastDiceRoll}</strong></> : ""}
                  </div>
                </div>
              </div>
            ) : null}

            {isMyTurn && waitingForPath ? (
              <div style={{ display: "grid", gap: 10, marginTop: 6 }}>
                <div className="muted">Fork! Choose your path:</div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {(pendingChoices?.options || []).map((opt) => (
                    <Button key={opt} variant="secondary" onClick={() => doChoosePath(opt)}>
                      Go to {opt}
                    </Button>
                  ))}
                  {!pendingChoices?.options?.length ? (
                    <div className="muted">(No options loaded yet — roll again if needed)</div>
                  ) : null}
                </div>
              </div>
            ) : null}

            <div className="muted">Choose difficulty:</div>
            {!canChooseDifficulty ? (
              <div className="muted" style={{ fontSize: 13 }}>
                {waitingForDice ? "Roll the D6 first." : waitingForPath ? "Finish the fork choice first." : ""}
              </div>
            ) : null}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Button variant="primary" onClick={() => go("EASY")} disabled={!canChooseDifficulty}>Easy</Button>
              <Button variant="secondary" onClick={() => go("MEDIUM")} disabled={!canChooseDifficulty}>Medium</Button>
              <Button variant="secondary" onClick={() => go("HARD")} disabled={!canChooseDifficulty}>Hard</Button>
            </div>
          </>
        )}

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 6 }}>
          <Link to="/leaderboard">
            <Button variant="ghost">Leaderboard</Button>
          </Link>
          <Button variant="ghost" onClick={leaveGame}>Leave game</Button>
        </div>
      </div>
    </AppShell>
  );
}
