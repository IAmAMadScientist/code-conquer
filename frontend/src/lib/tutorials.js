// Lightweight tutorial content for first-time minigame players.
// Stored client-side (localStorage). This keeps the backend simple and works well for “your phone = your player”.

export const TUTORIALS = {
  STACK_MAZE: {
    title: "Stack Maze",
    summary: "Program the robot by stacking moves, then run them.",
    howTo: [
      "Tap the D-pad to add moves (↑ ↓ ← →) to your stack.",
      "Use ↩ to remove the last move.",
      "Press ▶ to run your stack. Press ⏹ to stop.",
    ],
    win: "Reach the goal tile without crashing into walls.",
    lose: "Crashing, running out of time, or failing to reach the goal.",
    tips: ["Keep the stack short and test often.", "When in doubt: stop, edit, run again."],
  },

  GRAPH_PATH: {
    title: "Graph Pathfinder",
    summary: "Pick the correct path through a graph.",
    howTo: [
      "Tap nodes to build a route from Start to Goal.",
      "Some graphs have weights—aim for the best route, not just the shortest by steps.",
      "Submit when you are confident.",
    ],
    win: "Your submitted path matches the required condition (correct / optimal).",
    lose: "Wrong path, disconnected route, or not optimal (if required).",
    tips: ["Check every edge you selected.", "If weights exist: compare total cost."],
  },

  BST_INSERT: {
    title: "BST Insert",
    summary: "Insert values into a Binary Search Tree in the correct order.",
    howTo: [
      "Drag/tap values into the tree following BST rules.",
      "Left child < parent, right child > parent.",
      "Complete all inserts before time runs out.",
    ],
    win: "All values are placed in the correct BST positions.",
    lose: "A value is placed incorrectly or the tree is incomplete.",
    tips: ["Compare with the current node, then go left/right.", "Slow is smooth—accuracy beats speed."],
  },

  QUEUE_COMMANDER: {
    title: "Queue Commander",
    summary: "Execute enqueue/dequeue operations correctly.",
    howTo: [
      "Follow the operation list in order.",
      "Track the queue state after each operation.",
      "Submit your final output/state when done.",
    ],
    win: "Final state/output matches the correct queue simulation.",
    lose: "Any step leads to an incorrect final state/output.",
    tips: ["Write it down mentally: front → back.", "Be careful with empty-queue operations."],
  },

  BIT_JUMPER: {
    title: "Bit Jumper",
    summary: "Platformer-style minigame—survive and reach the goal.",
    howTo: [
      "Use the on-screen controls to move and jump.",
      "Avoid hazards and time your jumps.",
      "Finish the level to win.",
    ],
    win: "Reach the finish.",
    lose: "Falling, hitting hazards, or failing before time ends.",
    tips: ["Short hops give you more control.", "Pause for timing instead of rushing."],
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
    howTo: ["Complete the objective shown on screen."],
    win: "Meet the objective.",
    lose: "Fail the objective.",
    tips: ["Take a second to read the UI before acting."],
  };
}
