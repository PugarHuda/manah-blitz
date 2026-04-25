import { io, Socket } from "socket.io-client";
import type { Difficulty, GameState } from "@/game/types";

type ServerToClientEvents = {
  room_state: (payload: { state: GameState }) => void;
  timer_update: (payload: { timeLeft: number; isPaused: boolean; pauseTimer: number }) => void;
  shoot_event: (payload: {
    playerId: string;
    direction: { x: number; y: number; z: number };
    power: number;
  }) => void;
  error_event: (payload: { message: string }) => void;
};

type ClientToServerEvents = {
  join_room: (payload: { roomId: string; playerId: string; difficulty: Difficulty }) => void;
  start_game: (payload: { roomId: string; playerId: string }) => void;
  shoot: (payload: {
    roomId: string;
    playerId: string;
    direction: { x: number; y: number; z: number };
    power: number;
  }) => void;
  pause: (payload: { roomId: string; playerId: string }) => void;
  resume: (payload: { roomId: string; playerId: string }) => void;
};

export class NetworkManager {
  private socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;

  connect(url: string): void {
    if (this.socket) {
      return;
    }
    this.socket = io(url, {
      transports: ["websocket"],
    });
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }

  on<K extends keyof ServerToClientEvents>(event: K, listener: ServerToClientEvents[K]): void {
    (this.socket as unknown as { on: (evt: string, cb: unknown) => void } | null)?.on(
      String(event),
      listener
    );
  }

  off<K extends keyof ServerToClientEvents>(event: K, listener: ServerToClientEvents[K]): void {
    (this.socket as unknown as { off: (evt: string, cb: unknown) => void } | null)?.off(
      String(event),
      listener
    );
  }

  joinRoom(payload: { roomId: string; playerId: string; difficulty: Difficulty }): void {
    this.socket?.emit("join_room", payload);
  }

  startGame(payload: { roomId: string; playerId: string }): void {
    this.socket?.emit("start_game", payload);
  }

  sendShoot(payload: {
    roomId: string;
    playerId: string;
    direction: { x: number; y: number; z: number };
    power: number;
  }): void {
    this.socket?.emit("shoot", payload);
  }

  pause(payload: { roomId: string; playerId: string }): void {
    this.socket?.emit("pause", payload);
  }

  resume(payload: { roomId: string; playerId: string }): void {
    this.socket?.emit("resume", payload);
  }
}
