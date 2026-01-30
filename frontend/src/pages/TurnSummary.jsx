import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../components/AppShell";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { useToast } from "../components/ui/use-toast";
import { getSession } from "../lib/session";
import { fetchLobby, getPlayer } from "../lib/player";
import { API_BASE } from "../lib/api";

async function parseJsonOrThrow(res) {
  let data = null;
  try {
    data = await res.json();
  } catch {}
  if (!res.ok) {
    const msg = data?.error || data?.message || `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data;
}

function computeNextPlayer(players, currentTurnOrder) {
  if (!Array.isArray(players) || players.length === 0) return null;
  const sorted = players.slice().sort((a, b) => (a.turnOrder || 0) - (b.turnOrder || 0));
  const n = sorted.length;
  const cur = Number(currentTurnOrder) || 1;
  let nextOrder = cur + 1;
  if (nextOrder > n) nextOrder = 1;
  return sorted.find((p) => p.turnOrder === nextOrder) || null;
}

export default function TurnSummary() {
  const nav = useNavigate();
  const { toast } = useToast();

  const session = useMemo(() => getSession(), []);
  const me = useMemo(() => getPlayer(), []);

  const [state, setState] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => {
    if (!err) return;
    toast({ title: "Error", description: err, variant: "destructive" });
  }, [err, toast]);

  const canView = !!(session?.sessionId && me?.playerId);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!session?.sessionId) return;
      setErr(null);
      try {
        const st = await fetchLobby(session.sessionId);
        if (!cancelled) setState(st);
      } catch (e) {
        if (!cancelled) setErr(e?.message || "Failed to load turn summary");
      }
    }

    if (canView) load();
    return () => {
      cancelled = true;
    };
  }, [canView, session?.sessionId]);

  async function confirm() {
    if (!session?.sessionId || !me?.playerId) return;
    setBusy(true);
    setErr(null);
    try {
      const qs = new URLSearchParams();
      qs.set("playerId", me.playerId);
      const res = await fetch(`${API_BASE}/sessions/${encodeURIComponent(session.sessionId)}/turn/confirm?${qs.toString()}`, {
        method: "POST",
      });
      await parseJsonOrThrow(res);
      nav("/play", { replace: true });
    } catch (e) {
      setErr(e?.message || "Failed to confirm handover");
    } finally {
      setBusy(false);
    }
  }

  if (!canView) {
    return (
      <AppShell title="Turn Summary" subtitle="Join a match and set your profile first." showTabs activeTab="play" backTo="/">
        <Card>
          <CardContent className="space-y-s2">
            <div className="text-fs2 font-extrabold">Not ready</div>
            <div className="text-muted">You need an active match and a player profile.</div>
          </CardContent>
        </Card>
      </AppShell>
    );
  }

  const nextPlayer = computeNextPlayer(state?.players || [], state?.currentTurnOrder);

  return (
    <AppShell
      title="Turn Summary"
      subtitle="Pass the phone to the next player."
      showTabs
      activeTab="play"
      backTo="/play"
      actions={
        <div className="flex w-full">
          <Button variant="primary" onClick={confirm} disabled={busy}>
            {busy ? "Confirming…" : "OK, pass to next player"}
          </Button>
        </div>
      }
      headerBadges={
        <>
          {session?.sessionCode ? <Badge variant="secondary">Match: {session.sessionCode}</Badge> : null}
          {me?.playerName ? <Badge variant="secondary">You: {me.playerIcon || "🙂"} {me.playerName}</Badge> : null}
        </>
      }
    >
      <Card>
        <CardContent className="space-y-s4">
          {/* Errors are shown via toast */}

          <div className="text-fs3 font-extrabold">✅ Score saved</div>

          <div className="rounded-lg border border-border bg-surface2 px-s4 py-s3">
            <div className="text-muted text-fs0 font-semibold">Next turn</div>
            <div className="mt-s2 text-fs2 font-extrabold">
              {nextPlayer ? (
                <>
                  {nextPlayer.icon || "🙂"} {nextPlayer.name}
                </>
              ) : (
                <>—</>
              )}
            </div>
          </div>

          <div className="text-muted text-fs0 leading-relaxed">
            The next player can only take their turn after you confirm here.
          </div>
        </CardContent>
      </Card>
    </AppShell>
  );
}
