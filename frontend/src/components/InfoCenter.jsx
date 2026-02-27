import React, { useMemo, useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { TUTORIALS } from "../lib/tutorials";
import { cn } from "../lib/utils";

const GROUPS = [
  {
    label: "Game Rules",
    items: ["how", "qr"],
  },
  {
    label: "Minigames",
    items: ["STACK_MAZE", "GRAPH_PATH", "BST_INSERT", "QUEUE_COMMANDER", "BIT_JUMPER"],
  },
];

function InfoItem({ title, subtitle, icon, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center justify-between gap-3 p-4 rounded-xl bg-surface hover:bg-surface2 border border-border transition-all active:scale-[0.98] text-left group min-w-0"
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="h-10 w-10 shrink-0 rounded-full bg-indigo-500/10 flex items-center justify-center text-xl border border-indigo-500/20 group-hover:border-indigo-500/40 transition-colors">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-black text-text truncate uppercase tracking-tight">{title}</div>
          <div className="text-[11px] font-medium text-muted truncate opacity-80">{subtitle}</div>
        </div>
      </div>
      <div className="text-muted/30 text-lg font-bold ml-1 shrink-0 group-hover:text-indigo-400">›</div>
    </button>
  );
}

export default function InfoCenter() {
  const [active, setActive] = useState(null);

  const sections = useMemo(() => ({
    how: {
      title: "How to Play",
      icon: "🎲",
      subtitle: "Turns, dice, & basic rules",
      content: (
        <div className="space-y-4">
          <p className="text-sm font-medium text-muted leading-relaxed px-1 italic border-l-2 border-indigo-500/20 pl-4">
            Code & Conquer is a hybrid boardgame. The app handles dice, rules, and synchronization while you play on the board.
          </p>
          <Card className="bg-white/5">
            <CardContent className="space-y-4 p-5">
              <Rule label="Turn">Roll D6 → Move player → Resolve Event.</Rule>
              <Rule label="Fork">If paths split, you choose the direction.</Rule>
              <Rule label="Challenge">Landing on a Challenge field starts a minigame.</Rule>
              <Rule label="Special">Draw a physical card, then select it in the app.</Rule>
              <Rule label="Jail">Caught in security? Skip your next turn!</Rule>
            </CardContent>
          </Card>
        </div>
      ),
    },
    qr: {
      title: "Joining & QR",
      icon: "🔳",
      subtitle: "How to connect",
      content: (
        <div className="space-y-4">
          <Card className="bg-white/5">
            <CardContent className="space-y-4 p-5">
              <Rule label="Lobby">The host opens the Lobby and shows a QR code.</Rule>
              <Rule label="Scan">Players scan with their camera or enter the 6-letter code.</Rule>
              <Rule label="Trouble?">Use the direct link or type the code manually if scanning fails.</Rule>
            </CardContent>
          </Card>
        </div>
      ),
    },
  }), []);

  const activeSection = active ? (sections[active] || TUTORIALS[active]) : null;
  const isMinigame = active && TUTORIALS[active];

  if (activeSection) {
    return (
      <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-right-4 duration-300 p-5 w-full overflow-x-hidden">
        <div className="flex items-center gap-4 border-b border-white/5 pb-4 shrink-0">
          <Button variant="ghost" onClick={() => setActive(null)} className="h-9 w-9 p-0 rounded-full bg-surface border border-border shrink-0 hover:bg-indigo-500/10">
            ‹
          </Button>
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-2xl shrink-0">{activeSection.icon}</span>
            <span className="font-black text-lg truncate tracking-tight">{activeSection.title}</span>
          </div>
        </div>
        
        <div className="space-y-6 min-w-0 pb-4">
          {isMinigame ? (
            <>
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5 animate-in fade-in slide-in-from-left-4 duration-500">
                <div className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Objective
                </div>
                <div className="text-sm font-bold text-emerald-50/90 leading-snug">{activeSection.goal}</div>
              </div>

              <div className="space-y-4 px-1">
                <div className="text-[10px] font-black text-indigo-300 uppercase tracking-widest px-1">Field Protocol</div>
                <div className="space-y-3">
                  {activeSection.howTo.map((step, i) => (
                    <div key={i} className="flex gap-3 text-sm group">
                      <div className="flex-none w-5 h-5 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-[10px] font-black text-indigo-300">
                        {i + 1}
                      </div>
                      <div className="text-text/80 leading-snug flex-1">
                        <span className="font-black text-indigo-200 uppercase text-[11px] mr-1.5">{step.action}:</span> {step.detail}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-indigo-500/5 border border-indigo-500/10">
                <div className="text-[10px] font-black text-indigo-300 uppercase mb-2 flex items-center gap-2">
                  💡 Intelligence
                </div>
                <div className="text-xs font-medium text-indigo-100/70 leading-relaxed italic">
                  {activeSection.proTip}
                </div>
              </div>
            </>
          ) : (
            activeSection.content
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-left-4 duration-300 p-5 w-full overflow-x-hidden">
      {GROUPS.map((group) => (
        <div key={group.label} className="space-y-3 min-w-0">
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400/60 px-1">{group.label}</div>
          <div className="grid gap-2.5">
            {group.items.map((key) => {
              const s = sections[key] || TUTORIALS[key];
              if (!s) return null;
              return (
                <InfoItem
                  key={key}
                  title={s.title}
                  subtitle={s.summary || s.subtitle}
                  icon={s.icon}
                  onClick={() => setActive(key)}
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function Rule({ label, children }) {
  return (
    <div className="flex gap-3 items-start min-w-0">
      <div className="h-1.5 w-1.5 rounded-full bg-indigo-500 mt-2 shrink-0" />
      <div className="min-w-0 flex-1">
        <span className="font-black text-indigo-200 uppercase text-[10px] tracking-widest mr-1.5">{label}:</span>
        <span className="text-muted-foreground leading-relaxed text-[13px] font-medium">{children}</span>
      </div>
    </div>
  );
}
