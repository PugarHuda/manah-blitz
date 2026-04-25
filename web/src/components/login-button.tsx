"use client";

import { useEffect, useState } from "react";
import {
  usePrivy,
  useWallets,
  useConnectWallet,
  useCreateWallet,
} from "@privy-io/react-auth";
import { useSetActiveWallet } from "@privy-io/wagmi";
import { useAccount, useBalance, useDisconnect } from "wagmi";
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

const hasPrivyConfig = Boolean(process.env.NEXT_PUBLIC_PRIVY_APP_ID);

export function LoginButton({
  className,
  variant = "primary",
}: {
  className?: string;
  variant?: "primary" | "ghost";
}) {
  if (!hasPrivyConfig) {
    return (
      <button
        disabled
        className={cn(
          "inline-flex h-12 items-center justify-center gap-2 rounded-full px-7 text-sm font-medium",
          "bg-ink-800 text-ink-400 ring-1 ring-inset ring-ink-700",
          className,
        )}
      >
        Auth disabled
      </button>
    );
  }

  return <PrivyLoginButton className={className} variant={variant} />;
}

function PrivyLoginButton({
  className,
  variant,
}: {
  className?: string;
  variant: "primary" | "ghost";
}) {
  const { ready, authenticated, login, logout, user } = usePrivy();
  const { wallets } = useWallets();
  const { connectWallet } = useConnectWallet();
  const { createWallet } = useCreateWallet();
  const { setActiveWallet } = useSetActiveWallet();
  const { address: wagmiAddress } = useAccount();
  const { disconnectAsync } = useDisconnect();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [creating, setCreating] = useState(false);

  // Address resolution priority:
  //   1. wagmi (this is the active wallet for tx signing)
  //   2. first Privy-known wallet (embedded or external)
  //   3. user.wallet (legacy field)
  // We render the pill whenever ANY of these has a value — including the
  // `connectWallet()` path which links a wallet to wagmi without setting
  // Privy's `authenticated` flag.
  // Prefer external wallets over the embedded Privy wallet — when a user has
  // both (signed in with Gmail + later connected MetaMask), they almost
  // certainly want the external one to sign because it's the funded one. Falls
  // back to the embedded wallet if no external is connected.
  const externalWallet = wallets.find((w) => w.walletClientType !== "privy");
  const embeddedWallet = wallets.find((w) => w.walletClientType === "privy");
  const active = externalWallet ?? embeddedWallet ?? wallets[0];
  const address = (wagmiAddress ?? active?.address ?? user?.wallet?.address) as
    | `0x${string}`
    | undefined;
  const connected = Boolean(address);

  // Auto-bridge: once authenticated & a wallet appears in `wallets`, ensure
  // wagmi's active connector matches what the UI surfaces. Prefer external
  // (the funded one) over the auto-created embedded.
  useEffect(() => {
    if (!authenticated || wallets.length === 0) return;
    const target = externalWallet ?? embeddedWallet ?? wallets[0];
    setActiveWallet(target).catch((err) => {
      console.warn("[manah] setActiveWallet failed:", err);
    });
  }, [authenticated, wallets, externalWallet, embeddedWallet, setActiveWallet]);

  // Auto-create embedded wallet for users who logged in but somehow don't have
  // one (e.g. existing Privy account predating Manah). Fires once.
  useEffect(() => {
    if (
      ready &&
      authenticated &&
      !creating &&
      wallets.length === 0 &&
      !user?.wallet?.address
    ) {
      setCreating(true);
      createWallet()
        .catch((err) => {
          console.warn("[manah] createWallet failed:", err);
        })
        .finally(() => setCreating(false));
    }
  }, [ready, authenticated, wallets.length, user?.wallet?.address, creating, createWallet]);

  // Expose state to console for live debugging on production.
  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as unknown as { __manah?: object }).__manah = {
        ready,
        authenticated,
        userId: user?.id,
        walletsCount: wallets.length,
        activeAddress: address,
      };
    }
  }, [ready, authenticated, user, wallets, address]);

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
          className,
        )}
      >
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading wallet…
      </button>
    );
  }

  // Privy session active but embedded wallet hasn't appeared yet. Distinct
  // from "wallet connected via connectWallet()" — that path sets `address` but
  // not `authenticated`, so it skips this branch entirely.
  if (authenticated && !connected) {
    return (
      <div className={cn("flex flex-col items-end gap-2", className)}>
        <button
          disabled
          className={cn(
            "inline-flex h-12 items-center justify-center gap-2 rounded-full px-5 text-sm font-medium",
            "bg-brand/15 text-brand-300 ring-1 ring-inset ring-brand/40",
          )}
        >
          <Loader2 className="h-4 w-4 animate-spin" />
          Creating wallet…
        </button>
        <button
          onClick={() => {
            setCreating(true);
            createWallet()
              .catch((err) => console.warn("[manah] retry createWallet:", err))
              .finally(() => setCreating(false));
          }}
          disabled={creating}
          className="text-[10px] uppercase tracking-widest text-ink-400 hover:text-ink-100"
        >
          {creating ? "trying…" : "retry"}
        </button>
      </div>
    );
  }

  if (connected && address) {
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
              : "bg-ink-800 text-ink-100 ring-1 ring-inset ring-ink-700 hover:ring-brand",
          )}
        >
          <span
            className={cn(
              "h-2 w-2 rounded-full animate-pulse-slow",
              empty ? "bg-danger" : "bg-success",
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
                              : "text-ink-300 hover:bg-ink-800",
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
              onClick={async () => {
                setOpen(false);
                // Always disconnect wagmi (covers connectWallet-only flow).
                try {
                  await disconnectAsync();
                } catch (err) {
                  console.warn("[manah] disconnect failed:", err);
                }
                // If a Privy session exists, log it out too.
                if (authenticated) {
                  await logout();
                }
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

  if (variant === "ghost") {
    return (
      <button
        onClick={() => login()}
        className={cn(
          "group inline-flex h-12 items-center justify-center gap-2 rounded-full px-7 text-sm font-medium transition",
          styles,
          className,
        )}
      >
        Sign in
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </button>
    );
  }

  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-center", className)}>
      <button
        onClick={() => login()}
        className={cn(
          "group inline-flex h-12 items-center justify-center gap-2 rounded-full px-7 text-sm font-medium transition",
          styles,
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
