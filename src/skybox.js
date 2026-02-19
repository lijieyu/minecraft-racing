import * as THREE from 'three';

export function createSkybox(scene) {
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // Rich gradient sky
  const grad = ctx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, '#2266bb');
  grad.addColorStop(0.25, '#4a90d9');
  grad.addColorStop(0.5, '#87ceeb');
  grad.addColorStop(0.75, '#b8e4f0');
  grad.addColorStop(1, '#d4f0ff');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);

  // Sun glow
  const sunGrad = ctx.createRadialGradient(380, 80, 10, 380, 80, 80);
  sunGrad.addColorStop(0, 'rgba(255,255,200,0.9)');
  sunGrad.addColorStop(0.3, 'rgba(255,240,150,0.4)');
  sunGrad.addColorStop(1, 'rgba(255,240,150,0)');
  ctx.fillStyle = sunGrad;
  ctx.fillRect(300, 0, 160, 160);

  // Pixel-art clouds — chunky Minecraft style
  ctx.fillStyle = '#ffffff';
  const clouds = [
    [30, 60, 80, 20], [40, 50, 60, 12], [50, 65, 40, 15],
    [180, 40, 100, 24], [190, 30, 70, 16], [200, 45, 50, 18],
    [350, 70, 60, 16], [340, 60, 80, 14],
    [80, 100, 90, 18], [90, 90, 60, 14],
    [420, 50, 70, 20], [430, 40, 50, 14],
    [250, 80, 75, 16], [260, 72, 55, 12],
  ];
  for (const [cx, cy, w, h] of clouds) {
    // Blocky cloud shape — stacked rectangles
    ctx.globalAlpha = 0.95;
    ctx.fillRect(cx, cy, w, h);
    ctx.fillRect(cx + 4, cy - h * 0.4, w * 0.7, h * 0.5);
    ctx.fillRect(cx + w * 0.2, cy - h * 0.3, w * 0.5, h * 0.4);
    // Shadow underneath
    ctx.globalAlpha = 0.15;
    ctx.fillStyle = '#8899aa';
    ctx.fillRect(cx, cy + h * 0.7, w, h * 0.3);
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 1;
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter; // pixel look
  const skyGeo = new THREE.SphereGeometry(500, 32, 32);
  const skyMat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide });
  const sky = new THREE.Mesh(skyGeo, skyMat);
  scene.add(sky);
  return sky;
}
