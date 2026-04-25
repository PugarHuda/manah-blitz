# Manah — Monad Blitz Jogja 2026

Multiplayer AR archery game di Monad blockchain. Login Gmail → stake MON → aim → release. Trajectory dihitung on-chain.

> Repo masih nyebut "PanahNad" di README — itu codename lama. Nama produk **Manah**.

## Folder

```
.
├── web/         Next.js 16 frontend (active dev)
├── contracts/   Foundry smart contracts (belum dibuat — fase 2)
└── README.md    Spec & demo plan (perlu sweep "PanahNad" → "Manah")
```

Layout flat (bukan monorepo `packages/`) — pilihan sengaja buat hackathon speed.

## Status

| Komponen | Status |
|---|---|
| Frontend scaffold + landing + lobby + wait room | ✅ |
| Privy + Wagmi config (Monad testnet) | ✅ |
| Brand tokens (Monad purple + dark stark) | ✅ |
| Pseudo-AR game page (placeholder) | ✅ |
| Real AR scene (r3f + WebXR) | ⏳ P2 |
| `Manah.sol` smart contract | ⏳ |
| Contract deploy + verify on Monad testnet | ⏳ |
| Wire FE → real contract address | ⏳ |
| Envio HyperIndex leaderboard | ⏳ |
| PWA manifest + service worker | ⏳ |

## Order of work

Per skill `monskills:scaffold`, kontrak harusnya deploy duluan supaya FE punya address. Tapi kita pilih FE-first dengan placeholder address di env — swap pas kontrak siap. Trade-off: FE nge-mock contract reads sementara, but unblock UI work paralel.

## Lihat juga

- `web/CLAUDE.md` — frontend stack, struktur, convention
- `README.md` — full spec + demo plan + arsitektur (note: ada legacy "PanahNad")
