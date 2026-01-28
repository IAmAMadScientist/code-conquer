import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../components/AppShell";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { createSession, joinSessionByCode, getSession, clearSession } from "../lib/session";
import { getPlayer, registerPlayer, clearPlayer } from "../lib/player";

const EMOJIS = ["🦊","🐱","🐶","🐸","🐼","🦁","🐙","🦄","🐝","🐧","🐢","🦖","👾","🤖","🧠","🔥","⭐","🍀","🍕","🎲"];

export default function Home() {
  const nav = useNavigate();

  const [session, setSession] = useState(() => getSession());
  const [player, setPlayer] = useState(() => getPlayer());

  const [joinCode, setJoinCode] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [icon, setIcon] = useState(player?.playerIcon || "🦊");

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => {
    // Keep local state in sync if storage changes (rare, but helps).
    setSession(getSession());
    setPlayer(getPlayer());
  }, []);

  async function onCreate() {
    setBusy(true);
    setErr(null);
    try {
      // New match => clear previous player identity
      clearPlayer();
      const s = await createSession();
      setSession(s);
      setPlayer(getPlayer());
      setJoinCode("");
      setPlayerName("");
      setIcon("🦊");
    } catch (e) {
      setErr(e?.message || "Failed to create match");
    } finally {
      setBusy(false);
    }
  }

  async function onJoinByCode() {
    if (!joinCode.trim()) return;
    setBusy(true);
    setErr(null);
    try {
      clearPlayer();
      const s = await joinSessionByCode(joinCode.trim().toUpperCase());
      setSession(s);
      setPlayer(getPlayer());
    } catch (e) {
      setErr(e?.message || "Failed to join match");
    } finally {
      setBusy(false);
    }
  }

  async function onSaveProfileAndGoLobby() {
    if (!session?.sessionId) return;
    if (!playerName.trim()) return;

    setBusy(true);
    setErr(null);
    try {
      const p = await registerPlayer(session.sessionId, playerName.trim(), icon);
      setPlayer(p);
      nav("/lobby");
    } catch (e) {
      setErr(e?.message || "Failed to save profile");
    } finally {
      setBusy(false);
    }
  }

  function onLeave() {
    clearSession();
    clearPlayer();
    setSession(getSession());
    setPlayer(getPlayer());
    setJoinCode("");
    setPlayerName("");
    setIcon("🦊");
    setErr(null);
  }

  return (
    <AppShell
      title="Code & Conquer"
      backTo={false}
      headerBadges={
        <>
          {session?.sessionCode ? <Badge variant="secondary">Match: {session.sessionCode}</Badge> : <Badge>Not in match</Badge>}
          {player?.playerId ? <Badge variant="secondary">You: {player.playerIcon || "🙂"} {player.playerName}</Badge> : null}
        </>
      }
      rightPanel={
        <div className="panel">
          <div style={{ fontSize: 16, fontWeight: 650 }}>Start here</div>
          <div className="muted" style={{ fontSize: 14, marginTop: 10, lineHeight: 1.5 }}>
            1) Create or join a match<br />
            2) Set your name + emoji<br />
            3) Go to lobby and press Ready
          </div>
        </div>
      }
    >
      <div className="panel mobileCenter" style={{ display: "grid", gap: 12 }}>
        {err ? <div style={{ opacity: 0.9 }}>⚠️ {err}</div> : null}

        {!session?.sessionId ? (
          <>
            <div className="mobileRow" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Button variant="primary" onClick={onCreate} disabled={busy}>Create match</Button>
            </div>

            <div style={{ display: "grid", gap: 8 }}>
              <div className="muted">Or join by code:</div>
              <div className="mobileRow" style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <input
                  className="ui-input"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  placeholder="6-digit code"
                  style={{ minWidth: 220, textTransform: "uppercase" }}
                />
                <Button variant="secondary" onClick={onJoinByCode} disabled={busy || !joinCode.trim()}>
                  Join
                </Button>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="mobileRow" style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <Badge>Active match: {session.sessionCode}</Badge>
              <Button variant="secondary" onClick={onLeave} disabled={busy}>Leave match</Button>
            </div>

            {!player?.playerId ? (
              <div style={{ display: "grid", gap: 10, maxWidth: 520, margin: "0 auto" }}>
                <div className="muted">Set your player profile:</div>
                <div className="mobileRow" style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                  <input
                    className="ui-input"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    placeholder="e.g. Alex"
                    style={{ minWidth: 220 }}
                  />
                  <Button variant="primary" onClick={onSaveProfileAndGoLobby} disabled={busy || !playerName.trim()}>
                    Save & go to Lobby
                  </Button>
                </div>

                <div style={{ display: "grid", gap: 8 }}>
                  <div className="muted" style={{ fontSize: 13 }}>Emoji:</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
                    {EMOJIS.map((e) => (
                      <button
                        key={e}
                        onClick={() => setIcon(e)}
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 12,
                          border: e === icon ? "2px solid rgba(59,130,246,0.9)" : "1px solid rgba(148,163,184,0.25)",
                          background: "rgba(15,23,42,0.25)",
                          fontSize: 20,
                          cursor: "pointer",
                        }}
                        aria-label={`Pick ${e}`}
                        type="button"
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                  <div className="muted" style={{ fontSize: 12 }}>Selected: {icon}</div>
                </div>
              </div>
            ) : (
              <div className="mobileRow" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <Button variant="primary" onClick={() => nav("/lobby")}>Go to Lobby</Button>
                <Button variant="secondary" onClick={() => nav("/play")}>Play</Button>
                <Button variant="ghost" onClick={() => nav("/leaderboard")}>Leaderboard</Button>
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
