import React from "react";
import { Link, useNavigate } from "react-router-dom";
import AppShell from "../components/AppShell";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";

const CATEGORIES = [
  { key: "STACK_MAZE", label: "Stack Maze (LIFO)" },
  { key: "GRAPH_PATH", label: "Graph Pathfinder (Dijkstra)" },
  { key: "BST_INSERT", label: "BST Insert (Drag & Drop)" },
  { key: "QUEUE_COMMANDER", label: "Queue Commander (FIFO)" },
];

export default function Categories() {
  const nav = useNavigate();

function onPick(cat) {
  if (cat === "STACK_MAZE") {
    nav("/stackmaze");
    return;
  }
  if (cat === "GRAPH_PATH") {
    nav("/graphpath");
    return;
  }
  if (cat === "BST_INSERT") {
  nav("/bstinsert");
  return;
   }
  if (cat === "QUEUE_COMMANDER") {
    nav("/queuecommander");
    return;
  }


  nav(`/difficulty?category=${encodeURIComponent(cat)}`);
}


  return (
    <AppShell
      title="Code & Conquer"
      subtitle="Choose a category"
      headerBadges={<Badge>Categories</Badge>}
      rightPanel={
        <div className="panel">
          <div style={{ fontSize: 16, fontWeight: 650 }}>Tip</div>
          <div className="muted" style={{ fontSize: 14, marginTop: 10 }}>
            StackMaze is a minigame category — it opens immediately.
          </div>
        </div>
      }
    >
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        {CATEGORIES.map((c) => (
          <Button key={c.key} onClick={() => onPick(c.key)} variant="secondary">
            {c.label}
          </Button>
        ))}
      </div>

      <div style={{ marginTop: 14 }}>
        <Link to="/">
          <Button variant="ghost">Back</Button>
        </Link>
      </div>
    </AppShell>
  );
}
