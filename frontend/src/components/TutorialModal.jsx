import React from "react";
import { Button } from "./ui/button";

/**
 * Blocks the minigame until the player acknowledges the tutorial.
 * Intentionally no dismiss-without-confirm.
 */
export default function TutorialModal({ open, tutorial, onConfirm }) {
  if (!open) return null;

  const t = tutorial || {};

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 140,
        background: "rgba(2,6,23,0.78)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      role="dialog"
      aria-modal="true"
      aria-label={t.title || "Tutorial"}
    >
      <div
        className="panel stack"
        style={{
          width: "min(720px, calc(100vw - 32px))",
          borderRadius: 22,
          padding: 16,
          paddingBottom: `calc(16px + env(safe-area-inset-bottom, 0px))`,
          boxShadow: "0 20px 60px rgba(0,0,0,0.55)",
        }}
      >
        <div>
          <div style={{ fontWeight: 950, fontSize: 18, letterSpacing: -0.2 }}>{t.title || "Tutorial"}</div>
          {t.summary ? <div className="muted" style={{ marginTop: 6, lineHeight: 1.5 }}>{t.summary}</div> : null}
        </div>

        {Array.isArray(t.howTo) && t.howTo.length ? (
          <div className="stack" style={{ gap: 10 }}>
            <div style={{ fontWeight: 900 }}>How to play</div>
            <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.55, opacity: 0.95 }}>
              {t.howTo.map((line, i) => (
                <li key={i} style={{ marginBottom: 6 }}>{line}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="row wrap" style={{ gap: 10 }}>
          {t.win ? <div className="panel" style={{ padding: 12, minWidth: 220, flex: "1 1 220px" }}>
            <div style={{ fontWeight: 900 }}>Win</div>
            <div className="muted" style={{ marginTop: 4, lineHeight: 1.4 }}>{t.win}</div>
          </div> : null}

          {t.lose ? <div className="panel" style={{ padding: 12, minWidth: 220, flex: "1 1 220px" }}>
            <div style={{ fontWeight: 900 }}>Lose</div>
            <div className="muted" style={{ marginTop: 4, lineHeight: 1.4 }}>{t.lose}</div>
          </div> : null}
        </div>

        {Array.isArray(t.tips) && t.tips.length ? (
          <div>
            <div style={{ fontWeight: 900 }}>Tips</div>
            <div className="chips" style={{ marginTop: 8 }}>
              {t.tips.map((x, i) => (
                <span key={i} className="chip">{x}</span>
              ))}
            </div>
          </div>
        ) : null}

        <div style={{ display: "grid", gap: 10, marginTop: 2 }}>
          <Button variant="primary" onClick={onConfirm} style={{ minHeight: 54, fontWeight: 950, fontSize: 16 }}>
            Start minigame
          </Button>
          <div className="muted" style={{ fontSize: 12, lineHeight: 1.4 }}>
            You will see this tutorial only once per minigame on this device.
          </div>
        </div>
      </div>
    </div>
  );
}
