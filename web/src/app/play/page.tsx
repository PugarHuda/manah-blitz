"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { parseEther, decodeEventLog } from "viem";
import { useWaitForTransactionReceipt } from "wagmi";
import { ManahMark } from "@/components/manah-mark";
import { LoginButton } from "@/components/login-button";
import { ArrowLeft, ArrowRight, Plus, Users, Coins, Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { useCreateRoom, useJoinRoom } from "@/lib/hooks";
import { manahAbi, manahDeployed } from "@/lib/manah";

const presets = [
  { players: 2, stake: "0.05", label: "Duel" },
  { players: 4, stake: "0.1", label: "Squad" },
  { players: 8, stake: "0.05", label: "Free for all" },
];

const mockOpenRooms = [
  { id: "mn4k2x", players: 2, max: 4, stake: "0.1", host: "rangga.eth" },
  { id: "mn8p3a", players: 5, max: 8, stake: "0.05", host: "0x9c4…12fa" },
  { id: "mnq7zz", players: 1, max: 2, stake: "0.5", host: "huda.mon" },
];

export default function PlayPage() {
  const router = useRouter();
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [stake, setStake] = useState("0.1");
  const [joinId, setJoinId] = useState("");

  const create = useCreateRoom();
  const { data: createReceipt } = useWaitForTransactionReceipt({ hash: create.hash });

  // After createRoom confirms, parse RoomCreated event from logs to get the new roomId.
  useEffect(() => {
    if (!createReceipt?.logs) return;
    for (const log of createReceipt.logs) {
      try {
        const decoded = decodeEventLog({
          abi: manahAbi,
          data: log.data,
          topics: log.topics,
        });
        if (decoded.eventName === "RoomCreated") {
          const roomId = (decoded.args as { roomId: bigint }).roomId.toString();
          router.push(`/room/${roomId}`);
          return;
        }
      } catch {
        // Not our event, ignore.
      }
    }
  }, [createReceipt, router]);

  function handleCreate() {
    if (!manahDeployed) {
      // Mock path until contract address is wired in .env.local.
      const fakeId = Math.random().toString(36).slice(2, 8);
      router.push(`/room/${fakeId}`);
      return;
    }
    let stakeWei: bigint;
    try {
      stakeWei = parseEther(stake);
    } catch {
      console.error("[manah] invalid stake:", stake);
      return;
    }
    if (stakeWei === 0n) return;
    create.createRoom(maxPlayers, stakeWei);
  }

  const creating = create.isPending || create.isConfirming;
  const createBtnLabel = create.isPending
    ? "Confirm in wallet…"
    : create.isConfirming
      ? "Locking stake on-chain…"
      : "Create room";

  return (
    <main className="relative flex flex-1 flex-col">
      <div className="bg-grid pointer-events-none absolute inset-0 opacity-30" />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[320px]"
        style={{
          background:
            "radial-gradient(50% 50% at 50% 0%, rgba(131,110,249,0.18) 0%, transparent 70%)",
        }}
      />

      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <Link
          href="/"
          className="flex items-center gap-2 text-ink-300 hover:text-ink-50 transition"
        >
          <ArrowLeft className="h-4 w-4" />
          <ManahMark size={24} />
          <span className="font-semibold tracking-tight">manah</span>
        </Link>
        <LoginButton variant="ghost" className="h-10 px-5" />
      </header>

      <section className="relative z-10 mx-auto w-full max-w-6xl px-6 pt-6 pb-24">
        <div className="flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-ink-400">
          <span className="h-px w-8 bg-ink-700" />
          Lobby
        </div>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">
          Pick a room. Or open one.
        </h1>

        <div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr_1fr]">
          {/* Create */}
          <div className="rounded-2xl border border-ink-800 bg-ink-900/50 p-6 backdrop-blur md:p-8">
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-brand-400">
              <Plus className="h-4 w-4" />
              Create room
            </div>
            <h2 className="mt-3 text-2xl font-medium tracking-tight">
              Set the stake. Set the size.
            </h2>

            {/* Presets */}
            <div className="mt-6 grid grid-cols-3 gap-2">
              {presets.map((p) => {
                const active =
                  p.players === maxPlayers && p.stake === stake;
                return (
                  <button
                    key={p.label}
                    onClick={() => {
                      setMaxPlayers(p.players);
                      setStake(p.stake);
                    }}
                    className={cn(
                      "flex flex-col items-start gap-1 rounded-xl px-4 py-3 text-left transition",
                      active
                        ? "bg-brand/15 ring-1 ring-inset ring-brand text-ink-50"
                        : "bg-ink-800/50 ring-1 ring-inset ring-ink-700 text-ink-300 hover:ring-ink-500"
                    )}
                  >
                    <span className="text-xs uppercase tracking-widest opacity-70">
                      {p.label}
                    </span>
                    <span className="font-mono text-sm">
                      {p.players}p · {p.stake} MON
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Custom inputs */}
            <div className="mt-6 grid grid-cols-2 gap-4">
              <label className="flex flex-col gap-2">
                <span className="flex items-center gap-2 text-xs uppercase tracking-widest text-ink-400">
                  <Users className="h-3.5 w-3.5" />
                  Max players
                </span>
                <input
                  type="number"
                  min={2}
                  max={8}
                  value={maxPlayers}
                  onChange={(e) =>
                    setMaxPlayers(
                      Math.max(2, Math.min(8, Number(e.target.value) || 2))
                    )
                  }
                  className="rounded-xl bg-ink-800/70 px-4 py-3 font-mono text-lg text-ink-50 ring-1 ring-inset ring-ink-700 outline-none focus:ring-brand"
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="flex items-center gap-2 text-xs uppercase tracking-widest text-ink-400">
                  <Coins className="h-3.5 w-3.5" />
                  Stake (MON)
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={stake}
                  onChange={(e) => setStake(e.target.value)}
                  className="rounded-xl bg-ink-800/70 px-4 py-3 font-mono text-lg text-ink-50 ring-1 ring-inset ring-ink-700 outline-none focus:ring-brand"
                />
              </label>
            </div>

            <div className="mt-4 rounded-xl bg-ink-800/40 px-4 py-3 text-xs text-ink-400">
              Total pot if filled:{" "}
              <span className="font-mono text-ink-100">
                {(Number(stake) * maxPlayers).toFixed(4)} MON
              </span>{" "}
              · Winner takes all
            </div>

            <button
              onClick={handleCreate}
              disabled={creating}
              className={cn(
                "mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full font-medium transition",
                creating
                  ? "bg-ink-700 text-ink-300 cursor-wait"
                  : "bg-brand text-ink-50 hover:bg-brand-600 glow-brand"
              )}
            >
              {creating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              {createBtnLabel}
              {!creating && <ArrowRight className="h-4 w-4" />}
            </button>
            {create.error && (
              <p className="mt-3 text-xs text-danger">
                {create.error.message.slice(0, 140)}
              </p>
            )}
            {!manahDeployed && (
              <p className="mt-3 text-[11px] text-ink-500">
                Contract address not set — using mock navigation. Set{" "}
                <span className="font-mono text-ink-300">
                  NEXT_PUBLIC_MANAH_ADDRESS
                </span>{" "}
                after deploy.
              </p>
            )}
          </div>

          {/* Join */}
          <div className="flex flex-col gap-6">
            <div className="rounded-2xl border border-ink-800 bg-ink-900/50 p-6 backdrop-blur md:p-8">
              <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-brand-400">
                Join with code
              </div>
              <input
                type="text"
                placeholder="mn4k2x"
                value={joinId}
                onChange={(e) => setJoinId(e.target.value.toLowerCase().trim())}
                className="mt-4 w-full rounded-xl bg-ink-800/70 px-4 py-3 font-mono text-lg uppercase tracking-[0.3em] text-ink-50 ring-1 ring-inset ring-ink-700 outline-none focus:ring-brand placeholder:text-ink-500 placeholder:tracking-widest placeholder:normal-case"
              />
              <button
                disabled={!joinId}
                onClick={() => router.push(`/room/${joinId}`)}
                className={cn(
                  "mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full text-sm font-medium transition",
                  joinId
                    ? "bg-ink-50 text-ink-900 hover:bg-ink-200"
                    : "bg-ink-800 text-ink-500 cursor-not-allowed"
                )}
              >
                Join room
              </button>
            </div>

            <div className="rounded-2xl border border-ink-800 bg-ink-900/30 p-6 md:p-8">
              <div className="flex items-baseline justify-between">
                <h3 className="text-xs uppercase tracking-widest text-ink-400">
                  Open rooms
                </h3>
                <span className="text-[10px] uppercase tracking-widest text-ink-500">
                  via Envio
                </span>
              </div>
              <ul className="mt-4 divide-y divide-ink-800">
                {mockOpenRooms.map((room) => (
                  <li key={room.id}>
                    <Link
                      href={`/room/${room.id}`}
                      className="flex items-center justify-between py-3 transition hover:text-ink-50"
                    >
                      <div className="flex flex-col">
                        <span className="font-mono text-sm uppercase tracking-[0.2em] text-ink-100">
                          {room.id}
                        </span>
                        <span className="text-xs text-ink-500">
                          host {room.host}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-ink-300">
                        <span className="font-mono">
                          {room.players}/{room.max}
                        </span>
                        <span className="font-mono text-brand-400">
                          {room.stake} MON
                        </span>
                        <ArrowRight className="h-4 w-4 text-ink-500" />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
