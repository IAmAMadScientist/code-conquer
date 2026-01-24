import React, { useEffect, useRef, useState } from "react";

/**
 * Minimal "native-ish" pull-to-refresh.
 *
 * Our app uses the document as the scroller (window scroll). This component
 * listens for a downward pull while scrollY is at the very top.
 */
export default function PullToRefresh({ onRefresh, children, threshold = 70 }) {
  const startY = useRef(null);
  const [pull, setPull] = useState(0);
  const [armed, setArmed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!onRefresh) return;

    function onStart(e) {
      if (refreshing) return;
      if (window.scrollY !== 0) return;
      const t = e.touches?.[0];
      if (!t) return;
      startY.current = t.clientY;
      setPull(0);
      setArmed(false);
    }

    function onMove(e) {
      if (refreshing) return;
      if (startY.current == null) return;
      if (window.scrollY !== 0) return;
      const t = e.touches?.[0];
      if (!t) return;
      const dy = Math.max(0, t.clientY - startY.current);
      // Gentle resistance
      const eased = Math.min(140, dy * 0.65);
      setPull(eased);
      setArmed(eased >= threshold);

      // Prevent the browser rubber-band from fighting our indicator.
      if (dy > 6) e.preventDefault();
    }

    async function onEnd() {
      if (refreshing) return;
      const should = armed;
      startY.current = null;
      setArmed(false);

      if (!should) {
        setPull(0);
        return;
      }

      try {
        setRefreshing(true);
        setPull(threshold);
        await onRefresh();
      } finally {
        setRefreshing(false);
        setPull(0);
      }
    }

    window.addEventListener("touchstart", onStart, { passive: true });
    // We need passive:false for preventDefault
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onEnd, { passive: true });
    window.addEventListener("touchcancel", onEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("touchcancel", onEnd);
    };
  }, [armed, onRefresh, refreshing, threshold]);

  const visible = pull > 0 || refreshing;
  const pct = Math.min(1, pull / threshold);
  const label = refreshing ? "Refreshing…" : armed ? "Release to refresh" : "Pull to refresh";

  return (
    <>
      <div
        className={visible ? "ptrIndicator visible" : "ptrIndicator"}
        style={{ transform: `translateY(${Math.min(0, -44 + pull)}px)` }}
        aria-hidden={!visible}
      >
        <div className="ptrPill">
          <div className={refreshing ? "ptrSpinner spinning" : "ptrSpinner"} style={{ transform: `rotate(${pct * 240}deg)` }}>
            ↻
          </div>
          <div className="ptrText">{label}</div>
        </div>
      </div>
      {children}
    </>
  );
}
