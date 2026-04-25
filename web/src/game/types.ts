export type GameMode = "menu" | "playingAR";

export type Difficulty = "easy" | "medium" | "hard";

export type TurnPhase = "aiming" | "shooting" | "impact" | "replay" | "done";

export type ArrowMotionState = "flying" | "stuck";

export interface DifficultyConfig {
  distance: number;
  gravity: number;
  hitRadius: number;
}

export interface PlayerState {
  id: string;
  totalScore: number;
  arrowsLeft: number;
  pausesLeft: number;
  turnScores: number[];
}

export interface GameState {
  mode: GameMode;
  difficulty: Difficulty;
  players: PlayerState[];
  currentPlayerIndex: number;
  turnPhase: TurnPhase;
  timeLeft: number;
  isPaused: boolean;
  pauseTimer: number;
  roomId: string;
  winnerId: string | null;
}

export interface ShootPayload {
  playerId: string;
  direction: { x: number; y: number; z: number };
  power: number;
}

export type GameAction =
  | { type: "INIT_MATCH"; payload: { roomId: string; difficulty: Difficulty; playerIds: string[] } }
  | { type: "START_TURN" }
  | { type: "SHOOT"; payload: ShootPayload }
  | { type: "HIT_TARGET"; payload: { playerId: string; score: number } }
  | { type: "HIT_GROUND"; payload: { playerId: string } }
  | { type: "START_REPLAY" }
  | { type: "END_REPLAY" }
  | { type: "END_TURN" }
  | { type: "NEXT_PLAYER" }
  | { type: "PAUSE"; payload: { playerId: string } }
  | { type: "RESUME" }
  | { type: "SYNC_SERVER_STATE"; payload: { state: GameState } };
