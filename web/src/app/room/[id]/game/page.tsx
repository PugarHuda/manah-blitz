"use client";

import Link from "next/link";
import { use, useState } from "react";
import { useGameStore } from "@/lib/store";
import { ManahMark } from "@/components/manah-mark";
import { ArrowLeft, Pause, Play, Timer, Wifi } from "lucide-react";
import { cn } from "@/lib/cn";

export default function GamePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const aimAngle = useGameStore((s) => s.aimAngle);
  const drawPower = useGameStore((s) => s.drawPower);
  const phase = useGameStore((s) => s.phase);
  const setPower = useGameStore((s) => s.setPower);
  const setPhase = useGameStore((s) => s.setPhase);

  const [arrowsLeft, setArrowsLeft] = useState(3);
  const [score, setScore] = useState(0);

  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden bg-black">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full touch-none" />

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/55 via-transparent to-black/55" />

      <div className="relative z-10 flex items-start justify-between px-5 pt-5">
        <Link
          href={`/room/${id}`}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-ink-100 ring-1 ring-inset ring-white/10 backdrop-blur"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>

        <div className="flex flex-col items-center gap-1 rounded-2xl bg-black/40 px-5 py-2.5 ring-1 ring-inset ring-white/10 backdrop-blur">
          <span className="text-[10px] uppercase tracking-[0.2em] text-ink-400">room</span>
          <span className="font-mono text-sm uppercase tracking-[0.2em] text-ink-50">{id}</span>
        </div>

        <div className="flex h-10 items-center gap-2 rounded-full bg-black/40 px-3 ring-1 ring-inset ring-white/10 backdrop-blur">
          {Array.from({ length: 3 }).map((_, i) => (
            <span
              key={i}
              className={cn(
                "h-2.5 w-2.5 rounded-full transition",
                i < (myPlayer?.arrowsLeft ?? 0) ? "bg-target" : "bg-ink-700"
              )}
            />
          ))}
        </div>
      </div>

      <div className="absolute left-5 right-5 top-20 z-10 rounded-2xl bg-black/40 p-3 ring-1 ring-inset ring-white/10 backdrop-blur">
        <div className="flex items-center justify-between gap-3 text-xs text-ink-300">
          <div className="flex items-center gap-2">
            <Wifi className="h-3.5 w-3.5" />
            <span className="font-mono uppercase">{serverUrl}</span>
          </div>
          <div className="flex items-center gap-2">
            <Timer className="h-3.5 w-3.5" />
            <span className="font-mono">{state ? `${Math.ceil(state.timeLeft)}s` : "--"}</span>
          </div>
        </div>
        <div className="mt-2 flex items-center justify-between text-xs uppercase tracking-widest text-ink-400">
          <span>phase: {state?.turnPhase ?? "idle"}</span>
          <span>current: {currentPlayer?.id ?? "-"}</span>
        </div>
        {error ? <p className="mt-2 text-xs text-red-300">{error}</p> : null}
      </div>

      <div className="relative z-10 mt-auto mx-auto mb-8 flex w-full max-w-md flex-col items-center gap-3 px-5">
        <div className="flex w-full items-center gap-2">
          {DIFFICULTY_OPTIONS.map((option) => (
            <button
              key={option}
              onClick={() => setDifficulty(option)}
              className={cn(
                "h-10 flex-1 rounded-xl text-xs uppercase tracking-widest ring-1 ring-inset transition",
                difficulty === option
                  ? "bg-brand/30 text-ink-50 ring-brand"
                  : "bg-black/40 text-ink-400 ring-white/10 hover:text-ink-200"
              )}
            >
              {option}
            </button>
          ))}
        </div>

        <div className="h-2 w-full overflow-hidden rounded-full bg-ink-800 ring-1 ring-inset ring-ink-700">
          <div
            className="h-full bg-gradient-to-r from-brand-700 via-brand to-target transition-[width]"
            style={{ width: `${power * 100}%` }}
          />
        </div>

        <button
          onPointerDown={() => {
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
          onPointerUp={() => {
            const power = useGameStore.getState().drawPower;
            setPhase("released");
            // TODO: wire to PanahNad.shoot(roomId, angle, power)
            setTimeout(() => {
              const hit = power > 0.4 && power < 0.95;
              const points = hit ? Math.round(50 + power * 50) : 0;
              setScore((s) => s + points);
              setArrowsLeft((a) => Math.max(0, a - 1));
              setPower(0);
              setPhase("idle");
            }, 700);
          }}
          disabled={arrowsLeft === 0 || phase === "released"}
          className={cn(
            "inline-flex h-16 w-full select-none items-center justify-center gap-2 rounded-2xl text-sm font-medium uppercase tracking-[0.2em] transition",
            "bg-brand text-ink-50 hover:bg-brand-600 glow-brand"
          )}
        >
          {arrowsLeft === 0
            ? "Out of arrows"
            : phase === "drawing"
            ? "Hold…"
            : phase === "released"
            ? "Resolving on-chain…"
            : "Hold to draw · release to fire"}
        </button>
      </div>
    </main>
  );
}
