import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import AppShell from "../components/AppShell";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";

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

export default function Challenge() {
  const [params] = useSearchParams();
  const category = params.get("category");
  const difficulty = params.get("difficulty");

  const [challenge, setChallenge] = useState(null);
  const [guess, setGuess] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [err, setErr] = useState(null);

  async function loadRandom() {
    if (!category || !difficulty) return;
    setLoading(true);
    setErr(null);
    setResult(null);
    setGuess("");
    try {
      const res = await fetch(
        `${API_BASE}/challenges/random?category=${encodeURIComponent(category)}&difficulty=${encodeURIComponent(difficulty)}`
      );
      const data = await parseJsonOrThrow(res);
      setChallenge(data);
    } catch (e) {
      setChallenge(null);
      setErr(e?.message || "Failed to load challenge");
    } finally {
      setLoading(false);
    }
  }

  async function check() {
    if (!challenge || checking) return;
    setChecking(true);
    setErr(null);
    setResult(null);
    try {
      const res = await fetch(`${API_BASE}/challenges/check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeId: challenge.id, guess }),
      });
      const data = await parseJsonOrThrow(res);
      setResult(data);
    } catch (e) {
      setErr(e?.message || "Failed to check answer");
    } finally {
      setChecking(false);
    }
  }

  useEffect(() => {
    loadRandom();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, difficulty]);

  return (
    <AppShell
      title="Code & Conquer"
      subtitle="One random challenge"
      headerBadges={
        <>
          <Badge>Challenge</Badge>
          {category && <Badge>Cat: {category}</Badge>}
          {difficulty && <Badge>Diff: {difficulty}</Badge>}
        </>
      }
    >
      {!category || !difficulty ? (
        <>
          <div className="panel">
            <div style={{ fontWeight: 650 }}>Missing category or difficulty.</div>
            <div className="muted" style={{ marginTop: 8 }}>Go back and pick them.</div>
          </div>
          <div style={{ marginTop: 14 }}>
            <Link to="/categories">
              <Button variant="ghost">Back</Button>
            </Link>
          </div>
        </>
      ) : (
        <>
          {loading && <div className="panel">Loading...</div>}
          {err && <div className="panel" style={{ borderColor: "rgba(251,113,133,0.35)" }}>{err}</div>}

          {!loading && !err && challenge && (
            <div className="panel">
              <div style={{ fontSize: 14, fontWeight: 650 }}>Question</div>
              <div style={{ marginTop: 10, fontSize: 15 }}>{challenge.question}</div>

              <div style={{ marginTop: 12 }}>
                <input
                  className="ui-input"
                  value={guess}
                  onChange={(e) => setGuess(e.target.value)}
                  placeholder="Type your guess..."
                />
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 12 }}>
                <Button variant="primary" onClick={check} disabled={checking || guess.trim() === ""}>
                  {checking ? "Checking..." : "Check answer"}
                </Button>
                <Button variant="secondary" onClick={loadRandom} disabled={loading}>
                  Next random
                </Button>
              </div>

              {result && (
                <div className="panel" style={{ marginTop: 12 }}>
                  <div style={{ fontWeight: 650 }}>
                    {result.correct ? "✅ Correct" : "❌ Not quite"}
                  </div>
                  <div className="muted" style={{ marginTop: 8 }}>
                    <div><strong>Expected:</strong> {result.expectedAnswer}</div>
                    <div style={{ marginTop: 6 }}><strong>Explanation:</strong> {result.explanation}</div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link to={`/difficulty?category=${encodeURIComponent(category)}`}>
              <Button variant="ghost">Change difficulty</Button>
            </Link>
            <Link to="/categories">
              <Button variant="ghost">Back to categories</Button>
            </Link>
          </div>
        </>
      )}
    </AppShell>
  );
}
