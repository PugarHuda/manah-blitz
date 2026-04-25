import * as THREE from "three";
import { DIFFICULTY_CONFIG } from "@/game/constants";
import type { ArrowMotionState, Difficulty } from "@/game/types";

interface ArrowMeta {
  playerId: string;
  velocity: THREE.Vector3;
  state: ArrowMotionState;
  lastVelocity: THREE.Vector3;
}

export interface ArrowEntity {
  mesh: THREE.Group; // Changed from Mesh to Group to hold shaft + tip
  meta: ArrowMeta;
}

export type CollisionKind = "target" | "ground";

export interface CollisionResult {
  kind: CollisionKind;
  playerId: string;
  radialDistance?: number;
  arrow: ArrowEntity;
}

interface SimulationOptions {
  scene: THREE.Scene;
  target: THREE.Group;
  getDifficulty: () => Difficulty;
  onCollision: (result: CollisionResult) => void;
}

const ARROW_SPEED = 18;

export class SimulationLayer {
  private scene: THREE.Scene;

  private target: THREE.Group;

  private arrows: ArrowEntity[] = [];

  private getDifficulty: () => Difficulty;

  private onCollision: (result: CollisionResult) => void;

  constructor(options: SimulationOptions) {
    this.scene = options.scene;
    this.target = options.target;
    this.getDifficulty = options.getDifficulty;
    this.onCollision = options.onCollision;
  }

  shootArrow(params: {
    playerId: string;
    origin: THREE.Vector3;
    direction: THREE.Vector3;
    power: number;
    color?: string;
  }): ArrowEntity {
    const normalizedDir = params.direction.clone().normalize();
    const speed = 15 + params.power * 25; // Adjusted as per prompt

    const group = new THREE.Group();
    
    // Shaft (cylinder)
    const shaftGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.8, 8);
    const shaftMat = new THREE.MeshStandardMaterial({ 
      color: params.color || 0xdddddd, 
      metalness: 0.2, 
      roughness: 0.6 
    });
    const shaft = new THREE.Mesh(shaftGeo, shaftMat);
    shaft.rotation.x = Math.PI / 2; // Align along Z
    group.add(shaft);

    // Tip (cone)
    const tipGeo = new THREE.ConeGeometry(0.025, 0.1, 8);
    const tipMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.8, roughness: 0.2 });
    const tip = new THREE.Mesh(tipGeo, tipMat);
    tip.position.z = 0.45; // Move to end of shaft
    tip.rotation.x = Math.PI / 2;
    group.add(tip);

    group.position.copy(params.origin);
    group.lookAt(params.origin.clone().add(normalizedDir));

    const arrow: ArrowEntity = {
      mesh: group,
      meta: {
        playerId: params.playerId,
        velocity: normalizedDir.clone().multiplyScalar(speed),
        state: "flying",
        lastVelocity: normalizedDir.clone().multiplyScalar(speed),
      },
    };

    this.arrows.push(arrow);
    this.scene.add(group);
    return arrow;
  }

  getLastArrow(): ArrowEntity | null {
    if (this.arrows.length === 0) {
      return null;
    }
    return this.arrows[this.arrows.length - 1] ?? null;
  }

  update(delta: number): void {
    const difficulty = this.getDifficulty();
    const gravity = DIFFICULTY_CONFIG[difficulty].gravity;
    const hitRadius = DIFFICULTY_CONFIG[difficulty].hitRadius;

    for (const arrow of this.arrows) {
      if (arrow.meta.state !== "flying") {
        continue;
      }

      arrow.meta.lastVelocity.copy(arrow.meta.velocity);
      arrow.mesh.position.addScaledVector(arrow.meta.velocity, delta);
      arrow.meta.velocity.y -= gravity * delta;

      const velocityDir = arrow.meta.velocity.clone().normalize();
      if (velocityDir.lengthSq() > 0) {
        arrow.mesh.lookAt(arrow.mesh.position.clone().add(velocityDir));
      }

      if (arrow.mesh.position.y <= 0) {
        this.stickToGround(arrow);
        this.onCollision({
          kind: "ground",
          playerId: arrow.meta.playerId,
          arrow,
        });
        continue;
      }

      const localOnTarget = this.target.worldToLocal(arrow.mesh.getWorldPosition(new THREE.Vector3()));
      const radialDistance = Math.sqrt(localOnTarget.x * localOnTarget.x + localOnTarget.y * localOnTarget.y);

      const inDepthRange = Math.abs(localOnTarget.z) < 0.3;
      if (inDepthRange && radialDistance <= hitRadius) {
        this.stickToTarget(arrow);
        this.onCollision({
          kind: "target",
          playerId: arrow.meta.playerId,
          radialDistance,
          arrow,
        });
      }
    }
  }

  private stickToGround(arrow: ArrowEntity): void {
    arrow.meta.state = "stuck";
    arrow.meta.velocity.set(0, 0, 0);

    // Embed slightly into ground
    arrow.mesh.position.y = 0.05;

    // Use last velocity for orientation
    const dir = arrow.meta.lastVelocity.clone().normalize();
    if (dir.lengthSq() > 0) {
      arrow.mesh.lookAt(arrow.mesh.position.clone().add(dir));
    }
  }

  private stickToTarget(arrow: ArrowEntity): void {
    arrow.meta.state = "stuck";
    arrow.meta.velocity.set(0, 0, 0);

    const worldPos = arrow.mesh.position.clone();
    const worldDir = arrow.meta.lastVelocity.clone().normalize();

    // Attach to target's local coordinate system
    this.target.add(arrow.mesh);
    const localPos = this.target.worldToLocal(worldPos);
    arrow.mesh.position.copy(localPos);

    // Embed into surface (Nancap effect)
    arrow.mesh.position.z -= 0.15;

    // Orient arrow based on last flight direction relative to target
    arrow.mesh.lookAt(arrow.mesh.position.clone().add(this.target.worldToLocal(worldPos.clone().add(worldDir)).sub(localPos)));
  }
}
