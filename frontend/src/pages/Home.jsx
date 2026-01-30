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
        <div className="panel stack">
          <div>
            <div className="kicker">Quick start</div>
            <div className="title" style={{ fontSize: "var(--fs-3)" }}>Get a match running in under a minute</div>
          </div>
          <div className="stack tight muted" style={{ lineHeight: 1.6 }}>
            <div>1) Create a match (host) or join with a 6‑digit code</div>
            <div>2) Pick a name + emoji</div>
            <div>3) Head to the lobby and press Ready</div>
          </div>
        </div>
      }
    >
      <div className="panel stack mobileCenter">
        {err ? <div style={{ opacity: 0.9 }}>⚠️ {err}</div> : null}

        {!session?.sessionId ? (
          <>
            <div>
              <div className="title" style={{ fontSize: "var(--fs-3)" }}>Start a new match</div>
              <div className="subtitle">Host the game and share the code with your friends.</div>
            </div>

            <div className="row wrap mobileRow">
              <Button variant="primary" onClick={onCreate} disabled={busy}>
                Create match
              </Button>
            </div>

            <div className="divider" />

            <div className="stack tight">
              <div className="kicker">Or join by code</div>
              <div className="row wrap mobileRow">
                <input
                  className="ui-input"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  placeholder="6-digit code"
                  inputMode="numeric"
                  style={{ textTransform: "uppercase" }}
                />
                <Button variant="secondary" onClick={onJoinByCode} disabled={busy || !joinCode.trim()}>
                  Join
                </Button>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="row wrap mobileRow between">
              <Badge>Active match: {session.sessionCode}</Badge>
              <Button variant="secondary" onClick={onLeave} disabled={busy}>
                Leave
              </Button>
            </div>

            {!player?.playerId ? (
              <div className="stack" style={{ maxWidth: 560, margin: "0 auto" }}>
                <div>
                  <div className="title" style={{ fontSize: "var(--fs-3)" }}>Create your player</div>
                  <div className="subtitle">This name + emoji will show up in the lobby and on the board.</div>
                </div>

                <div className="row wrap mobileRow">
                  <input
                    className="ui-input"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    placeholder="e.g. Alex"
                  />
                  <Button variant="primary" onClick={onSaveProfileAndGoLobby} disabled={busy || !playerName.trim()}>
                    Continue
                  </Button>
                </div>

                <div className="stack tight">
                  <div className="kicker">Pick an emoji</div>
                  <div className="chips" style={{ justifyContent: "center" }}>
                    {EMOJIS.map((e) => (
                      <button
                        key={e}
                        onClick={() => setIcon(e)}
                        className={e === icon ? "emojiPick active" : "emojiPick"}
                        aria-label={`Pick ${e}`}
                        type="button"
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                  <div className="muted" style={{ fontSize: "var(--fs-0)" }}>Selected: {icon}</div>
                </div>
              </div>
            ) : (
              <div className="row wrap mobileRow">
                <Button variant="primary" onClick={() => nav("/lobby")}>Lobby</Button>
                <Button variant="secondary" onClick={() => nav("/play")}>Play</Button>
                <Button variant="ghost" onClick={() => nav("/leaderboard")}>Scores</Button>
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
