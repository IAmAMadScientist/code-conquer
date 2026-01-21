import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "./ui/badge";
import { computePoints, formatTime, normalizeDifficulty } from "../lib/scoring";
import { getSession } from "../lib/session";
import { getPlayer } from "../lib/player";

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

/**
 * Auto-saves the score when the game ends (won === true/false),
 * then redirects back to /play. The backend immediately advances the turn
 * (your design: everyone uses their own phone).
 */
export default function ResultSubmitPanel({
  category,
  difficulty,
  timeMs,
  errors,
  won,
  challengeId,
}) {
  const nav = useNavigate();

  const session = useMemo(() => getSession(), []);
  const player = useMemo(() => getPlayer(), []);

  const diffNorm = normalizeDifficulty(difficulty);
  const points = computePoints({ difficulty: diffNorm, timeMs, errors, won });

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState(null);

  const submittedRef = useRef(false);

  async function submitOnce() {
    if (submittedRef.current) return;
    submittedRef.current = true;

    if (!player?.playerId) {
      setErr("No player set on this device.");
      return;
    }
    if (!session?.sessionId) {
      setErr("No active session.");
      return;
    }
    if (!challengeId) {
      setErr("Missing challengeId (turn token). Please start the challenge from /play again.");
      return;
    }

    setSaving(true);
    setErr(null);

    try {
      const payload = {
        sessionId: session.sessionId,
        sessionCode: session.sessionCode || "",
        playerId: player.playerId,
        challengeId,
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

      setSaved(true);

      nav("/play", { replace: true, state: { turnSummary: { saved: true } } });
    } catch (e) {
      // If save fails (e.g. not your turn, token mismatch), allow retry by leaving submittedRef true?
      // We keep it true to avoid spamming; user should go back to /play.
      setErr(e?.message || "Failed to save score");
      nav("/play", { state: { turnSummary: { saved: false, error: e?.message || "Failed to save score" } } });
    } finally {
      setSaving(false);
    }
  }

  // Auto-submit when game ends (won becomes boolean)
  useEffect(() => {
    if (typeof won === "boolean" && !saved && !saving) {
      submitOnce();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [won]);

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

      <div className="muted" style={{ marginTop: 10, fontSize: 13 }}>
        {saving ? "Saving score…" : saved ? "Score saved. Showing next player…" : "Finishing…"}
      </div>

      {err ? <div style={{ marginTop: 10, opacity: 0.9 }}>⚠️ {err}</div> : null}
    </div>
  );
}
