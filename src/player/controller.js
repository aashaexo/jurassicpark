import * as THREE from 'three';

export class PlayerController {
  constructor(camera, terrainHeight) {
    this.camera = camera;
    this.terrainHeight = terrainHeight;
    this.position = new THREE.Vector3(-205, terrainHeight(-205, 205) + 1.8, 205);
    this.velocity = new THREE.Vector3();
    this.yaw = -0.92;
    this.pitch = -0.08;
    this.spectator = false;
    this.keys = new Set();
    this.locked = false;
    this.grounded = false;
    this.mouse = { x: 0, y: 0 };
    window.addEventListener('keydown', (event) => {
      this.keys.add(event.code);
      if (event.code === 'KeyF') this.spectator = !this.spectator;
    });
    window.addEventListener('keyup', (event) => this.keys.delete(event.code));
    window.addEventListener('mousemove', (event) => {
      if (!this.locked) return;
      this.yaw -= event.movementX * 0.0022;
      this.pitch -= event.movementY * 0.0018;
      this.pitch = THREE.MathUtils.clamp(this.pitch, -1.45, 1.45);
    });
    window.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === document.body;
    });
    document.body.addEventListener('click', () => document.body.requestPointerLock());
  }

  update(dt, time) {
    const input = new THREE.Vector3(
      (this.keys.has('KeyD') ? 1 : 0) - (this.keys.has('KeyA') ? 1 : 0),
      0,
      (this.keys.has('KeyS') ? 1 : 0) - (this.keys.has('KeyW') ? 1 : 0),
    );
    if (input.lengthSq() > 1) input.normalize();
    const speed = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') ? 23 : 11;
    const forward = new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw));
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    const wish = right.multiplyScalar(input.x).add(forward.multiplyScalar(input.z));
    if (this.spectator) {
      const fly = this.keys.has('Space') ? 1 : this.keys.has('ControlLeft') ? -1 : 0;
      this.position.addScaledVector(wish, speed * dt);
      this.position.y += fly * speed * dt;
    } else {
      this.velocity.x = THREE.MathUtils.damp(this.velocity.x, wish.x * speed, 9, dt);
      this.velocity.z = THREE.MathUtils.damp(this.velocity.z, wish.z * speed, 9, dt);
      if (this.keys.has('Space') && this.grounded) {
        this.velocity.y = 7.5;
        this.grounded = false;
      }
      this.velocity.y -= 19.5 * dt;
      this.position.addScaledVector(this.velocity, dt);
      const floor = this.terrainHeight(this.position.x, this.position.z) + 1.8;
      if (this.position.y <= floor) {
        this.position.y = floor;
        this.velocity.y = 0;
        this.grounded = true;
      }
    }
    const moving = Math.min(1, Math.hypot(this.velocity.x, this.velocity.z) / speed);
    const bob = this.spectator ? 0 : Math.sin(time * 10.0) * 0.035 * moving;
    this.camera.position.copy(this.position);
    this.camera.position.y += bob + (this.spectator ? 0 : Math.sin(time * 1.7) * 0.012);
    this.camera.rotation.set(this.pitch + Math.sin(time * 5.0) * 0.003 * moving, this.yaw, 0, 'YXZ');
  }
}
