import React from "react";
import { Link } from "react-router-dom";
import AppShell from "../components/AppShell";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";

export default function Categories() {
  return (
    <AppShell
      title="Minigames"
      subtitle="Debug / direct access."
      headerBadges={<Badge variant="secondary">Debug</Badge>}
    >
      <div className="panel" style={{ display: "grid", gap: 10 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link to="/stackmaze"><Button variant="secondary">StackMaze</Button></Link>
          <Link to="/grappathfinder"><Button variant="secondary">GraphPathfinder</Button></Link>
          <Link to="/bstinsert"><Button variant="secondary">BST Insert</Button></Link>
          <Link to="/queuecommander"><Button variant="secondary">Queue Commander</Button></Link>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 6 }}>
          <Link to="/play"><Button variant="primary">Back to Difficulty</Button></Link>
          <Link to="/leaderboard"><Button variant="ghost">Leaderboard</Button></Link>
        </div>
      </div>
    </AppShell>
  );
}
