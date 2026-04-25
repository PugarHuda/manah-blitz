import * as THREE from "three";

export class CameraManager {
  readonly mainCamera: THREE.PerspectiveCamera;

  readonly arrowCamera: THREE.PerspectiveCamera;

  private activeCamera: THREE.Camera;

  constructor() {
    const aspect = window.innerWidth / Math.max(1, window.innerHeight);
    this.mainCamera = new THREE.PerspectiveCamera(75, aspect, 0.01, 100);
    this.mainCamera.position.set(0, 1.6, 3);

    this.arrowCamera = new THREE.PerspectiveCamera(75, aspect, 0.01, 100);
    this.arrowCamera.position.set(0, 2, 5);

    this.activeCamera = this.mainCamera;
  }

  get camera(): THREE.Camera {
    return this.activeCamera;
  }

  setReplayMode(enabled: boolean): void {
    this.activeCamera = enabled ? this.arrowCamera : this.mainCamera;
  }

  updateArrowFollow(arrowPosition: THREE.Vector3, delta: number): void {
    const followOffset = new THREE.Vector3(0.2, 0.45, 1.4);
    const desired = arrowPosition.clone().add(followOffset);
    this.arrowCamera.position.lerp(desired, Math.min(1, delta * 7));
    this.arrowCamera.lookAt(arrowPosition);
  }

  onResize(width: number, height: number): void {
    const aspect = width / Math.max(1, height);
    this.mainCamera.aspect = aspect;
    this.mainCamera.updateProjectionMatrix();
    this.arrowCamera.aspect = aspect;
    this.arrowCamera.updateProjectionMatrix();
  }
}
