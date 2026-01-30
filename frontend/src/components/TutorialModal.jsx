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
        className="w-[min(92vw,720px)]"
      >
        <DialogHeader>
          <DialogTitle>{t.title || "Tutorial"}</DialogTitle>
          {t.summary ? <DialogDescription className="leading-relaxed">{t.summary}</DialogDescription> : null}
        </DialogHeader>

        {Array.isArray(t.howTo) && t.howTo.length ? (
          <div className="mt-s4">
            <div className="text-sm font-extrabold">How to play</div>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed">
              {t.howTo.map((line, i) => (
                <li key={i} className="text-text/90">{line}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {(t.win || t.lose) ? (
          <div className="mt-s4 grid gap-3 sm:grid-cols-2">
            {t.win ? (
              <div className="rounded-lg border border-border bg-surface2 p-s4">
                <div className="text-sm font-extrabold">Win</div>
                <div className="mt-1 text-sm text-muted leading-relaxed">{t.win}</div>
              </div>
            ) : null}
            {t.lose ? (
              <div className="rounded-lg border border-border bg-surface2 p-s4">
                <div className="text-sm font-extrabold">Lose</div>
                <div className="mt-1 text-sm text-muted leading-relaxed">{t.lose}</div>
              </div>
            ) : null}
          </div>
        ) : null}

        {Array.isArray(t.tips) && t.tips.length ? (
          <div className="mt-s4">
            <div className="text-sm font-extrabold">Tips</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {t.tips.map((x, i) => (
                <span key={i} className="rounded-full border border-border bg-surface2 px-3 py-1 text-xs text-muted">
                  {x}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="primary" onClick={onConfirm} className="h-12 font-extrabold">
            Start minigame
          </Button>
        </DialogFooter>

        <div className="mt-s2 text-xs text-muted">
          You will see this tutorial only once per minigame on this device.
        </div>
      </DialogContent>
    </Dialog>
  );
}
