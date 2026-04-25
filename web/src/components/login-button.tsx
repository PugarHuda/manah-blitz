"use client";

import { usePrivy } from "@privy-io/react-auth";
import { cn } from "@/lib/cn";
import { ArrowRight, Loader2 } from "lucide-react";

export function LoginButton({
  className,
  variant = "primary",
}: {
  className?: string;
  variant?: "primary" | "ghost";
}) {
  const { ready, authenticated, login, logout, user } = usePrivy();

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

  if (authenticated) {
    const email = user?.email?.address ?? user?.google?.email;
    const short =
      email ??
      (user?.wallet?.address
        ? `${user.wallet.address.slice(0, 6)}…${user.wallet.address.slice(-4)}`
        : "signed in");
    return (
      <button
        onClick={() => logout()}
        className={cn(
          "inline-flex h-12 items-center justify-center gap-2 rounded-full px-6 text-sm font-medium",
          "bg-ink-800 text-ink-100 ring-1 ring-inset ring-ink-700 hover:ring-brand transition",
          className
        )}
      >
        <span className="h-2 w-2 rounded-full bg-success animate-pulse-slow" />
        {short}
      </button>
    );
  }

  const styles =
    variant === "primary"
      ? "bg-brand text-ink-50 hover:bg-brand-600 glow-brand"
      : "bg-transparent text-ink-100 ring-1 ring-inset ring-ink-700 hover:ring-brand";

  return (
    <button
      onClick={() => login()}
      className={cn(
        "group inline-flex h-12 items-center justify-center gap-2 rounded-full px-7 text-sm font-medium transition",
        styles,
        className
      )}
    >
      Continue with Gmail
      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
    </button>
  );
}
