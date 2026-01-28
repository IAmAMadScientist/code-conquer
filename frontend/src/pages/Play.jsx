import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import AppShell from "../components/AppShell";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { getSession, clearSession, setSessionStarted } from "../lib/session";
import { getPlayer, fetchLobby, leaveSession, clearPlayer, rollTurnD6, chooseTurnPath, startTurnChallenge, applySpecialCard } from "../lib/player";
import D6Die from "../components/D6Die";
import EventFeed from "../components/EventFeed";
import PullToRefresh from "../components/PullToRefresh";
import ConfirmModal from "../components/ConfirmModal";
// Sound toggle is global (AppShell header) and dice SFX timing is handled by the dice overlay.

export default function Play() {
  const nav = useNavigate();
  const loc = useLocation();
  const session = useMemo(() => getSession(), []);
  const me = useMemo(() => getPlayer(), []);

  const [state, setState] = useState(null);
  const [err, setErr] = useState(null);
  const [summary, setSummary] = useState(loc.state?.turnSummary || null);
  const [turnMsg, setTurnMsg] = useState(null);
  const [pendingChoices, setPendingChoices] = useState(null);

  // Special deck modal (when landing on SPECIAL)
  const [specialOpen, setSpecialOpen] = useState(false);
  const [specialCard, setSpecialCard] = useState("BOOST");
  const [specialTarget, setSpecialTarget] = useState("");
  const [boostOptions, setBoostOptions] = useState([]);
  const [boostTo, setBoostTo] = useState("");
  const [specialSubmitting, setSpecialSubmitting] = useState(false);

  const [confirmLeaveOpen, setConfirmLeaveOpen] = useState(false);

  const canView = !!(session?.sessionId && me?.playerId);

  // Reset per-card sub-selections when switching card.
  useEffect(() => {
    setBoostOptions([]);
    setBoostTo("");
  }, [specialCard]);

  async function load() {
    if (!session?.sessionId) return;
    setErr(null);
    try {
      const s = await fetchLobby(session.sessionId);
      setState(s);

      // Keep a lightweight shared flag so the bottom tab can switch between Lobby/Play.
      setSessionStarted(!!s?.started);

      // If the match is finished, go to endscreen.
      if (s?.sessionStatus === "FINISHED") {
        nav("/end", { replace: true });
        return;
      }

      // If the session is no longer waiting for a path choice, clear any stale local UI.
      if (s?.turnStatus !== "AWAITING_PATH_CHOICE") {
        setPendingChoices(null);
      }

      // Sync pending fork choices on refresh/polling.
      if (s?.turnStatus === "AWAITING_PATH_CHOICE" && s?.pendingForkNodeId) {
        const opts = Array.isArray(s?.pendingForkOptions) ? s.pendingForkOptions : null;
        setPendingChoices((prev) => {
          // Keep existing options if we already have them, otherwise take from lobby payload.
          if (prev && prev.forkNodeId === s.pendingForkNodeId) {
            if ((!prev.options || prev.options.length === 0) && opts && opts.length) {
              return { ...prev, remainingSteps: s.pendingRemainingSteps, options: opts };
            }
            return { ...prev, remainingSteps: s.pendingRemainingSteps };
          }
          return { forkNodeId: s.pendingForkNodeId, remainingSteps: s.pendingRemainingSteps, options: opts || [] };
        });
      } else {
        setPendingChoices(null);
      }

      // Options are now included in lobby payload (pendingForkOptions) so refresh is safe.

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

  // Auto-open the Special deck modal when the backend requests it.
  useEffect(() => {
    const ts = String(state?.turnStatus || "");
    const awaiting = ts === "AWAITING_SPECIAL_CARD";

    // Only open when the backend is explicitly waiting for a Special card.
    // (Opening just because we *saw* a SPECIAL event can desync with the backend and cause a 423 Locked loop.)
    if (awaiting) {
      setSpecialOpen(true);
      return;
    }

    setSpecialOpen(false);
    setSpecialTarget("");
    setBoostOptions([]);
    setBoostTo("");
    setSpecialSubmitting(false);
  }, [state?.turnStatus, state?.currentPlayerId, state?.lastEventType, me?.playerId]);


  async function doStartChallenge() {
    if (!session?.sessionId || !me?.playerId) return;
    setErr(null);
    try {
      const ch = await startTurnChallenge(session.sessionId, me.playerId);
      nav(ch.route, { state: { challenge: ch } });
    } catch (e) {
      setErr(e?.message || "Failed to start challenge");
    }
  }

  async function doRollD6() {
    if (!session?.sessionId || !me?.playerId) return;
    setErr(null);
    try {
      const r = await rollTurnD6(session.sessionId, me.playerId);
      if (r?.turnStatus === "AWAITING_PATH_CHOICE") {
        setPendingChoices({
          forkNodeId: r.forkNodeId,
          remainingSteps: r.remainingSteps,
          options: r.options || [],
          diceRoll: r.diceRoll,
        });
        setTurnMsg(`🎲 Rolled ${r.diceRoll}. Choose a path.`);
      } else {
        setPendingChoices(null);
        if (r?.diceRoll) setTurnMsg(`🎲 Rolled ${r.diceRoll}. Moved to ${r.positionNodeId} (${r.positionType}).`);
      }
      // Refresh lobby state so other UI updates (turnStatus/position) are shown.
      load();
      setTimeout(() => setTurnMsg(null), 4500);
      return r;
    } catch (e) {
      setErr(e?.message || "Roll failed");
      throw e;
    }
  }

  async function doChoosePath(toNodeId) {
    if (!session?.sessionId || !me?.playerId) return;
    setErr(null);
    try {
      const r = await chooseTurnPath(session.sessionId, me.playerId, toNodeId);
      if (r?.turnStatus === "AWAITING_PATH_CHOICE") {
        setPendingChoices({
          forkNodeId: r.forkNodeId,
          remainingSteps: r.remainingSteps,
          options: r.options || [],
          diceRoll: r.diceRoll,
        });
        setTurnMsg(`➡️ Choose next path (remaining ${r.remainingSteps}).`);
      } else {
        setPendingChoices(null);
        setTurnMsg(`✅ Moved to ${r.positionNodeId} (${r.positionType}).`);
      }
      load();
      setTimeout(() => setTurnMsg(null), 4500);
    } catch (e) {
      setErr(e?.message || "Choice failed");
    }
  }

  const SPECIAL_CARDS = [
    { id: "PERMISSION_DENIED", label: "Permission denied", img: "/specialcards/permission_denied.png", needsTarget: true },
    { id: "RAGE_BAIT", label: "Rage Bait", img: "/specialcards/rage_bait.png", needsTarget: true },
    { id: "REFACTOR", label: "Refactor", img: "/specialcards/refactor.png", needsTarget: false },
    { id: "SECOND_CHANCE", label: "Second Chance", img: "/specialcards/second_chance.png", needsTarget: false },
    { id: "SHORTCUT_FOUND", label: "Shortcut found", img: "/specialcards/shortcut_found.png", needsTarget: false },
    { id: "ROLLBACK", label: "Rollback", img: "/specialcards/rollback.png", needsTarget: true },
    { id: "BOOST", label: "Boost", img: "/specialcards/boost.png", needsTarget: false },
    { id: "JAIL", label: "JAIL", img: "/specialcards/jail.png", needsTarget: false },
  ];

  async function doApplySpecial() {
    if (!session?.sessionId || !me?.playerId) return;
    if (specialSubmitting) return;
    setErr(null);
    setSpecialSubmitting(true);
    try {
      const cardDef = SPECIAL_CARDS.find((c) => c.id === specialCard);
      if (cardDef?.needsTarget && !specialTarget) {
        setErr("Please choose a target player for this card.");
        setSpecialSubmitting(false);
        return;
      }
      // BOOST: if backend detected a fork, it will respond with needChoice + options.
      if (specialCard === "BOOST" && boostOptions.length > 0 && !boostTo) {
        setErr("Please choose a path for Boost.");
        setSpecialSubmitting(false);
        return;
      }

      const r = await applySpecialCard(
        session.sessionId,
        me.playerId,
        specialCard,
        specialTarget || undefined,
        specialCard === "BOOST" ? (boostTo || undefined) : undefined
      );

      if (r?.needChoice) {
        setBoostOptions(r.options || []);
        setBoostTo("");
        setErr("Boost hit a fork — please choose the path.");
        setSpecialSubmitting(false);
        return;
      }
      setSpecialOpen(false);
      setSpecialTarget("");
      setBoostOptions([]);
      setBoostTo("");
      setTurnMsg("🃏 Special card activated.");
      setSpecialSubmitting(false);
      load();
      setTimeout(() => setTurnMsg(null), 3500);
    } catch (e) {
      const msg = String(e?.message || "");
      // If the backend says the action is locked, we likely desynced (already resolved or no longer awaiting).
      // Sync state and don't leave the user stuck in the modal.
      if (msg.includes("423") || msg.toLowerCase().includes("locked")) {
        setSpecialSubmitting(false);
        setSpecialOpen(false);
        setSpecialTarget("");
        setBoostOptions([]);
        setBoostTo("");
        setTurnMsg("Special already resolved — synced.");
        load();
        setTimeout(() => setTurnMsg(null), 3500);
        return;
      }
      setSpecialSubmitting(false);
      setErr(e?.message || "Special card failed");
    }
  }

  async function leaveGame() {
    setConfirmLeaveOpen(true);
  }

  async function performLeaveGame() {
    if (session?.sessionId && me?.playerId) {
      try { await leaveSession(session.sessionId, me.playerId); } catch {}
    }
    clearPlayer();
    clearSession();
    nav("/");
  }



  if (!canView) {
    return (
      <AppShell title="Play" subtitle="Join a match and set your profile first." showTabs activeTab="play" backTo={false} showBrand>
        <div className="panel">
          <div style={{ fontWeight: 750, marginBottom: 8 }}>Not ready</div>
          <div className="muted">You need to be in a match and have a player profile.</div>
        </div>
      </AppShell>
    );
  }

  const players = (state?.players || []).slice().sort((a, b) => a.turnOrder - b.turnOrder);
  const currentPlayer = players.find((p) => p.id === state?.currentPlayerId);
  const meState = players.find((p) => p.id === me?.playerId);
  const isMyTurn = !!(state?.started && state?.currentPlayerId && state.currentPlayerId === me.playerId);
  const waitingForDice = state?.turnStatus === "AWAITING_D6_ROLL";
  const waitingForPath = state?.turnStatus === "AWAITING_PATH_CHOICE";
  const canStartChallenge = isMyTurn && state?.turnStatus === "IDLE";
  const myFieldType = meState?.positionType || null;
  // Fork nodes stay FORK fields, but if you END your move on a fork (turnStatus === IDLE)
  // they should behave like a MEDIUM challenge field.
  const hasChallengeOnField = myFieldType === "EASY" || myFieldType === "MEDIUM" || myFieldType === "HARD" || myFieldType === "FORK";

  // Player-facing turn indicator (no internal node ids).
  const turnLabel = useMemo(() => {
    if (!state?.started) return "Waiting for start";
    if (!players.length || !me?.playerId || !state?.currentPlayerId) return "";
    if (isMyTurn) return "Your turn: NOW";

    const idxMe = players.findIndex((p) => p.id === me.playerId);
    const idxCur = players.findIndex((p) => p.id === state.currentPlayerId);
    if (idxMe < 0 || idxCur < 0) return "";
    const n = players.length;
    const dist = (idxMe - idxCur + n) % n;
    if (dist === 1) return "Your turn: NEXT";
    return `Your turn in: ${dist} turns`;
  }, [state?.started, state?.currentPlayerId, players, me?.playerId, isMyTurn]);

  return (
    <AppShell
      title="Play"
      subtitle={""}
      showTabs
      activeTab="play"
      backTo={false}
      showBrand
      headerBadges={
        <>
          {session?.sessionCode ? <Badge variant="secondary">Match: {session.sessionCode}</Badge> : null}
          {me?.playerName ? <Badge variant="secondary">You: {me.playerIcon || "🙂"} {me.playerName}</Badge> : null}
          <Badge variant={isMyTurn ? "secondary" : "outline"}>{turnLabel}</Badge>
        </>
      }
    >
      {specialOpen ? createPortal((
        <div
          className="specialOverlay"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.65)",
            zIndex: 200,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={() => {
            // Don't allow closing: special resolution is required to continue.
          }}
        >
          <div
            className="panel specialPanel"
            style={{
              width: "min(520px, 100vw)",
              border: "1px solid rgba(148,163,184,0.22)",
              maxHeight: "calc(100dvh - 24px)",
              overflow: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 6 }}>🃏 Special Field</div>
            <div className="muted" style={{ lineHeight: 1.5, marginBottom: 12 }}>
              Draw <strong>a real-life card</strong> from the Special deck and select it here.
            </div>

            {!isMyTurn ? (
              <div className="panel" style={{ marginBottom: 12, border: "1px solid rgba(148,163,184,0.18)" }}>
                <div style={{ fontWeight: 800 }}>⏳ Waiting…</div>
                <div className="muted" style={{ marginTop: 4, lineHeight: 1.4 }}>
                  The current player is selecting their Special card.
                </div>
              </div>
            ) : null}

            <div style={{ display: "grid", gap: 10 }}>
              <label style={{ display: "grid", gap: 6 }}>
                <div style={{ fontWeight: 700 }}>Which card did you draw?</div>
                <select
                  value={specialCard}
                  onChange={(e) => setSpecialCard(e.target.value)}
                  disabled={!isMyTurn}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 12,
                    border: "1px solid rgba(148,163,184,0.25)",
                    background: "rgba(15,23,42,0.35)",
                    color: "inherit",
                  }}
                >
                  {SPECIAL_CARDS.map((c) => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
              </label>

              {SPECIAL_CARDS.find((c) => c.id === specialCard)?.img ? (
                <div style={{ display: "grid", placeItems: "center" }}>
                  <img
                    src={SPECIAL_CARDS.find((c) => c.id === specialCard).img}
                    alt={specialCard}
                    className="specialCardImg"
                    style={{ width: "min(300px, 86vw)", borderRadius: 12, border: "1px solid rgba(148,163,184,0.18)", height: "auto" }}
                  />
                </div>
              ) : null}

              {SPECIAL_CARDS.find((c) => c.id === specialCard)?.needsTarget ? (
                <label style={{ display: "grid", gap: 6 }}>
                  <div style={{ fontWeight: 700 }}>Target player</div>
                  <select
                    value={specialTarget}
                    onChange={(e) => setSpecialTarget(e.target.value)}
                    disabled={!isMyTurn}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 12,
                      border: "1px solid rgba(148,163,184,0.25)",
                      background: "rgba(15,23,42,0.35)",
                      color: "inherit",
                    }}
                  >
                    <option value="">Select…</option>
                    {(state?.players || []).filter((p) => p.id !== me?.playerId).map((p) => (
                      <option key={p.id} value={p.id}>{(p.icon || "🙂") + " " + (p.name || "Player")}</option>
                    ))}
                  </select>
                </label>
              ) : null}

              {specialCard === "BOOST" && boostOptions.length > 0 ? (
                <label style={{ display: "grid", gap: 6 }}>
                  <div style={{ fontWeight: 700 }}>Boost: choose the path (fork)</div>
                  <select
                    value={boostTo}
                    onChange={(e) => setBoostTo(e.target.value)}
                    disabled={!isMyTurn}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 12,
                      border: "1px solid rgba(148,163,184,0.25)",
                      background: "rgba(15,23,42,0.35)",
                      color: "inherit",
                    }}
                  >
                    <option value="">Select…</option>
                    {boostOptions.map((o) => (
                      <option key={o.to} value={o.to}>{o.label}</option>
                    ))}
                  </select>
                </label>
              ) : null}

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 6 }}>
                <Button onClick={doApplySpecial} disabled={!isMyTurn || specialSubmitting}>Activate</Button>
              </div>
            </div>
          </div>
        </div>
      ), document.body) : null}

      <style>{`
        .playRoot{ height:100%; min-height:0; display:flex; flex-direction:column; gap:12px; overflow:hidden; }
        .playTop{ flex:0 0 auto; }
        .playMid{ flex:1 1 auto; min-height:0; overflow:auto; padding-right:4px; }
        .playCard{ display:grid; gap:12px; }
        .turnRow{ display:flex; gap:10px; flex-wrap:wrap; align-items:center; }
        .forkRow{ display:flex; gap:10px; flex-wrap:wrap; }

        /* Special card modal: mobile-first full-screen sheet */
        .specialOverlay{
          padding: max(env(safe-area-inset-top), 12px) 12px max(env(safe-area-inset-bottom), 12px);
        }
        .specialPanel{ -webkit-overflow-scrolling: touch; }
        .specialCardImg{ display:block; max-width:100%; }
        @media (max-width: 640px){
          .specialOverlay{
            padding: env(safe-area-inset-top) 0 env(safe-area-inset-bottom);
            align-items: stretch;
          }
          .specialPanel{
            width: 100vw !important;
            height: 100dvh;
            max-height: 100dvh !important;
            border-radius: 0 !important;
            border-left: 0 !important;
            border-right: 0 !important;
          }
          .specialCardImg{ width: min(360px, 88vw) !important; }
        }
        @media (min-width: 900px){
          .playRoot{ max-width: 720px; margin: 0 auto; width:100%; }
        }
      `}</style>

      <PullToRefresh onRefresh={load}>
        <div className="playRoot">
          <div className="playTop">
            <EventFeed sessionId={session.sessionId} title="Game feed" limit={5} />
          </div>

          <div className="playMid" style={{ position: "relative" }}>
            {/* Reserve space under the fixed (collapsed) EventFeed so it never overlaps content. */}
            <div style={{ height: "calc(var(--cc-eventfeed-h, 72px) + 8px)" }} aria-hidden />

            {/* Floating banners (do not push layout) */}
            {(turnMsg || summary) ? (
              <div
                style={{
                  position: "absolute",
                  top: "calc(var(--cc-eventfeed-h, 72px) + 8px)",
                  left: 0,
                  right: 0,
                  padding: "0 12px",
                  zIndex: 5,
                  pointerEvents: "none",
                  display: "grid",
                  gap: 10,
                }}
              >
                {turnMsg ? (
                  <div className="panel" style={{ border: "1px solid rgba(148,163,184,0.22)" }}>
                    <div style={{ fontWeight: 800 }}>ℹ️ {turnMsg}</div>
                  </div>
                ) : null}

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
              </div>
            ) : null}

            <div className="panel playCard">
              {err ? <div style={{ opacity: 0.9 }}>⚠️ {err}</div> : null}

              {/* NOTE: turnMsg + summary are rendered as floating overlays above */}

              {!state?.started ? (
                <div className="muted" style={{ lineHeight: 1.5 }}>
                  Match not started yet. Use the <strong>Lobby</strong> tab below to roll the D20 and press Ready.
                </div>
              ) : (
                <>
                  <div className="turnRow">
                    {currentPlayer ? (
                      <Badge variant="secondary">Current: {currentPlayer.icon || "🙂"} {currentPlayer.name}</Badge>
                    ) : null}
                    {typeof state?.lastDiceRoll === "number" ? (
                      <Badge variant="outline">Last D6: {state.lastDiceRoll}</Badge>
                    ) : null}
                    {myFieldType ? (
                      <Badge variant="outline">Field: {myFieldType}</Badge>
                    ) : null}
                  </div>

                  {/* D6 roll */}
                  {isMyTurn && waitingForDice ? (
                    <div style={{ display: "grid", gap: 10 }}>
                      <D6Die value={state?.lastDiceRoll || null} onRoll={doRollD6} disabled={!isMyTurn} />
                    </div>
                  ) : null}

                  {/* Fork choice */}
                  {isMyTurn && waitingForPath ? (
                    <div style={{ display: "grid", gap: 10 }}>
                      <div className="muted">Fork! Choose your path:</div>
                      <div className="forkRow">
                        {(pendingChoices?.options || []).map((opt) => (
                          <Button key={opt?.to || opt} variant="secondary" onClick={() => doChoosePath(opt?.to || opt)}>
                            {opt?.label ? opt.label : "Choose"}
                          </Button>
                        ))}
                        {!pendingChoices?.options?.length ? <div className="muted">(Loading options…)</div> : null}
                      </div>
                    </div>
                  ) : null}

                  {!canStartChallenge ? (
                    <div className="muted" style={{ fontSize: 13 }}>
                      {waitingForDice ? "Roll the D6." : waitingForPath ? "Choose a fork path." : ""}
                    </div>
                  ) : null}
                </>
              )}
            </div>
          </div>

          {/* Bottom actions: as low as possible, directly above the tab bar */}
          <div className="stickyActions hasTabs" style={{ marginTop: 0 }}>
            <div className="stickyActionsRow">
              <Button
                className="fullWidthBtn"
                variant="primary"
                onClick={doStartChallenge}
                disabled={!canStartChallenge || !hasChallengeOnField}
              >
                Start challenge
              </Button>
              {canStartChallenge && !hasChallengeOnField ? (
                <div className="muted" style={{ fontSize: 12, textAlign: "center" }}>
                  No challenge on this field.
                </div>
              ) : null}
              <Button className="fullWidthBtn" variant="ghost" onClick={leaveGame}>Leave game</Button>
            </div>
          </div>
        </div>
      </PullToRefresh>

      <ConfirmModal
        open={confirmLeaveOpen}
        title="Leave game?"
        message={
          "Do you really want to leave the game?\n\n" +
          "You will leave the match and will need to choose your name + icon again the next time you join via QR."
        }
        confirmText="Leave"
        cancelText="Stay"
        danger
        onConfirm={() => {
          setConfirmLeaveOpen(false);
          performLeaveGame();
        }}
        onClose={() => setConfirmLeaveOpen(false)}
      />
    </AppShell>
  );
}
