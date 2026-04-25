import { TARGET_RING_THRESHOLDS } from "@/game/target-system";

export class ScoreSystem {
  calculate(distanceFromCenter: number): number {
    for (let i = 0; i < TARGET_RING_THRESHOLDS.length; i += 1) {
      if (distanceFromCenter <= TARGET_RING_THRESHOLDS[i]) {
        return 10 - i;
      }
    }
    return 0;
  }
}
