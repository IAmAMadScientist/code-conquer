import React from "react";
import "./dice/dice.css";
import { D20Icon } from "./icons/DiceIcons";

/**
 * Clean SVG D20 Icon button.
 */
export default function D20Die({ value, rolling = false, disabled = false, onClick }) {
  function handleClick() {
    if (disabled) return;
    onClick?.();
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="Roll D20"
      className={`cc-diceBtn ${rolling ? "animate-pulse" : ""} group`}
      disabled={disabled}
    >
      <D20Icon 
        value={value} 
        className="w-16 h-16 transition-transform group-hover:scale-110 group-active:scale-95 duration-200" 
      />
    </button>
  );
}
