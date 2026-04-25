# Manah Contracts

Foundry project untuk smart contract `Manah` — game state machine + on-chain trajectory + winner-takes-all payout di Monad Testnet (chain id `10143`).

## Run

```bash
cp .env.example .env                 # isi PRIVATE_KEY
forge build
forge test -vv
```

## Deploy

```bash
forge script script/Deploy.s.sol:DeployManah \
  --rpc-url monad_testnet \
  --broadcast \
  --private-key $PRIVATE_KEY
```

Setelah deploy, salin alamatnya ke `web/.env.local`:

```
NEXT_PUBLIC_MANAH_ADDRESS=0x...
```

## Layout

```
src/
└── Manah.sol        Game contract (room → stake → shoot → settle)
test/
└── Manah.t.sol      Happy path + revert tests
script/
└── Deploy.s.sol     Single-shot deploy script
```

## Yang masih TODO (P2)

- Pyth Entropy integration untuk wind randomness (sekarang pakai `prevrandao`-based seed)
- Envio HyperIndex schema untuk leaderboard
- Re-stake / multi-round per room
