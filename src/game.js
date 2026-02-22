import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { buildTrack, generateTrackPoints, getCheckpoints, TRACK_WIDTH, TRACKS } from './track.js';
import { Vehicle } from './vehicle.js';
import { AIController } from './ai.js';
import { WeaponSystem } from './weapons.js';
import { ParticleSystem } from './particles.js';
import { HUD } from './hud.js';
import { createSkybox } from './skybox.js';
import { CHARACTERS } from './characters.js';
import { startMusic, stopMusic } from './audio.js';
import { TouchControls } from './touch.js';

export class Game {
  constructor() {
    this.scene = null; this.camera = null; this.renderer = null; this.world = null;
    this.player = null; this.aiVehicles = []; this.aiControllers = [];
    this.allVehicles = []; this.weapons = null; this.particles = null;
    this.hud = null; this.touch = null; this.trackPoints = []; this.checkpoints = [];
    this.itemBoxes = []; this.keys = {};
    this.totalLaps = 5; this.countdown = 3;
    this.raceStarted = false; this.raceFinished = false;
    this.clock = new THREE.Clock();
  }

  getGroundHeight(x, z) {
    // Sample track height from track points
    let minDist = Infinity, height = 0;
    for (const p of this.trackPoints) {
      const d = (p.x - x) ** 2 + (p.z - z) ** 2;
      if (d < minDist) { minDist = d; height = p.y; }
    }
    return minDist < 400 ? height : 0;
  }

  init(playerCharIdx, speedCfg, mapIdx = 0) {
    this.speedCfg = speedCfg;
    this.mapIdx = mapIdx;
    this._setupRenderer();
    this._setupPhysics();
    this._setupScene();
    this.trackPoints = generateTrackPoints(mapIdx);
    this.checkpoints = getCheckpoints(this.trackPoints);
    buildTrack(this.scene, this.world, mapIdx);
    const fogColor = TRACKS[mapIdx].fogColor;
    this.scene.fog = new THREE.Fog(fogColor, 100, 400);
    this.scene.background = new THREE.Color(fogColor);
    this.particles = new ParticleSystem(this.scene);
    this.weapons = new WeaponSystem(this.scene, this.world, this.particles);
    this.hud = new HUD();
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
      this.touch = new TouchControls(this);
    }
    this._spawnVehicles(playerCharIdx);
    this._spawnItemBoxes();
    this._setupInput();
    this.countdown = 3; this.raceStarted = false; this.raceFinished = false;
    this.clock.start();
    this._animate();
  }

  _setupRenderer() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(this.renderer.domElement);
    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  _setupPhysics() {
    this.world = new CANNON.World({ gravity: new CANNON.Vec3(0, -20, 0) });
    this.world.broadphase = new CANNON.NaiveBroadphase();
  }

  _setupScene() {
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0x87ceeb, 100, 400);
    this.scene.add(new THREE.AmbientLight(0x606060));
    const sun = new THREE.DirectionalLight(0xffffff, 1.0);
    sun.position.set(50, 80, 30);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const sc = sun.shadow.camera;
    sc.left = sc.bottom = -100; sc.right = sc.top = 100;
    this.scene.add(sun);
    createSkybox(this.scene);
  }

  _spawnVehicles(playerCharIdx) {
    const sp = this.trackPoints[0], np = this.trackPoints[1];
    const dir = new THREE.Vector3().subVectors(np, sp).normalize();
    const right = new THREE.Vector3(-dir.z, 0, dir.x);
    const yaw = Math.atan2(dir.z, dir.x);

    this.player = new Vehicle(this.scene, this.world, CHARACTERS[playerCharIdx], true, this.speedCfg);
    this.player.setPosition(sp.x, sp.y + 1, sp.z);
    this.player.setHeading(yaw);
    this.allVehicles = [this.player];

    const aiChars = CHARACTERS.filter((_, i) => i !== playerCharIdx).slice(0, 3);
    this.aiVehicles = []; this.aiControllers = [];
    aiChars.forEach((charDef, i) => {
      const v = new Vehicle(this.scene, this.world, charDef, false, this.speedCfg);
      const off = right.clone().multiplyScalar((i - 1) * 4);
      v.setPosition(sp.x - dir.x * 5 * (i + 1) + off.x, sp.y + 1, sp.z - dir.z * 5 * (i + 1) + off.z);
      v.setHeading(yaw);
      this.aiVehicles.push(v);
      this.aiControllers.push(new AIController(v, this.trackPoints));
      this.allVehicles.push(v);
    });
  }

  _spawnItemBoxes() {
    const step = Math.floor(this.trackPoints.length / 10);
    const canvas = document.createElement('canvas');
    canvas.width = 32; canvas.height = 32;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffcc00'; ctx.fillRect(0, 0, 32, 32);
    ctx.fillStyle = '#cc8800'; ctx.fillRect(0, 0, 32, 2); ctx.fillRect(0, 30, 32, 2);
    ctx.fillRect(0, 0, 2, 32); ctx.fillRect(30, 0, 2, 32);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 22px monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('?', 16, 17);
    const tex = new THREE.CanvasTexture(canvas);
    tex.magFilter = THREE.NearestFilter;
    const geo = new THREE.BoxGeometry(1.8, 1.8, 1.8);
    const mat = new THREE.MeshLambertMaterial({ map: tex });

    for (let i = 0; i < 10; i++) {
      const idx = i * step;
      const p = this.trackPoints[idx];
      const np = this.trackPoints[(idx + 1) % this.trackPoints.length];
      const right = new THREE.Vector3(-(np.z - p.z), 0, np.x - p.x).normalize();
      for (let j = -1; j <= 1; j++) {
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(p.x + right.x * j * 3.5, p.y + 2, p.z + right.z * j * 3.5);
        mesh.castShadow = true;
        this.scene.add(mesh);
        this.itemBoxes.push({ mesh, active: true, respawnTimer: 0, baseY: p.y + 2, phase: i * 0.7 + j });
      }
    }
  }

  _setupInput() {
    let lastSpaceDown = 0;
    let itemUseTimer = null;
    window.addEventListener('keydown', e => {
      this.keys[e.code] = true;
      if (e.code === 'Space') {
        const now = Date.now();
        if (now - lastSpaceDown < 300) {
          clearTimeout(itemUseTimer);
          this._useSkill();
        } else {
          itemUseTimer = setTimeout(() => {
            if (!this.player || !this.raceStarted || this.raceFinished) return;
            if (this.player.currentItem) {
              this.weapons.use(this.player.currentItem, this.player, this.allVehicles);
              this.player.currentItem = null;
            }
          }, 250);
        }
        lastSpaceDown = now;
      }
    });
    window.addEventListener('keyup', e => { this.keys[e.code] = false; });
  }

  _useSkill() {
    if (!this.raceStarted || this.raceFinished) return;
    const p = this.player;
    if (p.skillCooldown > 0) return;
    const id = p.charDef.id;
    const pp = p.getPosition();

    if (id === 'steve') {
      p.boostTimer = 3;
    } else if (id === 'alex') {
      const target = [...this.allVehicles]
        .filter(v => v !== p && v.trackProgress > p.trackProgress)
        .sort((a, b) => a.trackProgress - b.trackProgress)[0]
        || [...this.allVehicles].filter(v => v !== p).sort((a, b) => b.trackProgress - a.trackProgress)[0];
      if (target) { target.slowTimer = 4; this.particles.emitPickup(target.getPosition().clone()); }
    } else if (id === 'creeper') {
      for (const v of this.allVehicles) {
        if (v === p) continue;
        const vp = v.getPosition();
        if (Math.hypot(vp.x - pp.x, vp.z - pp.z) < 22) v.slowTimer = 3;
      }
      p.boostTimer = 1.5;
      this.particles.emitPickup(new THREE.Vector3(pp.x, pp.y + 1, pp.z));
    } else if (id === 'enderman') {
      const ahead = [...this.allVehicles]
        .filter(v => v !== p && v.trackProgress > p.trackProgress)
        .sort((a, b) => b.trackProgress - a.trackProgress)[0];
      if (ahead) {
        const lp = ahead.getPosition();
        const fw = ahead.getForward();
        p.setPosition(lp.x - fw.x * 8, lp.y, lp.z - fw.z * 8);
        p.setHeading(ahead.heading);
        p.speed = ahead.speed * 0.8;
      } else {
        // Already 1st: jump forward to next checkpoint
        const tp = this.trackPoints[(p.nextCheckpoint * Math.floor(this.trackPoints.length / this.checkpoints.length)) % this.trackPoints.length];
        p.setPosition(tp.x, tp.y + 0.5, tp.z);
        p.speed = p.maxSpeed * 0.8;
      }
      this.particles.emitPickup(p.getPosition().clone());
    }
    p.skillCooldown = 10;
  }

  _animate() {
    const gh = (x, z) => this.getGroundHeight(x, z);
    const tick = () => {
      if (this._stopped) return;
      const dt = Math.min(this.clock.getDelta(), 0.05);

      if (this.countdown > 0) {
        this.countdown -= dt;
        const cd = Math.ceil(Math.max(0, this.countdown));
        this.hud.update(0, 0, this.totalLaps, 1, null, cd > 0 ? cd : 'GO!', null);
        this._updateCamera();
        this.renderer.render(this.scene, this.camera);
        return;
      }
      if (!this.raceStarted) { this.raceStarted = true; startMusic(); }

      if (!this.raceFinished) {
        this._handleInput(dt);
        this.aiControllers.forEach(ai => ai.update(dt, this.weapons, this.allVehicles));
      }

      this.allVehicles.forEach(v => v.update(dt, gh));
      this._clampVehiclesToTrack();
      this.weapons.update(dt);
      this.particles.update(dt);
      this._updateItemBoxes(dt);
      this._updateCheckpoints();
      this._updateRanks();
      this._updateCamera();

      const speed = this.player.getSpeed();
      const skill = this.player.charDef.skill
        ? { ...this.player.charDef.skill, cooldown: this.player.skillCooldown }
        : null;
      this.hud.update(speed, this.player.lap, this.totalLaps, this.player.rank, this.player.currentItem, '', skill);

      if (this.raceStarted && speed > 5) {
        const pp = this.player.getPosition();
        const fw = this.player.getForward();
        this.particles.emitTrail(
          new THREE.Vector3(pp.x - fw.x * 2, pp.y, pp.z - fw.z * 2),
          new THREE.Vector3(fw.x, 0, fw.z), 0xff6600
        );
      }
      this.renderer.render(this.scene, this.camera);
    };
    // Use both rAF and setInterval so it works even when tab is hidden
    const raf = () => { if (this._stopped) return; tick(); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
    this._interval = setInterval(() => { if (document.hidden) tick(); }, 1000 / 30);
  }

  _handleInput(dt) {
    const k = this.keys;
    const accel = k['KeyW'] || k['ArrowUp'];
    const brake = k['KeyS'] || k['ArrowDown'];
    const left = k['KeyA'] || k['ArrowLeft'];
    const right = k['KeyD'] || k['ArrowRight'];
    this.player.applyInput(accel, brake, (right ? 1 : 0) - (left ? 1 : 0), dt);
  }

  _updateCamera() {
    const pp = this.player.getPosition();
    const fw = this.player.getForward();
    const target = new THREE.Vector3(pp.x - fw.x * 12, pp.y + 8, pp.z - fw.z * 12);
    this.camera.position.lerp(target, 0.05);
    this.camera.lookAt(pp.x, pp.y + 1, pp.z);
  }

  _updateItemBoxes(dt) {
    this._boxTime = (this._boxTime || 0) + dt;
    for (const box of this.itemBoxes) {
      if (!box.active) {
        box.respawnTimer -= dt;
        if (box.respawnTimer <= 0) { box.active = true; box.mesh.visible = true; }
        continue;
      }
      box.mesh.rotation.y += dt * 2;
      box.mesh.position.y = box.baseY + Math.sin(this._boxTime * 3 + box.phase) * 0.4;
      for (const v of this.allVehicles) {
        const vp = v.getPosition();
        if (box.mesh.position.distanceTo(new THREE.Vector3(vp.x, vp.y, vp.z)) < 3 && !v.currentItem) {
          v.currentItem = this.weapons.randomItem();
          this.particles.emitPickup(box.mesh.position.clone());
          box.active = false; box.mesh.visible = false; box.respawnTimer = 8;
          break;
        }
      }
    }
  }

  _updateCheckpoints() {
    for (const v of this.allVehicles) {
      if (v.finished) continue;
      const cp = this.checkpoints[v.nextCheckpoint];
      const vp = v.getPosition();
      if (Math.sqrt((vp.x - cp.x) ** 2 + (vp.z - cp.z) ** 2) < 15) {
        v.nextCheckpoint++;
        if (v.nextCheckpoint >= this.checkpoints.length) {
          v.nextCheckpoint = 0; v.lap++;
          if (v.lap >= this.totalLaps) {
            v.finished = true;
            if (v.isPlayer) this._endRace();
          }
        }
      }
      v.trackProgress = v.lap * this.checkpoints.length + v.nextCheckpoint;
    }
  }

  _updateRanks() {
    [...this.allVehicles].sort((a, b) => b.trackProgress - a.trackProgress)
      .forEach((v, i) => v.rank = i + 1);
  }

  _clampVehiclesToTrack() {
    const hw = TRACK_WIDTH / 2 - 1;
    const pts = this.trackPoints;
    for (const v of this.allVehicles) {
      const vp = v.getPosition();
      let minDist = Infinity, closest = 0;
      for (let i = 0; i < pts.length; i++) {
        const d = (vp.x - pts[i].x) ** 2 + (vp.z - pts[i].z) ** 2;
        if (d < minDist) { minDist = d; closest = i; }
      }
      const cp = pts[closest];
      const np = pts[(closest + 1) % pts.length];
      const right = new THREE.Vector3(-(np.z - cp.z), 0, np.x - cp.x).normalize();
      const off = (vp.x - cp.x) * right.x + (vp.z - cp.z) * right.z;
      if (Math.abs(off) > hw) {
        const push = (Math.abs(off) - hw) * Math.sign(off);
        v.pos.x -= right.x * push;
        v.pos.z -= right.z * push;
        v.body.position.set(v.pos.x, v.pos.y, v.pos.z);
        v.mesh.position.copy(v.body.position);
        if (v.speed > 5) v.speed *= 0.7;
      }
    }
  }

  _endRace() {
    this.raceFinished = true;
    this.hud.hide();
    if (this.onFinish) this.onFinish(this.player.rank);
  }

  destroy() {
    this._stopped = true;
    stopMusic();
    if (this._interval) clearInterval(this._interval);
    if (this.renderer) {
      document.body.removeChild(this.renderer.domElement);
      this.renderer.dispose();
    }
    if (this.hud) this.hud.el.remove();
    if (this.touch) this.touch.destroy();
    this.scene = null; this.world = null;
  }
}
