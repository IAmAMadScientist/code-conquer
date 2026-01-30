import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../components/AppShell";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { getSession, clearSession } from "../lib/session";
import { clearPlayer, fetchLobby } from "../lib/player";
import { API_BASE } from "../lib/api";

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
      backTo={false}
      showBrand
      headerBadges={
        <>
          {session?.sessionCode ? <Badge variant="secondary">{session.sessionCode}</Badge> : null}
          <Badge variant="secondary">FINISHED</Badge>
        </>
      }
      rightPanel={
        <div className="panel stack">
          <div>
            <div style={{ fontWeight: 850 }}>Next</div>
            <div className="muted" style={{ marginTop: 6, lineHeight: 1.5 }}>
              This match is over. Start a new match from the main menu.
            </div>
          </div>
          <div className="divider" />
          <div className="muted" style={{ fontSize: 13, lineHeight: 1.5 }}>
            Tip: you can still open the Leaderboard to compare results.
          </div>
        </div>
      }
      actions={
        <div className="actionRow">
          <Button variant="secondary" onClick={() => nav("/leaderboard")}>Leaderboard</Button>
          <Button variant="primary" onClick={leaveToMenu}>Back to main menu</Button>
        </div>
      }
    >
      <div className="panel stack">
        {err ? <div style={{ opacity: 0.9 }}>⚠️ {err}</div> : null}

        <div className="panel">
          <div className="kicker">Winner</div>
          <div style={{ fontWeight: 900, fontSize: 20, marginTop: 6 }}>
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
        ) : (
          <div className="muted">No leaderboard entries yet.</div>
        )}
      </div>
    </AppShell>
  );
}
