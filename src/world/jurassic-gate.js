import * as THREE from 'three';

function box(name, size, material, position, rotation = null) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.name = name;
  mesh.position.copy(position);
  if (rotation) mesh.rotation.set(...rotation);
  mesh.castShadow = mesh.receiveShadow = true;
  return mesh;
}

export class JurassicGate {
  constructor(terrain, z = -304) {
    this.root = new THREE.Group();
    this.root.name = 'jurassic-park-main-gate';
    const stone = new THREE.MeshStandardMaterial({ color: 0x655b4d, roughness: 0.95 });
    const timber = new THREE.MeshStandardMaterial({ color: 0x392517, roughness: 0.9 });
    const sign = new THREE.MeshStandardMaterial({
      color: 0x24160e, roughness: 0.8, emissive: 0x080300, emissiveIntensity: 0.2,
    });
    const gold = new THREE.MeshStandardMaterial({
      color: 0xb98a35, roughness: 0.55, metalness: 0.1,
    });
    const fire = new THREE.MeshStandardMaterial({
      color: 0xff6a16, emissive: 0xff2500, emissiveIntensity: 3,
    });
    const y = terrain.height(0, z);
    for (const x of [-6.2, 6.2]) {
      const p = new THREE.Vector3(x, y + 3.1, z);
      this.root.add(box('stone-gate-pylon', [2.8, 6.2, 2.8], stone, p));
      this.root.add(box('pylon-cap', [3.15, 0.55, 3.15], stone,
        new THREE.Vector3(x, y + 6.45, z)));
      for (let row = 0; row < 4; row++) {
        this.root.add(box('pylon-timber-band', [3.0, 0.12, 3.0], timber,
          new THREE.Vector3(x, y + 1.0 + row * 1.35, z - 1.43)));
      }
    }
    for (const x of [-3.2, -1.9, -0.6, 0.7, 2.0, 3.3]) {
      this.root.add(box('gate-leaf', [1.0, 4.2, 0.42], timber,
        new THREE.Vector3(x, y + 2.35, z)));
    }
    this.root.add(box('gate-lintel', [14.8, 1.25, 1.1], timber,
      new THREE.Vector3(0, y + 6.9, z)));
    this.root.add(box('sign-board', [8.5, 1.65, 0.35], sign,
      new THREE.Vector3(0, y + 8.0, z - 0.18)));
    const letters = 'JURASSIC PARK';
    for (let i = 0; i < letters.length; i++) {
      const glyph = box(`sign-letter-${letters[i]}`, [0.38, 0.58, 0.06], gold,
        new THREE.Vector3(-3.7 + i * 0.66, y + 8.0, z - 0.4));
      this.root.add(glyph);
    }
    for (const x of [-5.0, 5.0]) {
      this.root.add(box('torch-sconce', [0.3, 1.5, 0.3], timber,
        new THREE.Vector3(x, y + 4.5, z - 1.7)));
      const flame = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 8), fire);
      flame.name = 'gate-torch-flame';
      flame.position.set(x, y + 5.3, z - 1.7);
      flame.scale.set(0.7, 1.5, 0.7);
      flame.castShadow = true;
      this.root.add(flame);
      const light = new THREE.PointLight(0xff6a22, 2.4, 12, 2);
      light.position.copy(flame.position);
      this.root.add(light);
    }
  }

  update() {}
}
