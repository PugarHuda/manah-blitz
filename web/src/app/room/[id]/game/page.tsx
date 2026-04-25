"use client";

import Link from "next/link";
import { use, useState } from "react";
import { useGameStore } from "@/lib/store";
import { ManahMark } from "@/components/manah-mark";
import { ArrowLeft, Camera, Crosshair, Wind } from "lucide-react";
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
    <main className="relative flex flex-1 flex-col overflow-hidden bg-black">
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
      </div>

      <div className="relative z-10 flex items-start justify-between px-5 pt-5">
        <Link
          href={`/room/${id}`}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-ink-100 ring-1 ring-inset ring-white/10 backdrop-blur"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>

        <div className="flex flex-col items-center gap-1 rounded-2xl bg-black/40 px-5 py-2.5 ring-1 ring-inset ring-white/10 backdrop-blur">
          <span className="text-[10px] uppercase tracking-[0.2em] text-ink-400">
            score
          </span>
          <span className="font-mono text-2xl text-ink-50">{score}</span>
        </div>

        <div className="flex h-10 items-center gap-2 rounded-full bg-black/40 px-3 ring-1 ring-inset ring-white/10 backdrop-blur">
          {Array.from({ length: 3 }).map((_, i) => (
            <span
              key={i}
              className={cn(
                "h-2.5 w-2.5 rounded-full transition",
                i < arrowsLeft ? "bg-target" : "bg-ink-700"
              )}
            />
          ))}
        </div>
      </div>

      <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <Crosshair className="h-10 w-10 text-brand/80" strokeWidth={1.2} />
      </div>

      <div className="mx-5 absolute bottom-32 left-0 right-0 z-10 mx-auto flex max-w-md items-center justify-between rounded-full bg-black/40 px-5 py-2.5 ring-1 ring-inset ring-white/10 backdrop-blur">
        <span className="flex items-center gap-1.5 text-xs text-ink-300">
          <Camera className="h-3.5 w-3.5" />
          <span className="font-mono">{((aimAngle * 180) / Math.PI).toFixed(0)}°</span>
        </span>
        <span className="flex items-center gap-1.5 text-xs text-ink-300">
          <Wind className="h-3.5 w-3.5" />
          <span className="font-mono">2.3 m/s NE</span>
        </span>
        <span className="font-mono text-xs uppercase tracking-widest text-ink-400">
          {phase}
        </span>
      </div>

      <div className="relative z-10 mx-auto mb-8 flex w-full max-w-md flex-col items-center gap-3 px-5">
        <div className="h-2 w-full overflow-hidden rounded-full bg-ink-800 ring-1 ring-inset ring-ink-700">
          <div
            className="h-full bg-gradient-to-r from-brand-700 via-brand to-target transition-[width]"
            style={{ width: `${drawPower * 100}%` }}
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
            arrowsLeft === 0
              ? "bg-ink-800 text-ink-500"
              : phase === "drawing"
              ? "bg-target text-ink-900 glow-brand scale-[0.99]"
              : phase === "released"
              ? "bg-brand text-ink-50"
              : "bg-brand text-ink-50 hover:bg-brand-600 glow-brand"
          )}
        >
          {arrowsLeft === 0
            ? "Out of arrows"
            : phase === "drawing"
            ? "Hold..."
            : phase === "released"
            ? "Resolving on-chain..."
            : "Hold to draw - release to fire"}
        </button>
      </div>

      <div className="pointer-events-none absolute bottom-5 left-1/2 z-10 -translate-x-1/2 rounded-full bg-black/35 px-3 py-2 text-[10px] uppercase tracking-[0.2em] text-ink-300 ring-1 ring-inset ring-white/10 backdrop-blur">
        <div className="flex items-center gap-2">
          <ManahMark size={14} />
          <span>Pseudo AR mode</span>
        </div>
      </div>
    </main>
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
