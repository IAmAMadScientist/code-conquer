import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import Home from "./pages/Home";
import Join from "./pages/Join";
import Lobby from "./pages/Lobby";
import Play from "./pages/Play";
import Challenge from "./pages/Challenge";
import Leaderboard from "./pages/Leaderboard";

import StackMazePage from "./pages/StackMazePage";
import GraphPathfinderPage from "./pages/GraphPathfinderPage";
import BSTInsertPage from "./pages/BSTInsertPage";
import QueueCommanderPage from "./pages/QueueCommanderPage";

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Core flow */}
        <Route path="/" element={<Home />} />
        <Route path="/join/:code" element={<Join />} />
        <Route path="/lobby" element={<Lobby />} />
        <Route path="/play" element={<Play />} />
        <Route path="/challenge" element={<Challenge />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/stackmaze" element={<StackMazePage />} />
        <Route path="/graphpath" element={<GraphPathfinderPage />} />
        <Route path="/bstinsert" element={<BSTInsertPage />} />
        <Route path="/queuecommander" element={<QueueCommanderPage />} />
      </Routes>
    </Router>
  );
}
