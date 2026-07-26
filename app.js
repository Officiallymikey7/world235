/* ==================== EMBODIED AI AGENT SIMULATION ==================== */
/* Production-ready vanilla JavaScript application for browser-based AI agent */

class EmbodiedAISimulation {
    constructor() {
        // Canvas & Rendering
        this.canvas = document.getElementById('gridCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.gridWidth = 15;
        this.gridHeight = 10;
        this.tileSize = Math.min(
            Math.floor(this.canvas.width / this.gridWidth),
            Math.floor(this.canvas.height / this.gridHeight)
        );

        // Grid Map (0=Floor, 1=Wall, 2=Energy Core, 3=Terminal)
        this.mapData = this.generateMap();
        
        // Agent State
        this.agent = {
            x: 1,
            y: 1,
            renderX: 1,
            renderY: 1,
            pathfindingPath: [],
            targetX: null,
            targetY: null,
            moving: false,
            moveProgress: 0,
            moveDuration: 300, // ms per tile
            failedAttempts: 0,
            lastFailedPos: null
        };

        // Simulation State
        this.stepCount = 0;
        this.isAutoRunning = false;
        this.lastThought = '';
        this.statusState = 'idle'; // idle, thinking, moving, error
        this.targetType = 'energy'; // energy or terminal

        // Rendering Loop
        this.lastFrameTime = Date.now();
        this.frameCount = 0;
        this.fps = 60;

        // API Configuration
        this.apiKey = this.loadAPIKey();
        this.apiProvider = this.loadAPIProvider();

        // Initialize UI
        this.initializeEventListeners();
        this.loadUIState();
        this.addLogEntry('system', '[SYSTEM] Agent simulation initialized. Ready for deployment.');
        
        // Start render loop
        this.startRenderLoop();
    }

    /* ==================== MAP GENERATION ==================== */
    generateMap() {
        const map = Array(this.gridHeight).fill(null).map(() => 
            Array(this.gridWidth).fill(0)
        );

        // Add walls (create corridors)
        const walls = [
            { x: 5, y: 3, w: 1, h: 6 },
            { x: 10, y: 2, w: 1, h: 7 },
            { x: 7, y: 7, w: 4, h: 1 },
            { x: 2, y: 5, w: 2, h: 1 }
        ];

        walls.forEach(wall => {
            for (let y = wall.y; y < wall.y + wall.h && y < this.gridHeight; y++) {
                for (let x = wall.x; x < wall.x + wall.w && x < this.gridWidth; x++) {
                    map[y][x] = 1;
                }
            }
        });

        // Place Energy Core (target)
        map[8][13] = 2;

        // Place Control Terminal (secondary target)
        map[2][12] = 3;

        return map;
    }

    /* ==================== UTILITY FUNCTIONS ==================== */
    isWalkable(x, y) {
        if (x < 0 || x >= this.gridWidth || y < 0 || y >= this.gridHeight) {
            return false;
        }
        return this.mapData[y][x] !== 1;
    }

    getWalkableNeighbors(x, y) {
        const neighbors = [];
        const directions = [
            { dx: 0, dy: -1 }, { dx: 1, dy: 0 },
            { dx: 0, dy: 1 }, { dx: -1, dy: 0 }
        ];

        for (const dir of directions) {
            const nx = x + dir.dx;
            const ny = y + dir.dy;
            if (this.isWalkable(nx, ny)) {
                neighbors.push({ x: nx, y: ny });
            }
        }
        return neighbors;
    }

    /* ==================== PATHFINDING: A* ALGORITHM ==================== */
    heuristic(x1, y1, x2, y2) {
        return Math.abs(x2 - x1) + Math.abs(y2 - y1);
    }

    findPath(startX, startY, endX, endY) {
        // Ensure end position is walkable, otherwise find nearest walkable position
        if (!this.isWalkable(endX, endY)) {
            const neighbors = this.getWalkableNeighbors(endX, endY);
            if (neighbors.length === 0) {
                return []; // No path possible
            }
            // Find closest neighbor to end position
            let closest = neighbors[0];
            let minDist = this.heuristic(closest.x, closest.y, endX, endY);
            for (const n of neighbors) {
                const dist = this.heuristic(n.x, n.y, endX, endY);
                if (dist < minDist) {
                    minDist = dist;
                    closest = n;
                }
            }
            endX = closest.x;
            endY = closest.y;
        }

        const openSet = [];
        const cameFrom = new Map();
        const gScore = new Map();
        const fScore = new Map();

        const key = (x, y) => `${x},${y}`;
        const startKey = key(startX, startY);
        const endKey = key(endX, endY);

        openSet.push({ x: startX, y: startY });
        gScore.set(startKey, 0);
        fScore.set(startKey, this.heuristic(startX, startY, endX, endY));

        const neighbors = [
            { dx: 0, dy: -1 }, { dx: 1, dy: 0 },
            { dx: 0, dy: 1 }, { dx: -1, dy: 0 }
        ];

        let iterations = 0;
        const maxIterations = 500;

        while (openSet.length > 0 && iterations < maxIterations) {
            iterations++;
            let current = openSet[0];
            let currentIdx = 0;
            for (let i = 1; i < openSet.length; i++) {
                if (fScore.get(key(openSet[i].x, openSet[i].y)) < 
                    fScore.get(key(current.x, current.y))) {
                    current = openSet[i];
                    currentIdx = i;
                }
            }

            if (current.x === endX && current.y === endY) {
                // Reconstruct path
                const path = [];
                let curr = endKey;
                while (cameFrom.has(curr)) {
                    const [x, y] = curr.split(',').map(Number);
                    path.unshift({ x, y });
                    curr = cameFrom.get(curr);
                }
                return path;
            }

            openSet.splice(currentIdx, 1);

            for (const neighbor of neighbors) {
                const nx = current.x + neighbor.dx;
                const ny = current.y + neighbor.dy;

                if (!this.isWalkable(nx, ny)) {
                    continue;
                }

                const nKey = key(nx, ny);
                const tentativeGScore = gScore.get(key(current.x, current.y)) + 1;

                if (!gScore.has(nKey) || tentativeGScore < gScore.get(nKey)) {
                    cameFrom.set(nKey, key(current.x, current.y));
                    gScore.set(nKey, tentativeGScore);
                    fScore.set(nKey, tentativeGScore + this.heuristic(nx, ny, endX, endY));

                    if (!openSet.find(p => p.x === nx && p.y === ny)) {
                        openSet.push({ x: nx, y: ny });
                    }
                }
            }
        }

        return []; // No path found
    }

    /* ==================== PERCEPTION STATE FUNCTION ==================== */
    getPerceptionState() {
        const energyCorePos = this.findTileType(2);
        const terminalPos = this.findTileType(3);
        const nearby = this.getNearbyTiles(this.agent.x, this.agent.y);

        return {
            agentPosition: { x: this.agent.x, y: this.agent.y },
            mapBounds: { width: this.gridWidth, height: this.gridHeight },
            energyCore: energyCorePos ? { x: energyCorePos.x, y: energyCorePos.y } : null,
            controlTerminal: terminalPos ? { x: terminalPos.x, y: terminalPos.y } : null,
            nearbyTiles: nearby,
            currentTarget: this.targetType,
            step: this.stepCount
        };
    }

    findTileType(type) {
        for (let y = 0; y < this.gridHeight; y++) {
            for (let x = 0; x < this.gridWidth; x++) {
                if (this.mapData[y][x] === type) {
                    return { x, y };
                }
            }
        }
        return null;
    }

    getNearbyTiles(centerX, centerY, range = 2) {
        const nearby = [];
        for (let y = Math.max(0, centerY - range); y <= Math.min(this.gridHeight - 1, centerY + range); y++) {
            for (let x = Math.max(0, centerX - range); x <= Math.min(this.gridWidth - 1, centerX + range); x++) {
                nearby.push({
                    x, y,
                    type: this.mapData[y][x],
                    distance: Math.abs(x - centerX) + Math.abs(y - centerY)
                });
            }
        }
        return nearby;
    }

    /* ==================== LLM API INTEGRATION ==================== */
    async fetchNextAction(perceptionState) {
        // If no API key or local AI mode, use heuristic
        if (!this.apiKey || this.apiProvider === 'local') {
            return this.getHeuristicAction(perceptionState);
        }

        try {
            this.setStatus('thinking');
            this.addLogEntry('system', '[THINKING] Processing perception state with LLM...');

            const prompt = this.buildPrompt(perceptionState);
            let response;

            if (this.apiProvider === 'gemini') {
                response = await this.callGeminiAPI(prompt);
            } else if (this.apiProvider === 'openai') {
                response = await this.callOpenAIAPI(prompt);
            }

            const decision = this.parseDecision(response);
            return decision;
        } catch (error) {
            this.setStatus('error');
            this.addLogEntry('error', `[ERROR] API call failed: ${error.message}`);
            return this.getHeuristicAction(perceptionState);
        }
    }

    buildPrompt(perceptionState) {
        const targetName = this.targetType === 'energy' ? 'Energy Core' : 'Control Terminal';
        const targetPos = this.targetType === 'energy' ? 
            perceptionState.energyCore : perceptionState.controlTerminal;

        return `You are an embodied AI agent in a grid world simulation.
Current perception state:
- Your position: (${perceptionState.agentPosition.x}, ${perceptionState.agentPosition.y})
- Map size: ${perceptionState.mapBounds.width}x${perceptionState.mapBounds.height}
- Target: ${targetName} at (${targetPos?.x ?? '?'}, ${targetPos?.y ?? '?'})
- Nearby tiles (type: 0=floor, 1=wall, 2=energy, 3=terminal):
${perceptionState.nearbyTiles.map(t => `  (${t.x},${t.y}): type=${t.type}`).join('\n')}

Your task: Navigate to the ${targetName}. ALWAYS avoid walls (type=1).

Respond in JSON format ONLY, no extra text:
{"thought": "brief reasoning about next move", "target_x": <number>, "target_y": <number>}`;
    }

    async callGeminiAPI(prompt) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${this.apiKey}`;
        const payload = {
            contents: [{
                parts: [{ text: prompt }]
            }],
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 200
            }
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error(`Gemini API error: ${response.status}`);
        const data = await response.json();
        return data.candidates[0].content.parts[0].text;
    }

    async callOpenAIAPI(prompt) {
        const url = 'https://api.openai.com/v1/chat/completions';
        const payload = {
            model: 'gpt-3.5-turbo',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.7,
            max_tokens: 200
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error(`OpenAI API error: ${response.status}`);
        const data = await response.json();
        return data.choices[0].message.content;
    }

    parseDecision(responseText) {
        try {
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            const json = JSON.parse(jsonMatch?.[0] || responseText);
            const targetX = Math.max(0, Math.min(this.gridWidth - 1, parseInt(json.target_x) || 0));
            const targetY = Math.max(0, Math.min(this.gridHeight - 1, parseInt(json.target_y) || 0));
            
            return {
                thought: json.thought || 'Moving to target',
                target_x: targetX,
                target_y: targetY
            };
        } catch (e) {
            return this.getHeuristicAction(this.getPerceptionState());
        }
    }

    getHeuristicAction(perceptionState) {
        const target = this.targetType === 'energy' ? 
            perceptionState.energyCore : perceptionState.controlTerminal;

        if (!target) {
            return {
                thought: 'Target not found, exploring...',
                target_x: Math.floor(Math.random() * this.gridWidth),
                target_y: Math.floor(Math.random() * this.gridHeight)
            };
        }

        // Instead of naive step-by-step, use full pathfinding
        const path = this.findPath(
            perceptionState.agentPosition.x,
            perceptionState.agentPosition.y,
            target.x,
            target.y
        );

        if (path.length > 0) {
            // Follow the path
            const nextStep = path[0];
            return {
                thought: `Following path towards ${this.targetType === 'energy' ? 'Energy Core' : 'Terminal'} at (${target.x}, ${target.y})`,
                target_x: nextStep.x,
                target_y: nextStep.y
            };
        } else {
            // If no path found, pick a random walkable neighbor
            const neighbors = this.getWalkableNeighbors(
                perceptionState.agentPosition.x,
                perceptionState.agentPosition.y
            );

            if (neighbors.length > 0) {
                const randomNeighbor = neighbors[Math.floor(Math.random() * neighbors.length)];
                return {
                    thought: 'No direct path found, exploring nearby area...',
                    target_x: randomNeighbor.x,
                    target_y: randomNeighbor.y
                };
            } else {
                return {
                    thought: 'Stuck, unable to move',
                    target_x: perceptionState.agentPosition.x,
                    target_y: perceptionState.agentPosition.y
                };
            }
        }
    }

    /* ==================== AGENT MOVEMENT ==================== */
    async executeAction(decision) {
        const targetX = decision.target_x;
        const targetY = decision.target_y;

        this.addLogEntry('thought', `💭 ${decision.thought}`);

        // Check if target is walkable
        if (!this.isWalkable(targetX, targetY)) {
            this.addLogEntry('action', `⚠️  Wall at (${targetX}, ${targetY}), finding alternate path...`);
            
            // Try to find nearest walkable alternative
            const neighbors = this.getWalkableNeighbors(targetX, targetY);
            if (neighbors.length > 0) {
                // Pick the neighbor closest to original target
                let best = neighbors[0];
                let minDist = this.heuristic(best.x, best.y, targetX, targetY);
                
                for (const neighbor of neighbors) {
                    const dist = this.heuristic(neighbor.x, neighbor.y, targetX, targetY);
                    if (dist < minDist) {
                        minDist = dist;
                        best = neighbor;
                    }
                }
                
                const path = this.findPath(this.agent.x, this.agent.y, best.x, best.y);
                if (path.length > 0) {
                    this.agent.pathfindingPath = path;
                    this.agent.targetX = path[0].x;
                    this.agent.targetY = path[0].y;
                    this.agent.moving = true;
                    this.agent.moveProgress = 0;
                    this.setStatus('moving');
                    this.addLogEntry('action', `🚀 Rerouting to (${best.x}, ${best.y})...`);
                    return true;
                }
            }
            
            this.addLogEntry('error', `❌ Cannot reach (${targetX}, ${targetY}), no walkable path`);
            this.agent.failedAttempts++;
            return false;
        }

        // Calculate path using A*
        const path = this.findPath(this.agent.x, this.agent.y, targetX, targetY);

        if (path.length > 0) {
            this.agent.pathfindingPath = path;
            this.agent.targetX = path[0].x;
            this.agent.targetY = path[0].y;
            this.agent.moving = true;
            this.agent.moveProgress = 0;
            this.agent.failedAttempts = 0;
            this.setStatus('moving');
            this.addLogEntry('action', `🚀 Navigating to (${targetX}, ${targetY})...`);
            return true;
        } else {
            this.addLogEntry('error', `❌ No path found to (${targetX}, ${targetY})`);
            this.agent.failedAttempts++;
            return false;
        }
    }

    /* ==================== SIMULATION STEP ==================== */
    async runStep() {
        if (this.agent.moving) {
            // Continue current movement
            return;
        }

        this.stepCount++;
        const perception = this.getPerceptionState();
        const decision = await this.fetchNextAction(perception);
        await this.executeAction(decision);

        this.updateStats();
    }

    /* ==================== RENDERING ==================== */
    render(deltaTime) {
        // Clear canvas
        this.ctx.fillStyle = '#0a0e27';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw grid tiles
        this.drawGridTiles();

        // Update agent position if moving
        this.updateAgentMovement(deltaTime);

        // Draw agent
        this.drawAgent();

        // Draw grid lines
        this.drawGridLines();

        // Update FPS counter
        this.updateFPS(deltaTime);
    }

    drawGridTiles() {
        const colors = {
            0: '#1a2544', // Floor
            1: '#495057', // Wall
            2: '#ffd700', // Energy Core
            3: '#00d4ff'  // Terminal
        };

        for (let y = 0; y < this.gridHeight; y++) {
            for (let x = 0; x < this.gridWidth; x++) {
                const tileType = this.mapData[y][x];
                const px = x * this.tileSize;
                const py = y * this.tileSize;

                // Draw tile background
                this.ctx.fillStyle = colors[tileType];
                this.ctx.fillRect(px, py, this.tileSize, this.tileSize);

                // Draw special tile effects
                if (tileType === 2) {
                    // Energy Core: glowing effect
                    this.ctx.fillStyle = 'rgba(255, 215, 0, 0.3)';
                    this.ctx.beginPath();
                    this.ctx.arc(
                        px + this.tileSize / 2,
                        py + this.tileSize / 2,
                        this.tileSize / 2.5,
                        0,
                        Math.PI * 2
                    );
                    this.ctx.fill();
                } else if (tileType === 3) {
                    // Terminal: cyan accent
                    this.ctx.strokeStyle = '#00ffff';
                    this.ctx.lineWidth = 2;
                    this.ctx.strokeRect(px + 3, py + 3, this.tileSize - 6, this.tileSize - 6);
                } else if (tileType === 1) {
                    // Wall: darker border
                    this.ctx.strokeStyle = '#2a3f54';
                    this.ctx.lineWidth = 2;
                    this.ctx.strokeRect(px, py, this.tileSize, this.tileSize);
                }
            }
        }
    }

    drawAgent() {
        const px = this.agent.renderX * this.tileSize + this.tileSize / 2;
        const py = this.agent.renderY * this.tileSize + this.tileSize / 2;
        const radius = this.tileSize / 3;

        // Pulsing aura
        const pulsePhase = (Date.now() % 1000) / 1000;
        const auraRadius = radius + Math.sin(pulsePhase * Math.PI * 2) * (radius * 0.3);

        this.ctx.fillStyle = `rgba(0, 212, 255, ${0.3 + pulsePhase * 0.2})`;
        this.ctx.beginPath();
        this.ctx.arc(px, py, auraRadius, 0, Math.PI * 2);
        this.ctx.fill();

        // Main agent circle
        this.ctx.fillStyle = '#00d4ff';
        this.ctx.beginPath();
        this.ctx.arc(px, py, radius, 0, Math.PI * 2);
        this.ctx.fill();

        // Direction indicator
        this.ctx.strokeStyle = '#00ffff';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(px, py, radius * 0.6, 0, Math.PI * 2);
        this.ctx.stroke();

        // Direction arrow (facing towards target if moving)
        if (this.agent.targetX !== null) {
            const angle = Math.atan2(
                this.agent.targetY - this.agent.renderY,
                this.agent.targetX - this.agent.renderX
            );
            const arrowLen = radius * 0.5;
            this.ctx.beginPath();
            this.ctx.moveTo(px, py);
            this.ctx.lineTo(
                px + Math.cos(angle) * arrowLen,
                py + Math.sin(angle) * arrowLen
            );
            this.ctx.stroke();
        }
    }

    drawGridLines() {
        this.ctx.strokeStyle = 'rgba(0, 212, 255, 0.1)';
        this.ctx.lineWidth = 0.5;

        for (let x = 0; x <= this.gridWidth; x++) {
            this.ctx.beginPath();
            this.ctx.moveTo(x * this.tileSize, 0);
            this.ctx.lineTo(x * this.tileSize, this.canvas.height);
            this.ctx.stroke();
        }

        for (let y = 0; y <= this.gridHeight; y++) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y * this.tileSize);
            this.ctx.lineTo(this.canvas.width, y * this.tileSize);
            this.ctx.stroke();
        }
    }

    updateAgentMovement(deltaTime) {
        if (!this.agent.moving) return;

        this.agent.moveProgress += deltaTime / this.agent.moveDuration;

        if (this.agent.moveProgress >= 1) {
            this.agent.moveProgress = 1;
            this.agent.x = this.agent.targetX;
            this.agent.y = this.agent.targetY;
            this.agent.renderX = this.agent.x;
            this.agent.renderY = this.agent.y;

            // Move to next waypoint or stop
            if (this.agent.pathfindingPath.length > 0) {
                this.agent.pathfindingPath.shift();
                if (this.agent.pathfindingPath.length > 0) {
                    const next = this.agent.pathfindingPath[0];
                    this.agent.targetX = next.x;
                    this.agent.targetY = next.y;
                    this.agent.moveProgress = 0;
                } else {
                    this.agent.moving = false;
                    this.agent.targetX = null;
                    this.agent.targetY = null;
                    this.setStatus('idle');
                    this.checkGoalReached();
                }
            }
        } else {
            // Smooth interpolation
            const easing = this.easeInOutQuad(this.agent.moveProgress);
            this.agent.renderX = this.agent.x + (this.agent.targetX - this.agent.x) * easing;
            this.agent.renderY = this.agent.y + (this.agent.targetY - this.agent.y) * easing;
        }
    }

    easeInOutQuad(t) {
        return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    }

    updateFPS(deltaTime) {
        this.frameCount++;
        if (Date.now() - this.lastFrameTime > 1000) {
            this.fps = this.frameCount;
            document.getElementById('fpsValue').textContent = this.fps;
            this.frameCount = 0;
            this.lastFrameTime = Date.now();
        }
    }

    checkGoalReached() {
        const targetType = this.targetType === 'energy' ? 2 : 3;
        if (this.mapData[this.agent.y]?.[this.agent.x] === targetType) {
            this.addLogEntry('action', `✅ GOAL REACHED! ${this.targetType === 'energy' ? 'Energy Core' : 'Terminal'} acquired!`);
            this.setStatus('idle');
        }
    }

    /* ==================== UI STATE MANAGEMENT ==================== */
    updateStats() {
        document.getElementById('stepCounter').textContent = this.stepCount;
        document.getElementById('positionDisplay').textContent = 
            `${this.agent.x}, ${this.agent.y}`;

        const target = this.targetType === 'energy' ? 
            this.findTileType(2) : this.findTileType(3);
        if (target) {
            const distance = Math.abs(target.x - this.agent.x) + 
                           Math.abs(target.y - this.agent.y);
            document.getElementById('distanceDisplay').textContent = distance;
        }
    }

    addLogEntry(type, message) {
        const logTerminal = document.getElementById('logTerminal');
        const entry = document.createElement('div');
        entry.className = `log-entry ${type}`;
        entry.textContent = message;
        logTerminal.appendChild(entry);
        logTerminal.scrollTop = logTerminal.scrollHeight;

        // Keep log size manageable
        if (logTerminal.children.length > 50) {
            logTerminal.removeChild(logTerminal.firstChild);
        }
    }

    setStatus(status) {
        this.statusState = status;
        const indicator = document.getElementById('statusIndicator');
        indicator.className = 'status-indicator';
        
        if (status === 'error') {
            indicator.classList.add('error');
        } else if (status === 'idle') {
            indicator.classList.add('idle');
        }
    }

    /* ==================== LOCAL STORAGE ==================== */
    saveAPIKey() {
        const key = document.getElementById('apiKey').value;
        localStorage.setItem('aiSimAPIKey', key);
        this.apiKey = key;
        this.addLogEntry('system', '[SYSTEM] API key saved locally.');
    }

    loadAPIKey() {
        return localStorage.getItem('aiSimAPIKey') || '';
    }

    saveAPIProvider() {
        const provider = document.getElementById('apiProvider').value;
        localStorage.setItem('aiSimProvider', provider);
        this.apiProvider = provider;
    }

    loadAPIProvider() {
        return localStorage.getItem('aiSimProvider') || 'local';
    }

    loadUIState() {
        const apiKey = this.loadAPIKey();
        document.getElementById('apiKey').value = apiKey;
        document.getElementById('apiProvider').value = this.loadAPIProvider();
    }

    /* ==================== EVENT LISTENERS ==================== */
    initializeEventListeners() {
        // API Key saving
        document.getElementById('apiKey').addEventListener('change', () => this.saveAPIKey());
        document.getElementById('apiProvider').addEventListener('change', () => this.saveAPIProvider());

        // Target selection
        document.getElementById('targetTile').addEventListener('change', (e) => {
            this.targetType = e.target.value;
            const name = this.targetType === 'energy' ? 'Energy Core' : 'Control Terminal';
            document.getElementById('goalDisplay').textContent = `Goal: Navigate to the ${name}`;
            this.addLogEntry('system', `[SYSTEM] Target changed to: ${name}`);
        });

        // Control buttons
        document.getElementById('runStepBtn').addEventListener('click', () => this.runStep());
        document.getElementById('autoRunBtn').addEventListener('click', () => this.toggleAutoRun());
        document.getElementById('resetBtn').addEventListener('click', () => this.resetSimulation());
    }

    toggleAutoRun() {
        this.isAutoRunning = !this.isAutoRunning;
        const btn = document.getElementById('autoRunBtn');
        btn.style.opacity = this.isAutoRunning ? '1' : '0.6';
        
        if (this.isAutoRunning) {
            this.addLogEntry('system', '[SYSTEM] Auto-run enabled.');
            this.autoRunLoop();
        } else {
            this.addLogEntry('system', '[SYSTEM] Auto-run disabled.');
        }
    }

    async autoRunLoop() {
        while (this.isAutoRunning) {
            await this.runStep();
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }

    resetSimulation() {
        this.agent = {
            x: 1,
            y: 1,
            renderX: 1,
            renderY: 1,
            pathfindingPath: [],
            targetX: null,
            targetY: null,
            moving: false,
            moveProgress: 0,
            moveDuration: 300,
            failedAttempts: 0,
            lastFailedPos: null
        };
        this.stepCount = 0;
        this.isAutoRunning = false;
        this.setStatus('idle');
        document.getElementById('autoRunBtn').style.opacity = '0.6';
        document.getElementById('logTerminal').innerHTML = '<div class="log-entry system">[SYSTEM] Simulation reset.</div>';
        this.updateStats();
        this.addLogEntry('system', '[SYSTEM] Ready for new mission.');
    }

    /* ==================== RENDER LOOP ==================== */
    startRenderLoop() {
        let lastTime = Date.now();

        const animate = () => {
            const now = Date.now();
            const deltaTime = now - lastTime;
            lastTime = now;

            this.render(deltaTime);
            requestAnimationFrame(animate);
        };

        requestAnimationFrame(animate);
    }
}

/* ==================== INITIALIZATION ==================== */
document.addEventListener('DOMContentLoaded', () => {
    window.simulation = new EmbodiedAISimulation();
    console.log('🤖 Embodied AI Agent Simulation initialized');
});
