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

  updateArrowFollow(arrowPosition: THREE.Vector3, arrowVelocity: THREE.Vector3, delta: number): void {
    // Cinematic offset: slightly behind and above
    const followOffset = new THREE.Vector3(0.15, 0.25, 0.8);
    
    // Calculate target position in world space
    const targetPos = arrowPosition.clone().add(followOffset);
    
    // Smoothly lerp camera position
    this.arrowCamera.position.lerp(targetPos, Math.min(1, delta * 10));
    
    // Look ahead of the arrow based on velocity
    const lookAhead = arrowPosition.clone().add(arrowVelocity.clone().normalize().multiplyScalar(0.5));
    this.arrowCamera.lookAt(lookAhead);
  }

  onResize(width: number, height: number): void {
    const aspect = width / Math.max(1, height);
    this.mainCamera.aspect = aspect;
    this.mainCamera.updateProjectionMatrix();
    this.arrowCamera.aspect = aspect;
    this.arrowCamera.updateProjectionMatrix();
  }
}
