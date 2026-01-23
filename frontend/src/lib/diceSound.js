import React from "react";

// Tiny WebAudio SFX for dice rolls (no assets, works offline).
// Sound is optional and controlled via localStorage.

const KEY = "cc_dice_sound_enabled";

export function getDiceSoundEnabled() {
  try {
    const v = localStorage.getItem(KEY);
    if (v == null) return false; // default OFF
    return v === "true";
  } catch {
    return false;
  }
}

export function setDiceSoundEnabled(enabled) {
  try {
    localStorage.setItem(KEY, String(Boolean(enabled)));
  } catch {
    // ignore
  }
}

function ensureCtx() {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  // Keep one context for the whole app.
  if (!window.__cc_audio_ctx) window.__cc_audio_ctx = new AudioCtx();
  return window.__cc_audio_ctx;
}

function playTone({ freq = 220, durationMs = 120, type = "sine", gain = 0.06, detune = 0, ramp = true }) {
  const ctx = ensureCtx();
  if (!ctx) return;
  // Some browsers require a user gesture before audio can play.
  if (ctx.state === "suspended") {
    ctx.resume().catch(() => {});
  }

  const osc = ctx.createOscillator();
  const g = ctx.createGain();

  osc.type = type;
  osc.frequency.value = freq;
  osc.detune.value = detune;

  const now = ctx.currentTime;
  const dur = durationMs / 1000;
  if (ramp) {
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(gain, now + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  } else {
    g.gain.setValueAtTime(gain, now);
    g.gain.setValueAtTime(0.0001, now + dur);
  }

  osc.connect(g);
  g.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + dur + 0.02);
}

export function playDiceRollSfx() {
  // A short "rattle" made of 3 quick tones.
  playTone({ freq: 160, durationMs: 70, type: "triangle", gain: 0.05, detune: -20 });
  setTimeout(() => playTone({ freq: 210, durationMs: 70, type: "triangle", gain: 0.05, detune: 10 }), 55);
  setTimeout(() => playTone({ freq: 260, durationMs: 90, type: "triangle", gain: 0.05, detune: 0 }), 110);
}

export function playDiceLandSfx() {
  // Neon-ish "ping".
  playTone({ freq: 640, durationMs: 140, type: "sine", gain: 0.06, detune: 0 });
  setTimeout(() => playTone({ freq: 880, durationMs: 120, type: "sine", gain: 0.035, detune: 0 }), 40);
}

export function useDiceSoundSetting() {
  // Tiny hook helper without adding dependencies.
  const [enabled, setEnabled] = React.useState(getDiceSoundEnabled());
  React.useEffect(() => {
    setDiceSoundEnabled(enabled);
  }, [enabled]);
  return [enabled, setEnabled];
}
