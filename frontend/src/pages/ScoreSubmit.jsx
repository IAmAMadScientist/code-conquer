import { useState } from "react";

export default function ScoreSubmit() {
  const [playerName, setPlayerName] = useState("");
  const [points, setPoints] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const submit = async () => {
    await fetch("http://localhost:8080/api/scores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        playerName,
        points: Number(points),
        category: "GENERAL",
        difficulty: "NONE"
      }),
    });
    setSubmitted(true);
  };

  return (
    <div className="container">
      <h2>Submit Score</h2>

      {submitted ? (
        <p>Score saved!</p>
      ) : (
        <>
          <input
            placeholder="Player Name"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
          />

          <input
            placeholder="Points"
            type="number"
            value={points}
            onChange={(e) => setPoints(e.target.value)}
          />

          <button onClick={submit}>Submit</button>
        </>
      )}
    </div>
  );
}
