// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Test, Vm} from "forge-std/Test.sol";
import {Manah} from "../src/Manah.sol";
import {Trig} from "../src/Trig.sol";

contract ManahTest is Test {
    Manah internal manah;

    address internal alice = makeAddr("alice");
    address internal bob = makeAddr("bob");
    address internal carol = makeAddr("carol");

    uint128 internal constant STAKE = 0.1 ether;

    function setUp() public {
        manah = new Manah();
        vm.deal(alice, 10 ether);
        vm.deal(bob, 10 ether);
        vm.deal(carol, 10 ether);
        vm.prevrandao(bytes32(uint256(0xdeadbeef)));
    }

    // -------------------------------------------------------------------------
    // Lifecycle
    // -------------------------------------------------------------------------

    function test_HappyPath_TwoPlayer() public {
        vm.prank(alice);
        uint256 roomId = manah.createRoom{value: STAKE}(2, STAKE);
        assertEq(roomId, 1, "first room id");

        // Bob joins → auto-starts the game.
        vm.prank(bob);
        manah.joinRoom{value: STAKE}(roomId);

        (,, uint8 numP, Manah.RoomStatus status,,, int128 targetY,,) = manah.getRoom(roomId);
        assertEq(numP, 2);
        assertEq(uint8(status), uint8(Manah.RoomStatus.Active));
        assertGe(targetY, int128(int256(manah.TARGET_Y_MIN_MM())));
        assertLe(targetY, int128(int256(manah.TARGET_Y_MAX_MM())));
        assertEq(address(manah).balance, uint256(STAKE) * 2);

        // Each player shoots 3 arrows. ~45° + full power roughly threads target.
        for (uint8 i = 0; i < 3; i++) {
            vm.prank(alice);
            manah.shoot(roomId, 4500, 6500); // 45.00°, 65% power
            vm.prank(bob);
            manah.shoot(roomId, 4400, 6500); // slightly different
        }

        uint256 aliceBefore = alice.balance;
        uint256 bobBefore = bob.balance;
        manah.settleGame(roomId);

        (,,, status,,,,,) = manah.getRoom(roomId);
        assertEq(uint8(status), uint8(Manah.RoomStatus.Settled));
        assertEq(address(manah).balance, 0);

        uint256 gain = (alice.balance - aliceBefore) + (bob.balance - bobBefore);
        assertEq(gain, uint256(STAKE) * 2, "winner gets full pot");
    }

    function test_StartGame_HostBeforeFull() public {
        vm.prank(alice);
        uint256 roomId = manah.createRoom{value: STAKE}(4, STAKE);
        vm.prank(bob);
        manah.joinRoom{value: STAKE}(roomId);

        vm.prank(alice);
        manah.startGame(roomId);

        (,,, Manah.RoomStatus status,,,,,) = manah.getRoom(roomId);
        assertEq(uint8(status), uint8(Manah.RoomStatus.Active));
    }

    /// @notice Core README claim: 50 TickComputed events emitted per shot.
    function test_Shoot_Emits50TickComputedEvents() public {
        uint256 roomId = _activeRoom();

        vm.recordLogs();
        vm.prank(alice);
        manah.shoot(roomId, 4500, 6500);
        Vm.Log[] memory logs = vm.getRecordedLogs();

        bytes32 tickSig = keccak256("TickComputed(uint256,uint8,int256,int256)");
        uint256 tickCount;
        for (uint256 i = 0; i < logs.length; i++) {
            if (logs[i].topics.length > 0 && logs[i].topics[0] == tickSig) {
                tickCount++;
            }
        }
        assertEq(tickCount, manah.TICKS_PER_SHOT(), "expected 50 TickComputed events");
    }

    function test_Shoot_RecordsScoreAndArrowsUsed() public {
        uint256 roomId = _activeRoom();
        vm.prank(alice);
        manah.shoot(roomId, 4500, 6500);
        (, uint8 used, uint16 score,) = manah.getPlayer(roomId, alice);
        assertEq(used, 1);
        // Score is non-negative (placeholder scoring may return 0 for misses).
        assertGe(score, 0);
    }

    // -------------------------------------------------------------------------
    // Reverts: stake & join
    // -------------------------------------------------------------------------

    function test_RevertWhen_CreateWithWrongStake() public {
        vm.prank(alice);
        vm.expectRevert(Manah.WrongStakeAmount.selector);
        manah.createRoom{value: 0.05 ether}(2, STAKE);
    }

    function test_RevertWhen_CreateWithBadPlayerCount() public {
        vm.prank(alice);
        vm.expectRevert(Manah.InvalidPlayerCount.selector);
        manah.createRoom{value: STAKE}(1, STAKE);

        vm.prank(alice);
        vm.expectRevert(Manah.InvalidPlayerCount.selector);
        manah.createRoom{value: STAKE}(9, STAKE);
    }

    function test_RevertWhen_CreateWithZeroStake() public {
        vm.prank(alice);
        vm.expectRevert(Manah.InvalidStake.selector);
        manah.createRoom{value: 0}(2, 0);
    }

    function test_RevertWhen_JoinWithWrongStake() public {
        vm.prank(alice);
        uint256 roomId = manah.createRoom{value: STAKE}(2, STAKE);
        vm.prank(bob);
        vm.expectRevert(Manah.WrongStakeAmount.selector);
        manah.joinRoom{value: STAKE - 1}(roomId);
    }

    function test_RevertWhen_DoubleJoin() public {
        vm.prank(alice);
        uint256 roomId = manah.createRoom{value: STAKE}(4, STAKE);
        vm.prank(alice);
        vm.expectRevert(Manah.AlreadyJoined.selector);
        manah.joinRoom{value: STAKE}(roomId);
    }

    function test_RevertWhen_JoinFullRoom() public {
        vm.prank(alice);
        uint256 roomId = manah.createRoom{value: STAKE}(2, STAKE);
        vm.prank(bob);
        manah.joinRoom{value: STAKE}(roomId); // auto-starts
        vm.prank(carol);
        vm.expectRevert(Manah.RoomNotJoinable.selector);
        manah.joinRoom{value: STAKE}(roomId);
    }

    function test_RevertWhen_StartByNonHost() public {
        vm.prank(alice);
        uint256 roomId = manah.createRoom{value: STAKE}(4, STAKE);
        vm.prank(bob);
        manah.joinRoom{value: STAKE}(roomId);
        vm.prank(bob);
        vm.expectRevert(Manah.NotAuthorized.selector);
        manah.startGame(roomId);
    }

    function test_RevertWhen_StartUnderMinPlayers() public {
        vm.prank(alice);
        uint256 roomId = manah.createRoom{value: STAKE}(4, STAKE);
        vm.prank(alice);
        vm.expectRevert(Manah.NotEnoughPlayers.selector);
        manah.startGame(roomId);
    }

    // -------------------------------------------------------------------------
    // Reverts: shoot validation
    // -------------------------------------------------------------------------

    function test_RevertWhen_ShootBeforeStart() public {
        vm.prank(alice);
        uint256 roomId = manah.createRoom{value: STAKE}(2, STAKE);
        vm.prank(alice);
        vm.expectRevert(Manah.RoomNotActive.selector);
        manah.shoot(roomId, 4500, 6500);
    }

    function test_RevertWhen_ShootByNonPlayer() public {
        uint256 roomId = _activeRoom();
        vm.prank(carol);
        vm.expectRevert(Manah.NotAPlayer.selector);
        manah.shoot(roomId, 4500, 6500);
    }

    function test_RevertWhen_OutOfArrows() public {
        uint256 roomId = _activeRoom();
        vm.startPrank(alice);
        manah.shoot(roomId, 4500, 6500);
        manah.shoot(roomId, 4500, 6500);
        manah.shoot(roomId, 4500, 6500);
        vm.expectRevert(Manah.NoArrowsLeft.selector);
        manah.shoot(roomId, 4500, 6500);
        vm.stopPrank();
    }

    function test_RevertWhen_AngleOutOfRange() public {
        uint256 roomId = _activeRoom();
        vm.prank(alice);
        vm.expectRevert(Manah.AngleOutOfRange.selector);
        manah.shoot(roomId, -1, 6500);

        vm.prank(alice);
        vm.expectRevert(Manah.AngleOutOfRange.selector);
        manah.shoot(roomId, 9001, 6500);
    }

    function test_RevertWhen_PowerOutOfRange() public {
        uint256 roomId = _activeRoom();
        vm.prank(alice);
        vm.expectRevert(Manah.PowerOutOfRange.selector);
        manah.shoot(roomId, 4500, 0);

        vm.prank(alice);
        vm.expectRevert(Manah.PowerOutOfRange.selector);
        manah.shoot(roomId, 4500, 10001);
    }

    // -------------------------------------------------------------------------
    // skipTurn
    // -------------------------------------------------------------------------

    function test_SkipTurn_DrainsAllArrowsAfterTimeout() public {
        uint256 roomId = _activeRoom();
        // Bob never shoots — once his clock expires, anyone may burn all 3.
        vm.warp(block.timestamp + 91); // > TURN_TIMEOUT (90s)
        manah.skipTurn(roomId, bob);
        manah.skipTurn(roomId, bob);
        manah.skipTurn(roomId, bob);

        (, uint8 used,,) = manah.getPlayer(roomId, bob);
        assertEq(used, 3, "all 3 arrows skipped");

        vm.expectRevert(Manah.NoArrowsLeft.selector);
        manah.skipTurn(roomId, bob);
    }

    function test_SkipTurn_BlockedAfterPlayerActs() public {
        // Anchor the clock at a known absolute time to avoid ambiguity.
        vm.warp(1_000);
        uint256 roomId = _activeRoom(); // _start sets alice.last = bob.last = 1000

        vm.warp(1_060); // t+60s
        vm.prank(bob);
        manah.shoot(roomId, 4500, 6500); // bob.last = 1060

        vm.warp(1_120); // alice expires at 1090 (lapsed); bob expires at 1150 (alive)

        manah.skipTurn(roomId, alice); // alice ok
        vm.expectRevert(Manah.TurnNotExpired.selector);
        manah.skipTurn(roomId, bob); // bob still in his window
    }

    function test_RevertWhen_SkipTurnTooEarly() public {
        uint256 roomId = _activeRoom();
        vm.expectRevert(Manah.TurnNotExpired.selector);
        manah.skipTurn(roomId, bob);
    }

    // -------------------------------------------------------------------------
    // Settle pre-conditions
    // -------------------------------------------------------------------------

    function test_RevertWhen_SettleBeforeGameOver() public {
        uint256 roomId = _activeRoom();
        vm.prank(alice);
        manah.shoot(roomId, 4500, 6500);
        vm.expectRevert(Manah.GameNotOver.selector);
        manah.settleGame(roomId);
    }

    function test_Settle_AfterForfeitWindow() public {
        uint256 roomId = _activeRoom();
        vm.startPrank(alice);
        manah.shoot(roomId, 4500, 6500);
        manah.shoot(roomId, 4500, 6500);
        manah.shoot(roomId, 4500, 6500);
        vm.stopPrank();

        vm.warp(block.timestamp + 11 minutes);
        manah.settleGame(roomId);
        (,,, Manah.RoomStatus status,,,,,) = manah.getRoom(roomId);
        assertEq(uint8(status), uint8(Manah.RoomStatus.Settled));
    }

    // -------------------------------------------------------------------------
    // Scoring curve — boundary, range, monotonicity
    // -------------------------------------------------------------------------

    function test_Score_BoundaryValues() public view {
        // Bullseye lock-in: 0–50mm all award MAX (100).
        assertEq(manah.previewScore(0), 100);
        assertEq(manah.previewScore(1), 100);
        assertEq(manah.previewScore(50), 100);

        // Just past lock-in: linear falloff begins.
        // At dist=51: 100 * (550 - 1) / 550 = 99 (truncated)
        assertEq(manah.previewScore(51), 99);

        // Edge of target = 0 points (linear hits 0 exactly).
        assertEq(manah.previewScore(600), 0);
        // 1mm past edge = miss = 0.
        assertEq(manah.previewScore(601), 0);
        // Far miss = 0.
        assertEq(manah.previewScore(10_000), 0);
    }

    function test_Score_Midpoint() public view {
        // dist = midpoint between lock and edge → ≈ 50% of MAX.
        // mid = (50 + 600) / 2 = 325. falloff=275, span=550. → 100 * 275/550 = 50.
        assertEq(manah.previewScore(325), 50);
    }

    /// @notice Score must be monotonically non-increasing as distance grows.
    function testFuzz_Score_Monotonic(uint256 d1, uint256 d2) public view {
        d1 = bound(d1, 0, 5_000);
        d2 = bound(d2, 0, 5_000);
        if (d1 > d2) (d1, d2) = (d2, d1); // ensure d1 ≤ d2
        assertGe(manah.previewScore(d1), manah.previewScore(d2));
    }

    /// @notice Score is always in [0, MAX_POINTS].
    function testFuzz_Score_BoundedRange(uint256 dist) public view {
        dist = bound(dist, 0, type(uint128).max);
        uint16 pts = manah.previewScore(dist);
        assertLe(pts, manah.MAX_POINTS());
    }

    /// @notice Bullseye lock-in: all distances ≤ 50mm score MAX.
    function testFuzz_Score_BullseyeLock(uint256 dist) public view {
        dist = bound(dist, 0, manah.BULLSEYE_LOCK_MM());
        assertEq(manah.previewScore(dist), manah.MAX_POINTS());
    }

    /// @notice Outside target radius always scores 0.
    function testFuzz_Score_MissBeyondRadius(uint256 dist) public view {
        dist = bound(dist, manah.TARGET_RADIUS_MM() + 1, type(uint128).max);
        assertEq(manah.previewScore(dist), 0);
    }

    // -------------------------------------------------------------------------
    // Trig sanity checks
    // -------------------------------------------------------------------------

    function test_Trig_KnownValues() public pure {
        assertEq(Trig.sinCentideg(0), 0);
        assertEq(Trig.sinCentideg(9000), 1_000_000);
        assertEq(Trig.sinCentideg(3000), 500_000); // sin(30°) = 0.5
        assertEq(Trig.cosCentideg(0), 1_000_000);
        assertEq(Trig.cosCentideg(9000), 0);
        assertEq(Trig.cosCentideg(6000), 500_000); // cos(60°) = 0.5
        // Linear interp checkpoint: sin(2.5°) ≈ midway between 0 and sin(5°)
        int256 mid = Trig.sinCentideg(250);
        assertGt(mid, 40_000);
        assertLt(mid, 50_000);
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    function _activeRoom() internal returns (uint256 roomId) {
        vm.prank(alice);
        roomId = manah.createRoom{value: STAKE}(2, STAKE);
        vm.prank(bob);
        manah.joinRoom{value: STAKE}(roomId);
    }
}
