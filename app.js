const canvas = document.getElementById('simCanvas');
const ctx = canvas.getContext('2d');
const statusLog = document.getElementById('status-log');

const TILE_SIZE = 40;

// 0: Floor | 1: Wall | 2: Energy Core | 3: Terminal
const TILE_TYPES = {
  0: { name: 'Floor', color: '#1e293b', walkable: true },
  1: { name: 'Wall', color: '#334155', walkable: false },
  2: { name: 'Energy Core', color: '#eab308', walkable: true },
  3: { name: 'Terminal', color: '#38bdf8', walkable: true }
};

// 15 cols x 10 rows Map Layout
const worldMap = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 3, 0, 1, 0, 1, 1, 1, 1, 0, 1, 1, 0, 1],
  [1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 1],
  [1, 1, 1, 0, 1, 1, 1, 0, 0, 1, 1, 0, 1, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1],
  [1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 2, 1],
  [1, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
];

// Agent position (Grid coordinates)
const agent = {
  x: 1,
  y: 1,
  targetX: 1,
  targetY: 1,
  speed: 0.08,
  color: '#06b6d4'
};

// Helper: Check if a grid coordinate is walkable
function isWalkable(gridX, gridY) {
  if (gridY < 0 || gridY >= worldMap.length || gridX < 0 || gridX >= worldMap[0].length) {
    return false;
  }
  const tileType = worldMap[gridY][gridX];
  return TILE_TYPES[tileType].walkable;
}

// Render the Map and Agent
function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 1. Draw World Tiles
  for (let r = 0; r < worldMap.length; r++) {
    for (let c = 0; c < worldMap[r].length; c++) {
      const tileID = worldMap[r][c];
      const tile = TILE_TYPES[tileID];

      // Draw Base Tile
      ctx.fillStyle = tile.color;
      ctx.fillRect(c * TILE_SIZE, r * TILE_SIZE, TILE_SIZE, TILE_SIZE);

      // Tile Outlines
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1;
      ctx.strokeRect(c * TILE_SIZE, r * TILE_SIZE, TILE_SIZE, TILE_SIZE);

      // Draw Special Icons/Glows for Interactive Objects
      if (tileID === 2 || tileID === 3) {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(
          c * TILE_SIZE + TILE_SIZE / 2,
          r * TILE_SIZE + TILE_SIZE / 2,
          4, 0, Math.PI * 2
        );
        ctx.fill();
      }
    }
  }

  // 2. Smoothly Move Agent toward Target Position
  if (agent.x < agent.targetX) agent.x = Math.min(agent.targetX, agent.x + agent.speed);
  if (agent.x > agent.targetX) agent.x = Math.max(agent.targetX, agent.x - agent.speed);
  if (agent.y < agent.targetY) agent.y = Math.min(agent.targetY, agent.y + agent.speed);
  if (agent.y > agent.targetY) agent.y = Math.max(agent.targetY, agent.y - agent.speed);

  // 3. Draw Agent Avatar
  const screenX = agent.x * TILE_SIZE + TILE_SIZE / 2;
  const screenY = agent.y * TILE_SIZE + TILE_SIZE / 2;

  ctx.fillStyle = agent.color;
  ctx.beginPath();
  ctx.arc(screenX, screenY, TILE_SIZE / 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.stroke();

  requestAnimationFrame(render);
}

// Start rendering
render();
