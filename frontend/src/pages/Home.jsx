import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div className="container">
      <h1>Code & Conquer</h1>
      <p>Your hybrid board game coding challenge assistant.</p>

      <Link to="/categories">
        <button>Start Game</button>
      </Link>
    </div>
  );
}
