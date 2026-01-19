const API_BASE = "http://localhost:8080/api";

const STORAGE_PID = "cc_playerId";
const STORAGE_PNAME = "cc_playerName";
const STORAGE_PICON = "cc_playerIcon";

export function getPlayer() {
  const playerId = localStorage.getItem(STORAGE_PID) || "";
  const playerName = localStorage.getItem(STORAGE_PNAME) || "";
  const playerIcon = localStorage.getItem(STORAGE_PICON) || "";
  if (!playerId) return null;
  return { playerId, playerName, playerIcon };
}

export function clearPlayer() {
  localStorage.removeItem(STORAGE_PID);
  localStorage.removeItem(STORAGE_PNAME);
  localStorage.removeItem(STORAGE_PICON);
}

async function parseJsonOrThrow(res) {
  let data = null;
  try {
    data = await res.json();
  } catch {}
  if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);
  return data;
}

export async function registerPlayer(sessionId, name, icon) {
  const res = await fetch(`${API_BASE}/sessions/${encodeURIComponent(sessionId)}/players`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, icon }),
  });
  const data = await parseJsonOrThrow(res);
  localStorage.setItem(STORAGE_PID, data.playerId);
  localStorage.setItem(STORAGE_PNAME, data.name || name);
  localStorage.setItem(STORAGE_PICON, data.icon || icon || "🙂");
  return { playerId: data.playerId, playerName: data.name || name, playerIcon: data.icon || icon || "🙂" };
}

export async function setReady(sessionId, playerId, ready) {
  const res = await fetch(`${API_BASE}/sessions/${encodeURIComponent(sessionId)}/players/${encodeURIComponent(playerId)}/ready`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ready }),
  });
  const data = await parseJsonOrThrow(res);
  return data;
}

export async function fetchLobby(sessionId) {
  const res = await fetch(`${API_BASE}/sessions/${encodeURIComponent(sessionId)}/lobby`);
  const data = await parseJsonOrThrow(res);
  return data;
}
