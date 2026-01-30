import React, { useEffect, useMemo, useState } from "react";
import { fetchEvents } from "../lib/player";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Card, CardContent } from "./ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { useToast } from "./ui/use-toast";
import { toastError } from "../lib/toast-helpers";

const MAX_ITEMS = 100;

function formatEvent(e) {
  // Backend uses {seq, ts, type, message, ...}
  const message = e?.message || e?.text || "";
  const ts = e?.ts || e?.createdAt || null;
  const when = ts ? new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
  return { message, when, type: e?.type || "" };
}

export default function EventFeed({ sessionId, title = "Game feed", limit = 8, pollMs = 1500, className = "" }) {
  const { toast } = useToast();
  const [events, setEvents] = useState([]);
  const [open, setOpen] = useState(false);
  const [lastSeenSeq, setLastSeenSeq] = useState(0);

  const lastSeq = useMemo(() => (events.length ? events[0]?.seq || 0 : 0), [events]);

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;

    async function loadInitial() {
      try {
        const data = await fetchEvents(sessionId, null, Math.min(MAX_ITEMS, Math.max(limit, 10)));
        if (cancelled) return;
        // Ensure newest-first
        const sorted = Array.isArray(data) ? data.slice().sort((a, b) => (b.seq || 0) - (a.seq || 0)) : [];
        setEvents(sorted);
        setLastSeenSeq(sorted.length ? (sorted[0]?.seq || 0) : 0);
      } catch (e) {
        if (cancelled) return;
        toastError(toast, e, "Event feed failed");
      }
    }

    loadInitial();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    let timer = null;

    async function poll() {
      try {
        const data = await fetchEvents(sessionId, lastSeq || 0, null);
        if (cancelled) return;
        if (!Array.isArray(data) || data.length === 0) return;
        setEvents((prev) => {
          const bySeq = new Set(prev.map((p) => p.seq));
          const merged = [...data.filter((d) => !bySeq.has(d.seq)), ...prev];
          return merged.slice(0, MAX_ITEMS);
        });
      } catch (e) {
        if (cancelled) return;
        // don’t spam toasts every poll — only show if dialog is open
        if (open) toastError(toast, e, "Event feed failed", { duration: 2600 });
      }
    }

    timer = window.setInterval(poll, Math.max(700, pollMs));
    return () => {
      cancelled = true;
      if (timer) window.clearInterval(timer);
    };
  }, [sessionId, lastSeq, pollMs, toast, open]);

  // Mark newest event as seen when opening the dialog.
  useEffect(() => {
    if (!open) return;
    setLastSeenSeq((prev) => Math.max(prev, lastSeq || 0));
  }, [open, lastSeq]);

  const last = events[0] ? formatEvent(events[0]) : null;
  const unread = useMemo(() => {
    if (open) return 0;
    if (!events.length) return 0;
    if (!lastSeenSeq) return 0;
    // events are newest-first
    let n = 0;
    for (const e of events) {
      const s = e?.seq || 0;
      if (s <= lastSeenSeq) break;
      n++;
    }
    return n;
  }, [events, lastSeenSeq, open]);

  return (
    <>
      <Card className={className}>
        <CardContent className="flex items-center justify-between gap-s3 py-s3">
          <div className="min-w-0">
            <div className="flex items-center gap-s2">
              <div className="text-fs0 font-semibold text-muted">{title}</div>
              {last?.when ? <Badge variant="secondary">{last.when}</Badge> : null}
            </div>
            <div className="mt-1 truncate text-sm">
              {last?.message ? last.message : <span className="text-muted">No events yet.</span>}
            </div>
          </div>
          <Button variant="ghost" onClick={() => setOpen(true)}>
            Open
            {unread > 0 ? <Badge variant="secondary" className="ml-s2">{unread}</Badge> : null}
          </Button>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[720px]">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-auto pr-1">
            <div className="space-y-s2">
              {events.length === 0 ? (
                <div className="text-muted">No events yet.</div>
              ) : (
                events.slice(0, Math.min(MAX_ITEMS, Math.max(limit, 10))).map((e) => {
                  const fe = formatEvent(e);
                  return (
                    <div
                      key={e.seq || `${fe.when}-${fe.message}`}
                      className="rounded-lg border border-border bg-surface2/60 px-s4 py-s3"
                    >
                      <div className="flex items-center justify-between gap-s3">
                        <div className="min-w-0 truncate font-semibold">{fe.message || "(no message)"}</div>
                        {fe.when ? <Badge variant="secondary">{fe.when}</Badge> : null}
                      </div>
                      {fe.type ? <div className="mt-1 text-fs0 text-muted">{fe.type}</div> : null}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
