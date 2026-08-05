import * as THREE from 'three';

function box(name, size, material, position, rotation = null) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.name = name;
  mesh.position.copy(position);
  if (rotation) mesh.rotation.set(...rotation);
  mesh.castShadow = mesh.receiveShadow = true;
  return mesh;
}

function log(name, radius, length, material, position) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 1.04, length, 14),
    material);
  mesh.name = name;
  mesh.rotation.x = Math.PI / 2;
  mesh.position.copy(position);
  mesh.castShadow = mesh.receiveShadow = true;
  return mesh;
}

const GLYPHS = {
  J: ['11111', '00100', '00100', '00100', '10100', '10100', '01100'],
  U: ['10001', '10001', '10001', '10001', '10001', '11011', '01110'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  I: ['11111', '00100', '00100', '00100', '00100', '00100', '11111'],
  C: ['01111', '10000', '10000', '10000', '10000', '10000', '01111'],
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  K: ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
};

export class JurassicGate {
  constructor(terrain, z = -304) {
    this.root = new THREE.Group();
    this.root.name = 'jurassic-park-main-gate';
    const centerX = 7;
    this.root.position.x = centerX;
    const stone = new THREE.MeshStandardMaterial({ color: 0x655b4d, roughness: 0.95 });
    const timber = new THREE.MeshStandardMaterial({ color: 0x51483b, roughness: 0.98, metalness: 0 });
    const sign = new THREE.MeshStandardMaterial({
      color: 0x321b0c, roughness: 0.8, emissive: 0x0c0400, emissiveIntensity: 0.25,
    });
    const gold = new THREE.MeshStandardMaterial({
      color: 0x17191a, roughness: 0.9, metalness: 0.65,
    });
    const fire = new THREE.MeshStandardMaterial({
      color: 0xff6a16, emissive: 0xff2500, emissiveIntensity: 3,
    });
    const y = terrain.height(centerX, z);
    for (const x of [-5.1, 5.1]) {
      const footingY = terrain.height(centerX + x, z);
      this.root.add(box('stone-footing', [2.0, 0.65, 2.0], stone,
        new THREE.Vector3(x, footingY + 0.3, z)));
      for (let row = 0; row < 7; row++) {
        const offset = (row % 2 ? 0.12 : -0.08);
        this.root.add(log('tower-stacked-log', 0.48, 3.1 + (row % 3) * 0.12, timber,
          new THREE.Vector3(x + offset, footingY + 1.0 + row * 0.9, z)));
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.035, 6, 14), gold);
        ring.name = 'weathered-log-end-ring';
        ring.position.set(x + offset, footingY + 1.0 + row * 0.9, z - 1.58);
        ring.rotation.x = Math.PI / 2;
        this.root.add(ring);
      }
      this.root.add(box('tower-cap', [2.2, 0.45, 2.2], timber,
        new THREE.Vector3(x, footingY + 7.35, z)));
    }
    for (const side of [-1, 1]) {
      const leaf = new THREE.Group();
      leaf.position.set(side * 4.8, y + 2.8, z - 0.7);
      leaf.rotation.y = side * 0.42;
      for (let i = 0; i < 4; i++) {
        leaf.add(box('open-gate-vertical-log', [0.52, 4.8, 0.52], timber,
          new THREE.Vector3(side * (0.55 + i * 0.72), 0, 0)));
      }
      leaf.add(box('gate-iron-crossbar', [3.2, 0.18, 0.18], gold,
        new THREE.Vector3(side * 1.1, 0.1, -0.32), [0, 0, -0.38]));
      leaf.add(box('gate-iron-crossbar', [3.2, 0.18, 0.18], gold,
        new THREE.Vector3(side * 1.1, -1.5, -0.32), [0, 0, 0.38]));
      this.root.add(leaf);
    }
    this.root.add(log('spanning-lintel', 0.62, 11.5, timber,
      new THREE.Vector3(0, y + 7.75, z)));
    this.root.add(box('sign-board', [8.6, 1.45, 0.32], sign,
      new THREE.Vector3(0, y + 8.9, z - 0.22)));
    const letters = 'JURASSIC PARK';
    let cursor = -3.9;
    for (const letter of letters) {
      if (letter === ' ') { cursor += 0.35; continue; }
      for (let row = 0; row < 7; row++) for (let col = 0; col < 5; col++) {
        if (GLYPHS[letter][row][col] !== '1') continue;
        this.root.add(box(`sign-letter-${letter}-${row}-${col}`, [0.15, 0.15, 0.1], gold,
          new THREE.Vector3(cursor + col * 0.16, y + 9.28 - row * 0.16, z - 0.42)));
      }
      cursor += 0.9;
    }
    for (const x of [-4.25, 4.25]) {
      this.root.add(box('torch-sconce', [0.3, 1.5, 0.3], timber,
        new THREE.Vector3(x, y + 4.5, z - 1.7)));
      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.9, 10), fire);
      flame.name = 'gate-torch-flame';
      flame.position.set(x, y + 5.3, z - 1.7);
      flame.scale.set(0.9, 1.8, 0.9);
      flame.castShadow = true;
      this.root.add(flame);
      const light = new THREE.PointLight(0xff6a22, 4.5, 14, 2);
      light.position.copy(flame.position);
      this.root.add(light);
      this.flames ??= [];
      this.flames.push({ flame, light, phase: x });
    }
  }

  update(time = 0) {
    for (const { flame, light, phase } of this.flames || []) {
      const flicker = 0.88 + 0.12 * Math.sin(time * 8 + phase);
      flame.scale.y = 1.2 * flicker;
      light.intensity = 7.0 + 2.0 * Math.sin(time * 7 + phase);
    }
  }
}
