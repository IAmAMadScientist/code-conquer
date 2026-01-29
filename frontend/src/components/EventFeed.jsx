import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { fetchEvents } from "../lib/player";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";

// Mobile-friendly mini feed (collapsible) used in Play and Leaderboard.
// NOTE: Expanding this panel must NEVER push/reflow the surrounding layout.
// It should always behave like an overlay above other UI.

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
  const panelRef = useRef(null);
  const collapsedHRef = useRef(0);
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

  // Keep items bounded for performance.
  const bounded = events.slice(-MAX_ITEMS);
  // Respect the caller's limit (no hidden mobile cap).
  const effectiveLimit = Math.max(limit, 1);
  const shown = open ? bounded.slice(-Math.max(effectiveLimit, 1)) : bounded.slice(-1);
  const last = bounded.length ? bounded[bounded.length - 1] : null;

  function extractLastNumber(str) {
    const m = String(str || "").match(/(\d+)\s*$/);
    return m ? m[1] : null;
  }

  function formatEvent(e) {
    const type = String(e?.type || "");
    const raw = String(e?.message || "");
    // Remove leading emojis to save horizontal space.
    const msg = raw.replace(/^\s*[\p{Emoji_Presentation}\p{Extended_Pictographic}]+\s*/u, "");

    if (type === "D6_ROLL") {
      // Server message: "🎲 <player> würfelt D6: <n>"
      const n = (raw.match(/D6\s*:\s*(\d+)/i) || [])[1] || extractLastNumber(raw);
      // Goal: keep the important info visible in one line: "<name> D6=4"
      const compactMsg = msg
        .replace(/würfelt\s*D6\s*:\s*\d+/i, (n ? `D6=${n}` : "D6"))
        .replace(/\s{2,}/g, " ")
        .trim();
      return { badge: n ? `D6=${n}` : "D6", message: compactMsg };
    }

    if (type === "DICE_ADV") {
      // Server message: "🎲✨ <player> würfelt zweimal: 2 & 5 → 7"
      const total = extractLastNumber(raw);
      const compactMsg = msg
        .replace(/würfelt\s*zweimal\s*:\s*/i, "rolls 2x: ")
        .replace(/\s*→\s*/g, " -> ");
      return { badge: total ? `D6=${total}` : "D6", message: compactMsg };
    }

    return { badge: type || "evt", message: msg };
  }
  // Pages should reserve ONLY the *collapsed* height so expanding the feed never pushes/reflows layout.
  // When collapsed, measure and store; when expanded, keep using the stored collapsed height.
  useLayoutEffect(() => {
    try {
      const el = panelRef.current;
      if (!el) return;

      if (!open) {
        const h = Math.ceil(el.getBoundingClientRect().height || 0);
        collapsedHRef.current = h;
        document.documentElement.style.setProperty("--cc-eventfeed-h", `${h}px`);
      } else {
        const h = collapsedHRef.current || Math.ceil(el.getBoundingClientRect().height || 0);
        document.documentElement.style.setProperty("--cc-eventfeed-h", `${h}px`);
      }
    } catch {}
  }, [open, shown.length, last?.seq]);


  // Always overlay: fixed position so showing/hiding never reflows the page.
  const wrapperStyle = {
    position: "fixed",
    top: "calc(var(--cc-topbar-h, 92px) + 10px)",
    left: 12,
    right: 12,
    maxWidth: 720,
    marginLeft: "auto",
    marginRight: "auto",
    zIndex: 60,
    pointerEvents: "none",
  };

  const panelStyle = { display: "grid", gap: 10, pointerEvents: "auto" };
  // (Legacy var) Keep in sync with the collapsed height var.
  useLayoutEffect(() => {
    try {
      const h = Number(collapsedHRef.current || 0);
      if (h > 0) document.documentElement.style.setProperty("--eventfeed-h", String(h));
    } catch {}
  }, [open]);


  return (
    <div style={wrapperStyle}>
      <div className="panel" style={panelStyle} ref={panelRef}>
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
        <div className="muted" style={{ fontSize: 12, lineHeight: 1.3 }}>
          {formatEvent(last).message}
        </div>
      ) : null}

      {open ? (
        <div style={{ maxHeight: 200, overflow: "auto", paddingRight: 4 }}>
          {shown.length === 0 ? <div className="muted">No events yet.</div> : null}
          <div className="nativeList">
            {shown.map((e) => (
              (() => {
                const fe = formatEvent(e);
                return (
              <div key={e.seq} className="nativeItem">
                <div className="nativeLeft">
                  <div className="nativeAvatar" style={{ fontSize: 12, fontVariantNumeric: "tabular-nums" }}>#{e.seq}</div>
                  <div className="nativeText">
                    <div
                      className="nativeTitle"
                      style={{ fontWeight: 750, fontSize: 13, lineHeight: 1.2, wordBreak: "break-word" }}
                    >
                      {fe.message}
                    </div>
                  </div>
                </div>
                <div className="nativeTrail">
                  <Badge
                    variant="outline"
                    style={{ fontSize: 11, padding: "2px 8px", fontVariantNumeric: "tabular-nums" }}
                  >
                    {fe.badge}
                  </Badge>
                </div>
              </div>
                );
              })()
            ))}
          </div>
        </div>
      ) : null}
      </div>
    </div>
  );
}
