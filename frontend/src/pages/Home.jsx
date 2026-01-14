import React from "react";
import { Link } from "react-router-dom";
import AppShell from "../components/AppShell";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";

export default function Home() {
  return (
    <AppShell
      title="Code & Conquer"
      subtitle="Play a category, pick difficulty, get 1 random challenge — or browse everything."
      headerBadges={
        <>
          <Badge>Home</Badge>
        </>
      }
      rightPanel={
        <div className="panel">
          <div style={{ fontSize: 16, fontWeight: 650 }}>What you can do</div>
          <div className="muted" style={{ fontSize: 14, marginTop: 10 }}>
            • Start Game → category → difficulty → minigame<br/>
          </div>
        </div>
      }
    >
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        <Link to="/categories">
          <Button variant="primary">Start Game</Button>
        </Link>

      </div>
    </AppShell>
  );
}
