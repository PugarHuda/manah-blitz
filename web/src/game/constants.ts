import type { Difficulty, DifficultyConfig, GameState } from "@/game/types";

export const TURN_TIME_SECONDS = 30;
export const PAUSE_TIME_SECONDS = 30;
export const MAX_PLAYERS = 4;
export const MIN_PLAYERS = 2;

export const DIFFICULTY_CONFIG: Record<Difficulty, DifficultyConfig> = {
  easy: {
    distance: 3,
    gravity: 8,
    hitRadius: 0.7,
  },
  medium: {
    distance: 5,
    gravity: 9.8,
    hitRadius: 0.6,
  },
  hard: {
    distance: 8,
    gravity: 11,
    hitRadius: 0.5,
  },
};

export function createInitialGameState(): GameState {
  return {
    mode: "menu",
    difficulty: "medium",
    players: [],
    currentPlayerIndex: 0,
    turnPhase: "aiming",
    timeLeft: TURN_TIME_SECONDS,
    isPaused: false,
    pauseTimer: 0,
    roomId: "",
    winnerId: null,
  };
}
