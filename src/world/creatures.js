/* Procedural Jurassic Park creatures.
 *
 * The rig deliberately keeps the useful part of the player's body system:
 * named bones, rigid procedural parts, deterministic gait phases and terrain
 * contact. A creature is a hierarchy rather than a pile of unrelated meshes,
 * so the same animation code can drive a turntable specimen or a world herd.
 */
import * as THREE from 'three';
import { bakeSurface } from '../gfx/bake.js';

const TAU = Math.PI * 2;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const smooth = v => v * v * (3 - 2 * v);

function skinTexture(seed = 1, base = [112, 101, 72]) {
  const size = 128;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const n = Math.sin((x + seed * 17) * 0.19) *
        Math.sin((y - seed * 11) * 0.23) +
        0.35 * Math.sin((x + y) * 0.67 + seed);
      const scale = 0.78 + 0.18 * n;
      const i = (y * size + x) * 4;
      data[i] = clamp(base[0] * scale, 0, 255);
      data[i + 1] = clamp(base[1] * scale, 0, 255);
      data[i + 2] = clamp(base[2] * scale, 0, 255);
      data[i + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

function materialFor(species, seed = 1) {
  const palette = species === 'brachiosaurus'
    ? [126, 116, 77]
    : species === 'triceratops'
      ? [92, 101, 68]
      : [112, 93, 62];
  return new THREE.MeshStandardMaterial({
    map: skinTexture(seed, palette),
    color: 0xffffff,
    roughness: 0.82,
    metalness: 0,
    normalScale: new THREE.Vector2(0.35, 0.35),
  });
}

function part(geometry, material, parent, name, position, scale) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  mesh.position.copy(position);
  if (scale) mesh.scale.copy(scale);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function bone(parent, name, position = [0, 0, 0]) {
  const b = new THREE.Bone();
  b.name = name;
  b.position.set(...position);
  parent.add(b);
  return b;
}

function capsule(material, parent, name, length, radius, position, rotation = null) {
  const mesh = new THREE.Mesh(
    new THREE.CapsuleGeometry(radius, length, 6, 12),
    material,
  );
  mesh.name = name;
  mesh.position.copy(position);
  if (rotation) mesh.rotation.copy(rotation);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

export class CreatureRig {
  constructor(species = 'brachiosaurus', { seed = 1, scale = 1, terrain = null } = {}) {
    this.species = species;
    this.terrain = terrain;
    this.phase = (seed * 1.618) % TAU;
    this.seed = seed;
    this.speed = 0;
    this.state = 'idle';
    this.group = new THREE.Group();
    this.group.name = `${species}-${seed}`;
    this.group.scale.setScalar(scale);
    this.bones = {};
    this.material = materialFor(species, seed);
    this._buildBrachiosaurus();
    this._groundY = 0;
  }

  _buildBrachiosaurus() {
    const m = this.material;
    const root = bone(this.group, 'root', [0, 0, 0]);
    const pelvis = bone(root, 'pelvis', [0, 3.55, 0]);
    const torso = bone(pelvis, 'torso', [0, 0.45, 0]);
    this.bones.root = root; this.bones.pelvis = pelvis; this.bones.torso = torso;

    part(new THREE.SphereGeometry(1, 20, 14), m, torso, 'ribcage',
      new THREE.Vector3(0, 0, 0), new THREE.Vector3(2.05, 1.55, 4.1));
    part(new THREE.SphereGeometry(1, 16, 12), m, pelvis, 'hips',
      new THREE.Vector3(0, 0, 0.8), new THREE.Vector3(2.0, 1.6, 1.9));

    const neck = bone(torso, 'neck-base', [0, 0.7, -2.8]);
    this.bones.neck = [neck];
    let n = neck;
    const neckLengths = [2.1, 2.0, 1.8, 1.65, 1.35];
    for (let i = 0; i < neckLengths.length; i++) {
      const length = neckLengths[i];
      capsule(m, n, `neck-segment-${i}`, length, 0.63 - i * 0.07,
        new THREE.Vector3(0, length * 0.5, -0.16));
      const next = bone(n, `neck-${i + 1}`, [0, length, -0.16]);
      this.bones.neck.push(next);
      n = next;
    }
    const head = bone(n, 'head', [0, 0.08, -0.22]);
    this.bones.head = head;
    part(new THREE.SphereGeometry(1, 18, 12), m, head, 'head',
      new THREE.Vector3(0, 0.15, -0.7), new THREE.Vector3(0.72, 0.62, 1.05));
    part(new THREE.SphereGeometry(1, 14, 10), m, head, 'muzzle',
      new THREE.Vector3(0, -0.02, -1.45), new THREE.Vector3(0.56, 0.42, 0.72));
    const detail = new THREE.MeshStandardMaterial({
      color: 0x17130d,
      roughness: 0.5,
      metalness: 0,
    });
    part(new THREE.SphereGeometry(1, 10, 8), detail, head, 'left-eye',
      new THREE.Vector3(-0.48, 0.32, -0.92), new THREE.Vector3(0.09, 0.09, 0.09));
    part(new THREE.SphereGeometry(1, 10, 8), detail, head, 'right-eye',
      new THREE.Vector3(0.48, 0.32, -0.92), new THREE.Vector3(0.09, 0.09, 0.09));
    part(new THREE.SphereGeometry(1, 10, 8), detail, head, 'left-nostril',
      new THREE.Vector3(-0.24, 0.15, -1.98), new THREE.Vector3(0.1, 0.07, 0.07));
    part(new THREE.SphereGeometry(1, 10, 8), detail, head, 'right-nostril',
      new THREE.Vector3(0.24, 0.15, -1.98), new THREE.Vector3(0.1, 0.07, 0.07));

    const tail = bone(pelvis, 'tail-base', [0, 0.25, 1.65]);
    this.bones.tail = [tail];
    let t = tail;
    const tailLengths = [2.5, 2.4, 2.2, 2.0, 1.7];
    for (let i = 0; i < tailLengths.length; i++) {
      const length = tailLengths[i];
      capsule(m, t, `tail-segment-${i}`, length, 0.8 - i * 0.13,
        new THREE.Vector3(0, 0, length * 0.5),
        new THREE.Euler(Math.PI / 2, 0, 0));
      const next = bone(t, `tail-${i + 1}`, [0, 0, length]);
      this.bones.tail.push(next);
      t = next;
    }

    const legDefs = [
      ['front-left', -1, -2.25], ['front-right', 1, -2.25],
      ['rear-left', -1, 1.35], ['rear-right', 1, 1.35],
    ];
    this.bones.legs = [];
    for (const [name, side, z] of legDefs) {
      const hip = bone(pelvis, `${name}-upper`, [side * 1.25, -0.25, z]);
      const knee = bone(hip, `${name}-lower`, [0, -2.0, 0]);
      const ankle = bone(knee, `${name}-ankle`, [0, -1.75, 0]);
      this.bones.legs.push({ name, side, hip, knee, ankle });
      capsule(m, hip, `${name}-upper`, 1.9, 0.48,
        new THREE.Vector3(0, -0.95, 0));
      capsule(m, knee, `${name}-lower`, 1.7, 0.35,
        new THREE.Vector3(0, -0.85, 0));
      part(new THREE.SphereGeometry(1, 12, 8), m, ankle, `${name}-foot`,
        new THREE.Vector3(0, -0.18, -0.18), new THREE.Vector3(0.52, 0.25, 0.85));
    }

    this.group.userData.creatureRig = this;
    this.group.traverse(o => {
      if (o.isMesh) o.userData.creatureRig = this;
    });
  }

  update(dt, { walk = false, target = null } = {}) {
    this.phase += dt * (walk ? 1.5 : 0.45);
    const p = this.phase;
    const breathe = Math.sin(p * 0.7) * 0.025;
    const stride = walk ? 0.34 : 0.06;
    const body = this.bones.torso;
    body.position.y = 0.45 + breathe;
    this.bones.head.rotation.x = Math.sin(p * 0.31) * 0.06;
    this.bones.head.rotation.y = Math.sin(p * 0.19 + 0.7) * 0.12;
    for (let i = 0; i < this.bones.neck.length; i++) {
      this.bones.neck[i].rotation.z = Math.sin(p * 0.19 + i * 0.25) * 0.018;
    }
    for (let i = 0; i < this.bones.tail.length; i++) {
      this.bones.tail[i].rotation.y = Math.sin(p * 0.55 - i * 0.25) * (0.08 - i * 0.012);
    }
    for (const [i, leg] of this.bones.legs.entries()) {
      const offset = i % 2 ? Math.PI : 0;
      const swing = Math.sin(p * 1.5 + offset) * stride;
      leg.hip.rotation.x = swing;
      leg.knee.rotation.x = -Math.max(0, swing) * 0.65;
      leg.ankle.rotation.x = -swing * 0.28;
    }
    if (target) {
      const dx = target.x - this.group.position.x;
      const dz = target.z - this.group.position.z;
      this.group.rotation.y = Math.atan2(dx, dz);
    }
    this._plantFeet();
  }

  _plantFeet() {
    if (!this.terrain) return;
    const y = this.terrain.height(this.group.position.x, this.group.position.z);
    this.group.position.y = y;
    this._groundY = y;
  }

  stats() {
    let meshes = 0;
    let triangles = 0;
    this.group.traverse(o => {
      if (o.isMesh) {
        meshes++;
        triangles += o.geometry.index
          ? o.geometry.index.count / 3
          : o.geometry.attributes.position.count / 3;
      }
    });
    return { meshes, triangles };
  }
}

export class DinosaurSystem {
  constructor(renderer, terrain, { turntable = null, audio = null } = {}) {
    this.renderer = renderer;
    this.terrain = terrain;
    this.root = new THREE.Group();
    this.root.name = 'procedural-dinosaurs';
    this.creatures = [];
    this.time = 0;
    this.turntable = Boolean(turntable);
    this.audio = audio;
    if (turntable) {
      const dino = new CreatureRig(turntable, { seed: 7, terrain: null });
      dino.group.position.set(0, 0, 0);
      this.root.add(dino.group);
      this.creatures.push(dino);
    } else {
      const spots = [[-20, -326], [2, -334], [24, -329]];
      spots.forEach(([x, z], i) => {
        const dino = new CreatureRig('brachiosaurus', { seed: i + 1, terrain });
        dino.group.position.set(x, terrain.height(x, z), z);
        dino.group.rotation.y = i * 0.35;
        this.root.add(dino.group);
        this.creatures.push(dino);
      });
    }
  }

  update(dt) {
    this.time += dt;
    for (const [i, dino] of this.creatures.entries()) {
      dino.update(dt, { walk: false });
      if (dino.terrain) dino.group.position.y = dino.terrain.height(
        dino.group.position.x, dino.group.position.z);
      if (!dino.terrain) dino.group.position.y = 0;
      if (i > 0 && dino.terrain) dino.group.position.x += Math.sin(this.time * 0.03 + i) * dt * 0.02;
    }
    if (!this.turntable && this.audio && Math.floor(this.time) !== Math.floor(this.time - dt) &&
        Math.floor(this.time) % 14 === 0) {
      this.audio.triggerDinoRumble(this.creatures[0].group.position, 0.7);
    }
  }

  stats() {
    return this.creatures.reduce((out, c) => {
      const s = c.stats();
      out.meshes += s.meshes;
      out.triangles += s.triangles;
      return out;
    }, { meshes: 0, triangles: 0, instances: this.creatures.length });
  }
}
