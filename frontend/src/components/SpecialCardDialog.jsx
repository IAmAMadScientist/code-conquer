import React from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Button } from "./ui/button";
import { SPECIAL_CARD } from "../lib/constants";

/**
 * Special Card Selection Dialog.
 * Extracted from Play.jsx for modularity.
 */
export default function SpecialCardDialog({
  open,
  onOpenChange,
  isMyTurn,
  specialCard,
  setSpecialCard,
  specialTarget,
  setSpecialTarget,
  specialSubmitting,
  onApply,
  players,
  meId
}) {
  const SPECIAL_CARDS_DEFS = [
    { id: SPECIAL_CARD.PERMISSION_DENIED, label: "Permission denied", img: "/specialcards/permission_denied.png", needsTarget: true },
    { id: SPECIAL_CARD.RAGE_BAIT, label: "Rage Bait", img: "/specialcards/rage_bait.png", needsTarget: true },
    { id: SPECIAL_CARD.REFACTOR, label: "Refactor", img: "/specialcards/refactor.png", needsTarget: false },
    { id: SPECIAL_CARD.SECOND_CHANCE, label: "Second Chance", img: "/specialcards/second_chance.png", needsTarget: false },
    { id: SPECIAL_CARD.SHORTCUT_FOUND, label: "Shortcut found", img: "/specialcards/shortcut_found.png", needsTarget: false },
    { id: SPECIAL_CARD.ROLLBACK, label: "Rollback", img: "/specialcards/rollback.png", needsTarget: true },
    { id: SPECIAL_CARD.BOOST, label: "Boost", img: "/specialcards/boost.png", needsTarget: false },
    { id: SPECIAL_CARD.JAIL, label: "JAIL", img: "/specialcards/jail.png", needsTarget: false },
  ];

  const currentCardDef = SPECIAL_CARDS_DEFS.find(c => c.id === specialCard);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        onPointerDownOutside={e => e.preventDefault()} 
        onEscapeKeyDown={e => e.preventDefault()} 
        className="w-[min(94vw,500px)] border-indigo-500/20 bg-bg0 p-0 overflow-hidden"
      >
        <div className="p-6 bg-indigo-500/10 border-b border-white/5 text-center">
          <DialogTitle className="text-2xl font-black uppercase tracking-tight text-white">Special Field</DialogTitle>
          <DialogDescription className="text-[10px] font-bold text-indigo-300/60 uppercase mt-1 tracking-widest">Select your physical card below</DialogDescription>
        </div>
        <div className="p-6 space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="text-[10px] font-black text-muted uppercase tracking-widest px-1">Selected Card</div>
              <Select value={specialCard} onValueChange={setSpecialCard} disabled={!isMyTurn}>
                <SelectTrigger className="h-12 rounded-xl font-bold bg-white/5 border-white/10">
                  <SelectValue placeholder="Select card..." />
                </SelectTrigger>
                <SelectContent>
                  {SPECIAL_CARDS_DEFS.map(c => <SelectItem key={c.id} value={c.id} className="font-bold">{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {currentCardDef?.img && (
              <div className="flex justify-center p-2 rounded-2xl bg-white/5 border border-white/5">
                <img src={currentCardDef.img} alt="Card Preview" className="h-48 w-auto object-contain drop-shadow-2xl animate-in zoom-in duration-300" />
              </div>
            )}

            {currentCardDef?.needsTarget && (
              <div className="space-y-2">
                <div className="text-[10px] font-black text-muted uppercase tracking-widest px-1">Target Selection</div>
                <Select value={specialTarget} onValueChange={setSpecialTarget} disabled={!isMyTurn}>
                  <SelectTrigger className="h-12 rounded-xl font-bold bg-white/5 border-white/10">
                    <SelectValue placeholder="Target player..." />
                  </SelectTrigger>
                  <SelectContent>
                    {players.filter(p => p.id !== meId).map(p => <SelectItem key={p.id} value={p.id}>{p.icon} {p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <Button 
            onClick={onApply} 
            disabled={!isMyTurn || specialSubmitting} 
            className="w-full h-14 rounded-2xl font-black text-lg shadow-xl active:scale-95 transition-all uppercase tracking-widest"
          >
            {specialSubmitting ? "Activating..." : "Activate Ability"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
