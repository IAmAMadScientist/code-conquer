import React, { useMemo, useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";

// Section grouping for better organization
const GROUPS = [
  {
    label: "Game Rules",
    items: ["how", "qr"],
  },
  {
    label: "Minigames",
    items: ["stackmaze", "bst", "graph", "bitjumper", "queue"],
  },
];

function InfoItem({ title, subtitle, icon, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center justify-between gap-s3 p-s3 rounded-xl bg-surface hover:bg-surface2 border border-border transition-all active:scale-[0.98] text-left group"
    >
      <div className="flex items-center gap-s3 min-w-0">
        <div className="h-10 w-10 shrink-0 rounded-full bg-indigo-500/10 flex items-center justify-center text-xl border border-indigo-500/20 group-hover:border-indigo-500/40 transition-colors">
          {icon}
        </div>
        <div className="min-w-0">
          <div className="text-fs1 font-bold text-text truncate">{title}</div>
          <div className="text-xs text-muted truncate">{subtitle}</div>
        </div>
      </div>
      <div className="text-muted/50 text-xl font-bold">›</div>
    </button>
  );
}

export default function InfoCenter() {
  const [active, setActive] = useState(null);

  const sections = useMemo(
    () => ({
      how: {
        title: "How to Play",
        icon: "🎲",
        subtitle: "Turns, dice, & basic rules",
        content: (
          <div className="space-y-s3">
            <p className="text-sm text-muted leading-relaxed">
              Code & Conquer is a hybrid boardgame. You play at a physical table, but the app handles dice, rules, and minigames.
            </p>
            <Card>
              <CardContent className="space-y-s3 text-sm">
                <Rule label="Turn">Roll D6 → Move player → Resolve Event.</Rule>
                <Rule label="Fork">If paths split, you choose the direction.</Rule>
                <Rule label="Challenge">Landing on a Challenge field starts a minigame. Winning helps you on the board.</Rule>
                <Rule label="Special">Draw a physical card, then select it in the app.</Rule>
                <Rule label="Jail">Skip your next turn.</Rule>
              </CardContent>
            </Card>
          </div>
        ),
      },
      qr: {
        title: "Joining & QR",
        icon: "🔳",
        subtitle: "How to connect",
        content: (
          <div className="space-y-s3">
            <Card>
              <CardContent className="space-y-s3 text-sm">
                <Rule label="Lobby">The host opens the Lobby and shows a QR code.</Rule>
                <Rule label="Scan">Players scan with their camera or enter the 6-letter code.</Rule>
                <Rule label="Trouble?">If scanning fails, use the link provided or type the code manually.</Rule>
              </CardContent>
            </Card>
          </div>
        ),
      },
      stackmaze: {
        title: "Stack Maze",
        icon: "🧱",
        subtitle: "Programming logic (LIFO)",
        content: (
          <div className="space-y-s3">
            <p className="text-sm text-muted">Build a command stack to guide the robot.</p>
            <Card>
              <CardContent className="space-y-s3 text-sm">
                <Rule label="Stack">Commands execute Last-In, First-Out (LIFO). The last command you add runs first!</Rule>
                <Rule label="Goal">Collect all stars and reach the flag.</Rule>
                <Rule label="Fail">Hitting walls or running out of energy crashes the robot.</Rule>
              </CardContent>
            </Card>
          </div>
        ),
      },
      bst: {
        title: "BST Insert",
        icon: "🌳",
        subtitle: "Binary Search Tree logic",
        content: (
          <div className="space-y-s3">
            <p className="text-sm text-muted">Insert numbers into the tree correctly.</p>
            <Card>
              <CardContent className="space-y-s3 text-sm">
                <Rule label="Rule">Smaller go Left, Larger go Right.</Rule>
                <Rule label="Input">Tap the correct empty slot where the new number belongs.</Rule>
                <Rule label="Speed">Be fast and accurate to score high.</Rule>
              </CardContent>
            </Card>
          </div>
        ),
      },
      graph: {
        title: "Pathfinder",
        icon: "🗺️",
        subtitle: "Find the shortest path (Dijkstra)",
        content: (
          <div className="space-y-s3">
            <p className="text-sm text-muted">Navigate the graph with minimal cost.</p>
            <Card>
              <CardContent className="space-y-s3 text-sm">
                <Rule label="Costs">Edges have weights (costs). Nodes are free.</Rule>
                <Rule label="Goal">Reach the end with the lowest possible total sum.</Rule>
                <Rule label="Optimal">You must match the Dijkstra optimal path to win.</Rule>
              </CardContent>
            </Card>
          </div>
        ),
      },
      bitjumper: {
        title: "Bit Jumper",
        icon: "🕹️",
        subtitle: "Binary collection runner",
        content: (
          <div className="space-y-s3">
            <p className="text-sm text-muted">Jump and collect bits in order.</p>
            <Card>
              <CardContent className="space-y-s3 text-sm">
                <Rule label="Target">Watch the binary pattern (e.g. 1011).</Rule>
                <Rule label="Collect">Steer to hit the matching 0 or 1 tokens.</Rule>
                <Rule label="Avoid">Hitting the wrong bit is an instant game over.</Rule>
              </CardContent>
            </Card>
          </div>
        ),
      },
      queue: {
        title: "Queue Puzzle",
        icon: "🚦",
        subtitle: "FIFO management",
        content: (
          <div className="space-y-s3">
            <p className="text-sm text-muted">Manage a First-In-First-Out queue.</p>
            <Card>
              <CardContent className="space-y-s3 text-sm">
                <Rule label="Enqueue">Add numbers to the back.</Rule>
                <Rule label="Dequeue">Remove from the front (must match target).</Rule>
                <Rule label="Discard">Skip unwanted incoming numbers.</Rule>
              </CardContent>
            </Card>
          </div>
        ),
      },
    }),
    []
  );

  const activeSection = active ? sections[active] : null;

  if (activeSection) {
    return (
      <div className="flex flex-col gap-s4 animate-in fade-in slide-in-from-right-4 duration-200">
        <div className="flex items-center gap-s3 border-b border-border pb-s3">
          <Button variant="ghost" onClick={() => setActive(null)} className="h-9 w-9 p-0 rounded-full bg-surface">
            ‹
          </Button>
          <div className="flex items-center gap-s2">
            <span className="text-xl">{activeSection.icon}</span>
            <span className="font-bold text-lg">{activeSection.title}</span>
          </div>
        </div>
        
        <div className="overflow-y-auto">
          {activeSection.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-s4 animate-in fade-in slide-in-from-left-4 duration-200">
      {GROUPS.map((group) => (
        <div key={group.label} className="space-y-s2">
          <div className="text-xs font-bold uppercase tracking-wider text-muted px-1">{group.label}</div>
          <div className="grid gap-s2">
            {group.items.map((key) => {
              const s = sections[key];
              if (!s) return null;
              return (
                <InfoItem
                  key={key}
                  title={s.title}
                  subtitle={s.subtitle}
                  icon={s.icon}
                  onClick={() => setActive(key)}
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function Rule({ label, children }) {
  return (
    <div className="flex gap-3 items-start">
      <div className="h-1.5 w-1.5 rounded-full bg-indigo-500 mt-2 shrink-0" />
      <div>
        <span className="font-bold text-indigo-200">{label}:</span> <span className="text-muted-foreground">{children}</span>
      </div>
    </div>
  );
}