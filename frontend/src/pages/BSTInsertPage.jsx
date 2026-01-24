import React, { useMemo, useRef, useState } from "react";
import AppShell from "../components/AppShell";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Link, useLocation } from "react-router-dom";
import ResultSubmitPanel from "../components/ResultSubmitPanel";

function randInt(a, b) {
  return Math.floor(Math.random() * (b - a + 1)) + a;
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(0, i);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

// ------------------------
// BST helpers
// ------------------------
function bstInsert(root, value) {
  if (!root) return { value, left: null, right: null };
  if (value < root.value) root.left = bstInsert(root.left, value);
  else root.right = bstInsert(root.right, value);
  return root;
}

function height(root) {
  if (!root) return 0;
  return 1 + Math.max(height(root.left), height(root.right));
}

function buildBalancedBST(sorted, lo = 0, hi = sorted.length - 1) {
  if (lo > hi) return null;
  const mid = Math.floor((lo + hi) / 2);
  return {
    value: sorted[mid],
    left: buildBalancedBST(sorted, lo, mid - 1),
    right: buildBalancedBST(sorted, mid + 1, hi),
  };
}

function cloneTree(t) {
  if (!t) return null;
  return { value: t.value, left: cloneTree(t.left), right: cloneTree(t.right) };
}

function findInsertionSlot(root, value) {
  // Returns { parentValue, side: "L"|"R" } where the new node should be inserted as null child
  let cur = root;
  let parent = null;
  let side = null;

  while (cur) {
    parent = cur;
    if (value < cur.value) {
      side = "L";
      cur = cur.left;
    } else {
      side = "R";
      cur = cur.right;
    }
  }

  return { parentValue: parent ? parent.value : null, side };
}

function buildLayout(root) {
  // Assign x/y using inorder traversal (simple, stable, readable)
  const nodes = [];
  const edges = [];
  const slots = []; // empty child slots as drop targets

  let xIndex = 0;
  // Tuned for readability; the SVG uses viewBox to fit any resulting bounds.
  const X_STEP = 78;
  const Y_STEP = 98;

  function walk(node, depth) {
    if (!node) return;

    walk(node.left, depth + 1);

    const x = 70 + xIndex * X_STEP;
    const y = 80 + depth * Y_STEP;
    nodes.push({ value: node.value, x, y, depth });
    xIndex++;

    if (node.left) edges.push({ from: node.value, to: node.left.value });
    if (node.right) edges.push({ from: node.value, to: node.right.value });

    // create visible "empty slots" if child is missing
    if (!node.left) slots.push({ parent: node.value, side: "L", x: x - 38, y: y + 64 });
    if (!node.right) slots.push({ parent: node.value, side: "R", x: x + 38, y: y + 64 });

    walk(node.right, depth + 1);
  }

  walk(root, 0);

  const map = new Map(nodes.map((n) => [n.value, n]));

  // Compute bounds (include empty slots) for responsive viewBox.
  const allPoints = [
    ...nodes.map((n) => ({ x: n.x, y: n.y })),
    ...slots.map((s) => ({ x: s.x, y: s.y })),
  ];
  const minX = Math.min(...allPoints.map((p) => p.x));
  const maxX = Math.max(...allPoints.map((p) => p.x));
  const minY = Math.min(...allPoints.map((p) => p.y));
  const maxY = Math.max(...allPoints.map((p) => p.y));
  const pad = 70;
  const bounds = {
    x: minX - pad,
    y: minY - pad,
    w: (maxX - minX) + pad * 2,
    h: (maxY - minY) + pad * 2,
  };

  return { nodes, edges, slots, map, bounds };
}

function makePuzzle(difficulty) {
  // Difficulty impacts tree size + shape (balanced vs random vs skewed).
  const cfg = {
    EASY: { n: 7, maxH: 4, shape: "balanced" },
    MEDIUM: { n: 11, maxH: 6, shape: "random" },
    HARD: { n: 15, maxH: 9, shape: "skew" },
  }[difficulty] || { n: 11, maxH: 6, shape: "random" };

  const poolMax = 60;
  let attempt = 0;
  while (attempt++ < 80) {
    const values = shuffle(Array.from({ length: poolMax }, (_, i) => i + 1));
    const base = values.slice(0, cfg.n);
    const newValue = values[cfg.n];

    let root = null;
    if (cfg.shape === "balanced") {
      const sorted = base.slice().sort((a, b) => a - b);
      root = buildBalancedBST(sorted);
    } else if (cfg.shape === "skew") {
      // Intentionally skew: mostly sorted inserts with tiny randomness.
      const sorted = base.slice().sort((a, b) => a - b);
      const noisy = sorted.slice();
      // swap a few entries to avoid a perfectly trivial line
      for (let i = 0; i < Math.min(3, noisy.length - 1); i++) {
        const a = randInt(0, noisy.length - 1);
        const b = randInt(0, noisy.length - 1);
        [noisy[a], noisy[b]] = [noisy[b], noisy[a]];
      }
      for (const v of noisy) root = bstInsert(root, v);
    } else {
      // random
      for (const v of base) root = bstInsert(root, v);
    }

    if (height(root) <= cfg.maxH) {
      const answer = findInsertionSlot(root, newValue);
      return { root, base, newValue, answer, cfg };
    }
  }

  // Fallback (should be rare)
  const values = shuffle(Array.from({ length: 50 }, (_, i) => i + 1));
  const base = values.slice(0, 11);
  const newValue = values[11];
  let root = null;
  for (const v of base) root = bstInsert(root, v);
  const answer = findInsertionSlot(root, newValue);
  return { root, base, newValue, answer, cfg: { n: 11, maxH: 6, shape: "random" } };
}

// ------------------------
// Page
// ------------------------
export default function BSTInsertPage() {
  const loc = useLocation();
  const challenge = loc.state?.challenge;
  const difficulty = (challenge?.difficulty || "EASY").toUpperCase();

  const [seed, setSeed] = useState(0);
  const puzzle = useMemo(() => makePuzzle(difficulty), [seed, difficulty]);

  const [dropped, setDropped] = useState(null); // { parent, side }
  const [status, setStatus] = useState("playing"); // playing | won
  const [msg, setMsg] = useState("");

  const startRef = useRef(Date.now());
  const [timeMs, setTimeMs] = useState(0);
  const [errors, setErrors] = useState(0);

  const layout = useMemo(() => buildLayout(puzzle.root), [puzzle.root]);

  function newPuzzle() {
    startRef.current = Date.now();
    setTimeMs(0);
    setErrors(0);
    setSeed((s) => s + 1);
    setDropped(null);
    setStatus("playing");
    setMsg("");
  }

  function resetTry() {
    setDropped(null);
    setStatus("playing");
    setMsg("");
  }

  function onDropSlot(slot) {
    if (status !== "playing") return;
    setDropped({ parent: slot.parent, side: slot.side });
    setMsg("");
  }

  function check() {
    if (!dropped) {
      setErrors((e) => e + 1);
      setMsg("Drag the new node onto a free slot first.");
      return;
    }
    const ok =
      dropped.parent === puzzle.answer.parentValue &&
      dropped.side === puzzle.answer.side;

    if (ok) {
      setStatus("won");
      setTimeMs(Date.now() - startRef.current);
      setMsg(
        `✅ Correct! Insert ${puzzle.newValue} as ${puzzle.answer.side === "L" ? "LEFT" : "RIGHT"} child of ${puzzle.answer.parentValue}.`
      );
    } else {
      setErrors((e) => e + 1);
      setMsg(
        `❌ Not quite. Follow BST insertion from the root: compare and go left/right until you hit an empty slot.`
      );
    }
  }

  const viewBox = `${layout.bounds.x} ${layout.bounds.y} ${layout.bounds.w} ${layout.bounds.h}`;
  // Let the SVG grow with the tree so nothing gets clipped. The page can scroll vertically.
  const idealHeight = clamp(layout.bounds.h, 420, 980);

  return (
    <AppShell
      title="Code & Conquer"
      subtitle="BST Insert — drag the new node to the correct insertion position"
      headerBadges={
        <>
          <Badge>Category: BST_INSERT</Badge>
          <Badge>Diff: {difficulty}</Badge>
          <Badge>Errors: {errors}</Badge>
          <Badge>New node: {puzzle.newValue}</Badge>
          {status === "won" && <Badge style={{ borderColor: "rgba(52,211,153,0.45)" }}>WON</Badge>}
        </>
      }
      rightPanel={
        <div className="panel">
          <div style={{ fontSize: 16, fontWeight: 650 }}>Hint: BST insertion</div>
          <div className="muted" style={{ marginTop: 10, fontSize: 14, lineHeight: 1.45 }}>
            <div><strong>Algorithm:</strong></div>
            <ol style={{ margin: "8px 0 0 18px" }}>
              <li>Start at the <strong>root</strong>.</li>
              <li>If <code>newValue &lt; node.value</code>, go <strong>left</strong>.</li>
              <li>Else go <strong>right</strong>.</li>
              <li>Repeat until the child is <strong>null</strong> — insert there.</li>
            </ol>
            <div style={{ marginTop: 10 }}>
              Drag the node onto one of the <strong>empty slots</strong> (dotted circles).
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <Link to="/play">
              <Button variant="ghost">Back to game</Button>
            </Link>
          </div>
        </div>
      }
    >
      <div style={{ display: "grid", gap: 12 }}>
        {/* draggable node */}
        <div className="panel" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <div>
            <div style={{ fontWeight: 650 }}>Drag this node into the tree</div>
            <div className="muted" style={{ marginTop: 6, fontSize: 13 }}>
              Place <strong>{puzzle.newValue}</strong> where BST insertion would put it.
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <div
              draggable={status === "playing"}
              onDragStart={(e) => {
                e.dataTransfer.setData("text/plain", String(puzzle.newValue));
              }}
              style={{
                userSelect: "none",
                padding: "10px 14px",
                borderRadius: 999,
                border: "1px solid rgba(129,140,248,0.45)",
                background: "rgba(99,102,241,0.18)",
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                fontWeight: 700,
              }}
              title="Drag me"
            >
              {puzzle.newValue}
            </div>

            <Button variant="primary" onClick={check} disabled={status !== "playing"}>
              Check
            </Button>
            <Button variant="secondary" onClick={resetTry}>
              Reset
            </Button>
            <Button variant="ghost" onClick={newPuzzle}>
              New tree
            </Button>
          </div>
        </div>

        {msg && (
          <div
            className="panel"
            style={{
              borderColor:
                status === "won"
                  ? "rgba(52,211,153,0.45)"
                  : "rgba(129,140,248,0.35)",
            }}
          >
            {msg}
          </div>
        )}

        {status === "won" && (
          <ResultSubmitPanel
            category="BST_INSERT"
            difficulty={difficulty}
            timeMs={timeMs}
            errors={errors}
            won={true}
            onPlayAgain={newPuzzle}
          challengeId={challenge?.challengeInstanceId}
        />
        )}

        {/* tree svg */}
        <div
          className="panel"
          style={{
            overflowX: "hidden",
            overflowY: "visible",
            padding: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
            <div className="muted" style={{ fontSize: 12 }}>
              Tree size: <strong>{puzzle.cfg?.n ?? 0}</strong> nodes • Shape: <strong>{puzzle.cfg?.shape}</strong>
            </div>
            <div className="muted" style={{ fontSize: 12 }}>
              Drag <strong>{puzzle.newValue}</strong> onto a dotted slot.
            </div>
          </div>

          <svg
            viewBox={viewBox}
            preserveAspectRatio="xMidYMid meet"
            style={{
              width: "100%",
              height: idealHeight,
              display: "block",
              borderRadius: 14,
              background:
                "radial-gradient(900px 420px at 50% 0%, rgba(99,102,241,0.10), rgba(2,6,23,0.35) 55%, rgba(2,6,23,0.25))",
              border: "1px solid rgba(148,163,184,0.14)",
            }}
          >
            <defs>
              <filter id="softGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              <linearGradient id="nodeFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(15,23,42,0.75)" />
                <stop offset="100%" stopColor="rgba(2,6,23,0.55)" />
              </linearGradient>
            </defs>
            {/* edges */}
            {layout.edges.map((e) => {
              const a = layout.map.get(e.from);
              const b = layout.map.get(e.to);
              if (!a || !b) return null;
              const mx = (a.x + b.x) / 2;
              const my = (a.y + b.y) / 2;
              const curve = `M ${a.x} ${a.y} Q ${mx} ${my - 18} ${b.x} ${b.y}`;
              return (
                <path
                  key={`${e.from}-${e.to}`}
                  d={curve}
                  fill="none"
                  stroke="rgba(148,163,184,0.32)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              );
            })}

            {/* empty slots (drop targets) */}
            {layout.slots.map((s) => {
              const isSelected = dropped && dropped.parent === s.parent && dropped.side === s.side;
              return (
                <g
                  key={`${s.parent}-${s.side}`}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    onDropSlot(s);
                  }}
                  style={{ cursor: status === "playing" ? "copy" : "default" }}
                >
                  {/* hit area */}
                  <circle cx={s.x} cy={s.y} r="22" fill="transparent" />
                  {/* visible target */}
                  <circle
                    cx={s.x}
                    cy={s.y}
                    r="16"
                    fill={isSelected ? "rgba(245,158,11,0.20)" : "rgba(2,6,23,0.18)"}
                    stroke={isSelected ? "rgba(252,211,77,0.65)" : "rgba(129,140,248,0.45)"}
                    strokeWidth="2"
                    strokeDasharray="5 4"
                    filter={isSelected ? "url(#softGlow)" : undefined}
                  />
                  <text
                    x={s.x}
                    y={s.y + 4}
                    textAnchor="middle"
                    fill="rgba(226,232,240,0.75)"
                    fontSize="10"
                    fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
                  >
                    {s.side}
                  </text>
                </g>
              );
            })}

            {/* nodes */}
            {layout.nodes.map((n) => {
              return (
                <g key={n.value}>
                  <circle
                    cx={n.x}
                    cy={n.y}
                    r="18"
                    fill="url(#nodeFill)"
                    stroke={status === "won" ? "rgba(52,211,153,0.55)" : "rgba(148,163,184,0.35)"}
                    strokeWidth="2.5"
                    filter="url(#softGlow)"
                  />
                  <text
                    x={n.x}
                    y={n.y + 4}
                    textAnchor="middle"
                    fill="rgba(248,250,252,0.95)"
                    fontSize="12"
                    fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
                  >
                    {n.value}
                  </text>
                </g>
              );
            })}
          </svg>

          <div className="muted" style={{ marginTop: 10, fontSize: 12 }}>
            Skillcheck: BST insertion is a deterministic path from root → leaf based on comparisons.
          </div>
        </div>
      </div>
    </AppShell>
  );
}
