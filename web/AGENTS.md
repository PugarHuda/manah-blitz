<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Manah agent rules

## Tailwind v4 — also breaking from your training
- No `tailwind.config.ts`. Theme tokens live in `src/app/globals.css` inside `@theme {}` blocks.
- `@import "tailwindcss"` (single line) replaces `@tailwind base/components/utilities`.
- Custom colors registered as `--color-{name}` in `@theme` are auto-available as `bg-{name}`, `text-{name}`, etc.

## Privy + Wagmi pairing on Monad
- `@privy-io/wagmi` provides the connector bridge — its `WagmiProvider` and `createConfig` MUST be used (not vanilla wagmi's), so embedded wallets surface as wagmi accounts.
- Wrap order in `providers.tsx`: `PrivyProvider` → `QueryClientProvider` → `WagmiProvider`.
- For Manah's `shoot()` calls, prefer `useSendTransactionSync` (Monad-specific) over `useWriteContract` — saves the receipt-poll roundtrip, critical for game feel.

## Mock vs real contract data
- All contract reads/writes are currently mocked with placeholder data.
- Search for `// TODO: wire to PanahNad.*` comments — those mark the wiring sites.
- Contract will be named `Manah` (singular Solidity contract). README still says "PanahNad" — that's stale codename.

