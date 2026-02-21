import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { createVoxelGroup } from './voxel.js';

export class Vehicle {
  constructor(scene, world, charDef, isPlayer = false, speedCfg) {
    this.scene = scene;
    this.world = world;
    this.charDef = charDef;
    this.isPlayer = isPlayer;
    this.speed = 0;
    this.maxSpeed = speedCfg?.maxSpeed ?? 45;
    this.acceleration = speedCfg?.acceleration ?? 30;
    this.braking = 40;
    this.friction = 8;
    this.turnSpeed = speedCfg?.turnSpeed ?? 2.2;
    this.heading = 0;
    this.currentItem = null;
    this.slowTimer = 0;
    this.skillCooldown = 0;
    this.boostTimer = 0;
    this.lap = 0;
    this.nextCheckpoint = 0;
    this.finished = false;
    this.rank = 0;
    this.trackProgress = 0;
    this.pos = new THREE.Vector3(0, 0.5, 0);
    this.verticalVel = 0;
    this.tilt = 0; // visual lean on turns

    this._buildMesh();
    this._buildBody();
  }

  _buildMesh() {
    const c = this.charDef;
    const blocks = [];
    const dk = (col) => {
      const r = ((col >> 16) & 0xff) * 0.75 | 0;
      const g = ((col >> 8) & 0xff) * 0.75 | 0;
      const b = (col & 0xff) * 0.75 | 0;
      return (r << 16) | (g << 8) | b;
    };

    // === CHASSIS (lower body) ===
    // Floor pan — wide flat base
    for (let x = -2; x <= 3; x++)
      for (let z = -2; z <= 2; z++)
        blocks.push([x, 0, z, dk(c.shirt)]);

    // Side panels — raised edges
    for (let x = -2; x <= 3; x++) {
      blocks.push([x, 1, -2, dk(c.shirt)]);
      blocks.push([x, 1, 2, dk(c.shirt)]);
    }
    // Front & rear bumpers
    for (let z = -2; z <= 2; z++) {
      blocks.push([-2, 1, z, 0x333333]);
      blocks.push([3, 1, z, c.shirt]);
    }

    // === BODY (upper) ===
    for (let x = -1; x <= 2; x++)
      for (let z = -1; z <= 1; z++)
        blocks.push([x, 1, z, c.shirt]);

    // Hood — front slope
    blocks.push([3, 1, -1, c.shirt]);
    blocks.push([3, 1, 0, c.shirt]);
    blocks.push([3, 1, 1, c.shirt]);

    // Engine block on hood
    blocks.push([3, 2, 0, 0x444444]);

    // Spoiler at rear
    blocks.push([-2, 2, -2, 0xcc0000]);
    blocks.push([-2, 2, 2, 0xcc0000]);
    blocks.push([-2, 3, -2, 0xcc0000]);
    blocks.push([-2, 3, -1, 0xcc0000]);
    blocks.push([-2, 3, 0, 0xcc0000]);
    blocks.push([-2, 3, 1, 0xcc0000]);
    blocks.push([-2, 3, 2, 0xcc0000]);

    // === WHEELS (4 chunky wheels) ===
    const wheelColor = 0x222222;
    const hubColor = 0xcccccc;
    for (const [wx, wz] of [[3, -2], [3, 2], [-2, -2], [-2, 2]]) {
      blocks.push([wx, -1, wz, wheelColor]);
      blocks.push([wx, 0, wz, wheelColor]);
      // Hub cap
      const hubZ = wz > 0 ? wz + 1 : wz - 1;
      blocks.push([wx, 0, hubZ, hubColor]);
    }

    // Axle covers
    for (const wx of [-2, 3]) {
      blocks.push([wx, -1, -1, 0x333333]);
      blocks.push([wx, -1, 0, 0x333333]);
      blocks.push([wx, -1, 1, 0x333333]);
    }

    // === DRIVER ===
    // Seat
    blocks.push([0, 2, 0, dk(c.shirt)]);
    // Torso
    blocks.push([0, 3, 0, c.shirt]);
    blocks.push([0, 4, 0, c.shirt]);
    blocks.push([1, 3, 0, c.shirt]); // arm forward on wheel
    // Head (2x2x2)
    blocks.push([0, 5, 0, c.skin]);
    blocks.push([1, 5, 0, c.skin]);
    blocks.push([0, 6, 0, c.skin]);
    blocks.push([1, 6, 0, c.skin]);
    // Face details
    blocks.push([1.5, 6, 0, c.eyes]); // eyes
    blocks.push([1.5, 5, 0, c.skin]); // mouth area
    // Hair/hat top
    blocks.push([0, 7, 0, dk(c.skin)]);
    blocks.push([1, 7, 0, dk(c.skin)]);

    // === HEADLIGHTS ===
    blocks.push([4, 1, -1, 0xffffaa]);
    blocks.push([4, 1, 1, 0xffffaa]);

    // === EXHAUST PIPE ===
    blocks.push([-3, 1, 1, 0x555555]);
    blocks.push([-3, 2, 1, 0x555555]);

    this.mesh = createVoxelGroup(blocks);
    this.mesh.scale.setScalar(0.35);
    this.scene.add(this.mesh);
  }

  _buildBody() {
    const shape = new CANNON.Box(new CANNON.Vec3(1.5, 0.75, 1));
    this.body = new CANNON.Body({ mass: 0, type: CANNON.Body.KINEMATIC });
    this.body.addShape(shape);
    this.world.addBody(this.body);
  }

  setPosition(x, y, z) {
    this.pos.set(x, y, z);
    this.body.position.set(x, y, z);
    this.speed = 0;
  }

  setHeading(angle) { this.heading = angle; }

  getForward() {
    return new CANNON.Vec3(Math.cos(this.heading), 0, Math.sin(this.heading));
  }

  getPosition() { return this.body.position; }
  getSpeed() { return Math.abs(this.speed); }

  applyInput(accel, brake, steerDir, dt) {
    const slowMult = this.slowTimer > 0 ? 0.4 : 1.0;
    if (this.slowTimer > 0) this.slowTimer -= dt;
    const boostMult = this.boostTimer > 0 ? 1.5 : 1.0;
    if (this.boostTimer > 0) this.boostTimer -= dt;

    if (accel) this.speed += this.acceleration * dt;
    else if (brake) this.speed -= this.braking * dt;
    else {
      if (this.speed > 0) this.speed = Math.max(0, this.speed - this.friction * dt);
      else if (this.speed < 0) this.speed = Math.min(0, this.speed + this.friction * dt);
    }
    this.speed = Math.max(-15, Math.min(this.maxSpeed * slowMult * boostMult, this.speed));

    if (Math.abs(this.speed) > 1) {
      this.heading += steerDir * this.turnSpeed * dt * (this.speed > 0 ? 1 : -1);
    }
    // Visual tilt toward turn direction
    this.tilt += (steerDir * 0.15 - this.tilt) * 5 * dt;
  }

  update(dt, getGroundHeight) {
    if (this.skillCooldown > 0) this.skillCooldown -= dt;
    const fw = this.getForward();
    this.pos.x += fw.x * this.speed * dt;
    this.pos.z += fw.z * this.speed * dt;

    const groundY = getGroundHeight ? getGroundHeight(this.pos.x, this.pos.z) : 0;
    const targetY = groundY + 0.5;
    if (this.pos.y > targetY + 0.1) {
      this.verticalVel -= 30 * dt;
      this.pos.y += this.verticalVel * dt;
      if (this.pos.y < targetY) { this.pos.y = targetY; this.verticalVel = 0; }
    } else {
      this.pos.y = targetY;
      this.verticalVel = 0;
    }

    this.body.position.set(this.pos.x, this.pos.y, this.pos.z);
    this.body.quaternion.setFromEuler(this.tilt, -this.heading, 0);

    this.mesh.position.copy(this.body.position);
    this.mesh.quaternion.copy(this.body.quaternion);
  }
}
