/**
 * Maze Bot Sprite Animation System
 * Handles animated sprite rendering for maze background bots
 */

class MazeBotSprite {
    constructor() {
        // Sprite configuration
        this.directions = ['up', 'down', 'left', 'right', 'idle'];
        this.spriteSheets = {};
        this.coloredSpriteSheets = {};
        this.cols = 3;
        this.rows = 4;
        this.totalFrames = this.cols * this.rows; // 12 frames
        this.frameWidth = 0;  // Will be set after image loads
        this.frameHeight = 0; // Will be set after image loads

        // Bot color definitions (matching original maze colors)
        this.botColors = {
            solid1: { name: 'red', hex: '#ff6b6b' },
            solid2: { name: 'teal', hex: '#4ecdc4' },
            solid3: { name: 'purple', hex: '#a29bfe' },
            solid4: { name: 'yellow', hex: '#ffeaa7' }
        };

        this.colorFileMap = {
            solid1: 'RED',
            solid2: 'TEAL',
            solid3: 'PURPLE',
            solid4: 'YELLOW'
        };

        // Loading state
        this.loaded = false;
        this.loadPromises = [];

        // Initialize
        this.loadSpriteSheets();
    }

    loadSpriteSheets() {
        this.directions.forEach(direction => {
            const img = new Image();
            const loadPromise = new Promise((resolve) => {
                img.onload = () => {
                    if (this.frameWidth === 0) {
                        this.frameWidth = img.width / this.cols;
                        this.frameHeight = img.height / this.rows;
                    }
                    resolve();
                };
                img.onerror = () => {
                    console.error(`Failed to load sprite: ${direction}`);
                    resolve();
                };
            });

            const defaultSuffix = this.colorFileMap.solid1; // Use red as baseline sheet
            const directionKey = direction.toUpperCase();
            img.src = direction === 'idle'
                ? `images/AI BOT-IDLE-${defaultSuffix}.png`
                : `images/AI BOT-${directionKey}-${defaultSuffix}.png`;

            this.spriteSheets[direction] = img;
            this.loadPromises.push(loadPromise);

            this.coloredSpriteSheets[direction] = {};

            Object.keys(this.botColors).forEach(colorKey => {
                const colorImg = new Image();
                colorImg.onload = () => {
                    this.coloredSpriteSheets[direction][colorKey] = colorImg;
                };
                colorImg.onerror = () => {
                    console.warn(`Optional colored sprite missing: ${direction}-${colorKey}`);
                };
                const suffix = this.colorFileMap[colorKey];
                if (!suffix) {
                    return;
                }
                colorImg.src = direction === 'idle'
                    ? `images/AI BOT-IDLE-${suffix}.png`
                    : `images/AI BOT-${directionKey}-${suffix}.png`;
            });
        });

        Promise.all(this.loadPromises).then(() => {
            this.loaded = true;
        }).catch((err) => {
            console.error('❌ Failed to load maze bot sprites', err);
        });
    }

    /**
     * Draw a bot sprite at the given position
     * @param {CanvasRenderingContext2D} ctx - Canvas context to draw on
     * @param {number} x - X position in pixels
     * @param {number} y - Y position in pixels
     * @param {number} size - Size to render (width/height in pixels)
     * @param {string} direction - Direction bot is facing (up/down/left/right)
     * @param {number} frameIndex - Current animation frame (0-11)
     * @param {string} colorKey - Color identifier (solid1-4)
     */
    drawBot(ctx, x, y, size, direction, frameIndex, colorKey) {
        if (!this.loaded || !this.spriteSheets[direction]) return;

        const coloredSheet = this.coloredSpriteSheets[direction] && this.coloredSpriteSheets[direction][colorKey];
        const spriteSheet = (coloredSheet && coloredSheet.complete) ? coloredSheet : this.spriteSheets[direction];

        if (!spriteSheet || (spriteSheet instanceof HTMLImageElement && !spriteSheet.complete)) {
            return;
        }
        const frame = frameIndex % this.totalFrames;

        // Calculate source position in sprite sheet
        const col = frame % this.cols;
        const row = Math.floor(frame / this.cols);
        const sx = col * this.frameWidth;
        const sy = row * this.frameHeight;

        // Save context state
        ctx.save();

        ctx.drawImage(
            spriteSheet,
            sx, sy,
            this.frameWidth, this.frameHeight,
            x, y,
            size, size
        );

        ctx.restore();
    }

    /**
     * Create a standalone canvas element with the bot sprite
     * Useful for testing or alternative rendering approaches
     */
    createBotCanvas(size, direction, frameIndex, colorKey) {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;

        this.drawBot(ctx, 0, 0, size, direction, frameIndex, colorKey);
        return canvas;
    }
}

// Global instance for maze background system
window.mazeBotSprite = new MazeBotSprite();
