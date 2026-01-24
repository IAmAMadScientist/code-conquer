import React from "react";

import DiceRollOverlay from "./DiceRollOverlay";
import D20RollOverlay from "./D20RollOverlay";
import { getHapticsEnabled, getSoundEnabled, playDiceLandSfx, playDiceRollSfx } from "../../lib/diceSound";

const DiceOverlayContext = React.createContext(null);

/**
 * Global dice overlay host so the animation keeps running even if the dice button unmounts.
 *
 * API:
 *   const dice = useDiceOverlay();
 *   await dice.rollD6(() => rollTurnD6(...));
 *   await dice.rollD20(() => rollLobbyD20(...));
 */
export function DiceOverlayProvider({ children }) {
  const [d6Open, setD6Open] = React.useState(false);
  const [d6Value, setD6Value] = React.useState(null);

  const [d20Open, setD20Open] = React.useState(false);
  const [d20Value, setD20Value] = React.useState(null);

  const closeTimers = React.useRef([]);
  const sfxTimers = React.useRef([]);
  const rollStartMs = React.useRef({ d6: 0, d20: 0 });

  // In CSS, the overlay travel + cube settle are ~2400ms. The visual "touch down" reads best near the end.
  // Keep this in sync with dice.css: cc_overlay_travel (2400ms).
  // The visible "touch down" moment happens close to the end of the travel.
  const TOUCHDOWN_MS = 2050;

  React.useEffect(() => {
    return () => {
      closeTimers.current.forEach((t) => clearTimeout(t));
      closeTimers.current = [];
      sfxTimers.current.forEach((t) => clearTimeout(t));
      sfxTimers.current = [];
    };
  }, []);

  function schedule(fn, ms) {
    const t = setTimeout(fn, ms);
    closeTimers.current.push(t);
    return t;
  }

  function scheduleSfx(fn, ms) {
    const t = setTimeout(fn, ms);
    sfxTimers.current.push(t);
    return t;
  }

  function sfxRoll() {
    if (getSoundEnabled()) playDiceRollSfx();
  }

  function sfxLand() {
    if (getSoundEnabled()) playDiceLandSfx();
    // Optional haptics (mobile): short "impact" tap.
    if (getHapticsEnabled() && typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      try {
        navigator.vibrate([12, 18, 10]);
      } catch {
        // ignore
      }
    }
  }

  const api = React.useMemo(() => {
    return {
      async rollD6(getResult) {
        rollStartMs.current.d6 = Date.now();
        setD6Open(true);
        setD6Value(null);
        sfxRoll();

        let res;
        try {
          res = await getResult?.();
        } finally {
          // Even if request fails, keep visible briefly.
          const v = Number(res?.diceRoll);
          if (v >= 1 && v <= 6) setD6Value(v);
          // Match the land SFX to the visual "touch down" (after value becomes known).
          if (v >= 1 && v <= 6) {
            const elapsed = Date.now() - (rollStartMs.current.d6 || 0);
            const delay = Math.max(0, TOUCHDOWN_MS - elapsed);
            scheduleSfx(() => sfxLand(), delay);
          }
          // Keep the result visible for a couple of seconds after settling.
          schedule(() => setD6Open(false), v >= 1 && v <= 6 ? 3600 : 1100);
        }
        return res;
      },

      async rollD20(getResult) {
        rollStartMs.current.d20 = Date.now();
        setD20Open(true);
        setD20Value(null);
        sfxRoll();

        let res;
        try {
          res = await getResult?.();
        } finally {
          const v = Number(res?.roll);
          if (v >= 1 && v <= 20) setD20Value(v);
          if (v >= 1 && v <= 20) {
            const elapsed = Date.now() - (rollStartMs.current.d20 || 0);
            const delay = Math.max(0, TOUCHDOWN_MS - elapsed);
            scheduleSfx(() => sfxLand(), delay);
          }
          schedule(() => setD20Open(false), v >= 1 && v <= 20 ? 3700 : 1200);
        }
        return res;
      },
    };
  }, []);

  return (
    <DiceOverlayContext.Provider value={api}>
      {children}
      <DiceRollOverlay open={d6Open} value={d6Value} />
      <D20RollOverlay open={d20Open} value={d20Value} />
    </DiceOverlayContext.Provider>
  );
}

export function useDiceOverlay() {
  const ctx = React.useContext(DiceOverlayContext);
  if (!ctx) {
    throw new Error("useDiceOverlay must be used within <DiceOverlayProvider>");
  }
  return ctx;
}
