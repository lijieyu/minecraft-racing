import * as THREE from 'three';

const _box = new THREE.BoxGeometry(1, 1, 1);
const _matCache = {};

function getMat(color) {
  if (!_matCache[color]) {
    _matCache[color] = new THREE.MeshLambertMaterial({ color });
  }
  return _matCache[color];
}

export function createVoxelGroup(blocks) {
  const group = new THREE.Group();
  for (const [x, y, z, color] of blocks) {
    const mesh = new THREE.Mesh(_box, getMat(color));
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  }
  return group;
}

export function createVoxelTree(height = 5) {
  const blocks = [];
  // Trunk with bark variation
  for (let y = 0; y < height; y++) {
    const bark = y % 2 === 0 ? 0x6b4226 : 0x5a3720;
    blocks.push([0, y, 0, bark]);
  }
  // Leafy canopy — rounded shape
  const top = height;
  const leafColors = [0x2d8a2d, 0x3a9e3a, 0x25782a];
  for (let dy = 0; dy < 3; dy++) {
    const r = dy === 1 ? 2 : (dy === 0 ? 2 : 1);
    for (let dx = -r; dx <= r; dx++)
      for (let dz = -r; dz <= r; dz++) {
        if (dx * dx + dz * dz <= r * r + 1) {
          const lc = leafColors[(dx + dz + dy) & 1 ? 0 : (dy === 2 ? 2 : 1)];
          blocks.push([dx, top + dy, dz, lc]);
        }
      }
  }
  return createVoxelGroup(blocks);
}

export function createFlower(color = 0xff4466) {
  const blocks = [
    [0, 0, 0, 0x33aa33], // stem
    [0, 1, 0, 0x33aa33],
    [0, 2, 0, color],    // petals
    [1, 2, 0, color],
    [-1, 2, 0, color],
    [0, 2, 1, color],
    [0, 2, -1, color],
    [0, 3, 0, 0xffee44], // center
  ];
  const g = createVoxelGroup(blocks);
  g.scale.setScalar(0.3);
  return g;
}

export function createFencePost() {
  const blocks = [
    [0, 0, 0, 0x8B6914],
    [0, 1, 0, 0x8B6914],
    [0, 2, 0, 0x9B7924],
  ];
  const g = createVoxelGroup(blocks);
  g.scale.setScalar(0.4);
  return g;
}

export function createFenceRail(length = 3) {
  const blocks = [];
  for (let x = 0; x < length; x++) {
    blocks.push([x, 1, 0, 0x9B7924]);
    blocks.push([x, 2, 0, 0x8B6914]);
  }
  const g = createVoxelGroup(blocks);
  g.scale.setScalar(0.4);
  return g;
}

export function createGrassTuft() {
  const blocks = [];
  const greens = [0x4CAF50, 0x66BB6A, 0x388E3C];
  for (let i = 0; i < 3; i++) {
    const dx = (Math.random() - 0.5) * 2;
    const dz = (Math.random() - 0.5) * 2;
    blocks.push([dx, 0, dz, greens[i]]);
    if (Math.random() > 0.5) blocks.push([dx, 1, dz, greens[(i + 1) % 3]]);
  }
  const g = createVoxelGroup(blocks);
  g.scale.setScalar(0.25);
  return g;
}

export function createRock() {
  const blocks = [
    [0, 0, 0, 0x888888],
    [1, 0, 0, 0x777777],
    [0, 0, 1, 0x999999],
    [0, 1, 0, 0x888888],
  ];
  const g = createVoxelGroup(blocks);
  g.scale.setScalar(0.35);
  return g;
}
