import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../components/AppShell";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { useToast } from "../components/ui/use-toast";
import { getSession, clearSession } from "../lib/session";
import { clearPlayer, fetchLobby } from "../lib/player";
import { API_BASE } from "../lib/api";

export default function Endscreen() {
  const nav = useNavigate();
  const { toast } = useToast();
  const session = useMemo(() => getSession(), []);

  const [state, setState] = useState(null);
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState(null);

  useEffect(() => {
    if (!err) return;
    toast({ title: "Error", description: err, variant: "destructive" });
  }, [err, toast]);

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
      backTo={false}
      showBrand
      headerBadges={
        <>
          {session?.sessionCode ? <Badge variant="secondary">{session.sessionCode}</Badge> : null}
          <Badge variant="secondary">FINISHED</Badge>
        </>
      }
      rightPanel={
        <Card>
          <CardContent className="space-y-s4">
            <div>
              <div className="text-fs2 font-extrabold">Next</div>
              <div className="mt-s1 text-muted leading-relaxed">
                This match is over. Start a new match from the main menu.
              </div>
            </div>
            <div className="h-px w-full bg-border/60" />
            <div className="text-muted text-fs0 leading-relaxed">
              Tip: you can still open the Leaderboard to compare results.
            </div>
          </CardContent>
        </Card>
      }
      actions={
        <div className="flex w-full flex-wrap items-center gap-s3">
          <Button variant="secondary" onClick={() => nav("/leaderboard")}>Leaderboard</Button>
          <Button variant="primary" onClick={leaveToMenu}>Back to main menu</Button>
        </div>
      }
    >
      <Card>
        <CardContent className="space-y-s4">
          {/* Errors are shown via toast */}

          <div className="rounded-lg border border-border bg-surface2 px-s4 py-s3">
            <div className="text-muted text-fs0 font-semibold">Winner</div>
            <div className="mt-s2 text-fs2 font-extrabold">
              {winner ? (
                <>
                  {winner.icon || "🙂"} {winner.name}
                </>
              ) : (
                <>—</>
              )}
            </div>
          </div>

          {rows.length ? (
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
          ) : (
            <div className="text-muted">No leaderboard entries yet.</div>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}
