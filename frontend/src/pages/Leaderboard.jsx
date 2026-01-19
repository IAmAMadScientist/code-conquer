import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AppShell from "../components/AppShell";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { getSession } from "../lib/session";

const API_BASE = "http://localhost:8080/api";

function fmtMs(ms) {
  if (ms == null || Number.isNaN(ms)) return "—";
  const s = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m > 0 ? `${m}:${String(r).padStart(2, "0")}` : `${r}s`;
}

export default function Leaderboard() {
  const session = useMemo(() => getSession(), []);
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setErr(null);
      try {
        const qs = new URLSearchParams();
        if (session?.sessionId) qs.set("sessionId", session.sessionId);

        const res = await fetch(`${API_BASE}/scores/top?${qs.toString()}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);

        if (!cancelled) setRows(Array.isArray(data) ? data : []);
      } catch (e) {
        if (!cancelled) setErr(e?.message || "Failed to load leaderboard");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [session?.sessionId]);

  return (
    <AppShell
      title="Leaderboard"
      subtitle={session?.sessionCode ? `Match: ${session.sessionCode}` : "Top scores"}
      headerBadges={
        <>
          {session?.sessionCode ? <Badge variant="secondary">{session.sessionCode}</Badge> : <Badge>Global</Badge>}
        </>
      }
      rightPanel={
        <div className="panel">
          <div style={{ fontSize: 16, fontWeight: 650 }}>Back to game</div>
          <div className="muted" style={{ fontSize: 14, marginTop: 10, lineHeight: 1.5 }}>
            Use <strong>Back to Difficulty</strong> to continue. Lobby is only for the start.
          </div>
        </div>
      }
    >
      <div className="panel" style={{ display: "grid", gap: 12 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <Link to="/play">
            <Button variant="primary">Back to Difficulty</Button>
          </Link>
        </div>

        {loading ? <div className="muted">Loading…</div> : null}
        {err ? <div style={{ opacity: 0.9 }}>⚠️ {err}</div> : null}

        {!loading && !err && rows.length === 0 ? (
          <div className="muted">No scores yet.</div>
        ) : null}

        {!loading && !err && rows.length > 0 ? (
          <div style={{ display: "grid", gap: 8 }}>
            {rows.map((r, idx) => (
              <div
                key={r.id || idx}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid rgba(148,163,184,0.18)",
                  background: "rgba(15,23,42,0.25)",
                }}
              >
                <div style={{ display: "grid", gap: 2 }}>
                  <div style={{ fontWeight: 750 }}>
                    #{idx + 1} {r.playerName || "Player"}
                  </div>
                  <div className="muted" style={{ fontSize: 12 }}>
                    {r.difficulty} • {r.category} • {fmtMs(r.timeMs)} • errors: {r.errors ?? 0}
                  </div>
                </div>
                <Badge variant="secondary">{r.points}</Badge>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}
