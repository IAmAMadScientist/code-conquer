import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AppShell from "../components/AppShell";
import EventFeed from "../components/EventFeed";
import PullToRefresh from "../components/PullToRefresh";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { getSession } from "../lib/session";
import { API_BASE } from "../lib/api";

export default function Leaderboard() {
  const session = useMemo(() => getSession(), []);
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const qs = new URLSearchParams();
      if (session?.sessionId) qs.set("sessionId", session.sessionId);

      const res = await fetch(`${API_BASE}/leaderboard?${qs.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      setErr(e?.message || "Failed to load leaderboard");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.sessionId]);

  return (
    <AppShell
      title="Leaderboard"
      subtitle={session?.sessionCode ? `Match: ${session.sessionCode}` : "Top scores"}
      showTabs
      activeTab="leaderboard"
      backTo="/play"
      headerBadges={
        <>
          {session?.sessionCode ? <Badge variant="secondary">{session.sessionCode}</Badge> : <Badge>Global</Badge>}
        </>
      }
      rightPanel={
        <div className="panel">
          <div style={{ fontSize: 16, fontWeight: 650 }}>Back to game</div>
          <div className="muted" style={{ fontSize: 14, marginTop: 10, lineHeight: 1.5 }}>
            Use <strong>Back to game</strong> to continue.
          </div>
        </div>
      }
    >
      <PullToRefresh onRefresh={load}>
        <div className="panel" style={{ display: "grid", gap: 12 }}>
          <div className={"stickyActions hasTabs"}>
            <div className="stickyActionsRow">
              <Link to="/play">
                <Button className="fullWidthBtn" variant="primary">Back to game</Button>
              </Link>
              <Button className="fullWidthBtn" variant="secondary" onClick={load} disabled={loading}>
                Refresh
              </Button>
            </div>
          </div>

        {loading ? <div className="muted">Loading…</div> : null}
        {err ? <div style={{ opacity: 0.9 }}>⚠️ {err}</div> : null}

        {session?.sessionId ? <EventFeed sessionId={session.sessionId} title="Game feed" limit={10} /> : null}

        {!loading && !err && rows.length === 0 ? (
          <div className="muted">No scores yet.</div>
        ) : null}

        {!loading && !err && rows.length > 0 ? (
          <div className="nativeList">
            {rows.map((r, idx) => (
              <div key={r.playerId || idx} className="nativeItem">
                <div className="nativeLeft">
                  <div className="nativeAvatar">{r.icon || "🙂"}</div>
                  <div className="nativeText">
                    <div className="nativeTitle">#{idx + 1} {r.playerName || "Player"}</div>
                    <div className="nativeSub">Total score</div>
                  </div>
                </div>
                <div className="nativeTrail">
                  <Badge variant="secondary">{r.totalScore ?? 0}</Badge>
                </div>
              </div>
            ))}
          </div>
        ) : null}
        </div>
      </PullToRefresh>
    </AppShell>
  );
}
