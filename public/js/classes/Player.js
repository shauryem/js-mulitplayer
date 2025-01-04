class Player {
  constructor({ x, y, radius, color, username }) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.color = color;
    this.username = username;
    this.satellites = [];
  }

  // Ensure satellites are evenly spaced
  updateSatellitesFromServer(satelliteArr) {
    // Add or remove satellites as needed
    while (this.satellites.length < satelliteArr.length) {
      this.satellites.push({ angle: 0, distance: this.radius + 20, speed: 0.02, color: 'white' });
    }
    while (this.satellites.length > satelliteArr.length) {
      this.satellites.pop();
    }

    // Update properties and recalculate angles for even spacing
    const count = this.satellites.length;
    this.satellites.forEach((satellite, index) => {
      satellite.angle = (2 * Math.PI / count) * index; // Evenly spaced angles
      satellite.color = satelliteArr[index].color;
      satellite.distance = this.radius + 20;
    });
  }
  

  // Update satellites' positions
  updateSatellites() {
    this.satellites.forEach((satellite) => {
      satellite.angle += satellite.speed;
    });
  }

  // Draw the player and their satellites
  draw() {
    // Draw player
    c.font = '12px sans-serif';
    c.fillStyle = 'white';
    c.fillText(this.username, this.x - 20, this.y + 35);
    c.save();
    c.shadowColor = this.color;
    c.shadowBlur = 30;
    c.beginPath();
    c.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false);
    c.fillStyle = this.color;
    c.fill();
    c.restore();
  
    // Draw satellites
    this.satellites.forEach((satellite) => {
      const satelliteX = this.x + Math.cos(satellite.angle) * satellite.distance;
      const satelliteY = this.y + Math.sin(satellite.angle) * satellite.distance;
  
      c.beginPath();
      c.arc(satelliteX, satelliteY, 5, 0, Math.PI * 2, false);
      c.fillStyle = satellite.color; // Use the satellite's specific color
      c.fill();
    });
  }  
}