/* ==================== 2D SIDE-SCROLLING PLATFORMER WITH AI ==================== */
/* Production-ready vanilla JavaScript platformer game */

class PlatformerGame {
    constructor() {
        // Canvas & Rendering
        this.canvas = document.getElementById('gridCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.cameraX = 0;
        this.cameraY = 0;
        
        // World Properties
        this.worldWidth = 3000;
        this.worldHeight = this.canvas.height;
        this.gravity = 0.6;
        this.groundLevel = this.canvas.height - 100;
        
        // Game Objects
        this.platforms = [];
        this.enemies = [];
        this.coins = [];
        this.levelGoal = null;
        
        // Player/Agent
        this.player = {
            x: 100,
            y: this.groundLevel - 40,
            width: 20,
            height: 40,
            velocityX: 0,
            velocityY: 0,
            jumping: false,
            canJump: true,
            direction: 1, // 1 for right, -1 for left
            maxSpeed: 6,
            jumpPower: 12,
            onPlatform: null,
            climbing: false
        };

        // Game State
        this.stepCount = 0;
        this.isAutoRunning = false;
        this.statusState = 'idle';
        this.coinsCollected = 0;
        this.currentLevel = 1;

        // Rendering
        this.lastFrameTime = Date.now();
        this.frameCount = 0;
        this.fps = 60;

        // API Configuration
        this.apiKey = this.loadAPIKey();
        this.apiProvider = this.loadAPIProvider();

        // Initialize
        this.initializeLevel();
        this.initializeEventListeners();
        this.loadUIState();
        this.addLogEntry('system', '[SYSTEM] Platformer game initialized. Ready to play!');
        
        // Start render loop
        this.startRenderLoop();
    }

    /* ==================== LEVEL GENERATION ==================== */
    initializeLevel() {
        this.platforms = [];
        this.enemies = [];
        this.coins = [];
        this.coinsCollected = 0;

        // Ground platform
        this.platforms.push({
            x: 0,
            y: this.groundLevel,
            width: this.worldWidth,
            height: 100,
            type: 'ground'
        });

        if (this.currentLevel === 1) {
            this.createLevel1();
        } else if (this.currentLevel === 2) {
            this.createLevel2();
        } else {
            this.createLevel1(); // Default to level 1
        }

        // Level goal (flag)
        this.levelGoal = {
            x: this.worldWidth - 150,
            y: this.groundLevel - 50,
            width: 40,
            height: 50,
            collected: false
        };
    }

    createLevel1() {
        // Starting platform
        this.platforms.push({ x: 50, y: this.groundLevel - 40, width: 200, height: 20, type: 'platform' });

        // Jump sequence
        this.platforms.push({ x: 300, y: this.groundLevel - 80, width: 150, height: 20, type: 'platform' });
        this.platforms.push({ x: 500, y: this.groundLevel - 120, width: 150, height: 20, type: 'platform' });
        this.platforms.push({ x: 700, y: this.groundLevel - 80, width: 150, height: 20, type: 'platform' });

        // Gap to jump
        this.platforms.push({ x: 950, y: this.groundLevel - 60, width: 200, height: 20, type: 'platform' });

        // High jump
        this.platforms.push({ x: 1250, y: this.groundLevel - 150, width: 150, height: 20, type: 'platform' });

        // Moving platform section
        this.platforms.push({ x: 1500, y: this.groundLevel - 100, width: 100, height: 20, type: 'moving' });
        this.platforms.push({ x: 1700, y: this.groundLevel - 80, width: 150, height: 20, type: 'platform' });

        // Pole section
        this.platforms.push({ x: 1950, y: this.groundLevel - 200, width: 30, height: 200, type: 'pole' });
        this.platforms.push({ x: 2100, y: this.groundLevel - 80, width: 150, height: 20, type: 'platform' });

        // Enemy section
        this.platforms.push({ x: 2350, y: this.groundLevel - 60, width: 200, height: 20, type: 'platform' });

        // Final platform
        this.platforms.push({ x: 2700, y: this.groundLevel - 60, width: 200, height: 20, type: 'platform' });

        // Coins
        this.coins.push({ x: 350, y: this.groundLevel - 120, collected: false });
        this.coins.push({ x: 600, y: this.groundLevel - 160, collected: false });
        this.coins.push({ x: 850, y: this.groundLevel - 100, collected: false });
        this.coins.push({ x: 1100, y: this.groundLevel - 100, collected: false });
        this.coins.push({ x: 1350, y: this.groundLevel - 200, collected: false });
        this.coins.push({ x: 1800, y: this.groundLevel - 140, collected: false });
        this.coins.push({ x: 2150, y: this.groundLevel - 120, collected: false });
        this.coins.push({ x: 2450, y: this.groundLevel - 100, collected: false });

        // Enemies (Goombas style)
        this.enemies.push({ x: 1000, y: this.groundLevel - 40, width: 30, height: 30, velocityX: -2, defeated: false });
        this.enemies.push({ x: 2400, y: this.groundLevel - 40, width: 30, height: 30, velocityX: 2, defeated: false });
    }

    createLevel2() {
        // More challenging level
        this.platforms.push({ x: 50, y: this.groundLevel - 40, width: 200, height: 20, type: 'platform' });

        // Rapid jumps
        for (let i = 0; i < 5; i++) {
            this.platforms.push({
                x: 300 + (i * 180),
                y: this.groundLevel - 60 - (i % 2) * 40,
                width: 140,
                height: 20,
                type: 'platform'
            });
        }

        // Large gap
        this.platforms.push({ x: 1350, y: this.groundLevel - 100, width: 150, height: 20, type: 'platform' });

        // Pole climb
        this.platforms.push({ x: 1650, y: this.groundLevel - 250, width: 30, height: 250, type: 'pole' });
        this.platforms.push({ x: 1850, y: this.groundLevel - 180, width: 150, height: 20, type: 'platform' });

        // Multiple enemies
        this.platforms.push({ x: 2150, y: this.groundLevel - 60, width: 300, height: 20, type: 'platform' });
        this.platforms.push({ x: 2550, y: this.groundLevel - 80, width: 150, height: 20, type: 'platform' });

        // Coins
        for (let i = 0; i < 12; i++) {
            this.coins.push({ x: 300 + (i * 150), y: this.groundLevel - 120, collected: false });
        }

        // Multiple enemies
        this.enemies.push({ x: 800, y: this.groundLevel - 40, width: 30, height: 30, velocityX: 2, defeated: false });
        this.enemies.push({ x: 1200, y: this.groundLevel - 40, width: 30, height: 30, velocityX: -2, defeated: false });
        this.enemies.push({ x: 2200, y: this.groundLevel - 40, width: 30, height: 30, velocityX: 2, defeated: false });
        this.enemies.push({ x: 2400, y: this.groundLevel - 40, width: 30, height: 30, velocityX: -2, defeated: false });
    }

    /* ==================== PERCEPTION STATE ==================== */
    getPerceptionState() {
        const nearbyPlatforms = this.platforms.filter(p => 
            Math.abs(p.x - this.player.x) < 800 && Math.abs(p.y - this.player.y) < 600
        );

        const nearbyEnemies = this.enemies.filter(e =>
            !e.defeated && Math.abs(e.x - this.player.x) < 600 && Math.abs(e.y - this.player.y) < 400
        );

        const nearbyCoin = this.coins.find(c =>
            !c.collected && Math.abs(c.x - this.player.x) < 400 && Math.abs(c.y - this.player.y) < 400
        );

        return {
            playerPosition: { x: this.player.x, y: this.player.y },
            playerVelocity: { x: this.player.velocityX, y: this.player.velocityY },
            canJump: this.player.canJump,
            onPlatform: this.player.onPlatform ? 'yes' : 'no',
            nearbyPlatforms: nearbyPlatforms.map(p => ({
                x: p.x,
                y: p.y,
                width: p.width,
                type: p.type
            })),
            nearbyEnemies: nearbyEnemies.map(e => ({
                x: e.x,
                y: e.y,
                direction: e.velocityX > 0 ? 'right' : 'left'
            })),
            nearbyCoin: nearbyCoin ? { x: nearbyCoin.x, y: nearbyCoin.y } : null,
            goalPosition: { x: this.levelGoal.x, y: this.levelGoal.y },
            coinsCollected: this.coinsCollected,
            currentLevel: this.currentLevel
        };
    }

    /* ==================== AI DECISION MAKING ==================== */
    async fetchNextAction(perceptionState) {
        if (!this.apiKey || this.apiProvider === 'local') {
            return this.getHeuristicAction(perceptionState);
        }

        try {
            this.setStatus('thinking');
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
        return `You are a platformer AI agent navigating a side-scrolling level.
Player Position: (${perceptionState.playerPosition.x}, ${perceptionState.playerPosition.y})
Can Jump: ${perceptionState.canJump}
Goal: Reach flag at (${perceptionState.goalPosition.x}, ${perceptionState.goalPosition.y})

Nearby Platforms: ${JSON.stringify(perceptionState.nearbyPlatforms.slice(0, 5))}
Nearby Enemies: ${JSON.stringify(perceptionState.nearbyEnemies.slice(0, 3))}
Nearby Coin: ${perceptionState.nearbyCoin ? `(${perceptionState.nearbyCoin.x}, ${perceptionState.nearbyCoin.y})` : 'none'}

Decide your action:
- "jump_left": Jump and move left
- "jump_right": Jump and move right
- "move_left": Walk left
- "move_right": Walk right
- "climb": Climb pole (if available)
- "stand": Stand still

Respond in JSON: {"thought": "reasoning", "action": "action_name"}`;
    }

    async callGeminiAPI(prompt) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${this.apiKey}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.7, maxOutputTokens: 200 }
            })
        });
        if (!response.ok) throw new Error(`Gemini API error: ${response.status}`);
        const data = await response.json();
        return data.candidates[0].content.parts[0].text;
    }

    async callOpenAIAPI(prompt) {
        const url = 'https://api.openai.com/v1/chat/completions';
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-3.5-turbo',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.7,
                max_tokens: 200
            })
        });
        if (!response.ok) throw new Error(`OpenAI API error: ${response.status}`);
        const data = await response.json();
        return data.choices[0].message.content;
    }

    parseDecision(responseText) {
        try {
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            const json = JSON.parse(jsonMatch?.[0] || responseText);
            return {
                thought: json.thought || 'Making decision',
                action: json.action || 'stand'
            };
        } catch (e) {
            return this.getHeuristicAction(this.getPerceptionState());
        }
    }

    getHeuristicAction(perceptionState) {
        const goalX = perceptionState.goalPosition.x;
        const playerX = perceptionState.playerPosition.x;

        // Prioritize moving toward goal
        if (goalX > playerX + 50) {
            if (perceptionState.canJump) {
                return { thought: 'Jumping right toward goal', action: 'jump_right' };
            }
            return { thought: 'Moving right toward goal', action: 'move_right' };
        } else if (goalX < playerX - 50) {
            if (perceptionState.canJump) {
                return { thought: 'Jumping left toward goal', action: 'jump_left' };
            }
            return { thought: 'Moving left toward goal', action: 'move_left' };
        }

        // Collect nearby coins
        if (perceptionState.nearbyCoin) {
            if (perceptionState.nearbyCoin.x > playerX + 20 && perceptionState.canJump) {
                return { thought: 'Jumping for coin on right', action: 'jump_right' };
            } else if (perceptionState.nearbyCoin.x < playerX - 20 && perceptionState.canJump) {
                return { thought: 'Jumping for coin on left', action: 'jump_left' };
            }
        }

        return { thought: 'Exploring level', action: 'move_right' };
    }

    /* ==================== GAME PHYSICS & MOVEMENT ==================== */
    executeAction(action) {
        const { thought } = action;
        this.addLogEntry('thought', `💭 ${thought}`);

        switch(action.action) {
            case 'jump_left':
                if (this.player.canJump) {
                    this.player.velocityY = -this.player.jumpPower;
                    this.player.velocityX = -this.player.maxSpeed;
                    this.player.canJump = false;
                    this.player.jumping = true;
                    this.player.direction = -1;
                }
                break;
            case 'jump_right':
                if (this.player.canJump) {
                    this.player.velocityY = -this.player.jumpPower;
                    this.player.velocityX = this.player.maxSpeed;
                    this.player.canJump = false;
                    this.player.jumping = true;
                    this.player.direction = 1;
                }
                break;
            case 'move_left':
                this.player.velocityX = -this.player.maxSpeed;
                this.player.direction = -1;
                break;
            case 'move_right':
                this.player.velocityX = this.player.maxSpeed;
                this.player.direction = 1;
                break;
            case 'climb':
                this.attemptClimb();
                break;
            case 'stand':
                this.player.velocityX *= 0.8;
                break;
        }

        this.stepCount++;
        this.updateStats();
    }

    attemptClimb() {
        // Check if on a pole
        for (const platform of this.platforms) {
            if (platform.type === 'pole' &&
                this.player.x >= platform.x && this.player.x <= platform.x + platform.width &&
                this.player.y >= platform.y && this.player.y <= platform.y + platform.height) {
                this.player.climbing = true;
                this.player.velocityY = -5;
                this.player.canJump = false;
                return;
            }
        }
    }

    updatePhysics(deltaTime) {
        const dt = deltaTime / 1000; // Convert to seconds

        // Apply gravity
        if (!this.player.climbing) {
            this.player.velocityY += this.gravity;
        } else {
            this.player.velocityY = 0;
        }

        // Update position
        this.player.x += this.player.velocityX;
        this.player.y += this.player.velocityY;

        // Collision detection with platforms
        this.player.canJump = false;
        this.player.onPlatform = null;

        for (const platform of this.platforms) {
            // Check if player is above platform and falling
            if (this.player.velocityY >= 0 &&
                this.player.y + this.player.height >= platform.y &&
                this.player.y + this.player.height <= platform.y + 20 &&
                this.player.x + this.player.width > platform.x &&
                this.player.x < platform.x + platform.width) {
                
                this.player.y = platform.y - this.player.height;
                this.player.velocityY = 0;
                this.player.canJump = true;
                this.player.onPlatform = platform;
                this.player.climbing = false;
            }
        }

        // Collision with enemies (bounce or defeat)
        for (const enemy of this.enemies) {
            if (!enemy.defeated) {
                const dx = this.player.x - enemy.x;
                const dy = this.player.y - enemy.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < 40) {
                    if (this.player.velocityY > 0 && this.player.y < enemy.y) {
                        // Jump on enemy
                        enemy.defeated = true;
                        this.player.velocityY = -10;
                        this.addLogEntry('action', '🦗 Enemy defeated!');
                    } else if (this.player.y < 100) {
                        // Knock back player
                        this.player.velocityX = -this.player.velocityX;
                    }
                }
            }
        }

        // Collect coins
        for (const coin of this.coins) {
            if (!coin.collected) {
                const dx = this.player.x - coin.x;
                const dy = this.player.y - coin.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < 30) {
                    coin.collected = true;
                    this.coinsCollected++;
                    this.addLogEntry('action', '🪙 Coin collected!');
                }
            }
        }

        // Collect goal
        if (!this.levelGoal.collected) {
            const dx = this.player.x - this.levelGoal.x;
            const dy = this.player.y - this.levelGoal.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < 50) {
                this.levelGoal.collected = true;
                this.addLogEntry('action', `🚩 LEVEL ${this.currentLevel} COMPLETE! Moving to next level...`);
                setTimeout(() => this.nextLevel(), 2000);
            }
        }

        // Update moving platforms
        for (const platform of this.platforms) {
            if (platform.type === 'moving') {
                platform.x += 2;
                if (platform.x > this.worldWidth) platform.x = -platform.width;
            }
        }

        // Update enemies
        for (const enemy of this.enemies) {
            if (!enemy.defeated) {
                enemy.x += enemy.velocityX;
                if (enemy.x < 0 || enemy.x > this.worldWidth) {
                    enemy.velocityX *= -1;
                }
            }
        }

        // World bounds
        if (this.player.x < 0) this.player.x = 0;
        if (this.player.x > this.worldWidth) this.player.x = this.worldWidth;
        if (this.player.y > this.worldHeight) this.resetLevel();

        // Update camera
        this.cameraX = Math.max(0, this.player.x - 200);
    }

    /* ==================== RENDERING ==================== */
    render(deltaTime) {
        // Update physics
        this.updatePhysics(deltaTime);

        // Clear canvas
        this.ctx.fillStyle = '#87ceeb'; // Sky blue
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw distant background
        this.ctx.fillStyle = '#e0f6ff';
        this.ctx.fillRect(0, this.canvas.height * 0.7, this.canvas.width, this.canvas.height * 0.3);

        // Set up clipping for world view
        this.ctx.save();
        this.ctx.translate(-this.cameraX, 0);

        // Draw platforms
        for (const platform of this.platforms) {
            this.drawPlatform(platform);
        }

        // Draw enemies
        for (const enemy of this.enemies) {
            if (!enemy.defeated) {
                this.drawEnemy(enemy);
            }
        }

        // Draw coins
        for (const coin of this.coins) {
            if (!coin.collected) {
                this.drawCoin(coin);
            }
        }

        // Draw goal
        this.drawGoal();

        // Draw player
        this.drawStickman();

        this.ctx.restore();

        // Draw UI overlay
        this.drawUI();

        this.updateFPS(deltaTime);
    }

    drawPlatform(platform) {
        this.ctx.fillStyle = '#8b4513';

        if (platform.type === 'pole') {
            this.ctx.fillStyle = '#654321';
            this.ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
            // Draw pole rings
            for (let i = 0; i < platform.height; i += 15) {
                this.ctx.strokeStyle = '#4a2511';
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.arc(platform.x + platform.width / 2, platform.y + i, platform.width / 2, 0, Math.PI * 2);
                this.ctx.stroke();
            }
        } else if (platform.type === 'moving') {
            this.ctx.fillStyle = '#ff8c00';
            this.ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
            this.ctx.strokeStyle = '#ff6600';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(platform.x + 5, platform.y + 5, platform.width - 10, platform.height - 10);
        } else {
            this.ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
            // Draw brick pattern
            this.ctx.strokeStyle = '#654321';
            this.ctx.lineWidth = 1;
            for (let x = platform.x; x < platform.x + platform.width; x += 20) {
                this.ctx.beginPath();
                this.ctx.moveTo(x, platform.y);
                this.ctx.lineTo(x, platform.y + platform.height);
                this.ctx.stroke();
            }
        }
    }

    drawStickman() {
        const px = this.player.x;
        const py = this.player.y;
        const scale = 1;

        this.ctx.strokeStyle = '#000000';
        this.ctx.fillStyle = '#000000';
        this.ctx.lineWidth = 2;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';

        // Head
        this.ctx.beginPath();
        this.ctx.arc(px, py - 12 * scale, 5 * scale, 0, Math.PI * 2);
        this.ctx.fill();

        // Eyes
        this.ctx.fillStyle = '#ffffff';
        this.ctx.beginPath();
        this.ctx.arc(px - 2 * scale, py - 13 * scale, 1.5 * scale, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.beginPath();
        this.ctx.arc(px + 2 * scale, py - 13 * scale, 1.5 * scale, 0, Math.PI * 2);
        this.ctx.fill();

        // Pupils
        this.ctx.fillStyle = '#000000';
        this.ctx.beginPath();
        this.ctx.arc(px - 2 * scale + (this.player.direction * 0.5 * scale), py - 13 * scale, 0.8 * scale, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.beginPath();
        this.ctx.arc(px + 2 * scale + (this.player.direction * 0.5 * scale), py - 13 * scale, 0.8 * scale, 0, Math.PI * 2);
        this.ctx.fill();

        // Body
        this.ctx.beginPath();
        this.ctx.moveTo(px, py - 6 * scale);
        this.ctx.lineTo(px, py + 3 * scale);
        this.ctx.stroke();

        // Arms
        const armSwing = Math.sin(this.stepCount * 0.05) * 2;
        this.ctx.beginPath();
        this.ctx.moveTo(px, py - 2 * scale);
        this.ctx.lineTo(px - 8 * scale * this.player.direction + armSwing, py + 1 * scale);
        this.ctx.stroke();

        this.ctx.beginPath();
        this.ctx.moveTo(px, py - 2 * scale);
        this.ctx.lineTo(px + 8 * scale * this.player.direction - armSwing, py + 1 * scale);
        this.ctx.stroke();

        // Legs
        const legSwing = Math.sin(this.stepCount * 0.05) * 2;
        this.ctx.beginPath();
        this.ctx.moveTo(px, py + 3 * scale);
        this.ctx.lineTo(px - 5 * scale + legSwing, py + 10 * scale);
        this.ctx.stroke();

        this.ctx.beginPath();
        this.ctx.moveTo(px, py + 3 * scale);
        this.ctx.lineTo(px + 5 * scale - legSwing, py + 10 * scale);
        this.ctx.stroke();
    }

    drawEnemy(enemy) {
        const px = enemy.x;
        const py = enemy.y;

        // Goomba style enemy
        this.ctx.fillStyle = '#8b4513';
        this.ctx.beginPath();
        this.ctx.ellipse(px, py, enemy.width / 2, enemy.height / 2, 0, 0, Math.PI * 2);
        this.ctx.fill();

        // Eyes
        this.ctx.fillStyle = '#ffffff';
        this.ctx.beginPath();
        this.ctx.arc(px - 5, py - 8, 2, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.beginPath();
        this.ctx.arc(px + 5, py - 8, 2, 0, Math.PI * 2);
        this.ctx.fill();

        // Pupils
        this.ctx.fillStyle = '#000000';
        this.ctx.beginPath();
        this.ctx.arc(px - 5 + (Math.sign(enemy.velocityX) * 0.5), py - 8, 1, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.beginPath();
        this.ctx.arc(px + 5 + (Math.sign(enemy.velocityX) * 0.5), py - 8, 1, 0, Math.PI * 2);
        this.ctx.fill();
    }

    drawCoin(coin) {
        const px = coin.x;
        const py = coin.y;
        const radius = 6;

        this.ctx.fillStyle = '#ffcc00';
        this.ctx.beginPath();
        this.ctx.arc(px, py, radius, 0, Math.PI * 2);
        this.ctx.fill();

        // Shine
        this.ctx.fillStyle = '#ffff99';
        this.ctx.beginPath();
        this.ctx.arc(px - radius / 3, py - radius / 3, radius / 3, 0, Math.PI * 2);
        this.ctx.fill();

        // Spin effect
        this.ctx.strokeStyle = '#ff9900';
        this.ctx.lineWidth = 1;
        const angle = this.stepCount * 0.1;
        this.ctx.beginPath();
        this.ctx.arc(px, py, radius - 2, angle, angle + Math.PI);
        this.ctx.stroke();
    }

    drawGoal() {
        const px = this.levelGoal.x;
        const py = this.levelGoal.y;
        const w = this.levelGoal.width;
        const h = this.levelGoal.height;

        // Pole
        this.ctx.fillStyle = '#654321';
        this.ctx.fillRect(px + w / 2 - 2, py + h - 10, 4, 10);

        // Flag
        this.ctx.fillStyle = '#ff0000';
        this.ctx.beginPath();
        this.ctx.moveTo(px + w / 2, py);
        this.ctx.lineTo(px + w / 2 + w / 2, py + h / 4);
        this.ctx.lineTo(px + w / 2, py + h / 2);
        this.ctx.closePath();
        this.ctx.fill();
    }

    drawUI() {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(0, 0, this.canvas.width, 40);

        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 18px Arial';
        this.ctx.fillText(`Level: ${this.currentLevel}`, 20, 25);
        this.ctx.fillText(`Coins: ${this.coinsCollected}`, 150, 25);
        this.ctx.fillText(`Position: ${Math.floor(this.player.x)}`, 300, 25);
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

    /* ==================== LEVEL MANAGEMENT ==================== */
    nextLevel() {
        this.currentLevel++;
        if (this.currentLevel > 2) {
            this.addLogEntry('action', '🎉 GAME COMPLETE! All levels finished!');
            this.currentLevel = 1;
        }
        this.player.x = 100;
        this.player.y = this.groundLevel - 40;
        this.player.velocityX = 0;
        this.player.velocityY = 0;
        this.initializeLevel();
    }

    resetLevel() {
        this.player.x = 100;
        this.player.y = this.groundLevel - 40;
        this.player.velocityX = 0;
        this.player.velocityY = 0;
        this.addLogEntry('error', '❌ Fell off the level!');
    }

    /* ==================== UI STATE MANAGEMENT ==================== */
    updateStats() {
        document.getElementById('stepCounter').textContent = this.stepCount;
        document.getElementById('positionDisplay').textContent = 
            `${Math.floor(this.player.x)}, ${Math.floor(this.player.y)}`;
        document.getElementById('distanceDisplay').textContent = 
            `Level ${this.currentLevel}`;
    }

    addLogEntry(type, message) {
        const logTerminal = document.getElementById('logTerminal');
        const entry = document.createElement('div');
        entry.className = `log-entry ${type}`;
        entry.textContent = message;
        logTerminal.appendChild(entry);
        logTerminal.scrollTop = logTerminal.scrollHeight;

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
        localStorage.setItem('platformerAPIKey', key);
        this.apiKey = key;
        this.addLogEntry('system', '[SYSTEM] API key saved.');
    }

    loadAPIKey() {
        return localStorage.getItem('platformerAPIKey') || '';
    }

    saveAPIProvider() {
        const provider = document.getElementById('apiProvider').value;
        localStorage.setItem('platformerProvider', provider);
        this.apiProvider = provider;
    }

    loadAPIProvider() {
        return localStorage.getItem('platformerProvider') || 'local';
    }

    loadUIState() {
        document.getElementById('apiKey').value = this.loadAPIKey();
        document.getElementById('apiProvider').value = this.loadAPIProvider();
    }

    /* ==================== EVENT LISTENERS ==================== */
    initializeEventListeners() {
        document.getElementById('apiKey').addEventListener('change', () => this.saveAPIKey());
        document.getElementById('apiProvider').addEventListener('change', () => this.saveAPIProvider());

        document.getElementById('targetTile').addEventListener('change', (e) => {
            const name = e.target.value === 'level1' ? 'Level 1' : 'Level 2';
            document.getElementById('goalDisplay').textContent = `Goal: Complete ${name}`;
        });

        document.getElementById('runStepBtn').addEventListener('click', async () => {
            const perception = this.getPerceptionState();
            const decision = await this.fetchNextAction(perception);
            this.executeAction(decision);
        });

        document.getElementById('autoRunBtn').addEventListener('click', () => this.toggleAutoRun());
        document.getElementById('resetBtn').addEventListener('click', () => this.resetLevel());
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
            const perception = this.getPerceptionState();
            const decision = await this.fetchNextAction(perception);
            this.executeAction(decision);
            await new Promise(resolve => setTimeout(resolve, 200));
        }
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
    window.game = new PlatformerGame();
    console.log('🎮 2D Side-Scrolling Platformer initialized');
});
