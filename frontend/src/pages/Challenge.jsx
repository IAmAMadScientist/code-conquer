import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import AppShell from "../components/AppShell";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
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
  const [sp] = useSearchParams();

  const session = useMemo(() => getSession(), []);
  const player = useMemo(() => getPlayer(), []);

  const difficulty = (sp.get("difficulty") || "EASY").toUpperCase();
  const category = (sp.get("category") || "").toUpperCase();

  const [loading, setLoading] = useState(true);
  const [picked, setPicked] = useState(null);
  const [err, setErr] = useState(null);

  const canPlay = !!(session?.sessionId && player?.playerId);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!canPlay) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setErr(null);

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
        setErr(e?.message || "Failed to fetch random challenge");
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
        <div className="panel stack">
          <div>
            <div style={{ fontWeight: 850 }}>How it works</div>
            <div className="muted" style={{ marginTop: 6, lineHeight: 1.5 }}>
              The backend selects a random minigame based on difficulty (and category, if provided).
              You will be redirected automatically.
            </div>
          </div>
        </div>
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
        <div className="panel stack">
          <div>
            <div style={{ fontWeight: 850 }}>Not ready</div>
            <div className="muted" style={{ marginTop: 6, lineHeight: 1.5 }}>
              You need to be in a match and have a player profile.
            </div>
          </div>
          <div className="row wrap">
            <Button variant="ghost" onClick={() => nav("/leaderboard")}>Leaderboard</Button>
          </div>
        </div>
      ) : (
        <>
          {loading && (
            <div className="panel stack">
              <div className="muted">Requesting random minigame from backend…</div>
            </div>
          )}

          {err && (
            <div className="panel stack">
              <div style={{ fontWeight: 850 }}>Info</div>
              <div className="muted" style={{ lineHeight: 1.5 }}>{err}</div>
              <div className="row wrap">
                <Button variant="primary" onClick={() => nav("/play")}>Back to game</Button>
                <Button variant="ghost" onClick={() => nav("/leaderboard")}>Leaderboard</Button>
              </div>
            </div>
          )}

          {!loading && !err && picked && (
            <div className="panel">
              Redirecting to: <strong>{picked.route}</strong>
            </div>
          )}
        </>
      )}
    </AppShell>
  );
}
