import React from "react";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { cn } from "../lib/utils";

/**
 * Enhanced Mission Briefing Modal.
 * Displays minigame instructions with visual hierarchy and highlights.
 */
export default function TutorialModal({ open, tutorial, onConfirm, difficulty = "EASY" }) {
  const t = tutorial || {};
  const diff = String(difficulty).toUpperCase();
  const diffNote = t.difficultyNotes?.[diff];

  return (
    <Dialog open={Boolean(open)}>
      <DialogContent
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        className="w-[min(94vw,520px)] max-h-[92dvh] flex flex-col p-0 overflow-hidden border-indigo-500/20 bg-bg0 shadow-[0_0_50px_rgba(0,0,0,0.5)]"
      >
        {/* Header: Mission Title & Icon */}
        <div className="p-6 border-b border-white/5 bg-gradient-to-b from-indigo-500/10 to-transparent">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-3xl shadow-inner">
              {t.icon || "🕹️"}
            </div>
            <DialogHeader className="text-left">
              <div className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-1">Mission Briefing</div>
              <DialogTitle className="text-2xl font-black tracking-tight">{t.title || "Minigame"}</DialogTitle>
            </DialogHeader>
          </div>
        </div>

        {/* Content: Scrollable Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          
          {/* Summary */}
          {t.summary && (
            <p className="text-sm font-medium text-text/70 leading-relaxed italic border-l-2 border-indigo-500/30 pl-4">
              "{t.summary}"
            </p>
          )}

          {/* Goal Section */}
          {t.goal && (
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 animate-in fade-in slide-in-from-left-4 duration-500">
              <div className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Primary Objective
              </div>
              <div className="text-sm font-bold text-emerald-50/90 leading-tight">{t.goal}</div>
            </div>
          )}

          {/* How To Section */}
          {Array.isArray(t.howTo) && t.howTo.length > 0 && (
            <div className="space-y-3">
              <div className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">Protocol & Controls</div>
              <div className="space-y-2">
                {t.howTo.map((step, i) => (
                  <div key={i} className="flex gap-3 text-sm group">
                    <div className="flex-none w-5 h-5 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-[10px] font-black text-indigo-300 group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                      {i + 1}
                    </div>
                    <div className="text-text/80 leading-snug">
                      <span className="font-black text-indigo-200 uppercase text-[11px] mr-1.5">{step.action}:</span>
                      {step.detail}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Difficulty Note */}
          {diffNote && (
            <div className="p-3 rounded-xl bg-white/5 border border-white/5">
              <div className="text-[9px] font-bold text-muted uppercase tracking-tighter mb-1">Intelligence: {diff} Mode</div>
              <div className="text-xs text-muted/80 leading-relaxed">{diffNote}</div>
            </div>
          )}

          {/* Pro Tip */}
          {t.proTip && (
            <div className="flex items-start gap-3 p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10">
              <span className="text-xl">💡</span>
              <div className="space-y-1">
                <div className="text-[10px] font-black text-indigo-300 uppercase">Field Intel</div>
                <div className="text-xs font-medium text-indigo-100/70 leading-relaxed">{t.proTip}</div>
              </div>
            </div>
          )}
        </div>

        {/* Footer: Start Button */}
        <div className="p-6 border-t border-white/5 bg-bg1/30">
          <Button 
            variant="primary" 
            onClick={onConfirm} 
            className="w-full h-14 rounded-2xl font-black text-lg shadow-[0_10px_30px_rgba(99,102,241,0.3)] hover:shadow-[0_15px_40px_rgba(99,102,241,0.4)] transition-all active:scale-95"
          >
            INITIALIZE MISSION
          </Button>
          <div className="mt-4 text-[9px] text-muted/40 text-center uppercase tracking-widest font-bold">
            Instructions are stored in local memory bank
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}