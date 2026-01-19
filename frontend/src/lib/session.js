const API_BASE = "http://localhost:8080/api";

const STORAGE_ID = "cc_sessionId";
const STORAGE_CODE = "cc_sessionCode";

// Player storage keys (kept here to clear on session leave)
const PLAYER_ID = "cc_playerId";
const PLAYER_NAME = "cc_playerName";
const PLAYER_ICON = "cc_playerIcon";

async function parseJsonOrThrow(res) {
  let data = null;
  try {
    data = await res.json();
  } catch {}
  if (!res.ok) {
    const msg = data?.error || data?.message || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

export function getSession() {
  const sessionId = localStorage.getItem(STORAGE_ID) || "";
  const sessionCode = localStorage.getItem(STORAGE_CODE) || "";
  if (!sessionId) return null;
  return { sessionId, sessionCode };
}

export function clearSession() {
  localStorage.removeItem(STORAGE_ID);
  localStorage.removeItem(STORAGE_CODE);

  // Also clear player identity on this device
  localStorage.removeItem(PLAYER_ID);
  localStorage.removeItem(PLAYER_NAME);
  localStorage.removeItem(PLAYER_ICON);
}

export async function createSession() {
  const res = await fetch(`${API_BASE}/sessions`, { method: "POST" });
  const data = await parseJsonOrThrow(res);
  localStorage.setItem(STORAGE_ID, data.id);
  localStorage.setItem(STORAGE_CODE, data.code || "");
  return { sessionId: data.id, sessionCode: data.code || "" };
}

export async function joinSessionByCode(code) {
  const res = await fetch(`${API_BASE}/sessions/code/${encodeURIComponent(code)}`);
  const data = await parseJsonOrThrow(res);
  localStorage.setItem(STORAGE_ID, data.id);
  localStorage.setItem(STORAGE_CODE, data.code || "");
  return { sessionId: data.id, sessionCode: data.code || "" };
}
