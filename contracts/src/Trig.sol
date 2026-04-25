// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

/// @title Trig — pure on-chain sin/cos for the first quadrant.
/// @notice Inputs are centidegrees in [0, 9000] (i.e. 4500 = 45°). Outputs are
///         scaled by 1e6 (so sin(30°) returns 500000).
/// @dev 19-entry sine LUT at 5° steps + linear interpolation. ~200 gas / call.
///      No external deps, no PRBMath — keeps the bytecode small and the math
///      auditable by hand.
library Trig {
    int256 internal constant ONE = 1_000_000;

    /// @dev sin(x) where x ∈ [0°, 90°] expressed in centidegrees.
    function sinCentideg(uint256 angleCentideg) internal pure returns (int256) {
        require(angleCentideg <= 9000, "Trig: angle out of range");
        // 19 LUT entries: index = floor(angle / 500), fraction = angle % 500.
        uint256 idx = angleCentideg / 500;
        uint256 frac = angleCentideg % 500;
        int256 lo = _lut(idx);
        int256 hi = _lut(idx + 1);
        // Linear interp: lo + (hi - lo) * frac / 500
        return lo + ((hi - lo) * int256(frac)) / 500;
    }

    /// @dev cos(x) = sin(90° - x).
    function cosCentideg(uint256 angleCentideg) internal pure returns (int256) {
        require(angleCentideg <= 9000, "Trig: angle out of range");
        return sinCentideg(9000 - angleCentideg);
    }

    /// @dev Sine values × 1e6 at 5° increments. Index 0 = 0°, index 18 = 90°.
    function _lut(uint256 idx) private pure returns (int256) {
        // Hardcoded LUT — Solidity can't declare array constants in 0.8.26.
        if (idx == 0) return 0; //       sin(0°)
        if (idx == 1) return 87156; //   sin(5°)
        if (idx == 2) return 173648; //  sin(10°)
        if (idx == 3) return 258819; //  sin(15°)
        if (idx == 4) return 342020; //  sin(20°)
        if (idx == 5) return 422618; //  sin(25°)
        if (idx == 6) return 500000; //  sin(30°)
        if (idx == 7) return 573576; //  sin(35°)
        if (idx == 8) return 642788; //  sin(40°)
        if (idx == 9) return 707107; //  sin(45°)
        if (idx == 10) return 766044; // sin(50°)
        if (idx == 11) return 819152; // sin(55°)
        if (idx == 12) return 866025; // sin(60°)
        if (idx == 13) return 906308; // sin(65°)
        if (idx == 14) return 939693; // sin(70°)
        if (idx == 15) return 965926; // sin(75°)
        if (idx == 16) return 984808; // sin(80°)
        if (idx == 17) return 996195; // sin(85°)
        return 1_000_000; //             sin(90°), idx == 18
    }
}
