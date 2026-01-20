import React from "react";
import { Link, useSearchParams } from "react-router-dom";
import AppShell from "../components/AppShell";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";

const DIFFICULTIES = [
  { key: "EASY", label: "Easy" },
  { key: "MEDIUM", label: "Medium" },
  { key: "HARD", label: "Hard" },
];

export default function Difficulty() {
  const [params] = useSearchParams();
  const category = params.get("category");

  return (
    <AppShell
      title="Code & Conquer"
      subtitle="Choose a difficulty"
      headerBadges={
        <>
          <Badge>Difficulty</Badge>
          {category && <Badge>Cat: {category}</Badge>}
        </>
      }
    >
      {!category ? (
        <>
          <div className="panel">
            <div style={{ fontWeight: 650 }}>Missing category.</div>
            <div className="muted" style={{ marginTop: 8 }}>Go back and pick one.</div>
          </div>
          <div style={{ marginTop: 14 }}>
            <Link to="/categories">
              <Button variant="ghost">Back</Button>
            </Link>
          </div>
        </>
      ) : (
        <>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {DIFFICULTIES.map((d) => (
              <Link
                key={d.key}
                to={`/challenge?category=${encodeURIComponent(category)}&difficulty=${d.key}`}
              >
                <Button variant="primary">{d.label}</Button>
              </Link>
            ))}
          </div>

          <div style={{ marginTop: 14 }}>
            <Link to="/categories">
              <Button variant="ghost">Back</Button>
            </Link>
          </div>
        </>
      )}
    </AppShell>
  );
}
