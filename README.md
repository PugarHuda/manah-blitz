# 🏹 Manah

> **3D multiplayer archery on Monad. Stake MON, take three shots, winner takes the pot.**
> Built at Monad Blitz Jogja, 25 April 2026.

[![Production](https://img.shields.io/badge/live-manah--hudas--projects.vercel.app-836EF9?style=flat-square)](https://manah-hudas-projects-a8e7f558.vercel.app)
[![Monad Testnet](https://img.shields.io/badge/Monad-Testnet-836EF9?style=flat-square)](https://testnet.monadexplorer.com/address/0x6d77b08139d9d37a2067f086cc6f7359821326cc)
[![Privy](https://img.shields.io/badge/Auth-Privy-000000?style=flat-square)](https://privy.io/)
[![Built for](https://img.shields.io/badge/Built_for-Monad_Blitz_Jogja-F9C152?style=flat-square)](https://monadblitz.world/)

---

## 🌐 Live

| | |
|---|---|
| **Web app** | https://manah-hudas-projects-a8e7f558.vercel.app *(stable alias — always points to latest production, public access)* |
| **Submission writeup** | [SUBMISSION.md](./SUBMISSION.md) |
| **Smart contract** (Monad Testnet) | [`0x6d77b08139d9d37a2067f086cc6f7359821326cc`](https://testnet.monadexplorer.com/address/0x6d77b08139d9d37a2067f086cc6f7359821326cc) |
| **Source** | https://github.com/PugarHuda/manah-blitz |

---

## 🎯 What is Manah?

Manah is a **multiplayer turn-based archery game** on Monad. Log in with Gmail (Privy embedded wallet) or connect any wallet, stake MON, then take 3 shots each at a 10-ring target. Highest aggregate score wins the pot.

### Two ways to play

- **`/practice`** — solo, no stake. Pure-TS physics that mirrors `Manah.sol` 1:1, so practice scores ≈ real-game scores.
- **`/play` → create or join room** — multiplayer, on-chain stake + scoring. Each `shoot()` call emits 50 `TickComputed` events that flash on MonadVision in real time.

### Why the four-layer split?

Rendering (Three.js), simulation (delta-time physics), game logic (FSM + scoring), and networking (Socket.IO event-only) are kept in **separate modules under `web/src/game/`**. Each can be replaced or hosted differently without touching the others. The on-chain layer (`contracts/src/Manah.sol`) is the trust anchor — turn order, stakes, payouts, and scoring all happen there, regardless of what the visual layer is doing.

---

## 🏗️ Architecture (four independent layers)

```
┌──────────────────────────────────────────────────────────────────────────┐
│                            Manah Stack                                   │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  RENDERING LAYER          web/src/game/rendering-layer.ts                │
│    Three.js scene, lights, target, first-person bow (WebXR roadmap)      │
│                                                                          │
│  SIMULATION LAYER         web/src/game/simulation.ts                     │
│    Arrow physics (delta-time), gravity, collision (target + ground),     │
│    per-difficulty config (gravity / hit radius / distance)               │
│                                                                          │
│  GAME LOGIC LAYER         web/src/game/game-manager.ts                   │
│    FSM: aiming → shooting → impact → replay → next                       │
│    30 s turn timer, 2 pause tokens, WA/FITA scoring (1–10)               │
│                                                                          │
│  NETWORKING LAYER         web/src/game/network-manager.ts                │
│    Socket.IO client (event-only — no position sync). Server-authoritative│
│    timer + turn lock. Falls back to fully-local play when no server URL. │
│                                                                          │
│  ON-CHAIN LAYER           contracts/src/Manah.sol                        │
│    Room lifecycle, stake escrow, on-chain trajectory (50 ticks/shot),    │
│    bullseye-lock + linear-falloff scoring, AFK skip, settle-to-winner.   │
│                                                                          │
│  AUTH LAYER               web/src/components/providers.tsx               │
│    Privy embedded wallet (Gmail) + external wallet via @privy-io/wagmi   │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

The four runtime layers are **modular** — none mutate another's state directly. State flows: **Input (Gesture) → GameManager → Simulation → Rendering**, with the optional Networking layer broadcasting events between clients.

---

## 🧠 Why Monad?

Monad's pitch is "products the EVM has never seen before." Manah is exactly that:

| Chain | Cost / round | Feel | Verdict |
|---|---|---|---|
| Ethereum L1 | ~$300 | unplayable | gas-prohibitive |
| Polygon · Base · Arbitrum | ~$0.05 | 2–3s lag | latency kills the gesture |
| **Monad** ⭐ | **$0.003** | **800ms finality** | parallel + cheap + EVM-native |

### What makes the contract Monad-native

- **Room-isolated storage** (`mapping(roomId => Room)`) — Monad's parallel scheduler runs concurrent rooms on different threads.
- **50 `TickComputed` events per `shoot()`** — turn throughput into the demo. Watch them flash on [MonadVision](https://testnet.monadexplorer.com).
- **In-house fixed-point trig** (`contracts/src/Trig.sol`) — 19-entry sine LUT @ 5° + linear interp, ~200 gas/call. No PRBMath dep.

---

## 🎮 Gameplay

```
┌────────────────────────────────────────────────────────────┐
│  1. LOGIN                                                   │
│     Continue with Gmail → Privy creates an embedded wallet  │
│     OR Connect wallet → MetaMask / Rainbow / etc.           │
│                                                             │
│  2. PICK DIFFICULTY                                         │
│     easy   3 m · 8 m/s² gravity · 0.7 m hit radius          │
│     medium 5 m · 9.8 m/s² · 0.6 m   ← default               │
│     hard   8 m · 11 m/s² · 0.5 m                            │
│                                                             │
│  3. CREATE OR JOIN ROOM                                     │
│     Set max players (2–8) and stake. Share the room link.   │
│     All players lock the same MON amount.                   │
│                                                             │
│  4. THREE SHOTS EACH                                        │
│     30 s aiming clock → press · drag (power) · release      │
│     Arrow physics integrate over 50 ticks (40 ms each)      │
│     WA/FITA scoring (1–10) by distance from bullseye        │
│     Two pause tokens per player                             │
│                                                             │
│  5. WINNER TAKES POT                                        │
│     Highest aggregate score wins. Smart contract            │
│     auto-transfers the full stake pool.                     │
└────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Tech stack

### Web (`web/`)
- **Next.js 16** (App Router, Turbopack default) + React 19
- **Tailwind v4** (CSS-first `@theme` — no `tailwind.config.ts`)
- **Three.js** for the rendering layer (3D scene; WebXR is a roadmap item)
- **Socket.IO client** for multiplayer event sync
- **Zustand** for client UI state, **wagmi v3 + viem** for chain calls
- **Privy** for auth — embedded wallet on Gmail login, external wallets via `@privy-io/wagmi`

### Contract (`contracts/`)
- **Foundry 1.5.1**, Solidity 0.8.26 with `via_ir = true`
- No external deps beyond `forge-std` (vendored)
- 23 unit tests, all green
- Deployed to Monad Testnet at `0x6d77b08139d9d37a2067f086cc6f7359821326cc`

### Server (`server/`)
- Node.js + Socket.IO (event-driven, server-authoritative)
- Runs locally for hackathon demo: `node server/index.js`
- Production hosting: TBD (Render / Fly / Railway)

---

## 🚀 Run locally

```bash
# 1. Clone
git clone https://github.com/PugarHuda/manah-blitz.git
cd manah-blitz

# 2. Web
cd web
cp .env.example .env.local         # fill NEXT_PUBLIC_PRIVY_APP_ID and (optional) NEXT_PUBLIC_SOCKET_URL
npm install
npm run dev                         # http://localhost:3000

# 3. Contracts (separate terminal, optional)
cd contracts
cp .env.example .env                # fill PRIVATE_KEY
forge test -vv                      # 23/23 green
forge script script/Deploy.s.sol --rpc-url monad_testnet --broadcast \
  --private-key $PRIVATE_KEY        # deploys + writes broadcast/

# 4. Multiplayer server (optional — single-player works without it)
cd server
npm install
npm start                           # ws://localhost:3001
# Then set NEXT_PUBLIC_SOCKET_URL=http://localhost:3001 in web/.env.local
```

### Monad Testnet config

| | |
|---|---|
| Network | Monad Testnet |
| Chain ID | 10143 |
| RPC | https://testnet-rpc.monad.xyz |
| Currency | MON |
| Explorer | https://testnet.monadexplorer.com |
| Faucet | https://testnet.monad.xyz/ |

---

## 📜 Smart contract surface

```solidity
function createRoom(uint8 maxPlayers, uint128 stake) external payable returns (uint256 roomId);
function joinRoom(uint256 roomId) external payable;
function startGame(uint256 roomId) external;             // host or auto on full
function shoot(uint256 roomId, int256 angle, int256 power) external;
function skipTurn(uint256 roomId, address player) external;
function settleGame(uint256 roomId) external;            // payout winner, CEI
function getRoom(uint256 roomId) external view returns (...);
function previewScore(uint256 distMm) external pure returns (uint16);
```

Encoding: `angle` ∈ [0, 9000] centidegrees, `power` ∈ [1, 10000] basis points. UI converts radians/percent in `web/src/lib/manah.ts`.

### Events (room-id-indexed for Envio HyperIndex)

```solidity
event RoomCreated(uint256 indexed roomId, address indexed host, uint8 maxPlayers, uint128 stake);
event PlayerJoined(uint256 indexed roomId, address indexed player, uint8 numPlayers);
event GameStarted(uint256 indexed roomId, bytes32 targetSeed, int128 targetY, uint128 pot);
event TickComputed(uint256 indexed roomId, uint8 tickIndex, int256 x, int256 y);  // 50 per shot
event ArrowLanded(uint256 indexed roomId, address indexed player, uint8 arrowIndex, bool hit, uint256 distMm, uint16 points, uint16 newScore);
event TurnSkipped(uint256 indexed roomId, address indexed player, uint8 arrowsUsed);
event GameSettled(uint256 indexed roomId, address indexed winner, uint128 payout, uint16 winningScore);
```

**Per-shot gas:** ~170k (≈ $0.003 on Monad testnet).

---

## 🗺️ Status

### ✅ Live now

- [x] Next.js 16 web app on Vercel with Tailwind v4 brand system, Git-linked auto-deploy
- [x] **Public access** — Vercel SSO Protection disabled, anyone with the URL plays without team auth
- [x] Privy auth — three flows tested:
  - **Continue with Gmail** → embedded wallet auto-creates on Monad testnet
  - **Connect wallet** → external wallet (MetaMask/Rainbow) via SIWE
  - Live wallet pill (address + MON balance, refresh every 8 s) with empty-state faucet CTA
- [x] On-chain `Manah.sol` deployed to Monad Testnet at [`0x6d77b08…`](https://testnet.monadexplorer.com/address/0x6d77b08139d9d37a2067f086cc6f7359821326cc)
- [x] FE wired to contract via wagmi hooks (`useCreateRoom`, `useJoinRoom`, `useShoot`, `useRoom`, `useLeaderboard`, `useSettleGame`)
- [x] **Race-safe Privy → wagmi connector bridge** — every write call routes through `ensureConnector()` which awaits `setActiveWallet(wallets[0])` before submitting, eliminating the "Connector not connected" error that hit users when they clicked join immediately after sign-in
- [x] Difficulty selector (easy / medium / hard) — forwarded via URL through lobby → room → game
- [x] **Practice mode** (`/practice`) — solo HTML+SVG 2.5D scene, dashed yellow trajectory preview, animated nocked arrow, score popups, pause menu, 60 s round timer
- [x] **Multiplayer game** (`/room/[id]/game`) — same mechanic, each release submits `shoot(roomId, angle, power)` on-chain; status cycles "Confirm in wallet…" → "Streaming 50 ticks on-chain…" → MonadVision tx deep-link; arrowsLeft + score read from `usePlayer()` for chain-authoritative truth, with optimistic local sim driving the arrow animation
- [x] **Real-time on-chain leaderboard** during the match — `useLeaderboard()` does a wagmi multicall over every player address, refresh every 2 s, sorted by score with the local player highlighted; live opponent points visible while shots are mid-flight
- [x] **Auto-settle on game over** — when every player burns their three arrows, the lowest-address player automatically dispatches `settleGame()`. Other clients' calls revert (status flips to Settled on first); the contract `_recordScore` + `_payout` flow transfers the entire stake pool to the highest scorer
- [x] **Winner banner** with payout MON amount + MonadVision deep-link to the settle tx, and "You won the pot" / "Match settled" copy depending on local-player perspective
- [x] Vercel production deploy with `vercel.json` build env vars (Privy app id + contract address)
- [x] Public commit history with co-authored agentic-pair commits

### 🚧 In progress

- [ ] Three.js 3D scene with first-person bow + animated arrow flight + trajectory preview line — modules under `web/src/game/` (BowSystem, CameraManager, ArcheryGame) wired but the canvas play loop is being polished; multiplayer FE currently uses the simpler HTML/SVG 2.5D renderer for parity with Practice
- [ ] Authoritative Socket.IO multiplayer server (`server/index.js` runs locally; needs Render/Fly hosting)
- [ ] Pause / resume on-chain (contract has `skipTurn` for AFK; UI button → tx not wired)

### 🔮 P2 / Post-Blitz

- [ ] **AR mode (WebXR)** — plane detection + world-anchored target placement (`enterAR()` entry point in `archery-game.ts` exists; no UI button yet)
- [ ] PWA manifest + service worker for installable mobile shell
- [ ] Replace `prevrandao` wind seed with **Pyth Entropy** for verifiable randomness
- [ ] **Pyth Price Feeds** — live MON/USD on stake UI and payout
- [ ] **Envio HyperIndex** — sub-200ms leaderboard subscription instead of polling
- [ ] Magma — auto-stake winnings to gMON
- [ ] Tournament mode (bracket elimination across rooms)
- [ ] Apply to Monad Momentum

---

## 📁 Repo layout

```
.
├── web/                      Next.js 16 frontend (deployed to Vercel)
│   ├── src/app/              App Router routes (/, /play, /practice, /room/[id], /room/[id]/game)
│   ├── src/components/       LoginButton, Providers (Privy + Wagmi)
│   ├── src/game/             4-layer engine: rendering / simulation / manager / network
│   └── src/lib/              chains, abi, hooks, manah encoders, physics (TS port), zustand store
├── contracts/                Foundry project (Manah.sol + Trig.sol + 23 tests)
│   ├── src/                  Manah.sol, Trig.sol
│   ├── test/                 Manah.t.sol
│   ├── script/Deploy.s.sol   Single-shot deploy script
│   └── broadcast/            Deployment artifacts (proof of testnet deploy)
└── server/                   Socket.IO multiplayer server (run with `npm start`)
```

---

## 🎨 Design notes

### Why TS-mirror the Solidity physics?

Practice mode runs the trajectory in TypeScript (`web/src/lib/physics.ts`), bit-equivalent to `Manah.sol`'s `_integrateAndEmit` + `_scoreShot`. This means a player who tunes their aim in practice carries that intuition into staked play — practice scores ≈ real scores. If `Manah.sol` constants change, both must update; the source of truth is the contract.

### Why on-chain physics, not signed server results?

Server-signed scoring works but shifts trust to a backend. On-chain physics gives:

1. **Verifiability** — any observer can re-run the trajectory from `TickComputed` events.
2. **Trustlessness** — no backend key to compromise.
3. **Demo value** — 50 events per shot is a visible feature on the explorer. Monad's throughput becomes the spectacle.

### Why event-only multiplayer (no position sync)?

We send `{ direction, power }` over Socket.IO; clients re-simulate locally. No 60Hz position broadcasting, no interpolation drift. The server owns the FSM (turn, score, timer); clients are just renderers + input.

---

## 👥 Built by

| Name | Focus |
|---|---|
| **Pugar Huda Mantoro** ([@PugarHuda](https://github.com/PugarHuda)) | Frontend, Privy/wagmi integration, contract wiring, Vercel deploy, repo |
| **Muhamad Azis** ([@mazis9651](https://github.com/mazis9651)) | Three.js scene, gesture system, Socket.IO multiplayer server |

Built with [Claude Opus 4.7 (1M context)](https://claude.com/claude-code) as agentic pair-programmer — see commit co-authors for the conversation trail.

---

## 📄 License

MIT

---

## 📣 In one line

> **Manah only exists because Monad exists. On other chains it's gas-prohibitive or laggy. On Monad, it's playable.**
