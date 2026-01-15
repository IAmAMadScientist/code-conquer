import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { computePoints, formatTime, normalizeDifficulty } from "../lib/scoring";
import { getSession } from "../lib/session";

// Tip: later move this into .env (VITE_API_BASE) and use a dev proxy.
const API_BASE = "http://localhost:8080/api";

async function parseJsonOrThrow(res) {
  let data = null;
  try {
    data = await res.json();
  } catch {}
  if (!res.ok) {
    const msg = data?.error || `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data;
}

/**
 * Shows a consistent end-of-minigame panel and optionally submits score to the backend.
 */
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
  const diff = normalizeDifficulty(difficulty);

  const points = useMemo(
    () => computePoints({ difficulty: diff, timeMs, errors, won }),
    [diff, timeMs, errors, won]
  );

  const [playerName, setPlayerName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [err, setErr] = useState(null);

  async function submit() {
    setErr(null);
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/scores`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: session?.sessionId || "",
          sessionCode: session?.sessionCode || "",
          playerName: playerName?.trim() || "Player",
          points,
          category,
          difficulty: diff,
          timeMs,
          errors: Math.max(0, errors || 0),
        }),
      });
      await parseJsonOrThrow(res);
      setSubmitted(true);
    } catch (e) {
      setErr(e?.message || "Failed to submit score");
    } finally {
      setSubmitting(false);
    }
  }

  const diffSlug = diff.toLowerCase();

  return (
    <div
      className="panel"
      style={{
        marginTop: 14,
        borderColor: won ? "rgba(52,211,153,0.35)" : "rgba(251,113,133,0.35)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <div style={{ fontWeight: 750, fontSize: 16 }}>{won ? "✅ Challenge cleared" : "❌ Challenge failed"}</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Badge>Cat: {category}</Badge>
          <Badge>Diff: {diff}</Badge>
          <Badge>Time: {formatTime(timeMs)}</Badge>
          <Badge>Errors: {Math.max(0, errors || 0)}</Badge>
          {session?.sessionCode ? <Badge>Match: {session.sessionCode}</Badge> : null}
          <Badge style={{ borderColor: "rgba(252,211,77,0.35)" }}>Points: {points}</Badge>
        </div>
      </div>

      <div className="muted" style={{ marginTop: 8, fontSize: 13, lineHeight: 1.5 }}>
        Punkte = Basis (Difficulty) × Zeitfaktor − Fehler-Penalty. Schneller = mehr Punkte, mehr Fehler = weniger.
      </div>

      <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <label className="muted" style={{ fontSize: 13 }}>
            Spielername
          </label>
          <input
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="z.B. Alex"
            style={{
              flex: "1 1 220px",
              minWidth: 180,
              padding: "10px 12px",
              borderRadius: 999,
              border: "1px solid rgba(51,65,85,0.55)",
              background: "rgba(2,6,23,0.22)",
              color: "rgba(226,232,240,0.95)",
              outline: "none",
            }}
          />
          <Button onClick={submit} disabled={submitting || submitted} variant={submitted ? "secondary" : "primary"}>
            {submitted ? "Score gespeichert" : submitting ? "Speichere..." : "Score speichern"}
          </Button>
        </div>

        {err && (
          <div className="panel" style={{ borderColor: "rgba(251,113,133,0.35)" }}>
            {err}
          </div>
        )}

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Button variant="success" onClick={() => nav(`/qr/${diffSlug}`)}>
            Next challenge ({diffSlug})
          </Button>
          {onPlayAgain && (
            <Button variant="ghost" onClick={onPlayAgain}>
              Play again
            </Button>
          )}
          <Button variant="ghost" onClick={() => nav("/categories")}>
            Back to categories
          </Button>
        </div>
      </div>
    </div>
  );
}
