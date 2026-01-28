import React, { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import Home from "./pages/Home";
import Challenge from "./pages/Challenge";
import Leaderboard from "./pages/Leaderboard";
import Join from "./pages/Join";
import Play from "./pages/Play";
import Lobby from "./pages/Lobby";
import TurnSummary from "./pages/TurnSummary";
import EndScreen from "./pages/EndScreen";
import StackMazePage from "./pages/StackMazePage";
import GraphPathfinderPage from "./pages/GraphPathfinderPage";
import BSTInsertPage from "./pages/BSTInsertPage";
import QueueCommanderPage from "./pages/QueueCommanderPage";
import BitJumperPage from "./pages/BitJumperPage";

import { getSession } from "./lib/session";
import { getPlayer, leaveSessionBeacon, registerPlayer } from "./lib/player";
import { API_BASE } from "./lib/api";
import { DiceOverlayProvider } from "./components/dice/DiceOverlayProvider";
import { MinigameResultToastProvider } from "./components/MinigameResultToastProvider";

export default function App() {
  // Best-effort: when the tab/window is closed, remove the player from the match.
  // This enforces "identity per session" and keeps lobbies/turns clean.
  useEffect(() => {
    // If a refresh happened and the server removed the player (because the page was unloading),
    // automatically re-register with the stored name/icon so the user doesn't need to re-pick.
    (async () => {
      const s = getSession();
      const p = getPlayer();
      if (!s?.sessionId || !p?.playerId) return;

      try {
        const res = await fetch(`${API_BASE}/sessions/${encodeURIComponent(s.sessionId)}/players`);
        const players = res.ok ? await res.json() : [];
        const stillThere = Array.isArray(players) && players.some((pl) => pl.id === p.playerId);
        if (!stillThere && p.playerName) {
          await registerPlayer(s.sessionId, p.playerName, p.playerIcon || "🙂");
        }
      } catch {
        // Ignore: worst case user goes through join flow again.
      }
    })();

    const handler = () => {
      const s = getSession();
      const p = getPlayer();
      if (s?.sessionId && p?.playerId) {
        leaveSessionBeacon(s.sessionId, p.playerId);
      }
    };

    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  return (
    <DiceOverlayProvider>
      <MinigameResultToastProvider>
        <Router>
          <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/challenge" element={<Challenge />} />
        <Route path="/join/:code" element={<Join />} />
        <Route path="/play" element={<Play />} />
        <Route path="/lobby" element={<Lobby />} />
        <Route path="/turn-summary" element={<TurnSummary />} />
        <Route path="/end" element={<EndScreen />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/stackmaze" element={<StackMazePage />} />
        <Route path="/graphpath" element={<GraphPathfinderPage />} />
        <Route path="/bstinsert" element={<BSTInsertPage />} />
        <Route path="/queuecommander" element={<QueueCommanderPage />} />
        <Route path="/bitjumper" element={<BitJumperPage />} />
          </Routes>
        </Router>
      </MinigameResultToastProvider>
    </DiceOverlayProvider>
  );
}