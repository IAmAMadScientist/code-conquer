import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import Home from "./pages/Home";
import Categories from "./pages/Categories";
import Difficulty from "./pages/Difficulty";
import Challenge from "./pages/Challenge";
import Qr from "./pages/Qr";
import Leaderboard from "./pages/Leaderboard";
import StackMazePage from "./pages/StackMazePage";
import GraphPathfinderPage from "./pages/GraphPathfinderPage";
import BSTInsertPage from "./pages/BSTInsertPage";
import QueueCommanderPage from "./pages/QueueCommanderPage";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/categories" element={<Categories />} />
        <Route path="/difficulty" element={<Difficulty />} />
        <Route path="/challenge" element={<Challenge />} />
        <Route path="/qr/:level" element={<Qr />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/stackmaze" element={<StackMazePage />} />
        <Route path="/graphpath" element={<GraphPathfinderPage />} />
        <Route path="/bstinsert" element={<BSTInsertPage />} />
        <Route path="/queuecommander" element={<QueueCommanderPage />} />
      </Routes>
    </Router>
  );
}
