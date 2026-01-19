import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import AppShell from "../components/AppShell";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { getSession } from "../lib/session";
import { getPlayer, fetchLobby } from "../lib/player";

export default function Play() {
  const nav = useNavigate();
  const loc = useLocation();
  const session = useMemo(() => getSession(), []);
  const me = useMemo(() => getPlayer(), []);

  const [state, setState] = useState(null);
  const [err, setErr] = useState(null);
  const [summary, setSummary] = useState(loc.state?.turnSummary || null);

  const canView = !!(session?.sessionId && me?.playerId);

  async function load() {
    if (!session?.sessionId) return;
    setErr(null);
    try {
      const s = await fetchLobby(session.sessionId);
      setState(s);
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
  const isMyTurn = !!(state?.started && state?.currentPlayerId && state.currentPlayerId === me.playerId);

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
            </div>

            <div className="muted">Choose difficulty:</div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Button variant="primary" onClick={() => go("EASY")} disabled={!isMyTurn}>Easy</Button>
              <Button variant="secondary" onClick={() => go("MEDIUM")} disabled={!isMyTurn}>Medium</Button>
              <Button variant="secondary" onClick={() => go("HARD")} disabled={!isMyTurn}>Hard</Button>
            </div>
          </>
        )}

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 6 }}>
          <Link to="/leaderboard">
            <Button variant="ghost">Leaderboard</Button>
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
