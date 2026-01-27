import React from "react";
import { createPortal } from "react-dom";
import { getSoundEnabled, getHapticsEnabled, playWinSfx, playFailSfx } from "../lib/diceSound";

const Ctx = React.createContext(null);

/**
 * Global toast overlay for minigame results.
 * Stays visible across route changes (e.g. while the app already navigated back).
 */
export function MinigameResultToastProvider({ children }) {
  const [toast, setToast] = React.useState(null); // { title, subtitle, tone: 'win'|'lose' }
  const timerRef = React.useRef(null);

  const show = React.useCallback(({ won, title, subtitle }) => {
    // Clear prior timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    const tone = won ? "win" : "lose";
    setToast({
      tone,
      title: title || (won ? "You won!" : "You lost"),
      subtitle: subtitle || (won ? "Nice." : "Try again next turn."),
    });

    // Feedback (global sound/haptics settings)
    try {
      if (getHapticsEnabled() && navigator.vibrate) navigator.vibrate(won ? 28 : 22);
    } catch {}
    try {
      if (getSoundEnabled()) (won ? playWinSfx : playFailSfx)();
    } catch {}

    timerRef.current = setTimeout(() => {
      setToast(null);
      timerRef.current = null;
    }, 2400);
  }, []);

  React.useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <Ctx.Provider value={{ show }}>
      {children}
      {toast ? <ResultToast toast={toast} /> : null}
    </Ctx.Provider>
  );
}

export function useMinigameResultToast() {
  const ctx = React.useContext(Ctx);
  if (!ctx) return { show: () => {} };
  return ctx;
}

function ResultToast({ toast }) {
  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 9999,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: "calc(env(safe-area-inset-top) + 20px)",
      }}
    >
      <div
        style={{
          pointerEvents: "none",
          width: "min(92vw, 520px)",
          borderRadius: 22,
          border: "1px solid rgba(148,163,184,0.20)",
          background:
            toast.tone === "win"
              ? "linear-gradient(180deg, rgba(16,185,129,0.18), rgba(2,6,23,0.70))"
              : "linear-gradient(180deg, rgba(244,63,94,0.18), rgba(2,6,23,0.70))",
          boxShadow: "0 18px 60px rgba(0,0,0,0.55)",
          backdropFilter: "blur(10px)",
          padding: "14px 16px",
          transform: "translateY(0)",
          animation: "ccToastIn 240ms cubic-bezier(.2,.9,.2,1)",
        }}
      >
        <style>{`
          @keyframes ccToastIn { from { transform: translateY(-10px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        `}</style>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 14,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "1px solid rgba(255,255,255,0.10)",
              background: "rgba(2,6,23,0.35)",
              boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.02)",
              fontSize: 20,
            }}
          >
            {toast.tone === "win" ? "🏆" : "💥"}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 850, letterSpacing: "-0.01em" }}>{toast.title}</div>
            <div style={{ opacity: 0.72, fontSize: 13, marginTop: 2 }}>{toast.subtitle}</div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
