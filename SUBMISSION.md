# Manah — Monad Blitz Jogja Submission

## Tagline

**AR-style multiplayer archery where every arrow is scored and paid out on-chain. Built for Monad's parallel execution and 800ms finality.**

## One-line summary

Login with Gmail, stake MON, take three shots at a 10-ring target, highest score wins the pot — all turn lifecycle, scoring, and settlement happens inside a single Solidity contract on Monad Testnet.

## Live links

| | |
|---|---|
| **Production** | https://manah-hudas-projects-a8e7f558.vercel.app |
| **Source code** | https://github.com/PugarHuda/manah-blitz |
| **Smart contract** | [`0x6d77b08139d9d37a2067f086cc6f7359821326cc`](https://testnet.monadexplorer.com/address/0x6d77b08139d9d37a2067f086cc6f7359821326cc) on Monad Testnet (chainId 10143) |
| **Deploy tx (proof)** | [`0xce31817c…defa3ee`](https://testnet.monadexplorer.com/tx/0xce31817c0e3057ac06ad7091e2ed7a1ef2fcafb61df180d9a0258f999defa3ee) |

## What it does

Manah is a turn-based multiplayer archery game where physics, scoring, and payouts run inside `Manah.sol`. Players sign in with Gmail (Privy embedded wallet auto-creates on Monad), open or join a room with a shared link, lock equal stakes of MON, then take three shots each at a 10-ring archery target. Each release submits an on-chain `shoot(roomId, angle, power)` transaction that emits 50 `TickComputed` events for the trajectory plus an `ArrowLanded` event with the score. When everyone has used their three arrows, any client can call `settleGame()` and the smart contract auto-transfers the entire stake pool to the highest scorer.

The frontend overlays a 2.5D HTML/SVG render with live trajectory preview, an animated nocked arrow that draws back with the player's drag, and a real-time leaderboard reading directly from the chain via wagmi multicall. After each shot, the user sees a MonadVision deep-link to inspect the 50 trajectory events that just streamed through Monad's parallel scheduler.

## Why this game only works on Monad

| | Cost / round | Latency | Verdict |
|---|---|---|---|
| Ethereum L1 | ~$300 | high | gas-prohibitive |
| Polygon, Base, Arbitrum | ~$0.05 | 2–3 s | aim → release feel breaks |
| **Monad Testnet** | **~$0.003** | **800 ms finality** | playable + verifiable |

Three architectural choices lean on Monad-specific properties:

1. **Room-isolated storage** — `mapping(uint256 roomId => Room)` means concurrent rooms touch independent storage slots. Monad's parallel scheduler runs them on different threads with no contention.
2. **50 `TickComputed` events per shot** — a single `shoot()` call integrates the full trajectory (50 ticks × 40 ms) and emits one event per tick. On any other chain this would be considered wasteful; on Monad it becomes the demo's killer visual.
3. **In-house fixed-point trig** (`contracts/src/Trig.sol`) — 19-entry sine LUT with linear interpolation, ~200 gas per call. No PRBMath dependency. Fits comfortably under Monad's gas envelope per shot at ~170k gas.

## Architecture

Four runtime layers, each independent:

```
INPUT (gesture)  →  GAME LOGIC (FSM + scoring)  →  RENDERING (HTML/SVG 2.5D)
                            ↓
                    NETWORKING (wagmi → Monad)
                            ↓
                    ON-CHAIN (Manah.sol — trust anchor)
```

- **Rendering** (`web/src/app/room/[id]/game/page.tsx`): HTML/SVG 2.5D scene with linear trajectory, perspective projection, dashed yellow prediction line, animated nocked arrow with brand purple accents.
- **Game logic** (`web/src/lib/physics.ts`): Pure-TS port of `Manah.sol`'s trajectory + scoring — practice mode runs identically to chain so player intuition transfers.
- **Networking** (`web/src/lib/hooks.ts`): wagmi v3 hooks (`useCreateRoom`, `useJoinRoom`, `useShoot`, `useRoom`, `useLeaderboard`, `useSettleGame`). `useLeaderboard` does a multicall returning every player's tuple in one batched read, refreshing every 2 seconds for live opponent scores during the match.
- **On-chain** (`contracts/src/Manah.sol`): Room lifecycle, stake escrow, on-chain trajectory integration, WA/FITA-style scoring with bullseye lock + linear falloff, AFK skip, settle-to-winner. 23 unit tests, all passing.

## Live in this build

- ✅ Privy auth (Gmail embedded + external wallet via SIWE)
- ✅ Live wallet pill with MON balance + faucet CTA on empty
- ✅ Race-safe Privy → wagmi connector bridge (eliminates "Connector not connected" errors mid-flow)
- ✅ Difficulty selector forwarded through lobby → room → game (easy / medium / hard)
- ✅ Practice mode (`/practice`) — solo, no stake, pure-TS physics
- ✅ Multiplayer game (`/room/[id]/game`) — same mechanic, on-chain stake + scoring
- ✅ Real-time on-chain leaderboard during the match (refresh 2 s)
- ✅ Auto-settle: lowest-address player triggers `settleGame()` when arrows run out — winner gets the pot automatically
- ✅ Winner banner with payout MON + MonadVision deep-link to settle tx
- ✅ MonadVision deep-link on each shot tx for transparency
- ✅ Vercel auto-deploy via Git push (no manual steps after the initial link)
- ✅ Public access (Vercel SSO disabled — anyone with the URL plays)

## Tech stack

- **Frontend**: Next.js 16 App Router (Turbopack default) · React 19 · Tailwind v4 · TypeScript
- **Auth**: Privy embedded wallet (`@privy-io/react-auth`) bridged to wagmi via `@privy-io/wagmi`
- **Chain**: wagmi v3 + viem on Monad Testnet (chainId 10143)
- **Contract**: Foundry 1.5.1, Solidity 0.8.26, `via_ir = true`, no external deps beyond `forge-std`
- **Deploy**: Vercel (Git-linked auto-deploy from `web/`) · contract deployed via `forge script` + `broadcast/` artifact in repo

## Demo flow (3 minutes)

1. Open https://manah-hudas-projects-a8e7f558.vercel.app
2. Click **Continue with Gmail** → Privy creates an embedded wallet on Monad Testnet
3. Faucet MON to the wallet from https://testnet.monad.xyz/ if balance is empty
4. Click **Browse rooms** or **Create room** with a custom stake (e.g. 0.1 MON)
5. Share the room URL — second player joins via the same flow
6. Host clicks **Start game** → on-chain tx flips room status to Active
7. Each player takes three shots: drag down to draw, release to fire
8. Live leaderboard panel (left) updates from the chain every 2 s
9. After all arrows used, the contract auto-settles → winner banner pops with payout amount + tx hash

## Roadmap (post-Blitz)

- Pyth Entropy for verifiable wind seeds (replacing `prevrandao`)
- Pyth Price Feeds for live MON/USD on stake UI
- Envio HyperIndex for sub-200 ms leaderboard subscriptions
- Authoritative Socket.IO server for real-time turn handoff (currently runs locally; needs hosting)
- WebXR plane detection for true world-anchored AR target placement (entry point already in `archery-game.ts`)
- PWA manifest for installable mobile shell
- Tournament mode with bracket elimination across rooms

## Team

| Role | Name |
|---|---|
| Frontend, Privy/wagmi integration, Vercel deploy, repo | **Pugar Huda Mantoro** ([@PugarHuda](https://github.com/PugarHuda)) |
| Three.js scene, gesture system, Socket.IO server | **Muhamad Azis** ([@mazis9651](https://github.com/mazis9651)) |

Built with Claude Opus 4.7 (1M context) as agentic pair-programmer — see commit co-authors for the conversation trail.

## License

MIT
