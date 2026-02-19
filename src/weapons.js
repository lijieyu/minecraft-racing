import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { playHitSound } from './audio.js';

function screenFlash(color, duration = 150) {
  const el = document.createElement('div');
  el.style.cssText = `position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:50;background:${color};opacity:0.4;transition:opacity ${duration}ms`;
  document.body.appendChild(el);
  requestAnimationFrame(() => { el.style.opacity = '0'; });
  setTimeout(() => el.remove(), duration + 50);
}

export class WeaponSystem {
  constructor(scene, world, particles) {
    this.scene = scene;
    this.world = world;
    this.particles = particles;
    this.projectiles = [];
    this.ITEMS = ['tnt', 'arrow', 'potion'];
  }

  randomItem() {
    return this.ITEMS[Math.floor(Math.random() * this.ITEMS.length)];
  }

  use(item, shooter, vehicles) {
    const pos = shooter.getPosition();
    const fw = shooter.getForward();
    if (item === 'tnt') this._fireTNT(pos, fw, shooter, vehicles);
    else if (item === 'arrow') this._fireArrow(pos, fw, shooter, vehicles);
    else if (item === 'potion') this._firePotion(pos, fw, shooter, vehicles);
  }

  _fireTNT(pos, fw, shooter, vehicles) {
    const geo = new THREE.BoxGeometry(0.8, 0.8, 0.8);
    const mat = new THREE.MeshLambertMaterial({ color: 0xff0000 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(pos.x + fw.x * 3, pos.y + 1, pos.z + fw.z * 3);
    this.scene.add(mesh);

    const body = new CANNON.Body({ mass: 1 });
    body.addShape(new CANNON.Sphere(0.4));
    body.position.set(mesh.position.x, mesh.position.y, mesh.position.z);
    body.velocity.set(fw.x * 30, 5, fw.z * 30);
    this.world.addBody(body);

    this.projectiles.push({
      type: 'tnt', mesh, body, life: 2, shooter, vehicles
    });
  }

  _fireArrow(pos, fw, shooter, vehicles) {
    // Find target ahead
    let target = null, minDist = Infinity;
    for (const v of vehicles) {
      if (v === shooter) continue;
      const tp = v.getPosition();
      const diff = new CANNON.Vec3(tp.x - pos.x, 0, tp.z - pos.z);
      const dot = diff.x * fw.x + diff.z * fw.z;
      if (dot > 0 && diff.length() < minDist) {
        minDist = diff.length();
        target = v;
      }
    }

    const geo = new THREE.BoxGeometry(0.2, 0.2, 1.5);
    const mat = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(pos.x + fw.x * 3, pos.y + 1.5, pos.z + fw.z * 3);
    this.scene.add(mesh);

    this.projectiles.push({
      type: 'arrow', mesh, body: null, life: 3,
      vel: new THREE.Vector3(fw.x * 40, 0, fw.z * 40),
      target, shooter, vehicles
    });
  }

  _firePotion(pos, fw, shooter, vehicles) {
    const geo = new THREE.BoxGeometry(0.5, 0.7, 0.5);
    const mat = new THREE.MeshLambertMaterial({ color: 0x9b59b6 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(pos.x + fw.x * 3, pos.y + 1, pos.z + fw.z * 3);
    this.scene.add(mesh);

    this.projectiles.push({
      type: 'potion', mesh, body: null, life: 2,
      vel: new THREE.Vector3(fw.x * 25, 3, fw.z * 25),
      shooter, vehicles
    });
  }

  update(dt) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.life -= dt;

      if (p.type === 'tnt' && p.body) {
        p.mesh.position.copy(p.body.position);
        p.mesh.rotation.x += dt * 5;
      } else if (p.type === 'arrow') {
        // Homing
        if (p.target) {
          const tp = p.target.getPosition();
          const dir = new THREE.Vector3(tp.x, tp.y + 1, tp.z).sub(p.mesh.position).normalize();
          p.vel.lerp(dir.multiplyScalar(40), dt * 2);
        }
        p.mesh.position.addScaledVector(p.vel, dt);
        p.mesh.lookAt(p.mesh.position.clone().add(p.vel));
      } else if (p.type === 'potion') {
        p.vel.y -= 9.8 * dt;
        p.mesh.position.addScaledVector(p.vel, dt);
      }

      // Check hits
      let hit = false;
      for (const v of (p.vehicles || [])) {
        if (v === p.shooter) continue;
        const vp = v.getPosition();
        const dist = p.mesh.position.distanceTo(new THREE.Vector3(vp.x, vp.y, vp.z));
        if (dist < 3) {
          hit = true;
          if (p.type === 'tnt') {
            playHitSound('tnt');
            screenFlash('rgba(255,68,0,0.5)');
            this.particles.emit(p.mesh.position, 0xff4400, 30, 8, 1.5);
            this.particles.emit(p.mesh.position, 0xffaa00, 20, 6, 1.0);
            // Blast all nearby
            for (const v2 of p.vehicles) {
              const d2 = p.mesh.position.distanceTo(new THREE.Vector3(v2.getPosition().x, v2.getPosition().y, v2.getPosition().z));
              if (d2 < 8) {
                const force = (1 - d2 / 8) * 500;
                v2.body.velocity.y += force * 0.05;
                v2.slowTimer = 1.5;
              }
            }
          } else if (p.type === 'arrow') {
            playHitSound('arrow');
            screenFlash('rgba(255,255,255,0.4)', 100);
            this.particles.emit(p.mesh.position, 0xffffff, 10, 3, 0.5);
            v.body.velocity.y += 5;
            v.slowTimer = 1.0;
          } else if (p.type === 'potion') {
            playHitSound('potion');
            screenFlash('rgba(155,89,182,0.4)', 200);
            this.particles.emit(p.mesh.position, 0x9b59b6, 25, 5, 1.2);
            // Slow all nearby
            for (const v2 of p.vehicles) {
              const d2 = p.mesh.position.distanceTo(new THREE.Vector3(v2.getPosition().x, v2.getPosition().y, v2.getPosition().z));
              if (d2 < 6) v2.slowTimer = 3.0;
            }
          }
          break;
        }
      }

      if (hit || p.life <= 0) {
        this.scene.remove(p.mesh);
        if (p.body) this.world.removeBody(p.body);
        p.mesh.geometry.dispose();
        p.mesh.material.dispose();
        this.projectiles.splice(i, 1);
      }
    }
  }
}
