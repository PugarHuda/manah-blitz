import * as THREE from "three";
import { CameraManager } from "@/game/camera-manager";
import { GameManager } from "@/game/game-manager";
import { GestureSystem } from "@/game/gesture-system";
import { NetworkManager } from "@/game/network-manager";
import { RenderingLayer } from "@/game/rendering-layer";
import { SimulationLayer, type CollisionResult } from "@/game/simulation";
import type { Difficulty, GameState } from "@/game/types";

interface ArcheryGameOptions {
  canvas: HTMLCanvasElement;
  roomId: string;
  localPlayerId: string;
  difficulty: Difficulty;
  serverUrl: string;
  onState: (state: GameState) => void;
  onPower: (power: number) => void;
  onError?: (message: string) => void;
}

export class ArcheryGame {
  private rendering: RenderingLayer;

  private cameras: CameraManager;

  private simulation: SimulationLayer;

  private manager: GameManager;

  private gestures: GestureSystem;

  private network: NetworkManager;

  private localPlayerId: string;

  private roomId: string;

  private mounted = true;

  private lastTs = performance.now();

  private onState: (state: GameState) => void;

  private onPower: (power: number) => void;

  private onError?: (message: string) => void;

  constructor(options: ArcheryGameOptions) {
    this.localPlayerId = options.localPlayerId;
    this.roomId = options.roomId;
    this.onState = options.onState;
    this.onPower = options.onPower;
    this.onError = options.onError;

    this.manager = new GameManager();
    this.manager.dispatch({
      type: "INIT_MATCH",
      payload: {
        roomId: options.roomId,
        difficulty: options.difficulty,
        playerIds: [options.localPlayerId, "bot-1"],
      },
    });

    this.rendering = new RenderingLayer({
      canvas: options.canvas,
      difficulty: options.difficulty,
    });

    this.cameras = new CameraManager();

    this.rendering.setTargetPlacementListener((position) => {
      this.rendering.target.position.copy(position);
    });

    this.simulation = new SimulationLayer({
      scene: this.rendering.scene,
      target: this.rendering.target,
      getDifficulty: () => this.manager.getState().difficulty,
      onCollision: (result) => this.handleCollision(result),
    });

    this.gestures = new GestureSystem({
      element: options.canvas,
      camera: this.cameras.mainCamera,
      canShoot: () => this.canLocalPlayerShoot(),
      onShoot: (direction, power) => this.handleLocalShoot(direction, power),
    });

    this.network = new NetworkManager();
    this.network.connect(options.serverUrl);
    this.bindNetworkEvents();
    this.network.joinRoom({
      roomId: options.roomId,
      playerId: options.localPlayerId,
      difficulty: options.difficulty,
    });

    this.manager.subscribe((state) => {
      this.onState(state);
    });

    this.onState(this.manager.getState());

    window.addEventListener("resize", this.handleResize);
    this.rendering.renderer.setAnimationLoop(this.tick);
  }

  async enterAR(): Promise<void> {
    await this.rendering.enterARSession();
  }

  pause(): void {
    this.network.pause({ roomId: this.roomId, playerId: this.localPlayerId });
  }

  resume(): void {
    this.network.resume({ roomId: this.roomId, playerId: this.localPlayerId });
  }

  startGame(): void {
    this.network.startGame({ roomId: this.roomId, playerId: this.localPlayerId });
  }

  dispose(): void {
    this.mounted = false;
    this.rendering.renderer.setAnimationLoop(null);
    this.gestures.dispose();
    this.network.disconnect();
    window.removeEventListener("resize", this.handleResize);
  }

  private bindNetworkEvents(): void {
    this.network.on("room_state", ({ state }) => {
      this.manager.dispatch({ type: "SYNC_SERVER_STATE", payload: { state } });
    });

    this.network.on("timer_update", (payload) => {
      const snapshot = this.manager.getState();
      this.manager.dispatch({
        type: "SYNC_SERVER_STATE",
        payload: {
          state: {
            ...snapshot,
            timeLeft: payload.timeLeft,
            isPaused: payload.isPaused,
            pauseTimer: payload.pauseTimer,
          },
        },
      });
    });

    this.network.on("shoot_event", (payload) => {
      const direction = new THREE.Vector3(payload.direction.x, payload.direction.y, payload.direction.z);
      const origin = this.cameras.mainCamera.getWorldPosition(new THREE.Vector3());
      this.simulation.shootArrow({
        playerId: payload.playerId,
        direction,
        power: payload.power,
        origin,
      });
      this.manager.dispatch({ type: "SHOOT", payload });
      this.cameras.setReplayMode(true);
      this.manager.dispatch({ type: "START_REPLAY" });
    });

    this.network.on("error_event", ({ message }) => {
      this.onError?.(message);
    });
  }

  private canLocalPlayerShoot(): boolean {
    const state = this.manager.getState();
    const current = state.players[state.currentPlayerIndex];
    return (
      state.turnPhase === "aiming" &&
      !state.isPaused &&
      current?.id === this.localPlayerId
    );
  }

  private handleLocalShoot(direction: THREE.Vector3, power: number): void {
    this.onPower(power);
    const payload = {
      roomId: this.roomId,
      playerId: this.localPlayerId,
      direction: { x: direction.x, y: direction.y, z: direction.z },
      power,
    };
    this.network.sendShoot(payload);
  }

  private handleCollision(result: CollisionResult): void {
    void result;
    this.cameras.setReplayMode(true);

    setTimeout(() => {
      this.cameras.setReplayMode(false);
    }, 1200);
  }

  private handleResize = (): void => {
    this.rendering.onResize();
    this.cameras.onResize(window.innerWidth, window.innerHeight);
  };

  private tick = (_time: number, frame?: XRFrame): void => {
    if (!this.mounted) {
      return;
    }

    const now = performance.now();
    const delta = Math.min(0.05, (now - this.lastTs) / 1000);
    this.lastTs = now;

    this.manager.update(delta);
    this.simulation.update(delta);

    const replayArrow = this.simulation.getLastArrow();
    if (this.manager.getState().turnPhase === "replay" && replayArrow) {
      this.cameras.updateArrowFollow(replayArrow.mesh.position, delta);
    }

    this.rendering.updateXR(frame);
    this.rendering.render(this.cameras.camera);
    this.onPower(this.gestures.getPower());
  };
}
