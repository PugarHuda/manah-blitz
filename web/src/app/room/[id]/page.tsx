"use client";

import Link from "next/link";
import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { ManahMark } from "@/components/manah-mark";
import { LoginButton } from "@/components/login-button";
import {
  ArrowLeft,
  Copy,
  Check,
  Crown,
  Users,
  Coins,
  Play,
} from "lucide-react";
import { cn } from "@/lib/cn";

const mockRoom = {
  maxPlayers: 4,
  stake: "0.1",
  host: "huda.mon",
  status: "waiting" as "waiting" | "in_progress" | "settled",
  players: [
    { name: "huda.mon", staked: true, isHost: true, you: true },
    { name: "rangga.eth", staked: true, isHost: false, you: false },
    { name: "0x9c4…12fa", staked: false, isHost: false, you: false },
  ],
};

export default function RoomPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [staked, setStaked] = useState(true);

  const totalPot = (Number(mockRoom.stake) * mockRoom.players.length).toFixed(4);
  const slotsLeft = mockRoom.maxPlayers - mockRoom.players.length;
  const allReady =
    mockRoom.players.every((p) => p.staked) &&
    mockRoom.players.length >= 2;

  function handleCopy() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    navigator.clipboard?.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <main className="relative flex flex-1 flex-col">
      <div className="bg-grid pointer-events-none absolute inset-0 opacity-30" />

      <header className="relative z-10 mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-6">
        <Link
          href="/play"
          className="flex items-center gap-2 text-ink-300 hover:text-ink-50 transition"
        >
          <ArrowLeft className="h-4 w-4" />
          <ManahMark size={24} />
          <span className="font-semibold tracking-tight">manah</span>
        </Link>
        <LoginButton variant="ghost" className="h-10 px-5" />
      </header>

      <section className="relative z-10 mx-auto w-full max-w-5xl px-6 pb-24">
        {/* Room header */}
        <div className="flex flex-col gap-4 rounded-2xl border border-ink-800 bg-ink-900/40 p-6 backdrop-blur md:flex-row md:items-end md:justify-between md:p-8">
          <div className="flex flex-col gap-3">
            <span className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-brand-400">
              <span className="h-2 w-2 rounded-full bg-brand animate-pulse-slow" />
              {mockRoom.status === "waiting"
                ? "Waiting for players"
                : mockRoom.status === "in_progress"
                ? "In progress"
                : "Settled"}
            </span>
            <h1 className="font-mono text-4xl uppercase tracking-[0.3em] text-ink-50 md:text-5xl">
              {id}
            </h1>
            <span className="text-sm text-ink-400">
              hosted by{" "}
              <span className="text-ink-100">{mockRoom.host}</span>
            </span>
          </div>

          <button
            onClick={handleCopy}
            className="inline-flex items-center justify-center gap-2 self-start rounded-full px-5 py-2.5 text-sm text-ink-200 ring-1 ring-inset ring-ink-700 hover:ring-brand transition md:self-auto"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 text-success" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                Share link
              </>
            )}
          </button>
        </div>

        {/* Stats row */}
        <div className="mt-6 grid grid-cols-3 gap-px overflow-hidden rounded-2xl bg-ink-800 ring-1 ring-ink-800">
          <Stat
            icon={<Users className="h-4 w-4" />}
            label="Players"
            value={`${mockRoom.players.length}/${mockRoom.maxPlayers}`}
          />
          <Stat
            icon={<Coins className="h-4 w-4" />}
            label="Stake"
            value={`${mockRoom.stake} MON`}
          />
          <Stat
            icon={<Crown className="h-4 w-4" />}
            label="Prize pool"
            value={`${totalPot} MON`}
            highlight
          />
        </div>

        {/* Players */}
        <div className="mt-6 rounded-2xl border border-ink-800 bg-ink-900/40 p-6 md:p-8">
          <div className="flex items-baseline justify-between">
            <h2 className="text-xs uppercase tracking-widest text-ink-400">
              Players
            </h2>
            {slotsLeft > 0 && (
              <span className="text-xs text-ink-500">
                {slotsLeft} slot{slotsLeft > 1 ? "s" : ""} left
              </span>
            )}
          </div>
          <ul className="mt-4 divide-y divide-ink-800">
            {mockRoom.players.map((p) => (
              <li
                key={p.name}
                className="flex items-center justify-between py-3.5"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      "grid h-9 w-9 place-items-center rounded-full font-mono text-sm",
                      p.you
                        ? "bg-brand/20 text-brand-300 ring-1 ring-inset ring-brand"
                        : "bg-ink-800 text-ink-300"
                    )}
                  >
                    {p.name.slice(0, 2).toUpperCase()}
                  </span>
                  <div className="flex flex-col">
                    <span className="text-sm text-ink-100">
                      {p.name}{" "}
                      {p.you && (
                        <span className="ml-1 text-xs text-brand-400">
                          you
                        </span>
                      )}
                    </span>
                    {p.isHost && (
                      <span className="flex items-center gap-1 text-xs text-ink-400">
                        <Crown className="h-3 w-3" />
                        host
                      </span>
                    )}
                  </div>
                </div>
                <span
                  className={cn(
                    "rounded-full px-3 py-1 text-xs",
                    p.staked
                      ? "bg-success/15 text-success ring-1 ring-inset ring-success/40"
                      : "bg-ink-800 text-ink-400 ring-1 ring-inset ring-ink-700"
                  )}
                >
                  {p.staked ? "staked" : "waiting…"}
                </span>
              </li>
            ))}
            {Array.from({ length: slotsLeft }).map((_, i) => (
              <li
                key={`empty-${i}`}
                className="flex items-center gap-3 py-3.5 opacity-50"
              >
                <span className="grid h-9 w-9 place-items-center rounded-full bg-ink-800/50 ring-1 ring-dashed ring-ink-700 text-xs text-ink-500">
                  ?
                </span>
                <span className="text-sm text-ink-500">empty slot</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Action bar */}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
          {!staked && (
            <button
              onClick={() => setStaked(true)}
              className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-brand text-ink-50 font-medium hover:bg-brand-600 glow-brand transition"
            >
              <Coins className="h-4 w-4" />
              Lock {mockRoom.stake} MON to join
            </button>
          )}
          <button
            disabled={!allReady}
            onClick={() => router.push(`/room/${id}/game`)}
            className={cn(
              "inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-full font-medium transition",
              allReady
                ? "bg-ink-50 text-ink-900 hover:bg-ink-200"
                : "bg-ink-800 text-ink-500 cursor-not-allowed"
            )}
          >
            <Play className="h-4 w-4" />
            {allReady
              ? "Start game"
              : `Waiting on ${
                  mockRoom.maxPlayers - mockRoom.players.length
                } more`}
          </button>
        </div>
      </section>
    </main>
  );
}

function Stat({
  icon,
  label,
  value,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1 px-5 py-5",
        highlight ? "bg-ink-900" : "bg-ink-900"
      )}
    >
      <span className="flex items-center gap-2 text-xs uppercase tracking-widest text-ink-400">
        {icon}
        {label}
      </span>
      <span
        className={cn(
          "font-mono text-2xl",
          highlight ? "text-brand-300" : "text-ink-50"
        )}
      >
        {value}
      </span>
    </div>
  );
}
