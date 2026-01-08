import { useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";

export default function Challenge() {
  const [params] = useSearchParams();
  const category = params.get("category");
  const difficulty = params.get("difficulty");

  const [challenge, setChallenge] = useState(null);

  useEffect(() => {
    if (!category || !difficulty) return;

    fetch(`http://localhost:8080/api/challenges/random?category=${category}&difficulty=${difficulty}`)
      .then((res) => res.json())
      .then((data) => setChallenge(data));
  }, [category, difficulty]);

  if (!category || !difficulty) {
    return <div className="container"><h3>Missing category or difficulty.</h3></div>;
  }

  if (!challenge) return <div className="container">Loading...</div>;

  return (
    <div className="container">
      <h2>{category} - {difficulty}</h2>
      <p><strong>Question:</strong> {challenge.question}</p>
      <p><strong>Explanation:</strong> {challenge.explanation}</p>

      <button onClick={() => window.location.reload()}>
        New Challenge
      </button>
    </div>
  );
}
