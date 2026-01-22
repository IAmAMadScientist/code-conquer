const API_BASE = "http://localhost:8080/api";

const STORAGE_PID = "cc_playerId";
const STORAGE_PNAME = "cc_playerName";
const STORAGE_PICON = "cc_playerIcon";

export function getPlayer() {
  const playerId = sessionStorage.getItem(STORAGE_PID) || "";
  const playerName = sessionStorage.getItem(STORAGE_PNAME) || "";
  const playerIcon = sessionStorage.getItem(STORAGE_PICON) || "";
  if (!playerId) return null;
  return { playerId, playerName, playerIcon };
}

export function clearPlayer() {
  sessionStorage.removeItem(STORAGE_PID);
  sessionStorage.removeItem(STORAGE_PNAME);
  sessionStorage.removeItem(STORAGE_PICON);
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
  sessionStorage.setItem(STORAGE_PID, data.playerId);
  sessionStorage.setItem(STORAGE_PNAME, data.name || name);
  sessionStorage.setItem(STORAGE_PICON, data.icon || icon || "🙂");
  return { playerId: data.playerId, playerName: data.name || name, playerIcon: data.icon || icon || "🙂" };
}

export async function leaveSession(sessionId, playerId) {
  const res = await fetch(`${API_BASE}/sessions/${encodeURIComponent(sessionId)}/players/${encodeURIComponent(playerId)}`, {
    method: "DELETE",
  });
  // We don't care if backend returns 4xx when already gone.
  return res.ok;
}

// Best-effort leave on tab/window close.
export function leaveSessionBeacon(sessionId, playerId) {
  try {
    const url = `${API_BASE}/sessions/${encodeURIComponent(sessionId)}/players/${encodeURIComponent(playerId)}`;
    // "keepalive" allows the request to be sent while the page is unloading.
    fetch(url, { method: "DELETE", keepalive: true });
    return true;
  } catch {
    return false;
  }
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

export async function rollLobbyD20(sessionId, playerId) {
  const res = await fetch(`${API_BASE}/sessions/${encodeURIComponent(sessionId)}/lobby/roll?playerId=${encodeURIComponent(playerId)}`, {
    method: "POST",
  });
  const data = await parseJsonOrThrow(res);
  return data; // { roll }
}

export async function rollTurnD6(sessionId, playerId) {
  const res = await fetch(
    `${API_BASE}/turn/rollD6?sessionId=${encodeURIComponent(sessionId)}&playerId=${encodeURIComponent(playerId)}`,
    { method: "POST" }
  );
  const data = await parseJsonOrThrow(res);
  return data;
}

export async function chooseTurnPath(sessionId, playerId, toNodeId) {
  const res = await fetch(
    `${API_BASE}/turn/choosePath?sessionId=${encodeURIComponent(sessionId)}&playerId=${encodeURIComponent(playerId)}&toNodeId=${encodeURIComponent(toNodeId)}`,
    { method: "POST" }
  );
  const data = await parseJsonOrThrow(res);
  return data;
}

// Board-driven challenge selection (Phase 2D)
export async function startTurnChallenge(sessionId, playerId, category) {
  const qs = new URLSearchParams();
  qs.set("sessionId", sessionId);
  qs.set("playerId", playerId);
  if (category) qs.set("category", String(category).toUpperCase());
  const res = await fetch(`${API_BASE}/challenges/forTurn?${qs.toString()}`);
  const data = await parseJsonOrThrow(res);
  return data;
}

// Phase 3: poll game events for a session.
export async function fetchEvents(sessionId, afterSeq, limit) {
  const qs = new URLSearchParams();
  if (afterSeq != null) qs.set("afterSeq", String(afterSeq));
  if (limit != null) qs.set("limit", String(limit));
  const res = await fetch(`${API_BASE}/sessions/${encodeURIComponent(sessionId)}/events?${qs.toString()}`);
  const data = await parseJsonOrThrow(res);
  return Array.isArray(data) ? data : [];
}
