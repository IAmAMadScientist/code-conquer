// Game Session Statuses
export const SESSION_STATUS = {
  LOBBY: "LOBBY",
  STARTED: "STARTED",
  FINISHED: "FINISHED",
};

// Turn Statuses
export const TURN_STATUS = {
  IDLE: "IDLE",
  AWAITING_D6_ROLL: "AWAITING_D6_ROLL",
  AWAITING_PATH_CHOICE: "AWAITING_PATH_CHOICE",
  AWAITING_SPECIAL_CARD: "AWAITING_SPECIAL_CARD",
  IN_CHALLENGE: "IN_CHALLENGE",
};

// Difficulties
export const DIFFICULTY = {
  EASY: "EASY",
  MEDIUM: "MEDIUM",
  HARD: "HARD",
};

// Field Types
export const FIELD_TYPE = {
  START: "START",
  EASY: "EASY",
  MEDIUM: "MEDIUM",
  HARD: "HARD",
  SPECIAL: "SPECIAL",
  FORK: "FORK",
};

// Special Cards
export const SPECIAL_CARD = {
  PERMISSION_DENIED: "PERMISSION_DENIED",
  RAGE_BAIT: "RAGE_BAIT",
  REFACTOR: "REFACTOR",
  SECOND_CHANCE: "SECOND_CHANCE",
  SHORTCUT_FOUND: "SHORTCUT_FOUND",
  ROLLBACK: "ROLLBACK",
  BOOST: "BOOST",
  JAIL: "JAIL",
};

// UI Strings / Messages
export const UI_STRINGS = {
  NOT_YOUR_TURN: "Not your turn",
  NOT_READY: "Not ready",
  ACTION_REQUIRED: "Action required",
  CHOOSE_TARGET: "Please choose a target player for this card.",
  CHOOSE_PATH_BOOST: "Please choose a path for Boost.",
  BOOST_FORK: "Boost hit a fork — please choose the path.",
  START_CHALLENGE_RESTRICTION: "You can only start a challenge on your turn after moving.",
  ROLL_RESTRICTION: "You can only roll when it's your turn and the game is waiting for the D6.",
  PATH_RESTRICTION: "You can only choose a path when it's your turn and a fork is active.",
  
  // Home Page
  MATCH_CREATED: "Match created",
  MATCH_JOINED: "Joined match",
  PROFILE_SAVED: "Profile saved",
  CREATE_MATCH_FAILED: "Failed to create match",
  JOIN_MATCH_FAILED: "Failed to join match",
  SAVE_PROFILE_FAILED: "Failed to save profile",
  QUICK_START: "Quick start",
  START_NEW_MATCH: "Start a new match",
  OR_JOIN_BY_CODE: "Or join by code",
  CREATE_PLAYER: "Create your player",
  PICK_EMOJI: "Pick an emoji",

  // Lobby Page
  LOBBY_LOAD_FAILED: "Failed to load lobby",
  SET_READY_FAILED: "Failed to set ready",
  ROLL_FAILED: "Failed to roll",
  LEAVE_LOBBY_TITLE: "Leave lobby?",
  LEAVE_LOBBY_MESSAGE: "Do you really want to leave?\n\nYou will leave this match and will have to pick your name and icon again when you join next time.",
  TURN_ORDER_LOCKED: "Turn order locked",
  ROLL_FOR_ORDER: "Roll for turn order, then ready up",

  // Minigames Shared
  PLAY_AGAIN: "Play again",
  EXECUTE: "EXECUTE",
  EXECUTING: "Executing…",
  CLEAR: "Clear",
  TIME_LEFT: "⏱️",
  STARS: "⭐",
  ENERGY: "⚡",
  CRASHES: "💥",
  COINS: "🪙",
  CMD_STACK: "📦",

  // Stack Maze
  MAZE_GOAL_REACHED: "You reached the goal tile.",
  MAZE_TIME_OUT: "You ran out of time before reaching the goal.",
  MAZE_ENERGY_OUT: "You ran out of energy (too many steps/crashes).",
  MAZE_OUT_OF_MOVES: "Your stack finished without reaching the goal.",
  MAZE_GENERIC_LOSS: "You did not reach the goal.",
  
  // Stack Drop
  DROP_TRAP: "TRAP",
  DROP_DESKTOP_HELP: "←/→ move · A/D/S push · SPACE execute · ESC clear",
};
