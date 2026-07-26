/* ==================== GPU TILE PLATFORMER WITH AI ==================== */

class GPURenderer {
    constructor(game) {
        this.game = game;
        this.tileSize = game.tileSize;
        this.chunkSize = game.chunkSize;

        this.app = null;
        this.worldContainer = null;
        this.tileContainer = null;
        this.dynamicContainer = null;

        this.terrainTilemap = null;
        this.decorTilemap = null;

        this.textures = {};
        this.animatedTerrainFrames = [];
        this.animatedDecorFrames = [];

        this.playerSprite = null;
        this.goalSprite = null;
        this.enemySprites = [];
        this.coinSprites = [];
        this.movingPlatformSprites = [];

        this.activeChunkKeys = new Set();

        this.lighting = {
            quality: 'medium',
            resolutionScale: 0.5,
            canvas: null,
            ctx: null,
            texture: null,
            sprite: null
        };

        this.metrics = {
            drawCalls: 0,
            activeChunks: 0
        };
    }

    async initialize() {
        if (!window.PIXI) {
            throw new Error('PIXI is not available.');
        }

        const canvas = this.game.canvas;

        this.app = new PIXI.Application({
            view: canvas,
            width: canvas.width,
            height: canvas.height,
            antialias: false,
            backgroundColor: 0x0a0e27,
            autoDensity: true,
            resolution: window.devicePixelRatio || 1,
            powerPreference: 'high-performance'
        });

        this.worldContainer = new PIXI.Container();
        this.tileContainer = new PIXI.Container();
        this.dynamicContainer = new PIXI.Container();

        this.worldContainer.addChild(this.tileContainer);
        this.worldContainer.addChild(this.dynamicContainer);
        this.app.stage.addChild(this.worldContainer);

        this.createTilemaps();
        this.createTextures();
        this.createDynamicSprites();
        this.initializeLighting();
    }

    createTilemaps() {
        const TilemapClass = window.PIXI?.tilemap?.CompositeTilemap;
        if (TilemapClass) {
            this.terrainTilemap = new TilemapClass();
            this.decorTilemap = new TilemapClass();
        } else {
            this.terrainTilemap = new PIXI.Container();
            this.decorTilemap = new PIXI.Container();
        }

        this.tileContainer.addChild(this.terrainTilemap);
        this.tileContainer.addChild(this.decorTilemap);
    }

    createTextures() {
        this.textures.sky = this.createSolidTexture(0x87ceeb, this.tileSize, this.tileSize);
        this.textures.ground = this.createSolidTexture(0x8b4513, this.tileSize, this.tileSize);
        this.textures.platform = this.createSolidTexture(0x7a3f14, this.tileSize, this.tileSize);
        this.textures.pole = this.createSolidTexture(0x5a3412, this.tileSize, this.tileSize);
        this.textures.decor = this.createSolidTexture(0x00d4ff, this.tileSize, this.tileSize);
        this.textures.lightBlock = this.createSolidTexture(0x333333, this.tileSize, this.tileSize);

        this.animatedTerrainFrames = [
            this.createSolidTexture(0x6a3816, this.tileSize, this.tileSize),
            this.createSolidTexture(0x844216, this.tileSize, this.tileSize),
            this.createSolidTexture(0x6f3a19, this.tileSize, this.tileSize)
        ];

        this.animatedDecorFrames = [
            this.createSolidTexture(0x1fe8ff, this.tileSize, this.tileSize),
            this.createSolidTexture(0x00c2e6, this.tileSize, this.tileSize),
            this.createSolidTexture(0x00ffff, this.tileSize, this.tileSize)
        ];

        this.textures.player = this.createCircleTexture(0x00d4ff, 10);
        this.textures.enemy = this.createCircleTexture(0x8b4513, 12);
        this.textures.coin = this.createCircleTexture(0xffcc00, 6);
        this.textures.goal = this.createFlagTexture();
    }

    createSolidTexture(color, width, height) {
        const g = new PIXI.Graphics();
        g.beginFill(color);
        g.drawRect(0, 0, width, height);
        g.endFill();
        return this.app.renderer.generateTexture(g);
    }

    createCircleTexture(color, radius) {
        const g = new PIXI.Graphics();
        g.beginFill(color);
        g.drawCircle(radius, radius, radius);
        g.endFill();
        return this.app.renderer.generateTexture(g);
    }

    createFlagTexture() {
        const g = new PIXI.Graphics();
        g.beginFill(0x654321);
        g.drawRect(14, 4, 4, 28);
        g.endFill();
        g.beginFill(0xff0000);
        g.moveTo(18, 4);
        g.lineTo(32, 10);
        g.lineTo(18, 16);
        g.lineTo(18, 4);
        g.endFill();
        return this.app.renderer.generateTexture(g);
    }

    createDynamicSprites() {
        this.playerSprite = new PIXI.Sprite(this.textures.player);
        this.playerSprite.anchor.set(0.5, 1);
        this.dynamicContainer.addChild(this.playerSprite);

        this.goalSprite = new PIXI.Sprite(this.textures.goal);
        this.goalSprite.anchor.set(0.5, 1);
        this.dynamicContainer.addChild(this.goalSprite);

        this.refreshMovingPlatformSprites();
    }

    refreshMovingPlatformSprites() {
        const movingPlatforms = this.game.platforms.filter(p => p.type === 'moving');
        while (this.movingPlatformSprites.length < movingPlatforms.length) {
            const sprite = new PIXI.Sprite(this.animatedTerrainFrames[0]);
            this.movingPlatformSprites.push(sprite);
            this.dynamicContainer.addChild(sprite);
        }
        for (let i = movingPlatforms.length; i < this.movingPlatformSprites.length; i++) {
            this.movingPlatformSprites[i].visible = false;
        }
    }

    initializeLighting() {
        this.setLightingQuality(this.lighting.quality);
    }

    setLightingQuality(quality) {
        this.lighting.quality = quality;
        this.lighting.resolutionScale = quality === 'high' ? 1 : quality === 'low' ? 0.25 : 0.5;

        const width = Math.max(64, Math.floor(this.game.canvas.width * this.lighting.resolutionScale));
        const height = Math.max(64, Math.floor(this.game.canvas.height * this.lighting.resolutionScale));

        this.lighting.canvas = document.createElement('canvas');
        this.lighting.canvas.width = width;
        this.lighting.canvas.height = height;
        this.lighting.ctx = this.lighting.canvas.getContext('2d');

        if (this.lighting.texture) {
            this.lighting.texture.destroy(true);
        }
        this.lighting.texture = PIXI.Texture.from(this.lighting.canvas);

        if (!this.lighting.sprite) {
            this.lighting.sprite = new PIXI.Sprite(this.lighting.texture);
            this.lighting.sprite.blendMode = PIXI.BLEND_MODES.MULTIPLY;
            this.lighting.sprite.zIndex = 9999;
            this.app.stage.addChild(this.lighting.sprite);
        } else {
            this.lighting.sprite.texture = this.lighting.texture;
        }

        this.lighting.sprite.width = this.game.canvas.width;
        this.lighting.sprite.height = this.game.canvas.height;
    }

    updateVisibleChunks() {
        const visibleChunkKeys = this.game.world.getVisibleChunkKeys(this.game.cameraX, this.game.cameraY, this.game.canvas.width, this.game.canvas.height);
        const next = new Set(visibleChunkKeys);

        const changed = next.size !== this.activeChunkKeys.size || [...next].some(k => !this.activeChunkKeys.has(k));
        if (!changed) {
            this.metrics.activeChunks = next.size;
            return;
        }

        this.activeChunkKeys = next;
        this.metrics.activeChunks = next.size;

        this.rebuildTilemapLayers();
    }

    rebuildTilemapLayers() {
        if (this.terrainTilemap.clear) this.terrainTilemap.clear();
        if (this.decorTilemap.clear) this.decorTilemap.clear();

        this.clearContainerIfNeeded(this.terrainTilemap);
        this.clearContainerIfNeeded(this.decorTilemap);

        const terrainFrame = this.animatedTerrainFrames[this.game.animationState.frameIndex];
        const decorFrame = this.animatedDecorFrames[this.game.animationState.frameIndex];

        for (const key of this.activeChunkKeys) {
            const chunk = this.game.world.chunks.get(key);
            if (!chunk) continue;

            for (const tile of chunk.tiles) {
                const worldX = tile.x * this.tileSize;
                const worldY = tile.y * this.tileSize;

                if (tile.layer === 'terrain') {
                    const tex = tile.animated ? terrainFrame : this.resolveTileTexture(tile.type);
                    this.addTile(this.terrainTilemap, tex, worldX, worldY);
                } else if (tile.layer === 'decor') {
                    const tex = tile.animated ? decorFrame : this.textures.decor;
                    this.addTile(this.decorTilemap, tex, worldX, worldY);
                }
            }
        }
    }

    clearContainerIfNeeded(target) {
        if (!target || target.clear) return;
        if (target.removeChildren) {
            target.removeChildren().forEach(child => child.destroy?.());
        }
    }

    resolveTileTexture(type) {
        switch (type) {
            case 'ground': return this.textures.ground;
            case 'platform': return this.textures.platform;
            case 'pole': return this.textures.pole;
            case 'lightBlock': return this.textures.lightBlock;
            default: return this.textures.platform;
        }
    }

    addTile(target, texture, x, y) {
        if (target.tile) {
            target.tile(texture, x, y);
            return;
        }

        const sprite = new PIXI.Sprite(texture);
        sprite.x = x;
        sprite.y = y;
        sprite.width = this.tileSize;
        sprite.height = this.tileSize;
        target.addChild(sprite);
    }

    syncDynamicEntities() {
        const { player, levelGoal, enemies, coins } = this.game;

        this.playerSprite.x = player.x + player.width / 2;
        this.playerSprite.y = player.y + player.height;
        this.playerSprite.scale.x = player.direction >= 0 ? 1 : -1;

        this.goalSprite.x = levelGoal.x + levelGoal.width / 2;
        this.goalSprite.y = levelGoal.y + levelGoal.height;
        this.goalSprite.visible = !levelGoal.collected;

        while (this.enemySprites.length < enemies.length) {
            const sprite = new PIXI.Sprite(this.textures.enemy);
            sprite.anchor.set(0.5, 1);
            this.enemySprites.push(sprite);
            this.dynamicContainer.addChild(sprite);
        }

        while (this.coinSprites.length < coins.length) {
            const sprite = new PIXI.Sprite(this.textures.coin);
            sprite.anchor.set(0.5, 0.5);
            this.coinSprites.push(sprite);
            this.dynamicContainer.addChild(sprite);
        }

        const movingPlatforms = this.game.platforms.filter(p => p.type === 'moving');

        for (let i = 0; i < this.enemySprites.length; i++) {
            const sprite = this.enemySprites[i];
            const enemy = enemies[i];
            if (!enemy) {
                sprite.visible = false;
                continue;
            }
            sprite.visible = !enemy.defeated;
            sprite.x = enemy.x;
            sprite.y = enemy.y + enemy.height / 2;
            sprite.scale.x = enemy.velocityX >= 0 ? 1 : -1;
        }

        for (let i = 0; i < this.coinSprites.length; i++) {
            const sprite = this.coinSprites[i];
            const coin = coins[i];
            if (!coin) {
                sprite.visible = false;
                continue;
            }
            sprite.visible = !coin.collected;
            sprite.x = coin.x;
            sprite.y = coin.y;
        }

        for (let i = 0; i < this.movingPlatformSprites.length; i++) {
            const sprite = this.movingPlatformSprites[i];
            const platform = movingPlatforms[i];
            if (!platform) {
                sprite.visible = false;
                continue;
            }
            sprite.visible = true;
            sprite.texture = this.animatedTerrainFrames[this.game.animationState.frameIndex];
            sprite.x = platform.x;
            sprite.y = platform.y;
            sprite.width = platform.width;
            sprite.height = platform.height;
        }
    }

    updateCamera() {
        this.worldContainer.x = -this.game.cameraX;
        this.worldContainer.y = -this.game.cameraY;
    }

    updateLighting() {
        const { canvas, ctx } = this.lighting;
        if (!canvas || !ctx) return;

        const scaleX = canvas.width / this.game.canvas.width;
        const scaleY = canvas.height / this.game.canvas.height;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#101820';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const lights = this.game.world.getVisibleLights(this.game.cameraX, this.game.cameraY, this.game.canvas.width, this.game.canvas.height);

        const playerLightX = (this.game.player.x + this.game.player.width / 2 - this.game.cameraX) * scaleX;
        const playerLightY = (this.game.player.y + this.game.player.height / 2 - this.game.cameraY) * scaleY;
        this.cutRadialLight(ctx, playerLightX, playerLightY, 140 * scaleX, 0.75);

        for (const light of lights) {
            const lx = (light.x * this.tileSize + this.tileSize / 2 - this.game.cameraX) * scaleX;
            const ly = (light.y * this.tileSize + this.tileSize / 2 - this.game.cameraY) * scaleY;
            this.cutRadialLight(ctx, lx, ly, light.radius * scaleX, 0.9);
        }

        this.drawOcclusionShadows(ctx, scaleX, scaleY);
        this.lighting.texture.update();
    }

    cutRadialLight(ctx, x, y, radius, strength) {
        const gradient = ctx.createRadialGradient(x, y, radius * 0.1, x, y, radius);
        gradient.addColorStop(0, `rgba(255,255,255,${strength})`);
        gradient.addColorStop(1, 'rgba(255,255,255,0)');

        ctx.globalCompositeOperation = 'destination-out';
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
    }

    drawOcclusionShadows(ctx, scaleX, scaleY) {
        const blockers = this.game.world.getVisibleLightBlockers(this.game.cameraX, this.game.cameraY, this.game.canvas.width, this.game.canvas.height);
        const sourceX = (this.game.player.x + this.game.player.width / 2 - this.game.cameraX) * scaleX;
        const sourceY = (this.game.player.y + this.game.player.height / 2 - this.game.cameraY) * scaleY;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.32)';

        for (const blocker of blockers) {
            const bx = (blocker.x * this.tileSize - this.game.cameraX) * scaleX;
            const by = (blocker.y * this.tileSize - this.game.cameraY) * scaleY;
            const bw = this.tileSize * scaleX;
            const bh = this.tileSize * scaleY;

            const centerX = bx + bw / 2;
            const centerY = by + bh / 2;

            const dx = centerX - sourceX;
            const dy = centerY - sourceY;
            const mag = Math.max(1, Math.sqrt(dx * dx + dy * dy));
            const ux = dx / mag;
            const uy = dy / mag;

            const shadowLength = (this.lighting.quality === 'low' ? 40 : this.lighting.quality === 'high' ? 90 : 65) * scaleX;

            ctx.beginPath();
            ctx.rect(bx + ux * 2, by + uy * 2, bw, bh);
            ctx.fill();

            ctx.beginPath();
            ctx.moveTo(bx, by);
            ctx.lineTo(bx + bw, by);
            ctx.lineTo(bx + bw + ux * shadowLength, by + uy * shadowLength);
            ctx.lineTo(bx + ux * shadowLength, by + uy * shadowLength);
            ctx.closePath();
            ctx.fill();
        }
    }

    render() {
        if (!this.app) return;

        this.updateVisibleChunks();
        this.syncDynamicEntities();
        this.updateCamera();
        this.updateLighting();

        const dynamicCount = 2 + this.game.runtimeCounts.activeEnemies + this.game.runtimeCounts.activeCoins;
        this.metrics.drawCalls = 2 + dynamicCount + this.game.runtimeCounts.movingPlatforms + 1;

        this.app.render();
    }

    destroy() {
        if (this.app) {
            this.app.destroy(true, { children: true, texture: true, baseTexture: true });
        }
    }
}

class ChunkedTileWorld {
    constructor(tileSize, chunkSize) {
        this.tileSize = tileSize;
        this.chunkSize = chunkSize;
        this.chunks = new Map();
    }

    reset() {
        this.chunks.clear();
    }

    chunkKey(cx, cy) {
        return `${cx},${cy}`;
    }

    addTile(tile) {
        const cx = Math.floor(tile.x / this.chunkSize);
        const cy = Math.floor(tile.y / this.chunkSize);
        const key = this.chunkKey(cx, cy);
        if (!this.chunks.has(key)) {
            this.chunks.set(key, {
                cx,
                cy,
                tiles: [],
                lights: [],
                lightBlockers: []
            });
        }

        const chunk = this.chunks.get(key);
        chunk.tiles.push(tile);

        if (tile.emissive) {
            chunk.lights.push({ x: tile.x, y: tile.y, radius: tile.lightRadius || 90 });
        }

        if (tile.lightBlock) {
            chunk.lightBlockers.push({ x: tile.x, y: tile.y });
        }
    }

    addTiles(tiles) {
        for (const tile of tiles) {
            this.addTile(tile);
        }
    }

    getVisibleChunkKeys(cameraX, cameraY, viewportWidth, viewportHeight) {
        const minTileX = Math.floor(cameraX / this.tileSize);
        const minTileY = Math.floor(cameraY / this.tileSize);
        const maxTileX = Math.floor((cameraX + viewportWidth) / this.tileSize);
        const maxTileY = Math.floor((cameraY + viewportHeight) / this.tileSize);

        const minChunkX = Math.floor(minTileX / this.chunkSize) - 1;
        const minChunkY = Math.floor(minTileY / this.chunkSize) - 1;
        const maxChunkX = Math.floor(maxTileX / this.chunkSize) + 1;
        const maxChunkY = Math.floor(maxTileY / this.chunkSize) + 1;

        const keys = [];
        for (let cy = minChunkY; cy <= maxChunkY; cy++) {
            for (let cx = minChunkX; cx <= maxChunkX; cx++) {
                const key = this.chunkKey(cx, cy);
                if (this.chunks.has(key)) keys.push(key);
            }
        }
        return keys;
    }

    getVisibleLights(cameraX, cameraY, viewportWidth, viewportHeight) {
        const keys = this.getVisibleChunkKeys(cameraX, cameraY, viewportWidth, viewportHeight);
        const lights = [];
        for (const key of keys) {
            const chunk = this.chunks.get(key);
            if (chunk) lights.push(...chunk.lights);
        }
        return lights;
    }

    getVisibleLightBlockers(cameraX, cameraY, viewportWidth, viewportHeight) {
        const keys = this.getVisibleChunkKeys(cameraX, cameraY, viewportWidth, viewportHeight);
        const blockers = [];
        for (const key of keys) {
            const chunk = this.chunks.get(key);
            if (chunk) blockers.push(...chunk.lightBlockers);
        }
        return blockers;
    }
}

class PlatformerGame {
    constructor() {
        // Canvas & Camera
        this.canvas = document.getElementById('gridCanvas');
        this.cameraX = 0;
        this.cameraY = 0;

        // World Properties
        this.worldWidth = 3000;
        this.worldHeight = this.canvas.height;
        this.gravity = 0.6;
        this.groundLevel = this.canvas.height - 100;

        this.tileSize = 16;
        this.chunkSize = 32;
        this.world = new ChunkedTileWorld(this.tileSize, this.chunkSize);

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
            direction: 1,
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

        // Timing & Metrics
        this.lastFrameTime = Date.now();
        this.frameCount = 0;
        this.fps = 60;
        this.animationState = {
            elapsed: 0,
            frameIndex: 0,
            frameInterval: 140
        };
        this.performance = {
            drawCalls: 0,
            frameBuckets: {
                under16ms: 0,
                between16And33ms: 0,
                over33ms: 0
            },
            acceptanceTargets: {
                targetFPS: 60,
                minAcceptableFPS: 54,
                maxDrawCalls: 400
            }
        };
        this.lastDrawCallWarningAt = 0;
        this.runtimeCounts = {
            activeEnemies: 0,
            activeCoins: 0,
            movingPlatforms: 0
        };

        // API Configuration
        this.apiKey = this.loadAPIKey();
        this.apiProvider = this.loadAPIProvider();

        // Renderer Boundary
        this.renderer = new GPURenderer(this);

        // Initialize
        this.initializeLevel();
        this.initializeEventListeners();
        this.loadUIState();
        this.addLogEntry('system', '[SYSTEM] GPU tile renderer initialized.');

        this.bootstrapRenderer().then(() => {
            this.startGameLoop();
        }).catch((error) => {
            this.setStatus('error');
            this.addLogEntry('error', `[ERROR] ${error.message}`);
        });
    }

    async bootstrapRenderer() {
        await this.renderer.initialize();
    }

    /* ==================== LEVEL GENERATION ==================== */
    initializeLevel() {
        this.platforms = [];
        this.enemies = [];
        this.coins = [];
        this.coinsCollected = 0;

        this.platforms.push({ x: 0, y: this.groundLevel, width: this.worldWidth, height: 100, type: 'ground' });

        if (this.currentLevel === 1) {
            this.createLevel1();
        } else if (this.currentLevel === 2) {
            this.createLevel2();
        } else {
            this.createLevel1();
        }

        this.levelGoal = {
            x: this.worldWidth - 150,
            y: this.groundLevel - 50,
            width: 40,
            height: 50,
            collected: false
        };

        this.rebuildTileWorld();
        this.runtimeCounts.movingPlatforms = this.platforms.filter(p => p.type === 'moving').length;
        if (this.renderer?.app) {
            this.renderer.refreshMovingPlatformSprites();
        }
    }

    createLevel1() {
        this.platforms.push({ x: 50, y: this.groundLevel - 40, width: 200, height: 20, type: 'platform' });
        this.platforms.push({ x: 300, y: this.groundLevel - 80, width: 150, height: 20, type: 'platform' });
        this.platforms.push({ x: 500, y: this.groundLevel - 120, width: 150, height: 20, type: 'platform' });
        this.platforms.push({ x: 700, y: this.groundLevel - 80, width: 150, height: 20, type: 'platform' });
        this.platforms.push({ x: 950, y: this.groundLevel - 60, width: 200, height: 20, type: 'platform' });
        this.platforms.push({ x: 1250, y: this.groundLevel - 150, width: 150, height: 20, type: 'platform' });
        this.platforms.push({ x: 1500, y: this.groundLevel - 100, width: 100, height: 20, type: 'moving' });
        this.platforms.push({ x: 1700, y: this.groundLevel - 80, width: 150, height: 20, type: 'platform' });
        this.platforms.push({ x: 1950, y: this.groundLevel - 200, width: 30, height: 200, type: 'pole' });
        this.platforms.push({ x: 2100, y: this.groundLevel - 80, width: 150, height: 20, type: 'platform' });
        this.platforms.push({ x: 2350, y: this.groundLevel - 60, width: 200, height: 20, type: 'platform' });
        this.platforms.push({ x: 2700, y: this.groundLevel - 60, width: 200, height: 20, type: 'platform' });

        this.coins.push({ x: 350, y: this.groundLevel - 120, collected: false });
        this.coins.push({ x: 600, y: this.groundLevel - 160, collected: false });
        this.coins.push({ x: 850, y: this.groundLevel - 100, collected: false });
        this.coins.push({ x: 1100, y: this.groundLevel - 100, collected: false });
        this.coins.push({ x: 1350, y: this.groundLevel - 200, collected: false });
        this.coins.push({ x: 1800, y: this.groundLevel - 140, collected: false });
        this.coins.push({ x: 2150, y: this.groundLevel - 120, collected: false });
        this.coins.push({ x: 2450, y: this.groundLevel - 100, collected: false });

        this.enemies.push({ x: 1000, y: this.groundLevel - 40, width: 30, height: 30, velocityX: -2, defeated: false });
        this.enemies.push({ x: 2400, y: this.groundLevel - 40, width: 30, height: 30, velocityX: 2, defeated: false });
    }

    createLevel2() {
        this.platforms.push({ x: 50, y: this.groundLevel - 40, width: 200, height: 20, type: 'platform' });

        for (let i = 0; i < 5; i++) {
            this.platforms.push({
                x: 300 + (i * 180),
                y: this.groundLevel - 60 - (i % 2) * 40,
                width: 140,
                height: 20,
                type: 'platform'
            });
        }

        this.platforms.push({ x: 1350, y: this.groundLevel - 100, width: 150, height: 20, type: 'platform' });
        this.platforms.push({ x: 1650, y: this.groundLevel - 250, width: 30, height: 250, type: 'pole' });
        this.platforms.push({ x: 1850, y: this.groundLevel - 180, width: 150, height: 20, type: 'platform' });
        this.platforms.push({ x: 2150, y: this.groundLevel - 60, width: 300, height: 20, type: 'platform' });
        this.platforms.push({ x: 2550, y: this.groundLevel - 80, width: 150, height: 20, type: 'platform' });

        for (let i = 0; i < 12; i++) {
            this.coins.push({ x: 300 + (i * 150), y: this.groundLevel - 120, collected: false });
        }

        this.enemies.push({ x: 800, y: this.groundLevel - 40, width: 30, height: 30, velocityX: 2, defeated: false });
        this.enemies.push({ x: 1200, y: this.groundLevel - 40, width: 30, height: 30, velocityX: -2, defeated: false });
        this.enemies.push({ x: 2200, y: this.groundLevel - 40, width: 30, height: 30, velocityX: 2, defeated: false });
        this.enemies.push({ x: 2400, y: this.groundLevel - 40, width: 30, height: 30, velocityX: -2, defeated: false });
    }

    rebuildTileWorld() {
        this.world.reset();

        const tiles = [];
        for (const platform of this.platforms) {
            if (platform.type === 'moving') {
                continue;
            }
            const tileType = platform.type === 'ground' ? 'ground' : platform.type === 'pole' ? 'pole' : 'platform';
            const xStart = Math.floor(platform.x / this.tileSize);
            const yStart = Math.floor(platform.y / this.tileSize);
            const widthTiles = Math.max(1, Math.floor(platform.width / this.tileSize));
            const heightTiles = Math.max(1, Math.floor(platform.height / this.tileSize));

            for (let ty = 0; ty < heightTiles; ty++) {
                for (let tx = 0; tx < widthTiles; tx++) {
                    const tileX = xStart + tx;
                    const tileY = yStart + ty;
                    tiles.push({
                        x: tileX,
                        y: tileY,
                        layer: 'terrain',
                        type: tileType,
                        collision: true,
                        lightBlock: platform.type !== 'pole',
                        animated: false
                    });
                }
            }

            if (platform.type === 'pole') {
                for (let i = 0; i < heightTiles; i += 2) {
                    tiles.push({
                        x: xStart,
                        y: yStart + i,
                        layer: 'decor',
                        type: 'decor',
                        collision: false,
                        lightBlock: false,
                        animated: true,
                        emissive: true,
                        lightRadius: 70
                    });
                }
            }
        }

        for (const coin of this.coins) {
            tiles.push({
                x: Math.floor(coin.x / this.tileSize),
                y: Math.floor(coin.y / this.tileSize),
                layer: 'decor',
                type: 'decor',
                collision: false,
                lightBlock: false,
                animated: true,
                emissive: true,
                lightRadius: 95
            });
        }

        tiles.push({
            x: Math.floor(this.levelGoal.x / this.tileSize),
            y: Math.floor(this.levelGoal.y / this.tileSize),
            layer: 'decor',
            type: 'decor',
            collision: false,
            lightBlock: false,
            animated: true,
            emissive: true,
            lightRadius: 120
        });

        this.world.addTiles(tiles);
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
            nearbyPlatforms: nearbyPlatforms.map(p => ({ x: p.x, y: p.y, width: p.width, type: p.type })),
            nearbyEnemies: nearbyEnemies.map(e => ({ x: e.x, y: e.y, direction: e.velocityX > 0 ? 'right' : 'left' })),
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

            return this.parseDecision(response);
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
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) {
            this.addLogEntry('system', '[SYSTEM] Gemini response missing expected content; using fallback action.');
            return '{"thought":"fallback","action":"stand"}';
        }
        return text;
    }

    async callOpenAIAPI(prompt) {
        const url = 'https://api.openai.com/v1/chat/completions';
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + this.apiKey
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
        const content = data.choices?.[0]?.message?.content;
        if (!content) {
            this.addLogEntry('system', '[SYSTEM] OpenAI response missing expected content; using fallback action.');
            return '{"thought":"fallback","action":"stand"}';
        }
        return content;
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

        switch (action.action) {
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
        for (const platform of this.platforms) {
            if (
                platform.type === 'pole' &&
                this.player.x >= platform.x && this.player.x <= platform.x + platform.width &&
                this.player.y >= platform.y && this.player.y <= platform.y + platform.height
            ) {
                this.player.climbing = true;
                this.player.velocityY = -5;
                this.player.canJump = false;
                return;
            }
        }
    }

    update(deltaTime) {
        this.updatePhysics(deltaTime);
        this.updateCamera();
        this.updateAnimationState(deltaTime);
        this.updatePerformanceBuckets(deltaTime);
    }

    updatePhysics(deltaTime) {
        let activeEnemies = 0;
        let activeCoins = 0;
        let movingPlatforms = 0;

        if (!this.player.climbing) {
            this.player.velocityY += this.gravity;
        } else {
            this.player.velocityY = 0;
        }

        this.player.x += this.player.velocityX;
        this.player.y += this.player.velocityY;

        this.player.canJump = false;
        this.player.onPlatform = null;

        for (const platform of this.platforms) {
            if (
                this.player.velocityY >= 0 &&
                this.player.y + this.player.height >= platform.y &&
                this.player.y + this.player.height <= platform.y + 20 &&
                this.player.x + this.player.width > platform.x &&
                this.player.x < platform.x + platform.width
            ) {
                this.player.y = platform.y - this.player.height;
                this.player.velocityY = 0;
                this.player.canJump = true;
                this.player.onPlatform = platform;
                this.player.climbing = false;
            }
        }

        for (const enemy of this.enemies) {
            if (!enemy.defeated) {
                const dx = this.player.x - enemy.x;
                const dy = this.player.y - enemy.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < 40) {
                    if (this.player.velocityY > 0 && this.player.y < enemy.y) {
                        enemy.defeated = true;
                        this.player.velocityY = -10;
                        this.addLogEntry('action', '🦗 Enemy defeated!');
                    } else if (this.player.y < 100) {
                        this.player.velocityX = -this.player.velocityX;
                    }
                }
            }
        }

        for (const coin of this.coins) {
            if (!coin.collected) {
                activeCoins++;
                const dx = this.player.x - coin.x;
                const dy = this.player.y - coin.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < 30) {
                    coin.collected = true;
                    this.coinsCollected++;
                    this.addLogEntry('action', '🪙 Coin collected!');
                    activeCoins--;
                }
            }
        }

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

        for (const platform of this.platforms) {
            if (platform.type === 'moving') {
                movingPlatforms++;
                platform.x += 2;
                if (platform.x > this.worldWidth) platform.x = -platform.width;
            }
        }

        for (const enemy of this.enemies) {
            if (!enemy.defeated) {
                activeEnemies++;
                enemy.x += enemy.velocityX;
                if (enemy.x < 0 || enemy.x > this.worldWidth) {
                    enemy.velocityX *= -1;
                }
            }
        }

        this.runtimeCounts.activeEnemies = activeEnemies;
        this.runtimeCounts.activeCoins = activeCoins;
        this.runtimeCounts.movingPlatforms = movingPlatforms;

        this.player.velocityX *= 0.9;

        if (this.player.x < 0) this.player.x = 0;
        if (this.player.x > this.worldWidth) this.player.x = this.worldWidth;
        if (this.player.y > this.worldHeight) this.resetLevel();

        this.updateStats();
    }

    updateCamera() {
        this.cameraX = Math.max(0, Math.min(this.player.x - 200, this.worldWidth - this.canvas.width));
    }

    updateAnimationState(deltaTime) {
        this.animationState.elapsed += deltaTime;
        if (this.animationState.elapsed >= this.animationState.frameInterval) {
            this.animationState.elapsed = 0;
            this.animationState.frameIndex = (this.animationState.frameIndex + 1) % 3;
        }
    }

    updatePerformanceBuckets(deltaTime) {
        if (deltaTime < 16) {
            this.performance.frameBuckets.under16ms++;
        } else if (deltaTime <= 33) {
            this.performance.frameBuckets.between16And33ms++;
        } else {
            this.performance.frameBuckets.over33ms++;
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
        this.player.climbing = false;
        this.addLogEntry('error', '❌ Fell off the level!');
        this.initializeLevel();
    }

    /* ==================== UI STATE MANAGEMENT ==================== */
    updateStats() {
        document.getElementById('stepCounter').textContent = this.stepCount;
        document.getElementById('positionDisplay').textContent = `${Math.floor(this.player.x)}, ${Math.floor(this.player.y)}`;
        document.getElementById('statusDisplay').textContent = this.statusState.toUpperCase();

        const distance = Math.abs(this.player.x - this.levelGoal.x);
        document.getElementById('distanceDisplay').textContent = Math.floor(distance);
    }

    setStatus(status) {
        this.statusState = status;
        const indicator = document.getElementById('statusIndicator');
        indicator.className = `status-indicator ${status}`;
        this.updateStats();
    }

    addLogEntry(type, message) {
        const terminal = document.getElementById('logTerminal');
        const entry = document.createElement('div');
        entry.className = `log-entry ${type}`;
        entry.textContent = message;

        terminal.appendChild(entry);
        terminal.scrollTop = terminal.scrollHeight;

        while (terminal.children.length > 50) {
            terminal.removeChild(terminal.firstChild);
        }
    }

    loadUIState() {
        document.getElementById('apiKey').value = this.apiKey;
        document.getElementById('apiProvider').value = this.apiProvider;
        this.updateStats();
        this.setStatus('idle');
    }

    saveAPIKey() {
        this.apiKey = document.getElementById('apiKey').value.trim();
        this.addLogEntry('system', '[SYSTEM] API key updated for current session.');
    }

    loadAPIKey() {
        return '';
    }

    saveAPIProvider() {
        this.apiProvider = document.getElementById('apiProvider').value;
        localStorage.setItem('aiSimProvider', this.apiProvider);
    }

    loadAPIProvider() {
        return localStorage.getItem('aiSimProvider') || 'local';
    }

    /* ==================== EVENT LISTENERS ==================== */
    initializeEventListeners() {
        document.getElementById('apiKey').addEventListener('change', () => this.saveAPIKey());
        document.getElementById('apiProvider').addEventListener('change', () => this.saveAPIProvider());

        document.getElementById('targetTile').addEventListener('change', (e) => {
            const level = e.target.value === 'energy' ? 1 : 2;
            this.currentLevel = level;
            const name = level === 1 ? 'Level 1' : 'Level 2';
            document.getElementById('goalDisplay').textContent = `Goal: Complete ${name}`;
            this.initializeLevel();
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
    startGameLoop() {
        let lastTime = Date.now();

        const animate = () => {
            const now = Date.now();
            const deltaTime = now - lastTime;
            lastTime = now;

            this.update(deltaTime);
            this.renderer.render();
            this.updateFPS(deltaTime);

            requestAnimationFrame(animate);
        };

        requestAnimationFrame(animate);
    }

    updateFPS(deltaTime) {
        this.frameCount++;
        if (Date.now() - this.lastFrameTime > 1000) {
            this.fps = this.frameCount;
            document.getElementById('fpsValue').textContent = this.fps;
            this.performance.drawCalls = this.renderer.metrics.drawCalls;

            if (this.fps < this.performance.acceptanceTargets.minAcceptableFPS) {
                this.addLogEntry('system', `[SYSTEM] Perf warning: FPS ${this.fps} below target ${this.performance.acceptanceTargets.minAcceptableFPS}`);
            }

            this.frameCount = 0;
            this.lastFrameTime = Date.now();
        }

        if (deltaTime > 0 && this.performance.drawCalls > this.performance.acceptanceTargets.maxDrawCalls && Date.now() - this.lastDrawCallWarningAt > 1000) {
            this.lastDrawCallWarningAt = Date.now();
            this.addLogEntry('system', `[SYSTEM] Draw call warning: ${this.performance.drawCalls}`);
        }
    }
}

/* ==================== INITIALIZATION ==================== */
document.addEventListener('DOMContentLoaded', () => {
    window.game = new PlatformerGame();
    console.log('🎮 GPU tile platformer initialized');
});
