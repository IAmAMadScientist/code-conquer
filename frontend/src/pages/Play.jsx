import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AppShell from "../components/AppShell";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { getSession } from "../lib/session";
import { getPlayer, fetchLobby } from "../lib/player";

export default function Play() {
  const nav = useNavigate();
  const session = useMemo(() => getSession(), []);
  const me = useMemo(() => getPlayer(), []);

  const [state, setState] = useState(null);
  const [err, setErr] = useState(null);

  const canView = !!(session?.sessionId && me?.playerId);

  async function load() {
    if (!session?.sessionId) return;
    setErr(null);
    try {
      const s = await fetchLobby(session.sessionId);
      setState(s);
    } catch (e) {
      setErr(e?.message || "Failed to load lobby state");
    }
  }

  useEffect(() => {
    if (!canView) return;
    load();
    const t = setInterval(load, 1500);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function go(diff) {
    nav(`/challenge?difficulty=${encodeURIComponent(diff)}`);
  }

  if (!canView) {
    return (
      <AppShell title="Play" subtitle="Join a match and set your profile first.">
        <div className="panel">
          <div style={{ fontWeight: 750, marginBottom: 8 }}>Not ready</div>
          <div className="muted" style={{ marginBottom: 12 }}>
            You need to join a match and set your player profile first.
          </div>
          <Link to="/">
            <Button variant="primary">Home</Button>
          </Link>
        </div>
      </AppShell>
    );
  }

  const players = (state?.players || []).slice().sort((a, b) => a.turnOrder - b.turnOrder);
  const currentPlayer = players.find((p) => p.id === state?.currentPlayerId);
  const isMyTurn = !!(state?.started && state?.currentPlayerId && state.currentPlayerId === me.playerId);

  return (
    <AppShell
      title="Play"
      subtitle="Turn-based difficulty selection."
      headerBadges={
        <>
          <Badge>Play</Badge>
          {session?.sessionCode ? <Badge variant="secondary">Match: {session.sessionCode}</Badge> : null}
          {me?.playerName ? <Badge variant="secondary">You: {me.playerIcon || "🙂"} {me.playerName}</Badge> : null}
        </>
      }
      rightPanel={
        <div className="panel">
          <div style={{ fontSize: 16, fontWeight: 650 }}>Turn order</div>
          <div className="muted" style={{ fontSize: 14, marginTop: 10, lineHeight: 1.5 }}>
            The backend enforces turns. Only the current player can start a challenge and submit a score.
          </div>
        </div>
      }
    >
      <div className="panel" style={{ display: "grid", gap: 12 }}>
        {err ? <div style={{ opacity: 0.9 }}>⚠️ {err}</div> : null}

        {!state?.started ? (
          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ fontWeight: 750 }}>Game not started</div>
            <div className="muted">
              Go to the lobby and press Ready. The match starts automatically when everyone is ready.
            </div>
            <Link to="/lobby">
              <Button variant="primary">Go to Lobby</Button>
            </Link>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <Badge variant={isMyTurn ? "secondary" : "outline"}>
                {isMyTurn ? "Your turn" : "Waiting"}
              </Badge>
              {currentPlayer ? (
                <Badge variant="secondary">
                  Current: {currentPlayer.icon || "🙂"} {currentPlayer.name} (#{currentPlayer.turnOrder})
                </Badge>
              ) : null}
            </div>

            <div className="muted">Choose difficulty (only enabled on your turn):</div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Button variant="primary" onClick={() => go("EASY")} disabled={!isMyTurn}>Easy</Button>
              <Button variant="secondary" onClick={() => go("MEDIUM")} disabled={!isMyTurn}>Medium</Button>
              <Button variant="secondary" onClick={() => go("HARD")} disabled={!isMyTurn}>Hard</Button>
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 8 }}>
              <Link to="/leaderboard">
                <Button variant="ghost">Leaderboard</Button>
              </Link>
              <Link to="/lobby">
                <Button variant="ghost">Lobby</Button>
              </Link>
              <Link to="/">
                <Button variant="ghost">Home</Button>
              </Link>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
