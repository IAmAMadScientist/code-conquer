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
  return m > 0 ? `${m}m ${r}s` : `${r}s`;
}

export default function Leaderboard() {
  const session = useMemo(() => getSession(), []);
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  const [tick, setTick] = useState(0);

  async function load() {
    if (!session?.sessionId) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`${API_BASE}/leaderboard?sessionId=${encodeURIComponent(session.sessionId)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      setErr(e?.message || "Failed to load leaderboard");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);

  useEffect(() => {
    // auto-refresh every 5 seconds while page is open
    const t = setInterval(() => setTick((x) => x + 1), 5000);
    return () => clearInterval(t);
  }, []);

  return (
    <AppShell
      title="Leaderboard"
      subtitle="Total points per player in the current match."
      headerBadges={
        <>
          <Badge>Leaderboard</Badge>
          {session?.sessionCode ? <Badge variant="secondary">Match: {session.sessionCode}</Badge> : null}
        </>
      }
      rightPanel={
        <div className="panel">
          <div style={{ fontSize: 16, fontWeight: 650 }}>How it works</div>
          <div className="muted" style={{ fontSize: 14, marginTop: 10, lineHeight: 1.5 }}>
            • This sums all submitted scores per player.<br />
            • It refreshes every 5 seconds.<br />
            • You need an active match/session to view it.
          </div>
        </div>
      }
    >
      {!session?.sessionId ? (
        <div className="panel">
          <div style={{ fontWeight: 750, marginBottom: 8 }}>No active match</div>
          <div className="muted" style={{ marginBottom: 12 }}>
            Create or join a match on Home first, then come back here.
          </div>
          <Link to="/">
            <Button variant="primary">Go to Home</Button>
          </Link>
        </div>
      ) : (
        <>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", marginBottom: 12 }}>
            <Button variant="secondary" onClick={load} disabled={busy}>
              Refresh
            </Button>
            <Link to="/categories">
              <Button variant="primary">Back to Game</Button>
            </Link>
            <Link to="/">
              <Button variant="ghost">Home</Button>
            </Link>
            {err ? <span style={{ opacity: 0.9 }}>⚠️ {err}</span> : null}
          </div>

          <div className="panel" style={{ overflowX: "auto" }}>
            <div style={{ fontWeight: 750, marginBottom: 10 }}>Players</div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ textAlign: "left", opacity: 0.85 }}>
                  <th style={{ padding: "8px 10px" }}>#</th>
                  <th style={{ padding: "8px 10px" }}>Player</th>
                  <th style={{ padding: "8px 10px" }}>Total Points</th>
                  <th style={{ padding: "8px 10px" }}>Attempts</th>
                  <th style={{ padding: "8px 10px" }}>Avg Time</th>
                  <th style={{ padding: "8px 10px" }}>Errors</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: "10px" }} className="muted">
                      No scores yet. Finish a minigame and submit a score.
                    </td>
                  </tr>
                ) : (
                  rows.map((r, idx) => (
                    <tr key={`${r.playerName}-${idx}`} style={{ borderTop: "1px solid rgba(148,163,184,0.18)" }}>
                      <td style={{ padding: "8px 10px", opacity: 0.85 }}>{idx + 1}</td>
                      <td style={{ padding: "8px 10px", fontWeight: 650 }}>{r.playerName}</td>
                      <td style={{ padding: "8px 10px" }}>{r.totalPoints ?? 0}</td>
                      <td style={{ padding: "8px 10px" }}>{r.attempts ?? 0}</td>
                      <td style={{ padding: "8px 10px" }}>{fmtMs(r.avgTimeMs)}</td>
                      <td style={{ padding: "8px 10px" }}>{r.totalErrors ?? 0}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </AppShell>
  );
}
