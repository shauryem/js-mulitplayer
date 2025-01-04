class Satellite {
    constructor({ x, y, color }) {
      this.x = x;
      this.y = y;
      this.color = color;
      this.baseRadius = 7; // The base radius
      this.radius = this.baseRadius;
      this.growthSpeed = 0.05; // Speed of growth/shrink oscillation
      this.time = 0; // Tracks oscillation progress
    }
  
    update() {
      // Increment time to drive oscillation
      this.time += this.growthSpeed;
  
      // Adjust radius based on a sine wave
      this.radius = this.baseRadius + Math.sin(this.time) * 2; // Adjust `2` for growth/shrink range
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
  }
  