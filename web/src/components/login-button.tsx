"use client";

import { useState } from "react";
import { usePrivy, useWallets, useConnectWallet } from "@privy-io/react-auth";
import { useSetActiveWallet } from "@privy-io/wagmi";
import { useBalance } from "wagmi";
import { formatEther } from "viem";
import { cn } from "@/lib/cn";
import {
  ArrowRight,
  Loader2,
  Copy,
  Check,
  ExternalLink,
  Wallet,
  Plus,
} from "lucide-react";

export function LoginButton({
  className,
  variant = "primary",
}: {
  className?: string;
  variant?: "primary" | "ghost";
}) {
  const { ready, authenticated, login, logout, user } = usePrivy();
  const { wallets } = useWallets();
  const { connectWallet } = useConnectWallet();
  const { setActiveWallet } = useSetActiveWallet();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // The wagmi-active wallet is whichever the user last "set active". Default
  // to whatever's first connected; user can switch in the dropdown.
  const active = wallets[0];
  const address = (active?.address ?? user?.wallet?.address) as
    | `0x${string}`
    | undefined;

  const { data: balance } = useBalance({
    address,
    query: { enabled: Boolean(address), refetchInterval: 8000 },
  });

  if (!ready) {
    return (
      <button
        disabled
        className={cn(
          "inline-flex h-12 items-center justify-center gap-2 rounded-full px-7 text-sm font-medium",
          "bg-ink-800 text-ink-400 ring-1 ring-inset ring-ink-700",
          className
        )}
      >
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading wallet…
      </button>
    );
  }

  if (authenticated && address) {
    const short = `${address.slice(0, 6)}…${address.slice(-4)}`;
    const balanceMon = balance ? Number(formatEther(balance.value)).toFixed(4) : "—";
    const empty = balance && balance.value === 0n;

    function copyAddr() {
      if (!address) return;
      navigator.clipboard?.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }

    return (
      <div className={cn("relative", className)}>
        <button
          onClick={() => setOpen((o) => !o)}
          className={cn(
            "inline-flex h-12 items-center justify-center gap-2 rounded-full px-5 text-sm font-medium transition",
            empty
              ? "bg-danger/15 text-danger ring-1 ring-inset ring-danger/40 hover:ring-danger"
              : "bg-ink-800 text-ink-100 ring-1 ring-inset ring-ink-700 hover:ring-brand"
          )}
        >
          <span
            className={cn(
              "h-2 w-2 rounded-full animate-pulse-slow",
              empty ? "bg-danger" : "bg-success"
            )}
          />
          <span className="font-mono text-xs">{short}</span>
          <span className="text-xs opacity-70">·</span>
          <span className="font-mono text-xs">{balanceMon} MON</span>
        </button>

        {open && (
          <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-2xl border border-ink-700 bg-ink-900/95 p-4 backdrop-blur shadow-2xl">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-widest text-ink-400">
                Embedded wallet
              </span>
              {empty && (
                <span className="rounded-full bg-danger/20 px-2 py-0.5 text-[10px] uppercase tracking-widest text-danger">
                  empty
                </span>
              )}
            </div>
            <div className="mt-3 flex items-center gap-2 rounded-xl bg-ink-800/70 px-3 py-2.5 ring-1 ring-inset ring-ink-700">
              <span className="flex-1 break-all font-mono text-[11px] text-ink-100">
                {address}
              </span>
              <button
                onClick={copyAddr}
                className="flex h-7 w-7 items-center justify-center rounded-md text-ink-300 hover:bg-ink-700 hover:text-ink-50 transition"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-success" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs">
              <span className="text-ink-400">Balance</span>
              <span className="font-mono text-ink-100">{balanceMon} MON</span>
            </div>
            {empty && (
              <a
                href="https://testnet.monad.xyz/"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-full bg-brand text-ink-50 text-xs font-medium hover:bg-brand-600 transition"
              >
                Get MON from faucet
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
            <a
              href={`https://testnet.monadexplorer.com/address/${address}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-full text-xs text-ink-300 ring-1 ring-inset ring-ink-700 hover:ring-brand hover:text-ink-50 transition"
            >
              View on MonadVision
              <ExternalLink className="h-3 w-3" />
            </a>

            {wallets.length > 1 && (
              <div className="mt-3 border-t border-ink-800 pt-3">
                <span className="text-[10px] uppercase tracking-widest text-ink-400">
                  Switch active wallet
                </span>
                <ul className="mt-2 space-y-1">
                  {wallets.map((w) => {
                    const isActive = w.address === address;
                    return (
                      <li key={w.address}>
                        <button
                          onClick={() => setActiveWallet(w)}
                          className={cn(
                            "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-xs transition",
                            isActive
                              ? "bg-brand/15 text-brand-300"
                              : "text-ink-300 hover:bg-ink-800"
                          )}
                        >
                          <span className="font-mono">
                            {w.address.slice(0, 6)}…{w.address.slice(-4)}
                          </span>
                          <span className="text-[10px] uppercase tracking-widest opacity-70">
                            {w.walletClientType === "privy" ? "embedded" : w.walletClientType}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            <button
              onClick={() => connectWallet()}
              className="mt-2 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-full text-xs text-ink-300 ring-1 ring-inset ring-ink-700 hover:ring-brand hover:text-ink-50 transition"
            >
              <Plus className="h-3 w-3" />
              Connect another wallet
            </button>
            <button
              onClick={() => {
                setOpen(false);
                logout();
              }}
              className="mt-2 inline-flex h-9 w-full items-center justify-center text-xs text-ink-400 hover:text-danger transition"
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    );
  }

  const styles =
    variant === "primary"
      ? "bg-brand text-ink-50 hover:bg-brand-600 glow-brand"
      : "bg-transparent text-ink-100 ring-1 ring-inset ring-ink-700 hover:ring-brand";

  // Compact (header use): single button. Privy modal will surface
  // wallet/email/google options because loginMethods is configured for all.
  if (variant === "ghost") {
    return (
      <button
        onClick={() => login()}
        className={cn(
          "group inline-flex h-12 items-center justify-center gap-2 rounded-full px-7 text-sm font-medium transition",
          styles,
          className
        )}
      >
        Sign in
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </button>
    );
  }

  // Full hero CTA: two buttons side by side, wallet route is explicit.
  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-center", className)}>
      <button
        onClick={() => login()}
        className={cn(
          "group inline-flex h-12 items-center justify-center gap-2 rounded-full px-7 text-sm font-medium transition",
          styles
        )}
      >
        Continue with Gmail
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </button>
      <button
        onClick={() => connectWallet()}
        className="group inline-flex h-12 items-center justify-center gap-2 rounded-full px-6 text-sm font-medium text-ink-200 ring-1 ring-inset ring-ink-700 hover:ring-brand transition"
      >
        <Wallet className="h-4 w-4" />
        Connect wallet
      </button>
    </div>
  );
}
