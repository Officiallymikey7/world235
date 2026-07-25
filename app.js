const canvas = document.getElementById('simCanvas');
const ctx = canvas.getContext('2d');
const statusLog = document.getElementById('status-log');

const GRID_SIZE = 40; // Size of each tile in pixels

// World State
const world = {
  cols: 15,
  rows: 10,
  target: { x: 12, y: 7, label: "Energy Core", color: "#eab308" }
};

// Agent State
const agent = {
  x: 1,
  y: 1,
  targetX: 1,
  targetY: 1,
  color: '#38bdf8',
  isThinking: false
};

// 1. Draw the Grid and Objects
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw Grid
  for (let r = 0; r < world.rows; r++) {
    for (let c = 0; c < world.cols; c++) {
      ctx.strokeStyle = '#334155';
      ctx.strokeRect(c * GRID_SIZE, r * GRID_SIZE, GRID_SIZE, GRID_SIZE);
    }
  }

  // Draw Target Object
  ctx.fillStyle = world.target.color;
  ctx.fillRect(world.target.x * GRID_SIZE + 10, world.target.y * GRID_SIZE + 10, 20, 20);

  // Draw Agent
  ctx.fillStyle = agent.color;
  ctx.beginPath();
  ctx.arc(
    agent.x * GRID_SIZE + GRID_SIZE / 2,
    agent.y * GRID_SIZE + GRID_SIZE / 2,
    14, 0, Math.PI * 2
  );
  ctx.fill();
}

function gameLoop() {
  // Smoothly move agent toward target position
  if (agent.x < agent.targetX) agent.x += 0.05;
  if (agent.x > agent.targetX) agent.x -= 0.05;
  if (agent.y < agent.targetY) agent.y += 0.05;
  if (agent.y > agent.targetY) agent.y -= 0.05;

  draw();
  requestAnimationFrame(gameLoop);
}

gameLoop();
