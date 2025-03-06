const SHOOT_INTERVAL = 400; // in ms
const BOOST_INTERVAL = 3000 // in ms 
let lastShootTime = 0;
let lastBoostTime = 0;
let lastMouseMoveTime = 0;
let isSpaceHeld = false;


addEventListener('mousemove', (event) => {
  const canvas = document.querySelector('canvas');
  const { top, left } = canvas.getBoundingClientRect();

  const player = frontEndPlayers[socket.id];
  if (!player) return;

  // Calculate camera offsets
  const cameraX = Math.max(0, Math.min(player.x - canvas.width / 2, MAP_WIDTH - canvas.width));
  const cameraY = Math.max(0, Math.min(player.y - canvas.height / 2, MAP_HEIGHT - canvas.height));

  // Adjust mouse coordinates by camera offsets
  const mouseX = (event.clientX - left) + cameraX;
  const mouseY = (event.clientY - top) + cameraY;

  // Update the player's rotation
  player.rotation = Math.atan2(mouseY - player.y, mouseX - player.x);
  const now = Date.now();
  if (now - lastMouseMoveTime >= 15) {
    socket.emit('rotatePlayer', { rotation: player.rotation });
    lastMouseMoveTime = now;
  }
});

addEventListener('click', (event) => {
  const currentTime = Date.now();
  if (currentTime - lastShootTime < SHOOT_INTERVAL) return;

  const canvas = document.querySelector('canvas');
  const { top, left } = canvas.getBoundingClientRect();

  const player = frontEndPlayers[socket.id];
  if (!player) return;

  // Calculate camera offsets
  const cameraX = Math.max(0, Math.min(player.x - canvas.width / 2, MAP_WIDTH - canvas.width));
  const cameraY = Math.max(0, Math.min(player.y - canvas.height / 2, MAP_HEIGHT - canvas.height));

  // Adjust mouse coordinates by camera offsets
  const mouseX = (event.clientX - left) + cameraX;
  const mouseY = (event.clientY - top) + cameraY;

  // Calculate the angle relative to the player's position
  const angle = Math.atan2(mouseY - player.y, mouseX - player.x);
  const gunLength = 30;
  player.rotation = angle;
  socket.emit('rotatePlayer', { rotation: player.rotation });
  lastShootTime = currentTime;
  // Emit shooting event with correct angle
  socket.emit('shoot', {
    x: player.x + gunLength * Math.cos(angle),
    y: player.y + (gunLength * Math.sin(angle)) ,
    angle
  });
});

addEventListener('keydown', (event) => {
  const currentTime = Date.now();
  if (currentTime - lastBoostTime < BOOST_INTERVAL) return;
  const player = frontEndPlayers[socket.id];
  if (!player) return;

  if (event.code === 'Space') {
    isSpaceHeld = true;

    // Emit boost event to the server
    lastBoostTime = currentTime;
    socket.emit('boost');
  }
});

addEventListener('keyup', (event) => {
  const player = frontEndPlayers[socket.id];
  if (!player) return;

  if (event.code === 'Space') {
    isSpaceHeld = false;
  }
});
