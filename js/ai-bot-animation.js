class AIBotAnimation {
    constructor() {
        this.spriteSheet = null;
        this.canvas = null;
        this.ctx = null;
        this.currentFrame = 0;
        this.totalFrames = 100; // 10 columns × 10 rows (100 frames total)
        this.framesPerRow = 10;
        this.frameWidth = 320; // 3200px ÷ 10 columns = 320px per frame
        this.frameHeight = 320; // 3200px ÷ 10 rows = 320px per frame
        this.displaySize = 120; // Size to display on screen (updated to match CSS)
        this.animationSpeed = 80; // ms per frame (faster animation)
        this.isLoaded = false;
        this.animationFrame = null;
        this.lastFrameTime = 0;
        this.container = null;

        this.init();
    }

    init() {
        this.createContainer();
        this.loadSpriteSheet();
        this.setupCanvas();
        this.bindThemeEvents();
    }

    createContainer() {
        this.container = document.createElement('div');
        this.container.className = 'ai-bot-container';
        this.container.style.cssText = `
            opacity: 0;
            transition: opacity 0.5s ease-in-out;
        `;
    }

    setupCanvas() {
        this.canvas = document.createElement('canvas');
        this.canvas.width = this.displaySize;
        this.canvas.height = this.displaySize;
        this.canvas.style.cssText = `
            width: 100%;
            height: 100%;
            image-rendering: pixelated;
        `;

        this.ctx = this.canvas.getContext('2d');
        this.ctx.imageSmoothingEnabled = false;

        this.container.appendChild(this.canvas);
    }

    loadSpriteSheet() {
        this.spriteSheet = new Image();
        this.spriteSheet.onload = () => {
            this.isLoaded = true;
            this.applyThemeColor();
            this.startAnimation();
            this.showBot();
        };
        // No crossOrigin needed since we're using CSS filters instead of pixel manipulation
        this.spriteSheet.src = 'images/AI_bot_white.png';
    }

    applyThemeColor() {
        if (!this.isLoaded || !this.spriteSheet) return;

        // Get current theme color and apply CSS filter instead of pixel manipulation
        const themeColor = this.getCurrentThemeColor();
        const filter = this.getColorFilter(themeColor);

        // Apply color filter to canvas (no glow by default)
        if (this.canvas) {
            this.canvas.style.filter = filter;
        }

        // Use original sprite sheet directly
        this.coloredSpriteSheet = this.spriteSheet;
        this.drawCurrentFrame();
    }

    getColorFilter(themeColor) {
        // Get the current theme from the body classes to determine exact color
        const body = document.body;

        if (body.classList.contains('theme-matrix')) {
            // Matrix theme - bright green #00ff41
            return 'brightness(0) saturate(100%) invert(50%) sepia(96%) saturate(2089%) hue-rotate(88deg) brightness(118%) contrast(119%)';
        } else if (body.classList.contains('theme-synthwave')) {
            // Synthwave theme - pink #ff6b9d
            return 'brightness(0) saturate(100%) invert(13%) sepia(79%) saturate(7439%) hue-rotate(295deg) brightness(104%) contrast(105%)';
        } else if (body.classList.contains('theme-ghost')) {
            // Ghost theme - keep white/light blue
            return 'brightness(1.2) saturate(0.8)';
        } else {
            // Default theme - exact same cyan as main logo AI text #00ffff
            return 'brightness(0) saturate(100%) invert(89%) sepia(100%) saturate(3533%) hue-rotate(140deg) brightness(104%) contrast(105%)';
        }
    }

    getCurrentThemeColor() {
        const root = document.documentElement;
        const computedStyle = getComputedStyle(root);
        return computedStyle.getPropertyValue('--primary-color').trim() || '#00FFFF';
    }

    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 0, g: 255, b: 255 }; // Default cyan
    }

    rgbToHsl(r, g, b) {
        r /= 255;
        g /= 255;
        b /= 255;
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;

        if (max === min) {
            h = s = 0; // achromatic
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }
        return [h * 360, s, l];
    }

    startAnimation() {
        if (!this.isLoaded) return;

        const animate = (currentTime) => {
            if (currentTime - this.lastFrameTime >= this.animationSpeed) {
                this.currentFrame = (this.currentFrame + 1) % this.totalFrames;
                this.drawCurrentFrame();
                this.lastFrameTime = currentTime;
            }
            this.animationFrame = requestAnimationFrame(animate);
        };

        this.animationFrame = requestAnimationFrame(animate);
    }

    drawCurrentFrame() {
        if (!this.ctx || !this.spriteSheet || !this.isLoaded) return;

        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Calculate frame position in sprite sheet
        const col = this.currentFrame % this.framesPerRow;
        const row = Math.floor(this.currentFrame / this.framesPerRow);

        // Draw the frame using original sprite sheet
        this.ctx.drawImage(
            this.spriteSheet,
            col * this.frameWidth,
            row * this.frameHeight,
            this.frameWidth,
            this.frameHeight,
            0,
            0,
            this.canvas.width,
            this.canvas.height
        );
    }

    showBot() {
        if (this.container) {
            this.container.style.opacity = '1';
        }
    }

    hideBot() {
        if (this.container) {
            this.container.style.opacity = '0';
        }
    }

    bindThemeEvents() {
        // Listen for theme changes
        document.addEventListener('themeChanged', () => {
            this.applyThemeColor();
        });

        // Also listen for manual theme attribute changes
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
                    setTimeout(() => this.applyThemeColor(), 100); // Small delay for CSS to update
                }
            });
        });

        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['data-theme']
        });
    }

    attachToHero() {
        const heroTitle = document.querySelector('.hero-title');
        if (heroTitle && this.container) {
            heroTitle.style.position = 'relative';
            heroTitle.appendChild(this.container);
        }
    }

    destroy() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }
}

// Initialize the AI bot animation after main logo animation completes
document.addEventListener('DOMContentLoaded', () => {
    // Wait for main logo shuffle animation to complete
    // Logo has 9 characters with 100ms stagger + animation duration = ~1500ms total
    setTimeout(() => {
        window.aiBotAnimation = new AIBotAnimation();
        window.aiBotAnimation.attachToHero();
    }, 1800); // Start after logo animation is definitely finished
});

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AIBotAnimation;
}