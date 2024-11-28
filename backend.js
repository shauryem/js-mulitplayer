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
const SPEED = 5
const RADIUS = 10
const PROJECTILE_RADIUS = 5
const PROJECTILE_SPEED = 7
let projectileId = 0

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
      username
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

        if (DISTANCE < PROJECTILE_RADIUS + backEndPlayer.radius && backEndProjectiles[id].playerId !== playerId) {
          if (backEndPlayers[backEndProjectiles[id].playerId])
            backEndPlayers[backEndProjectiles[id].playerId].score++
          delete backEndProjectiles[id]
          delete backEndPlayers[playerId]
          break
        }
      }
  }
  io.emit('updateProjectiles', backEndProjectiles)
  io.emit('updatePlayers', backEndPlayers)
}, 15)
server.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
