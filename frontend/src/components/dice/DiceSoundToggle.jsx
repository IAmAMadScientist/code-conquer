import React from "react";
import "./dice.css";

export default function DiceSoundToggle({ enabled, setEnabled, compact = false }) {
  return (
    <button
      type="button"
      className="cc-soundToggle"
      onClick={() => setEnabled((v) => !v)}
      aria-label={enabled ? "Disable dice sound" : "Enable dice sound"}
      title={enabled ? "Sound on" : "Sound off"}
    >
      <span className={`cc-soundDot ${enabled ? "on" : ""}`} />
      <span>{compact ? (enabled ? "Sound" : "Sound") : enabled ? "Sound: On" : "Sound: Off"}</span>
      <span aria-hidden="true">{enabled ? "🔊" : "🔇"}</span>
    </button>
  );
}
