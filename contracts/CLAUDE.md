# Manah Contracts

Foundry project (Solidity 0.8.26, `via_ir = true`). Game state machine + on-chain trajectory + winner-takes-all payout.

## Files

- `src/Manah.sol` — game contract
- `src/Trig.sol` — pure sin/cos LUT (centidegrees → Q1e6), no PRBMath dep
- `test/Manah.t.sol` — 23 tests, all green
- `script/Deploy.s.sol` — single-shot deploy

## Convention

- **Units:** mm (1e-3 m) for position; mm/tick for velocity; tick = 40ms.
  - 50 ticks/shot = 2 seconds of flight integrated on-chain
  - Gravity = 9.81 m/s² → -16 mm/tick²
  - Wind = ±2 mm/tick² (≈ ±1 m/s², deterministic per shot from `prevrandao`)
- **Trig:** in-house `Trig.sol`. Inputs in centidegrees `[0, 9000]` (4500 = 45°). Outputs scaled by 1e6. 19-entry LUT @ 5° + linear interp. Audit-friendly, ~200 gas/call.
- **Shoot inputs:** `shoot(roomId, int256 angle, int256 power)` — `angle` ∈ [0, 9000] centideg, `power` ∈ [1, 10000] basis points (100% = 10000). Validated.
- **Events per shot:** 50 `TickComputed` + 1 `ArrowLanded`. The 50-event burst is part of the demo (showcases Monad throughput on MonadVision). NOT a bug — do not reduce.
- **Gas:** ~170k per `shoot()` (under README's 198k claim).
- **No external deps** beyond `forge-std`. No OZ, no PRBMath, no solidity-trigonometry — trade-off documented above.
- **Reentrancy:** CEI in `settleGame`. Single low-level call to winner; reverts if call fails.
- **Anti-AFK:** per-player 90s `TURN_TIMEOUT` enforced via `skipTurn(roomId, player)` (any caller can drain expired-clock player's arrows). Whole-game `GAME_FORFEIT_AFTER` = 10 min as escape hatch.

## Function surface

| Function | Caller | Notes |
|---|---|---|
| `createRoom(maxPlayers, stake)` payable | host | host stakes immediately, becomes player 1 |
| `joinRoom(roomId)` payable | any | auto-starts when `numPlayers == maxPlayers` |
| `startGame(roomId)` | host only | early-start ≥ MIN_PLAYERS staked |
| `shoot(roomId, angle, power)` | player | 50 TickComputed + 1 ArrowLanded |
| `skipTurn(roomId, player)` | any | requires `block.timestamp ≥ player.lastActionAt + TURN_TIMEOUT` |
| `settleGame(roomId)` | any | requires all arrows used OR `GAME_FORFEIT_AFTER` elapsed |
| `getRoom(roomId)` view | — | for FE rendering |
| `getPlayer(roomId, player)` view | — | for FE rendering |
| `pot(roomId)` view | — | convenience |

## Events (Envio HyperIndex / MonadVision)

`RoomCreated`, `PlayerJoined`, `GameStarted`, `TickComputed` (50/shot), `ArrowLanded`, `TurnSkipped`, `GameSettled`. All `roomId`-indexed.

## User contribution point

`_scoreShot(uint256 distFromBullseyeMm) → uint16` in `Manah.sol` is marked `TODO(huda)`. Currently a 5-ring step function placeholder (100/80/60/40/20). Multiple valid curves to consider — see NatSpec on the function.

## Run

```bash
cp .env.example .env                 # fill PRIVATE_KEY
forge build
forge test -vv                       # 23/23 green
forge script script/Deploy.s.sol:DeployManah \
  --rpc-url monad_testnet --broadcast --private-key $PRIVATE_KEY
```

After deploy → paste address into `web/.env.local` as `NEXT_PUBLIC_MANAH_ADDRESS`.

## Roadmap (P2)

- Pyth Entropy for wind & target seed (replaces `prevrandao`)
- Pyth Price Feeds for MON/USD display in events (or leave to FE)
- Multi-round per room (re-stake without redeploying room)
