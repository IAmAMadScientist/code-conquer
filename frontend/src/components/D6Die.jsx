import React, { useState } from "react";
import "./dice/dice.css";
import { useDiceOverlay } from "./dice/DiceOverlayProvider";
import { D6Icon } from "./icons/DiceIcons";

export default function D6Die({ value, onRoll, disabled }) {
  const [rolling, setRolling] = useState(false);
  const diceOverlay = useDiceOverlay();

  async function handleClick() {
    if (disabled || rolling) return;
    setRolling(true);
    try {
      await diceOverlay.rollD6(() => onRoll?.());
    } finally {
      setTimeout(() => setRolling(false), 980);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className={`cc-diceBtn ${rolling ? "animate-pulse" : ""} group`}
      aria-label="Roll D6"
    >
      <D6Icon 
        value={value} 
        className="w-16 h-16 transition-transform group-hover:scale-110 group-active:scale-95 duration-200" 
      />
    </button>
  );
}
