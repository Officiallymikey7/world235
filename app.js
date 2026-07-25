const canvas = document.getElementById('simCanvas');
const ctx = canvas.getContext('2d');

// Agent State
const agent = {
  x: 50,
  y: 50,
  size: 20,
  color: '#38bdf8'
};

// Simulation Loop
function update() {
  // Clear Canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw Grid Lines
  ctx.strokeStyle = '#334155';
  for (let x = 0; x < canvas.width; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  for (let y = 0; y < canvas.height; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }

  // Draw Agent Avatar
  ctx.fillStyle = agent.color;
  ctx.fillRect(agent.x, agent.y, agent.size, agent.size);

  requestAnimationFrame(update);
}

// Start loop
update();
