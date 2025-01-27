class Player {
  constructor({ x, y, radius, speed, color, username }) {
    this.x = x;
    this.y = y;
    this.speed = speed
    this.radius = radius;
    this.color = color;
    this.username = username;
    this.rotation = 0;
    this.satellites = [];
    this.image = new Image(); // Create a new Image object
    this.image.src = '/img/tdShooter.png'; // Set the image source
    this.imageLoaded = false; // Track if the image has loaded

    // Set a callback to track when the image is ready
    this.image.onload = () => {
      this.imageLoaded = true;
    };
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

    // Draw the player image with rotation
    if (this.imageLoaded) {
      const playerDimension = 250;
      c.save();
      // Move the origin to the player's center
      c.translate(this.x, this.y);
      // Rotate by the player's rotation
      c.rotate(this.rotation);
      // Draw the image so that its center is at (0, 0)
      c.drawImage(
        this.image,
        -playerDimension / 2, 
        -playerDimension / 2, 
        playerDimension,
        playerDimension
      );
      c.restore();
    }
  
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