import React from "react";

// Tiny WebAudio SFX for the whole game (no assets, works offline).
// Sound is optional and controlled via localStorage.

const KEY_SOUND = "cc_sound_enabled";
const KEY_HAPTICS = "cc_haptics_enabled";

export function getSoundEnabled() {
  try {
    const v = localStorage.getItem(KEY_SOUND);
    if (v == null) return false; // default OFF
    return v === "true";
  } catch {
    return false;
  }
}

export function setSoundEnabled(enabled) {
  try {
    localStorage.setItem(KEY_SOUND, String(Boolean(enabled)));
  } catch {
    // ignore
  }
}

export function getHapticsEnabled() {
  try {
    const v = localStorage.getItem(KEY_HAPTICS);
    if (v == null) return true; // default ON
    return v === "true";
  } catch {
    return true;
  }
}

export function setHapticsEnabled(enabled) {
  try {
    localStorage.setItem(KEY_HAPTICS, String(Boolean(enabled)));
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

function playNoise({ durationMs = 120, gain = 0.06, bandpassHz = 900, q = 0.8 }) {
  const ctx = ensureCtx();
  if (!ctx) return;
  if (ctx.state === "suspended") ctx.resume().catch(() => {});

  const now = ctx.currentTime;
  const dur = durationMs / 1000;

  // White noise buffer.
  const buf = ctx.createBuffer(1, Math.max(1, Math.floor(ctx.sampleRate * dur)), ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.85;

  const src = ctx.createBufferSource();
  src.buffer = buf;

  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = bandpassHz;
  bp.Q.value = q;

  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(gain, now + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, now + dur);

  src.connect(bp);
  bp.connect(g);
  g.connect(ctx.destination);
  src.start(now);
  src.stop(now + dur + 0.02);
}

export function playDiceRollSfx() {
  // A more dice-like "rattle": short bandpassed noise bursts + tiny clicks.
  // (No assets needed, works offline.)
  const clicks = [0, 70, 140, 220, 320];
  clicks.forEach((t, i) => {
    setTimeout(() => {
      playNoise({ durationMs: 85, gain: 0.045, bandpassHz: 850 + i * 140, q: 0.9 });
      playTone({ freq: 120 + i * 22, durationMs: 18, type: "square", gain: 0.02, ramp: true });
    }, t);
  });
}

export function playDiceLandSfx() {
  // A short "thud" with a crisp click.
  playTone({ freq: 96, durationMs: 140, type: "sine", gain: 0.06, detune: -5 });
  playNoise({ durationMs: 70, gain: 0.03, bandpassHz: 520, q: 0.7 });
  setTimeout(() => playTone({ freq: 320, durationMs: 22, type: "square", gain: 0.02, detune: 0 }), 22);
}

// --- Generic UI / minigame SFX (no assets) ---
// These are intentionally subtle and "gamey" for mobile.

export function playUiTapSfx() {
  // crisp tiny tap
  playTone({ freq: 360, durationMs: 26, type: "square", gain: 0.018, detune: 0, ramp: true });
}

export function playMoveSfx() {
  // soft tick
  playTone({ freq: 260, durationMs: 30, type: "triangle", gain: 0.02, detune: -8, ramp: true });
}

export function playFailSfx() {
  // "bonk" + fizz
  playTone({ freq: 150, durationMs: 140, type: "sine", gain: 0.055, detune: -18, ramp: true });
  playNoise({ durationMs: 90, gain: 0.02, bandpassHz: 650, q: 0.9 });
}

export function playWinSfx() {
  // small "victory" chirp
  playTone({ freq: 330, durationMs: 80, type: "sine", gain: 0.05, detune: 0, ramp: true });
  setTimeout(() => playTone({ freq: 440, durationMs: 90, type: "sine", gain: 0.055, detune: 0, ramp: true }), 90);
  setTimeout(() => playTone({ freq: 560, durationMs: 110, type: "triangle", gain: 0.055, detune: 0, ramp: true }), 190);
}

export function useSoundSetting() {
  // Tiny hook helper without adding dependencies.
  const [enabled, setEnabled] = React.useState(getSoundEnabled());
  React.useEffect(() => {
    setSoundEnabled(enabled);
  }, [enabled]);
  return [enabled, setEnabled];
}

export function useHapticsSetting() {
  const [enabled, setEnabled] = React.useState(getHapticsEnabled());
  React.useEffect(() => {
    setHapticsEnabled(enabled);
  }, [enabled]);
  return [enabled, setEnabled];
}

// Backwards-compatible exports (older components may still import these names).
export const getDiceSoundEnabled = getSoundEnabled;
export const setDiceSoundEnabled = setSoundEnabled;
export const useDiceSoundSetting = useSoundSetting;

// New exports
export const getDiceHapticsEnabled = getHapticsEnabled;
export const setDiceHapticsEnabled = setHapticsEnabled;
export const useDiceHapticsSetting = useHapticsSetting;
