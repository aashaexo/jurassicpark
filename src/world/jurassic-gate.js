import * as THREE from 'three';

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

function box(name, size, material, position, rotation = null) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.name = name;
  mesh.position.copy(position);
  if (rotation) mesh.rotation.set(...rotation);
  mesh.castShadow = mesh.receiveShadow = true;
  return mesh;
}

function log(name, radius, length, material, position, axis = 'x') {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 1.03, length, 12),
    material);
  mesh.name = name;
  if (axis === 'x') mesh.rotation.z = Math.PI / 2;
  if (axis === 'z') mesh.rotation.x = Math.PI / 2;
  mesh.position.copy(position);
  mesh.castShadow = mesh.receiveShadow = true;
  return mesh;
}

export class JurassicGate {
  constructor(terrain, worldX = 7, worldZ = -304) {
    this.root = new THREE.Group();
    this.root.name = 'jurassic-park-main-gate';
    this.root.position.set(worldX, terrain.height(worldX, worldZ), worldZ);

    const stone = new THREE.MeshStandardMaterial({ color: 0x625c52, roughness: 0.98 });
    const timber = new THREE.MeshStandardMaterial({ color: 0x51483b, roughness: 0.98 });
    const iron = new THREE.MeshStandardMaterial({
      color: 0x151719, roughness: 0.92, metalness: 0.65,
    });
    const signMat = new THREE.MeshStandardMaterial({ color: 0x302015, roughness: 0.92 });
    const letterMat = new THREE.MeshStandardMaterial({
      color: 0xb69b62, roughness: 0.78, metalness: 0.05,
    });
    const fire = new THREE.MeshBasicMaterial({
      color: 0xff9a32, transparent: true, opacity: 0.78,
    });

    for (const side of [-1, 1]) {
      const x = side * 5;
      this.root.add(box('gate-footing', [3.4, 0.8, 3.4], stone,
        new THREE.Vector3(x, 0.4, 0)));
      for (let row = 0; row < 18; row++) {
        const y = 0.92 + row * 0.46;
        const jitter = (row % 3 - 1) * 0.06;
        if (row % 2 === 0) {
          this.root.add(log('tower-crib-log', 0.25, 3.2 + (row % 3) * 0.08, timber,
            new THREE.Vector3(x + jitter, y, -1.05), 'x'));
          this.root.add(log('tower-crib-log', 0.25, 3.2 + (row % 2) * 0.1, timber,
            new THREE.Vector3(x + jitter, y, 1.05), 'x'));
        } else {
          this.root.add(log('tower-crib-log', 0.25, 3.2 + (row % 3) * 0.08, timber,
            new THREE.Vector3(x - 1.05, y, jitter), 'z'));
          this.root.add(log('tower-crib-log', 0.25, 3.2 + (row % 2) * 0.1, timber,
            new THREE.Vector3(x + 1.05, y, jitter), 'z'));
        }
      }
    }

    this.root.add(log('gate-lintel', 0.35, 13, timber, new THREE.Vector3(0, 9, 0), 'x'));
    this.root.add(log('gate-lintel-upper', 0.35, 13, timber,
      new THREE.Vector3(0, 9.7, 0), 'x'));
    for (const x of [-3, 3]) {
      this.root.add(box('sign-post', [0.25, 2.5, 0.25], timber,
        new THREE.Vector3(x, 10.1, 0)));
    }
    this.root.add(box('sign-board', [8, 2.4, 0.3], signMat,
      new THREE.Vector3(0, 11.2, 0)));
    this._addLetters(letterMat);

    for (const side of [-1, 1]) this._addLeaf(side, timber, iron);

    for (const side of [-1, 1]) {
      const x = side * 3.6;
      this.root.add(box('torch-sconce', [0.18, 0.7, 0.18], iron,
        new THREE.Vector3(x, 4, -1.45)));
      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.5, 8), fire);
      flame.name = 'torch-flame';
      flame.position.set(x, 4.45, -1.45);
      this.root.add(flame);
      const light = new THREE.PointLight(0xff8a36, 1.8, 8, 2);
      light.position.copy(flame.position);
      this.root.add(light);
      this.flames ??= [];
      this.flames.push({ flame, light, phase: side });
    }

    this.root.updateMatrixWorld(true);
    this.bounds = new THREE.Box3().setFromObject(this.root);
    const size = this.bounds.getSize(new THREE.Vector3());
    const localMinY = this.bounds.min.y - this.root.position.y;
    if (localMinY < -0.05 || size.x < 12.5 || size.x > 13.8 ||
        size.y < 11.5 || size.y > 13.2 || size.z > 6.5) {
      throw new Error(`invalid gate bounds: ${JSON.stringify({
        minY: localMinY, x: size.x, y: size.y, z: size.z,
      })}`);
    }
  }

  _addLetters(material) {
    for (const [line, text] of ['JURASSIC', 'PARK'].entries()) {
      const spacing = line === 0 ? 0.82 : 0.92;
      const start = -(text.length - 1) * spacing * 0.5;
      for (let i = 0; i < text.length; i++) {
        const glyph = GLYPHS[text[i]];
        for (let row = 0; row < 7; row++) for (let col = 0; col < 5; col++) {
          if (glyph[row][col] !== '1') continue;
          this.root.add(box('sign-letter', [0.13, 0.13, 0.12], material,
            new THREE.Vector3(start + i * spacing + (col - 2) * 0.14,
              11.85 - line * 0.72 - row * 0.13, -0.23)));
        }
      }
    }
  }

  _addLeaf(side, timber, iron) {
    const leaf = new THREE.Group();
    leaf.name = 'open-gate-leaf';
    leaf.position.set(side * 5, 0.8, 0);
    leaf.rotation.y = side * 1.92;
    for (let i = 0; i < 7; i++) {
      leaf.add(box('gate-leaf-timber', [0.48, 6, 0.48], timber,
        new THREE.Vector3(-side * (0.35 + i * 0.68), 3, 0)));
    }
    leaf.add(box('gate-leaf-crossbar', [4.8, 0.2, 0.2], iron,
      new THREE.Vector3(-side * 2.2, 2.0, -0.3), [0, 0, -0.45]));
    leaf.add(box('gate-leaf-crossbar', [4.8, 0.2, 0.2], iron,
      new THREE.Vector3(-side * 2.2, 4.4, -0.3), [0, 0, 0.45]));
    this.root.add(leaf);
  }

  update(time = 0) {
    for (const { flame, light, phase } of this.flames || []) {
      const f = 0.92 + 0.08 * Math.sin(time * 8 + phase);
      flame.scale.y = f;
      light.intensity = 1.6 + 0.35 * Math.sin(time * 7 + phase);
    }
  }
}
