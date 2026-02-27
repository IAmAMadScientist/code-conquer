// src/lib/tutorials.js
// Enhanced tutorial content with visual cues and structured sections.

export const TUTORIALS = {
  STACK_MAZE: {
    title: "Stack Maze",
    summary: "Program the robot by stacking moves, then run them.",
    icon: "🤖",
    goal: "Reach the 🏁 goal tile without crashing into walls.",
    howTo: [
      { action: "Tap", detail: "the D-pad buttons (↑ ↓ ← →) to build your move stack." },
      { action: "Undo", detail: "with ↩ to remove the last programmed move." },
      { action: "Execute", detail: "with ▶ to run your program. Use ⏹ to stop and edit." },
    ],
    difficultyNotes: {
      EASY: "Small grid, plenty of energy.",
      MEDIUM: "Larger grid, tighter energy constraints.",
      HARD: "Complex maze with minimal energy and a shorter time limit.",
    },
    proTip: "Keep your stacks short and test small segments of the path!",
  },

  GRAPH_PATH: {
    title: "Graph Pathfinder",
    summary: "Calculate and select the most efficient route through the network.",
    icon: "🎯",
    goal: "Find the path from START to GOAL with the lowest total ⚡ cost.",
    howTo: [
      { action: "Select", detail: "nodes by tapping them to build your route." },
      { action: "Check", detail: "the numbers on edges—these are the weights (costs)." },
      { action: "Submit", detail: "when your current path matches the target budget." },
    ],
    difficultyNotes: {
      EASY: "Fewer nodes and simple connections.",
      MEDIUM: "More nodes and multiple possible routes.",
      HARD: "Dense network requiring careful Dijkstra-style calculation.",
    },
    proTip: "The target budget is always the shortest possible path. If you exceed it, rethink your route!",
  },

  BST_INSERT: {
    title: "BST Insert",
    summary: "Place the new value into the Binary Search Tree following logic rules.",
    icon: "🌳",
    goal: "Correctly identify the unique empty slot for the new value.",
    howTo: [
      { action: "Compare", detail: "the ➕ new value with the root node." },
      { action: "Logic", detail: "Go LEFT if smaller, RIGHT if larger (check the 'Equal' rule!)." },
      { action: "Place", detail: "by tapping the dashed circle slot once you reach the end." },
    ],
    difficultyNotes: {
      EASY: "Balanced trees with distinct values.",
      MEDIUM: "Randomly shaped trees with some duplicate values.",
      HARD: "Deep, skewed trees with complex duplicate logic (Equal = Left).",
    },
    proTip: "Follow the path node-by-node from the top down. Don't rush the placement!",
  },

  QUEUE_COMMANDER: {
    title: "Queue Commander",
    summary: "Simulate a FIFO memory buffer to match the target output.",
    icon: "📥",
    goal: "Emit numbers from the queue in the exact sequence shown.",
    howTo: [
      { action: "Enqueue", detail: "the 'Incoming' number to the back of your queue." },
      { action: "Dequeue", detail: "the front of your queue if it matches the current target." },
      { action: "Discard", detail: "incoming numbers you don't need right now." },
    ],
    difficultyNotes: {
      EASY: "Short target sequence and large queue capacity.",
      MEDIUM: "Limited queue slots—manage your discard 'charges' wisely.",
      HARD: "Long sequence, tiny buffer, and fast-paced incoming stream.",
    },
    proTip: "Look ahead at the 'Output Target' list to plan which numbers to save and which to trash.",
  },

  BIT_JUMPER: {
    title: "Bit Jumper",
    summary: "Solve the bitwise operation by collecting the correct bits while climbing.",
    icon: "🚀",
    goal: "Collect the correct 0 or 1 bits to solve the logic gate puzzle.",
    howTo: [
      { action: "Move", detail: "by sliding your finger or mouse across the screen." },
      { action: "Jump", detail: "automatically by landing on platforms." },
      { action: "Sync", detail: "Collect only the bits that match the result of the logic gate." },
    ],
    difficultyNotes: {
      EASY: "Simple 3-bit operations and stable platforms.",
      MEDIUM: "Moving platforms and 4-bit AND/OR gates.",
      HARD: "Fast climb, breaking platforms, and complex 6-bit operations.",
    },
    proTip: "Coins give bonus points, but missing a required bit is a system crash!",
  },
};

export function tutorialKey({ playerId, category }) {
  const pid = playerId || "anon";
  return `cc_tutorial_seen:${pid}:${String(category || "").toUpperCase()}`;
}

export function getTutorial(category) {
  const key = String(category || "").toUpperCase();
  return TUTORIALS[key] || {
    title: "Minigame",
    summary: "Read the rules, then start.",
    icon: "🕹️",
    goal: "Complete the objective shown on screen.",
    howTo: [{ action: "Play", detail: "Follow the on-screen instructions to win." }],
    tips: ["Take a second to read the UI before acting."],
  };
}