import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { computePoints, formatTime, normalizeDifficulty } from "../lib/scoring";
import { getSession } from "../lib/session";
import { getPlayer } from "../lib/player";
import { useMinigameResultToast } from "./MinigameResultToastProvider";

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
  explanation,
}) {
  // Guard: only show/submit results once the game actually ended.
  if (typeof won !== "boolean") return null;

  const nav = useNavigate();
  const toast = useMinigameResultToast();

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

    // Show a global toast that stays visible even after we navigate back.
    try {
      toast.show({
        won: Boolean(won),
        title: Boolean(won) ? "You won!" : "You lost",
        subtitle: `${category} · +${points} pts`,
      });
    } catch {
      // ignore
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

      // Stay on this result screen until the player confirms.
      // Navigation happens only after pressing "Continue".
    } catch (e) {
      // If save fails (e.g. not your turn, token mismatch), allow retry by leaving submittedRef true?
      // We keep it true to avoid spamming; user should go back to /play.
      setErr(e?.message || "Failed to save score");
      // Stay on this result screen to allow a retry and to show the reason.
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

  const headline = Boolean(won) ? "You won!" : "You lost";
  const why =
    explanation ||
    (Boolean(won)
      ? "You met the minigame objective."
      : `You did not meet the objective${typeof errors === "number" ? ` (errors: ${errors}).` : "."}`);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 130,
        background: "rgba(2,6,23,0.70)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Minigame result"
    >
      <div
        className="panel stack"
        style={{
          width: "min(760px, calc(100vw - 32px))",
          borderRadius: 22,
          padding: 16,
          paddingBottom: `calc(16px + env(safe-area-inset-bottom, 0px))`,
          boxShadow: "0 20px 60px rgba(0,0,0,0.55)",
        }}
      >
        <div className="stack" style={{ gap: 6 }}>
          <div style={{ fontWeight: 950, fontSize: 20, letterSpacing: -0.2 }}>
            {headline}
          </div>
          <div className="muted" style={{ lineHeight: 1.5 }}>{why}</div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <Badge>{category}</Badge>
          <Badge variant="secondary">Diff: {diffNorm}</Badge>
          <Badge variant="secondary">Time: {formatTime(timeMs)}</Badge>
          <Badge variant="secondary">Errors: {errors ?? 0}</Badge>
          <Badge variant="secondary">Points: {points}</Badge>
          {session?.sessionCode ? <Badge variant="secondary">Match: {session.sessionCode}</Badge> : null}
          {player?.playerName ? (
            <Badge variant="secondary">Player: {player.playerIcon || "🙂"} {player.playerName}</Badge>
          ) : null}
        </div>

        <div className="panel" style={{ padding: 12 }}>
          <div className="muted" style={{ fontSize: 13, lineHeight: 1.5 }}>
            {saving ? "Saving score…" : saved ? "Score saved. You can continue." : "Finishing…"}
          </div>
          {err ? (
            <div style={{ marginTop: 10, opacity: 0.95, lineHeight: 1.4 }}>
              ⚠️ {err}
            </div>
          ) : null}
        </div>

        <div style={{ display: "grid", gap: 10 }}>
          <Button
            variant="primary"
            onClick={() => nav("/play", { replace: true, state: { turnSummary: { saved: Boolean(saved), error: err || null } } })}
            disabled={saving || !saved}
            style={{ minHeight: 54, fontWeight: 950, fontSize: 16 }}
          >
            Continue
          </Button>

          {err ? (
            <Button
              variant="secondary"
              onClick={() => {
                // Allow a retry: reset the guard and submit again.
                submittedRef.current = false;
                setSaved(false);
                setErr(null);
                submitOnce();
              }}
              disabled={saving}
              style={{ minHeight: 54, fontWeight: 900 }}
            >
              Retry saving
            </Button>
          ) : null}
        </div>

        {!saved ? (
          <div className="muted" style={{ fontSize: 12, lineHeight: 1.4 }}>
            You must confirm this result screen to return to the board.
          </div>
        ) : null}
      </div>
    </div>
  );
}
