import React, { useEffect, useMemo, useState } from "react";
import { fetchEvents } from "../lib/player";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";

// Mobile-friendly mini feed (collapsible) used in Play and Leaderboard.

export default function EventFeed({ sessionId, title = "Events", limit = 5, pollMs = 1500 }) {
  const MAX_ITEMS = 15;
  const isSmall = useMemo(() => {
    try {
      return window.matchMedia && window.matchMedia("(max-width: 520px)").matches;
    } catch {
      return false;
    }
  }, []);
  const storageKey = useMemo(() => (sessionId ? `cc_evtfeed_open_${sessionId}` : "cc_evtfeed_open"), [sessionId]);
  const [open, setOpen] = useState(() => {
    try {
      const v = localStorage.getItem(storageKey);
      if (v === null) return false; // default collapsed
      return v === "1";
    } catch {
      return false;
    }
  });

  // On small screens, start compact/collapsed even if it was open before.
  useEffect(() => {
    if (!isSmall) return;
    setOpen(false);
  }, [isSmall]);

  const [events, setEvents] = useState([]);
  const [lastSeq, setLastSeq] = useState(0);
  const [err, setErr] = useState(null);

  async function loadInitial() {
    if (!sessionId) return;
    try {
      setErr(null);
      const data = await fetchEvents(sessionId, null, Math.min(MAX_ITEMS, Math.max(limit, 10)));
      setEvents(data);
      const max = data.reduce((m, e) => Math.max(m, Number(e?.seq || 0)), 0);
      setLastSeq(max);
    } catch (e) {
      setErr(e?.message || "Event feed failed");
    }
  }

  async function poll() {
    if (!sessionId) return;
    try {
      setErr(null);
      const data = await fetchEvents(sessionId, lastSeq || 0, null);
      if (!data || data.length === 0) return;
      setEvents((prev) => {
        const merged = [...(prev || []), ...data];
        // De-dup by seq
        const bySeq = new Map();
        for (const e of merged) {
          if (!e) continue;
          bySeq.set(Number(e.seq), e);
        }
        const arr = Array.from(bySeq.values()).sort((a, b) => Number(a.seq) - Number(b.seq));
        // Keep only the newest MAX_ITEMS
        return arr.slice(-MAX_ITEMS);
      });
      const max = data.reduce((m, e) => Math.max(m, Number(e?.seq || 0)), lastSeq || 0);
      setLastSeq(max);
    } catch (e) {
      // non-fatal
      setErr(e?.message || "Event feed failed");
    }
  }

  useEffect(() => {
    if (!sessionId) return;
    loadInitial();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) return;
    const t = setInterval(poll, pollMs);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, lastSeq, pollMs]);

  function toggle() {
    const next = !open;
    setOpen(next);
    try {
      localStorage.setItem(storageKey, next ? "1" : "0");
    } catch {}
  }

  // Hard-cap the feed for readability on mobile.
  const bounded = events.slice(-MAX_ITEMS);
  // On small screens keep it compact even when expanded.
  const effectiveLimit = isSmall ? Math.min(Math.max(limit, 1), 3) : Math.max(limit, 1);
  const shown = open ? bounded.slice(-Math.max(effectiveLimit, 1)) : bounded.slice(-1);
  const last = bounded.length ? bounded[bounded.length - 1] : null;

  return (
    <div className="panel" style={{ display: "grid", gap: 10 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{ fontWeight: 800 }}>{title}</div>
          <Badge variant="outline" style={{ fontVariantNumeric: "tabular-nums" }}>
            {events.length}
          </Badge>
        </div>
        <Button variant="secondary" onClick={toggle} style={{ minHeight: 44, paddingInline: 14 }}>
          {open ? "Hide" : "Show"}
        </Button>
      </div>

      {err ? <div className="muted" style={{ fontSize: 13 }}>⚠️ {err}</div> : null}

      {!open && last ? (
        <div className="muted" style={{ fontSize: 14, lineHeight: 1.35 }}>
          {last.message}
        </div>
      ) : null}

      {open ? (
        <div style={{ maxHeight: 200, overflow: "auto", paddingRight: 4 }}>
          {shown.length === 0 ? <div className="muted">No events yet.</div> : null}
          <div className="nativeList">
            {shown.map((e) => (
              <div key={e.seq} className="nativeItem">
                <div className="nativeLeft">
                  <div className="nativeAvatar" style={{ fontSize: 14, fontVariantNumeric: "tabular-nums" }}>#{e.seq}</div>
                  <div className="nativeText">
                    <div className="nativeTitle" style={{ fontWeight: 750 }}>{e.message}</div>
                    <div className="nativeSub">Feed</div>
                  </div>
                </div>
                <div className="nativeTrail">
                  <Badge variant="outline">{String(e.type || "evt")}</Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
