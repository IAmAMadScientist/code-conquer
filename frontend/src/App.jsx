import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Categories from "./pages/Categories";
import Difficulty from "./pages/Difficulty";
import Challenge from "./pages/Challenge";
import ScoreSubmit from "./pages/ScoreSubmit";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/categories" element={<Categories />} />
        <Route path="/difficulty/:category" element={<Difficulty />} />
        <Route path="/challenge/:category/:difficulty" element={<Challenge />} />
        <Route path="/submit-score" element={<ScoreSubmit />} />
      </Routes>
    </Router>
  );
}

export default App;
