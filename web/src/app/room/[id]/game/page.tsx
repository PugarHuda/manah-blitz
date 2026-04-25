"use client";

import Link from "next/link";
import { use, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAccount } from "wagmi";
import { useGameStore } from "@/lib/store";
import {
  Pause,
  Play,
  LogOut,
  Trophy,
  ExternalLink,
  Loader2,
  Coins,
} from "lucide-react";
import { LoginButton } from "@/components/login-button";
import { cn } from "@/lib/cn";
import {
  simulateShot,
  pickTargetY,
  pickWind,
  type ShotResult,
  PHYSICS,
} from "@/lib/physics";
import { useShoot, usePlayer, useRoom, parseRoom, type RoomTuple } from "@/lib/hooks";
import {
  angleRadToCentideg,
  powerToBp,
  manahDeployed,
  MANAH,
  RoomStatus,
} from "@/lib/manah";
import type { Difficulty } from "@/game/types";

const ROUND_TIME = 60;

function isDifficulty(value: string | null): value is Difficulty {
  return value === "easy" || value === "medium" || value === "hard";
}

export default function GamePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const difficulty: Difficulty = isDifficulty(searchParams.get("difficulty"))
    ? (searchParams.get("difficulty") as Difficulty)
    : "medium";

  const { address } = useAccount();

  // -- Contract state ---------------------------------------------------------
  const roomIdBig = useMemo(() => {
    try {
      return BigInt(id);
    } catch {
      return undefined;
    }
  }, [id]);

  const { data: roomTuple } = useRoom(roomIdBig);
  const room = parseRoom(roomTuple as RoomTuple | undefined);
  const { data: playerData, refetch: refetchPlayer } = usePlayer(roomIdBig, address);
  const shoot = useShoot();

  const onChain = manahDeployed && roomIdBig !== undefined && Boolean(address);

  // -- Local visual state -----------------------------------------------------
  const phase = useGameStore((s) => s.phase);
  const setPower = useGameStore((s) => s.setPower);
  const setPhase = useGameStore((s) => s.setPhase);
  const drawPower = useGameStore((s) => s.drawPower);

  const [aimOffset, setAimOffset] = useState({ x: 0, y: 0 });
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);

  // Per-room deterministic seed for the target Y so all clients see the same
  // miss/hit visual offset (until Pyth Entropy lands).
  const seed = useMemo(() => {
    let h = 0;
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
    return Math.abs(h) || 1;
  }, [id]);

  const [arrowIdxLocal, setArrowIdxLocal] = useState(0);
  const [scoreLocal, setScoreLocal] = useState(0);
  const [lastResult, setLastResult] = useState<ShotResult | null>(null);
  const [animTick, setAnimTick] = useState(-1);
  const [isPaused, setIsPaused] = useState(false);
  const [timeLeft, setTimeLeft] = useState(ROUND_TIME);
  const [lastTxHash, setLastTxHash] = useState<`0x${string}` | undefined>();
  const animRaf = useRef<number | null>(null);

  const targetYmm = pickTargetY(seed);
  const wind = pickWind(seed * 31 + arrowIdxLocal);

  // -- Source-of-truth resolution: chain when authenticated + room exists,
  //    local otherwise. UI reads through these aliases.
  const arrowsUsed = onChain && playerData ? Number(playerData[1]) : arrowIdxLocal;
  const arrowsLeft = MANAH.ARROWS_PER_PLAYER - arrowsUsed;
  const score = onChain && playerData ? Number(playerData[2]) : scoreLocal;
  const finished =
    arrowsLeft <= 0 ||
    timeLeft <= 0 ||
    (room?.status === RoomStatus.Settled);

  const isResolving = phase === "released" || shoot.isPending || shoot.isConfirming;

  const currentAngle = useMemo(() => aimOffset.y / 800, [aimOffset.y]);

  // -- Round timer (paused while shot is resolving / paused) ------------------
  useEffect(() => {
    if (finished || isPaused || isResolving) return;
    const t = setInterval(() => setTimeLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [finished, isPaused, isResolving]);

  // -- After contract shoot confirms, refetch player + capture tx hash --------
  useEffect(() => {
    if (shoot.isSuccess && shoot.hash) {
      setLastTxHash(shoot.hash);
      refetchPlayer();
    }
  }, [shoot.isSuccess, shoot.hash, refetchPlayer]);

  // -- Release: simulate locally for instant visual; submit to chain in parallel.
  function release() {
    if (finished || isResolving || isPaused) return;
    const power = useGameStore.getState().drawPower;
    const finalPower = Math.max(0.2, power);
    setPhase("released");

    // Local visual sim (gravity 0 = arcade-flat, matches /practice feel).
    const result = simulateShot(currentAngle, finalPower, targetYmm, wind, 0);
    setLastResult(result);

    // Submit to contract optimistically. If not on-chain (no wallet / no
    // contract), fall back to fully local scoring.
    if (onChain && roomIdBig !== undefined) {
      shoot.shoot(
        roomIdBig,
        angleRadToCentideg(currentAngle),
        powerToBp(finalPower),
      );
    }

    const totalMs = 1500;
    const perTick = totalMs / PHYSICS.TICKS_PER_SHOT;
    const startTime = performance.now();
    const step = (now: number) => {
      const elapsed = now - startTime;
      const i = Math.floor(elapsed / perTick);
      if (i < PHYSICS.TICKS_PER_SHOT) {
        setAnimTick(i);
        animRaf.current = requestAnimationFrame(step);
      } else {
        // When NOT on-chain, commit local score so the HUD updates.
        if (!onChain) {
          setScoreLocal((s) => s + result.points);
          setArrowIdxLocal((a) => a + 1);
        }
        setPower(0);
        setPhase("idle");
        setAimOffset({ x: 0, y: 0 });
        setTimeout(() => setAnimTick(-1), 1000);
      }
    };
    animRaf.current = requestAnimationFrame(step);
  }

  useEffect(
    () => () => {
      if (animRaf.current) cancelAnimationFrame(animRaf.current);
    },
    [],
  );

  // -- Animated arrow projection ----------------------------------------------
  const arrowPos = useMemo(() => {
    if (animTick < 0 || !lastResult) return null;
    const progress = animTick / (PHYSICS.TICKS_PER_SHOT - 1);
    const currentX = progress * PHYSICS.TARGET_X_MM;
    const currentY =
      PHYSICS.EYE_HEIGHT_MM +
      (lastResult.landingY - PHYSICS.EYE_HEIGHT_MM) * progress;
    return { x: currentX, y: currentY };
  }, [animTick, lastResult]);

  function project(tick: { x: number; y: number }) {
    const distRatio = Math.min(1, tick.x / PHYSICS.TARGET_X_MM);
    const screenY = 90 - distRatio * 40;
    const screenX = 50 + (aimOffset.x / 12) * (1 - distRatio);
    const heightDiff = (tick.y - targetYmm) / 12;
    const perspectiveScale = 1 - distRatio * 0.85;
    return {
      x: screenX,
      y: screenY - heightDiff * perspectiveScale,
      scale: Math.max(0.1, perspectiveScale),
    };
  }
  const projectedPos = useMemo(
    () => (arrowPos ? project(arrowPos) : null),
    [arrowPos],
  );

  return (
    <main
      className="relative flex flex-1 flex-col bg-black overflow-hidden select-none touch-none"
      onPointerDown={(e) => {
        if (isResolving || isPaused || finished) return;
        setPhase("drawing");
        dragStartRef.current = { x: e.clientX, y: e.clientY };
      }}
      onPointerMove={(e) => {
        if (phase !== "drawing" || !dragStartRef.current) return;
        const dx = e.clientX - dragStartRef.current.x;
        const dy = e.clientY - dragStartRef.current.y;
        const power = Math.max(0, Math.min(1, dy / 180));
        setPower(power);
        setAimOffset({
          x: Math.max(-100, Math.min(100, dx)),
          y: Math.max(-180, Math.min(180, dy)),
        });
      }}
      onPointerUp={() => {
        if (phase !== "drawing") return;
        dragStartRef.current = null;
        release();
      }}
    >
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-ink-950 via-ink-900 to-black" />
        <div className="bg-grid absolute inset-0 opacity-10" />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-brand/10 blur-[80px] rounded-full" />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <Target />
        </div>

        {/* Prediction line — yellow dashed until release */}
        {phase === "drawing" && drawPower > 0.05 && (
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
            <line
              x1={`${project({ x: 0, y: PHYSICS.EYE_HEIGHT_MM }).x}%`}
              y1={`${project({ x: 0, y: PHYSICS.EYE_HEIGHT_MM }).y}%`}
              x2={`${project({ x: PHYSICS.TARGET_X_MM, y: simulateShot(currentAngle, drawPower, targetYmm, wind, 0).landingY }).x}%`}
              y2={`${project({ x: PHYSICS.TARGET_X_MM, y: simulateShot(currentAngle, drawPower, targetYmm, wind, 0).landingY }).y}%`}
              stroke="rgba(250, 204, 21, 0.8)"
              strokeWidth="2"
              strokeDasharray="4,4"
              className="drop-shadow-[0_0_8px_rgba(250,204,21,1)]"
            />
          </svg>
        )}

        {/* Flying arrow */}
        {projectedPos && (
          <div
            className="absolute flex flex-col items-center z-10"
            style={{
              left: `${projectedPos.x}%`,
              top: `${projectedPos.y}%`,
              transform: `translate(-50%, -50%) scale(${projectedPos.scale})`,
            }}
          >
            <div className="w-5 h-5 bg-yellow-400 rotate-45 mb-[-10px] rounded-sm shadow-[0_0_15px_rgba(250,204,21,1)]" />
            <div className="w-2 h-20 bg-gradient-to-t from-transparent via-white to-yellow-300 rounded-full" />
          </div>
        )}

        {/* Drawing arrow (nocked) */}
        {phase === "drawing" && (
          <div
            className="absolute left-1/2 bottom-[15%] -translate-x-1/2 z-10"
            style={{
              transform: `translateX(-50%) translateY(${drawPower * 50}px) rotate(${aimOffset.x / 5}deg)`,
            }}
          >
            <div className="w-2.5 h-48 bg-gradient-to-b from-yellow-400 via-white/40 to-transparent rounded-full" />
            <div className="w-8 h-8 border-2 border-yellow-400 rounded-full mx-auto mt-[-12px] bg-black/80 flex items-center justify-center">
              <div className="w-4 h-4 bg-yellow-400 rounded-full animate-ping" />
            </div>
          </div>
        )}
      </div>

      {/* Top HUD */}
      <div className="relative z-30 flex items-center justify-between px-6 pt-10 gap-3">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsPaused(true);
          }}
          className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 text-white border border-white/10 backdrop-blur-md active:scale-90 transition shadow-xl"
        >
          <Pause className="h-7 w-7 fill-current" />
        </button>

        <div className="flex items-center gap-4 rounded-2xl bg-white/5 border border-white/10 px-6 py-3 backdrop-blur-md">
          <div className="relative h-10 w-10">
            <svg className="h-full w-full" viewBox="0 0 36 36">
              <circle
                className="stroke-white/10"
                strokeWidth="3"
                fill="transparent"
                r="16"
                cx="18"
                cy="18"
              />
              <circle
                className="stroke-yellow-400"
                strokeWidth="3"
                strokeDasharray="100, 100"
                strokeDashoffset={100 - (timeLeft / ROUND_TIME) * 100}
                strokeLinecap="round"
                fill="transparent"
                r="16"
                cx="18"
                cy="18"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center font-mono text-sm text-yellow-400">
              {timeLeft}
            </span>
          </div>
          <span className="font-mono text-xl font-bold text-white tracking-widest">
            {timeLeft}s
          </span>
        </div>

        {/* Wallet pill */}
        <div onPointerDown={(e) => e.stopPropagation()}>
          <LoginButton variant="ghost" />
        </div>
      </div>

      {/* Score + room id */}
      <div className="pointer-events-none absolute top-[24%] left-1/2 -translate-x-1/2 text-center z-20">
        <div className="text-[10px] uppercase tracking-[0.5em] text-white/30 mb-1">
          Room {id} · {difficulty}
        </div>
        <div className="text-[10px] uppercase tracking-[0.5em] text-white/30 mb-2">
          Total Score
        </div>
        <div className="font-mono text-7xl font-black text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.3)]">
          {score}
        </div>
        <div className="mt-2 text-[10px] uppercase tracking-[0.4em] text-yellow-400/70">
          {arrowsLeft} {arrowsLeft === 1 ? "arrow" : "arrows"} left
        </div>
      </div>

      {/* Pull bow indicator */}
      {phase === "drawing" && (
        <div className="absolute top-[18%] left-1/2 -translate-x-1/2 text-center pointer-events-none z-20">
          <div className="p-3 rounded-xl bg-yellow-400/10 border border-yellow-400/20 backdrop-blur-sm">
            <div className="text-[10px] uppercase tracking-[0.4em] text-yellow-400 font-bold mb-1">
              Pulling Bow
            </div>
            <div className="text-white/80 text-lg font-mono font-bold">
              {Math.round(drawPower * 100)}%
            </div>
          </div>
        </div>
      )}

      {/* Result toast */}
      {lastResult && animTick >= PHYSICS.TICKS_PER_SHOT - 1 && !finished && (
        <div className="pointer-events-none absolute left-1/2 top-1/3 -translate-x-1/2 rounded-[2rem] bg-yellow-400 text-black px-12 py-8 shadow-[0_0_50px_rgba(250,204,21,0.5)] z-40">
          <div className="text-center">
            <div className="text-xl font-black uppercase tracking-widest leading-none">
              {lastResult.hit ? "Direct Hit" : "Missed"}
            </div>
            <div className="mt-4 font-mono text-7xl font-black">
              +{lastResult.points}
            </div>
          </div>
        </div>
      )}

      {/* On-chain submit indicator */}
      {(shoot.isPending || shoot.isConfirming) && (
        <div className="pointer-events-none absolute left-1/2 bottom-[28%] -translate-x-1/2 z-30 flex items-center gap-2 rounded-full bg-brand/10 border border-brand/30 px-5 py-2.5 backdrop-blur-md">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-300" />
          <span className="text-xs uppercase tracking-widest text-brand-300">
            {shoot.isPending ? "Confirm in wallet…" : "Streaming 50 ticks on-chain…"}
          </span>
        </div>
      )}

      {/* Last tx deep-link */}
      {lastTxHash && !finished && (
        <a
          href={`https://testnet.monadexplorer.com/tx/${lastTxHash}`}
          target="_blank"
          rel="noopener noreferrer"
          onPointerDown={(e) => e.stopPropagation()}
          className="absolute left-1/2 bottom-[22%] -translate-x-1/2 z-30 flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-ink-400 hover:text-brand transition pointer-events-auto"
        >
          ↗ tx {lastTxHash.slice(0, 8)}…{lastTxHash.slice(-6)}
        </a>
      )}

      {/* Bottom: power + finished card */}
      <div className="mt-auto relative z-50 mx-auto mb-12 flex w-full max-w-md flex-col items-center gap-6 px-8 pointer-events-none">
        {finished ? (
          <div className="pointer-events-auto w-full">
            <FinishedCard
              score={score}
              roomId={id}
              onLeave={() => router.push(`/room/${id}`)}
            />
          </div>
        ) : (
          <div className="w-full flex flex-col gap-4">
            <div className="h-2 w-full overflow-hidden rounded-full bg-white/5 border border-white/5">
              <div
                className="h-full bg-yellow-400 rounded-full transition-all duration-75"
                style={{ width: `${drawPower * 100}%` }}
              />
            </div>
            <div className="text-center text-[10px] uppercase tracking-[0.6em] text-white/20">
              {!address
                ? "sign in to play on-chain"
                : !manahDeployed
                  ? "contract not deployed — local mode"
                  : phase === "drawing"
                    ? "release to fire"
                    : "touch anywhere to draw"}
            </div>
          </div>
        )}
      </div>

      {/* Pause menu */}
      {isPaused && (
        <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-black/90 backdrop-blur-2xl">
          <div className="text-center mb-16">
            <h2 className="text-lg uppercase tracking-[0.6em] text-yellow-400 font-bold">
              Paused
            </h2>
          </div>
          <div className="flex flex-col w-full max-w-xs gap-5 px-6">
            <button
              onClick={() => setIsPaused(false)}
              className="flex h-20 items-center justify-center gap-4 rounded-3xl bg-yellow-400 text-black font-black uppercase tracking-widest transition active:scale-95"
            >
              <Play className="h-6 w-6 fill-current" />
              Resume
            </button>
            <Link
              href={`/room/${id}`}
              className="flex h-20 items-center justify-center gap-4 rounded-3xl bg-white/5 border border-white/10 text-white font-bold uppercase tracking-widest active:scale-95 transition"
            >
              <LogOut className="h-6 w-6" />
              Leave room
            </Link>
          </div>
        </div>
      )}
    </main>
  );
}

function FinishedCard({
  score,
  roomId,
  onLeave,
}: {
  score: number;
  roomId: string;
  onLeave: () => void;
}) {
  const max = MANAH.MAX_POINTS * MANAH.ARROWS_PER_PLAYER;
  const pct = Math.round((score / max) * 100);
  return (
    <div className="w-full rounded-[3rem] border border-white/10 bg-white/5 p-10 text-center backdrop-blur-3xl">
      <div className="flex justify-center mb-6">
        <div className="grid h-20 w-20 place-items-center rounded-3xl bg-yellow-400/20 text-yellow-400 ring-2 ring-yellow-400/50 shadow-[0_0_30px_rgba(250,204,21,0.2)]">
          <Trophy className="h-10 w-10" />
        </div>
      </div>
      <div className="text-xs uppercase tracking-[0.4em] text-white/40 mb-2">
        Round complete
      </div>
      <div className="font-mono text-7xl font-black text-white leading-none mb-2">
        {score}
      </div>
      <div className="text-sm text-yellow-400 font-black tracking-[0.2em] uppercase">
        {pct}% accuracy
      </div>
      <div className="mt-10 flex flex-col gap-4">
        <button
          onClick={onLeave}
          className="h-16 w-full rounded-2xl bg-white text-black font-black uppercase tracking-widest active:scale-95 transition"
        >
          Back to room
        </button>
        <Link
          href={`/room/${roomId}`}
          className="h-16 w-full flex items-center justify-center gap-2 rounded-2xl bg-yellow-400 text-black font-black uppercase tracking-widest shadow-[0_0_20px_rgba(250,204,21,0.3)] active:scale-95 transition"
        >
          <Coins className="h-5 w-5" />
          Settle on-chain
          <ExternalLink className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

function Target() {
  return (
    <div className="relative group">
      <svg
        width="240"
        height="240"
        viewBox="0 0 180 180"
        fill="none"
        className="relative drop-shadow-[0_0_40px_rgba(255,255,255,0.1)]"
      >
        <circle cx="90" cy="90" r="85" fill="#ffffff" stroke="#ddd" strokeWidth="1" />
        <circle cx="90" cy="90" r="76.5" fill="#ffffff" stroke="#ddd" strokeWidth="1" />
        <circle cx="90" cy="90" r="68" fill="#111111" stroke="#333" strokeWidth="1" />
        <circle cx="90" cy="90" r="59.5" fill="#111111" stroke="#333" strokeWidth="1" />
        <circle cx="90" cy="90" r="51" fill="#1a53ff" stroke="#333" strokeWidth="1" />
        <circle cx="90" cy="90" r="42.5" fill="#1a53ff" stroke="#333" strokeWidth="1" />
        <circle cx="90" cy="90" r="34" fill="#ff2a2a" stroke="#333" strokeWidth="1" />
        <circle cx="90" cy="90" r="25.5" fill="#ff2a2a" stroke="#333" strokeWidth="1" />
        <circle cx="90" cy="90" r="17" fill="#ffdd33" stroke="#ccaa00" strokeWidth="1" />
        <circle cx="90" cy="90" r="8.5" fill="#ffdd33" stroke="#ccaa00" strokeWidth="1" />
        <circle cx="90" cy="90" r="2" fill="#000" />
      </svg>
    </div>
  );
}
