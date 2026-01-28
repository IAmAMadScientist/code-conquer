import { API_BASE } from "./api";

const STORAGE_ID = "cc_sessionId";
const STORAGE_CODE = "cc_sessionCode";
const STORAGE_STARTED = "cc_sessionStarted";

export function getSession() {
  const sessionId = sessionStorage.getItem(STORAGE_ID) || "";
  const sessionCode = sessionStorage.getItem(STORAGE_CODE) || "";
  if (!sessionId) return null;
  return { sessionId, sessionCode };
}

// Session meta shared across screens (used for the bottom tab behavior).
export function isSessionStarted() {
  return sessionStorage.getItem(STORAGE_STARTED) === "1";
}

export function setSessionStarted(started) {
  // Store as 0/1 to keep it robust.
  sessionStorage.setItem(STORAGE_STARTED, started ? "1" : "0");
}

export function clearSession() {
  sessionStorage.removeItem(STORAGE_ID);
  sessionStorage.removeItem(STORAGE_CODE);
  sessionStorage.removeItem(STORAGE_STARTED);
  // also clear player identity for this tab/session
  sessionStorage.removeItem("cc_playerId");
  sessionStorage.removeItem("cc_playerName");
  sessionStorage.removeItem("cc_playerIcon");
}


async function parseJsonOrThrow(res) {
  let data = null;
  try { data = await res.json(); } catch {}
  if (!res.ok) {
    const msg = data?.error || `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data;
}

export async function createSession() {
  const res = await fetch(`${API_BASE}/sessions`, { method: "POST" });
  const data = await parseJsonOrThrow(res);
  sessionStorage.setItem(STORAGE_ID, data.id);
  sessionStorage.setItem(STORAGE_CODE, data.code || "");
  setSessionStarted(false);
  return { sessionId: data.id, sessionCode: data.code || "" };
}

export async function joinSessionByCode(code) {
  const res = await fetch(`${API_BASE}/sessions/code/${encodeURIComponent(code)}`);
  const data = await parseJsonOrThrow(res);
  sessionStorage.setItem(STORAGE_ID, data.id);
  sessionStorage.setItem(STORAGE_CODE, data.code || "");
  setSessionStarted(false);
  return { sessionId: data.id, sessionCode: data.code || "" };
}
