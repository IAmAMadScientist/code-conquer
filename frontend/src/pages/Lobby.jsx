import { SESSION_STATUS } from "../lib/constants";
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../components/AppShell";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import QRCode from "react-qr-code";
import ConfirmModal from "../components/ConfirmModal";
import { useToast } from "../components/ui/use-toast";
import { toastError, toastInfo } from "../lib/toast-helpers";
import { useDiceOverlay } from "../components/dice/DiceOverlayProvider";
import D20Die from "../components/D20Die";
import { getSession, clearSession, setSessionStarted } from "../lib/session";
import { getPlayer, fetchLobby, setReady, leaveSession, clearPlayer, rollLobbyD20 } from "../lib/player";
import { useGameSocket } from "../lib/useGameSocket";

export default function Lobby() {
  const nav = useNavigate();
  const session = useMemo(() => getSession(), []);
  const me = useMemo(() => getPlayer(), []);
  const diceOverlay = useDiceOverlay();
  const { toast } = useToast();

  const [state, setState] = useState(null);
  const [busy, setBusy] = useState(false);
  const [rolling, setRolling] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [confirmLeaveOpen, setConfirmLeaveOpen] = useState(false);

  const canView = !!(session?.sessionId && me?.playerId);
  const joinUrl = session?.sessionCode ? `${window.location.origin}/join/${session.sessionCode}` : "";

  const load = React.useCallback(async () => {
    if (!session?.sessionId) return;
    try {
      const s = await fetchLobby(session.sessionId);
      setState(s);
      setSessionStarted(!!s?.started);

      if (s?.sessionStatus === SESSION_STATUS.FINISHED) {
        nav("/end", { replace: true });
        return;
      }

      if (s?.lastEventSeq && s?.lastEventMessage) {
        const key = `cc_evt_${session.sessionId}`;
        const lastSeen = Number(sessionStorage.getItem(key) || "0");
        if (s.lastEventSeq > lastSeen) {
          sessionStorage.setItem(key, String(s.lastEventSeq));
          toastInfo(toast, "Game update", s.lastEventMessage, { duration: 2600 });
        }
      }

      if (s?.started) nav("/play");
    } catch (e) {
      toastError(toast, e, "Failed to load lobby");
    }
  }, [session?.sessionId, nav, toast]);

  // Initial load
  useEffect(() => {
    if (canView) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canView]);

  // Real-time updates
  useGameSocket(session?.sessionId, load);

  async function toggleReady() {
    if (!session?.sessionId || !me?.playerId) return;
    const currentlyReady = !!state?.players?.find((p) => p.id === me.playerId)?.ready;

    setBusy(true);
    try {
      await setReady(session.sessionId, me.playerId, !currentlyReady);
      await load();
    } catch (e) {
      toastError(toast, e, "Failed to set ready");
    } finally {
      setBusy(false);
    }
  }

  async function doLobbyRoll() {
    if (!session?.sessionId || !me?.playerId) return;
    setRolling(true);
    setBusy(true);
    try {
      await diceOverlay.rollD20(() => rollLobbyD20(session.sessionId, me.playerId));
      await load();
    } catch (e) {
      toastError(toast, e, "Failed to roll");
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
				<Card>
					<CardContent className="space-y-s3">
						<div>
							<div className="text-fs3 font-extrabold">Not ready</div>
							<div className="mt-s1 text-muted">You need to join a match and set your name + emoji first.</div>
						</div>
						<div className="flex flex-wrap gap-s2">
							<Button variant="primary" onClick={() => nav("/")}>Go to Home</Button>
						</div>
					</CardContent>
				</Card>
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
      toast({ title: "Copied join link" });
    } catch {
      toast({ title: "Couldn't copy", description: "Clipboard blocked by the browser.", variant: "destructive" });
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
        <Card>
          <CardContent className="space-y-s4">
            <div>
              <div className="text-muted text-fs0 font-semibold">Invite</div>
              <div className="mt-s1 text-fs3 font-extrabold">Let others join</div>
            </div>

            <div className="space-y-s2">
              <div className="text-muted text-fs0 font-semibold">Join code</div>
              <div className="flex flex-wrap items-center justify-between gap-s2">
                <Badge variant="secondary" className="px-s3 py-s2 text-fs1">{session.sessionCode}</Badge>
                <Button variant="secondary" onClick={() => setQrOpen(true)} disabled={!joinUrl}>Show QR</Button>
              </div>
              <div className="text-muted text-fs0 leading-relaxed">
                Tip: If QR scanning opens a weird in-app browser, open it in Safari/Chrome for best layout.
              </div>
            </div>

            {joinUrl ? (
              <div className="space-y-s2">
                <Button variant="ghost" onClick={copyJoinLink}>Copy join link</Button>
                <div className="break-words text-muted text-fs0">{joinUrl}</div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      }
      actions={
        <div className="flex w-full items-center gap-s3">
          <Button variant="secondary" onClick={() => setQrOpen(true)} disabled={!joinUrl}>QR</Button>
          <Button variant="primary" onClick={toggleReady} disabled={busy || (!meRow?.ready && !canReady)}>
            {meRow?.ready ? "Unready" : "Ready"}
          </Button>
        </div>
      }
    >
      <Card>
        <CardContent className="space-y-s4">
          <div className="flex flex-wrap items-start justify-between gap-s3">
            <div>
              <div className="text-fs3 font-extrabold">Players</div>
              <div className="mt-s1 text-muted">
                {players.length} joined • {allRolled ? "All rolled" : "Waiting for rolls"} • {allReady ? "All ready" : "Not all ready"}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-s3">
              <div className="w-[110px]">
                <D20Die
                  value={meRow?.tied ? "ROLL" : (meRow?.lobbyRoll ?? "?")}
                  rolling={rolling}
                  disabled={!canRoll || busy}
                  onClick={doLobbyRoll}
                />
              </div>
              <div className="text-right">
                <div className="text-muted text-fs0 font-semibold">Your roll</div>
                <div className="mt-s1 text-muted text-fs0">
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
            <div className="rounded-lg border border-border bg-surface2 px-s4 py-s3">
              ⚠️ Tie — roll again: {tiedPlayers.map((p) => `${p.icon || "🙂"} ${p.name || "Player"}`).join(" • ")}
            </div>
          ) : null}

          {/* errors are surfaced as toasts */}

          <div className="max-h-[42vh] space-y-s2 overflow-auto pr-1">
            {players.map((p, idx) => (
              <div
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-s3 rounded-lg border border-border bg-surface2/60 px-s4 py-s3"
              >
                <div className="flex min-w-0 items-center gap-s3">
                  <div className="text-[22px]">{p.icon || "🙂"}</div>
                  <div className="min-w-0">
                    <div className="truncate font-extrabold">{p.name || "Player"}</div>
                    <div className="text-muted text-fs0">
                      #{p.turnOrder ?? (idx + 1)} • D20={p.lobbyRoll ?? "?"}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-end gap-s2">
                  {p.tied ? <Badge variant="secondary">Tie</Badge> : null}
                  <Badge variant={p.ready ? "secondary" : "default"}>{p.ready ? "Ready" : "Not ready"}</Badge>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-s2">
            <Button variant="ghost" onClick={() => setConfirmLeaveOpen(true)}>Leave lobby</Button>
            <div className="text-muted text-fs0">
              Once everyone is ready, the game will start automatically.
            </div>
          </div>
	      </CardContent>
	    </Card>

	      {qrOpen ? (
        <div
          className="fixed inset-0 z-[240] flex items-end justify-center bg-black/70 p-s3 sm:items-center"
          style={{ paddingBottom: "max(env(safe-area-inset-bottom), 12px)" }}
          onClick={() => setQrOpen(false)}
        >
          <Card className="w-full max-w-[560px] sm:rounded-lg rounded-t-lg">
            <CardContent className="space-y-s4" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between gap-s3">
                <div className="text-fs2 font-extrabold">Join via QR</div>
                <Button variant="ghost" onClick={() => setQrOpen(false)}>Close</Button>
              </div>

              <div className="grid place-items-center rounded-lg border border-border bg-surface2 p-s4">
                <QRCode value={joinUrl} size={240} />
              </div>

              <div className="break-words text-muted text-fs0">{joinUrl}</div>
            </CardContent>
          </Card>
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
