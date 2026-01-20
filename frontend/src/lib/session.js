const API_BASE = "http://localhost:8080/api";

const STORAGE_ID = "cc_sessionId";
const STORAGE_CODE = "cc_sessionCode";

export function getSession() {
  const sessionId = localStorage.getItem(STORAGE_ID) || "";
  const sessionCode = localStorage.getItem(STORAGE_CODE) || "";
  if (!sessionId) return null;
  return { sessionId, sessionCode };
}

export function clearSession() {
  localStorage.removeItem(STORAGE_ID);
  localStorage.removeItem(STORAGE_CODE);
  // also clear player identity for this device
  localStorage.removeItem("cc_playerId");
  localStorage.removeItem("cc_playerName");
  localStorage.removeItem("cc_playerIcon");
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
