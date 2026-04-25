"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { WagmiProvider as PrivyWagmiProvider, createConfig as createPrivyWagmiConfig } from "@privy-io/wagmi";
import { WagmiProvider, createConfig as createWagmiConfig } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http } from "viem";
import { monadTestnet } from "@/lib/chains";

const privyWagmiConfig = createPrivyWagmiConfig({
  chains: [monadTestnet],
  transports: { [monadTestnet.id]: http() },
});

const fallbackWagmiConfig = createWagmiConfig({
  chains: [monadTestnet],
  transports: { [monadTestnet.id]: http() },
});

const queryClient = new QueryClient();

const privyAppId = process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? "";

export function Providers({ children }: { children: React.ReactNode }) {
  // Fallback: Privy not configured. Use vanilla wagmi so the app still renders
  // (login disabled). PrivyWagmiProvider would throw — it always calls useWallets().
  if (!privyAppId) {
    if (typeof window !== "undefined") {
      console.warn(
        "[Manah] NEXT_PUBLIC_PRIVY_APP_ID is not set — auth disabled. Add it to web/.env.local."
      );
    }
    return (
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={fallbackWagmiConfig}>{children}</WagmiProvider>
      </QueryClientProvider>
    );
  }

  return (
    <PrivyProvider
      appId={privyAppId}
      config={{
        loginMethods: ["google", "email", "wallet"],
        embeddedWallets: {
          // "all-users" forces a wallet on every Privy login — even for accounts
          // that already exist in Privy from a prior, non-Manah app and never
          // had an Ethereum wallet attached.
          ethereum: { createOnLogin: "all-users" },
          showWalletUIs: false,
        },
        defaultChain: monadTestnet,
        supportedChains: [monadTestnet],
        appearance: {
          theme: "dark",
          accentColor: "#836EF9",
          logo: "/manah-mark.svg",
          showWalletLoginFirst: false,
        },
      }}
    >
      <QueryClientProvider client={queryClient}>
        <PrivyWagmiProvider config={privyWagmiConfig}>{children}</PrivyWagmiProvider>
      </QueryClientProvider>
    </PrivyProvider>
  );
}
