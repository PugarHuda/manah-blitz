import * as THREE from "three";

/**
 * First-person 3D bow visualizer. The group is attached to the scene root and
 * its world transform is repositioned each frame relative to the camera —
 * this is more robust than parenting to the camera (which doesn't render
 * children unless the camera itself is in the scene graph).
 *
 * - `setDrawAmount(0..1)` slides the nocked arrow back along its axis.
 * - `fire()` plays a 120 ms snap-forward release animation and then resets to
 *   "ready for next arrow".
 * - `setReady(false)` hides the arrow (e.g. while a fired arrow is mid-flight,
 *   before the next arrow is nocked).
 */
export class BowSystem {
  readonly group: THREE.Group;

  private bowMesh: THREE.Mesh;
  private arrowMesh: THREE.Group;
  private stringTop: THREE.Line;
  private stringBottom: THREE.Line;

  private camera: THREE.PerspectiveCamera;

  private drawAmount = 0;
  private firing = false;
  private fireProgress = 0;
  private ready = true;

  // Bow positioning in camera-local space.
  private static readonly OFFSET = new THREE.Vector3(0.42, -0.28, -0.62);
  private static readonly LOCAL_YAW = Math.PI / 14;
  private static readonly MAX_DRAW = 0.22;

  constructor(camera: THREE.PerspectiveCamera) {
    this.camera = camera;
    this.group = new THREE.Group();

    this.bowMesh = this.makeBow();
    this.group.add(this.bowMesh);

    this.arrowMesh = this.makeArrow();
    this.group.add(this.arrowMesh);

    const stringMat = new THREE.LineBasicMaterial({
      color: 0xeaeaea,
      transparent: true,
      opacity: 0.85,
    });
    this.stringTop = new THREE.Line(this.makeStringGeometry(0.45, 0), stringMat);
    this.stringBottom = new THREE.Line(this.makeStringGeometry(-0.45, 0), stringMat);
    this.group.add(this.stringTop);
    this.group.add(this.stringBottom);
  }

  setDrawAmount(amount: number): void {
    this.drawAmount = Math.max(0, Math.min(1, amount));
  }

  setReady(ready: boolean): void {
    this.ready = ready;
    this.arrowMesh.visible = ready;
  }

  fire(): void {
    if (this.firing) return;
    this.firing = true;
    this.fireProgress = 0;
  }

  update(delta: number): void {
    // Reposition group to be in front of the camera, regardless of camera
    // movement. We rebuild the offset in world space each frame so it tracks
    // every yaw/pitch the user makes.
    const camPos = this.camera.getWorldPosition(new THREE.Vector3());
    const camQuat = this.camera.getWorldQuaternion(new THREE.Quaternion());
    const localOffset = BowSystem.OFFSET.clone().applyQuaternion(camQuat);
    this.group.position.copy(camPos).add(localOffset);
    this.group.quaternion.copy(camQuat).multiply(
      new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), BowSystem.LOCAL_YAW),
    );

    // Resolve draw amount (snap forward when firing).
    let displayDraw = this.drawAmount;
    if (this.firing) {
      this.fireProgress += delta * 9; // 0 → 1 over ~110 ms
      if (this.fireProgress >= 1) {
        this.firing = false;
        this.fireProgress = 0;
        displayDraw = 0;
        this.drawAmount = 0;
      } else {
        // Quick release curve — easeOutCubic.
        const t = 1 - Math.pow(1 - this.fireProgress, 3);
        displayDraw = this.drawAmount * (1 - t);
      }
    }

    const drawZ = this.ready ? displayDraw * BowSystem.MAX_DRAW : 0;

    // Slide the arrow group along +Z (toward the player when drawing back).
    this.arrowMesh.position.z = drawZ;

    // Bowstring: V-shape pointing at the arrow nock.
    this.stringTop.geometry.dispose();
    this.stringTop.geometry = this.makeStringGeometry(0.45, drawZ);
    this.stringBottom.geometry.dispose();
    this.stringBottom.geometry = this.makeStringGeometry(-0.45, drawZ);
  }

  dispose(): void {
    this.bowMesh.geometry.dispose();
    (this.bowMesh.material as THREE.Material).dispose();
    this.stringTop.geometry.dispose();
    this.stringBottom.geometry.dispose();
    (this.stringTop.material as THREE.Material).dispose();
  }

  // -- Geometry builders ------------------------------------------------------

  private makeBow(): THREE.Mesh {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.46, 0),
      new THREE.Vector3(0.16, 0.3, -0.02),
      new THREE.Vector3(0.21, 0, -0.03),
      new THREE.Vector3(0.16, -0.3, -0.02),
      new THREE.Vector3(0, -0.46, 0),
    ]);
    const tube = new THREE.TubeGeometry(curve, 28, 0.014, 10, false);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x5b3a1f,
      roughness: 0.55,
      metalness: 0.05,
    });
    return new THREE.Mesh(tube, mat);
  }

  private makeArrow(): THREE.Group {
    const arrow = new THREE.Group();

    const shaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.006, 0.006, 0.7, 10),
      new THREE.MeshStandardMaterial({ color: 0xdadce0, metalness: 0.2, roughness: 0.45 }),
    );
    shaft.rotation.x = Math.PI / 2;
    shaft.position.z = -0.16;
    arrow.add(shaft);

    const tip = new THREE.Mesh(
      new THREE.ConeGeometry(0.014, 0.06, 10),
      new THREE.MeshStandardMaterial({ color: 0xb8bdc4, metalness: 0.4, roughness: 0.3 }),
    );
    tip.rotation.x = -Math.PI / 2;
    tip.position.z = -0.55;
    arrow.add(tip);

    const fletchMat = new THREE.MeshStandardMaterial({
      color: 0x836ef9,
      roughness: 0.6,
    });
    for (let i = 0; i < 3; i++) {
      const fletch = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.05, 4), fletchMat);
      fletch.rotation.z = (i * Math.PI * 2) / 3;
      fletch.rotation.x = Math.PI / 2;
      fletch.position.z = 0.18;
      // Push outward from shaft along its axis.
      fletch.translateY(0.012);
      arrow.add(fletch);
    }

    return arrow;
  }

  private makeStringGeometry(yEnd: number, nockZ: number): THREE.BufferGeometry {
    return new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, yEnd, 0),
      new THREE.Vector3(0, 0, nockZ),
    ]);
  }
}
