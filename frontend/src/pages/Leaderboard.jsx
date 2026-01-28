import React, { useEffect, useMemo, useState } from "react";
// Navigation is handled by the bottom tab bar.
import AppShell from "../components/AppShell";
import EventFeed from "../components/EventFeed";
import PullToRefresh from "../components/PullToRefresh";
import { Badge } from "../components/ui/badge";
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
      backTo={false}
      showBrand
      headerBadges={
        <>
          {session?.sessionCode ? <Badge variant="secondary">{session.sessionCode}</Badge> : <Badge>Global</Badge>}
        </>
      }
    >
      <PullToRefresh onRefresh={load}>
        <style>{`
          .lbWrap{ height:100%; min-height:0; display:flex; flex-direction:column; gap:12px; }
          .lbList{ flex:1; min-height:0; overflow:auto; padding-right:4px; }
        `}</style>

        <div className="panel lbWrap" style={{ height: "100%", minHeight: 0 }}>
          {/* Reserve space under the fixed (collapsed) EventFeed so it never overlaps content. */}
          {session?.sessionId ? <div style={{ height: "calc(var(--cc-eventfeed-h, 72px) + 8px)" }} aria-hidden /> : null}
        {loading ? <div className="muted">Loading…</div> : null}
        {err ? <div style={{ opacity: 0.9 }}>⚠️ {err}</div> : null}

        {/* Fixed overlay (does not affect layout). */}
        {session?.sessionId ? <EventFeed sessionId={session.sessionId} title="Game feed" limit={10} /> : null}

        {!loading && !err && rows.length === 0 ? (
          <div className="muted">No scores yet.</div>
        ) : null}

        {!loading && !err && rows.length > 0 ? (
          <div className="lbList">
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
          </div>
        ) : null}
        </div>
      </PullToRefresh>
    </AppShell>
  );
}
