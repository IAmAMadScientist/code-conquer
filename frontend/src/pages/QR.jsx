import React, { useMemo } from "react";
import { useParams } from "react-router-dom";
import AppShell from "../components/AppShell";
import { Badge } from "../components/ui/badge";
import QRCode from "react-qr-code";
import { getSession } from "../lib/session";

/**
 * Legacy page: shows a QR for joining the current match.
 * The lobby is the primary place for this QR now.
 */
export default function Qr() {
  const { level } = useParams();
  const session = useMemo(() => getSession(), []);
  const joinUrl = session?.sessionCode ? `${window.location.origin}/join/${session.sessionCode}` : "";

  return (
    <AppShell
      title="Join QR"
      subtitle="(Legacy) Join QR is shown in the lobby."
      headerBadges={
        <>
          <Badge variant="secondary">Level: {level}</Badge>
          {session?.sessionCode ? <Badge variant="secondary">Match: {session.sessionCode}</Badge> : null}
        </>
      }
    >
      <div className="panel" style={{ display: "grid", gap: 8, justifyItems: "center" }}>
        {joinUrl ? (
          <>
            <div style={{ background: "white", padding: 10, borderRadius: 12 }}>
              <QRCode value={joinUrl} size={200} />
            </div>
            <div className="muted" style={{ fontSize: 12, wordBreak: "break-all", textAlign: "center" }}>
              {joinUrl}
            </div>
          </>
        ) : (
          <div className="muted">No active match.</div>
        )}
      </div>
    </AppShell>
  );
}
