import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import AppShell from "../components/AppShell";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Link, useLocation } from "react-router-dom";
import ResultSubmitPanel from "../components/ResultSubmitPanel";
import {
  getHapticsEnabled,
  getSoundEnabled,
  playFailSfx,
  playUiTapSfx,
  playWinSfx,
} from "../lib/diceSound";

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

function findInsertionSlot(root, value, eqGoesLeft = false) {
  // Returns { parentValue, side: "L"|"R" } where the new node should be inserted as null child
  let cur = root;
  let parent = null;
  let side = null;

  while (cur) {
    parent = cur;
    if (value < cur.value) {
      side = "L";
      cur = cur.left;
    } else if (value > cur.value) {
      side = "R";
      cur = cur.right;
    } else {
      // equal
      side = eqGoesLeft ? "L" : "R";
      cur = eqGoesLeft ? cur.left : cur.right;
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
  const eqGoesLeft = (difficulty || "EASY").toUpperCase() === "HARD";
  const duplicateChance = (difficulty || "EASY").toUpperCase() === "MEDIUM" ? 0.25 : ((difficulty || "EASY").toUpperCase() === "HARD" ? 0.45 : 0);
  let attempt = 0;
  while (attempt++ < 80) {
    const values = shuffle(Array.from({ length: poolMax }, (_, i) => i + 1));
    const base = values.slice(0, cfg.n);
    const newValue = Math.random() < duplicateChance ? base[randInt(0, base.length - 1)] : values[cfg.n];

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
      const answer = findInsertionSlot(root, newValue, eqGoesLeft);
      return { root, base, newValue, answer, cfg, eqGoesLeft };
    }
  }

  // Fallback (should be rare)
  const values = shuffle(Array.from({ length: 50 }, (_, i) => i + 1));
  const base = values.slice(0, 11);
  const newValue = values[11];
  let root = null;
  for (const v of base) root = bstInsert(root, v);
  const eqGoesLeftFallback = (difficulty || "EASY").toUpperCase() === "HARD";
  const answer = findInsertionSlot(root, newValue, eqGoesLeftFallback);
  return { root, base, newValue, answer, cfg: { n: 11, maxH: 6, shape: "random" }, eqGoesLeft: eqGoesLeftFallback };
}

// ------------------------
// Page
// ------------------------
export default function BSTInsertPage() {
  const loc = useLocation();
  const challenge = loc.state?.challenge;
  const difficulty = (challenge?.difficulty || "EASY").toUpperCase();

  // Prevent vertical page scrolling on mobile during the minigame.
  useEffect(() => {
    const prev = document.body.style.overflowY;
    document.body.style.overflowY = "hidden";
    return () => {
      document.body.style.overflowY = prev;
    };
  }, []);

  const [seed, setSeed] = useState(0);
  const puzzle = useMemo(() => makePuzzle(difficulty), [seed, difficulty]);

  const [dropped, setDropped] = useState(null); // { parent, side }
  const [status, setStatus] = useState("playing"); // playing | won | lost
  const [msg, setMsg] = useState("");

  const maxStrikes = useMemo(() => {
    if (difficulty === "EASY") return Number.POSITIVE_INFINITY;
    if (difficulty === "HARD") return 2;
    return 3; // MEDIUM
  }, [difficulty]);

  // Hints should NOT reveal the path/answer. We only flash a short algorithm reminder.
  const [hintOn, setHintOn] = useState(false);
  const [hintUses, setHintUses] = useState(difficulty === "MEDIUM" ? 2 : 0);

  const startRef = useRef(Date.now());
  const [timeMs, setTimeMs] = useState(0);
  const [errors, setErrors] = useState(0);

  const timeLimitMs = useMemo(() => {
    if (difficulty === "HARD") return 30_000;
    if (difficulty === "MEDIUM") return 40_000;
    return 55_000; // EASY
  }, [difficulty]);

  // Live timer + timeout
  useEffect(() => {
    if (status !== "playing") return;
    const id = setInterval(() => {
      const elapsed = Date.now() - startRef.current;
      setTimeMs(elapsed);
      if (timeLimitMs && elapsed >= timeLimitMs) {
        setStatus("lost");
        setMsg("⏱️ Time's up.");
      }
    }, 100);
    return () => clearInterval(id);
  }, [status, timeLimitMs]);

  const treeCardRef = useRef(null);
  const bottomBarRef = useRef(null);
  const [svgHeight, setSvgHeight] = useState(420);

  const layout = useMemo(() => buildLayout(puzzle.root), [puzzle.root]);
  function buzz(ms = 12) {
    try {
      if (getHapticsEnabled() && navigator.vibrate) navigator.vibrate(ms);
    } catch {
      // ignore
    }
  }

  function sfx(fn) {
    try {
      if (getSoundEnabled()) fn();
    } catch {
      // ignore
    }
  }

  useLayoutEffect(() => {
    function recompute() {
      const topBar = document.querySelector(".topBar");
      const topH = topBar ? topBar.getBoundingClientRect().height : 0;
      const barH = bottomBarRef.current ? bottomBarRef.current.getBoundingClientRect().height : 0;

      // Keep the whole tree visible without scrolling on phones.
      // We reserve a small buffer for paddings and the separator.
      const avail = Math.max(240, window.innerHeight - topH - barH - 28);
      setSvgHeight(avail);
    }

    recompute();
    window.addEventListener("resize", recompute);
    return () => window.removeEventListener("resize", recompute);
  }, [difficulty, seed]);

  function newPuzzle() {
    startRef.current = Date.now();
    setTimeMs(0);
    setErrors(0);
    setSeed((s) => s + 1);
    setDropped(null);
    setStatus("playing");
    setMsg("");
    setHintOn(false);
    setHintUses(difficulty === "MEDIUM" ? 2 : 0);
  }

  function resetTry() {
    setDropped(null);
    setMsg("");
  }

  function onSelectSlot(slot) {
    if (status !== "playing") return;
    setDropped({ parent: slot.parent, side: slot.side });
    setMsg("");
    buzz(10);
    sfx(playUiTapSfx);
  }

  const hintTimerRef = useRef(null);
  function toggleHint() {
    if (difficulty === "HARD") return;
    if (hintOn) return; // already flashing
    if (difficulty === "MEDIUM") {
      if (hintUses <= 0) {
        buzz(16);
        sfx(playFailSfx);
        setMsg("No hints left.");
        return;
      }
      setHintUses((u) => Math.max(0, u - 1));
      setHintOn(true);
      // Flash a short algorithm reminder (no path highlighting).
      clearTimeout(hintTimerRef.current);
      hintTimerRef.current = setTimeout(() => setHintOn(false), 1600);
      buzz(8);
      sfx(playUiTapSfx);
      return;
    }
    // EASY: free flash
    setHintOn(true);
    clearTimeout(hintTimerRef.current);
    hintTimerRef.current = setTimeout(() => setHintOn(false), 1800);
    buzz(8);
    sfx(playUiTapSfx);
  }

  function check() {
    if (!dropped) {
      setErrors((e) => e + 1);
      setMsg("Tap a dotted slot to place the node.");
      buzz(18);
      sfx(playFailSfx);
      return;
    }
    const ok =
      dropped.parent === puzzle.answer.parentValue &&
      dropped.side === puzzle.answer.side;

    if (ok) {
      setStatus("won");
      setTimeMs(Date.now() - startRef.current);
      buzz(26);
      sfx(playWinSfx);
      setMsg(
        `✅ Correct! ${puzzle.newValue} goes to the ${puzzle.answer.side === "L" ? "LEFT" : "RIGHT"} of ${puzzle.answer.parentValue}.`
      );
    } else {
      setErrors((e) => {
        const next = e + 1;
        // On MEDIUM/HARD the game can fail (mobile arcade feel).
        if (next >= maxStrikes) {
          setStatus("lost");
          setTimeMs(Date.now() - startRef.current);
          setMsg("❌ You lost — too many mistakes.");
        } else {
          setMsg(`❌ Wrong slot. Follow the comparisons from the root. (${next}/${maxStrikes === Number.POSITIVE_INFINITY ? "∞" : maxStrikes})`);
        }
        return next;
      });
      buzz(20);
      sfx(playFailSfx);
    }
  }

  const viewBox = `${layout.bounds.x} ${layout.bounds.y} ${layout.bounds.w} ${layout.bounds.h}`;
  // We intentionally do not highlight the path/answer as a hint (too strong).

  const selectedSlot = useMemo(() => {
    if (!dropped) return null;
    return layout.slots.find((s) => s.parent === dropped.parent && s.side === dropped.side) || null;
  }, [dropped, layout.slots]);

  return (
    <AppShell
      title="Code & Conquer"
      subtitle="BST Insert — tap the correct slot"
      headerBadges={
        <>
          <Badge>Category: BST_INSERT</Badge>
          <Badge>Diff: {difficulty}</Badge>
          <Badge>Time: {Math.max(0, Math.ceil((timeLimitMs - timeMs) / 1000))}s</Badge>
          <Badge>Value: {puzzle.newValue}</Badge>
          <Badge>Equal → {puzzle.eqGoesLeft ? "LEFT" : "RIGHT"}</Badge>
          <Badge>
            Mistakes: {errors}/{maxStrikes === Number.POSITIVE_INFINITY ? "∞" : maxStrikes}
          </Badge>
          {difficulty === "MEDIUM" ? <Badge>Hints: {hintUses}</Badge> : null}
          {status === "won" ? <Badge style={{ borderColor: "rgba(52,211,153,0.45)" }}>WON</Badge> : null}
          {status === "lost" ? <Badge style={{ borderColor: "rgba(244,63,94,0.55)" }}>LOST</Badge> : null}
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
              <li>If <code>newValue &gt; node.value</code>, go <strong>right</strong>.</li>
              <li>If <code>newValue == node.value</code>, go <strong>{puzzle.eqGoesLeft ? "left" : "right"}</strong> (this changes by difficulty).</li>
              <li>Repeat until the child is <strong>null</strong> — insert there.</li>
            </ol>
            <div style={{ marginTop: 10 }}>
              Tap one of the <strong>empty slots</strong> (dotted circles) to place the new node.
            </div>
            <div style={{ marginTop: 10 }}>
              <strong>Medium</strong> gives you a few consumable hints. <strong>Hard</strong> gives no hints and fewer mistakes.
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
      <div className="bstScreen">
        <style>{`
          /* Mobile-first: everything fits in the viewport without scrolling */
          .bstScreen{display:flex;flex-direction:column;min-height:0;gap:10px;height:100%;}
          .bstTreeCard{flex:1;min-height:0;border-radius:22px;border:1px solid rgba(148,163,184,0.18);
            background:rgba(2,6,23,0.18);overflow:hidden;display:flex;align-items:center;justify-content:center;
          }
          .bstBottomBar{display:flex;align-items:center;justify-content:space-between;gap:12px;
            padding:12px;border-radius:22px;border:1px solid rgba(148,163,184,0.18);
            background:rgba(2,6,23,0.55);backdrop-filter:blur(10px);
            padding-bottom:calc(env(safe-area-inset-bottom) + 12px);
          }
          .bstValueChip{display:flex;flex-direction:column;gap:2px;padding:10px 12px;border-radius:18px;
            border:1px solid rgba(148,163,184,0.18);background:rgba(15,23,42,0.35);min-width:90px;
          }
          .bstValueLabel{font-size:12px;opacity:0.75;}
          .bstValueNum{font-size:20px;font-weight:900;letter-spacing:-0.02em;}
          .bstActions{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end;}
          .bstToast{padding:10px 12px;border-radius:16px;border:1px solid rgba(148,163,184,0.18);
            background:rgba(2,6,23,0.35);font-size:13px;
          }
          @media (max-width:420px){
            .bstBottomBar{flex-direction:column;align-items:stretch;}
            .bstActions{justify-content:stretch;}
            .bstActions > button{width:100%;}
            .bstValueChip{width:100%;flex-direction:row;align-items:baseline;justify-content:space-between;}
          }
        `}</style>
        {msg ? <div className="bstToast">{msg}</div> : null}
        {hintOn ? (
          <div className="bstToast" style={{ borderColor: "rgba(59,130,246,0.55)" }}>
            💡 Start at the root → compare → go LEFT if smaller, RIGHT if bigger{puzzle.eqGoesLeft ? ", EQUAL goes LEFT." : ", EQUAL goes RIGHT."}
          </div>
        ) : null}

        {(status === "won" || status === "lost") ? (
          <ResultSubmitPanel
            category="BST_INSERT"
            difficulty={difficulty}
            timeMs={timeMs}
            errors={errors}
            won={status === "won"}
            challengeId={challenge?.challengeInstanceId}
          />
        ) : null}

        <div className="bstTreeCard" ref={treeCardRef}>
          <svg
            viewBox={viewBox}
            preserveAspectRatio="xMidYMid meet"
            style={{ width: "100%", height: svgHeight, display: "block" }}
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
                <stop offset="0%" stopColor="rgba(15,23,42,0.78)" />
                <stop offset="100%" stopColor="rgba(2,6,23,0.58)" />
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

              const inHint = false;
              return (
                <path
                  key={`${e.from}-${e.to}`}
                  d={curve}
                  fill="none"
                  stroke={inHint ? "rgba(250,204,21,0.70)" : "rgba(148,163,184,0.30)"}
                  strokeWidth={inHint ? 3.5 : 2.6}
                  strokeLinecap="round"
                  filter={inHint ? "url(#softGlow)" : undefined}
                />
              );
            })}

            {/* empty slots (tap targets) */}
            {layout.slots.map((s) => {
              const isSelected = dropped && dropped.parent === s.parent && dropped.side === s.side;
              const isHint = hintOn && s.parent === puzzle.answer.parentValue && s.side === puzzle.answer.side;
              return (
                <g
                  key={`${s.parent}-${s.side}`}
                  onClick={() => onSelectSlot(s)}
                  role="button"
                  aria-label={`Slot ${s.side} of ${s.parent}`}
                  style={{ cursor: status === "playing" ? "pointer" : "default" }}
                >
                  <circle cx={s.x} cy={s.y} r="26" fill="transparent" />
                  <circle
                    cx={s.x}
                    cy={s.y}
                    r="17"
                    fill={isSelected ? "rgba(245,158,11,0.22)" : "rgba(2,6,23,0.14)"}
                    stroke={
                      isSelected
                        ? "rgba(252,211,77,0.75)"
                        : isHint
                        ? "rgba(250,204,21,0.70)"
                        : "rgba(129,140,248,0.45)"
                    }
                    strokeWidth={isSelected || isHint ? 2.8 : 2}
                    strokeDasharray="5 4"
                    filter={(isSelected || isHint) ? "url(#softGlow)" : undefined}
                  />
                  <text
                    x={s.x}
                    y={s.y + 4}
                    textAnchor="middle"
                    fill="rgba(226,232,240,0.78)"
                    fontSize="11"
                    fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
                  >
                    {s.side}
                  </text>
                </g>
              );
            })}

            {/* ghost new node at selected slot */}
            {selectedSlot ? (
              <g>
                <circle
                  cx={selectedSlot.x}
                  cy={selectedSlot.y}
                  r="22"
                  fill="rgba(99,102,241,0.22)"
                  stroke="rgba(129,140,248,0.72)"
                  strokeWidth="2.8"
                  filter="url(#softGlow)"
                />
                <text
                  x={selectedSlot.x}
                  y={selectedSlot.y + 5}
                  textAnchor="middle"
                  fill="rgba(248,250,252,0.98)"
                  fontSize="14"
                  fontWeight="800"
                  fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
                >
                  {puzzle.newValue}
                </text>
              </g>
            ) : null}

            {/* nodes */}
            {layout.nodes.map((n) => {
              const inHint = false;
              return (
                <g key={n.value}>
                  <circle
                    cx={n.x}
                    cy={n.y}
                    r="19"
                    fill="url(#nodeFill)"
                    stroke={
                      status === "won"
                        ? "rgba(52,211,153,0.55)"
                        : inHint
                        ? "rgba(250,204,21,0.75)"
                        : "rgba(148,163,184,0.33)"
                    }
                    strokeWidth={inHint ? 3.0 : 2.6}
                    filter={inHint ? "url(#softGlow)" : undefined}
                  />
                  <text
                    x={n.x}
                    y={n.y + 5}
                    textAnchor="middle"
                    fill="rgba(248,250,252,0.96)"
                    fontSize="12"
                    fontWeight={inHint ? 800 : 700}
                    fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
                  >
                    {n.value}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        <div className="bstBottomBar" ref={bottomBarRef}>
          <div className="bstValueChip" aria-label="New node value">
            <div className="bstValueLabel">New</div>
            <div className="bstValueNum">{puzzle.newValue}</div>
          </div>

          <div className="bstActions">
            {difficulty !== "HARD" ? (
              <Button variant="secondary" onClick={toggleHint} disabled={status !== "playing"}>
                Hint{difficulty === "MEDIUM" ? ` (${hintUses})` : ""}
              </Button>
            ) : null}
            {/* No undo needed: players can always tap a different slot to change their choice. */}
            <Button variant="primary" onClick={check} disabled={status !== "playing"}>
              Check
            </Button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
