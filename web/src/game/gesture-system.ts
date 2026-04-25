import * as THREE from "three";

interface GestureOptions {
  element: HTMLElement;
  camera: THREE.Camera;
  canShoot: () => boolean;
  onShoot: (direction: THREE.Vector3, power: number) => void;
}

export class GestureSystem {
  private element: HTMLElement;

  private camera: THREE.Camera;

  private canShoot: () => boolean;

  private onShoot: (direction: THREE.Vector3, power: number) => void;

  private isDrawing = false;

  private startPoint = new THREE.Vector2();

  private currentPoint = new THREE.Vector2();

  private power = 0;

  private direction = new THREE.Vector3(0, 0, -1);

  constructor(options: GestureOptions) {
    this.element = options.element;
    this.camera = options.camera;
    this.canShoot = options.canShoot;
    this.onShoot = options.onShoot;

    this.element.addEventListener("pointerdown", this.handlePointerDown);
    this.element.addEventListener("pointermove", this.handlePointerMove);
    this.element.addEventListener("pointerup", this.handlePointerUp);
    this.element.addEventListener("pointercancel", this.handlePointerCancel);
  }

  getPower(): number {
    return this.power;
  }

  dispose(): void {
    this.element.removeEventListener("pointerdown", this.handlePointerDown);
    this.element.removeEventListener("pointermove", this.handlePointerMove);
    this.element.removeEventListener("pointerup", this.handlePointerUp);
    this.element.removeEventListener("pointercancel", this.handlePointerCancel);
  }

  private handlePointerDown = (event: PointerEvent): void => {
    if (!this.canShoot()) {
      return;
    }

    this.isDrawing = true;
    this.startPoint.set(event.clientX, event.clientY);
    this.currentPoint.copy(this.startPoint);
    this.power = 0;
  };

  private handlePointerMove = (event: PointerEvent): void => {
    if (!this.isDrawing) {
      return;
    }

    this.currentPoint.set(event.clientX, event.clientY);
    const dx = this.currentPoint.x - this.startPoint.x;
    const dy = this.currentPoint.y - this.startPoint.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const normalized = Math.max(0, Math.min(1, distance / 100));

    this.power = Math.pow(normalized, 1.5);
    this.direction.set(-dx, dy, -1).normalize();
  };

  private handlePointerUp = (): void => {
    if (!this.isDrawing) {
      return;
    }

    this.isDrawing = false;
    const cameraDir = new THREE.Vector3();
    this.camera.getWorldDirection(cameraDir);

    const finalDirection = cameraDir.add(this.direction).normalize();
    this.onShoot(finalDirection, this.power);
  };

  private handlePointerCancel = (): void => {
    this.isDrawing = false;
    this.power = 0;
  };
}
