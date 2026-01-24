import { API_BASE } from "./api";

const STORAGE_ID = "cc_sessionId";
const STORAGE_CODE = "cc_sessionCode";

export function getSession() {
  const sessionId = sessionStorage.getItem(STORAGE_ID) || "";
  const sessionCode = sessionStorage.getItem(STORAGE_CODE) || "";
  if (!sessionId) return null;
  return { sessionId, sessionCode };
}

export function clearSession() {
  sessionStorage.removeItem(STORAGE_ID);
  sessionStorage.removeItem(STORAGE_CODE);
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
  return { sessionId: data.id, sessionCode: data.code || "" };
}

export async function joinSessionByCode(code) {
  const res = await fetch(`${API_BASE}/sessions/code/${encodeURIComponent(code)}`);
  const data = await parseJsonOrThrow(res);
  sessionStorage.setItem(STORAGE_ID, data.id);
  sessionStorage.setItem(STORAGE_CODE, data.code || "");
  return { sessionId: data.id, sessionCode: data.code || "" };
}
