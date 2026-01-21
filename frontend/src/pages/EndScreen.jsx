import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AppShell from "../components/AppShell";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { getSession, clearSession } from "../lib/session";
import { clearPlayer, fetchLobby } from "../lib/player";

const API_BASE = "http://localhost:8080/api";

export default function Endscreen() {
  const nav = useNavigate();
  const session = useMemo(() => getSession(), []);

  const [state, setState] = useState(null);
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!session?.sessionId) return;
      setErr(null);
      try {
        const s = await fetchLobby(session.sessionId);
        if (cancelled) return;
        setState(s);

        const qs = new URLSearchParams();
        qs.set("sessionId", session.sessionId);
        const res = await fetch(`${API_BASE}/leaderboard?${qs.toString()}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
        if (!cancelled) setRows(Array.isArray(data) ? data : []);
      } catch (e) {
        if (!cancelled) setErr(e?.message || "Failed to load endscreen");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [session?.sessionId]);

  function leaveToMenu() {
    clearPlayer();
    clearSession();
    nav("/");
  }

  const winner = (state?.players || []).find((p) => p.id === state?.winnerPlayerId);

  return (
    <AppShell
      title="Game finished"
      subtitle={session?.sessionCode ? `Match: ${session.sessionCode}` : ""}
      headerBadges={
        <>
          {session?.sessionCode ? <Badge variant="secondary">{session.sessionCode}</Badge> : null}
          <Badge variant="secondary">FINISHED</Badge>
        </>
      }
      rightPanel={
        <div className="panel">
          <div style={{ fontSize: 16, fontWeight: 650 }}>Next</div>
          <div className="muted" style={{ fontSize: 14, marginTop: 10, lineHeight: 1.5 }}>
            This match is over. Start a new match from the main menu.
          </div>
        </div>
      }
    >
      <div className="panel" style={{ display: "grid", gap: 12 }}>
        {err ? <div style={{ opacity: 0.9 }}>⚠️ {err}</div> : null}

        <div className="panel" style={{ border: "1px solid rgba(148,163,184,0.22)" }}>
          <div style={{ fontWeight: 850, fontSize: 18, marginBottom: 6 }}>🏁 Winner</div>
          {winner ? (
            <div style={{ fontSize: 16 }}>
              <strong>{winner.icon || "🙂"} {winner.name}</strong>
            </div>
          ) : (
            <div className="muted">Winner: {state?.winnerPlayerId || "—"}</div>
          )}
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link to="/leaderboard"><Button variant="secondary">Leaderboard</Button></Link>
          <Button variant="primary" onClick={leaveToMenu}>Back to main menu</Button>
        </div>

        {rows.length ? (
          <div style={{ display: "grid", gap: 8, marginTop: 6 }}>
            {rows.map((r, idx) => (
              <div
                key={r.playerId || idx}
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
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <div style={{ fontSize: 20, width: 26, textAlign: "center" }}>{r.icon || "🙂"}</div>
                  <div style={{ display: "grid", gap: 2 }}>
                    <div style={{ fontWeight: 750 }}>#{idx + 1} {r.playerName || "Player"}</div>
                    <div className="muted" style={{ fontSize: 12 }}>Total score</div>
                  </div>
                </div>
                <Badge variant="secondary">{r.totalScore ?? 0}</Badge>
              </div>
            ))}
          </div>
        ) : (
          <div className="muted">No leaderboard entries yet.</div>
        )}
      </div>
    </AppShell>
  );
}
