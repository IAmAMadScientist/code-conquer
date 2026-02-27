import React, { useEffect, useMemo, useState } from "react";
import AppShell from "../components/AppShell";
import EventFeed from "../components/EventFeed";
import { Badge } from "../components/ui/badge";
import { Card, CardContent } from "../components/ui/card";
import { useToast } from "../components/ui/use-toast";
import { toastError } from "../lib/toast-helpers";
import { getSession } from "../lib/session";
import { API_BASE } from "../lib/api";
import { cn } from "../lib/utils";

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

  useEffect(() => { load(); }, [session?.sessionId]);

  return (
    <AppShell
      title="Leaderboard"
      subtitle={session?.sessionCode ? `MISSION SEQUENCE: #${session.sessionCode}` : "GLOBAL DATA LOG"}
      showTabs activeTab="leaderboard" backTo={false} showBrand
      headerBadges={
        <>
          {session?.sessionCode ? <Badge variant="secondary" className="px-2 py-0 text-[10px] font-black uppercase">Active Match</Badge> : <Badge className="px-2 py-0 text-[10px] font-black">Archive</Badge>}
        </>
      }
    >
      <div className="flex flex-col gap-s4 w-full max-w-md mx-auto">
        <Card className="flex flex-col min-h-0 border-white/5 bg-transparent shrink-0">
          <CardContent className="flex min-h-0 flex-col gap-s3 p-0">
            <div className="p-4 border-b border-white/5 bg-white/5 flex items-center justify-between">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-muted">Current Standings</div>
              {loading && <div className="w-4 h-4 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />}
            </div>

            {!loading && rows.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <div className="text-4xl opacity-20">🧊</div>
                <div className="text-[10px] font-black text-muted uppercase tracking-widest">No mission data logged</div>
              </div>
            ) : null}

            {!loading && rows.length > 0 ? (
              <div className="min-h-0 flex-1 overflow-auto custom-scrollbar">
                <div className="divide-y divide-white/5">
                  {rows.map((r, idx) => (
                    <div
                      key={r.playerId || idx}
                      className={cn("flex items-center justify-between gap-s3 px-4 py-4 transition-colors hover:bg-white/[0.02]", idx === 0 && "bg-indigo-500/[0.03]")}
                    >
                      <div className="flex min-w-0 items-center gap-s3">
                        <div className="relative">
                          <div className={cn("grid h-12 w-12 place-items-center rounded-2xl border text-[24px] transition-all duration-500", idx === 0 ? "border-amber-500/40 bg-amber-500/10 shadow-[0_0_20px_rgba(245,158,11,0.2)]" : "border-white/5 bg-white/5")}>
                            {r.icon || "🙂"}
                          </div>
                          <div className={cn("absolute -top-2 -left-2 w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black border shadow-lg", idx === 0 ? "bg-amber-500 border-amber-400 text-bg0" : "bg-bg2 border-border text-muted")}>
                            {idx + 1}
                          </div>
                        </div>
                        <div className="min-w-0">
                          <div className="truncate font-black text-white text-sm">{r.playerName || "Unknown User"}</div>
                          <div className="text-muted text-[9px] font-bold uppercase tracking-tighter">Points Accumulated</div>
                        </div>
                      </div>
                      <div className="text-right flex flex-col items-end">
                        <div className={cn("text-lg font-black tracking-tight leading-none", idx === 0 ? "text-amber-400" : "text-white")}>{r.totalScore ?? 0}</div>
                        <div className="text-[8px] font-black text-muted/40 uppercase tracking-widest mt-1">Score</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {session?.sessionId ? (
          <div className="lg:mt-2">
            <EventFeed sessionId={session.sessionId} title="Recent Activity" limit={5} />
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}