import * as THREE from 'three';

function box(name, size, material, position, rotation = null) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.name = name;
  mesh.position.copy(position);
  if (rotation) mesh.rotation.set(...rotation);
  mesh.castShadow = mesh.receiveShadow = true;
  return mesh;
}

export class ElectricFence {
  constructor(terrain, worldX = 15, worldZ = -325) {
    this.root = new THREE.Group();
    this.root.name = 'electric-perimeter-fence';
    this.root.position.set(worldX, terrain.height(worldX, worldZ), worldZ);
    this.humLevel = 0;
    const steel = new THREE.MeshStandardMaterial({
      color: 0x34383a, roughness: 0.8, metalness: 0.7,
    });
    const concrete = new THREE.MeshStandardMaterial({ color: 0x77746b, roughness: 1 });
    const warning = new THREE.MeshStandardMaterial({
      color: 0xd5ad2f, roughness: 0.75, metalness: 0.05,
    });
    for (let i = 0; i < 7; i++) {
      const z = i * 6;
      this.root.add(box('fence-footing', [0.62, 0.28, 0.62], concrete,
        new THREE.Vector3(0, 0.14, z)));
      this.root.add(box('fence-post', [0.3, 8.0, 0.3], steel,
        new THREE.Vector3(0, 4.3, z)));
      this.root.add(box('fence-top-arm', [0.3, 0.3, 1.4], steel,
        new THREE.Vector3(0, 8.45, z), [Math.PI / 5, 0, 0]));
      for (const y of [1.5, 2.5, 3.5, 4.5, 5.5, 6.5, 7.5]) {
        this.root.add(box('fence-mesh-rail', [0.08, 0.08, 6], steel,
          new THREE.Vector3(0, y, z + 3)));
      }
      for (let j = 0; j <= 12; j++) {
        this.root.add(box('fence-mesh-vertical', [0.045, 7.2, 0.045], steel,
          new THREE.Vector3(0, 4.3, z + j * 0.5)));
      }
      if (i % 3 === 1) {
        this.root.add(box('fence-warning-sign', [0.6, 0.6, 0.08], warning,
          new THREE.Vector3(-0.2, 2.3, z + 0.05)));
        for (const sy of [2.12, 2.32, 2.52]) {
          this.root.add(box('fence-warning-stripe', [0.58, 0.07, 0.09], steel,
            new THREE.Vector3(-0.2, sy, z + 0.01), [0, 0, -0.45]));
        }
      }
      if (i % 3 === 0) this.root.add(box('fence-tall-pylon', [0.48, 9.5, 0.48],
        steel, new THREE.Vector3(0, 5.05, z)));
    }
    for (const z of [0, 6, 12, 18, 24, 30, 36]) {
      this.root.add(box('fence-tension-cable', [0.06, 0.06, 6.2], steel,
        new THREE.Vector3(0, 4.18, z + 3)));
    }
  }

  update(camera) {
    const dx = camera.position.x - this.root.position.x;
    const dz = camera.position.z - this.root.position.z;
    this.humLevel = Math.max(0, 1 - Math.hypot(dx, dz) / 24);
  }

  trimBays(count = 3) {
    const maxZ = count * 6;
    for (const child of this.root.children) {
      if (child.position.z > maxZ + 0.1) child.visible = false;
    }
  }
}
