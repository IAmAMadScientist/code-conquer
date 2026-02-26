import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { cn } from "../lib/utils";
import ResultSubmitPanel from "../components/ResultSubmitPanel";
import TutorialModal from "../components/TutorialModal";
import { getPlayer } from "../lib/player";
import { getTutorial, tutorialKey } from "../lib/tutorials";
import { DIFFICULTY } from "../lib/constants";

function vibrate(pattern) {
  try { if (navigator.vibrate) navigator.vibrate(pattern); } catch {}
}

function cfgFor(difficulty) {
  if (difficulty === DIFFICULTY.HARD) return { targetLen: 10, maxDigit: 15, queueCap: 6, removeCharges: 2, timeLimitSec: 45 };
  if (difficulty === DIFFICULTY.MEDIUM) return { targetLen: 8, maxDigit: 12, queueCap: 5, removeCharges: 2, timeLimitSec: 60 };
  return { targetLen: 6, maxDigit: 9, queueCap: 4, removeCharges: 1, timeLimitSec: 75 };
}

function mulberry32(a) {
  return function () {
    let t = (a += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function generatePuzzle({ targetLen, maxDigit }) {
  const seed = (Date.now() ^ (Math.random() * 0xffffffff)) >>> 0;
  const r = mulberry32(seed);
  const target = Array.from({ length: targetLen }, () => Math.floor(r() * (maxDigit + 1)));
  return { target, seed };
}

function incomingValue({ seed, maxDigit, target, idx, outIdx, queueLen, queueCap }) {
  const pr = mulberry32((seed ^ Math.imul(idx + 1, 0x9e3779b9)) >>> 0);
  const p = pr();
  const nearFull = queueLen >= Math.max(0, queueCap - 1);
  const biasFuture = nearFull ? 0.22 : 0.40;
  const biasNext = nearFull ? 0.14 : 0.22;
  if (target.length > 0 && p < biasFuture) {
    const look = 1 + Math.floor(pr() * Math.min(4, Math.max(1, target.length - outIdx)));
    return target[Math.min(target.length - 1, outIdx + look)];
  }
  if (target.length > 0 && p < biasFuture + biasNext) return target[Math.min(outIdx, target.length - 1)];
  if (target.length > 0 && pr() < 0.35) return target[Math.floor(pr() * target.length)];
  return Math.floor(pr() * (maxDigit + 1));
}

export default function QueueCommanderPage() {
  const loc = useLocation();
  const challenge = loc.state?.challenge;
  const difficulty = (challenge?.difficulty || DIFFICULTY.EASY).toUpperCase();
  const player = useMemo(() => getPlayer(), []);
  const tutorial = useMemo(() => getTutorial("QUEUE_COMMANDER"), []);
  const tutKey = useMemo(() => tutorialKey({ playerId: player?.playerId, category: "QUEUE_COMMANDER" }), [player?.playerId]);

  const [tutorialOpen, setTutorialOpen] = useState(() => {
    if (!challenge) return false;
    try { return localStorage.getItem(tutKey) !== "1"; } catch { return false; }
  });

  const [started, setStarted] = useState(() => !tutorialOpen);
  const cfg = useMemo(() => cfgFor(difficulty), [difficulty]);
  const startTsRef = useRef(performance.now());
  const endAtRef = useRef(performance.now() + cfg.timeLimitSec * 1000);

  const [{ target, seed }, setPuzzle] = useState(() => generatePuzzle(cfg));
  const [idx, setIdx] = useState(0);
  const [queue, setQueue] = useState([]);
  const [outIdx, setOutIdx] = useState(0);
  const [status, setStatus] = useState(() => (tutorialOpen ? "waiting" : "playing"));
  const [timeMs, setTimeMs] = useState(0);
  const [remainingMs, setRemainingMs] = useState(cfg.timeLimitSec * 1000);
  const [errors, setErrors] = useState(0);
  const [hint, setHint] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(-1);
  const [removeCharges, setRemoveCharges] = useState(cfg.removeCharges);

  useEffect(() => {
    const prevHtml = document.documentElement.style.overflow, prevBody = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden"; document.body.style.overflow = "hidden";
    return () => { document.documentElement.style.overflow = prevHtml; document.body.style.overflow = prevBody; };
  }, []);

  useEffect(() => {
    if (!started || status !== "playing") return;
    const id = window.setInterval(() => {
      const left = Math.max(0, Math.round(endAtRef.current - performance.now()));
      setRemainingMs(left);
      if (left <= 0) { setErrors(1); end("lost", "Time's up!"); }
    }, 150);
    return () => window.clearInterval(id);
  }, [started, status]);

  function end(nextStatus, msg = "") {
    setStatus(nextStatus);
    setTimeMs(Math.max(0, Math.round(performance.now() - startTsRef.current)));
    setHint(msg);
    vibrate(nextStatus === "won" ? [18, 30, 18] : [20, 45, 20]);
  }

  const incoming = status === "playing" ? incomingValue({ seed, maxDigit: cfg.maxDigit, target, idx, outIdx, queueLen: queue.length, queueCap: cfg.queueCap }) : null;
  const nextTarget = outIdx < target.length ? target[outIdx] : null;
  const canEnqueue = status === "playing" && queue.length < cfg.queueCap;
  const canDequeue = status === "playing" && queue.length > 0;
  const canRemove = status === "playing" && selectedIdx >= 0 && selectedIdx < queue.length && removeCharges > 0;
  const canRotate = status === "playing" && queue.length >= 2;

  const enqueue = () => { if (!canEnqueue) return; setQueue(q => [...q, incoming]); setIdx(v => v + 1); setHint(""); };
  const discard = () => { if (status !== "playing") return; setIdx(v => v + 1); setHint(""); };
  const dequeue = () => {
    if (!canDequeue) return;
    const front = queue[0];
    if (front !== nextTarget) { setErrors(1); end("lost", `Wrong output: expected ${nextTarget}, got ${front}`); return; }
    setQueue(q => q.slice(1)); setHint("");
    setOutIdx(prev => { const next = prev + 1; if (next >= target.length) end("won", "Perfect FIFO!"); return next; });
  };
  const removeSelected = () => { if (!canRemove) return; setQueue(q => q.filter((_, i) => i !== selectedIdx)); setRemoveCharges(c => c - 1); setSelectedIdx(-1); setHint("Removed from queue"); vibrate(12); };
  const rotateQueue = () => { if (!canRotate) return; setQueue(q => [...q.slice(1), q[0]]); setSelectedIdx(cur => cur === 0 ? q.length - 1 : (cur > 0 ? cur - 1 : -1)); setHint("Rotated queue"); vibrate(10); };

  const timeLeftS = Math.max(0, Math.ceil(remainingMs / 1000));
  const targetWindow = target.slice(outIdx, outIdx + 5);

  return (
    <div className="h-full flex flex-col bg-bg0 text-text overflow-hidden p-s3 sm:p-s4">
      {/* HUD */}
      <div className="flex justify-between items-center mb-s3 animate-in fade-in slide-in-from-top-2 duration-300">
        <div className="flex gap-2">
          <Badge variant="secondary" className="px-3 py-1 font-bold">⏱️ {timeLeftS}s</Badge>
          <Badge variant="outline" className="px-3 py-1 font-bold bg-indigo-500/10 border-indigo-500/30 text-indigo-200 uppercase tracking-tighter">FIFO Simulation</Badge>
        </div>
        <div className="flex gap-2">
          <Badge variant="secondary" className="px-3 py-1 font-bold">Target: {outIdx}/{target.length}</Badge>
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-4 min-h-0">
        {/* Stream & Target Display */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-bg1/40 rounded-2xl border border-border p-4 flex flex-col items-center gap-2 relative overflow-hidden group">
            <div className="text-[10px] uppercase font-black tracking-widest text-muted group-hover:text-indigo-400 transition-colors">Incoming</div>
            <div className="text-5xl font-black drop-shadow-2xl animate-in zoom-in duration-300 py-2">{incoming === null ? "—" : incoming}</div>
            <div className="text-[9px] font-bold text-muted/40">Sequence #{idx + 1}</div>
            <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500/20"><div className="h-full bg-indigo-500 w-1/3 animate-pulse" /></div>
          </div>

          <div className="bg-bg1/40 rounded-2xl border border-border p-4 flex flex-col gap-2 relative overflow-hidden">
            <div className="text-[10px] uppercase font-black tracking-widest text-muted text-center">Output Target</div>
            <div className="flex flex-wrap justify-center gap-1.5 py-1">
              {targetWindow.map((v, i) => (
                <div key={`${outIdx}-${i}`} className={cn("w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm border transition-all duration-500", i === 0 ? "bg-indigo-500 border-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.4)] scale-110 z-10" : "bg-bg2/50 border-border text-muted opacity-60")}>
                  {v}
                </div>
              ))}
              {targetWindow.length === 0 && <div className="text-xs font-bold text-emerald-400">DONE</div>}
            </div>
            <div className="text-[9px] font-bold text-muted/40 text-center uppercase tracking-tighter">Queue must emit these</div>
          </div>
        </div>

        {/* The Queue */}
        <div className="bg-surface rounded-2xl border border-border p-s3 flex flex-col gap-3 shadow-inner relative overflow-hidden">
          <div className="flex justify-between items-center px-1">
            <div className="text-[10px] uppercase font-black tracking-widest text-muted flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Memory Queue
            </div>
            <div className="text-[10px] font-black text-indigo-300">{queue.length}/{cfg.queueCap} slots</div>
          </div>
          
          <div className="flex gap-2 overflow-x-auto no-scrollbar min-h-[56px] py-1">
            {queue.length ? queue.map((v, i) => (
              <button key={i} onClick={() => setSelectedIdx(cur => cur === i ? -1 : i)} className={cn("flex-none w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg border transition-all active:scale-95", i === selectedIdx ? "bg-indigo-500 border-indigo-300 shadow-xl scale-105 z-10" : (i === 0 ? "bg-bg2 border-indigo-500/40 text-indigo-100" : "bg-bg2/40 border-border text-muted"))}>
                {v}
                {i === 0 && <div className="absolute -top-1 -right-1 bg-indigo-400 text-[8px] px-1 rounded-full text-bg0">FRONT</div>}
              </button>
            )) : <div className="w-full flex items-center justify-center text-xs text-muted/30 italic font-medium uppercase tracking-widest">Queue is empty</div>}
          </div>

          <div className="flex justify-between items-center pt-1 border-t border-white/5">
            <div className="text-[9px] font-bold text-muted/60 uppercase">Removes: {removeCharges}</div>
            {hint && <div className="text-[9px] font-black text-indigo-400 animate-pulse uppercase">{hint}</div>}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="mt-4 flex flex-col gap-3 animate-in slide-in-from-bottom-4 duration-500">
        <div className="grid grid-cols-3 gap-2">
          <Button onClick={enqueue} disabled={!canEnqueue} className="h-14 rounded-xl font-black">ENQUEUE</Button>
          <Button onClick={dequeue} variant="primary" disabled={!canDequeue} className="h-14 rounded-xl font-black bg-indigo-600 hover:bg-indigo-500 text-white border-b-4 border-indigo-800 active:border-b-0 active:translate-y-1 transition-all shadow-lg">DEQUEUE</Button>
          <Button onClick={discard} variant="secondary" className="h-14 rounded-xl font-black border-border">DISCARD</Button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button onClick={removeSelected} variant="danger" disabled={!canRemove} className="h-12 rounded-xl font-bold text-xs">REMOVE ({removeCharges})</Button>
          <Button onClick={rotateQueue} variant="outline" disabled={!canRotate} className="h-12 rounded-xl font-bold text-xs border-indigo-500/20 text-indigo-300">ROTATE QUEUE</Button>
        </div>
      </div>

      {(status === "won" || status === "lost") && (
        <ResultSubmitPanel
          category="QUEUE_COMMANDER" difficulty={difficulty} timeMs={timeMs} errors={errors}
          won={status === "won"} challengeId={challenge?.challengeInstanceId}
          explanation={status === "won" ? "Perfect FIFO synchronization!" : hint || "Incorrect queue output."}
        />
      )}

      <TutorialModal
        open={tutorialOpen} tutorial={tutorial}
        onConfirm={() => {
          try { localStorage.setItem(tutKey, "1"); } catch {}
          setTutorialOpen(false); setStarted(true); setStatus("playing");
          startTsRef.current = performance.now(); endAtRef.current = performance.now() + cfg.timeLimitSec * 1000;
        }}
      />
    </div>
  );
}