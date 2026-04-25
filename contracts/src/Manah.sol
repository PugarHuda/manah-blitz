// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Trig} from "./Trig.sol";

/// @title Manah — multiplayer on-chain archery for Monad
/// @notice Players stake MON, take 3 shots each. Each `shoot()` integrates a
///         50-tick trajectory entirely on-chain and emits one TickComputed
///         event per tick — turning Monad's throughput into the demo.
/// @dev    Units are millimeters and "ticks" (40ms; 50 ticks = 2s flight).
///         Velocity is mm/tick. Gravity = 9.81 m/s² ≈ 16 mm/tick².
///         Trig is performed via in-house LUT (see Trig.sol) — no PRBMath dep.
///         Wind & target seed currently come from `prevrandao`; Pyth Entropy
///         is the documented P2 upgrade (see ROADMAP in repo README).
contract Manah {
    using Trig for uint256;

    // -------------------------------------------------------------------------
    // Physics & game tuning
    // -------------------------------------------------------------------------

    int256 public constant EYE_HEIGHT_MM = 1700;
    int256 public constant TARGET_X_MM = 30_000;
    int256 public constant TARGET_Y_MIN_MM = 1200;
    int256 public constant TARGET_Y_MAX_MM = 1800;
    uint256 public constant TARGET_RADIUS_MM = 600;

    /// @dev Max muzzle velocity in mm/tick. 50 m/s × 0.04 s/tick = 2000 mm/tick.
    int256 public constant MAX_SPEED_MM_PER_TICK = 2000;

    /// @dev Gravity in mm/tick² (negative = down). 9.81 m/s² @ 40ms tick.
    int256 public constant GRAVITY_MM_PER_TICK_SQ = -16;

    /// @dev Max wind impulse magnitude per tick² (≈ ±1 m/s² horizontal).
    int256 public constant MAX_WIND_MM_PER_TICK_SQ = 2;

    uint256 public constant TICKS_PER_SHOT = 50;
    uint8 public constant ARROWS_PER_PLAYER = 3;
    uint8 public constant MIN_PLAYERS = 2;
    uint8 public constant MAX_PLAYERS = 8;

    /// @dev Per-player turn timeout — anyone may force-skip an AFK player after this.
    uint256 public constant TURN_TIMEOUT = 90 seconds;

    /// @dev Whole-game forfeit window (escape hatch if everyone goes silent).
    uint256 public constant GAME_FORFEIT_AFTER = 10 minutes;

    /// @dev Input encodings (verified inside `shoot`).
    uint256 public constant ANGLE_MAX_CENTIDEG = 9000; // 90.00°
    uint256 public constant POWER_MAX_BP = 10_000; // 100.00%

    // -------------------------------------------------------------------------
    // Types
    // -------------------------------------------------------------------------

    enum RoomStatus {
        None,
        Waiting,
        Active,
        Settled
    }

    struct PlayerState {
        bool joined;
        uint8 arrowsUsed;
        uint16 score;
        uint64 lastActionAt;
    }

    struct Room {
        address host;
        uint8 maxPlayers;
        uint8 numPlayers;
        RoomStatus status;
        uint128 stake;
        uint64 startedAt;
        int128 targetY; // randomized at startGame, range [TARGET_Y_MIN, TARGET_Y_MAX]
        bytes32 targetSeed;
        address[] players;
    }

    // -------------------------------------------------------------------------
    // Storage
    // -------------------------------------------------------------------------

    uint256 public nextRoomId = 1;
    mapping(uint256 => Room) private rooms;
    mapping(uint256 => mapping(address => PlayerState)) private playerState;

    // -------------------------------------------------------------------------
    // Events — all room-id-indexed for Envio HyperIndex / MonadVision filters
    // -------------------------------------------------------------------------

    event RoomCreated(
        uint256 indexed roomId, address indexed host, uint8 maxPlayers, uint128 stake
    );
    event PlayerJoined(uint256 indexed roomId, address indexed player, uint8 numPlayers);
    event GameStarted(uint256 indexed roomId, bytes32 targetSeed, int128 targetY, uint128 pot);

    /// @notice One emitted PER tick of the on-chain trajectory. 50 per shot.
    event TickComputed(uint256 indexed roomId, uint8 tickIndex, int256 x, int256 y);

    event ArrowLanded(
        uint256 indexed roomId,
        address indexed player,
        uint8 arrowIndex,
        bool hit,
        uint256 distFromBullseyeMm,
        uint16 pointsAwarded,
        uint16 newScore
    );
    event TurnSkipped(uint256 indexed roomId, address indexed player, uint8 arrowsUsed);
    event GameSettled(
        uint256 indexed roomId, address indexed winner, uint128 payout, uint16 winningScore
    );

    // -------------------------------------------------------------------------
    // Errors
    // -------------------------------------------------------------------------

    error InvalidStake();
    error InvalidPlayerCount();
    error RoomNotJoinable();
    error RoomNotActive();
    error RoomFull();
    error AlreadyJoined();
    error NotAPlayer();
    error WrongStakeAmount();
    error NotAuthorized();
    error NotEnoughPlayers();
    error NoArrowsLeft();
    error AngleOutOfRange();
    error PowerOutOfRange();
    error GameNotOver();
    error TurnNotExpired();
    error PayoutFailed();

    // -------------------------------------------------------------------------
    // Room lifecycle
    // -------------------------------------------------------------------------

    /// @notice Open a room and stake. Caller becomes host AND first player.
    function createRoom(uint8 maxPlayers, uint128 stake) external payable returns (uint256 roomId) {
        if (stake == 0) revert InvalidStake();
        if (maxPlayers < MIN_PLAYERS || maxPlayers > MAX_PLAYERS) revert InvalidPlayerCount();
        if (msg.value != stake) revert WrongStakeAmount();

        roomId = nextRoomId++;
        Room storage r = rooms[roomId];
        r.host = msg.sender;
        r.maxPlayers = maxPlayers;
        r.stake = stake;
        r.status = RoomStatus.Waiting;
        r.players.push(msg.sender);
        r.numPlayers = 1;

        playerState[roomId][msg.sender] =
            PlayerState({joined: true, arrowsUsed: 0, score: 0, lastActionAt: 0});

        emit RoomCreated(roomId, msg.sender, maxPlayers, stake);
        emit PlayerJoined(roomId, msg.sender, 1);
    }

    /// @notice Join an open room with the matching stake.
    function joinRoom(uint256 roomId) external payable {
        Room storage r = rooms[roomId];
        if (r.status != RoomStatus.Waiting) revert RoomNotJoinable();
        if (r.numPlayers >= r.maxPlayers) revert RoomFull();
        if (msg.value != r.stake) revert WrongStakeAmount();

        PlayerState storage ps = playerState[roomId][msg.sender];
        if (ps.joined) revert AlreadyJoined();

        ps.joined = true;
        r.players.push(msg.sender);
        unchecked {
            r.numPlayers += 1;
        }

        emit PlayerJoined(roomId, msg.sender, r.numPlayers);

        if (r.numPlayers == r.maxPlayers) {
            _start(roomId, r);
        }
    }

    /// @notice Host may start before the room is full (≥ MIN_PLAYERS staked).
    function startGame(uint256 roomId) external {
        Room storage r = rooms[roomId];
        if (r.status != RoomStatus.Waiting) revert RoomNotJoinable();
        if (msg.sender != r.host) revert NotAuthorized();
        if (r.numPlayers < MIN_PLAYERS) revert NotEnoughPlayers();
        _start(roomId, r);
    }

    function _start(uint256 roomId, Room storage r) internal {
        r.status = RoomStatus.Active;
        r.startedAt = uint64(block.timestamp);

        // Seed the target Y position once per game. Same target for all players
        // in this room → fair across the field.
        bytes32 seed = keccak256(
            abi.encodePacked(blockhash(block.number - 1), block.prevrandao, roomId, address(this))
        );
        r.targetSeed = seed;
        uint256 span = uint256(TARGET_Y_MAX_MM - TARGET_Y_MIN_MM + 1);
        r.targetY = int128(TARGET_Y_MIN_MM + int256(uint256(seed) % span));

        // Initialize each player's turn clock.
        uint64 now64 = uint64(block.timestamp);
        for (uint256 i = 0; i < r.players.length; i++) {
            playerState[roomId][r.players[i]].lastActionAt = now64;
        }

        emit GameStarted(roomId, seed, r.targetY, r.stake * uint128(r.numPlayers));
    }

    // -------------------------------------------------------------------------
    // Shoot — the hot path. Trig + 50-tick integration on-chain.
    // -------------------------------------------------------------------------

    /// @notice Fire one arrow.
    /// @param roomId Room to shoot in
    /// @param angle  Launch angle in centidegrees, range [0, 9000] (0°–90°)
    /// @param power  Draw strength in basis points, range [1, 10000] (0.01%–100%)
    /// @dev Trig is computed on-chain via Trig.sol. Trajectory is integrated
    ///      for TICKS_PER_SHOT and emits TickComputed each step. Hit detection
    ///      happens at the target plane (x crosses TARGET_X_MM).
    function shoot(uint256 roomId, int256 angle, int256 power) external {
        Room storage r = rooms[roomId];
        if (r.status != RoomStatus.Active) revert RoomNotActive();

        PlayerState storage ps = playerState[roomId][msg.sender];
        if (!ps.joined) revert NotAPlayer();
        if (ps.arrowsUsed >= ARROWS_PER_PLAYER) revert NoArrowsLeft();

        if (angle < 0 || uint256(angle) > ANGLE_MAX_CENTIDEG) revert AngleOutOfRange();
        if (power <= 0 || uint256(power) > POWER_MAX_BP) revert PowerOutOfRange();

        uint8 arrowIndex = ps.arrowsUsed;
        unchecked {
            ps.arrowsUsed = arrowIndex + 1;
        }
        ps.lastActionAt = uint64(block.timestamp);

        // -- Initial velocity from angle/power.
        // speed (mm/tick) = MAX_SPEED * power / 10000
        int256 speed = (MAX_SPEED_MM_PER_TICK * power) / int256(POWER_MAX_BP);
        // vx = speed * cos(angle) / 1e6,  vy = speed * sin(angle) / 1e6
        int256 vx = (speed * Trig.cosCentideg(uint256(angle))) / Trig.ONE;
        int256 vy = (speed * Trig.sinCentideg(uint256(angle))) / Trig.ONE;

        int256 wind = _sampleWind(roomId, msg.sender, arrowIndex);

        // -- Integrate. Emit TickComputed each step.
        (bool hit, int256 landingY) =
            _integrateAndEmit(roomId, vx, vy, wind, int256(int128(r.targetY)));

        // -- Score.
        uint256 dist;
        uint16 points;
        if (!hit) {
            dist = TARGET_RADIUS_MM + 1; // out-of-band marker for "miss"
            points = 0;
        } else {
            int256 dy = landingY - int256(int128(r.targetY));
            dist = dy >= 0 ? uint256(dy) : uint256(-dy);
            points = _scoreShot(dist);
        }

        unchecked {
            ps.score += points;
        }

        emit ArrowLanded(roomId, msg.sender, arrowIndex, hit, dist, points, ps.score);
    }

    /// @dev Semi-implicit Euler integration. ALWAYS emits all TICKS_PER_SHOT
    ///      events — the README pitch leans on "50 events flash on the explorer
    ///      per arrow" as the demo's killer visual. We lock landing on plane
    ///      crossing but keep emitting so the post-impact arc is recorded too.
    /// @return hit       Arrow crossed target plane within TARGET_RADIUS
    /// @return landingY  Interpolated Y at x = TARGET_X (0 if never reached)
    function _integrateAndEmit(uint256 roomId, int256 vx0, int256 vy0, int256 wind, int256 targetY)
        internal
        returns (bool hit, int256 landingY)
    {
        int256 vx = vx0;
        int256 vy = vy0;
        int256 x = 0;
        int256 y = EYE_HEIGHT_MM;
        bool resolved;

        for (uint256 i = 0; i < TICKS_PER_SHOT; i++) {
            vy += GRAVITY_MM_PER_TICK_SQ;
            vx += wind;

            int256 prevX = x;
            int256 prevY = y;
            x += vx;
            y += vy;

            emit TickComputed(roomId, uint8(i), x, y);

            if (resolved) continue; // already resolved, just keep emitting

            // Crossed target plane this tick — interpolate landing Y.
            if (prevX < TARGET_X_MM && x >= TARGET_X_MM) {
                int256 dx = x - prevX;
                int256 t = TARGET_X_MM - prevX;
                landingY = dx == 0 ? y : prevY + ((y - prevY) * t) / dx;
                int256 dy = landingY - targetY;
                // forge-lint: disable-next-line(unsafe-typecast)
                uint256 absDy = dy >= 0 ? uint256(dy) : uint256(-dy);
                hit = absDy <= TARGET_RADIUS_MM;
                resolved = true;
            } else if (y <= 0 && x < TARGET_X_MM) {
                // Hit ground before reaching target.
                hit = false;
                landingY = 0;
                resolved = true;
            }
        }
    }

    /// @dev Deterministic wind in [-MAX_WIND, +MAX_WIND] mm/tick² for this shot.
    ///      Replace with Pyth Entropy in P2 (see CLAUDE.md).
    function _sampleWind(uint256 roomId, address player, uint8 arrowIndex)
        internal
        view
        returns (int256)
    {
        uint256 seed = uint256(
            keccak256(
                abi.encodePacked(
                    block.prevrandao, blockhash(block.number - 1), roomId, player, arrowIndex
                )
            )
        );
        uint256 span = uint256(MAX_WIND_MM_PER_TICK_SQ * 2 + 1);
        // forge-lint: disable-next-line(unsafe-typecast)
        return int256(seed % span) - MAX_WIND_MM_PER_TICK_SQ;
    }

    // -------------------------------------------------------------------------
    // Scoring — USER CONTRIBUTION POINT
    // -------------------------------------------------------------------------

    /// @dev Bullseye lock-in zone — anything within this radius scores MAX_POINTS.
    ///      Gives the satisfying "GOLD!" callout on near-perfect shots without
    ///      demanding sub-mm precision (which the integer integrator can't honor).
    uint256 public constant BULLSEYE_LOCK_MM = 50;

    /// @dev Maximum points awarded per arrow (bullseye).
    uint16 public constant MAX_POINTS = 100;

    /// @notice Public view of the scoring curve. Useful for FE preview UI
    ///         ("expected ~80 pts at this aim") and for off-chain audit.
    function previewScore(uint256 distFromBullseyeMm) external pure returns (uint16) {
        return _scoreShot(distFromBullseyeMm);
    }

    /// @notice Convert distance-from-bullseye (mm) into points awarded.
    /// @dev    Curve: linear falloff with a bullseye lock-in zone.
    ///           dist ≤ BULLSEYE_LOCK_MM (50mm)            → MAX_POINTS (100)
    ///           BULLSEYE_LOCK_MM < dist ≤ TARGET_RADIUS_MM → linear 100→0
    ///           dist > TARGET_RADIUS_MM                    → 0 (miss)
    ///         Pure & deterministic — replayable from shot inputs alone.
    function _scoreShot(uint256 distFromBullseyeMm) internal pure returns (uint16 points) {
        if (distFromBullseyeMm > TARGET_RADIUS_MM) return 0;
        if (distFromBullseyeMm <= BULLSEYE_LOCK_MM) return MAX_POINTS;
        // Linear from MAX_POINTS at dist=BULLSEYE_LOCK_MM to 0 at dist=TARGET_RADIUS_MM.
        uint256 span = TARGET_RADIUS_MM - BULLSEYE_LOCK_MM;
        uint256 falloff = distFromBullseyeMm - BULLSEYE_LOCK_MM;
        // points = MAX_POINTS * (span - falloff) / span
        return uint16((uint256(MAX_POINTS) * (span - falloff)) / span);
    }

    // -------------------------------------------------------------------------
    // Anti-AFK
    // -------------------------------------------------------------------------

    /// @notice Burn one arrow of a player who hasn't acted in TURN_TIMEOUT.
    ///         Anyone may call. Lets settlement proceed without a stalled player.
    /// @dev    Does NOT advance `lastActionAt` — once a player's window has
    ///         lapsed, anyone can drain all their remaining arrows in one block
    ///         to unblock settle. Player only resets their clock by acting.
    function skipTurn(uint256 roomId, address player) external {
        Room storage r = rooms[roomId];
        if (r.status != RoomStatus.Active) revert RoomNotActive();

        PlayerState storage ps = playerState[roomId][player];
        if (!ps.joined) revert NotAPlayer();
        if (ps.arrowsUsed >= ARROWS_PER_PLAYER) revert NoArrowsLeft();
        if (block.timestamp < uint256(ps.lastActionAt) + TURN_TIMEOUT) {
            revert TurnNotExpired();
        }

        unchecked {
            ps.arrowsUsed += 1;
        }

        emit TurnSkipped(roomId, player, ps.arrowsUsed);
    }

    // -------------------------------------------------------------------------
    // Settlement
    // -------------------------------------------------------------------------

    /// @notice Settle the room. Callable when:
    ///         (a) every player has used all arrows, OR
    ///         (b) GAME_FORFEIT_AFTER has elapsed since start.
    ///         Winner = highest score; ties broken by earliest joiner.
    function settleGame(uint256 roomId) external {
        Room storage r = rooms[roomId];
        if (r.status != RoomStatus.Active) revert RoomNotActive();

        bool everyoneShot = true;
        for (uint256 i = 0; i < r.players.length; i++) {
            if (playerState[roomId][r.players[i]].arrowsUsed < ARROWS_PER_PLAYER) {
                everyoneShot = false;
                break;
            }
        }
        bool timedOut = block.timestamp >= uint256(r.startedAt) + GAME_FORFEIT_AFTER;
        if (!everyoneShot && !timedOut) revert GameNotOver();

        // Winner = highest score, ties → earliest in players array.
        address winner = r.players[0];
        uint16 best = playerState[roomId][winner].score;
        for (uint256 i = 1; i < r.players.length; i++) {
            uint16 s = playerState[roomId][r.players[i]].score;
            if (s > best) {
                best = s;
                winner = r.players[i];
            }
        }

        uint128 payout = r.stake * uint128(r.numPlayers);
        r.status = RoomStatus.Settled; // CEI: effects before interaction

        emit GameSettled(roomId, winner, payout, best);

        (bool ok,) = winner.call{value: payout}("");
        if (!ok) revert PayoutFailed();
    }

    // -------------------------------------------------------------------------
    // Views — for FE rendering w/o reading event logs
    // -------------------------------------------------------------------------

    function getRoom(uint256 roomId)
        external
        view
        returns (
            address host,
            uint8 maxPlayers,
            uint8 numPlayers,
            RoomStatus status,
            uint128 stake,
            uint64 startedAt,
            int128 targetY,
            bytes32 targetSeed,
            address[] memory players
        )
    {
        Room storage r = rooms[roomId];
        return (
            r.host,
            r.maxPlayers,
            r.numPlayers,
            r.status,
            r.stake,
            r.startedAt,
            r.targetY,
            r.targetSeed,
            r.players
        );
    }

    function getPlayer(uint256 roomId, address player)
        external
        view
        returns (bool joined, uint8 arrowsUsed, uint16 score, uint64 lastActionAt)
    {
        PlayerState storage ps = playerState[roomId][player];
        return (ps.joined, ps.arrowsUsed, ps.score, ps.lastActionAt);
    }

    function pot(uint256 roomId) external view returns (uint128) {
        Room storage r = rooms[roomId];
        return r.stake * uint128(r.numPlayers);
    }
}
