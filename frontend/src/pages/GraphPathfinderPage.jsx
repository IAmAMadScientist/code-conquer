import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { cn } from "../lib/utils";
import { useLocation } from "react-router-dom";
import ResultSubmitPanel from "../components/ResultSubmitPanel";
import TutorialModal from "../components/TutorialModal";
import { getPlayer } from "../lib/player";
import { getTutorial, tutorialKey } from "../lib/tutorials";
import { DIFFICULTY, UI_STRINGS } from "../lib/constants";

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function randInt(a, b) {
  return Math.floor(Math.random() * (b - a + 1)) + a;
}

function dist(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function edgeKey(u, v) {
  return u < v ? `${u}-${v}` : `${v}-${u}`;
}

function generateNodesNoOverlap(count, width, height, padding, minDist) {
  const nodes = [];
  const maxTries = 8000;

  let tries = 0;
  while (nodes.length < count && tries < maxTries) {
    tries++;

    const p = {
      id: nodes.length,
      x: randInt(padding, width - padding),
      y: randInt(padding, height - padding),
    };

    let ok = true;
    for (const n of nodes) {
      if (dist(p, n) < minDist) {
        ok = false;
        break;
      }
    }

    if (ok) nodes.push(p);
  }

  // Fallback: jittered grid (always succeeds)
  if (nodes.length < count) {
    const cols = Math.ceil(Math.sqrt(count));
    const rows = Math.ceil(count / cols);
    const cellW = (width - 2 * padding) / cols;
    const cellH = (height - 2 * padding) / rows;

    const fallback = [];
    let id = 0;
    for (let r = 0; r < rows && id < count; r++) {
      for (let c = 0; c < cols && id < count; c++) {
        const jitterX = randInt(-Math.floor(cellW * 0.18), Math.floor(cellW * 0.18));
        const jitterY = randInt(-Math.floor(cellH * 0.18), Math.floor(cellH * 0.18));
        fallback.push({
          id,
          x: Math.round(padding + c * cellW + cellW / 2 + jitterX),
          y: Math.round(padding + r * cellH + cellH / 2 + jitterY),
        });
        id++;
      }
    }
    return fallback;
  }

  return nodes;
}

function pickStartGoalFar(nodes, minSep) {
  let start = 0;
  let goal = nodes.length - 1;

  let bestPair = { s: start, g: goal, d: dist(nodes[start], nodes[goal]) };

  for (let t = 0; t < 200; t++) {
    const s = randInt(0, nodes.length - 1);
    const g = randInt(0, nodes.length - 1);
    if (g === s) continue;

    const d = dist(nodes[s], nodes[g]);
    if (d > bestPair.d) bestPair = { s, g, d };
    if (d >= minSep) return { start: s, goal: g };
  }

  return { start: bestPair.s, goal: bestPair.g };
}

// Build a small connected weighted graph with readable node spacing
function makeGraph(difficulty = DIFFICULTY.EASY) {
  // Larger logical canvas; SVG scales responsively to the container.
  const W = 900;
  const H = 560;

  const cfgByDiff = {
    [DIFFICULTY.EASY]:   { nodeCount: 8,  kNearest: 2, extraEdges: 1, weightMax: 9,  minStartGoal: 520 },
    [DIFFICULTY.MEDIUM]: { nodeCount: 10, kNearest: 2, extraEdges: 3, weightMax: 11, minStartGoal: 560 },
    [DIFFICULTY.HARD]:   { nodeCount: 12, kNearest: 3, extraEdges: 6, weightMax: 14, minStartGoal: 600 },
  };
  const cfg = cfgByDiff[difficulty] || cfgByDiff[DIFFICULTY.EASY];

  // Keep nodes well spaced, especially for mobile readability.
  const MIN_DIST = 78;
  const PADDING = 64;

  // Try multiple layouts and pick the one with the fewest crossings + farthest start/goal.
  let best = null;

  for (let attempt = 0; attempt < 28; attempt++) {
    const nodes = generateNodesNoOverlap(cfg.nodeCount, W, H, PADDING, MIN_DIST);

    // pick start/goal as the farthest pair (max euclidean distance)
    let start = 0;
    let goal = 1;
    let bestD = -1;
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const d = dist(nodes[i], nodes[j]);
        if (d > bestD) {
          bestD = d;
          start = i;
          goal = j;
        }
      }
    }

    const edges = [];
    const seen = new Set();

    function segIntersects(a, b, c, d) {
      // proper segment intersection (excluding shared endpoints)
      const o = (p, q, r) => {
        const v = (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
        if (Math.abs(v) < 1e-9) return 0;
        return v > 0 ? 1 : -1;
      };
      const onSeg = (p, q, r) =>
        Math.min(p.x, r.x) - 1e-9 <= q.x && q.x <= Math.max(p.x, r.x) + 1e-9 &&
        Math.min(p.y, r.y) - 1e-9 <= q.y && q.y <= Math.max(p.y, r.y) + 1e-9;

      const o1 = o(a, b, c);
      const o2 = o(a, b, d);
      const o3 = o(c, d, a);
      const o4 = o(c, d, b);

      if (o1 !== o2 && o3 !== o4) return true;
      if (o1 === 0 && onSeg(a, c, b)) return true;
      if (o2 === 0 && onSeg(a, d, b)) return true;
      if (o3 === 0 && onSeg(c, a, d)) return true;
      if (o4 === 0 && onSeg(c, b, d)) return true;
      return false;
    }

    function wouldCross(u, v) {
      const A = nodes[u];
      const B = nodes[v];
      for (const e of edges) {
        // ignore edges that share an endpoint
        if (e.u === u || e.v === u || e.u === v || e.v === v) continue;
        const C = nodes[e.u];
        const D = nodes[e.v];
        if (segIntersects(A, B, C, D)) return true;
      }
      return false;
    }

    function addEdge(u, v, allowCrossing = false) {
      if (u === v) return false;
      const k = edgeKey(u, v);
      if (seen.has(k)) return false;
      if (!allowCrossing && wouldCross(u, v)) return false;

      seen.add(k);
      // weight based on distance, clamped
      const raw = Math.round(dist(nodes[u], nodes[v]) / 55);
      const w = clamp(raw, 1, cfg.weightMax);
      edges.push({ u, v, w });
      return true;
    }

    // Connect each node to its k nearest neighbors (prefer non-crossing edges)
    for (let i = 0; i < cfg.nodeCount; i++) {
      const dists = [];
      for (let j = 0; j < cfg.nodeCount; j++) {
        if (i === j) continue;
        dists.push({ j, d: dist(nodes[i], nodes[j]) });
      }
      dists.sort((a, b) => a.d - b.d);

      let added = 0;
      for (let idx = 0; idx < dists.length && added < cfg.kNearest; idx++) {
        if (addEdge(i, dists[idx].j, false)) added++;
      }
      // if we couldn't add enough without crossing, allow crossing as fallback
      for (let idx = 0; idx < dists.length && added < cfg.kNearest; idx++) {
        if (addEdge(i, dists[idx].j, true)) added++;
      }
    }

    // Union-find to ensure connected; connect components with the closest non-crossing edges if possible.
    const parent = Array.from({ length: cfg.nodeCount }, (_, i) => i);
    const find = (x) => (parent[x] === x ? x : (parent[x] = find(parent[x])));
    const unite = (a, b) => {
      a = find(a);
      b = find(b);
      if (a !== b) parent[b] = a;
    };
    for (const e of edges) unite(e.u, e.v);

    function components() {
      const groups = new Map();
      for (let i = 0; i < cfg.nodeCount; i++) {
        const r = find(i);
        if (!groups.has(r)) groups.set(r, []);
        groups.get(r).push(i);
      }
      return [...groups.values()];
    }

    let guard = 0;
    while (components().length > 1 && guard < 240) {
      guard++;
      const comps = components();
      let bestPair = null;

      for (let a = 0; a < comps.length; a++) {
        for (let b = a + 1; b < comps.length; b++) {
          for (const i of comps[a]) {
            for (const j of comps[b]) {
              const d = dist(nodes[i], nodes[j]);
              const crosses = wouldCross(i, j);
              // Prefer non-crossing, then shorter distances
              const score = (crosses ? 1e9 : 0) + d;
              if (!bestPair || score < bestPair.score) bestPair = { i, j, score };
            }
          }
        }
      }

      if (!bestPair) break;

      // If only crossing edges are possible, allow crossing to connect the graph.
      const allow = bestPair.score >= 1e9;
      if (addEdge(bestPair.i, bestPair.j, allow)) {
        unite(bestPair.i, bestPair.j);
      } else {
        // as a last resort, connect with crossing allowed
        addEdge(bestPair.i, bestPair.j, true);
        unite(bestPair.i, bestPair.j);
      }
    }

    // Add a few extra edges to create alternate routes, still preferring no crossings.
    const pairs = [];
    for (let i = 0; i < cfg.nodeCount; i++) {
      for (let j = i + 1; j < cfg.nodeCount; j++) {
        pairs.push({ i, j, d: dist(nodes[i], nodes[j]) });
      }
    }
    pairs.sort((a, b) => a.d - b.d);

    let extras = 0;
    for (const p of pairs) {
      if (extras >= cfg.extraEdges) break;
      if (addEdge(p.i, p.j, false)) extras++;
    }

    // Count crossings for scoring.
    let crossings = 0;
    for (let a = 0; a < edges.length; a++) {
      for (let b = a + 1; b < edges.length; b++) {
        const e1 = edges[a], e2 = edges[b];
        if (e1.u === e2.u || e1.u === e2.v || e1.v === e2.u || e1.v === e2.v) continue;
        if (segIntersects(nodes[e1.u], nodes[e1.v], nodes[e2.u], nodes[e2.v])) crossings++;
      }
    }

    const startGoalDist = bestD;
    const score = crossings * 10000 - startGoalDist; // fewer crossings dominates; then maximize distance

    if (!best || score < best.score) {
      best = { nodes, edges, start, goal, score, crossings, startGoalDist };
    }

    // Early accept if it's very clean and far apart.
    if (crossings === 0 && startGoalDist >= cfg.minStartGoal) {
      best = { nodes, edges, start, goal, score, crossings, startGoalDist };
      break;
    }
  }

  return { nodes: best.nodes, edges: best.edges, start: best.start, goal: best.goal, W, H };
}

function buildAdj(nodes, edges) {
  const adj = Array.from({ length: nodes.length }, () => []);
  for (const e of edges) {
    adj[e.u].push({ to: e.v, w: e.w });
    adj[e.v].push({ to: e.u, w: e.w });
  }
  return adj;
}

function dijkstraWithPrev(adj, start) {
  const n = adj.length;
  const distArr = Array(n).fill(Infinity);
  const prev = Array(n).fill(null);
  distArr[start] = 0;

  const used = Array(n).fill(false);

  for (let it = 0; it < n; it++) {
    let v = -1;
    let best = Infinity;
    for (let i = 0; i < n; i++) {
      if (!used[i] && distArr[i] < best) {
        best = distArr[i];
        v = i;
      }
    }
    if (v === -1) break;
    used[v] = true;

    for (const { to, w } of adj[v]) {
      const nd = distArr[v] + w;
      if (nd < distArr[to]) {
        distArr[to] = nd;
        prev[to] = v;
      }
    }
  }

  return { distArr, prev };
}

function reconstructPath(prev, start, goal) {
  const path = [];
  let cur = goal;
  while (cur != null) {
    path.push(cur);
    if (cur === start) break;
    cur = prev[cur];
  }
  path.reverse();
  if (path[0] !== start) return [];
  return path;
}

export default function GraphPathfinderPage() {
  const loc = useLocation();
  const challenge = loc.state?.challenge;
  const difficulty = challenge?.difficulty || DIFFICULTY.EASY;

  // First-time tutorial gate (per minigame + per player on this device)
  const player = useMemo(() => getPlayer(), []);
  const tutorial = useMemo(() => getTutorial("GRAPH_PATH"), []);
  const tutKey = useMemo(
    () => tutorialKey({ playerId: player?.playerId, category: "GRAPH_PATH" }),
    [player?.playerId]
  );

  // Determine tutorial visibility synchronously so the minigame truly doesn't start in the background.
  const [tutorialOpen, setTutorialOpen] = useState(() => {
    if (!challenge) return false; // if opened directly, don't block
    try {
      return localStorage.getItem(tutKey) !== "1";
    } catch {
      return false;
    }
  });

  const [started, setStarted] = useState(() => !tutorialOpen);


  const [seed, setSeed] = useState(0);

  const { nodes, edges, start, goal, W: layoutW, H: layoutH } = useMemo(() => makeGraph(difficulty), [seed, difficulty]);
  const adj = useMemo(() => buildAdj(nodes, edges), [nodes, edges]);

  const { distArr: distFromStart, prev } = useMemo(() => dijkstraWithPrev(adj, start), [adj, start]);
  const optimal = distFromStart[goal];
  const safeOptimal = Number.isFinite(optimal) ? optimal : null;

  const optimalPath = useMemo(() => reconstructPath(prev, start, goal), [prev, start, goal]);
  const optimalEdges = useMemo(() => {
    const s = new Set();
    for (let i = 0; i < optimalPath.length - 1; i++) s.add(edgeKey(optimalPath[i], optimalPath[i + 1]));
    return s;
  }, [optimalPath]);

  const [path, setPath] = useState([start]);
  const [status, setStatus] = useState(() => (tutorialOpen ? "waiting" : "playing")); // waiting | playing | won | lost
  const [message, setMessage] = useState("");

  // Quick-session arcade layer: beat a budget + timer.
  const diffCfg = useMemo(() => {
    const d = (difficulty || DIFFICULTY.EASY).toUpperCase();
    // Only the true shortest path (Dijkstra optimal) counts as a win.
    // Difficulty only adjusts the time pressure.
    if (d === DIFFICULTY.HARD) return { timeLimitSec: 35 };
    if (d === DIFFICULTY.MEDIUM) return { timeLimitSec: 40 };
    return { timeLimitSec: 45 };
  }, [difficulty]);

  // scoring helpers
  const startRef = useRef(Date.now());
  const [timeMs, setTimeMs] = useState(0);
  const [errors, setErrors] = useState(0);
  const [timeLeftMs, setTimeLeftMs] = useState(diffCfg.timeLimitSec * 1000);

  // IMPORTANT: when graph changes, start changes -> reset path
  useEffect(() => {
    if (!started) return;
    startRef.current = Date.now();
    setTimeMs(0);
    setErrors(0);
    setTimeLeftMs(diffCfg.timeLimitSec * 1000);
    setPath([start]);
    setStatus("playing");
    setMessage("");
  }, [started, start, diffCfg.timeLimitSec]);

  // Tick down timer while playing (mobile-friendly: low freq).
  useEffect(() => {
    if (!started || status !== "playing") return;
    const t = setInterval(() => {
      const elapsed = Date.now() - startRef.current;
      const left = Math.max(0, diffCfg.timeLimitSec * 1000 - elapsed);
      setTimeLeftMs(left);
      if (left <= 0) {
        setStatus("lost");
        setMessage("Time's up! Try a faster route.");
      }
    }, 120);
    return () => clearInterval(t);
  }, [started, status, diffCfg.timeLimitSec]);

  const edgeMap = useMemo(() => {
    const m = new Map();
    for (const e of edges) {
      m.set(edgeKey(e.u, e.v), e.w);
    }
    return m;
  }, [edges]);

  function isNeighbor(a, b) {
    return adj[a].some((x) => x.to === b);
  }

  function pathWeight(p) {
    let sum = 0;
    for (let i = 0; i < p.length - 1; i++) {
      const w = edgeMap.get(edgeKey(p[i], p[i + 1]));
      if (typeof w !== "number") return Infinity;
      sum += w;
    }
    return sum;
  }

  function resetSameGraph() {
    startRef.current = Date.now();
    setTimeMs(0);
    setErrors(0);
    setTimeLeftMs(diffCfg.timeLimitSec * 1000);
    setPath([start]);
    setStatus("playing");
    setMessage("");
  }

  function newGraph() {
    startRef.current = Date.now();
    setTimeMs(0);
    setErrors(0);
    setTimeLeftMs(diffCfg.timeLimitSec * 1000);
    setSeed((s) => s + 1);
    // path gets reset by useEffect([start]), but do it now too for instant UI
    setPath([start]);
    setStatus("playing");
    setMessage("");
  }

  // stop timer on finish
  useEffect(() => {
    if (status === "playing") return;
    setTimeMs(Date.now() - startRef.current);
  }, [status]);

  function undo() {
    if (path.length <= 1 || status !== "playing") return;
    setPath((p) => p.slice(0, -1));
  }

  function onNodeClick(id) {
    if (status !== "playing") return;

    const last = path[path.length - 1];
    if (id === last) return;

    // backtrack by clicking existing node in path
    const idx = path.lastIndexOf(id);
    if (idx !== -1) {
      setPath((p) => p.slice(0, idx + 1));
      return;
    }

    if (!isNeighbor(last, id)) {
      setMessage("Not connected — you can only move along a visible edge.");
      try { if (navigator.vibrate) navigator.vibrate(18); } catch {}
      setErrors((e) => e + 1);
      return;
    }

    // Budget check (arcade): if you exceed the budget you lose immediately.
    const stepW = edgeMap.get(edgeKey(last, id)) ?? Infinity;
    const nextW = (Number.isFinite(currentWeight) ? currentWeight : 0) + stepW;
    if (budget != null && nextW > budget) {
      setErrors((e) => e + 1);
      setMessage(`Over budget! (${nextW} > ${budget})`);
      try { if (navigator.vibrate) navigator.vibrate([16, 30, 16]); } catch {}
      setStatus("lost");
      return;
    }

    setMessage("");
    setPath((p) => p.concat(id));
  }

  function check(fromAuto = false) {
    if (!safeOptimal) {
      setErrors((e) => e + 1);
      setMessage("No path from START to GOAL in this graph.");
      return;
    }

    const last = path[path.length - 1];
    if (last !== goal) {
      setErrors((e) => e + 1);
      setMessage(fromAuto ? "" : "You must end on the Goal node.");
      return;
    }

    for (let i = 0; i < path.length - 1; i++) {
      if (!isNeighbor(path[i], path[i + 1])) {
        setErrors((e) => e + 1);
        setMessage("Invalid path: contains a non-edge step.");
        return;
      }
    }

    const w = pathWeight(path);
    if (!Number.isFinite(w)) {
      setErrors((e) => e + 1);
      setMessage("Invalid path (missing edge weight).");
      return;
    }

    // Only the true shortest path counts.
    const budget = safeOptimal;
    if (w !== budget) {
      setErrors((e) => e + 1);
      setStatus("lost");
      setMessage(`Not optimal! Cost ${w} (shortest ${budget}).`);
      try { if (navigator.vibrate) navigator.vibrate([18, 40, 18]); } catch {}
      return;
    }

    setStatus("won");
    const left = Math.ceil(timeLeftMs / 1000);
    setMessage(`Perfect! Shortest cost ${w}. +${left}s left.`);
    try { if (navigator.vibrate) navigator.vibrate([20, 30, 20]); } catch {}
  }

  const currentWeight = pathWeight(path);

  const cursor = path[path.length - 1];
  const neighborSet = useMemo(() => {
    const s = new Set();
    for (const n of (adj[cursor] || [])) s.add(n.to);
    return s;
  }, [adj, cursor]);

  const budget = useMemo(() => {
    if (!safeOptimal) return null;
    return safeOptimal;
  }, [safeOptimal]);

  const pathEdges = useMemo(() => {
    const s = new Set();
    for (let i = 0; i < path.length - 1; i++) s.add(edgeKey(path[i], path[i + 1]));
    return s;
  }, [path]);

  const timeLeftS = Math.max(0, Math.ceil(timeLeftMs / 1000));
  const timePct = clamp(Math.round((timeLeftMs / (diffCfg.timeLimitSec * 1000)) * 100), 0, 100);

  return (
    <div className="h-full flex flex-col bg-bg0 text-text overflow-hidden p-s3 sm:p-s4" aria-label="Graph Pathfinder">
      {/* HUD */}
      <div className="flex justify-between items-center mb-s3 animate-in fade-in slide-in-from-top-2 duration-300">
        <div className="flex gap-2">
          <Badge variant="secondary" className="px-3 py-1 font-bold text-xs">⏱️ {timeLeftS}s</Badge>
          <Badge variant="outline" className="px-3 py-1 font-bold text-xs bg-indigo-500/10 border-indigo-500/30 text-indigo-300">
            🎯 {budget ?? "—"}
          </Badge>
        </div>
        <div className="flex gap-2">
          <Badge 
            variant="secondary" 
            className={cn(
              "px-3 py-1 font-bold text-xs transition-colors",
              budget != null && currentWeight > budget ? "bg-rose-500/20 text-rose-300 border-rose-500/40" : ""
            )}
          >
            ⚡ {Number.isFinite(currentWeight) ? currentWeight : 0}
          </Badge>
          <Badge variant="outline" className="px-3 py-1 font-bold text-xs text-muted/60 border-border/40">
            💥 {errors}
          </Badge>
        </div>
      </div>

      {/* Time Bar */}
      <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden mb-s4">
        <div 
          className="h-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)] transition-all duration-300 ease-linear" 
          style={{ width: `${timePct}%` }} 
        />
      </div>

      {/* Playfield: Responsive SVG Container */}
      <div className="flex-1 flex items-center justify-center min-h-0 bg-bg1/20 rounded-2xl border border-border shadow-inner relative overflow-hidden animate-in zoom-in-95 duration-500">
        <svg 
          className="w-full h-full max-w-full max-h-full" 
          viewBox={`0 0 ${layoutW} ${layoutH}`} 
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <filter id="softGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2.2" result="blur" />
              <feColorMatrix in="blur" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.9 0" result="glow" />
              <feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <linearGradient id="edgeGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="rgba(99,102,241,0.4)" />
              <stop offset="50%" stopColor="rgba(129,140,248,0.8)" />
              <stop offset="100%" stopColor="rgba(99,102,241,0.4)" />
            </linearGradient>
          </defs>

          {/* Edges */}
          {edges.map((e) => {
            const a = nodes[e.u], b = nodes[e.v], k = edgeKey(e.u, e.v);
            const onUser = pathEdges.has(k), onOptimal = status === "won" && optimalEdges.has(k);
            return (
              <g key={k}>
                <line
                  x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                  stroke={onOptimal ? "#10b981" : onUser ? "url(#edgeGrad)" : "rgba(255,255,255,0.08)"}
                  filter={onOptimal || onUser ? "url(#softGlow)" : undefined}
                  strokeWidth={onOptimal ? 6 : onUser ? 5 : 2.5}
                  strokeLinecap="round"
                  className="transition-all duration-500"
                />
                <g transform={`translate(${(a.x + b.x) / 2}, ${(a.y + b.y) / 2})`}>
                  <rect x="-14" y="-10" width="28" height="20" rx="6" fill="#0f172a" stroke="rgba(255,255,255,0.1)" />
                  <text y="4" textAnchor="middle" fill={onUser ? "#fff" : "#94a3b8"} fontSize="12" fontWeight="bold" className="pointer-events-none">{e.w}</text>
                </g>
              </g>
            );
          })}

          {/* Nodes */}
          {nodes.map((n) => {
            const isStart = n.id === start, isGoal = n.id === goal, inPath = path.includes(n.id);
            const isCursor = n.id === cursor, isNext = status === "playing" && neighborSet.has(n.id) && !inPath;
            return (
              <g key={n.id} onClick={() => onNodeClick(n.id)} className="cursor-pointer group">
                <circle cx={n.x} cy={n.y} r="32" fill="transparent" />
                {isNext && <circle cx={n.x} cy={n.y} r="26" fill="transparent" stroke="#fbbf24" strokeWidth="2" strokeDasharray="4 4" className="animate-spin-slow" />}
                {isCursor && <circle cx={n.x} cy={n.y} r="26" fill="transparent" stroke="#fff" strokeWidth="2" className="animate-pulse" />}
                <circle 
                  cx={n.x} cy={n.y} r="20" 
                  fill={isStart ? "#4f46e5" : isGoal ? "#065f46" : inPath ? "#312e81" : "#1e293b"} 
                  stroke={isStart ? "#818cf8" : isGoal ? "#10b981" : inPath ? "#4f46e5" : "rgba(255,255,255,0.1)"} 
                  strokeWidth="2" 
                  className="transition-all duration-300 group-hover:scale-110" 
                />
                <text x={n.x} y={n.y - 28} textAnchor="middle" fill={isStart ? "#818cf8" : isGoal ? "#10b981" : "#94a3b8"} fontSize="10" fontWeight="black" className="uppercase tracking-tighter">
                  {isStart ? "Start" : isGoal ? "Goal" : ""}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Footer Controls */}
      <div className="mt-s4 space-y-s3 animate-in slide-in-from-bottom-2 duration-300">
        <div className="flex items-center justify-between gap-s3 p-s3 rounded-2xl bg-surface border border-border overflow-hidden">
          <div className="flex gap-2 overflow-x-auto no-scrollbar py-1 flex-1">
            {path.map((p, i) => (
              <div key={`${p}-${i}`} className="flex-none w-8 h-8 rounded-lg bg-bg2 border border-border flex items-center justify-center text-xs font-black text-indigo-200 shadow-sm">
                {p}
              </div>
            ))}
          </div>
          <Button variant="ghost" size="sm" onClick={undo} disabled={path.length <= 1 || status !== "playing"} className="h-8 px-3 uppercase text-[10px] font-bold opacity-60">Undo</Button>
        </div>

        {message && (
          <div className={cn(
            "p-s3 rounded-xl text-center font-bold text-sm animate-in fade-in zoom-in duration-200", 
            status === "won" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
          )}>
            {message}
          </div>
        )}

        <div className="flex gap-3">
          <Button variant="ghost" onClick={newGraph} disabled={status === "playing"} className="flex-1 h-14 uppercase tracking-widest text-xs opacity-70">New Graph</Button>
          <Button variant="primary" disabled={status !== "playing"} onClick={() => check(false)} className="flex-[2] h-14 rounded-2xl font-black text-xl shadow-xl">
            SUBMIT PATH
          </Button>
        </div>
      </div>

      {(status === "won" || status === "lost") && (
        <ResultSubmitPanel
          category="GRAPH_PATH" difficulty={difficulty} timeMs={timeMs} errors={errors}
          won={status === "won"} challengeId={challenge?.challengeInstanceId}
          explanation={status === "won" ? `Optimal path found! Total cost: ${currentWeight}.` : message || "The path is not optimal."}
        />
      )}

      <TutorialModal
        open={tutorialOpen} tutorial={tutorial}
        onConfirm={() => {
          try { localStorage.setItem(tutKey, "1"); } catch {}
          setTutorialOpen(false); setStarted(true); setStatus("playing"); startRef.current = Date.now();
        }}
      />
    </div>
  );
}