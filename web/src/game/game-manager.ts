import {
  createInitialGameState,
  MAX_PLAYERS,
  MIN_PLAYERS,
  PAUSE_TIME_SECONDS,
  TURN_TIME_SECONDS,
} from "@/game/constants";
import type { GameAction, GameState, PlayerState } from "@/game/types";

type Listener = (state: GameState) => void;

export class GameManager {
  private state: GameState = createInitialGameState();

  private listeners = new Set<Listener>();

  getState(): GameState {
    return this.state;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  dispatch(action: GameAction): boolean {
    const next = this.reduce(this.state, action);
    if (!next) {
      return false;
    }
    this.state = next;
    this.listeners.forEach((listener) => listener(this.state));
    return true;
  }

  update(delta: number): void {
    if (this.state.turnPhase === "done") {
      return;
    }

    if (this.state.isPaused) {
      const pauseTimer = Math.max(0, this.state.pauseTimer - delta);
      this.state = {
        ...this.state,
        pauseTimer,
      };
      if (pauseTimer <= 0) {
        this.dispatch({ type: "RESUME" });
      }
      this.listeners.forEach((listener) => listener(this.state));
      return;
    }

    if (this.state.turnPhase === "aiming") {
      const timeLeft = Math.max(0, this.state.timeLeft - delta);
      this.state = {
        ...this.state,
        timeLeft,
      };
      if (timeLeft <= 0) {
        this.state = {
          ...this.state,
          turnPhase: "shooting",
        };
      }
      this.listeners.forEach((listener) => listener(this.state));
    }
  }

  private reduce(state: GameState, action: GameAction): GameState | null {
    switch (action.type) {
      case "INIT_MATCH": {
        const { playerIds, roomId, difficulty } = action.payload;
        if (playerIds.length < MIN_PLAYERS || playerIds.length > MAX_PLAYERS) {
          return null;
        }
        const players: PlayerState[] = playerIds.map((id) => ({
          id,
          totalScore: 0,
          arrowsLeft: 3,
          pausesLeft: 2,
          turnScores: [],
        }));

        return {
          ...createInitialGameState(),
          roomId,
          mode: "playingAR",
          difficulty,
          players,
          turnPhase: "aiming",
          timeLeft: TURN_TIME_SECONDS,
        };
      }

      case "START_TURN": {
        if (state.turnPhase === "done") {
          return null;
        }
        return {
          ...state,
          turnPhase: "aiming",
          timeLeft: TURN_TIME_SECONDS,
          isPaused: false,
          pauseTimer: 0,
        };
      }

      case "SHOOT": {
        if (state.turnPhase !== "aiming" || state.isPaused) {
          return null;
        }
        const current = state.players[state.currentPlayerIndex];
        if (!current || current.id !== action.payload.playerId || current.arrowsLeft <= 0) {
          return null;
        }

        const players = state.players.map((player, index) =>
          index === state.currentPlayerIndex
            ? { ...player, arrowsLeft: Math.max(0, player.arrowsLeft - 1) }
            : player
        );

        return {
          ...state,
          players,
          turnPhase: "shooting",
        };
      }

      case "HIT_TARGET": {
        if (state.turnPhase !== "shooting") {
          return null;
        }
        const players = state.players.map((player) => {
          if (player.id !== action.payload.playerId) {
            return player;
          }
          return {
            ...player,
            totalScore: player.totalScore + action.payload.score,
            turnScores: [...player.turnScores, action.payload.score],
          };
        });
        return {
          ...state,
          players,
          turnPhase: "impact",
        };
      }

      case "HIT_GROUND": {
        if (state.turnPhase !== "shooting") {
          return null;
        }
        return {
          ...state,
          turnPhase: "impact",
        };
      }

      case "START_REPLAY": {
        if (state.turnPhase !== "impact") {
          return null;
        }
        return {
          ...state,
          turnPhase: "replay",
        };
      }

      case "END_TURN": {
        if (state.turnPhase !== "replay") {
          return null;
        }
        return {
          ...state,
          turnPhase: "done",
        };
      }

      case "NEXT_PLAYER": {
        if (state.players.length === 0) {
          return null;
        }
        const nextIndex = (state.currentPlayerIndex + 1) % state.players.length;
        const currentArrowsEmpty = state.players.every((player) => player.arrowsLeft === 0);
        if (currentArrowsEmpty) {
          const sorted = [...state.players].sort((a, b) => b.totalScore - a.totalScore);
          return {
            ...state,
            currentPlayerIndex: nextIndex,
            turnPhase: "done",
            winnerId: sorted[0]?.id ?? null,
          };
        }
        return {
          ...state,
          currentPlayerIndex: nextIndex,
          turnPhase: "aiming",
          timeLeft: TURN_TIME_SECONDS,
        };
      }

      case "PAUSE": {
        if (state.turnPhase !== "aiming" || state.isPaused) {
          return null;
        }
        const current = state.players[state.currentPlayerIndex];
        if (!current || current.id !== action.payload.playerId || current.pausesLeft <= 0) {
          return null;
        }
        const players = state.players.map((player, index) =>
          index === state.currentPlayerIndex
            ? { ...player, pausesLeft: Math.max(0, player.pausesLeft - 1) }
            : player
        );
        return {
          ...state,
          players,
          isPaused: true,
          pauseTimer: PAUSE_TIME_SECONDS,
        };
      }

      case "RESUME": {
        if (!state.isPaused) {
          return null;
        }
        return {
          ...state,
          isPaused: false,
          pauseTimer: 0,
        };
      }

      case "SYNC_SERVER_STATE": {
        return action.payload.state;
      }

      default:
        return null;
    }
  }
}
