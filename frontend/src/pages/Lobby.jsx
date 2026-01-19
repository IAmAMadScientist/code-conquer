import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../components/AppShell";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import QRCode from "react-qr-code";
import { getSession } from "../lib/session";
import { getPlayer, fetchLobby, setReady } from "../lib/player";

export default function Lobby() {
  const nav = useNavigate();
  const session = useMemo(() => getSession(), []);
  const me = useMemo(() => getPlayer(), []);

  const [state, setState] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const canView = !!(session?.sessionId && me?.playerId);
  const joinUrl = session?.sessionCode ? `${window.location.origin}/join/${session.sessionCode}` : "";

  async function load() {
    if (!session?.sessionId) return;
    setErr(null);
    try {
      const s = await fetchLobby(session.sessionId);
      setState(s);

      // Once started, lobby is done -> go to play.
      if (s?.started) {
        nav("/play");
      }
    } catch (e) {
      setErr(e?.message || "Failed to load lobby");
    }
  }

  useEffect(() => {
    if (!canView) return;
    load();
    const t = setInterval(load, 1500);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function toggleReady() {
    if (!session?.sessionId || !me?.playerId) return;
    const currentlyReady = !!state?.players?.find((p) => p.id === me.playerId)?.ready;

    setBusy(true);
    setErr(null);
    try {
      await setReady(session.sessionId, me.playerId, !currentlyReady);
      await load();
    } catch (e) {
      setErr(e?.message || "Failed to set ready");
    } finally {
      setBusy(false);
    }
  }

  if (!canView) {
    return (
      <AppShell title="Lobby" subtitle="Join a match and set your profile first.">
        <div className="panel">
          <div style={{ fontWeight: 750, marginBottom: 8 }}>Not ready</div>
          <div className="muted" style={{ marginBottom: 12 }}>
            You need to join a match and set your name + emoji first.
          </div>
        </div>
      </AppShell>
    );
  }

  const players = (state?.players || []).slice().sort((a, b) => a.turnOrder - b.turnOrder);
  const meRow = players.find((p) => p.id === me.playerId);
  const allReady = players.length > 0 && players.every((p) => p.ready);

  return (
    <AppShell
      title="Lobby"
      subtitle="Scan to join, then everyone presses Ready. Lobby is only for the start."
      headerBadges={
        <>
          <Badge>Lobby</Badge>
          {session?.sessionCode ? <Badge variant="secondary">Match: {session.sessionCode}</Badge> : null}
          {me?.playerName ? <Badge variant="secondary">You: {me.playerIcon || "🙂"} {me.playerName}</Badge> : null}
        </>
      }
      rightPanel={
        <div className="panel">
          <div style={{ fontSize: 16, fontWeight: 650 }}>Join QR</div>
          <div className="muted" style={{ fontSize: 14, marginTop: 10, lineHeight: 1.5 }}>
            Others can scan this QR to join this match.
          </div>
        </div>
      }
    >
      <div className="panel" style={{ display: "grid", gap: 12 }}>
        {err ? <div style={{ opacity: 0.9 }}>⚠️ {err}</div> : null}

        <div style={{ display: "grid", gap: 8, justifyItems: "center" }}>
          <div style={{ background: "white", padding: 10, borderRadius: 12 }}>
            <QRCode value={joinUrl} size={180} />
          </div>
          <div className="muted" style={{ fontSize: 12, wordBreak: "break-all", textAlign: "center" }}>
            {joinUrl}
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <Badge variant="secondary">Players: {players.length}</Badge>
          <Badge variant={allReady ? "secondary" : "outline"}>{allReady ? "All ready" : "Waiting…"}</Badge>
        </div>

        <div style={{ display: "grid", gap: 8 }}>
          {players.map((p) => (
            <div
              key={p.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid rgba(148,163,184,0.18)",
                background: p.id === me.playerId ? "rgba(59,130,246,0.10)" : "rgba(15,23,42,0.25)",
              }}
            >
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <div style={{ fontSize: 20, width: 26, textAlign: "center" }}>{p.icon || "🙂"}</div>
                <div>
                  <div style={{ fontWeight: 700 }}>
                    {p.turnOrder}. {p.name}
                  </div>
                  <div className="muted" style={{ fontSize: 12 }}>{p.id === me.playerId ? "You" : "Player"}</div>
                </div>
              </div>
              <Badge variant={p.ready ? "secondary" : "outline"}>{p.ready ? "Ready" : "Not ready"}</Badge>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Button variant={meRow?.ready ? "secondary" : "primary"} onClick={toggleReady} disabled={busy}>
            {meRow?.ready ? "Unready" : "Ready"}
          </Button>
          <Button variant="ghost" onClick={() => nav("/leaderboard")}>Leaderboard</Button>
        </div>

        <div className="muted" style={{ fontSize: 13, lineHeight: 1.5 }}>
          When everyone is ready, the match starts automatically and players will move on to turn-based play.
        </div>
      </div>
    </AppShell>
  );
}
