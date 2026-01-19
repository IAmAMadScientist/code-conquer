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
 * Auto-submit result:
 * - As soon as a minigame ends (won = true/false), we compute points, save score, and redirect to /play.
 * - The backend advances the turn after a successful score save.
 */
export default function ResultSubmitPanel({
  category,
  difficulty,
  timeMs,
  errors,
  won,
}) {
  const nav = useNavigate();

  const session = useMemo(() => getSession(), []);
  const player = useMemo(() => getPlayer(), []);

  const diffNorm = normalizeDifficulty(difficulty);
  const points = computePoints({ difficulty: diffNorm, timeMs, errors, won });

  const [status, setStatus] = useState("pending"); // pending | saving | saved | error
  const [err, setErr] = useState(null);

  const submittedRef = useRef(false);

  useEffect(() => {
    async function submit() {
      if (submittedRef.current) return;
      // Only submit when game has ended (won is boolean)
      if (won !== true && won !== false) return;

      if (!session?.sessionId) {
        setStatus("error");
        setErr("No active session.");
        return;
      }
      if (!player?.playerId) {
        setStatus("error");
        setErr("No player set.");
        return;
      }

      submittedRef.current = true;
      setStatus("saving");
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

        setStatus("saved");
        // Immediately return to difficulty selection. Turn advances server-side.
        nav("/play", { replace: true });
      } catch (e) {
        submittedRef.current = false; // allow retry on error
        setStatus("error");
        setErr(e?.message || "Failed to save score");
      }
    }

    submit();
  }, [category, diffNorm, errors, nav, player?.playerId, points, session?.sessionCode, session?.sessionId, timeMs, won]);

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

      <div style={{ marginTop: 10 }}>
        {status === "saving" ? <div className="muted">Saving score…</div> : null}
        {status === "error" ? <div style={{ opacity: 0.9 }}>⚠️ {err}</div> : null}
      </div>

      {status === "error" ? (
        <div className="muted" style={{ marginTop: 10, fontSize: 13 }}>
          Refresh the page to retry saving. (Backend will still enforce turn order.)
        </div>
      ) : (
        <div className="muted" style={{ marginTop: 10, fontSize: 13 }}>
          Redirecting back to difficulty selection…
        </div>
      )}
    </div>
  );
}
