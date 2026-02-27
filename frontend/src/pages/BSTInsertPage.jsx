import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { Badge } from "../components/ui/badge";
import { cn } from "../lib/utils";
import ResultSubmitPanel from "../components/ResultSubmitPanel";
import TutorialModal from "../components/TutorialModal";
import { getPlayer } from "../lib/player";
import { getTutorial, tutorialKey } from "../lib/tutorials";
import { DIFFICULTY } from "../lib/constants";
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

function findInsertionSlot(root, value, eqGoesLeft = false) {
  let cur = root;
  let parent = null;
  let side = null;
  while (cur) {
    parent = cur;
    if (value < cur.value) { side = "L"; cur = cur.left; }
    else if (value > cur.value) { side = "R"; cur = cur.right; }
    else { side = eqGoesLeft ? "L" : "R"; cur = eqGoesLeft ? cur.left : cur.right; }
  }
  return { parentValue: parent ? parent.value : null, side };
}

function buildLayout(root) {
  const nodes = [], edges = [], slots = [];
  let xIndex = 0;
  const X_STEP = 78, Y_STEP = 98;

  function walk(node, depth) {
    if (!node) return;
    walk(node.left, depth + 1);
    const x = 70 + xIndex * X_STEP, y = 80 + depth * Y_STEP;
    nodes.push({ value: node.value, x, y, depth });
    xIndex++;
    if (node.left) edges.push({ from: node.value, to: node.left.value });
    if (node.right) edges.push({ from: node.value, to: node.right.value });
    if (!node.left) slots.push({ parent: node.value, side: "L", x: x - 38, y: y + 64 });
    if (!node.right) slots.push({ parent: node.value, side: "R", x: x + 38, y: y + 64 });
    walk(node.right, depth + 1);
  }
  walk(root, 0);
  const map = new Map(nodes.map((n) => [n.value, n]));
  const allPoints = [...nodes.map(n=>({x:n.x,y:n.y})), ...slots.map(s=>({x:s.x,y:s.y}))];
  const minX = Math.min(...allPoints.map(p=>p.x)), maxX = Math.max(...allPoints.map(p=>p.x));
  const minY = Math.min(...allPoints.map(p=>p.y)), maxY = Math.max(...allPoints.map(p=>p.y));
  const pad = 70;
  return { nodes, edges, slots, map, bounds: { x: minX-pad, y: minY-pad, w: (maxX-minX)+pad*2, h: (maxY-minY)+pad*2 } };
}

function makePuzzle(difficulty) {
  const cfg = { [DIFFICULTY.EASY]: { n: 7, maxH: 4, shape: "balanced" }, [DIFFICULTY.MEDIUM]: { n: 11, maxH: 6, shape: "random" }, [DIFFICULTY.HARD]: { n: 15, maxH: 9, shape: "skew" } }[difficulty] || { n: 11, maxH: 6, shape: "random" };
  const poolMax = 60;
  const eqGoesLeft = difficulty === DIFFICULTY.HARD;
  const duplicateChance = difficulty === DIFFICULTY.MEDIUM ? 0.25 : (difficulty === DIFFICULTY.HARD ? 0.45 : 0);
  let attempt = 0;
  while (attempt++ < 80) {
    const values = shuffle(Array.from({ length: poolMax }, (_, i) => i + 1));
    const base = values.slice(0, cfg.n);
    const newValue = Math.random() < duplicateChance ? base[randInt(0, base.length - 1)] : values[cfg.n];
    let root = null;
    if (cfg.shape === "balanced") root = buildBalancedBST(base.slice().sort((a,b)=>a-b));
    else if (cfg.shape === "skew") {
      const sorted = base.slice().sort((a,b)=>a-b);
      for (const v of sorted) root = bstInsert(root, v);
    } else { for (const v of base) root = bstInsert(root, v); }
    if (height(root) <= cfg.maxH) return { root, base, newValue, answer: findInsertionSlot(root, newValue, eqGoesLeft), cfg, eqGoesLeft };
  }
  return { root: null, base: [], newValue: 0, answer: null, cfg: {}, eqGoesLeft: false };
}

export default function BSTInsertPage() {
  const loc = useLocation();
  const challenge = loc.state?.challenge;
  const difficulty = (challenge?.difficulty || DIFFICULTY.EASY).toUpperCase();
  const player = useMemo(() => getPlayer(), []);
  const tutorial = useMemo(() => getTutorial("BST_INSERT"), []);
  const tutKey = useMemo(() => tutorialKey({ playerId: player?.playerId, category: "BST_INSERT" }), [player?.playerId]);

  const [tutorialOpen, setTutorialOpen] = useState(() => {
    if (!challenge) return false;
    try { return localStorage.getItem(tutKey) !== "1"; } catch { return false; }
  });

  const [started, setStarted] = useState(() => !tutorialOpen);
  useEffect(() => {
    const prev = document.body.style.overflowY;
    document.body.style.overflowY = "hidden";
    return () => { document.body.style.overflowY = prev; };
  }, []);

  const [seed, setSeed] = useState(0);
  const puzzle = useMemo(() => makePuzzle(difficulty), [seed, difficulty]);
  const [dropped, setDropped] = useState(null);
  const [status, setStatus] = useState(() => (tutorialOpen ? "waiting" : "playing"));
  const [toast, setToast] = useState(null);
  const maxStrikes = difficulty === DIFFICULTY.EASY ? Infinity : (difficulty === DIFFICULTY.HARD ? 2 : 3);

  const startRef = useRef(Date.now());
  const [timeMs, setTimeMs] = useState(0);
  const [errors, setErrors] = useState(0);
  const timeLimitMs = difficulty === DIFFICULTY.HARD ? 30000 : (difficulty === DIFFICULTY.MEDIUM ? 40000 : 55000);

  useEffect(() => {
    if (!started || status !== "playing") return;
    const id = setInterval(() => {
      const elapsed = Date.now() - startRef.current;
      setTimeMs(elapsed);
      if (timeLimitMs && elapsed >= timeLimitMs) { setStatus("lost"); setToast({ text: "⏱️", kind: "lose" }); }
    }, 100);
    return () => clearInterval(id);
  }, [started, status, timeLimitMs]);

  const rootRef = useRef(null);
  const hudRef = useRef(null);
  const [svgHeight, setSvgHeight] = useState(420);
  const layout = useMemo(() => puzzle.root ? buildLayout(puzzle.root) : null, [puzzle.root]);

  useLayoutEffect(() => {
    function recompute() {
      const hudH = hudRef.current?.offsetHeight || 0;
      const avail = Math.max(240, window.innerHeight - hudH - 80);
      setSvgHeight(avail);
    }
    recompute();
    window.addEventListener("resize", recompute);
    return () => window.removeEventListener("resize", recompute);
  }, [difficulty, seed]);

  const toastTimerRef = useRef(null);
  function flashToast(text, kind = "info", ms = 900) {
    setToast({ text, kind });
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), ms);
  }

  function onSelectSlot(slot) {
    if (status !== "playing") return;
    const pick = { parent: slot.parent, side: slot.side };
    setDropped(pick);
    if (getHapticsEnabled() && navigator.vibrate) navigator.vibrate(10);
    if (getSoundEnabled()) playUiTapSfx();

    if (pick.parent === puzzle.answer.parentValue && pick.side === puzzle.answer.side) {
      setStatus("won");
      setTimeMs(Date.now() - startRef.current);
      flashToast("✅", "win", 900);
      if (getHapticsEnabled() && navigator.vibrate) navigator.vibrate(26);
      if (getSoundEnabled()) playWinSfx();
      return;
    }

    setErrors((e) => {
      const next = e + 1;
      if (next >= maxStrikes) { setStatus("lost"); setTimeMs(Date.now() - startRef.current); flashToast("💥", "lose", 1200); }
      else { flashToast("❌", "lose", 700); }
      return next;
    });
    if (getHapticsEnabled() && navigator.vibrate) navigator.vibrate(18);
    if (getSoundEnabled()) playFailSfx();
  }

  if (!layout) return null;
  const viewBox = `${layout.bounds.x} ${layout.bounds.y} ${layout.bounds.w} ${layout.bounds.h}`;
  const selectedSlot = dropped ? layout.slots.find((s) => s.parent === dropped.parent && s.side === dropped.side) : null;

  return (
    <div className="h-full flex flex-col bg-bg0 text-text overflow-hidden p-s3 sm:p-s4" ref={rootRef}>
      {/* HUD */}
      <div className="flex justify-between items-center mb-s3 animate-in fade-in slide-in-from-top-2 duration-300" ref={hudRef}>
        <div className="flex gap-2">
          <Badge variant="secondary" className="px-3 py-1 font-bold">⏱️ {Math.max(0, Math.ceil((timeLimitMs - timeMs) / 1000))}s</Badge>
          <Badge variant="outline" className="px-3 py-1 font-bold bg-indigo-500/10 border-indigo-500/30 text-indigo-200">
            ➕ Value: {puzzle.newValue}
          </Badge>
        </div>
        <div className="flex gap-2">
          <Badge variant="secondary" className="px-3 py-1 font-bold">{puzzle.eqGoesLeft ? "Equal: ←" : "Equal: →"}</Badge>
          <Badge variant="outline" className={cn("px-3 py-1 font-bold opacity-70", errors > 0 && "text-rose-400 border-rose-500/40")}>
            💥 {errors}/{maxStrikes === Infinity ? "∞" : maxStrikes}
          </Badge>
        </div>
      </div>

      {/* Tree Visualization */}
      <div className="flex-1 flex items-center justify-center min-h-0 bg-bg1/20 rounded-2xl border border-border shadow-inner relative overflow-hidden animate-in zoom-in-95 duration-500">
        <svg
          viewBox={viewBox}
          preserveAspectRatio="xMidYMid meet"
          style={{ width: "100%", height: svgHeight, display: "block" }}
          className="transition-all duration-300"
        >
          <defs>
            <filter id="nodeGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2.5" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <linearGradient id="nodeGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#1e293b" /><stop offset="100%" stopColor="#0f172a" /></linearGradient>
          </defs>

          {/* Edges */}
          {layout.edges.map((e) => {
            const a = layout.map.get(e.from), b = layout.map.get(e.to);
            if (!a || !b) return null;
            const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
            const curve = `M ${a.x} ${a.y} Q ${mx} ${my - 10} ${b.x} ${b.y}`;
            return <path key={`${e.from}-${e.to}`} d={curve} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="2.5" strokeLinecap="round" className="transition-all duration-500" />;
          })}

          {/* Empty Slots */}
          {layout.slots.map((s) => {
            const isSelected = dropped && dropped.parent === s.parent && dropped.side === s.side;
            return (
              <g key={`${s.parent}-${s.side}`} onClick={() => onSelectSlot(s)} className="cursor-pointer group">
                <circle cx={s.x} cy={s.y} r="28" fill="transparent" />
                <circle cx={s.x} cy={s.y} r="16" fill={isSelected ? "rgba(99,102,241,0.2)" : "transparent"} stroke={isSelected ? "#818cf8" : "rgba(255,255,255,0.15)"} strokeWidth="2" strokeDasharray="4 4" className={cn("transition-all duration-300", isSelected ? "animate-pulse" : "group-hover:stroke-indigo-400")} />
                <text x={s.x} y={s.y + 4} textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="9" fontWeight="bold" className="pointer-events-none uppercase">{s.side}</text>
              </g>
            );
          })}

          {/* Nodes */}
          {layout.nodes.map((n) => (
            <g key={n.value} className="transition-all duration-300">
              <circle cx={n.x} cy={n.y} r="18" fill="url(#nodeGrad)" stroke={status === "won" ? "#10b981" : "rgba(255,255,255,0.12)"} strokeWidth="2" filter={status === "won" ? "url(#nodeGlow)" : undefined} />
              <text x={n.x} y={n.y + 4} textAnchor="middle" fill="#f8fafc" fontSize="11" fontWeight="bold">{n.value}</text>
            </g>
          ))}

          {/* Ghost Inserted Node */}
          {selectedSlot && (
            <g className="animate-in zoom-in duration-300">
              <circle cx={selectedSlot.x} cy={selectedSlot.y} r="20" fill="#4f46e5" stroke="#818cf8" strokeWidth="2" filter="url(#nodeGlow)" />
              <text x={selectedSlot.x} y={selectedSlot.y + 4} textAnchor="middle" fill="#fff" fontSize="12" fontWeight="black">{puzzle.newValue}</text>
            </g>
          )}
        </svg>

        {toast && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50 animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 rounded-full bg-bg0/80 backdrop-blur-xl border border-white/10 text-4xl shadow-2xl">{toast.text}</div>
          </div>
        )}
      </div>

      {(status === "won" || status === "lost") && (
        <ResultSubmitPanel
          category="BST_INSERT" difficulty={difficulty} timeMs={timeMs} errors={errors}
          won={status === "won"} challengeId={challenge?.challengeInstanceId}
          explanation={status === "won" ? `Great! ${puzzle.newValue} belongs to the ${puzzle.answer.side === "L" ? "left" : "right"} of ${puzzle.answer.parentValue}.` : `Incorrect. The target slot was to the ${puzzle.answer.side === "L" ? "left" : "right"} of ${puzzle.answer.parentValue}.`}
        />
      )}

      <TutorialModal
        open={tutorialOpen} tutorial={tutorial} difficulty={difficulty}
        onConfirm={() => {
          try { localStorage.setItem(tutKey, "1"); } catch {}
          setTutorialOpen(false); setStarted(true); setStatus("playing"); startRef.current = Date.now();
        }}
      />
    </div>
  );
}