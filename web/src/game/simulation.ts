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
  mesh: THREE.Mesh;
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
  }): ArrowEntity {
    const normalizedDir = params.direction.clone().normalize();
    const speed = ARROW_SPEED * Math.max(0.1, Math.min(1, params.power));

    const body = new THREE.CylinderGeometry(0.012, 0.012, 0.9, 10);
    const tip = new THREE.ConeGeometry(0.03, 0.14, 10);
    const mat = new THREE.MeshStandardMaterial({ color: 0xdadce0, metalness: 0.15, roughness: 0.5 });

    const mesh = new THREE.Mesh(body, mat);
    const tipMesh = new THREE.Mesh(tip, new THREE.MeshStandardMaterial({ color: 0xa9b0b8 }));
    tipMesh.position.y = 0.52;
    mesh.add(tipMesh);

    mesh.position.copy(params.origin);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normalizedDir.clone());

    const arrow: ArrowEntity = {
      mesh,
      meta: {
        playerId: params.playerId,
        velocity: normalizedDir.clone().multiplyScalar(speed),
        state: "flying",
        lastVelocity: normalizedDir.clone().multiplyScalar(speed),
      },
    };

    this.arrows.push(arrow);
    this.scene.add(mesh);
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

      arrow.mesh.position.addScaledVector(arrow.meta.velocity, delta);
      arrow.meta.velocity.y -= gravity * delta;
      arrow.meta.lastVelocity.copy(arrow.meta.velocity);

      const velocityDir = arrow.meta.velocity.clone().normalize();
      if (Number.isFinite(velocityDir.x) && Number.isFinite(velocityDir.y) && Number.isFinite(velocityDir.z)) {
        arrow.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), velocityDir);
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
    arrow.meta.lastVelocity.copy(arrow.meta.velocity);
    arrow.meta.velocity.set(0, 0, 0);
    arrow.mesh.position.y = 0.015;
    const dir = arrow.meta.lastVelocity.clone().normalize();
    if (dir.lengthSq() > 0) {
      arrow.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    }
  }

  private stickToTarget(arrow: ArrowEntity): void {
    arrow.meta.state = "stuck";
    arrow.meta.lastVelocity.copy(arrow.meta.velocity);
    arrow.meta.velocity.set(0, 0, 0);

    const worldPos = arrow.mesh.getWorldPosition(new THREE.Vector3());
    const worldQuat = arrow.mesh.getWorldQuaternion(new THREE.Quaternion());

    this.target.add(arrow.mesh);
    arrow.mesh.position.copy(this.target.worldToLocal(worldPos));
    arrow.mesh.quaternion.copy(worldQuat);

    const dir = arrow.meta.lastVelocity.clone().normalize();
    if (dir.lengthSq() > 0) {
      arrow.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    }
    arrow.mesh.position.z -= 0.05;
  }
}
