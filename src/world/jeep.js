import * as THREE from 'three';

function box(name, size, material, position, rotation = null) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.name = name;
  mesh.position.copy(position);
  if (rotation) mesh.rotation.set(...rotation);
  mesh.castShadow = mesh.receiveShadow = true;
  return mesh;
}

export class SafariJeep {
  constructor(terrain, worldX = 4, worldZ = -276) {
    this.root = new THREE.Group();
    this.root.name = 'park-safari-jeep';
    this.root.position.set(worldX, terrain.height(worldX, worldZ), worldZ);
    const red = new THREE.MeshStandardMaterial({ color: 0x8f2922, roughness: 0.82 });
    const grey = new THREE.MeshStandardMaterial({ color: 0x62676a, roughness: 0.88 });
    const black = new THREE.MeshStandardMaterial({ color: 0x17191a, roughness: 0.9, metalness: 0.25 });
    const glass = new THREE.MeshStandardMaterial({ color: 0x26383b, roughness: 0.25, metalness: 0.1 });
    this.root.add(box('jeep-body', [3.8, 0.85, 1.8], grey, new THREE.Vector3(0, 1.05, 0)));
    this.root.add(box('jeep-red-hood', [1.25, 0.22, 1.65], red, new THREE.Vector3(1.2, 1.57, 0)));
    this.root.add(box('jeep-red-side-panel', [1.5, 0.55, 0.08], red, new THREE.Vector3(-0.65, 1.25, -0.94)));
    this.root.add(box('jeep-cabin', [1.8, 1.15, 1.55], grey, new THREE.Vector3(-0.45, 1.8, 0)));
    this.root.add(box('jeep-windshield', [0.08, 0.7, 1.35], glass, new THREE.Vector3(0.48, 2.02, 0),
      [0, 0, -0.18]));
    for (const x of [-1.2, 0.3]) for (const z of [-0.82, 0.82]) {
      this.root.add(box('jeep-roll-cage', [0.1, 2.0, 0.1], black, new THREE.Vector3(x, 2.35, z)));
    }
    this.root.add(box('jeep-roll-cage-top', [1.7, 0.1, 1.8], black, new THREE.Vector3(-0.45, 3.25, 0)));
    for (const x of [-1.35, 1.35]) for (const z of [-0.98, 0.98]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 0.3, 16), black);
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(x, 0.7, z);
      wheel.name = 'jeep-wheel';
      this.root.add(wheel);
    }
    const spare = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.28, 16), black);
    spare.rotation.z = Math.PI / 2;
    spare.position.set(-1.95, 1.25, 0);
    spare.name = 'jeep-spare-wheel';
    this.root.add(spare);
    for (const x of [-0.2, 0.35, 0.9]) {
      this.root.add(box('jeep-roof-light', [0.22, 0.18, 0.22], new THREE.MeshStandardMaterial({
        color: 0xe4d4a0, roughness: 0.4, emissive: 0x7a5a20,
      }), new THREE.Vector3(x, 3.45, 0)));
    }
    this.root.add(box('jeep-number-decal', [0.65, 0.42, 0.03], new THREE.MeshStandardMaterial({
      color: 0xf0e4bd, roughness: 0.75,
    }), new THREE.Vector3(-0.55, 1.28, -1.0)));
    this.root.updateMatrixWorld(true);
    this.bounds = new THREE.Box3().setFromObject(this.root);
  }
}
