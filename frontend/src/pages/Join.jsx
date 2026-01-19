import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import AppShell from "../components/AppShell";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { joinSessionByCode, getSession } from "../lib/session";
import { getPlayer, registerPlayer } from "../lib/player";

const EMOJIS = ["🦊","🐱","🐶","🐸","🐼","🦁","🐙","🦄","🐝","🐧","🐢","🦖","👾","🤖","🧠","🔥","⭐","🍀","🍕","🎲"];

export default function Join() {
  const { code } = useParams();

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const [playerName, setPlayerName] = useState("");
  const [icon, setIcon] = useState("🦊");

  const liveSession = useMemo(() => getSession(), [busy, err]);
  const livePlayer = useMemo(() => getPlayer(), [busy, err]);

  useEffect(() => {
    let cancelled = false;

    async function doJoin() {
      if (!code) return;

      // If already joined to the same code, don't re-join.
      const s = getSession();
      if (s?.sessionCode && s.sessionCode.toUpperCase() === code.toUpperCase()) return;

      setBusy(true);
      setErr(null);
      try {
        await joinSessionByCode(code);
        if (cancelled) return;
      } catch (e) {
        if (cancelled) return;
        setErr(e?.message || "Failed to join match");
      } finally {
        if (!cancelled) setBusy(false);
      }
    }

    doJoin();
    return () => {
      cancelled = true;
    };
  }, [code]);

  async function onSetProfile() {
    const s = getSession();
    if (!s?.sessionId) return;
    if (!playerName.trim()) return;

    setBusy(true);
    setErr(null);
    try {
      await registerPlayer(s.sessionId, playerName.trim(), icon);
      setPlayerName("");
    } catch (e) {
      setErr(e?.message || "Failed to set player profile");
    } finally {
      setBusy(false);
    }
  }

  const readyToLobby = !!(liveSession?.sessionId && livePlayer?.playerId);

  return (
    <AppShell
      title="Join Match"
      subtitle="Scan → join → pick name + emoji → lobby."
      headerBadges={
        <>
          <Badge>Join</Badge>
          {liveSession?.sessionCode ? <Badge variant="secondary">Match: {liveSession.sessionCode}</Badge> : null}
        </>
      }
      rightPanel={
        <div className="panel">
          <div style={{ fontSize: 16, fontWeight: 650 }}>Flow</div>
          <div className="muted" style={{ fontSize: 14, marginTop: 10, lineHeight: 1.5 }}>
            1) You joined a match by QR/code.<br />
            2) Pick your <strong>name</strong> and <strong>emoji</strong> once.<br />
            3) Go to the <strong>Lobby</strong> and press Ready.
          </div>
        </div>
      }
    >
      <div className="panel" style={{ display: "grid", gap: 12 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <Badge>Code: {(code || "").toUpperCase()}</Badge>
          {busy ? <span className="muted">Working…</span> : null}
          {err ? <span style={{ opacity: 0.9 }}>⚠️ {err}</span> : null}
        </div>

        {!liveSession?.sessionId ? (
          <div className="muted">Joining… (if this stays forever, the code might be invalid)</div>
        ) : livePlayer?.playerId ? (
          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <Badge variant="secondary">You are: {livePlayer.playerIcon || "🙂"} {livePlayer.playerName || "Player"}</Badge>
            </div>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            <div className="muted">Pick your player name and emoji:</div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
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
              <Button variant="primary" onClick={onSetProfile} disabled={busy || !playerName.trim()}>
                Save profile
              </Button>
            </div>

            <div style={{ display: "grid", gap: 8 }}>
              <div className="muted" style={{ fontSize: 13 }}>Emoji:</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
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
        )}

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link to="/">
            <Button variant="ghost">Home</Button>
          </Link>
          <Link to="/lobby">
            <Button variant="primary" disabled={!readyToLobby}>
              Go to Lobby
            </Button>
          </Link>
        </div>

        {!readyToLobby ? (
          <div className="muted" style={{ fontSize: 13 }}>
            Note: you can only enter the lobby after you joined the match and saved your profile.
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}
