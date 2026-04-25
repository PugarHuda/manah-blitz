"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useGameStore } from "@/lib/store";
import { ManahMark } from "@/components/manah-mark";
import { ArrowLeft, Camera, Crosshair, Wind, Trophy, RotateCcw, ArrowRight } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  simulateShot,
  pickTargetY,
  pickWind,
  type ShotResult,
  PHYSICS,
} from "@/lib/physics";

const PRACTICE_ARROWS = 5;

export default function PracticePage() {
  const aimAngle = useGameStore((s) => s.aimAngle);
  const drawPower = useGameStore((s) => s.drawPower);
  const phase = useGameStore((s) => s.phase);
  const setPower = useGameStore((s) => s.setPower);
  const setPhase = useGameStore((s) => s.setPhase);

  // One game-seed per session — different target each refresh.
  const [seed] = useState(() => Math.floor(Math.random() * 1_000_000));
  const targetYmm = pickTargetY(seed);

  const [arrowIdx, setArrowIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [lastResult, setLastResult] = useState<ShotResult | null>(null);
  const [animTick, setAnimTick] = useState(-1); // -1 = no replay
  const animRaf = useRef<number | null>(null);

  const arrowsLeft = PRACTICE_ARROWS - arrowIdx;
  const finished = arrowIdx >= PRACTICE_ARROWS;
  const wind = pickWind(seed * 31 + arrowIdx);
  const isResolving = phase === "released";

  function release() {
    if (finished || isResolving) return;
    const power = useGameStore.getState().drawPower;
    const angle = useGameStore.getState().aimAngle;
    setPhase("released");

    const result = simulateShot(angle, power, targetYmm, wind);
    setLastResult(result);

    // Animate the 50 ticks across ~1.4s for visual replay.
    const totalMs = 1400;
    const perTick = totalMs / PHYSICS.TICKS_PER_SHOT;
    const start = performance.now();
    const step = (now: number) => {
      const elapsed = now - start;
      const i = Math.min(
        PHYSICS.TICKS_PER_SHOT - 1,
        Math.floor(elapsed / perTick),
      );
      setAnimTick(i);
      if (i < PHYSICS.TICKS_PER_SHOT - 1) {
        animRaf.current = requestAnimationFrame(step);
      } else {
        // commit + reset
        setScore((s) => s + result.points);
        setArrowIdx((a) => a + 1);
        setPower(0);
        setPhase("idle");
        setTimeout(() => setAnimTick(-1), 800); // keep arrow visible briefly
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

  function reset() {
    setArrowIdx(0);
    setScore(0);
    setLastResult(null);
    setAnimTick(-1);
    setPower(0);
    setPhase("idle");
  }

  const arrowPos =
    animTick >= 0 && lastResult
      ? lastResult.ticks[Math.min(animTick, lastResult.ticks.length - 1)]
      : null;

  // Map physics coords (mm) to screen coords for arrow visualization.
  // X: 0..30000mm → left edge → target center. Y: 0..3000mm → bottom..top.
  function projectX(mm: number) {
    return (mm / PHYSICS.TARGET_X_MM) * 50 + 50; // % from left, target = 50%
  }
  function projectY(mm: number) {
    // Clamp y to a viewable band centered at targetYmm.
    const range = 2400; // ±1.2m around target
    const norm = (mm - (targetYmm - range / 2)) / range;
    return Math.max(0, Math.min(1, 1 - norm)) * 60 + 20; // % from top
  }

  return (
    <main className="relative flex flex-1 flex-col bg-black overflow-hidden">
      {/* Pseudo-AR background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-ink-900 via-ink-800/80 to-ink-900" />
        <div
          className="absolute inset-0 opacity-30"
          style={{
            background:
              "radial-gradient(60% 60% at 50% 60%, rgba(131,110,249,0.25), transparent 70%)",
          }}
        />
        <div className="bg-grid absolute inset-0 opacity-20" />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <Target />
        </div>

        {/* Animated arrow trail during replay */}
        {arrowPos && lastResult && (
          <>
            {lastResult.ticks.slice(0, animTick + 1).map((t, idx) => (
              <span
                key={idx}
                className="absolute h-1 w-1 rounded-full bg-target/70"
                style={{
                  left: `${projectX(t.x)}%`,
                  top: `${projectY(t.y)}%`,
                  transform: "translate(-50%, -50%)",
                  opacity: Math.max(0.1, idx / (animTick + 1)),
                }}
              />
            ))}
            <span
              className="absolute h-3 w-3 rounded-full bg-target ring-2 ring-target/40"
              style={{
                left: `${projectX(arrowPos.x)}%`,
                top: `${projectY(arrowPos.y)}%`,
                transform: "translate(-50%, -50%)",
                boxShadow: "0 0 12px rgba(249, 193, 82, 0.8)",
              }}
            />
          </>
        )}
      </div>

      {/* HUD: top */}
      <div className="relative z-10 flex items-start justify-between px-5 pt-5">
        <Link
          href="/"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-ink-100 ring-1 ring-inset ring-white/10 backdrop-blur"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>

        <div className="flex flex-col items-center gap-1 rounded-2xl bg-black/40 px-5 py-2.5 ring-1 ring-inset ring-white/10 backdrop-blur">
          <span className="text-[10px] uppercase tracking-[0.2em] text-ink-400">
            practice · score
          </span>
          <span className="font-mono text-2xl text-ink-50">{score}</span>
        </div>

        <div className="flex h-10 items-center gap-2 rounded-full bg-black/40 px-3 ring-1 ring-inset ring-white/10 backdrop-blur">
          {Array.from({ length: PRACTICE_ARROWS }).map((_, i) => (
            <span
              key={i}
              className={cn(
                "h-2.5 w-2.5 rounded-full transition",
                i < arrowsLeft ? "bg-target" : "bg-ink-700",
              )}
            />
          ))}
        </div>
      </div>

      {/* HUD: center crosshair (hidden during replay) */}
      {!arrowPos && !finished && (
        <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <Crosshair className="h-10 w-10 text-brand/80" strokeWidth={1.2} />
        </div>
      )}

      {/* Result toast */}
      {lastResult && animTick >= PHYSICS.TICKS_PER_SHOT - 1 && !finished && (
        <div className="pointer-events-none absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-black/70 px-6 py-4 backdrop-blur ring-1 ring-inset ring-white/10">
          <div className="text-center">
            <div className="text-xs uppercase tracking-[0.2em] text-ink-400">
              {lastResult.hit ? "Hit" : "Miss"}
            </div>
            <div
              className={cn(
                "mt-1 font-mono text-3xl",
                lastResult.points >= 80
                  ? "text-target"
                  : lastResult.points > 0
                    ? "text-brand-300"
                    : "text-ink-400",
              )}
            >
              +{lastResult.points}
            </div>
            {lastResult.hit && (
              <div className="mt-1 text-[10px] uppercase tracking-widest text-ink-500">
                {Math.round(lastResult.distFromBullseyeMm)}mm from bullseye
              </div>
            )}
          </div>
        </div>
      )}

      {/* HUD: aim info bottom */}
      {!finished && (
        <div className="absolute bottom-32 left-5 right-5 z-10 mx-auto flex max-w-md items-center justify-between rounded-full bg-black/40 px-5 py-2.5 ring-1 ring-inset ring-white/10 backdrop-blur">
          <span className="flex items-center gap-1.5 text-xs text-ink-300">
            <Camera className="h-3.5 w-3.5" />
            <span className="font-mono">
              {((aimAngle * 180) / Math.PI).toFixed(0)}°
            </span>
          </span>
          <span className="flex items-center gap-1.5 text-xs text-ink-300">
            <Wind className="h-3.5 w-3.5" />
            <span className="font-mono">
              {wind === 0 ? "calm" : `${wind > 0 ? "+" : ""}${wind} mm/t²`}
            </span>
          </span>
          <span className="font-mono text-xs uppercase tracking-widest text-ink-400">
            {phase}
          </span>
        </div>
      )}

      {/* Bottom action */}
      <div className="relative z-10 mx-auto mb-8 flex w-full max-w-md flex-col items-center gap-3 px-5">
        {finished ? (
          <FinishedCard score={score} onReset={reset} />
        ) : (
          <>
            <div className="h-2 w-full overflow-hidden rounded-full bg-ink-800 ring-1 ring-inset ring-ink-700">
              <div
                className="h-full bg-gradient-to-r from-brand-700 via-brand to-target transition-[width]"
                style={{ width: `${drawPower * 100}%` }}
              />
            </div>
            <button
              onPointerDown={() => {
                if (isResolving) return;
                setPhase("drawing");
                const start = Date.now();
                const tick = () => {
                  const elapsed = (Date.now() - start) / 1500;
                  setPower(Math.min(1, elapsed));
                  if (useGameStore.getState().phase === "drawing") {
                    requestAnimationFrame(tick);
                  }
                };
                requestAnimationFrame(tick);
              }}
              onPointerUp={release}
              disabled={isResolving}
              className={cn(
                "inline-flex h-16 w-full select-none items-center justify-center gap-2 rounded-2xl text-sm font-medium uppercase tracking-[0.2em] transition",
                isResolving
                  ? "bg-target text-ink-900 scale-[0.99]"
                  : phase === "drawing"
                    ? "bg-target text-ink-900 glow-brand scale-[0.99]"
                    : "bg-brand text-ink-50 hover:bg-brand-600 glow-brand",
              )}
            >
              {isResolving
                ? `Replaying tick ${Math.max(0, animTick) + 1}/${PHYSICS.TICKS_PER_SHOT}…`
                : phase === "drawing"
                  ? "Hold…"
                  : "Hold to draw · release to fire"}
            </button>
          </>
        )}
      </div>
    </main>
  );
}

function FinishedCard({ score, onReset }: { score: number; onReset: () => void }) {
  const max = PHYSICS.MAX_POINTS * PRACTICE_ARROWS;
  const pct = Math.round((score / max) * 100);
  return (
    <div className="w-full rounded-2xl border border-ink-800 bg-ink-900/80 p-6 text-center backdrop-blur">
      <div className="flex justify-center">
        <div className="grid h-12 w-12 place-items-center rounded-full bg-brand/15 ring-1 ring-inset ring-brand text-brand">
          <Trophy className="h-5 w-5" />
        </div>
      </div>
      <div className="mt-3 text-xs uppercase tracking-[0.2em] text-ink-400">
        Practice complete
      </div>
      <div className="mt-2 font-mono text-4xl text-ink-50">
        {score}
        <span className="ml-1 text-lg text-ink-500">/ {max}</span>
      </div>
      <div className="mt-1 text-xs text-ink-400">{pct}% accuracy</div>
      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <button
          onClick={onReset}
          className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-full text-sm font-medium text-ink-100 ring-1 ring-inset ring-ink-700 hover:ring-brand transition"
        >
          <RotateCcw className="h-4 w-4" />
          Try again
        </button>
        <Link
          href="/play"
          className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-brand text-ink-50 text-sm font-medium hover:bg-brand-600 glow-brand transition"
        >
          Stake & play multiplayer
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

function Target() {
  return (
    <svg width="180" height="180" viewBox="0 0 180 180" fill="none">
      <circle cx="90" cy="90" r="85" fill="#0a0a0a" stroke="#27272a" />
      <circle cx="90" cy="90" r="65" fill="#0a0a0a" stroke="#27272a" />
      <circle cx="90" cy="90" r="45" fill="#1a1115" stroke="#3f2f87" />
      <circle cx="90" cy="90" r="28" fill="#2a1a3a" stroke="#5a3fcd" />
      <circle cx="90" cy="90" r="12" fill="#836ef9" />
      <circle cx="90" cy="90" r="4" fill="#f9c152" />
    </svg>
  );
}
