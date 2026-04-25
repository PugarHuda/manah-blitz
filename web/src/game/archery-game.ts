import * as THREE from "three";
import { BowSystem } from "@/game/bow-system";
import { CameraManager } from "@/game/camera-manager";
import { GameManager } from "@/game/game-manager";
import { GestureSystem } from "@/game/gesture-system";
import { NetworkManager } from "@/game/network-manager";
import { RenderingLayer } from "@/game/rendering-layer";
import { SimulationLayer, type CollisionResult } from "@/game/simulation";
import { scoreShot } from "@/lib/physics";
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

  private bow: BowSystem;

  private simulation: SimulationLayer;

  private manager: GameManager;

  private gestures: GestureSystem;

  private network: NetworkManager;

  private localPlayerId: string;

  private roomId: string;

  /** True when running without a Socket.IO server — drives state from local sim. */
  private offline: boolean;

  /** Tracks whether we already auto-fired a timeout shot for the current turn. */
  private autoFiredThisTurn = false;

  /** Last seen turnPhase — used to detect transitions for the auto-fire trigger. */
  private prevPhase: string = "aiming";
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
    this.offline = options.serverUrl === "offline"; 

    this.manager = new GameManager();
    // Offline: solo. Multiplayer: server overrides with full player list via
    // SYNC_SERVER_STATE on the first room_state event.
    this.manager.dispatch({
      type: "INIT_MATCH",
      payload: {
        roomId: options.roomId,
        difficulty: options.difficulty,
        playerIds: [options.localPlayerId],
      },
    });

    this.rendering = new RenderingLayer({
      canvas: options.canvas,
      difficulty: options.difficulty,
    });

    this.cameras = new CameraManager();

    // Look at the target so the scene is framed correctly on first paint.
    this.cameras.mainCamera.lookAt(this.rendering.target.position);

    // First-person bow visualizer — follows the camera, draws back with power,
    // snaps forward on release.
    this.bow = new BowSystem(this.cameras.mainCamera);
    this.rendering.scene.add(this.bow.group);

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
    this.bow.dispose();
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
      
      const playerColors: Record<string, string> = {
        [this.localPlayerId]: "#ff4444", // Red
        "bot-1": "#44ff44", // Green
      };

      this.simulation.shootArrow({
        playerId: payload.playerId,
        direction,
        power: payload.power,
        origin,
        color: playerColors[payload.playerId] || "#ffffff",
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

    if (this.offline) {
      // Optimistic local play: dispatch + simulate without server roundtrip.
      this.manager.dispatch({
        type: "SHOOT",
        payload: { playerId: this.localPlayerId, direction: payload.direction, power },
      });
      const origin = this.cameras.mainCamera.getWorldPosition(new THREE.Vector3());
      this.simulation.shootArrow({
        playerId: this.localPlayerId,
        direction,
        power,
        origin,
      });
      this.cameras.setReplayMode(true);
      return;
    }

    this.network.sendShoot(payload);
  }

  private handleCollision(result: CollisionResult): void {
    if (result.kind === "target" && result.radialDistance !== undefined) {
      // radialDistance is in meters in 3D scene, convert to mm for scoreShot
      const score = scoreShot(result.radialDistance * 1000);
      this.manager.dispatch({
        type: "HIT_TARGET",
        payload: { playerId: result.playerId, score },
      });
    } else if (result.kind === "ground") {
      this.manager.dispatch({
        type: "HIT_GROUND",
        payload: { playerId: result.playerId },
      });
    }

    // Keep showing the hit for a moment before switching back to main camera.
    this.cameras.setReplayMode(true);
    setTimeout(() => {
      if (this.mounted) {
        this.cameras.setReplayMode(false);
      }
    }, 1500);
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

    const state = this.manager.getState();

    // Detect phase change: aiming → shooting via timer expiry. Auto-fire a
    // default shot so the FSM keeps advancing instead of stalling at "shooting"
    // with no arrow in flight.
    if (
      this.offline &&
      this.prevPhase === "aiming" &&
      state.turnPhase === "shooting" &&
      !this.autoFiredThisTurn
    ) {
      this.autoFireForTimeout();
    }
    if (state.turnPhase === "aiming") {
      this.autoFiredThisTurn = false;
    }
    this.prevPhase = state.turnPhase;

    const replayArrow = this.simulation.getLastArrow();
    if (state.turnPhase === "replay" && replayArrow) {
      this.cameras.updateArrowFollow(
        replayArrow.mesh.position,
        replayArrow.meta.velocity,
        delta,
      );
    }

    // Drive the bow's draw amount from the gesture system while the player is
    // aiming. While the arrow is in flight, drawAmount is 0 (no arrow nocked).
    const power = this.gestures.getPower();
    if (state.turnPhase === "aiming" && this.canLocalPlayerShoot()) {
      this.bow.setDrawAmount(power);
    } else {
      this.bow.setDrawAmount(0);
    }
    this.bow.update(delta);

    this.rendering.updateXR(frame);
    this.rendering.render(this.cameras.camera);
    this.onPower(power);
  };

  /** Fire a "best effort" arrow when the player's 30s aim clock expires. */
  private autoFireForTimeout(): void {
    this.autoFiredThisTurn = true;
    const currentPlayer =
      this.manager.getState().players[this.manager.getState().currentPlayerIndex];
    if (!currentPlayer) return;

    // Use the camera's current forward vector with a slight upward bias so the
    // arrow has a chance to actually reach the target instead of dropping.
    const direction = new THREE.Vector3();
    this.cameras.mainCamera.getWorldDirection(direction);
    direction.y += 0.18;
    direction.normalize();

    const power = 0.55;
    const origin = this.cameras.mainCamera.getWorldPosition(new THREE.Vector3());

    this.manager.dispatch({
      type: "SHOOT",
      payload: {
        playerId: currentPlayer.id,
        direction: { x: direction.x, y: direction.y, z: direction.z },
        power,
      },
    });
    this.simulation.shootArrow({
      playerId: currentPlayer.id,
      direction,
      power,
      origin,
    });
    this.cameras.setReplayMode(true);
  }
}
