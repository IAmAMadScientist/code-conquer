import React, { useMemo, useState } from "react";
import { Button } from "./ui/button";

// Lightweight, mobile-friendly info center shown inside the bottom-sheet.
// It behaves like a mini menu: first you see a list, then you can open a detail page.

function SectionCard({ title, subtitle, icon, onClick }) {
  return (
    <button
      type="button"
      className="nativeItem"
      onClick={onClick}
      style={{ width: "100%", textAlign: "left" }}
    >
      <div className="nativeLeft">
        <div className="nativeAvatar" aria-hidden="true">
          {icon}
        </div>
        <div className="nativeText">
          <div className="nativeTitle">{title}</div>
          <div className="nativeSub">{subtitle}</div>
        </div>
      </div>
      <div className="nativeTrail" aria-hidden="true" style={{ fontWeight: 900, opacity: 0.8 }}>
        ›
      </div>
    </button>
  );
}

function Bullet({ children }) {
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
      <div style={{ marginTop: 6, opacity: 0.8 }}>•</div>
      <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
    </div>
  );
}

export default function InfoCenter({ onRequestClose }) {
  const sections = useMemo(
    () => [
      {
        key: "how",
        title: "How to play (Boardgame)",
        icon: "🎲",
        subtitle: "Turns, dice, forks, specials - the essentials",
        render: () => (
          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ fontWeight: 900, fontSize: 16 }}>How to play</div>
            <div style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.45 }}>
              You play the physical boardgame at the table, the web app supports dice, rules, and minigames.
            </div>
            <div className="ui-card">
              <div className="ui-cardContent" style={{ display: "grid", gap: 10, padding: 16 }}>
                <Bullet>
                  <b>Turn:</b> Roll → move → resolve the event (Fork / Special / Challenge).
                </Bullet>
                <Bullet>
                  <b>Fork:</b> If multiple paths are available, the player chooses the path.
                </Bullet>
                <Bullet>
                  <b>Challenge:</b> Start a minigame, the result counts for the boardgame.
                </Bullet>
                <Bullet>
                  <b>Special Field:</b> Draw a real-life card and select it in the dialog.
                </Bullet>
                <Bullet>
                  <b>Field Types:</b> Normal = nothing, <b>Fork</b> = choose a path, <b>Challenge</b> = minigame,
                  <b>Special</b> = draw a card, <b>Jail</b> = skip a turn.
                </Bullet>
              </div>
            </div>
          </div>
        ),
      },

      {
        key: "qr",
        title: "QR Code / Join",
        icon: "🔳",
        subtitle: "Join fast: scan or enter the code",
        render: () => (
          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ fontWeight: 900, fontSize: 16 }}>QR Code / Join</div>
            <div className="ui-card">
              <div className="ui-cardContent" style={{ display: "grid", gap: 10, padding: 16 }}>
                <Bullet>
                  In the <b>Lobby</b>, the host shows a QR code.
                </Bullet>
                <Bullet>
                  Players scan it with their phone camera or enter the <b>match code</b>.
                </Bullet>
                <Bullet>
                  If scanning fails: use the link under the QR code (or share it via messenger).
                </Bullet>
                <Bullet>
                  Increase screen brightness, QR codes scan worse on dark displays.
                </Bullet>
              </div>
            </div>
          </div>
        ),
      },
      {
        key: "stackmaze",
        title: "Stack Maze",
        icon: "🧱",
        subtitle: "Plan moves, then the stack runs (LIFO)",
        render: () => (
          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ fontWeight: 900, fontSize: 16 }}>Stack Maze</div>
            <div className="ui-card">
              <div className="ui-cardContent" style={{ display: "grid", gap: 10, padding: 16 }}>
                <Bullet>
                  First you build a <b>move list</b> (stack). The top is always the next move.
                </Bullet>
                <Bullet>
                  When you press <b>Run</b>, moves execute <b>LIFO</b>: <i>top executes next</i>.
                </Bullet>
                <Bullet>
                  Goal: collect ⭐ and reach 🏁, without crashing into walls.
                </Bullet>
                <Bullet>
                  Tip: plan the last step first, then the one before it (because the stack runs backwards).
                </Bullet>
              </div>
            </div>
          </div>
        ),
      },
      {
        key: "bst",
        title: "BST Insert",
        icon: "🌳",
        subtitle: "Tap the correct insert slot",
        render: () => (
          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ fontWeight: 900, fontSize: 16 }}>BST Insert</div>
            <div className="ui-card">
              <div className="ui-cardContent" style={{ display: "grid", gap: 10, padding: 16 }}>
                <Bullet>
                  A new number starts at the root. <b>Smaller</b> → left, <b>larger</b> → right.
                </Bullet>
                <Bullet>
                  You don’t choose the path, you choose the <b>slot</b> where the node will be inserted.
                </Bullet>
                <Bullet>
                  For <b>Equal</b>, follow the rule shown (e.g. Equal → RIGHT).
                </Bullet>
                <Bullet>
                  You can tap another slot anytime to change your selection.
                </Bullet>
              </div>
            </div>
          </div>
        ),
      },
      {
        key: "graph",
        title: "Graph Pathfinder",
        icon: "🗺️",
        subtitle: "Pick the lowest-cost path (Dijkstra)",
        render: () => (
          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ fontWeight: 900, fontSize: 16 }}>Graph Pathfinder</div>
            <div className="ui-card">
              <div className="ui-cardContent" style={{ display: "grid", gap: 10, padding: 16 }}>
                <Bullet>
                  You move node by node. Only <b>edges</b> have costs (edge weights).
                </Bullet>
                <Bullet>
                  Goal: reach <b>GOAL</b> with the <b>lowest total cost</b>.
                </Bullet>
                <Bullet>
                  Win condition: your final path cost must match the <b>shortest path</b> (Dijkstra optimal).
                </Bullet>
              </div>
            </div>
          </div>
        ),
      },
      {
        key: "bitjumper",
        title: "Bit Jumper",
        icon: "🕹️",
        subtitle: "Jump, collect the correct bits, avoid mistakes",
        render: () => (
          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ fontWeight: 900, fontSize: 16 }}>Bit Jumper</div>
            <div className="ui-card">
              <div className="ui-cardContent" style={{ display: "grid", gap: 10, padding: 16 }}>
                <Bullet>
                  You jump automatically. You only steer horizontally (finger/mouse).
                </Bullet>
                <Bullet>
                  Collect <b>bit tokens</b> (0/1) in the <b>correct order</b> shown at the top.
                </Bullet>
                <Bullet>
                  A wrong bit is an instant loss, but bits are always avoidable.
                </Bullet>
                <Bullet>
                  Collect <b>coins</b> for bonus points. Breakable platforms reappear after a short delay.
                </Bullet>
              </div>
            </div>
          </div>
        ),
      },

      {
        key: "queue",
        title: "Queue Puzzle",
        icon: "🚦",
        subtitle: "FIFO puzzle — enqueue, dequeue, discard",
        render: () => (
          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ fontWeight: 900, fontSize: 16 }}>Queue Puzzle</div>
            <div className="ui-card">
              <div className="ui-cardContent" style={{ display: "grid", gap: 10, padding: 16 }}>
                <Bullet>
                  A <b>queue</b> is FIFO: <b>first in → first out</b>.
                </Bullet>
                <Bullet>
                  Use <b>ENQUEUE</b> to push the incoming number to the back of the queue.
                </Bullet>
                <Bullet>
                  Use <b>DEQUEUE</b> to send the <b>front</b> element to the output, it must match the next target.
                </Bullet>
                <Bullet>
                  Use <b>DISCARD</b> to skip an incoming number. If you enqueue a mistake, you can <b>REMOVE</b> (limited) or <b>ROTATE</b> the queue.
                </Bullet>
                <Bullet>
                  Goal: complete the full target output <b>before the timer runs out</b>.
                </Bullet>
              </div>
            </div>
          </div>
        ),
      },

    ],
    []
  );

  const [active, setActive] = useState(null);

  const current = active ? sections.find((s) => s.key === active) : null;

  return (
    <div style={{ display: "grid", gap: 12, color: "var(--text)" }}>
      {!current ? (
        <>
          <div className="nativeList">
            {sections.map((s) => (
              <SectionCard
                key={s.key}
                title={s.title}
                subtitle={s.subtitle}
                icon={s.icon}
                onClick={() => setActive(s.key)}
              />
            ))}
          </div>

          <div style={{ display: "grid", gap: 10, marginTop: 4 }}>
            <Button className="fullWidthBtn" onClick={onRequestClose}>
              Close
            </Button>
          </div>
        </>
      ) : (
        <>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <Button variant="ghost" onClick={() => setActive(null)} style={{ borderRadius: 16 }}>
              ‹ Back
            </Button>
            <div style={{ fontWeight: 900, fontSize: 14, opacity: 0.9 }}>Info</div>
          </div>
          {current.render()}
          <div style={{ display: "grid", gap: 10, marginTop: 2 }}>
            <Button className="fullWidthBtn" onClick={onRequestClose}>
              Close
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
