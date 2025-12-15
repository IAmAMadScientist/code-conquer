import { useParams, Link } from "react-router-dom";

export default function Difficulty() {
  const { category } = useParams();

  const levels = ["EASY", "MEDIUM", "HARD"];

  return (
    <div className="container">
      <h2>Select Difficulty</h2>

      {levels.map((level) => (
        <Link key={level} to={`/challenge/${category}/${level}`}>
          <button>{level}</button>
        </Link>
      ))}
    </div>
  );
}
