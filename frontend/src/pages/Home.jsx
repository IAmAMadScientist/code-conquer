import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { createSession, joinSessionByCode, getSession, clearSession } from "../lib/session";
import { getPlayer, registerPlayer, clearPlayer } from "../lib/player";
import AppShell from "../components/AppShell";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import QRCode from "react-qr-code";

export default function Home() {
  const [session, setSession] = useState(() => getSession());
  const [player, setPlayer] = useState(() => getPlayer());
  const [playerName, setPlayerName] = useState("");
  const joinUrl = session?.sessionCode ? `${window.location.origin}/join/${session.sessionCode}` : "";
  const [joinCode, setJoinCode] = useState("");
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setSession(getSession());
    setPlayer(getPlayer());
  }, []);

  async function onCreate() {
    setErr(null);
    setBusy(true);
    try {
      const s = await createSession();
      setSession(s);
    } catch (e) {
      setErr(e?.message || "Failed to create match");
    } finally {
      setBusy(false);
    }
  }

  async function onSetName() {
  if (!session?.sessionId) return;
  if (!playerName.trim()) return;
  setBusy(true);
  setErr(null);
  try {
    const p = await registerPlayer(session.sessionId, playerName.trim());
    setPlayer(p);
    setPlayerName("");
  } catch (e) {
    setErr(e?.message || "Failed to set player name");
  } finally {
    setBusy(false);
  }
}

async function onJoin() {
    setErr(null);
    setBusy(true);
    try {
      const s = await joinSessionByCode(joinCode.trim());
      setSession(s);
    } catch (e) {
      setErr(e?.message || "Failed to join match");
    } finally {
      setBusy(false);
    }
  }

  function onClear() {
    clearSession();
    setSession(null);
    setJoinCode("");
  }

  return (
    <AppShell
      title="Code & Conquer"
      subtitle="Play a category, pick difficulty, get 1 random challenge — or browse everything."
      headerBadges={
        <>
          <Badge>Home</Badge>
        </>
      }
      rightPanel={
        <div className="panel">
          <div style={{ fontSize: 16, fontWeight: 650 }}>What you can do</div>
          <div className="muted" style={{ fontSize: 14, marginTop: 10 }}>
            • Start Game → category → difficulty → minigame<br/>
          </div>
        </div>
      }
    >
            <div className="panel" style={{ marginBottom: 12 }}>
        <div style={{ fontWeight: 750, marginBottom: 6 }}>Match / Session</div>
        {session?.sessionCode ? (
          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <Badge>Active match: {session.sessionCode}</Badge>
              <Button variant="secondary" onClick={onClear} disabled={busy}>Leave</Button>
            </div>
<div className="muted" style={{ fontSize: 13 }}>
  Scan to join:
</div>
<div className="panel" style={{ display: "grid", gap: 8, justifyItems: "center" }}>
  <div style={{ background: "white", padding: 10, borderRadius: 12 }}>
    <QRCode value={joinUrl} size={160} />
  </div>
  <div className="muted" style={{ fontSize: 12, wordBreak: "break-all", textAlign: "center" }}>
    {joinUrl}
  </div>
</div>


            {player?.playerId ? (
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <Badge variant="secondary">You are: {player.playerIcon || "🙂"} {player.playerName || "Player"}</Badge>
              </div>
            ) : (
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <span className="muted" style={{ fontSize: 13 }}>Set your player name for this match:</span>
                <input
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="e.g. Alex"
                  style={{
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: "1px solid rgba(148,163,184,0.35)",
                    background: "rgba(15,23,42,0.35)",
                    color: "inherit",
                    minWidth: 220,
                  }}
                />
                <Button variant="primary" onClick={onSetName} disabled={busy || !playerName.trim()}>Set name</Button>
              </div>
            )}
          </div>
        ) : (
          <>
            <div style={{ opacity: 0.9, marginBottom: 8 }}>
              Create a match once per boardgame. Other devices can join with the code.
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <Button variant="primary" onClick={onCreate} disabled={busy}>Create match</Button>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <input
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  placeholder="Enter code (e.g. A2F9KQ)"
                  style={{
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: "1px solid rgba(148,163,184,0.35)",
                    background: "rgba(15,23,42,0.35)",
                    color: "inherit",
                    minWidth: 220,
                  }}
                />
                <Button variant="secondary" onClick={onJoin} disabled={busy || !joinCode.trim()}>Join</Button>
              </div>
            </div>
            {err ? <div style={{ marginTop: 8, opacity: 0.9 }}>⚠️ {err}</div> : null}
          </>
        )}
      </div>

<div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        <Link to="/categories">
          <Button variant="primary">Start Game</Button>
        </Link>

        {session?.sessionId ? (
          <Link to="/leaderboard">
            <Button variant="secondary">Leaderboard</Button>
          </Link>
        ) : null}
        <Link to="/categories">
          <Button variant="ghost">Browse Minigames</Button>
        </Link>

      </div>
    </AppShell>
  );
}
