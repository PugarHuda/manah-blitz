import * as THREE from "three";
import { DIFFICULTY_CONFIG } from "@/game/constants";
import type { Difficulty } from "@/game/types";

interface RenderingOptions {
  canvas: HTMLCanvasElement;
  difficulty: Difficulty;
}

export class RenderingLayer {
  readonly scene: THREE.Scene;

  readonly renderer: THREE.WebGLRenderer;

  readonly target: THREE.Group;

  readonly reticle: THREE.Mesh;

  private xrHitTestSource: XRHitTestSource | null = null;

  private xrRefSpace: XRReferenceSpace | null = null;

  private onPlaceTarget: ((position: THREE.Vector3) => void) | null = null;

  constructor(options: RenderingOptions) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0b0d12);

    this.renderer = new THREE.WebGLRenderer({
      canvas: options.canvas,
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.xr.enabled = true;

    this.addLights();
    this.addGround();

    this.target = this.createTarget();
    this.target.position.set(0, 1.5, -DIFFICULTY_CONFIG[options.difficulty].distance);
    this.scene.add(this.target);

    this.reticle = new THREE.Mesh(
      new THREE.RingGeometry(0.08, 0.1, 32),
      new THREE.MeshBasicMaterial({ color: 0x00e4ff })
    );
    this.reticle.rotateX(-Math.PI / 2);
    this.reticle.visible = false;
    this.scene.add(this.reticle);
  }

  setDifficulty(difficulty: Difficulty): void {
    this.target.position.set(0, 1.5, -DIFFICULTY_CONFIG[difficulty].distance);
  }

  setTargetPlacementListener(listener: (position: THREE.Vector3) => void): void {
    this.onPlaceTarget = listener;
  }

  render(camera: THREE.Camera): void {
    this.renderer.render(this.scene, camera);
  }

  onResize(): void {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  async enterARSession(): Promise<void> {
    if (!("xr" in navigator)) {
      throw new Error("WebXR is not available on this device/browser");
    }

    const session = await (navigator as Navigator & { xr: XRSystem }).xr.requestSession("immersive-ar", {
      requiredFeatures: ["hit-test"],
    });

    await this.renderer.xr.setSession(session);
    this.xrRefSpace = await session.requestReferenceSpace("local");
    const viewerSpace = await session.requestReferenceSpace("viewer");
    if (typeof session.requestHitTestSource !== "function") {
      throw new Error("WebXR hit-test API is not available in this session");
    }
    this.xrHitTestSource = (await session.requestHitTestSource({ space: viewerSpace })) ?? null;

    session.addEventListener("select", () => {
      if (!this.reticle.visible || !this.onPlaceTarget) {
        return;
      }
      const position = this.reticle.position.clone();
      this.onPlaceTarget(position);
    });

    session.addEventListener("end", () => {
      this.xrHitTestSource = null;
      this.xrRefSpace = null;
      this.reticle.visible = false;
    });
  }

  updateXR(frame?: XRFrame): void {
    if (!frame || !this.xrHitTestSource || !this.xrRefSpace) {
      return;
    }

    const hitResults = frame.getHitTestResults(this.xrHitTestSource);
    if (hitResults.length === 0) {
      this.reticle.visible = false;
      return;
    }

    const hit = hitResults[0];
    const pose = hit.getPose(this.xrRefSpace);
    if (!pose) {
      this.reticle.visible = false;
      return;
    }

    this.reticle.visible = true;
    this.reticle.matrix.fromArray(pose.transform.matrix);
    this.reticle.matrix.decompose(this.reticle.position, this.reticle.quaternion, this.reticle.scale);
  }

  private addLights(): void {
    const directional = new THREE.DirectionalLight(0xffffff, 1.1);
    directional.position.set(5, 10, 5);
    this.scene.add(directional);

    const ambient = new THREE.AmbientLight(0xffffff, 0.45);
    this.scene.add(ambient);
  }

  private addGround(): void {
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(10, 10),
      new THREE.MeshStandardMaterial({ color: 0x161a22, roughness: 0.95, metalness: 0.02 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    this.scene.add(ground);
  }

  private createTarget(): THREE.Group {
    const target = new THREE.Group();
    const rings = [
      { radius: 0.8, color: 0xffffff },
      { radius: 0.72, color: 0xffffff },
      { radius: 0.64, color: 0x111111 },
      { radius: 0.56, color: 0x111111 },
      { radius: 0.48, color: 0x1a53ff },
      { radius: 0.4, color: 0x1a53ff },
      { radius: 0.32, color: 0xff2a2a },
      { radius: 0.24, color: 0xff2a2a },
      { radius: 0.16, color: 0xffdd33 },
      { radius: 0.08, color: 0xffdd33 },
    ];

    rings.forEach((ring, idx) => {
      const mesh = new THREE.Mesh(
        new THREE.CylinderGeometry(ring.radius, ring.radius, 0.03, 64),
        new THREE.MeshStandardMaterial({ color: ring.color })
      );
      mesh.rotation.x = Math.PI / 2;
      mesh.position.z = -idx * 0.002;
      target.add(mesh);
    });

    return target;
  }
}
