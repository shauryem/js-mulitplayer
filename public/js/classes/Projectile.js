class Projectile {
  constructor({ x, y, radius, color = 'white', velocity }) {
    this.x = x; // Absolute map position
    this.y = y; // Absolute map position
    this.radius = radius;
    this.color = color;
    this.velocity = velocity;
  }

  draw() {
    c.save();
    c.shadowColor = this.color;
    c.shadowBlur = 10;
    c.beginPath();
    c.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false);
    c.fillStyle = this.color;
    c.fill();
    c.restore();
  }

  update() {
    // Move the projectile smoothly
    this.x += this.velocity.x;
    this.y += this.velocity.y;
  }
}
