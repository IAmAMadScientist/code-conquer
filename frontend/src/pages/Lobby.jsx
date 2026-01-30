import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../components/AppShell";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import QRCode from "react-qr-code";
import ConfirmModal from "../components/ConfirmModal";
import { useDiceOverlay } from "../components/dice/DiceOverlayProvider";
import D20Die from "../components/D20Die";
import { getSession, clearSession, setSessionStarted } from "../lib/session";
import { getPlayer, fetchLobby, setReady, leaveSession, clearPlayer, rollLobbyD20 } from "../lib/player";

export default function Lobby() {
  const nav = useNavigate();
  const session = useMemo(() => getSession(), []);
  const me = useMemo(() => getPlayer(), []);
  const diceOverlay = useDiceOverlay();

  const [state, setState] = useState(null);
  const [busy, setBusy] = useState(false);
  const [rolling, setRolling] = useState(false);
  const [err, setErr] = useState(null);
  const [eventMsg, setEventMsg] = useState(null);
  const [qrOpen, setQrOpen] = useState(false);
  const [confirmLeaveOpen, setConfirmLeaveOpen] = useState(false);

  const canView = !!(session?.sessionId && me?.playerId);
  const joinUrl = session?.sessionCode ? `${window.location.origin}/join/${session.sessionCode}` : "";

  async function load() {
    if (!session?.sessionId) return;
    setErr(null);
    try {
      const s = await fetchLobby(session.sessionId);
      setState(s);
      setSessionStarted(!!s?.started);

      if (s?.sessionStatus === "FINISHED") {
        nav("/end", { replace: true });
        return;
      }

      if (s?.lastEventSeq && s?.lastEventMessage) {
        const key = `cc_evt_${session.sessionId}`;
        const lastSeen = Number(sessionStorage.getItem(key) || "0");
        if (s.lastEventSeq > lastSeen) {
          sessionStorage.setItem(key, String(s.lastEventSeq));
          setEventMsg(s.lastEventMessage);
          setTimeout(() => setEventMsg(null), 4200);
        }
      }

      if (s?.started) nav("/play");
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
    try {
      await diceOverlay.rollD20(() => rollLobbyD20(session.sessionId, me.playerId));
      await load();
    } catch (e) {
      setErr(e?.message || "Failed to roll");
      await load();
    } finally {
      setTimeout(() => setRolling(false), 980);
      setBusy(false);
    }
  }

  async function leaveLobby() {
    if (session?.sessionId && me?.playerId) {
      try {
        await leaveSession(session.sessionId, me.playerId);
      } catch {
        // ignore
      }
    }
    clearPlayer();
    clearSession();
    nav("/");
  }

  if (!canView) {
    return (
      <AppShell title="Lobby" subtitle="Join a match and set your profile first." showTabs activeTab="play" backTo={false}>
        <div className="panel stack">
          <div>
            <div className="title" style={{ fontSize: "var(--fs-3)" }}>Not ready</div>
            <div className="subtitle">You need to join a match and set your name + emoji first.</div>
          </div>
          <div className="row wrap">
            <Button variant="primary" onClick={() => nav("/")}>Go to Home</Button>
          </div>
        </div>
      </AppShell>
    );
  }

  const playersRaw = state?.players || [];
  const players = playersRaw.slice().sort((a, b) => (a.turnOrder || 0) - (b.turnOrder || 0));
  const meRow = players.find((p) => p.id === me.playerId);

  const hasTies = players.some((p) => p.tied);
  const tiedPlayers = players.filter((p) => p.tied);

  const canRoll = !state?.started && !state?.turnOrderLocked && !!meRow && (meRow.lobbyRoll == null || meRow.tied);
  const canReady = !!meRow && !state?.started && (meRow.lobbyRoll != null) && !meRow.tied;

  const allReady = players.length > 0 && players.every((p) => p.ready);
  const allRolled = players.length > 0 && players.every((p) => p.lobbyRoll !== null && p.lobbyRoll !== undefined);

  async function copyJoinLink() {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setEventMsg("Copied join link");
      setTimeout(() => setEventMsg(null), 2500);
    } catch {
      setEventMsg("Couldn't copy (clipboard blocked)");
      setTimeout(() => setEventMsg(null), 2500);
    }
  }

  return (
    <AppShell
      title="Lobby"
      subtitle={state?.turnOrderLocked ? "Turn order locked" : "Roll for turn order, then ready up"}
      showTabs
      activeTab="play"
      backTo={false}
      headerBadges={
        <>
          <Badge>Lobby</Badge>
          {session?.sessionCode ? <Badge variant="secondary">Match: {session.sessionCode}</Badge> : null}
          {me?.playerName ? <Badge variant="secondary">You: {me.playerIcon || "🙂"} {me.playerName}</Badge> : null}
        </>
      }
      rightPanel={
        <div className="panel stack">
          <div>
            <div className="kicker">Invite</div>
            <div className="title" style={{ fontSize: "var(--fs-3)" }}>Let others join</div>
          </div>

          <div className="stack tight">
            <div className="kicker">Join code</div>
            <div className="row between wrap">
              <Badge variant="secondary" style={{ fontSize: 14, padding: "8px 12px" }}>{session.sessionCode}</Badge>
              <Button variant="secondary" onClick={() => setQrOpen(true)} disabled={!joinUrl}>Show QR</Button>
            </div>
            <div className="muted" style={{ fontSize: "var(--fs-1)", lineHeight: 1.5 }}>
              Tip: If QR scanning opens a weird in-app browser, open it in Safari/Chrome for best layout.
            </div>
          </div>

          {joinUrl ? (
            <div className="stack tight">
              <Button variant="ghost" onClick={copyJoinLink}>Copy join link</Button>
              <div className="muted" style={{ fontSize: "var(--fs-0)" }}>{joinUrl}</div>
            </div>
          ) : null}
        </div>
      }
      actions={
        <div className="actionRow">
          <Button variant="secondary" onClick={() => setQrOpen(true)} disabled={!joinUrl}>QR</Button>
          <Button variant="primary" onClick={toggleReady} disabled={busy || (!meRow?.ready && !canReady)}>
            {meRow?.ready ? "Unready" : "Ready"}
          </Button>
        </div>
      }
    >
      <div className="panel stack">
        <div className="row between wrap">
          <div className="stack tight">
            <div className="title" style={{ fontSize: "var(--fs-3)" }}>Players</div>
            <div className="subtitle">
              {players.length} joined • {allRolled ? "All rolled" : "Waiting for rolls"} • {allReady ? "All ready" : "Not all ready"}
            </div>
          </div>

          <div className="row end wrap">
            <div style={{ width: 110 }}>
              <D20Die
                value={meRow?.tied ? "ROLL" : (meRow?.lobbyRoll ?? "?")}
                rolling={rolling}
                disabled={!canRoll || busy}
                onClick={doLobbyRoll}
              />
            </div>
            <div className="stack tight" style={{ alignItems: "flex-end" }}>
              <div className="kicker">Your roll</div>
              <div className="muted" style={{ fontSize: "var(--fs-1)" }}>
                {state?.turnOrderLocked
                  ? "Locked"
                  : canRoll
                    ? (meRow?.tied ? "Tie — roll again" : "Tap the D20")
                    : (meRow?.lobbyRoll != null ? "Rolled" : "Waiting")}
              </div>
            </div>
          </div>
        </div>

        {hasTies ? (
          <div className="panel" style={{ borderColor: "rgba(251,191,36,0.35)" }}>
            ⚠️ Tie — roll again: {tiedPlayers.map((p) => `${p.icon || "🙂"} ${p.name || "Player"}`).join(" • ")}
          </div>
        ) : null}

        {err ? (
          <div className="panel" style={{ borderColor: "rgba(251,113,133,0.35)" }}>
            ⚠️ {err}
          </div>
        ) : null}

        {eventMsg ? (
          <div className="panel">
            ℹ️ {eventMsg}
          </div>
        ) : null}

        <div className="stack tight" style={{ maxHeight: "42vh", overflow: "auto", paddingRight: 2 }}>
          {players.map((p, idx) => (
            <div key={p.id} className="row between wrap" style={{ padding: "10px 12px", borderRadius: 16, border: "1px solid rgba(148,163,184,0.14)", background: "rgba(2,6,23,0.18)" }}>
              <div className="row wrap" style={{ gap: 10 }}>
                <div style={{ fontSize: 22 }}>{p.icon || "🙂"}</div>
                <div className="stack tight" style={{ gap: 2 }}>
                  <div style={{ fontWeight: 850, letterSpacing: "-0.01em" }} className="wrapAnywhere">{p.name || "Player"}</div>
                  <div className="muted" style={{ fontSize: "var(--fs-0)" }}>
                    #{p.turnOrder ?? (idx + 1)} • D20={p.lobbyRoll ?? "?"}
                  </div>
                </div>
              </div>

              <div className="row wrap" style={{ justifyContent: "flex-end" }}>
                {p.tied ? <Badge variant="secondary">Tie</Badge> : null}
                <Badge variant={p.ready ? "secondary" : "default"}>{p.ready ? "Ready" : "Not ready"}</Badge>
              </div>
            </div>
          ))}
        </div>

        <div className="row between wrap">
          <Button variant="ghost" onClick={() => setConfirmLeaveOpen(true)}>Leave lobby</Button>
          <div className="muted" style={{ fontSize: "var(--fs-0)" }}>
            Once everyone is ready, the game will start automatically.
          </div>
        </div>
      </div>

      {qrOpen ? (
        <div className="sheetOverlay open" onClick={() => setQrOpen(false)}>
          <div className="sheet open" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560 }}>
            <div className="sheetHandle" />
            <div className="sheetHeader">
              <div style={{ fontWeight: 900 }}>Join via QR</div>
              <Button variant="ghost" onClick={() => setQrOpen(false)}>Close</Button>
            </div>
            <div className="sheetBody stack">
              <div className="panel" style={{ display: "grid", placeItems: "center" }}>
                <QRCode value={joinUrl} size={240} />
              </div>
              <div className="muted" style={{ fontSize: "var(--fs-0)", overflowWrap: "anywhere" }}>{joinUrl}</div>
            </div>
          </div>
        </div>
      ) : null}

      <ConfirmModal
        open={confirmLeaveOpen}
        title="Leave lobby?"
        message={
          "Do you really want to leave?\n\n" +
          "You will leave this match and will have to pick your name and icon again when you join next time."
        }
        confirmText="Leave"
        cancelText="Stay"
        danger
        onConfirm={() => {
          setConfirmLeaveOpen(false);
          leaveLobby();
        }}
        onClose={() => setConfirmLeaveOpen(false)}
      />
    </AppShell>
  );
}
