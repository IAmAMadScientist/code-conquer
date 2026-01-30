import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { useToast } from "./ui/use-toast";

import { computePoints, formatTime, normalizeDifficulty } from "../lib/scoring";
import { getSession } from "../lib/session";
import { getPlayer } from "../lib/player";
import { API_BASE } from "../lib/api";
import { getHapticsEnabled, getSoundEnabled, playFailSfx, playWinSfx } from "../lib/diceSound";

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
 * Result modal + score submit.
 * Shows only when won is boolean. Submits once and blocks leaving until user confirms.
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
  if (typeof won !== "boolean") return null;

  const nav = useNavigate();
  const { toast } = useToast();

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

    // Feedback (global sound/haptics settings)
    try {
      if (getHapticsEnabled() && navigator.vibrate) navigator.vibrate(won ? 28 : 22);
    } catch {}
    try {
      if (getSoundEnabled()) (won ? playWinSfx : playFailSfx)();
    } catch {}

    // Toast (non-blocking)
    try {
      toast({
        title: won ? "You won!" : "You lost",
        description: `${category} · +${points} pts`,
      });
    } catch {}

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
    } catch (e) {
      setErr(e?.message || "Failed to save score");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    if (!saved && !saving) submitOnce();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [won]);

  const headline = won ? "You won!" : "You lost";
  const why =
    explanation ||
    (won
      ? "You met the minigame objective."
      : `You did not meet the objective${typeof errors === "number" ? ` (errors: ${errors}).` : "."}`);

  return (
    <Dialog open={true}>
      <DialogContent
        // Prevent closing by clicking outside or pressing ESC
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        className="w-[min(92vw,760px)]"
      >
        <DialogHeader>
          <DialogTitle>{headline}</DialogTitle>
          <DialogDescription className="leading-relaxed">{why}</DialogDescription>
        </DialogHeader>

        <div className="mt-s4 flex flex-wrap items-center gap-2">
          <Badge>{category}</Badge>
          <Badge variant="secondary">Diff: {diffNorm}</Badge>
          <Badge variant="secondary">Time: {formatTime(timeMs)}</Badge>
          <Badge variant="secondary">Errors: {errors ?? 0}</Badge>
          <Badge variant="secondary">Points: {points}</Badge>
          {session?.sessionCode ? <Badge variant="secondary">Match: {session.sessionCode}</Badge> : null}
          {player?.playerName ? (
            <Badge variant="secondary">
              Player: {player.playerIcon || "🙂"} {player.playerName}
            </Badge>
          ) : null}
        </div>

        <div className="mt-s4 rounded-lg border border-border bg-surface2 p-s4">
          <div className="text-sm text-muted">
            {saving ? "Saving score…" : saved ? "Score saved. You can continue." : "Finishing…"}
          </div>
          {err ? <div className="mt-2 text-sm">⚠️ {err}</div> : null}
        </div>

        <DialogFooter>
          <Button
            variant="primary"
            onClick={() =>
              nav("/play", {
                replace: true,
                state: { turnSummary: { saved: Boolean(saved), error: err || null } },
              })
            }
            disabled={saving || !saved}
            className="h-12 font-extrabold"
          >
            Continue
          </Button>

          {err ? (
            <Button
              variant="secondary"
              onClick={() => {
                submittedRef.current = false;
                setSaved(false);
                setErr(null);
                submitOnce();
              }}
              disabled={saving}
              className="h-12"
            >
              Retry saving
            </Button>
          ) : null}
        </DialogFooter>

        {!saved ? (
          <div className="mt-s3 text-xs text-muted">
            You must confirm this result screen to return to the board.
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
