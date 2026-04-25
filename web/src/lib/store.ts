import { create } from "zustand";

export type ShotPhase = "idle" | "aiming" | "drawing" | "released" | "resolving";

interface GameState {
  currentRoomId: string | null;
  aimAngle: number;
  aimYaw: number;
  drawPower: number;
  phase: ShotPhase;
  setRoom: (id: string | null) => void;
  setAim: (angle: number, yaw?: number) => void;
  setPower: (power: number) => void;
  setPhase: (phase: ShotPhase) => void;
  reset: () => void;
}

export const useGameStore = create<GameState>((set) => ({
  currentRoomId: null,
  aimAngle: 0.7,
  aimYaw: 0,
  drawPower: 0,
  phase: "idle",
  setRoom: (id) => set({ currentRoomId: id }),
  setAim: (angle, yaw) =>
    set((state) => ({ aimAngle: angle, aimYaw: yaw ?? state.aimYaw })),
  setPower: (power) => set({ drawPower: Math.min(1, Math.max(0, power)) }),
  setPhase: (phase) => set({ phase }),
  reset: () =>
    set({ aimAngle: 0.7, aimYaw: 0, drawPower: 0, phase: "idle" }),
}));
