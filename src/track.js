import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { createVoxelTree, createFlower, createFencePost, createGrassTuft, createRock } from './voxel.js';

export function generateTrackPoints() {
  const points = [];
  const segments = 80;
  for (let i = 0; i < segments; i++) {
    const t = (i / segments) * Math.PI * 2;
    const rx = 80, rz = 50;
    const x = Math.cos(t) * rx;
    const z = Math.sin(t) * rz;
    let y = 0;
    if (t > Math.PI * 0.3 && t < Math.PI * 0.7) {
      const ht = (t - Math.PI * 0.3) / (Math.PI * 0.4);
      y = Math.sin(ht * Math.PI) * 8;
    }
    points.push(new THREE.Vector3(x, y, z));
  }
  return points;
}

export function getCheckpoints(trackPoints) {
  const cp = [];
  const step = Math.floor(trackPoints.length / 8);
  for (let i = 0; i < 8; i++) cp.push(trackPoints[i * step].clone());
  return cp;
}

export const TRACK_WIDTH = 24;

export function buildTrack(scene, world) {
  const trackPoints = generateTrackPoints();
  const trackWidth = TRACK_WIDTH;
  const group = new THREE.Group();

  // === TRACK SURFACE with colored lanes ===
  const verts = [], colors = [], idx = [];
  for (let i = 0; i < trackPoints.length; i++) {
    const curr = trackPoints[i];
    const next = trackPoints[(i + 1) % trackPoints.length];
    const dir = next.clone().sub(curr).normalize();
    const right = new THREE.Vector3(-dir.z, 0, dir.x).multiplyScalar(trackWidth / 2);
    const l = curr.clone().sub(right);
    const r = curr.clone().add(right);
    const vi = verts.length / 3;
    verts.push(l.x, l.y + 0.01, l.z, r.x, r.y + 0.01, r.z);

    // Alternating dark/light asphalt with colored curb hints
    const checker = (i % 6 < 3);
    const base = checker ? 0.32 : 0.28;
    colors.push(base * 0.9, base, base * 0.9, base, base * 0.9, base * 0.9);

    if (i > 0) {
      const pi = vi - 2;
      idx.push(pi, pi + 1, vi, vi, pi + 1, vi + 1);
    }
  }
  const last = verts.length / 3 - 2;
  idx.push(last, last + 1, 0, 0, last + 1, 1);

  const trackGeo = new THREE.BufferGeometry();
  trackGeo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  trackGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  trackGeo.setIndex(idx);
  trackGeo.computeVertexNormals();
  const trackMesh = new THREE.Mesh(trackGeo, new THREE.MeshLambertMaterial({ vertexColors: true }));
  trackMesh.receiveShadow = true;
  group.add(trackMesh);

  // === CURBS (red-white stripes on edges) ===
  _buildCurbs(trackPoints, trackWidth, group);

  // === CENTER LINE (dashed yellow) ===
  _buildCenterLine(trackPoints, group);

  // === GROUND with texture ===
  _buildGround(group, world);

  // === START/FINISH ARCH ===
  _buildStartArch(trackPoints, trackWidth, group);

  // === DECORATIONS ===
  _buildDecorations(trackPoints, trackWidth, group);

  scene.add(group);
  return { trackPoints, trackGroup: group };
}

function _buildCurbs(trackPoints, trackWidth, group) {
  const curbGeo = new THREE.BoxGeometry(1, 0.3, 1);
  for (let i = 0; i < trackPoints.length; i += 1) {
    const curr = trackPoints[i];
    const next = trackPoints[(i + 1) % trackPoints.length];
    const dir = next.clone().sub(curr).normalize();
    const right = new THREE.Vector3(-dir.z, 0, dir.x);
    const isRed = i % 4 < 2;
    const color = isRed ? 0xdd2222 : 0xffffff;
    for (const side of [-1, 1]) {
      const pos = curr.clone().add(right.clone().multiplyScalar(side * (trackWidth / 2 + 0.5)));
      const m = new THREE.Mesh(curbGeo, new THREE.MeshLambertMaterial({ color }));
      m.position.set(pos.x, pos.y + 0.15, pos.z);
      m.receiveShadow = true;
      group.add(m);
    }
  }
}

function _buildCenterLine(trackPoints, group) {
  const lineGeo = new THREE.BoxGeometry(0.8, 0.05, 0.3);
  const lineMat = new THREE.MeshLambertMaterial({ color: 0xffcc00 });
  for (let i = 0; i < trackPoints.length; i += 3) {
    if (i % 6 >= 3) continue; // dashed
    const p = trackPoints[i];
    const m = new THREE.Mesh(lineGeo, lineMat);
    m.position.set(p.x, p.y + 0.05, p.z);
    const next = trackPoints[(i + 1) % trackPoints.length];
    m.lookAt(next.x, next.y + 0.05, next.z);
    group.add(m);
  }
}

function _buildGround(group, world) {
  // Textured ground using canvas
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 256;
  const ctx = canvas.getContext('2d');
  for (let y = 0; y < 256; y += 4)
    for (let x = 0; x < 256; x += 4) {
      const g = 90 + Math.random() * 40;
      ctx.fillStyle = `rgb(${g * 0.6|0},${g|0},${g * 0.4|0})`;
      ctx.fillRect(x, y, 4, 4);
    }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(30, 30);
  tex.magFilter = THREE.NearestFilter;

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(400, 400),
    new THREE.MeshLambertMaterial({ map: tex })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.1;
  ground.receiveShadow = true;
  group.add(ground);

  const groundBody = new CANNON.Body({ mass: 0 });
  groundBody.addShape(new CANNON.Plane());
  groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
  world.addBody(groundBody);
}

function _buildStartArch(trackPoints, trackWidth, group) {
  const p = trackPoints[0];
  const next = trackPoints[1];
  const dir = next.clone().sub(p).normalize();
  const right = new THREE.Vector3(-dir.z, 0, dir.x);
  // Two pillars + banner
  const pillarGeo = new THREE.BoxGeometry(1, 8, 1);
  const pillarMat = new THREE.MeshLambertMaterial({ color: 0xeeeeee });
  for (const side of [-1, 1]) {
    const pos = p.clone().add(right.clone().multiplyScalar(side * (trackWidth / 2 + 1)));
    const pillar = new THREE.Mesh(pillarGeo, pillarMat);
    pillar.position.set(pos.x, p.y + 4, pos.z);
    pillar.castShadow = true;
    group.add(pillar);
  }
  // Checkered banner
  const bannerGeo = new THREE.BoxGeometry(0.5, 2, trackWidth + 2);
  const bannerCanvas = document.createElement('canvas');
  bannerCanvas.width = 64; bannerCanvas.height = 16;
  const bctx = bannerCanvas.getContext('2d');
  for (let y = 0; y < 16; y += 4)
    for (let x = 0; x < 64; x += 4) {
      bctx.fillStyle = ((x / 4 + y / 4) % 2 === 0) ? '#111' : '#fff';
      bctx.fillRect(x, y, 4, 4);
    }
  const bannerTex = new THREE.CanvasTexture(bannerCanvas);
  bannerTex.magFilter = THREE.NearestFilter;
  const banner = new THREE.Mesh(bannerGeo, new THREE.MeshLambertMaterial({ map: bannerTex }));
  banner.position.set(p.x, p.y + 7.5, p.z);
  group.add(banner);
}

function _buildDecorations(trackPoints, trackWidth, group) {
  const flowerColors = [0xff4466, 0xff66aa, 0xffaa33, 0x66aaff, 0xffff44];
  for (let i = 0; i < trackPoints.length; i += 2) {
    const p = trackPoints[i];
    const next = trackPoints[(i + 1) % trackPoints.length];
    const dir = next.clone().sub(p).normalize();
    const right = new THREE.Vector3(-dir.z, 0, dir.x);

    for (const side of [-1, 1]) {
      const dist = trackWidth / 2 + 3 + Math.random() * 6;
      const off = right.clone().multiplyScalar(side * dist);
      const wx = p.x + off.x, wz = p.z + off.z;

      if (i % 10 === 0) {
        // Tree
        const tree = createVoxelTree(3 + Math.floor(Math.random() * 4));
        tree.position.set(wx, p.y, wz);
        tree.scale.setScalar(0.5 + Math.random() * 0.3);
        group.add(tree);
      } else if (i % 6 === 0) {
        // Flower
        const f = createFlower(flowerColors[i % flowerColors.length]);
        f.position.set(wx, p.y, wz);
        group.add(f);
      } else if (i % 8 === 0) {
        // Grass tuft
        const g = createGrassTuft();
        g.position.set(wx, p.y, wz);
        group.add(g);
      } else if (i % 14 === 0) {
        // Rock
        const r = createRock();
        r.position.set(wx, p.y, wz);
        group.add(r);
      }
    }

    // Fence posts along outer edge every 8 segments
    if (i % 8 === 0) {
      for (const side of [-1, 1]) {
        const off = right.clone().multiplyScalar(side * (trackWidth / 2 + 2));
        const fp = createFencePost();
        fp.position.set(p.x + off.x, p.y, p.z + off.z);
        group.add(fp);
      }
    }
  }
}
