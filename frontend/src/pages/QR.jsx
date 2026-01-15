import React, { useEffect, useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import AppShell from "../components/AppShell";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { getSession } from "../lib/session";
import { getPlayer } from "../lib/player";

/**
 * QR entrypoint.
 *
 * Use 3 QR codes that point to:
 *  - /qr/easy
 *  - /qr/medium
 *  - /qr/hard
 */
export default function Qr() {
  const nav = useNavigate();
  const session = getSession();
  const { level } = useParams();

  const difficulty = (() => {
    const v = (level || "").toLowerCase();
    if (v === "easy") return "EASY";
    if (v === "medium") return "MEDIUM";
    if (v === "hard") return "HARD";
    return null;
  })();

  useEffect(() => {
    if (!session?.sessionId) return; // wait for user to create/join a match
    if (!difficulty) return;
    // category intentionally omitted => backend picks random category.
    nav(`/challenge?difficulty=${encodeURIComponent(difficulty)}`, { replace: true });
  }, [difficulty, nav, session?.sessionId]);

  return (
    <AppShell
      title="Code & Conquer"
      subtitle="QR Challenge"
      headerBadges={
        <>
          <Badge>QR</Badge>
          {difficulty && <Badge>Diff: {difficulty}</Badge>}
        </>
      }
    >
      {!session?.sessionId ? (
        <div className="panel">
          <div style={{ fontWeight: 700, marginBottom: 6 }}>No active match</div>
          <div className="muted" style={{ marginBottom: 10 }}>
            Go to Home and create or join a match first, then scan the QR code again.
          </div>
          <Link to="/"><Button variant="primary">Go to Home</Button></Link>
        </div>
      ) : !difficulty ? (
        <>
          <div className="panel">
            <div style={{ fontWeight: 650 }}>Unknown QR code.</div>
            <div className="muted" style={{ marginTop: 8 }}>
              Expected /qr/easy, /qr/medium or /qr/hard.
            </div>
          </div>
          <div style={{ marginTop: 14 }}>
            <Link to="/">
              <Button variant="ghost">Back</Button>
            </Link>
          </div>
        </>
      ) : (
        <div className="panel">Opening a random {difficulty} minigame…</div>
      )}
    </AppShell>
  );
}
