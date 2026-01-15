const API_BASE = "http://localhost:8080/api";

const STORAGE_PID = "cc_playerId";
const STORAGE_PNAME = "cc_playerName";

export function getPlayer() {
  const playerId = localStorage.getItem(STORAGE_PID) || "";
  const playerName = localStorage.getItem(STORAGE_PNAME) || "";
  if (!playerId) return null;
  return { playerId, playerName };
}

export function clearPlayer() {
  localStorage.removeItem(STORAGE_PID);
  localStorage.removeItem(STORAGE_PNAME);
}

async function parseJsonOrThrow(res) {
  let data = null;
  try {
    data = await res.json();
  } catch {}
  if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);
  return data;
}

export async function registerPlayer(sessionId, name) {
  const res = await fetch(`${API_BASE}/sessions/${encodeURIComponent(sessionId)}/players`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  const data = await parseJsonOrThrow(res);
  localStorage.setItem(STORAGE_PID, data.playerId);
  localStorage.setItem(STORAGE_PNAME, data.name || name);
  return { playerId: data.playerId, playerName: data.name || name };
}
