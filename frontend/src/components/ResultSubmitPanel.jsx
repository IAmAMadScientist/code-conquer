import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { computePoints, formatTime, normalizeDifficulty } from "../lib/scoring";
import { getSession } from "../lib/session";
import { getPlayer } from "../lib/player";

// Tip: later move this into .env (VITE_API_BASE) and use a dev proxy.
const API_BASE = "http://localhost:8080/api";

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

export default function ResultSubmitPanel({
  category,
  difficulty,
  timeMs,
  errors,
  won,
  onPlayAgain,
}) {
  const nav = useNavigate();

  const session = useMemo(() => getSession(), []);
  const player = useMemo(() => getPlayer(), []);

  const diffNorm = normalizeDifficulty(difficulty);
  const points = computePoints({ difficulty: diffNorm, timeMs, errors, won });

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [err, setErr] = useState(null);

  async function submit() {
    if (!player?.playerId) {
      setErr("Kein Spieler gesetzt. Bitte im Lobby-Flow ein Profil setzen.");
      return;
    }
    if (!session?.sessionId) {
      setErr("Keine Session aktiv.");
      return;
    }

    setSubmitting(true);
    setErr(null);

    try {
      const payload = {
        sessionId: session.sessionId,
        sessionCode: session.sessionCode || "",
        playerId: player.playerId,
        category,
        difficulty: diffNorm,
        points,
        timeMs,
        errors,
      };

      const res = await fetch(`${API_BASE}/scores`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      await parseJsonOrThrow(res);

      setSubmitted(true);

      // After scoring, next player's turn begins server-side.
      // We send this player back to the Play screen (will show waiting if not their turn).
      nav("/play");
    } catch (e) {
      setErr(e?.message || "Failed to save score");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="panel" style={{ marginTop: 14 }}>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <Badge>Result</Badge>
        <Badge variant="secondary">Diff: {diffNorm}</Badge>
        <Badge variant="secondary">Time: {formatTime(timeMs)}</Badge>
        <Badge variant="secondary">Errors: {errors ?? 0}</Badge>
        {session?.sessionCode ? <Badge variant="secondary">Match: {session.sessionCode}</Badge> : null}
        {player?.playerName ? (
          <Badge variant="secondary">Player: {player.playerIcon || "🙂"} {player.playerName}</Badge>
        ) : null}
        <Badge variant="secondary">Points: {points}</Badge>
      </div>

      {err ? <div style={{ marginTop: 10, opacity: 0.9 }}>⚠️ {err}</div> : null}

      <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <Button onClick={submit} disabled={submitting || submitted || !player?.playerId} variant={submitted ? "secondary" : "primary"}>
          {submitted ? "Score gespeichert" : submitting ? "Speichere..." : "Score speichern"}
        </Button>

        <Button variant="ghost" onClick={() => nav("/leaderboard")}>Leaderboard</Button>
        <Button variant="ghost" onClick={() => nav("/lobby")}>Lobby</Button>
        <Button variant="ghost" onClick={() => nav("/play")}>Play</Button>

        {onPlayAgain ? (
          <Button variant="secondary" onClick={onPlayAgain}>Play again</Button>
        ) : null}
      </div>

      <div className="muted" style={{ marginTop: 10, fontSize: 13, lineHeight: 1.5 }}>
        Tip: After saving the score, the backend automatically advances the turn to the next player.
      </div>
    </div>
  );
}
