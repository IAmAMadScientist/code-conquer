import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";

export default function Challenge() {
  const { category, difficulty } = useParams();
  const [challenge, setChallenge] = useState(null);

  useEffect(() => {
    fetch(`http://localhost:8080/api/challenges/random?category=${category}&difficulty=${difficulty}`)
      .then((res) => res.json())
      .then((data) => setChallenge(data));
  }, [category, difficulty]);

  if (!challenge) return <div className="container">Loading...</div>;

  return (
    <div className="container">
      <h2>{category} - {difficulty}</h2>
      <p><strong>Question:</strong> {challenge.question}</p>
      <p><strong>Explanation:</strong> {challenge.explanation}</p>

      <button onClick={() => window.location.reload()}>
        New Challenge
      </button>

      <a href="/submit-score">
        <button>Submit Score</button>
      </a>
    </div>
  );
}
