const canvas = document.querySelector('canvas')
const c = canvas.getContext('2d')

const socket = io()
const scoreEl = document.querySelector('#scoreEl')

const backgroundImage = new Image();
backgroundImage.src = '/img/squares.png';

const shooterImageYellow = new Image();
shooterImageYellow.src = '/img/yellowShooter.png';

const shooterImageBlue = new Image();
shooterImageBlue.src = '/img/blueShooter.png';

const shooterImageGreen = new Image();
shooterImageGreen.src = '/img/greenShooter.png';

const shooterImageRed = new Image();
shooterImageRed.src = '/img/redShooter.png';

const devicePixelRatio = window.devicePixelRatio || 1;

// Set canvas dimensions dynamically based on the window size
function resizeCanvas() {
  canvas.width = innerWidth * devicePixelRatio;
  canvas.height = innerHeight * devicePixelRatio;
  c.scale(devicePixelRatio, devicePixelRatio);
}

// Resize canvas on load and when the window is resized
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

canvas.width = innerWidth * devicePixelRatio
canvas.height = innerHeight * devicePixelRatio

c.scale(devicePixelRatio, devicePixelRatio)

const frontEndPlayers = {}
const frontEndProjectiles = {}
const frontEndDroppedSatellites = {}
const playerInputs = []

let SPEED = 5; // Default speed, overridden by backend
let PLAYER_RADIUS = 15;
let MAP_WIDTH = 2048;
let MAP_HEIGHT = 1152;

// Set canvas dimensions dynamically based on window size
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Receive initialization data from the backend
socket.on('initialize', ({ speed, mapWidth, mapHeight }) => {
  SPEED = speed;
  MAP_WIDTH = mapWidth;
  MAP_HEIGHT = mapHeight;
});



socket.on('updateProjectiles', (backEndProjectiles) => {
  for (const id in backEndProjectiles) {
    const backEndProjectile = backEndProjectiles[id];

    if (!frontEndProjectiles[id]) {
      // Create new projectile and start updating locally
      frontEndProjectiles[id] = new Projectile({
        x: backEndProjectile.x,
        y: backEndProjectile.y,
        radius: 5,
        color: frontEndPlayers[backEndProjectile.playerId]?.color,
        velocity: { ...backEndProjectile.velocity },
      });
    } else {
      // Synchronize positions
      frontEndProjectiles[id].x = backEndProjectile.x;
      frontEndProjectiles[id].y = backEndProjectile.y;
    }
  }

  // Remove projectiles no longer in the backend
  for (const id in frontEndProjectiles) {
    if (!backEndProjectiles[id]) {
      delete frontEndProjectiles[id];
    }
  }
});


socket.on('updatePlayers', (backEndPlayers) => {
  for(const id in backEndPlayers) {
    const backEndPlayer = backEndPlayers[id]
    if(!frontEndPlayers[id]) {
      console.log('hello')
      frontEndPlayers[id] = new Player({x: backEndPlayer.x, y: backEndPlayer.y, speed: backEndPlayer.speed, radius: PLAYER_RADIUS, color: backEndPlayer.color, username: backEndPlayer.username })
      document.querySelector('#playerLabels').innerHTML += `<div data-id ="${id}" data-score="${backEndPlayer.score}">${backEndPlayer.username}: ${backEndPlayer.score}</div>`
    } else {
      document.querySelector(`div[data-id="${id}"]`).innerHTML = `${backEndPlayer.username}: ${backEndPlayer.score}`
      document.querySelector(`div[data-id="${id}"]`).setAttribute('data-score', backEndPlayer.score)
      const parentDiv = document.querySelector('#playerLabels')
      const childDivs = Array.from(parentDiv.querySelectorAll('div'))
      childDivs.sort((a, b) => {
        const scoreA = Number(a.getAttribute('data-score'))
        const scoreB = Number(b.getAttribute('data-score'))
        return scoreB - scoreA
      })

      // Remove old elements
      childDivs.forEach( div => {
        parentDiv.removeChild(div)
      })

      // Add sorted elements
      childDivs.forEach( div => {
        parentDiv.appendChild(div)
      })

      frontEndPlayers[id].target = {
        x: backEndPlayer.x,
        y: backEndPlayer.y
      }

      if (id == socket.id) {
        // if a player exists
        frontEndPlayers[id].x = backEndPlayer.x
        frontEndPlayers[id].y = backEndPlayer.y
        frontEndPlayers[id].speed = backEndPlayer.speed
        
        const lastBackendInputIndex = playerInputs.findIndex(input => {
          return backEndPlayer.sequenceNumber === input.sequenceNumber
        })
        if (lastBackendInputIndex > -1)
          playerInputs.splice(0, lastBackendInputIndex + 1)
        
        playerInputs.forEach((input) => {
          frontEndPlayers[id].target.x += input.dx
          frontEndPlayers[id].target.y += input.dy 
        })
    } else {
      //for other players 
      gsap.to(frontEndPlayers[id], {
        x: backEndPlayer.x,
        y: backEndPlayer.y,
        duration: 0.015,
        ease: 'linear'
      })

      frontEndPlayers[id].rotation = backEndPlayer.rotation
    }

    if (frontEndPlayers[id].satellites.length !== backEndPlayer.satellites.length) {
      frontEndPlayers[id].updateSatellitesFromServer(backEndPlayer.satellites);
    }

  }
  }

  for(const id in frontEndPlayers) {
    if(!backEndPlayers[id]) {
      const divToDelete = document.querySelector(`div[data-id="${id}"]`)
      divToDelete.parentNode.removeChild(divToDelete)

      if (id === socket.id) {
        document.querySelector('#usernameForm').style.display = 'block'
        document.querySelector('#gameTitle').style.display = 'block'
        document.querySelector('#instructionText ').style.display = 'block'
      }
      delete frontEndPlayers[id]
    }
  }
  
})

socket.on('updateDroppedSatellites', (backEndDroppedSatellites) => {
  for (const id in backEndDroppedSatellites) {
    const backEndDroppedSatellite = backEndDroppedSatellites[id];

    if (!frontEndDroppedSatellites[id]) {
      // Create new dropped satellite and start updating locally
      frontEndDroppedSatellites[id] = new Satellite({
        x: backEndDroppedSatellite.x,
        y: backEndDroppedSatellite.y,
        color: backEndDroppedSatellite.satellite.color
      });
    } 
  }

  // Remove projectiles no longer in the backend
  for (const id in frontEndDroppedSatellites) {
    if (!backEndDroppedSatellites[id]) {
      delete frontEndDroppedSatellites[id];
    }
  }
});

let animationId
let score = 0
function animate() {
  requestAnimationFrame(animate);
    // If the username form is visible (game hasn’t started), draw the shooter image on top.
    if (document.querySelector('#usernameForm').style.display !== 'none') {
      // Adjust these values as needed for proper positioning/sizing
      const imgWidth = 200, imgHeight = 200;
      const xPos = canvas.width / 2 - imgWidth / 2;
      const yPos = (4* canvas.height) / 6 - imgHeight / 2;
      c.drawImage(shooterImageGreen, xPos - 450 , yPos, imgWidth, imgHeight);
      c.drawImage(shooterImageBlue, xPos - 150, yPos, imgWidth, imgHeight);
      c.drawImage(shooterImageRed, xPos + 150, yPos, imgWidth, imgHeight);
      c.drawImage(shooterImageYellow, xPos + 450, yPos, imgWidth, imgHeight);

    }
  const player = frontEndPlayers[socket.id];
  if (!player) return;

  // Calculate camera offsets dynamically
  const cameraX = Math.max(
    0,
    Math.min(player.x - canvas.width / 2, MAP_WIDTH - canvas.width)
  );
  const cameraY = Math.max(
    0,
    Math.min(player.y - canvas.height / 2, MAP_HEIGHT - canvas.height)
  );

  // Clear the canvas and translate based on camera position
  c.save();
  c.clearRect(0, 0, canvas.width, canvas.height);
  c.translate(-cameraX, -cameraY);

  // Draw the background
  const pattern = c.createPattern(backgroundImage, 'repeat');
  if (pattern) {
    c.fillStyle = pattern;
    c.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);
  }

  // Draw all players
  Object.values(frontEndPlayers).forEach((p) => {
    p.updateSatellites(); // Update satellite positions
    p.draw();
  });

  // Update and draw projectiles locally
  Object.values(frontEndProjectiles).forEach((p) => {
    p.draw();
  });

  Object.values(frontEndDroppedSatellites).forEach((p) => {
    p.draw();
    p.update();
  });

  c.restore();
}


animate()

const keys = {
  w: {
    pressed: false
  }, 
  a: {
    pressed: false
  }, 
  s: {
    pressed: false
  }, 
  d: {
    pressed: false
  }
}

// const SPEED = 5
let sequenceNumber = 0

setInterval(() => {
  const player = frontEndPlayers[socket.id];
  if (!player) return;

  if (keys.w.pressed) {
    playerInputs.push({ sequenceNumber, dx: 0, dy: -player.speed });
    player.y = Math.max(player.y - player.speed, player.radius);
    socket.emit('keydown', { keyCode: 'KeyW', sequenceNumber });
  }
  if (keys.a.pressed) {
    playerInputs.push({ sequenceNumber, dx: -player.speed, dy: 0 });
    player.x = Math.max(player.x - player.speed, player.radius);
    socket.emit('keydown', { keyCode: 'KeyA', sequenceNumber });
  }
  if (keys.s.pressed) {
    playerInputs.push({ sequenceNumber, dx: 0, dy: player.speed });
    player.y = Math.min(player.y + player.speed, MAP_HEIGHT - player.radius);
    socket.emit('keydown', { keyCode: 'KeyS', sequenceNumber });
  }
  if (keys.d.pressed) {
    playerInputs.push({ sequenceNumber, dx: player.speed, dy: 0 });
    player.x = Math.min(player.x + player.speed, MAP_WIDTH - player.radius);
    socket.emit('keydown', { keyCode: 'KeyD', sequenceNumber });
  }
}, 15);



window.addEventListener('keydown', (event) => {
  if (!frontEndPlayers[socket.id]) return
  switch(event.code) {
    case 'KeyW':
      keys.w.pressed = true
      break
    case 'KeyA':
      keys.a.pressed = true
      break    
    case 'KeyS':
      keys.s.pressed = true
      break  
    case 'KeyD':
      keys.d.pressed = true
      break
  }
})

window.addEventListener('keyup', (event) => {
  if (!frontEndPlayers[socket.id]) return
  switch(event.code) {
    case 'KeyW':
      keys.w.pressed = false
      break
    case 'KeyA':
      keys.a.pressed = false
      break    
    case 'KeyS':
      keys.s.pressed = false
      break  
    case 'KeyD':
      keys.d.pressed = false
      break
  }
})

document.querySelector('#usernameForm').addEventListener('submit', (event) => {
  event.preventDefault()
  const username = document.querySelector('#usernameInput').value.trim();

  if (!username) {
    alert('Please enter a username.');
    return;
  }

  document.querySelector('#usernameForm').style.display = 'none'
  document.querySelector('#gameTitle').style.display = 'none'
  document.querySelector('#instructionText').style.display = 'none'
  document.querySelector('#leaderboard').style.display = 'block'
  socket.emit('initGame', {width: canvas.width, height: canvas.height, username: document.querySelector('#usernameInput').value})
})
