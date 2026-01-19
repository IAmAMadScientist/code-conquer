// src/pages/GraphPathfinderPage.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import AppShell from "../components/AppShell";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Progress } from "../components/ui/progress";
import { Link, useLocation } from "react-router-dom";
import ResultSubmitPanel from "../components/ResultSubmitPanel";

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
function makeGraph() {
  const W = 600;
  const H = 400;
  const nodeCount = 9;

  // circle radius is 18; keep distance >= ~2R + margin
  const MIN_DIST = 58;
  const PADDING = 40;

  const nodes = generateNodesNoOverlap(nodeCount, W, H, PADDING, MIN_DIST);

  const { start, goal } = pickStartGoalFar(nodes, 280);

  const edges = [];
  const seen = new Set();

  function addEdge(u, v) {
    if (u === v) return false;
    const k = edgeKey(u, v);
    if (seen.has(k)) return false;
    seen.add(k);

    const w = clamp(Math.round(dist(nodes[u], nodes[v]) / 40), 1, 9);
    edges.push({ u, v, w });
    return true;
  }

  // connect each node to its 2 nearest neighbors
  for (let i = 0; i < nodeCount; i++) {
    const dists = [];
    for (let j = 0; j < nodeCount; j++) {
      if (i === j) continue;
      dists.push({ j, d: dist(nodes[i], nodes[j]) });
    }
    dists.sort((a, b) => a.d - b.d);
    addEdge(i, dists[0].j);
    addEdge(i, dists[1].j);
  }

  // union-find to ensure connected
  const parent = Array.from({ length: nodeCount }, (_, i) => i);
  const find = (x) => (parent[x] === x ? x : (parent[x] = find(parent[x])));
  const unite = (a, b) => {
    a = find(a);
    b = find(b);
    if (a !== b) parent[b] = a;
  };

  for (const e of edges) unite(e.u, e.v);

  function components() {
    const groups = new Map();
    for (let i = 0; i < nodeCount; i++) {
      const r = find(i);
      if (!groups.has(r)) groups.set(r, []);
      groups.get(r).push(i);
    }
    return [...groups.values()];
  }

  // connect closest pair across components until connected
  let guard = 0;
  while (components().length > 1 && guard < 200) {
    guard++;
    const comps = components();

    let best = null;
    for (let a = 0; a < comps.length; a++) {
      for (let b = a + 1; b < comps.length; b++) {
        for (const i of comps[a]) {
          for (const j of comps[b]) {
            const d = dist(nodes[i], nodes[j]);
            if (!best || d < best.d) best = { i, j, d };
          }
        }
      }
    }

    if (!best) break;
    addEdge(best.i, best.j);
    unite(best.i, best.j);
  }

  // Add extra edges for multiple routes (but keep readable)
  const extrasTarget = 5;
  let extras = 0;
  let tries = 0;
  while (extras < extrasTarget && tries < 2000) {
    tries++;
    const u = randInt(0, nodeCount - 1);
    const v = randInt(0, nodeCount - 1);
    if (u === v) continue;

    const d = dist(nodes[u], nodes[v]);
    if (d < 130 || d > 430) continue;

    if (addEdge(u, v)) extras++;
  }

  return { nodes, edges, start, goal };
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
  const difficulty = challenge?.difficulty || "EASY";

  const [seed, setSeed] = useState(0);

  const { nodes, edges, start, goal } = useMemo(() => makeGraph(), [seed]);
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
  const [status, setStatus] = useState("playing"); // playing | won | invalid
  const [message, setMessage] = useState("");

  // scoring helpers
  const startRef = useRef(Date.now());
  const [timeMs, setTimeMs] = useState(0);
  const [errors, setErrors] = useState(0);

  // IMPORTANT: when graph changes, start changes -> reset path
  useEffect(() => {
    startRef.current = Date.now();
    setTimeMs(0);
    setErrors(0);
    setPath([start]);
    setStatus("playing");
    setMessage("");
  }, [start]);

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
    setPath([start]);
    setStatus("playing");
    setMessage("");
  }

  function newGraph() {
    startRef.current = Date.now();
    setTimeMs(0);
    setErrors(0);
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
      setMessage("Not connected: you can only move along an edge.");
      return;
    }

    setMessage("");
    setPath((p) => p.concat(id));
  }

  function check() {
    if (!safeOptimal) {
      setErrors((e) => e + 1);
      setMessage("No path from START to GOAL in this graph. Click 'New graph'.");
      return;
    }

    const last = path[path.length - 1];
    if (last !== goal) {
      setErrors((e) => e + 1);
      setMessage("You must end on the Goal node.");
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

    setStatus("won");
    setMessage(
      w === safeOptimal
        ? `Perfect! Your cost = ${w}. Optimal = ${safeOptimal}.`
        : `Nice. Your cost = ${w}. Optimal = ${safeOptimal}.`
    );
  }

  const currentWeight = pathWeight(path);

  const closenessPct = useMemo(() => {
    if (!Number.isFinite(currentWeight) || !safeOptimal || safeOptimal <= 0) return 0;
    const r = currentWeight / safeOptimal;
    return clamp(Math.round(100 - (r - 1) * 80), 0, 100);
  }, [currentWeight, safeOptimal]);

  const pathEdges = useMemo(() => {
    const s = new Set();
    for (let i = 0; i < path.length - 1; i++) s.add(edgeKey(path[i], path[i + 1]));
    return s;
  }, [path]);

  return (
    <AppShell
      title="Code & Conquer"
      subtitle="Graph Pathfinder (Dijkstra) — build a route, beat the shortest path"
      headerBadges={
        <>
          <Badge>Category: GRAPH_PATH</Badge>
          <Badge>Diff: {difficulty}</Badge>
          <Badge>Errors: {errors}</Badge>
          <Badge>Optimal: {safeOptimal ?? "?"}</Badge>
          <Badge>Yours: {Number.isFinite(currentWeight) ? currentWeight : "-"}</Badge>
        </>
      }
      rightPanel={
        <div className="panel">
          <div style={{ fontSize: 16, fontWeight: 650 }}>How to play</div>
          <div className="muted" style={{ fontSize: 14, marginTop: 10 }}>
            Click nodes to build a path from <strong>Start</strong> to <strong>Goal</strong>.
            You may only move along edges.
            <br />
            <br />
            Press <strong>Check</strong> to compare your cost to the optimal shortest path (Dijkstra).
          </div>

          <div style={{ marginTop: 12 }}>
            <Link to="/categories">
              <Button variant="ghost">Back to categories</Button>
            </Link>
          </div>
        </div>
      }
    >
      <div style={{ display: "grid", gap: 12 }}>
        <div className="panel">
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ fontWeight: 650 }}>Build a path</div>
            <div className="muted" style={{ fontSize: 13 }}>
              Start = <span style={{ color: "rgba(129,140,248,0.95)" }}>blue</span>, Goal ={" "}
              <span style={{ color: "rgba(52,211,153,0.95)" }}>green</span>
            </div>
          </div>

          <div style={{ marginTop: 10 }}>
            <Progress value={closenessPct} />
            <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
              Closeness to optimal (rough): {closenessPct}%
            </div>
          </div>

          <div style={{ marginTop: 12, overflowX: "auto" }}>
            <svg width="600" height="400" style={{ display: "block" }}>
              {/* edges */}
              {edges.map((e) => {
                const a = nodes[e.u];
                const b = nodes[e.v];
                const k = edgeKey(e.u, e.v);
                const onUser = pathEdges.has(k);
                const onOptimal = status === "won" && optimalEdges.has(k);

                return (
                  <g key={k}>
                    <line
                      x1={a.x}
                      y1={a.y}
                      x2={b.x}
                      y2={b.y}
                      stroke={
                        onOptimal
                          ? "rgba(16,185,129,0.95)" // emerald shortest path
                          : onUser
                            ? "rgba(99,102,241,0.95)" // indigo user path
                            : "rgba(148,163,184,0.35)"
                      }
                      strokeWidth={onOptimal ? 5 : onUser ? 4 : 2}
                    />
                    <text
                      x={(a.x + b.x) / 2}
                      y={(a.y + b.y) / 2}
                      fill="rgba(226,232,240,0.85)"
                      fontSize="12"
                      fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
                    >
                      {e.w}
                    </text>
                  </g>
                );
              })}

              {/* nodes */}
              {nodes.map((n) => {
                const isStart = n.id === start;
                const isGoal = n.id === goal;
                const inPath = path.includes(n.id);

                const fill = isStart
                  ? "rgba(99,102,241,0.35)"
                  : isGoal
                    ? "rgba(16,185,129,0.28)"
                    : inPath
                      ? "rgba(245,158,11,0.18)"
                      : "rgba(15,23,42,0.35)";

                const stroke = isStart
                  ? "rgba(129,140,248,0.55)"
                  : isGoal
                    ? "rgba(52,211,153,0.55)"
                    : inPath
                      ? "rgba(252,211,77,0.45)"
                      : "rgba(51,65,85,0.5)";

                return (
                  <g key={n.id} onClick={() => onNodeClick(n.id)} style={{ cursor: "pointer" }}>
                    {/* bigger hit area */}
                    <circle cx={n.x} cy={n.y} r="28" fill="transparent" />
                    <circle cx={n.x} cy={n.y} r="18" fill={fill} stroke={stroke} strokeWidth="2" />
                    <text
                      x={n.x}
                      y={n.y + 4}
                      textAnchor="middle"
                      fill="rgba(248,250,252,0.95)"
                      fontSize="12"
                      fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
                    >
                      {n.id}
                    </text>

                    {isStart && (
                      <text x={n.x} y={n.y - 26} textAnchor="middle" fill="rgba(199,210,254,0.95)" fontSize="11">
                        START
                      </text>
                    )}
                    {isGoal && (
                      <text x={n.x} y={n.y - 26} textAnchor="middle" fill="rgba(167,243,208,0.95)" fontSize="11">
                        GOAL
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        <div className="panel">
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ fontWeight: 650 }}>Your path</div>
            <div className="muted" style={{ fontSize: 13 }}>
              Click a node already in your path to trim back to it.
            </div>
          </div>

          <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 8 }}>
            {path.map((p, i) => (
              <Badge key={`${p}-${i}`}>{p}</Badge>
            ))}
          </div>

          {message && (
            <div
              className="panel"
              style={{
                marginTop: 12,
                borderColor:
                  status === "invalid"
                    ? "rgba(251,113,133,0.35)"
                    : status === "won"
                      ? "rgba(52,211,153,0.35)"
                      : "rgba(129,140,248,0.35)",
              }}
            >
              {message}
            </div>
          )}

          {status === "won" && optimalPath.length > 0 && (
            <div className="panel" style={{ marginTop: 12, borderColor: "rgba(52,211,153,0.35)" }}>
              <div style={{ fontWeight: 650 }}>Shortest path (Dijkstra)</div>
              <div className="muted" style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 8 }}>
                {optimalPath.map((n, i) => (
                  <Badge key={`opt-${n}-${i}`} style={{ borderColor: "rgba(52,211,153,0.45)" }}>
                    {n}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 10 }}>
            <Button variant="primary" onClick={check}>
              Check
            </Button>
            <Button variant="secondary" onClick={undo} disabled={path.length <= 1 || status !== "playing"}>
              Undo
            </Button>
            <Button variant="ghost" onClick={resetSameGraph}>
              Reset path
            </Button>
            <Button variant="ghost" onClick={newGraph}>
              New graph
            </Button>
          </div>

          <div className="muted" style={{ fontSize: 12, marginTop: 10 }}>
            Skillcheck: shortest path isn’t “fewest edges” — it’s minimum total weight (Dijkstra).
          </div>

          {status === "won" && (
            <ResultSubmitPanel
              category="GRAPH_PATH"
              difficulty={difficulty}
              timeMs={timeMs}
              errors={errors}
              won={true}
              onPlayAgain={resetSameGraph}
          challengeId={challenge?.challengeInstanceId}
        />
          )}
        </div>
      </div>
    </AppShell>
  );
}
