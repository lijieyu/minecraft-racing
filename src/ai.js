export class AIController {
  constructor(vehicle, trackPoints) {
    this.vehicle = vehicle;
    this.trackPoints = trackPoints;
    this.targetIdx = 1;
    this.useItemTimer = 3 + Math.random() * 5;
    // Vary AI speed so they don't bunch
    this.vehicle.maxSpeed = 35 + Math.random() * 15;
  }

  update(dt, weapons, allVehicles) {
    const pos = this.vehicle.pos;
    const target = this.trackPoints[this.targetIdx];
    const dx = target.x - pos.x;
    const dz = target.z - pos.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist < 10) {
      this.targetIdx = (this.targetIdx + 1) % this.trackPoints.length;
    }

    const targetAngle = Math.atan2(dz, dx);
    let angleDiff = targetAngle - this.vehicle.heading;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

    const steer = angleDiff > 0.05 ? 1 : angleDiff < -0.05 ? -1 : 0;
    this.vehicle.applyInput(true, false, steer, dt);

    this.useItemTimer -= dt;
    if (this.useItemTimer <= 0 && this.vehicle.currentItem) {
      weapons.use(this.vehicle.currentItem, this.vehicle, allVehicles);
      this.vehicle.currentItem = null;
      this.useItemTimer = 4 + Math.random() * 6;
    }
  }
}
