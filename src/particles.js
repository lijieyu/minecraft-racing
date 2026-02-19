import * as THREE from 'three';

export class ParticleSystem {
  constructor(scene) {
    this.scene = scene;
    this.particles = [];
  }

  emit(position, color, count = 20, speed = 5, life = 1.0) {
    for (let i = 0; i < count; i++) {
      const size = 0.15 + Math.random() * 0.25;
      const geo = new THREE.BoxGeometry(size, size, size);
      const mat = new THREE.MeshBasicMaterial({ color, transparent: true });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(position);
      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * speed,
        Math.random() * speed * 0.8 + speed * 0.2,
        (Math.random() - 0.5) * speed
      );
      this.scene.add(mesh);
      this.particles.push({ mesh, vel, life, maxLife: life });
    }
  }

  emitTrail(position, direction, color = 0xff6600) {
    // Emit 2-3 particles per call for thicker trail
    for (let i = 0; i < 2; i++) {
      const size = 0.15 + Math.random() * 0.15;
      const geo = new THREE.BoxGeometry(size, size, size);
      const c = i === 0 ? color : 0xffaa00;
      const mat = new THREE.MeshBasicMaterial({ color: c, transparent: true });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(position).add(
        new THREE.Vector3((Math.random() - 0.5) * 0.5, Math.random() * 0.3, (Math.random() - 0.5) * 0.5)
      );
      const vel = direction.clone().multiplyScalar(-1.5).add(
        new THREE.Vector3((Math.random() - 0.5) * 0.8, Math.random() * 0.6 + 0.2, (Math.random() - 0.5) * 0.8)
      );
      this.scene.add(mesh);
      this.particles.push({ mesh, vel, life: 0.4 + Math.random() * 0.3, maxLife: 0.6 });
    }
  }

  emitPickup(position) {
    // Sparkle effect for item pickup
    const colors = [0xffff00, 0xffffff, 0x44ff44, 0xff44ff];
    for (let i = 0; i < 15; i++) {
      const geo = new THREE.BoxGeometry(0.2, 0.2, 0.2);
      const mat = new THREE.MeshBasicMaterial({ color: colors[i % colors.length], transparent: true });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(position);
      const angle = (i / 15) * Math.PI * 2;
      const vel = new THREE.Vector3(Math.cos(angle) * 4, 3 + Math.random() * 2, Math.sin(angle) * 4);
      this.scene.add(mesh);
      this.particles.push({ mesh, vel, life: 0.8, maxLife: 0.8 });
    }
  }

  update(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        p.mesh.material.dispose();
        this.particles.splice(i, 1);
        continue;
      }
      p.vel.y -= 6 * dt;
      p.mesh.position.addScaledVector(p.vel, dt);
      const t = p.life / p.maxLife;
      p.mesh.material.opacity = t;
      p.mesh.scale.setScalar(0.5 + t * 0.5);
      p.mesh.rotation.x += dt * 3;
      p.mesh.rotation.z += dt * 2;
    }
  }
}
