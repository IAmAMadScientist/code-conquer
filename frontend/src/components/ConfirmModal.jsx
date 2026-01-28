import React from "react";
import { Button } from "./ui/button";

/**
 * Mobile-first confirmation modal.
 * Avoids window.confirm (which looks/behaves badly on mobile).
 */
export default function ConfirmModal({
  open,
  title = "Confirm",
  message,
  confirmText = "OK",
  cancelText = "Cancel",
  danger = false,
  onConfirm,
  onClose,
}) {
  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 120,
        background: "rgba(2,6,23,0.72)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="panel"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(520px, calc(100vw - 32px))",
          borderRadius: 22,
          padding: 16,
          paddingBottom: `calc(16px + env(safe-area-inset-bottom, 0px))`,
          display: "grid",
          gap: 12,
          boxShadow: "0 20px 60px rgba(0,0,0,0.55)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div style={{ fontWeight: 900, fontSize: 16 }}>{title}</div>
          <Button variant="ghost" onClick={onClose} style={{ minHeight: 44 }}>
            Close
          </Button>
        </div>

        {message ? (
          <div style={{ opacity: 0.92, lineHeight: 1.35, whiteSpace: "pre-line" }}>{message}</div>
        ) : null}

        <div style={{ display: "grid", gap: 10 }}>
          <Button
            variant={danger ? "primary" : "secondary"}
            onClick={onConfirm}
            style={{ minHeight: 52, fontWeight: 900 }}
          >
            {confirmText}
          </Button>
          <Button variant="ghost" onClick={onClose} style={{ minHeight: 52, fontWeight: 800 }}>
            {cancelText}
          </Button>
        </div>
      </div>
    </div>
  );
}
