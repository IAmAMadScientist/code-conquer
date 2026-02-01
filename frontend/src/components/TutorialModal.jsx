import React from "react";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";

/**
 * Blocks the minigame until the player acknowledges the tutorial.
 * Intentionally no dismiss-without-confirm.
 */
export default function TutorialModal({ open, tutorial, onConfirm }) {
  const t = tutorial || {};

  return (
    <Dialog open={Boolean(open)}>
      <DialogContent
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        className="w-[min(92vw,720px)] max-h-[90dvh] flex flex-col p-0 overflow-hidden"
      >
        <div className="p-s5 border-b border-border bg-bg1/50">
          <DialogHeader>
            <DialogTitle>{t.title || "Tutorial"}</DialogTitle>
            {t.summary ? <DialogDescription className="leading-relaxed">{t.summary}</DialogDescription> : null}
          </DialogHeader>
        </div>

        <div className="flex-1 overflow-y-auto p-s5 space-y-s4">
          {Array.isArray(t.howTo) && t.howTo.length ? (
            <div>
              <div className="text-sm font-extrabold text-indigo-300 uppercase tracking-wider mb-2">How to play</div>
              <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed">
                {t.howTo.map((line, i) => (
                  <li key={i} className="text-text/90">{line}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {(t.win || t.lose) ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {t.win ? (
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                  <div className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-1">Goal</div>
                  <div className="text-sm text-text/90 leading-relaxed">{t.win}</div>
                </div>
              ) : null}
              {t.lose ? (
                <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4">
                  <div className="text-xs font-bold text-rose-400 uppercase tracking-widest mb-1">Avoid</div>
                  <div className="text-sm text-text/90 leading-relaxed">{t.lose}</div>
                </div>
              ) : null}
            </div>
          ) : null}

          {Array.isArray(t.tips) && t.tips.length ? (
            <div>
              <div className="text-sm font-extrabold text-indigo-300 uppercase tracking-wider mb-2">Pro Tips</div>
              <div className="flex flex-wrap gap-2">
                {t.tips.map((x, i) => (
                  <span key={i} className="rounded-lg border border-border bg-surface2 px-3 py-1.5 text-xs text-muted">
                    💡 {x}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="p-s5 border-t border-border bg-bg1/50 space-y-3">
          <Button variant="primary" onClick={onConfirm} className="w-full h-12 font-extrabold shadow-lg">
            Start minigame
          </Button>
          <div className="text-[10px] text-muted text-center italic">
            You will see this tutorial only once per minigame on this device.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
