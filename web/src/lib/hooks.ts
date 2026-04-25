"use client";

import {
  useReadContract,
  useReadContracts,
  useWriteContract,
  useWaitForTransactionReceipt,
  useAccount,
} from "wagmi";
import type { Address, Hash } from "viem";
import { manahAddress, manahAbi, manahDeployed, RoomStatus } from "./manah";

/* ------------------------------------------------------------------------- */
/* Reads                                                                      */
/* ------------------------------------------------------------------------- */

export function useRoom(roomId: bigint | undefined) {
  return useReadContract({
    address: manahAddress,
    abi: manahAbi,
    functionName: "getRoom",
    args: roomId !== undefined ? [roomId] : undefined,
    query: {
      enabled: manahDeployed && roomId !== undefined,
      refetchInterval: 4000, // pre-Envio: poll until indexer subscriptions land
    },
  });
}

export function usePlayer(roomId: bigint | undefined, player: Address | undefined) {
  return useReadContract({
    address: manahAddress,
    abi: manahAbi,
    functionName: "getPlayer",
    args: roomId !== undefined && player ? [roomId, player] : undefined,
    query: {
      enabled: manahDeployed && roomId !== undefined && Boolean(player),
      refetchInterval: 4000,
    },
  });
}

export function usePot(roomId: bigint | undefined) {
  return useReadContract({
    address: manahAddress,
    abi: manahAbi,
    functionName: "pot",
    args: roomId !== undefined ? [roomId] : undefined,
    query: { enabled: manahDeployed && roomId !== undefined },
  });
}

/**
 * Real-time leaderboard for a room: one multicall returns every player's
 * (joined, arrowsUsed, score, lastActionAt) tuple. Refetches every 2s so the
 * UI stays in lockstep with TickComputed/ArrowLanded events without an
 * indexer.
 */
export interface LeaderboardEntry {
  address: Address;
  arrowsUsed: number;
  score: number;
  lastActionAt: bigint;
}

export function useLeaderboard(
  roomId: bigint | undefined,
  players: readonly Address[],
) {
  const enabled =
    manahDeployed && roomId !== undefined && players.length > 0;

  const { data, isLoading, refetch } = useReadContracts({
    contracts: enabled
      ? players.map((p) => ({
          address: manahAddress,
          abi: manahAbi,
          functionName: "getPlayer" as const,
          args: [roomId, p] as const,
        }))
      : [],
    query: {
      enabled,
      refetchInterval: 2000,
    },
  });

  const entries: LeaderboardEntry[] = enabled
    ? players.map((address, i) => {
        const result = data?.[i]?.result as
          | readonly [boolean, number, number, bigint]
          | undefined;
        return {
          address,
          arrowsUsed: result ? Number(result[1]) : 0,
          score: result ? Number(result[2]) : 0,
          lastActionAt: result ? result[3] : 0n,
        };
      })
    : [];

  return { entries, isLoading, refetch };
}

/* ------------------------------------------------------------------------- */
/* Writes — return both `hash` and `receipt` so UI can choose which to await */
/* ------------------------------------------------------------------------- */

interface WriteState {
  hash: Hash | undefined;
  isPending: boolean;
  isConfirming: boolean;
  isSuccess: boolean;
  error: Error | null;
  reset: () => void;
}

function makeWriteState(
  hash: Hash | undefined,
  isPending: boolean,
  isConfirming: boolean,
  isSuccess: boolean,
  error: Error | null,
  reset: () => void
): WriteState {
  return { hash, isPending, isConfirming, isSuccess, error, reset };
}

export function useCreateRoom() {
  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  function createRoom(maxPlayers: number, stakeWei: bigint) {
    if (!manahDeployed) {
      console.warn("[manah] contract not deployed — skipping createRoom");
      return;
    }
    writeContract({
      address: manahAddress,
      abi: manahAbi,
      functionName: "createRoom",
      args: [maxPlayers, stakeWei],
      value: stakeWei,
    });
  }

  return {
    createRoom,
    ...makeWriteState(hash, isPending, isConfirming, isSuccess, error, reset),
  };
}

export function useJoinRoom() {
  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  function joinRoom(roomId: bigint, stakeWei: bigint) {
    if (!manahDeployed) return;
    writeContract({
      address: manahAddress,
      abi: manahAbi,
      functionName: "joinRoom",
      args: [roomId],
      value: stakeWei,
    });
  }

  return {
    joinRoom,
    ...makeWriteState(hash, isPending, isConfirming, isSuccess, error, reset),
  };
}

export function useStartGame() {
  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  function startGame(roomId: bigint) {
    if (!manahDeployed) return;
    writeContract({
      address: manahAddress,
      abi: manahAbi,
      functionName: "startGame",
      args: [roomId],
    });
  }

  return {
    startGame,
    ...makeWriteState(hash, isPending, isConfirming, isSuccess, error, reset),
  };
}

/**
 * The hot path. Per AGENTS.md, prefer Monad's `useSendTransactionSync` here
 * once that hook is stable in our wagmi version. For now, fallback to vanilla
 * write + receipt poll — same UX, ~800ms slower than the sync version.
 */
export function useShoot() {
  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  function shoot(roomId: bigint, angleCentideg: bigint, powerBp: bigint) {
    if (!manahDeployed) return;
    writeContract({
      address: manahAddress,
      abi: manahAbi,
      functionName: "shoot",
      args: [roomId, angleCentideg, powerBp],
    });
  }

  return {
    shoot,
    ...makeWriteState(hash, isPending, isConfirming, isSuccess, error, reset),
  };
}

export function useSettleGame() {
  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  function settleGame(roomId: bigint) {
    if (!manahDeployed) return;
    writeContract({
      address: manahAddress,
      abi: manahAbi,
      functionName: "settleGame",
      args: [roomId],
    });
  }

  return {
    settleGame,
    ...makeWriteState(hash, isPending, isConfirming, isSuccess, error, reset),
  };
}

/* ------------------------------------------------------------------------- */
/* Convenience: derive room status enum + helpers                             */
/* ------------------------------------------------------------------------- */

export type RoomTuple = readonly [
  Address, // host
  number, // maxPlayers
  number, // numPlayers
  number, // status
  bigint, // stake
  bigint, // startedAt
  bigint, // targetY
  `0x${string}`, // targetSeed
  readonly Address[],
];

export function parseRoom(tuple: RoomTuple | undefined) {
  if (!tuple) return undefined;
  const [host, maxPlayers, numPlayers, status, stake, startedAt, targetY, targetSeed, players] =
    tuple;
  return {
    host,
    maxPlayers,
    numPlayers,
    status: status as RoomStatus,
    stake,
    startedAt,
    targetY,
    targetSeed,
    players: [...players],
  };
}

export function useConnectedAddress() {
  const { address } = useAccount();
  return address;
}
