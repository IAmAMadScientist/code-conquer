import React, { useEffect, useMemo, useState } from "react";
// Navigation is handled by the bottom tab bar.
import AppShell from "../components/AppShell";
import EventFeed from "../components/EventFeed";
import PullToRefresh from "../components/PullToRefresh";
import { Badge } from "../components/ui/badge";
import { Card, CardContent } from "../components/ui/card";
import { useToast } from "../components/ui/use-toast";
import { toastError } from "../lib/toast-helpers";
import { getSession } from "../lib/session";
import { API_BASE } from "../lib/api";

export default function Leaderboard() {
  const session = useMemo(() => getSession(), []);
  const { toast } = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (session?.sessionId) qs.set("sessionId", session.sessionId);

      const res = await fetch(`${API_BASE}/leaderboard?${qs.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      toastError(toast, e, "Failed to load leaderboard");
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
        <Card className="min-h-0 flex-1">
          <CardContent className="flex min-h-0 flex-col gap-s3">
          {loading ? <div className="text-muted">Loading…</div> : null}
          {/* Errors are shown via toast */}

          {session?.sessionId ? <EventFeed sessionId={session.sessionId} title="Game feed" limit={10} /> : null}

          {!loading && rows.length === 0 ? (
            <div className="text-muted">No scores yet.</div>
          ) : null}

          {!loading && rows.length > 0 ? (
            <div className="min-h-0 flex-1 overflow-auto pr-1">
              <div className="space-y-s2">
                {rows.map((r, idx) => (
                  <div
                    key={r.playerId || idx}
                    className="flex items-center justify-between gap-s3 rounded-lg border border-border bg-surface2/60 px-s4 py-s3"
                  >
                    <div className="flex min-w-0 items-center gap-s3">
                      <div className="grid h-10 w-10 place-items-center rounded-full border border-border bg-surface text-[20px]">
                        {r.icon || "🙂"}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate font-extrabold">#{idx + 1} {r.playerName || "Player"}</div>
                        <div className="text-muted text-fs0">Total score</div>
                      </div>
                    </div>
                    <Badge variant="secondary">{r.totalScore ?? 0}</Badge>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          </CardContent>
        </Card>
      </PullToRefresh>
    </AppShell>
  );
}
