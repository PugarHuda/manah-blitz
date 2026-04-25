import type { Address } from "viem";
import { manahAbi } from "./abi";

/**
 * Deployed Manah contract address on Monad testnet.
 * Pass via NEXT_PUBLIC_MANAH_ADDRESS once `forge script Deploy.s.sol` finishes.
 * Falls back to zero so dev can render UI without a deploy.
 */
export const manahAddress = (process.env.NEXT_PUBLIC_MANAH_ADDRESS ??
  "0x0000000000000000000000000000000000000000") as Address;

export const manahDeployed =
  manahAddress !== "0x0000000000000000000000000000000000000000";

export { manahAbi };

/* ------------------------------------------------------------------------- */
/* Encoding helpers — match Manah.sol units exactly.                         */
/* ------------------------------------------------------------------------- */

/** Convert UI angle in radians (0..π/2) to centidegrees [0, 9000]. */
export function angleRadToCentideg(rad: number): bigint {
  const clamped = Math.max(0, Math.min(Math.PI / 2, rad));
  const centideg = Math.round((clamped * 18000) / Math.PI);
  return BigInt(Math.max(0, Math.min(9000, centideg)));
}

/** Convert UI draw 0..1 to power basis points [1, 10000]. */
export function powerToBp(power: number): bigint {
  const clamped = Math.max(0.0001, Math.min(1, power));
  return BigInt(Math.max(1, Math.min(10000, Math.round(clamped * 10000))));
}

/* ------------------------------------------------------------------------- */
/* Constants mirrored from the contract — keep in sync if edited there.      */
/* ------------------------------------------------------------------------- */

export const MANAH = {
  TICKS_PER_SHOT: 50,
  ARROWS_PER_PLAYER: 3,
  MIN_PLAYERS: 2,
  MAX_PLAYERS: 8,
  TURN_TIMEOUT_S: 90,
  GAME_FORFEIT_AFTER_S: 600,
  MAX_POINTS: 100,
  TARGET_X_MM: 30_000,
  TARGET_RADIUS_MM: 600,
  BULLSEYE_LOCK_MM: 50,
} as const;

/** Match the on-chain `RoomStatus` enum order. */
export enum RoomStatus {
  None = 0,
  Waiting = 1,
  Active = 2,
  Settled = 3,
}
