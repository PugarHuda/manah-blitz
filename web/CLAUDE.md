@AGENTS.md

# Manah — Web (Next.js 16 + Tailwind v4)

> **CRITICAL:** This is Next.js 16, NOT 15. Turbopack is default for both `dev` and `build`.
> `params` and `searchParams` are async (Promise) — you must `await` or `use()` them.
> Read `node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md` before adding APIs you remember from training.

## Stack

- **Next.js 16.2** App Router · React 19.2 · TypeScript 5
- **Tailwind v4** — CSS-first config via `@theme` block in `globals.css` (no `tailwind.config.ts` exists)
- **@privy-io/react-auth** + **@privy-io/wagmi** — Gmail login + embedded wallet on Monad
- **wagmi v2** + **viem** — chain reads/writes
- **@tanstack/react-query** — required peer for wagmi
- **zustand** — client game state (aim, draw, phase)
- **framer-motion** — UI transitions
- **lucide-react** — icons
- **clsx + tailwind-merge** via `cn()` in `src/lib/cn.ts`

## Run

```bash
npm install
cp .env.example .env.local         # fill NEXT_PUBLIC_PRIVY_APP_ID
npm run dev                         # http://localhost:3000 (Turbopack)
npm run build                       # production build
```

If Privy app ID is empty, `Providers` skips Privy and login is disabled — page still renders.

## Folder layout

```
src/
├── app/
│   ├── layout.tsx                  Root layout, Geist font, dark theme, <Providers>
│   ├── page.tsx                    Landing
│   ├── globals.css                 Tailwind v4 + Manah brand tokens
│   ├── play/page.tsx               /play — lobby (create + join)
│   └── room/[id]/
│       ├── page.tsx                /room/:id — wait room
│       └── game/page.tsx           /room/:id/game — pseudo-AR game
├── components/
│   ├── providers.tsx               Privy + Wagmi + ReactQuery (client)
│   ├── login-button.tsx            Privy auth CTA
│   └── manah-mark.tsx              Inline SVG logo
└── lib/
    ├── cn.ts                       className merge helper
    ├── chains.ts                   monadTestnet (chain id 10143)
    └── store.ts                    Zustand game state
```

## Brand tokens

Use Tailwind utilities — tokens are defined in `globals.css` `@theme {}`:
- `bg-brand` / `text-brand` — Monad purple `#836EF9`
- `bg-brand-{50..900}` — purple ramp
- `bg-ink-{50..900}` — neutral ramp (zinc-derived, dark stark)
- `text-target` — `#F9C152` (gold accent for hits, arrow icons)
- `text-success` / `text-danger` — green / red
- Utility classes: `glow-brand`, `bg-grid`, `bg-noise`, `animate-pulse-slow`

## Convention

- **Server Components default** — add `"use client"` only when needed (Privy, useState, event handlers)
- **No shadcn/ui** — Tailwind v4 + hackathon time pressure → hand-craft components with `cn()` instead
- **`params` is a Promise** in dynamic routes — unwrap with `use(params)` (client) or `await params` (server)
- **Mock contract calls** are marked `// TODO: wire to PanahNad.*` in code (note: contract name will be `Manah` despite README)
- **Env vars accessed from client must have `NEXT_PUBLIC_` prefix**

## Monad-specific

- Chain config: `src/lib/chains.ts` defines `monadTestnet` (id 10143)
- Public RPC: `https://testnet-rpc.monad.xyz`
- Explorer: `https://testnet.monadexplorer.com` — deep-link tx hashes for transparency
- **`useSendTransactionSync`** (Monad-specific Wagmi hook) MUST be used for `shoot()` — Monad's `eth_sendRawTransactionSync` returns receipt in one RPC roundtrip. Eliminates the 800ms+ poll-receipt lag that vanilla `useWriteContract` introduces.

## Not yet built (P2)

- Real AR scene: `@react-three/fiber` + `@react-three/xr` + WebXR fallback to `DeviceOrientation`
- PWA: `@serwist/next` manifest, service worker, install prompt
- Envio HyperIndex: GraphQL subscription for live leaderboard
- Pyth Entropy + Pyth Price Feeds integration
- `/room/[id]/result` — winner reveal + payout link
