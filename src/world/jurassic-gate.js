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

export class JurassicGate {
  constructor(terrain, z = -304) {
    this.root = new THREE.Group();
    this.root.name = 'jurassic-park-main-gate';
    const centerX = 7;
    this.root.position.x = centerX;
    const stone = new THREE.MeshStandardMaterial({ color: 0x655b4d, roughness: 0.95 });
    const timber = new THREE.MeshStandardMaterial({ color: 0x5a3218, roughness: 0.86 });
    const sign = new THREE.MeshStandardMaterial({
      color: 0x321b0c, roughness: 0.8, emissive: 0x0c0400, emissiveIntensity: 0.25,
    });
    const gold = new THREE.MeshStandardMaterial({
      color: 0xe0b84f, roughness: 0.5, metalness: 0.1,
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
        this.root.add(log('tower-stacked-log', 0.48, 3.1, timber,
          new THREE.Vector3(x, footingY + 1.0 + row * 0.9, z)));
        this.root.add(box('tower-log-end-band', [1.05, 0.1, 0.1], gold,
          new THREE.Vector3(x, footingY + 1.0 + row * 0.9, z - 1.58)));
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
    const segments = {
      J: 'bc', U: 'bcdef', R: 'abdeg', A: 'abcefg', S: 'acdfg', I: 'bc',
      C: 'adfe', P: 'abefg', K: 'aefgh',
    };
    const bars = {
      a: [0, 0.28, 0.34, 0.1], b: [0.17, 0.1, 0.1, 0.34],
      c: [0.17, -0.28, 0.1, 0.34], d: [0, -0.35, 0.34, 0.1],
      e: [-0.17, -0.28, 0.1, 0.34], f: [-0.17, 0.1, 0.1, 0.34],
      g: [0, -0.03, 0.34, 0.1], h: [-0.17, 0, 0.1, 0.1],
    };
    for (let i = 0; i < letters.length; i++) {
      if (letters[i] === ' ') continue;
      const x = -3.95 + i * 0.66;
      for (const key of segments[letters[i]]) {
        const [dx, dy, sx, sy] = bars[key];
        this.root.add(box(`sign-letter-${letters[i]}-${key}`, [sx, sy, 0.08], gold,
          new THREE.Vector3(x + dx, y + 8.9 + dy, z - 0.42)));
      }
    }
    for (const x of [-4.25, 4.25]) {
      this.root.add(box('torch-sconce', [0.3, 1.5, 0.3], timber,
        new THREE.Vector3(x, y + 4.5, z - 1.7)));
      const flame = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 8), fire);
      flame.name = 'gate-torch-flame';
      flame.position.set(x, y + 5.3, z - 1.7);
      flame.scale.set(0.9, 1.8, 0.9);
      flame.castShadow = true;
      this.root.add(flame);
      const light = new THREE.PointLight(0xff6a22, 9.0, 18, 2);
      light.position.copy(flame.position);
      this.root.add(light);
    }
  }

  update() {}
}
