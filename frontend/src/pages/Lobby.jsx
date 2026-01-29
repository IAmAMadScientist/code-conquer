import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../components/AppShell";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import QRCode from "react-qr-code";
import { getSession, clearSession, setSessionStarted } from "../lib/session";
import { getPlayer, fetchLobby, setReady, leaveSession, clearPlayer, rollLobbyD20 } from "../lib/player";
import D20Die from "../components/D20Die";
import { useDiceOverlay } from "../components/dice/DiceOverlayProvider";
import ConfirmModal from "../components/ConfirmModal";
// Sound toggle is global (AppShell header) and dice SFX timing is handled by the dice overlay.

export default function Lobby() {
  const nav = useNavigate();
  const session = useMemo(() => getSession(), []);
  const me = useMemo(() => getPlayer(), []);

  const [state, setState] = useState(null);
  const [eventMsg, setEventMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const [rolling, setRolling] = useState(false);
  const diceOverlay = useDiceOverlay();
  const [err, setErr] = useState(null);
  const [qrOpen, setQrOpen] = useState(false);
  const [confirmLeaveOpen, setConfirmLeaveOpen] = useState(false);

  // Floating player bubbles (no-scroll lobby)
  const cloudRef = useRef(null);

  const canView = !!(session?.sessionId && me?.playerId);
  const joinUrl = session?.sessionCode ? `${window.location.origin}/join/${session.sessionCode}` : "";

  const stableHash = (str) => {
    // tiny deterministic hash for layout
    let h = 2166136261;
    for (let i = 0; i < (str || "").length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0);
  };

  async function load() {
    if (!session?.sessionId) return;
    setErr(null);
    try {
      const s = await fetchLobby(session.sessionId);
      setState(s);

      // Keep a lightweight shared flag so the bottom tab can switch between Lobby/Play.
      setSessionStarted(!!s?.started);

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
      try { await leaveSession(session.sessionId, me.playerId); } catch {}
    }
    clearPlayer();
    clearSession();
    nav("/");
  }

  if (!canView) {
    return (
      <AppShell title="Lobby" subtitle="Join a match and set your profile first." showTabs activeTab="play" backTo={false} showBrand>
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

  // Single lobby list:
  // - while rolling, we rank by roll desc (unrolled last)
  // - once order is locked, we show turnOrder as the source of truth
  const lobbyList = playersRaw.slice().sort((a, b) => {
    const aHasOrder = a.turnOrder != null;
    const bHasOrder = b.turnOrder != null;
    if (state?.turnOrderLocked && aHasOrder && bHasOrder) return a.turnOrder - b.turnOrder;

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
      subtitle={""}
      showTabs
      activeTab="play"
      backTo={false}
      showBrand
      headerBadges={
        <>
          <Badge>Lobby</Badge>
          {session?.sessionCode ? <Badge variant="secondary">Match: {session.sessionCode}</Badge> : null}
          {me?.playerName ? <Badge variant="secondary">You: {me.playerIcon || "🙂"} {me.playerName}</Badge> : null}
        </>
      }
    >
      <style>{`
        /* Clean lobby layout:
           - One player "stage" box (floating avatars)
           - Edge buttons (QR, D20) outside the stage
           - Bottom actions pinned right above the tab bar
        */
        .lobbyRoot{ height:100%; overflow:hidden; display:flex; justify-content:center; }
        .lobbyWrap{ height:100%; width:100%; max-width: 720px; position:relative; }
        /* TabBar reserve in AppShell is ~84px (see ui.css). Keep it as a local var so we can pin buttons
           directly above the tab bar even though AppShell adds padding at the bottom. */
        :root{ --cc_tab_pad: 84px; --cc_lobby_actions_h: 100px; --cc_lobby_edge_h: 152px; }
        .lobbyStage{ position:absolute; left:12px; right:12px;
          /* keep all edge buttons ABOVE the stage */
          top: calc(12px + var(--cc_lobby_edge_h));
          /* leave room for the fixed bottom actions AND the fixed tab bar */
          bottom: calc(12px + var(--cc_tab_pad) + var(--cc_lobby_actions_h));
          overflow:hidden; border-radius:20px;
          border: 1px solid rgba(148,163,184,0.16);
          background: rgba(2,6,23,0.18);
        }
        .playerCloud{ position:absolute; inset:0; }

        /* Minimal HUD inside the stage */
        .stageHud{ position:absolute; left:12px; top:12px; display:flex; gap:8px; flex-wrap:wrap; z-index:5; }
        .pill{ padding:8px 10px; border-radius:999px; font-size:12px; font-weight:750;
          background: rgba(2,6,23,0.55); border: 1px solid rgba(148,163,184,0.18);
          backdrop-filter: blur(6px);
        }

        /* Edge buttons live OUTSIDE the stage (top row). */
        .edgeTopLeft{ position:absolute; left:12px; top:12px; z-index:30; display:grid; justify-items:center; gap:6px; }
        .edgeTopRight{ position:absolute; right:12px; top:12px; z-index:30; display:grid; justify-items:center; gap:10px; }
        .edgeDieWrap{ width: 96px; height: 96px; border-radius: 22px; overflow:hidden;
          display:grid; place-items:center;
          background: rgba(2,6,23,0.35);
          border: 1px solid rgba(148,163,184,0.18);
          box-shadow: 0 10px 30px rgba(0,0,0,0.22);
        }
        .edgeDieWrap > div{ transform: scale(0.86); transform-origin: center; }
        .edgeDiceWrap{ width: 96px; height: 96px; display:grid; place-items:center; overflow:hidden;
          border-radius: 18px;
          border: 1px solid rgba(148,163,184,0.18);
          background: rgba(2,6,23,0.20);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
        }
        .edgeDiceWrap > button{ transform: scale(0.82); transform-origin: center; }
        .edgeBtn{ border-radius:16px; padding:10px 12px; font-weight:850; }
        .edgeHint{ font-size:11px; opacity:0.85; }
        .pBubble{ position:absolute; display:grid; justify-items:center; gap:6px; padding:10px 12px; border-radius:16px;
          background: rgba(2,6,23,0.35); border: 1px solid rgba(148,163,184,0.18);
          box-shadow: 0 10px 30px rgba(0,0,0,0.25);
          transform: translate(-50%,-50%);
          touch-action:none;
          -webkit-user-select:none; user-select:none;
          animation: bob var(--bobDur) ease-in-out infinite alternate, drift var(--driftDur) ease-in-out infinite alternate;
        }
        .pAvatar{ width:44px; height:44px; border-radius:14px; display:grid; place-items:center; font-size:26px;
          background: rgba(148,163,184,0.10); border: 1px solid rgba(148,163,184,0.18);
        }
        .pName{ font-weight:800; font-size:12px; max-width: 120px; text-align:center; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .pSub{ font-size:11px; opacity:0.78; }
        .pRank{ position:absolute; top:-10px; right:-10px; width:28px; height:28px; border-radius:999px; display:grid; place-items:center;
          background: rgba(99,102,241,0.95); border: 2px solid rgba(2,6,23,0.55); font-weight:900; font-size:12px;
        }
        .pMe{ outline: 2px solid rgba(99,102,241,0.55); }
        .pWarn{ outline: 2px solid rgba(251,191,36,0.55); }
        @keyframes bob{ from{ transform: translate(-50%,-50%) translateY(-6px); } to{ transform: translate(-50%,-50%) translateY(6px); } }
        @keyframes drift{ from{ margin-left:-10px; margin-top:-6px; } to{ margin-left:10px; margin-top:6px; } }

        .qrOverlay{ position:fixed; inset:0; z-index:80; background: rgba(2,6,23,0.72); backdrop-filter: blur(6px);
          display:flex; align-items:center; justify-content:center; padding: 18px; }
        /* Bottom pinned actions (directly above the 3-tab bar) */
        .lobbyBottom{
          position:fixed;
          left: 50%;
          transform: translateX(-50%);
          width: min(720px, calc(100vw - 24px));
          /* Sit directly above the fixed tab bar */
          bottom: calc(8px + var(--cc_tab_pad) + env(safe-area-inset-bottom, 0px));
          z-index:55;
          display:grid; gap:10px;
          padding: 12px;
          border-radius: 22px;
          border: 1px solid rgba(71, 85, 105, 0.28);
          background: rgba(2, 6, 23, 0.62);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          box-shadow: var(--shadow2);
        }
        .lobbyBottomRow{ display:grid; gap:10px; }

        /* Compact toast for transient lobby events/errors (no stacked boxes) */
        .lobbyToast{ position:absolute; left:12px; right:12px; top: calc(12px + var(--cc_lobby_edge_h)); z-index:40;
          padding: 10px 12px; border-radius: 16px;
          border: 1px solid rgba(148,163,184,0.18);
          background: rgba(2,6,23,0.72);
          backdrop-filter: blur(10px);
          box-shadow: 0 12px 30px rgba(0,0,0,0.28);
          font-weight: 750;
          display:flex; align-items:center; justify-content:space-between; gap:10px;
        }
        .lobbyToast .muted{ font-weight:700; }
        .qrCard{ width:min(92vw, 420px); border-radius:18px; padding:16px; background: rgba(15,23,42,0.92);
          border:1px solid rgba(148,163,184,0.22); box-shadow: 0 20px 60px rgba(0,0,0,0.55);
          display:grid; gap:12px; }
        .qrTop{ display:flex; align-items:center; justify-content:space-between; gap:12px; }
        .qrTitle{ font-weight:900; font-size:16px; }
        .qrBox{ background:white; padding:12px; border-radius:14px; display:grid; justify-content:center; }
        .qrUrl{ font-size:12px; opacity:0.85; word-break:break-all; text-align:center; }

        @media (max-width: 420px){
          .pSub{ display:none; }
          .pName{ max-width: 92px; }
        }
      `}</style>

      <div className="lobbyRoot">
        <div className="lobbyWrap">
        {/* One clean stage box for the floating players */}
        <div className="lobbyStage" ref={cloudRef}>
          <div className="stageHud">
            <div className="pill">Players: {players.length}</div>
            {hasTies ? (
              <div className="pill" style={{ borderColor: "rgba(251,191,36,0.35)" }}>
                ⚠️ Tie: {tiedPlayers.map((p) => p.icon || "🙂").join(" ")}
              </div>
            ) : null}
          </div>

          <div className="playerCloud">
            {lobbyList.map((p, idx) => {
              const h = stableHash(p.id || p.name || "x");
              const x = 10 + (h % 80); // 10..89
              const y = 18 + ((Math.floor(h / 97) % 64)); // 18..81
              const bob = 1400 + (h % 1200);
              const drift = 2200 + (h % 2200);
              const rank = p.turnOrder ?? (p.lobbyRoll != null ? (idx + 1) : null);

              const bubbleCls = [
                "pBubble",
                p.id === me.playerId ? "pMe" : "",
                p.tied ? "pWarn" : "",
              ].filter(Boolean).join(" ");

              return (
                <div
                  key={p.id}
                  className={bubbleCls}
                  style={{ left: `${x}%`, top: `${y}%`, ["--bobDur"]: `${bob}ms`, ["--driftDur"]: `${drift}ms` }}
                  title={p.name}
                >
                  {rank ? <div className="pRank">{rank}</div> : null}
                  <div className="pAvatar">{p.icon || "🙂"}</div>
                  <div className="pName">{p.name || "Player"}</div>
                  <div className="pSub">
                    {p.lobbyRoll == null ? "Tap D20" : `D20 ${p.lobbyRoll}${p.tied ? " (tie)" : ""}`} • {p.ready ? "Ready" : "Not ready"}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Edge buttons live OUTSIDE the player stage (same height). */}
        <div className="edgeTopLeft">
          <div className="edgeDieWrap">
            <div>
              <D20Die value={meRow?.lobbyRoll ?? "?"} rolling={rolling} disabled={!canRoll || busy} onClick={doLobbyRoll} />
            </div>
          </div>
          <div className="edgeHint">
            {state?.turnOrderLocked
              ? "Locked"
              : canRoll
                ? (meRow?.tied ? "Tie – reroll" : "Tap")
                : (meRow?.lobbyRoll != null ? "Rolled" : "Waiting")}
          </div>
        </div>

        <div className="edgeTopRight">
          <Button className="edgeBtn" variant="secondary" onClick={() => setQrOpen(true)} disabled={!joinUrl}>
            Show QR
          </Button>
        </div>

        {/* Bottom actions pinned directly above the tab bar */}
        <div className="lobbyBottom">
          <Button
            className="fullWidthBtn"
            variant={meRow?.ready ? "secondary" : "primary"}
            onClick={toggleReady}
            disabled={busy || (!meRow?.ready && !canReady)}
          >
            {meRow?.ready ? "Unready" : "Ready"}
          </Button>
          <Button className="fullWidthBtn" variant="ghost" onClick={() => setConfirmLeaveOpen(true)}>Leave lobby</Button>
        </div>

        {/* Tiny toast-like message (no stacked panels) */}
        {eventMsg ? <div className="lobbyToast">ℹ️ {eventMsg}</div> : null}
        {err ? <div className="lobbyToast" style={{ borderColor: "rgba(251,113,133,0.35)" }}>⚠️ {err}</div> : null}

        {qrOpen ? (
          <div className="qrOverlay" onClick={() => setQrOpen(false)}>
            <div className="qrCard" onClick={(e) => e.stopPropagation()}>
              <div className="qrTop">
                <div>
                  <div className="qrTitle">Join via QR</div>
                  <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                    Let others scan this to join your match.
                  </div>
                </div>
                <Button variant="ghost" onClick={() => setQrOpen(false)}>Close</Button>
              </div>
              <div className="qrBox">
                <QRCode value={joinUrl} size={220} />
              </div>
              <div className="qrUrl">{joinUrl}</div>
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
        </div>
      </div>
    </AppShell>
  );
}
