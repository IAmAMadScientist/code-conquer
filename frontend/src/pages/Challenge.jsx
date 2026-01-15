import React, { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import AppShell from "../components/AppShell";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";

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
 * "Challenge" in this project = one of the frontend minigames.
 * This page asks the backend to pick a random minigame and then redirects.
 */
export default function Challenge() {
  const nav = useNavigate();
  const [params] = useSearchParams();

  const category = params.get("category") || undefined;
  const difficulty = params.get("difficulty") || undefined;

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const [picked, setPicked] = useState(null);

  async function loadAndRedirect() {
    if (!difficulty) return;
    setLoading(true);
    setErr(null);
    setPicked(null);

    try {
      const qs = new URLSearchParams();
      qs.set("difficulty", difficulty);
      if (category) qs.set("category", category);

      const res = await fetch(`${API_BASE}/challenges/random?${qs.toString()}`);
      const data = await parseJsonOrThrow(res);
      setPicked(data);

      // Redirect to the chosen minigame.
      // Pass params via router state so minigames can read it later if they want.
      nav(data.route, {
        replace: true,
        state: { challenge: data },
      });
    } catch (e) {
      setErr(e?.message || "Failed to load a random challenge");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAndRedirect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, difficulty]);

  return (
    <AppShell
      title="Code & Conquer"
      subtitle="Picking a random minigame..."
      headerBadges={
        <>
          <Badge>Challenge</Badge>
          {category && <Badge>Cat: {category}</Badge>}
          {difficulty && <Badge>Diff: {difficulty}</Badge>}
        </>
      }
    >
      {!difficulty ? (
        <>
          <div className="panel">
            <div style={{ fontWeight: 650 }}>Missing difficulty.</div>
            <div className="muted" style={{ marginTop: 8 }}>
              If you scanned a QR code, it should include easy/medium/hard.
            </div>
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
          {err && (
            <div className="panel" style={{ borderColor: "rgba(251,113,133,0.35)" }}>
              <div style={{ fontWeight: 650 }}>Could not pick a challenge</div>
              <div className="muted" style={{ marginTop: 8 }}>{err}</div>
              <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
                <Button variant="primary" onClick={loadAndRedirect}>
                  Try again
                </Button>
                <Link to="/categories">
                  <Button variant="ghost">Back to categories</Button>
                </Link>
              </div>
            </div>
          )}

          {/* In practice you won't see this because we redirect immediately. */}
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
