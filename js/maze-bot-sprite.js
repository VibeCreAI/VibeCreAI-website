/**
 * Maze Bot Sprite Animation System
 * Handles animated sprite rendering for maze background bots
 */

class MazeBotSprite {
    constructor() {
        // Sprite configuration
        this.spriteSheets = {
            up: null,
            down: null,
            left: null,
            right: null
        };
        this.cols = 3;
        this.rows = 4;
        this.totalFrames = this.cols * this.rows; // 12 frames
        this.frameWidth = 0;  // Will be set after image loads
        this.frameHeight = 0; // Will be set after image loads

        // Bot color definitions (matching original maze colors)
        this.botColors = {
            solid1: { name: 'red', hex: '#ff6b6b' },
            solid2: { name: 'teal', hex: '#4ecdc4' },
            solid3: { name: 'blue', hex: '#45b7d1' },
            solid4: { name: 'yellow', hex: '#ffeaa7' }
        };

        // Loading state
        this.loaded = false;
        this.loadPromises = [];

        // Initialize
        this.loadSpriteSheets();
    }

    loadSpriteSheets() {
        const directions = ['up', 'down', 'left', 'right', 'idle'];

        directions.forEach(direction => {
            const img = new Image();
            // Note: Don't set crossOrigin for local files (causes CORS errors on file://)
            const loadPromise = new Promise((resolve, reject) => {
                img.onload = () => {
                    // Calculate frame dimensions from first loaded image
                    if (this.frameWidth === 0) {
                        this.frameWidth = img.width / this.cols;
                        this.frameHeight = img.height / this.rows;
                    }
                    resolve();
                };
                img.onerror = () => {
                    console.error(`Failed to load sprite: ${direction}`);
                    reject();
                };
            });

            // Handle IDLE sprite with different naming convention
            if (direction === 'idle') {
                img.src = `images/AI BOT-IDLE.png`;
            } else {
                img.src = `images/AI BOT-${direction.toUpperCase()}.png`;
            }
            this.spriteSheets[direction] = img;
            this.loadPromises.push(loadPromise);
        });

        // Wait for all sprites to load
        Promise.all(this.loadPromises).then(() => {
            this.loaded = true;
        }).catch((err) => {
            console.error('❌ Failed to load maze bot sprites', err);
        });
    }

    /**
     * Get color filter for applying bot color to white sprite
     */
    getColorFilter(colorKey) {
        const color = this.botColors[colorKey];
        if (!color) return '';

        // Convert hex to RGB for filter generation
        const hex = color.hex;
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);

        // Specific filter values for each color to match original exactly
        switch(colorKey) {
            case 'solid1': // Red #ff6b6b
                return 'brightness(0) saturate(100%) invert(62%) sepia(89%) saturate(2799%) hue-rotate(324deg) brightness(102%) contrast(101%)';
            case 'solid2': // Teal #4ecdc4
                return 'brightness(0) saturate(100%) invert(75%) sepia(14%) saturate(2487%) hue-rotate(131deg) brightness(92%) contrast(87%)';
            case 'solid3': // Blue #45b7d1
                return 'brightness(0) saturate(100%) invert(66%) sepia(51%) saturate(674%) hue-rotate(152deg) brightness(92%) contrast(86%)';
            case 'solid4': // Yellow #ffeaa7
                return 'brightness(0) saturate(100%) invert(93%) sepia(18%) saturate(1008%) hue-rotate(316deg) brightness(104%) contrast(101%)';
            default:
                return '';
        }
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

        const spriteSheet = this.spriteSheets[direction];
        const frame = frameIndex % this.totalFrames;

        // Calculate source position in sprite sheet
        const col = frame % this.cols;
        const row = Math.floor(frame / this.cols);
        const sx = col * this.frameWidth;
        const sy = row * this.frameHeight;

        // Save context state
        ctx.save();

        // Apply color filter
        const filter = this.getColorFilter(colorKey);
        if (filter) {
            ctx.filter = filter;
        }

        // Draw the sprite frame
        ctx.drawImage(
            spriteSheet,
            sx, sy,                          // Source position
            this.frameWidth, this.frameHeight, // Source size
            x, y,                            // Destination position
            size, size                       // Destination size
        );

        // Restore context state
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