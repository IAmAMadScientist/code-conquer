import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import AppShell from "../components/AppShell";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Card, CardContent } from "../components/ui/card";
import { useToast } from "../components/ui/use-toast";
import { toastError } from "../lib/toast-helpers";
import { getSession } from "../lib/session";
import { getPlayer } from "../lib/player";
import { API_BASE } from "../lib/api";

async function parseJsonOrThrow(res) {
  let data = null;
  try {
    data = await res.json();
  } catch {}
  if (!res.ok) {
    if (res.status === 409) throw new Error("Game not started yet.");
    if (res.status === 403) throw new Error("Not your turn.");
    throw new Error(data?.error || `Request failed (${res.status})`);
  }
  return data;
}

export default function Challenge() {
  const nav = useNavigate();
  const { toast } = useToast();
  const [sp] = useSearchParams();

  const session = useMemo(() => getSession(), []);
  const player = useMemo(() => getPlayer(), []);

  const difficulty = (sp.get("difficulty") || "EASY").toUpperCase();
  const category = (sp.get("category") || "").toUpperCase();

  const [loading, setLoading] = useState(true);
  const [picked, setPicked] = useState(null);

  const canPlay = !!(session?.sessionId && player?.playerId);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!canPlay) {
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const qs = new URLSearchParams();
        qs.set("difficulty", difficulty);
        if (category) qs.set("category", category);
        qs.set("sessionId", session.sessionId);
        qs.set("playerId", player.playerId);

        const res = await fetch(`${API_BASE}/challenges/random?${qs.toString()}`);
        const data = await parseJsonOrThrow(res);

        if (cancelled) return;
        setPicked(data);

        nav(data.route, { state: { challenge: data } });
      } catch (e) {
        if (cancelled) return;
        toastError(toast, e, "Failed to fetch random challenge");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [canPlay, category, difficulty, nav, player?.playerId, session?.sessionId]);

  return (
    <AppShell
      title="Challenge"
      subtitle="Selecting a random minigame…"
      rightPanel={
        <Card>
          <CardContent className="space-y-s2">
            <div className="text-fs2 font-extrabold">How it works</div>
            <div className="text-muted leading-relaxed">
              The backend selects a random minigame based on difficulty (and category, if provided). You will be redirected automatically.
            </div>
          </CardContent>
        </Card>
      }
      headerBadges={
        <>
          <Badge variant="secondary">Diff: {difficulty}</Badge>
          {session?.sessionCode ? <Badge variant="secondary">Match: {session.sessionCode}</Badge> : null}
          {player?.playerName ? <Badge variant="secondary">Player: {player.playerIcon || "🙂"} {player.playerName}</Badge> : null}
        </>
      }
    >
      {!canPlay ? (
        <Card>
          <CardContent className="space-y-s3">
            <div>
              <div className="text-fs2 font-extrabold">Not ready</div>
              <div className="mt-s1 text-muted leading-relaxed">
                You need to be in a match and have a player profile.
              </div>
            </div>
            <div className="flex flex-wrap gap-s2">
              <Button variant="ghost" onClick={() => nav("/leaderboard")}>Leaderboard</Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {loading && (
            <Card><CardContent className="text-muted">Requesting random minigame from backend…</CardContent></Card>
          )}

          {err && (
            <Card>
              <CardContent className="space-y-s3">
                <div className="text-fs2 font-extrabold">Info</div>
                <div className="text-muted leading-relaxed">{err}</div>
                <div className="flex flex-wrap gap-s2">
                  <Button variant="primary" onClick={() => nav("/play")}>Back to game</Button>
                  <Button variant="ghost" onClick={() => nav("/leaderboard")}>Leaderboard</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {!loading && !err && picked && (
            <Card>
              <CardContent>
                Redirecting to: <strong>{picked.route}</strong>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </AppShell>
  );
}
