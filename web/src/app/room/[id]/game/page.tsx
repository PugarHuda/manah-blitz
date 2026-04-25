"use client";

import Link from "next/link";
import { use, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAccount } from "wagmi";
import { ManahMark } from "@/components/manah-mark";
import { ArrowLeft, Wifi, WifiOff } from "lucide-react";
import { cn } from "@/lib/cn";
import { ArcheryGame } from "@/game/archery-game";
import type { Difficulty, GameState } from "@/game/types";
import { TURN_TIME_SECONDS } from "@/game/constants";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL ?? "";

function isDifficulty(value: string | null): value is Difficulty {
  return value === "easy" || value === "medium" || value === "hard";
}

export default function GamePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const difficulty: Difficulty = isDifficulty(searchParams.get("difficulty"))
    ? (searchParams.get("difficulty") as Difficulty)
    : "medium";

  const { address } = useAccount();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<ArcheryGame | null>(null);

  const [state, setState] = useState<GameState | null>(null);
  const [power, setPower] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || gameRef.current) return;

    const localPlayerId = address ?? `guest-${Math.random().toString(36).slice(2, 8)}`;

    try {
      gameRef.current = new ArcheryGame({
        canvas,
        roomId: id,
        localPlayerId,
        difficulty,
        serverUrl: SOCKET_URL,
        onState: setState,
        onPower: setPower,
        onError: setError,
      });
    } catch (err) {
      console.error("[manah] failed to start game:", err);
      setError(err instanceof Error ? err.message : String(err));
    }

    return () => {
      gameRef.current?.dispose();
      gameRef.current = null;
    };
  }, [id, address, difficulty]);

  const currentPlayer = state?.players[state.currentPlayerIndex];
  const myPlayer = state?.players.find((p) => p.id === address);
  const isMyTurn = currentPlayer?.id === address;
  const timeLeft = state?.timeLeft ?? TURN_TIME_SECONDS;
  const phase = state?.turnPhase ?? "aiming";
  const winner = state?.winnerId ? state.players.find((p) => p.id === state.winnerId) : null;

  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden bg-black">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full touch-none"
      />

      {/* subtle vignette so HUD reads better over scene */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/55 via-transparent to-black/55" />

      {/* Top HUD */}
      <div className="relative z-10 flex items-start justify-between px-5 pt-5">
        <Link
          href={`/room/${id}`}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-ink-100 ring-1 ring-inset ring-white/10 backdrop-blur"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>

        <div className="flex flex-col items-center gap-1 rounded-2xl bg-black/40 px-5 py-2.5 ring-1 ring-inset ring-white/10 backdrop-blur">
          <span className="text-[10px] uppercase tracking-[0.2em] text-ink-400">
            {isMyTurn ? "your turn" : currentPlayer ? `${currentPlayer.id.slice(0, 6)}…` : "—"}
          </span>
          <span className="font-mono text-2xl text-ink-50">
            {myPlayer?.totalScore ?? 0}
          </span>
        </div>

        <div className="flex h-10 items-center gap-2 rounded-full bg-black/40 px-3 ring-1 ring-inset ring-white/10 backdrop-blur">
          {Array.from({ length: 3 }).map((_, i) => (
            <span
              key={i}
              className={cn(
                "h-2.5 w-2.5 rounded-full transition",
                i < (myPlayer?.arrowsLeft ?? 3) ? "bg-target" : "bg-ink-700",
              )}
            />
          ))}
        </div>
      </div>

      {/* Status bar — connection + timer + difficulty/phase */}
      <div className="absolute left-5 right-5 top-20 z-10 mx-auto flex max-w-md items-center justify-between rounded-2xl bg-black/40 px-4 py-2.5 ring-1 ring-inset ring-white/10 backdrop-blur">
        <span className="flex items-center gap-1.5 text-xs text-ink-300">
          {SOCKET_URL ? (
            <>
              <Wifi className="h-3.5 w-3.5" />
              <span className="font-mono">multiplayer</span>
            </>
          ) : (
            <>
              <WifiOff className="h-3.5 w-3.5" />
              <span className="font-mono">solo</span>
            </>
          )}
        </span>
        <span className="font-mono text-sm text-ink-50">
          {Math.ceil(timeLeft)}s
        </span>
        <span className="text-[10px] uppercase tracking-widest text-ink-400">
          {difficulty} · {phase}
        </span>
      </div>

      {error && (
        <div className="absolute left-5 right-5 top-36 z-10 mx-auto max-w-md rounded-xl bg-danger/15 px-4 py-2 text-xs text-danger ring-1 ring-inset ring-danger/30 backdrop-blur">
          {error.slice(0, 160)}
        </div>
      )}

      {/* Win banner */}
      {phase === "done" && winner && (
        <div className="pointer-events-none absolute left-1/2 top-1/3 z-10 -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-black/70 px-8 py-6 backdrop-blur ring-1 ring-inset ring-brand">
          <div className="text-center">
            <div className="text-xs uppercase tracking-[0.2em] text-brand-300">
              Match over
            </div>
            <div className="mt-2 font-mono text-3xl text-ink-50">
              {winner.id === address ? "You win" : `${winner.id.slice(0, 8)}… wins`}
            </div>
            <div className="mt-2 text-sm text-ink-400">
              {winner.totalScore} points
            </div>
          </div>
        </div>
      )}

      {/* Bottom: power meter (driven by gesture) */}
      <div className="relative z-10 mt-auto mx-auto mb-8 flex w-full max-w-md flex-col items-center gap-3 px-5">
        <div className="h-2 w-full overflow-hidden rounded-full bg-ink-800 ring-1 ring-inset ring-ink-700">
          <div
            className="h-full bg-gradient-to-r from-brand-700 via-brand to-target transition-[width] duration-75"
            style={{ width: `${power * 100}%` }}
          />
        </div>
        <div className="flex h-12 w-full items-center justify-center rounded-2xl bg-black/40 px-5 text-xs uppercase tracking-[0.2em] text-ink-400 ring-1 ring-inset ring-white/10 backdrop-blur">
          {phase === "done"
            ? "tap back to return"
            : !isMyTurn
              ? "wait for your turn"
              : phase === "aiming"
                ? "press · drag to aim · release to fire"
                : phase === "shooting"
                  ? "arrow in flight…"
                  : phase === "impact"
                    ? "impact"
                    : phase === "replay"
                      ? "replay"
                      : "—"}
        </div>
      </div>

      {/* Tiny brand mark in corner */}
      <div className="pointer-events-none absolute bottom-4 right-4 z-10 flex items-center gap-1 text-[10px] uppercase tracking-[0.2em] text-ink-500">
        <ManahMark size={14} />
        manah
      </div>
    </main>
  );
}
