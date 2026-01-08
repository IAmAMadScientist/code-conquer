import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Challenge from "./pages/Challenge";
import ScoreSubmit from "./pages/ScoreSubmit";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />

        {/* QR-based challenge loading */}
        <Route path="/challenge" element={<Challenge />} />

        {/* Score submission page */}
        <Route path="/submit-score" element={<ScoreSubmit />} />
      </Routes>
    </Router>
  );
}

export default App;
