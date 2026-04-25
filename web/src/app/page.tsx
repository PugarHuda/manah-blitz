import Link from "next/link";
import { ManahMark } from "@/components/manah-mark";
import { LoginButton } from "@/components/login-button";
import { ArrowUpRight } from "lucide-react";

const stats = [
  { label: "Ticks computed per shot", value: "50", unit: "on-chain" },
  { label: "Block finality", value: "800", unit: "ms" },
  { label: "Cost per round", value: "$0.003", unit: "Monad" },
];

const externalLinks = [
  { href: "https://testnet.monad.xyz/", label: "Faucet" },
  { href: "https://testnet.monadexplorer.com", label: "Explorer" },
  { href: "https://github.com", label: "GitHub" },
];

export default function Home() {
  return (
    <main className="relative flex flex-1 flex-col">
      {/* Ambient background */}
      <div className="bg-grid pointer-events-none absolute inset-0 opacity-40" />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[480px]"
        style={{
          background:
            "radial-gradient(60% 60% at 50% 0%, rgba(131,110,249,0.25) 0%, rgba(131,110,249,0.05) 35%, transparent 70%)",
        }}
      />

      {/* Top nav */}
      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <Link href="/" className="flex items-center gap-2">
          <ManahMark size={28} />
          <span className="font-semibold tracking-tight">manah</span>
          <span className="ml-1 rounded-full border border-ink-700 px-2 py-0.5 text-[10px] uppercase tracking-widest text-ink-400">
            testnet
          </span>
        </Link>
        <nav className="hidden items-center gap-7 text-sm text-ink-300 md:flex">
          <Link href="/practice" className="hover:text-ink-50 transition">Practice</Link>
          <a href="#how" className="hover:text-ink-50 transition">How it works</a>
          <a href="#why" className="hover:text-ink-50 transition">Why Monad</a>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-ink-50 transition flex items-center gap-1"
          >
            GitHub <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        </nav>
        <LoginButton variant="ghost" className="hidden md:inline-flex h-10 px-5" />
      </header>

      {/* Hero */}
      <section className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 pt-12 md:pt-24">
        <div className="flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-ink-400">
          <span className="h-px w-8 bg-ink-700" />
          AR archery · Monad-native
        </div>

        <h1 className="mt-6 max-w-4xl text-5xl font-semibold leading-[1.05] tracking-tight md:text-7xl lg:text-8xl">
          Aim. Draw.{" "}
          <span className="relative inline-block">
            <span className="relative z-10 bg-gradient-to-br from-brand-300 via-brand to-brand-700 bg-clip-text text-transparent">
              Release.
            </span>
          </span>
        </h1>

        <p className="mt-8 max-w-2xl text-lg text-ink-300 md:text-xl">
          A multiplayer AR archery game where every arrow's trajectory is{" "}
          <span className="text-ink-50">computed inside the smart contract</span>.
          50 physics ticks, one block, sub-penny gas. Born on Monad — not ported.
        </p>

        <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
          <LoginButton />
          <Link
            href="/play"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full px-6 text-sm font-medium text-ink-200 ring-1 ring-inset ring-ink-700 hover:ring-brand transition"
          >
            Browse rooms
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>

        <Link
          href="/practice"
          className="mt-5 inline-flex items-center gap-1.5 text-sm text-ink-400 hover:text-brand transition w-fit"
        >
          <span className="text-ink-500">or</span>
          <span className="underline-offset-4 decoration-ink-700 group-hover:decoration-brand">
            warm up in practice mode
          </span>
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>

        {/* Stats */}
        <div className="mt-20 grid grid-cols-1 gap-px overflow-hidden rounded-2xl bg-ink-700 ring-1 ring-ink-700 sm:grid-cols-3">
          {stats.map((s) => (
            <div
              key={s.label}
              className="flex flex-col gap-2 bg-ink-900 px-6 py-7 transition hover:bg-ink-800"
            >
              <span className="text-xs uppercase tracking-widest text-ink-400">
                {s.label}
              </span>
              <span className="font-mono text-3xl text-ink-50 md:text-4xl">
                {s.value}
                <span className="ml-2 text-sm font-sans font-normal text-ink-400">
                  {s.unit}
                </span>
              </span>
            </div>
          ))}
        </div>

        {/* How it works */}
        <section id="how" className="mt-32">
          <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
            From Gmail to gold medal in six taps.
          </h2>
          <ol className="mt-10 grid grid-cols-1 gap-px overflow-hidden rounded-2xl bg-ink-700 ring-1 ring-ink-700 md:grid-cols-3">
            {[
              {
                n: "01",
                t: "Login with Gmail",
                d: "Privy spins up an embedded wallet on Monad. Zero seed phrases.",
              },
              {
                n: "02",
                t: "Stake & share",
                d: "Create a room, lock MON, send the link to friends in chat.",
              },
              {
                n: "03",
                t: "Take three shots",
                d: "Tilt to aim, swipe to draw, release to fire. Pot goes to top score.",
              },
            ].map((step) => (
              <li
                key={step.n}
                className="flex flex-col gap-3 bg-ink-900 px-7 py-8"
              >
                <span className="font-mono text-sm text-brand-400">{step.n}</span>
                <h3 className="text-xl font-medium">{step.t}</h3>
                <p className="text-sm text-ink-400 leading-relaxed">{step.d}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Why Monad */}
        <section id="why" className="mt-32">
          <div className="grid grid-cols-1 gap-12 md:grid-cols-[1fr_1.5fr]">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
                A game that{" "}
                <span className="text-brand">only Monad</span> makes economical.
              </h2>
              <p className="mt-6 text-ink-400 leading-relaxed">
                On Ethereum, a single round costs ~$300 in gas. On L2s, latency
                breaks the &quot;aim → release → hit&quot; feel. Monad's parallel
                execution + 800ms finality + sub-penny gas put on-chain physics
                in arm's reach.
              </p>
            </div>
            <div className="overflow-hidden rounded-2xl ring-1 ring-ink-700">
              <table className="w-full text-sm">
                <thead className="bg-ink-800 text-left text-ink-400">
                  <tr>
                    <th className="px-5 py-3 font-medium">Chain</th>
                    <th className="px-5 py-3 font-medium">Cost / round</th>
                    <th className="px-5 py-3 font-medium">Feel</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-800">
                  <tr className="bg-ink-900">
                    <td className="px-5 py-4">Ethereum L1</td>
                    <td className="px-5 py-4 font-mono">~$300</td>
                    <td className="px-5 py-4 text-ink-400">unplayable</td>
                  </tr>
                  <tr className="bg-ink-900">
                    <td className="px-5 py-4">Polygon · Base</td>
                    <td className="px-5 py-4 font-mono">~$0.05</td>
                    <td className="px-5 py-4 text-ink-400">2-3s lag</td>
                  </tr>
                  <tr className="bg-ink-900">
                    <td className="px-5 py-4 font-medium text-brand">Monad</td>
                    <td className="px-5 py-4 font-mono text-brand">$0.003</td>
                    <td className="px-5 py-4 text-ink-100">instant</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </section>

      {/* Footer */}
      <footer className="relative z-10 mx-auto mt-32 w-full max-w-6xl px-6 py-10">
        <div className="flex flex-col items-start justify-between gap-6 border-t border-ink-800 pt-8 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2 text-sm text-ink-400">
            <ManahMark size={20} />
            <span>Built at Monad Blitz Jogja · 2026</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-ink-400">
            {externalLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-ink-50 transition flex items-center gap-1"
              >
                {link.label}
                <ArrowUpRight className="h-3 w-3" />
              </a>
            ))}
          </div>
        </div>
      </footer>
    </main>
  );
}
