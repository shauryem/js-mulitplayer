const SHOOT_INTERVAL = 250; // in ms
let lastShootTime = 0;

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

  lastShootTime = currentTime;
  // Emit shooting event with correct angle
  socket.emit('shoot', {
    x: player.x,
    y: player.y,
    angle
  });
});
