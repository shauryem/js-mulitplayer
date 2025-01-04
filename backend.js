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
const SPEED = 3
const RADIUS = 15
const PROJECTILE_RADIUS = 5
const PROJECTILE_SPEED = 10
const SATELLITE_RADIUS = 20
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
      velocity,
      playerId: socket.id
    } 
  })

  socket.on('initGame', ({username, width, height}) => {
    backEndPlayers[socket.id] = {
      x: 1024 * Math.random(),
      y: 576 * Math.random(),
      color: `hsl(${260 * Math.random()}, 100%, 50%)`,
      sequenceNumber: 0,
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
        backEndPlayer.y = Math.max(backEndPlayer.y - SPEED, backEndPlayer.radius);
        break;
      case 'KeyA':
        backEndPlayer.x = Math.max(backEndPlayer.x - SPEED, backEndPlayer.radius);
        break;
      case 'KeyS':
        backEndPlayer.y = Math.min(backEndPlayer.y + SPEED, MAP_HEIGHT - backEndPlayer.radius);
        break;
      case 'KeyD':
        backEndPlayer.x = Math.min(backEndPlayer.x + SPEED, MAP_WIDTH - backEndPlayer.radius);
        break;
    }

  })
});

setInterval(() => {
  // update projectile postions
  for (const id in backEndProjectiles) {
      backEndProjectiles[id].x += backEndProjectiles[id].velocity.x
      backEndProjectiles[id].y += backEndProjectiles[id].velocity.y

      // Remove projectiles that go outside the fixed map boundaries
      if (
        backEndProjectiles[id].x + PROJECTILE_RADIUS < 0 || // Left edge
        backEndProjectiles[id].x - PROJECTILE_RADIUS > MAP_WIDTH || // Right edge
        backEndProjectiles[id].y + PROJECTILE_RADIUS < 0 || // Top edge
        backEndProjectiles[id].y - PROJECTILE_RADIUS > MAP_HEIGHT // Bottom edge
      ) {
        delete backEndProjectiles[id];
        continue;
      }

      for (const playerId in backEndPlayers) {
        const backEndPlayer = backEndPlayers[playerId]

        const DISTANCE = Math.hypot(backEndProjectiles[id].x - backEndPlayer.x, backEndProjectiles[id].y - backEndPlayer.y)

        if (DISTANCE < (PROJECTILE_RADIUS + backEndPlayer.radius) && backEndProjectiles[id].playerId !== playerId) {
          const killerId = backEndProjectiles[id].playerId;
          const killedPlayerColor = backEndPlayer.color;
    
          if (backEndPlayers[killerId]) {
            backEndPlayers[killerId].score++;
            backEndPlayers[killerId].satellites.push({
              color: killedPlayerColor
            });
      
            io.emit('updatePlayers', backEndPlayers); // Broadcast updated players
          }
          
          let droppedSatellites = backEndPlayers[playerId].satellites
          for (let i = 0; i < droppedSatellites.length; i++) {
            satelliteId++;
            backEndDroppedSatellites[satelliteId] = {
              x: backEndPlayers[playerId].x + i*25,
              y: backEndPlayers[playerId].y + i*25,
              satellite: droppedSatellites[i]
            };
          }
          delete backEndProjectiles[id]
          delete backEndPlayers[playerId]
          break
        }
      }
  }
  for (const satelliteId in backEndDroppedSatellites) {
    const backEndDroppedSatellite = backEndDroppedSatellites[satelliteId];
    for (const playerId in backEndPlayers) {
      const backEndPlayer = backEndPlayers[playerId]
      const DISTANCE = Math.hypot(backEndDroppedSatellite.x - backEndPlayer.x, backEndDroppedSatellite.y - backEndPlayer.y)
      if (DISTANCE < SATELLITE_RADIUS + backEndPlayer.radius) {
        backEndPlayers[playerId].satellites.push({color: backEndDroppedSatellite.satellite.color })
        delete backEndDroppedSatellites[satelliteId];
      }
    }
  }
  io.emit('updateProjectiles', backEndProjectiles)
  io.emit('updatePlayers', backEndPlayers)
  io.emit('updateDroppedSatellites', backEndDroppedSatellites)
}, 15)
server.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
