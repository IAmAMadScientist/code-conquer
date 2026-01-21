import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../components/AppShell";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import QRCode from "react-qr-code";
import { getSession, clearSession } from "../lib/session";
import { getPlayer, fetchLobby, setReady, leaveSession, clearPlayer, rollLobbyD20 } from "../lib/player";
import D20Die from "../components/D20Die";

export default function Lobby() {
  const nav = useNavigate();
  const session = useMemo(() => getSession(), []);
  const me = useMemo(() => getPlayer(), []);

  const [state, setState] = useState(null);
  const [eventMsg, setEventMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const [rolling, setRolling] = useState(false);
  const [err, setErr] = useState(null);

  const canView = !!(session?.sessionId && me?.playerId);
  const joinUrl = session?.sessionCode ? `${window.location.origin}/join/${session.sessionCode}` : "";

  async function load() {
    if (!session?.sessionId) return;
    setErr(null);
    try {
      const s = await fetchLobby(session.sessionId);
      setState(s);

      if (s?.sessionStatus === "FINISHED") {
        nav("/end", { replace: true });
        return;
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

  async function doLobbyRoll() {
    if (!session?.sessionId || !me?.playerId) return;
    setRolling(true);
    setBusy(true);
    setErr(null);
    // small client-side animation: flash random values while waiting for server
    const start = Date.now();
    const t = setInterval(() => {
      setState((prev) => {
        if (!prev) return prev;
        const players = (prev.players || []).map((p) =>
          p.id === me.playerId ? { ...p, lobbyRoll: Math.floor(Math.random() * 20) + 1 } : p
        );
        return { ...prev, players };
      });
    }, 70);
    try {
      await rollLobbyD20(session.sessionId, me.playerId);
      await load();
    } catch (e) {
      setErr(e?.message || "Failed to roll");
      await load();
    } finally {
      clearInterval(t);
      const elapsed = Date.now() - start;
      // keep animation visible at least ~420ms
      const wait = Math.max(0, 420 - elapsed);
      setTimeout(() => setRolling(false), wait);
      setBusy(false);
    }
  }

  async function leaveLobby() {
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

  const playersRaw = state?.players || [];
  const players = playersRaw.slice().sort((a, b) => (a.turnOrder || 0) - (b.turnOrder || 0));
  const meRow = players.find((p) => p.id === me.playerId);
  const allReady = players.length > 0 && players.every((p) => p.ready);
  const allRolled = players.length > 0 && players.every((p) => p.lobbyRoll !== null && p.lobbyRoll !== undefined);
  const tiedPlayers = players.filter((p) => p.tied);
  const hasTies = tiedPlayers.length > 0;

  // Display list for rolls: sort by roll desc, unrolled last.
  const rollRanking = playersRaw.slice().sort((a, b) => {
    const ar = a.lobbyRoll ?? -1;
    const br = b.lobbyRoll ?? -1;
    if (br !== ar) return br - ar;
    return (a.name || "").localeCompare(b.name || "");
  });

  const canRoll = !state?.started && !state?.turnOrderLocked && !!meRow && (meRow.lobbyRoll == null || meRow.tied);
  const canReady = !!meRow && !state?.started && (meRow.lobbyRoll != null) && !meRow.tied;

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
        {eventMsg ? (
          <div className="panel" style={{ border: "1px solid rgba(148,163,184,0.22)" }}>
            <div style={{ fontWeight: 800 }}>ℹ️ {eventMsg}</div>
          </div>
        ) : null}
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
          <Badge variant={allRolled && !hasTies ? "secondary" : "outline"}>
            {allRolled ? (hasTies ? "Tie – reroll needed" : "All rolled") : "Waiting for D20 rolls…"}
          </Badge>
          <Badge variant={allReady ? "secondary" : "outline"}>{allReady ? "All ready" : "Waiting…"}</Badge>
        </div>

        {/* D20 roll section */}
        <div className="panel" style={{ border: "1px solid rgba(148,163,184,0.18)", background: "rgba(2,6,23,0.25)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 15 }}>Turn order: Roll a D20</div>
              <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>
                Everyone rolls once. If there is a tie, only tied players roll again.
              </div>
            </div>
            <div style={{ display: "grid", justifyItems: "center", gap: 6 }}>
              <D20Die value={meRow?.lobbyRoll ?? "?"} rolling={rolling} disabled={!canRoll || busy} onClick={doLobbyRoll} />
              <div className="muted" style={{ fontSize: 12 }}>
                {state?.turnOrderLocked ? "Locked" : canRoll ? (meRow?.tied ? "Tie – reroll" : "Tap to roll") : (meRow?.lobbyRoll ? "Rolled" : "Waiting")}
              </div>
            </div>
          </div>

          {hasTies ? (
            <div style={{ marginTop: 10, padding: "10px 12px", borderRadius: 12, border: "1px solid rgba(251,191,36,0.25)", background: "rgba(251,191,36,0.08)" }}>
              <div style={{ fontWeight: 800 }}>⚠️ Tie! The tied players must reroll.</div>
              <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
                Tied: {tiedPlayers.map((p) => `${p.icon || "🙂"} ${p.name}`).join(", ")}
              </div>
            </div>
          ) : null}

          <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
            {rollRanking.map((p) => (
              <div
                key={p.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid rgba(148,163,184,0.18)",
                  background: p.tied ? "rgba(251,191,36,0.10)" : (p.id === me.playerId ? "rgba(59,130,246,0.10)" : "rgba(15,23,42,0.25)"),
                }}
              >
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <div style={{ fontSize: 20, width: 26, textAlign: "center" }}>{p.icon || "🙂"}</div>
                  <div>
                    <div style={{ fontWeight: 700 }}>
                      {p.name}{p.id === me.playerId ? " (You)" : ""}
                    </div>
                    <div className="muted" style={{ fontSize: 12 }}>
                      {p.lobbyRoll == null ? "Not rolled yet" : `Rolled: ${p.lobbyRoll}${p.tied ? " (tie)" : ""}`}
                    </div>
                  </div>
                </div>
                <Badge variant={p.lobbyRoll == null ? "outline" : (p.tied ? "outline" : "secondary")}>
                  {p.lobbyRoll == null ? "—" : p.lobbyRoll}
                </Badge>
              </div>
            ))}
          </div>
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
                  <div style={{ fontWeight: 700, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <span>{p.turnOrder}. {p.name}</span>
                    {p.lobbyRoll != null ? (
                      <span style={{ fontSize: 12, padding: "2px 8px", borderRadius: 999, border: "1px solid rgba(148,163,184,0.20)", opacity: 0.95 }}>
                        D20: {p.lobbyRoll}{p.tied ? " (tie)" : ""}
                      </span>
                    ) : (
                      <span style={{ fontSize: 12, padding: "2px 8px", borderRadius: 999, border: "1px solid rgba(148,163,184,0.14)", opacity: 0.6 }}>
                        D20: –
                      </span>
                    )}
                  </div>
                  <div className="muted" style={{ fontSize: 12 }}>{p.id === me.playerId ? "You" : "Player"}</div>
                </div>
              </div>
              <Badge variant={p.ready ? "secondary" : "outline"}>{p.ready ? "Ready" : "Not ready"}</Badge>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Button
            variant={meRow?.ready ? "secondary" : "primary"}
            onClick={toggleReady}
            disabled={busy || (!meRow?.ready && !canReady)}
          >
            {meRow?.ready ? "Unready" : "Ready"}
          </Button>
          <Button variant="ghost" onClick={leaveLobby}>Leave lobby</Button>
        </div>

        <div className="muted" style={{ fontSize: 13, lineHeight: 1.5 }}>
          When everyone is ready, the match starts automatically and players will move on to turn-based play.
        </div>
      </div>
    </AppShell>
  );
}
