/**
 * Pure-TS port of Manah.sol's trajectory + scoring.
 * Mirrors the contract 1:1 so practice scores ≈ on-chain scores.
 *
 * If Manah.sol's constants change, update here too.
 */

// Mirror of contract constants (mm + ticks).
export const PHYSICS = {
  EYE_HEIGHT_MM: 1700,
  TARGET_X_MM: 30_000,
  TARGET_Y_MIN_MM: 1200,
  TARGET_Y_MAX_MM: 1800,
  TARGET_RADIUS_MM: 600,
  MAX_SPEED_MM_PER_TICK: 2000,
  GRAVITY_MM_PER_TICK_SQ: -16,
  MAX_WIND_MM_PER_TICK_SQ: 2,
  TICKS_PER_SHOT: 50,
  BULLSEYE_LOCK_MM: 50,
  MAX_POINTS: 100,
} as const;

export interface Tick {
  i: number;
  x: number;
  y: number;
}

export interface ShotResult {
  ticks: Tick[]; // exactly TICKS_PER_SHOT entries
  hit: boolean;
  resolvedAtTick: number; // -1 if never resolved (off-screen overshoot)
  landingY: number;
  distFromBullseyeMm: number;
  points: number;
}

/**
 * Simulate a shot identical to Manah.sol's `_integrateAndEmit` + `_scoreShot`.
 *
 * @param angleRad     Aim angle in radians, 0..π/2 (matches UI control).
 * @param power        Draw strength normalized to 0..1.
 * @param targetYmm    Target band center in mm (random per-game in contract).
 * @param windPerTickSq Wind acceleration in mm/tick² (signed). Random in real
 *                      game; pass 0 for windless practice or a deterministic
 *                      value for reproducible aim challenges.
 */
export function simulateShot(
  angleRad: number,
  power: number,
  targetYmm: number,
  windPerTickSq: number,
  customGravity?: number,
): ShotResult {
  const gravity = customGravity !== undefined ? customGravity : PHYSICS.GRAVITY_MM_PER_TICK_SQ;
  const speed = PHYSICS.MAX_SPEED_MM_PER_TICK * Math.max(0, Math.min(1, power));
  let vx = speed * Math.cos(angleRad);
  let vy = speed * Math.sin(angleRad);
  let x = 0;
  let y = PHYSICS.EYE_HEIGHT_MM;

  let resolved = false;
  let hit = false;
  let landingY = 0;
  let resolvedAtTick = -1;

  const ticks: Tick[] = [];

  for (let i = 0; i < PHYSICS.TICKS_PER_SHOT; i++) {
    vy += PHYSICS.GRAVITY_MM_PER_TICK_SQ;
    vx += windPerTickSq;

    const prevX = x;
    const prevY = y;
    x += vx;
    y += vy;

    ticks.push({ i, x, y });

    if (resolved) continue;

    if (prevX < PHYSICS.TARGET_X_MM && x >= PHYSICS.TARGET_X_MM) {
      const dx = x - prevX;
      const t = PHYSICS.TARGET_X_MM - prevX;
      landingY = dx === 0 ? y : prevY + ((y - prevY) * t) / dx;
      const absDy = Math.abs(landingY - targetYmm);
      hit = absDy <= PHYSICS.TARGET_RADIUS_MM;
      resolved = true;
      resolvedAtTick = i;
    } else if (y <= 0 && x < PHYSICS.TARGET_X_MM) {
      hit = false;
      landingY = 0;
      resolved = true;
      resolvedAtTick = i;
    }
  }

  let dist = PHYSICS.TARGET_RADIUS_MM + 1;
  let points = 0;
  if (hit) {
    dist = Math.abs(landingY - targetYmm);
    points = scoreShot(dist);
  }

  return {
    ticks,
    hit,
    resolvedAtTick,
    landingY,
    distFromBullseyeMm: dist,
    points,
  };
}

/** Mirror of Manah.sol `_scoreShot` — converted to discrete rings. */
export function scoreShot(distFromBullseyeMm: number): number {
  if (distFromBullseyeMm <= 50) return 10;
  if (distFromBullseyeMm <= 100) return 9;
  if (distFromBullseyeMm <= 150) return 8;
  if (distFromBullseyeMm <= 200) return 7;
  if (distFromBullseyeMm <= 250) return 6;
  if (distFromBullseyeMm <= 300) return 5;
  if (distFromBullseyeMm <= 350) return 4;
  if (distFromBullseyeMm <= 400) return 3;
  if (distFromBullseyeMm <= 450) return 2;
  if (distFromBullseyeMm <= 500) return 1;
  return 0;
}

/** Center of the target band — random within range, deterministic per seed. */
export function pickTargetY(seed: number): number {
  const span = PHYSICS.TARGET_Y_MAX_MM - PHYSICS.TARGET_Y_MIN_MM + 1;
  // Simple LCG-style mixer; we don't need crypto-grade.
  const mixed = ((seed * 9301 + 49297) % 233280) / 233280;
  return Math.floor(PHYSICS.TARGET_Y_MIN_MM + mixed * span);
}

/** Sample wind for practice — bounded same as contract, deterministic per seed. */
export function pickWind(seed: number): number {
  const span = PHYSICS.MAX_WIND_MM_PER_TICK_SQ * 2 + 1;
  const mixed = (seed * 1103515245 + 12345) % span;
  return Math.abs(mixed) - PHYSICS.MAX_WIND_MM_PER_TICK_SQ;
}
