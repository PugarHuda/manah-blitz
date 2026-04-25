"use client";

import Link from "next/link";
import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { formatEther } from "viem";
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
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/cn";
import {
  useRoom,
  useJoinRoom,
  useStartGame,
  parseRoom,
  type RoomTuple,
} from "@/lib/hooks";
import { manahDeployed, RoomStatus, MANAH } from "@/lib/manah";

const mockRoom = {
  host: "huda.mon" as const,
  maxPlayers: 4,
  stake: "0.1",
  players: [
    { name: "huda.mon", staked: true, isHost: true, you: true },
    { name: "rangga.eth", staked: true, isHost: false, you: false },
    { name: "0x9c4…12fa", staked: false, isHost: false, you: false },
  ],
};

function shortenAddress(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export default function RoomPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  const { address } = useAccount();
  const roomIdBig = (() => {
    try {
      return BigInt(id);
    } catch {
      return undefined;
    }
  })();

  const { data: roomTuple } = useRoom(roomIdBig);
  const room = parseRoom(roomTuple as RoomTuple | undefined);
  const join = useJoinRoom();
  const start = useStartGame();

  // Derive display data from contract when available, mock otherwise.
  const useReal = manahDeployed && room !== undefined;

  const display = useReal
    ? {
        host: room.host,
        hostName: shortenAddress(room.host),
        maxPlayers: room.maxPlayers,
        stake: formatEther(room.stake),
        status:
          room.status === RoomStatus.Active
            ? "in_progress"
            : room.status === RoomStatus.Settled
              ? "settled"
              : "waiting",
        players: room.players.map((p) => ({
          address: p,
          name: shortenAddress(p),
          isHost: p.toLowerCase() === room.host.toLowerCase(),
          you: address ? p.toLowerCase() === address.toLowerCase() : false,
          staked: true, // on-chain: present in players[] means already staked
        })),
      }
    : {
        host: undefined,
        hostName: mockRoom.host,
        maxPlayers: mockRoom.maxPlayers,
        stake: mockRoom.stake,
        status: "waiting" as "waiting" | "in_progress" | "settled",
        players: mockRoom.players.map((p) => ({
          address: undefined,
          name: p.name,
          isHost: p.isHost,
          you: p.you,
          staked: p.staked,
        })),
      };

  const totalPot = (Number(display.stake) * display.players.length).toFixed(4);
  const slotsLeft = display.maxPlayers - display.players.length;
  const youJoined = useReal
    ? display.players.some((p) => p.you)
    : true; // mock path: assume joined
  const youAreHost = useReal
    ? Boolean(address && room?.host.toLowerCase() === address.toLowerCase())
    : true; // mock path: pretend you're host
  const allReady =
    display.players.every((p) => p.staked) &&
    display.players.length >= MANAH.MIN_PLAYERS;

  function handleCopy() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    navigator.clipboard?.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  function handleJoin() {
    if (!roomIdBig || !room) return;
    join.joinRoom(roomIdBig, room.stake);
  }

  function handleStart() {
    if (useReal && roomIdBig) {
      start.startGame(roomIdBig);
      // Navigation happens after status flips Active (via refetch poll).
    } else {
      router.push(`/room/${id}/game`);
    }
  }

  // Auto-navigate to /game when room becomes Active (e.g. after start tx).
  if (useReal && room?.status === RoomStatus.Active && typeof window !== "undefined") {
    router.push(`/room/${id}/game`);
  }

  const joining = join.isPending || join.isConfirming;
  const starting = start.isPending || start.isConfirming;

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
        <div className="flex flex-col gap-4 rounded-2xl border border-ink-800 bg-ink-900/40 p-6 backdrop-blur md:flex-row md:items-end md:justify-between md:p-8">
          <div className="flex flex-col gap-3">
            <span className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-brand-400">
              <span className="h-2 w-2 rounded-full bg-brand animate-pulse-slow" />
              {display.status === "waiting"
                ? "Waiting for players"
                : display.status === "in_progress"
                  ? "In progress"
                  : "Settled"}
            </span>
            <h1 className="font-mono text-4xl uppercase tracking-[0.3em] text-ink-50 md:text-5xl">
              {id}
            </h1>
            <span className="text-sm text-ink-400">
              hosted by{" "}
              <span className="text-ink-100">{display.hostName}</span>
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

        <div className="mt-6 grid grid-cols-3 gap-px overflow-hidden rounded-2xl bg-ink-800 ring-1 ring-ink-800">
          <Stat
            icon={<Users className="h-4 w-4" />}
            label="Players"
            value={`${display.players.length}/${display.maxPlayers}`}
          />
          <Stat
            icon={<Coins className="h-4 w-4" />}
            label="Stake"
            value={`${display.stake} MON`}
          />
          <Stat
            icon={<Crown className="h-4 w-4" />}
            label="Prize pool"
            value={`${totalPot} MON`}
            highlight
          />
        </div>

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
            {display.players.map((p) => (
              <li
                key={p.address ?? p.name}
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

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
          {!youJoined && useReal && (
            <button
              onClick={handleJoin}
              disabled={joining}
              className={cn(
                "inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-full font-medium transition",
                joining
                  ? "bg-ink-700 text-ink-300 cursor-wait"
                  : "bg-brand text-ink-50 hover:bg-brand-600 glow-brand"
              )}
            >
              {joining ? <Loader2 className="h-4 w-4 animate-spin" /> : <Coins className="h-4 w-4" />}
              {join.isPending
                ? "Confirm in wallet…"
                : join.isConfirming
                  ? "Locking stake…"
                  : `Lock ${display.stake} MON to join`}
            </button>
          )}
          {(!useReal || youAreHost) && (
            <button
              disabled={!allReady || starting}
              onClick={handleStart}
              className={cn(
                "inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-full font-medium transition",
                allReady && !starting
                  ? "bg-ink-50 text-ink-900 hover:bg-ink-200"
                  : "bg-ink-800 text-ink-500 cursor-not-allowed"
              )}
            >
              {starting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              {starting
                ? "Starting on-chain…"
                : allReady
                  ? "Start game"
                  : `Waiting on ${
                      display.maxPlayers - display.players.length
                    } more`}
            </button>
          )}
        </div>

        {(join.error || start.error) && (
          <p className="mt-3 text-xs text-danger">
            {(join.error ?? start.error)?.message.slice(0, 140)}
          </p>
        )}
        {!manahDeployed && (
          <p className="mt-3 text-[11px] text-ink-500">
            Showing mock state — set{" "}
            <span className="font-mono text-ink-300">NEXT_PUBLIC_MANAH_ADDRESS</span>{" "}
            after `forge script Deploy.s.sol` to wire live data.
          </p>
        )}
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
    <div className="flex flex-col gap-1 bg-ink-900 px-5 py-5">
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
