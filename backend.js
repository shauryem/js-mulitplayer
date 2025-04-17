const express = require('express')
const app = express()

const http = require('http')
const server = http.createServer(app)

const { Server } = require('socket.io')
const io = new Server(server, {pingInterval: 2000, pingTimeout: 5000})

const port = 3000

app.use(express.static('public'))

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html')
})

const MAP_WIDTH = 2048;
const MAP_HEIGHT = 1152;

const backEndPlayers = {}
const backEndProjectiles = {}
const backEndDroppedSatellites = {}
const SPEED = 2.5
const BOOSTED_SPEED = 3.5
const RADIUS = 23;
const PROJECTILE_RADIUS = 5
const PROJECTILE_SPEED = 10
const SATELLITE_RADIUS = 20
const BASE_PROJECTILE_RANGE = 200;
const MAX_PROJECTILE_RANGE = 400;
const SATELLITE_LIFETIME = 3 * 60 * 1000; // 3 minutes in milliseconds
const BOOST_LIFETIME = 3 * 1000 // 3 seconds
let projectileId = 0
let satelliteId = 0

io.on('connection', (socket) => {
  console.log('a user connected');

  socket.emit('initialize', { speed: SPEED, mapWidth: MAP_WIDTH, mapHeight: MAP_HEIGHT });

  io.emit('updatePlayers', backEndPlayers)


  socket.on('shoot', ({x, y, angle}) => {
    projectileId++;

    const velocity = {
      x: Math.cos(angle) * PROJECTILE_SPEED,
      y: Math.sin(angle) * PROJECTILE_SPEED
    }

    backEndProjectiles[projectileId] = {
      x,
      y,
      startX: x,
      startY: y,
      velocity,
      playerId: socket.id
    } 
  })

  socket.on('initGame', ({username, width, height}) => {
    backEndPlayers[socket.id] = {
      x: 1024 * Math.random(),
      y: 576 * Math.random(),
      color: `hsl(${360 * Math.random()}, 100%, 50%)`,
      speed: SPEED,
      sequenceNumber: 0,
      rotation: 0,
      score: 0,
      username,
      satellites: [] // Initialize empty satellites array
    }

    backEndPlayers[socket.id].canvas = {
      width,
      height
    }

    backEndPlayers[socket.id].radius = RADIUS
  })

  socket.on('disconnect', (reason) => {
    console.log(reason)
    delete backEndPlayers[socket.id]
    io.emit('updatePlayers', backEndPlayers)
  })

  socket.on('keydown', ({keyCode, sequenceNumber}) => {
    const backEndPlayer = backEndPlayers[socket.id]

    if (!backEndPlayers[socket.id]) return

    backEndPlayers[socket.id].sequenceNumber = sequenceNumber
    switch (keyCode) {
      case 'KeyW':
        backEndPlayer.y = Math.max(backEndPlayer.y - backEndPlayer.speed, backEndPlayer.radius);
        break;
      case 'KeyA':
        backEndPlayer.x = Math.max(backEndPlayer.x - backEndPlayer.speed, backEndPlayer.radius);
        break;
      case 'KeyS':
        backEndPlayer.y = Math.min(backEndPlayer.y + backEndPlayer.speed, MAP_HEIGHT - backEndPlayer.radius);
        break;
      case 'KeyD':
        backEndPlayer.x = Math.min(backEndPlayer.x + backEndPlayer.speed, MAP_WIDTH - backEndPlayer.radius);
        break;
    }

  })

  socket.on('rotatePlayer', ({rotation}) => {
    if (backEndPlayers[socket.id]) {
      backEndPlayers[socket.id].rotation = rotation;
    }
  })

  socket.on('boost', () => {
    const player = backEndPlayers[socket.id];
  
    if (!player || player.satellites.length === 0) return;
    // Consume one satellite and increase speed
    player.satellites.pop();
    player.speed = BOOSTED_SPEED;

    // Reset speed after 3 seconds
    setTimeout(() => {
      if (player) player.speed = SPEED; // Reset speed to default
    }, BOOST_LIFETIME); 
  });
});

setInterval(() => {
  // Update projectile positions
  for (const id in backEndProjectiles) {
    backEndProjectiles[id].x += backEndProjectiles[id].velocity.x;
    backEndProjectiles[id].y += backEndProjectiles[id].velocity.y;

    // Calculate the distance traveled by the projectile
    const distanceTraveled = Math.sqrt(
      Math.pow(backEndProjectiles[id].x - backEndProjectiles[id].startX, 2) +
      Math.pow(backEndProjectiles[id].y - backEndProjectiles[id].startY, 2)
    );

    // Remove projectiles that go outside the fixed map boundaries
    let maxProjectileRange = Math.min(BASE_PROJECTILE_RANGE + (backEndPlayers[backEndProjectiles[id].playerId].satellites.length * 50), MAX_PROJECTILE_RANGE) ;
    if (distanceTraveled > maxProjectileRange) {
      delete backEndProjectiles[id];
      continue;
    }
  }

  // Check for collisions between players and projectiles/satellites
  for (const playerId in backEndPlayers) {
    const backEndPlayer = backEndPlayers[playerId];

    // Check for collisions with projectiles
    for (const id in backEndProjectiles) {
      const DISTANCE = Math.hypot(
        backEndProjectiles[id].x - backEndPlayer.x,
        backEndProjectiles[id].y - backEndPlayer.y
      );

      if (
        DISTANCE < PROJECTILE_RADIUS + backEndPlayer.radius &&
        backEndProjectiles[id].playerId !== playerId
      ) {
        const killerId = backEndProjectiles[id].playerId;
        const killedPlayerColor = backEndPlayer.color;

        if (backEndPlayers[killerId]) {
          backEndPlayers[killerId].score++;
          backEndPlayers[killerId].satellites.push({
            color: killedPlayerColor,
          });

          io.emit('updatePlayers', backEndPlayers); // Broadcast updated players
        }

        let droppedSatellites = backEndPlayers[playerId].satellites;
        for (let i = 0; i < droppedSatellites.length; i++) {
          satelliteId++;
          backEndDroppedSatellites[satelliteId] = {
            x: backEndPlayers[playerId].x + i * 25,
            y: backEndPlayers[playerId].y + i * 25,
            satellite: droppedSatellites[i],
            timestamp: Date.now(), // Add creation timestamp
          };
        }
        delete backEndProjectiles[id];
        delete backEndPlayers[playerId];
        break;
      }
    }

    // Check for collisions with satellites
    for (const satelliteId in backEndDroppedSatellites) {
      const backEndDroppedSatellite = backEndDroppedSatellites[satelliteId];
      const DISTANCE = Math.hypot(
        backEndDroppedSatellite.x - backEndPlayer.x,
        backEndDroppedSatellite.y - backEndPlayer.y
      );
      if (
        backEndPlayers[playerId] &&
        DISTANCE < SATELLITE_RADIUS + backEndPlayer.radius
      ) {
        backEndPlayers[playerId].satellites.push({
          color: backEndDroppedSatellite.satellite.color,
        });
        delete backEndDroppedSatellites[satelliteId];
      }
    }
  }

  io.emit('updateProjectiles', backEndProjectiles);
  io.emit('updatePlayers', backEndPlayers);
  io.emit('updateDroppedSatellites', backEndDroppedSatellites);
}, 15);

// Random satellite spawn interval
setInterval(() => {
  // Generate random coordinates within the map boundaries
  const randomX = Math.random() * MAP_WIDTH;
  const randomY = Math.random() * MAP_HEIGHT;

  // Increment satellite ID
  satelliteId++;

  // Add a new satellite to the map
  backEndDroppedSatellites[satelliteId] = {
    x: randomX,
    y: randomY,
    satellite: { color: `hsl(${Math.random() * 360}, 100%, 50%)` }, // Random color for the satellite
    timestamp: Date.now(), // Timestamp for lifetime management
  };

  // Emit update to clients
  io.emit('updateDroppedSatellites', backEndDroppedSatellites);
}, 10 * 3000); // Every 30 seconds


// Satellite cleanup interval
setInterval(() => {
  const currentTime = Date.now();

  for (const satelliteId in backEndDroppedSatellites) {
    const satellite = backEndDroppedSatellites[satelliteId];

    // Remove satellites older than 10 minutes
    if (currentTime - satellite.timestamp > SATELLITE_LIFETIME) {
      delete backEndDroppedSatellites[satelliteId];
    }
  }
}, 60 * 1000); // Check every 60 seconds

server.listen(port, () => {
  console.log(`bbshooter listening on port ${port}`)
})
