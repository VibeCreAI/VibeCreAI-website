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
        this.supportsCanvasFilter = this.detectCanvasFilterSupport();
        this.themeSpriteCache = new Map();
        this.coloredSpriteSheet = null;
        this.themeSpritePaths = {
            default: 'images/AI_bot_default.png',
            matrix: 'images/AI_bot_matrix.png',
            synthwave: 'images/AI_bot_synthwave.png',
            ghost: 'images/AI_bot_ghost.png'
        };
        this.currentThemeKey = 'default';

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
        // Load default themed sprite as baseline asset
        this.spriteSheet.src = this.themeSpritePaths.default;
    }

    applyThemeColor() {
        if (!this.isLoaded || !this.spriteSheet) return;

        const themeInfo = this.getThemeInfo();
        this.currentThemeKey = themeInfo.key;

        if (this.canvas) {
            this.canvas.style.filter = 'none';
        }

        const themedAsset = this.ensureThemeSprite(themeInfo.key);

        if (
            themedAsset &&
            themedAsset.complete &&
            themedAsset.naturalWidth > 0
        ) {
            if (this.coloredSpriteSheet !== themedAsset) {
                this.coloredSpriteSheet = themedAsset;
                this.drawCurrentFrame();
            }
            return;
        }

        // Fallback logic when a dedicated themed asset isn't available yet
        if (this.supportsCanvasFilter) {
            const filter = this.getColorFilter(themeInfo.key);
            if (this.canvas) {
                this.canvas.style.filter = filter;
            }
            this.coloredSpriteSheet = this.spriteSheet;
            this.drawCurrentFrame();
            return;
        }

        // No compatible fallback available; wait until the themed asset finishes loading
    }

    getThemeInfo() {
        const body = document.body;
        const root = document.documentElement;
        const fallback = this.normalizeColor(getComputedStyle(root).getPropertyValue('--primary-color') || '#00ffff');

        if (body.classList.contains('theme-matrix')) {
            return { key: 'matrix', hex: this.normalizeColor('#00ff41') };
        }

        if (body.classList.contains('theme-synthwave')) {
            return { key: 'synthwave', hex: this.normalizeColor('#ff6b9d') };
        }

        if (body.classList.contains('theme-ghost')) {
            return { key: 'ghost', hex: this.normalizeColor('#ffffff') };
        }

        return { key: 'default', hex: fallback };
    }

    ensureThemeSprite(themeKey) {
        const cacheKey = `asset-${themeKey}`;
        const path = this.themeSpritePaths[themeKey] || this.themeSpritePaths.default;

        if (!path) {
            return null;
        }

        let entry = this.themeSpriteCache.get(cacheKey);
        if (entry && entry.error) {
            return null;
        }

        if (entry && entry.loaded && entry.image.complete) {
            return entry.image;
        }

        if (!entry) {
            const image = new Image();
            entry = { image, loaded: false, error: false };
            this.themeSpriteCache.set(cacheKey, entry);

            image.onload = () => {
                entry.loaded = true;
                if (this.currentThemeKey === themeKey) {
                    this.coloredSpriteSheet = image;
                    this.drawCurrentFrame();
                }
            };

            image.onerror = () => {
                entry.error = true;
            };

            // Bust cache so the browser refetches updated assets
            image.src = `${path}?v=${Date.now()}`;
        }

        return (entry.loaded && entry.image.complete) ? entry.image : null;
    }

    getColorFilter(themeKey) {
        switch (themeKey) {
            case 'matrix':
                return 'brightness(0) saturate(100%) invert(50%) sepia(96%) saturate(2089%) hue-rotate(88deg) brightness(118%) contrast(119%)';
            case 'synthwave':
                return 'brightness(0) saturate(100%) invert(13%) sepia(79%) saturate(7439%) hue-rotate(295deg) brightness(104%) contrast(105%)';
            case 'ghost':
                return 'brightness(1.2) saturate(0.8)';
            case 'default':
            default:
                return 'brightness(0) saturate(100%) invert(89%) sepia(100%) saturate(3533%) hue-rotate(140deg) brightness(104%) contrast(105%)';
        }
    }

    normalizeColor(colorValue) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            return '#00ffff';
        }

        try {
            ctx.fillStyle = colorValue;
            return ctx.fillStyle;
        } catch (error) {
            return '#00ffff';
        }
    }

    detectCanvasFilterSupport() {
        return false;
    }

    getTintedThemeSprite(themeKey, colorHex) {
        const cacheKey = `tinted-${themeKey}`;
        const existing = this.themeSpriteCache.get(cacheKey);
        if (existing && existing.loaded && existing.image.complete) {
            return existing.image;
        }

        if (!this.spriteSheet || !this.spriteSheet.complete) {
            return this.spriteSheet;
        }

        const canvas = document.createElement('canvas');
        canvas.width = this.spriteSheet.width;
        canvas.height = this.spriteSheet.height;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(this.spriteSheet, 0, 0);
        ctx.globalCompositeOperation = 'source-in';
        ctx.fillStyle = colorHex;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.globalCompositeOperation = 'source-over';

        const tintedImage = new Image();
        const entry = { image: tintedImage, loaded: false, error: false };
        this.themeSpriteCache.set(cacheKey, entry);

        tintedImage.onload = () => {
            entry.loaded = true;
            if (this.coloredSpriteSheet === tintedImage) {
                this.drawCurrentFrame();
            }
        };
        tintedImage.onerror = () => {
            entry.error = true;
        };
        tintedImage.src = canvas.toDataURL('image/png');

        return tintedImage;
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
        const spriteSource = this.coloredSpriteSheet || this.spriteSheet;
        if (!this.ctx || !spriteSource || !this.isLoaded) return;

        if (spriteSource instanceof HTMLImageElement && !spriteSource.complete) {
            return;
        }

        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Calculate frame position in sprite sheet
        const col = this.currentFrame % this.framesPerRow;
        const row = Math.floor(this.currentFrame / this.framesPerRow);

        // Draw the frame using original sprite sheet
        this.ctx.drawImage(
            spriteSource,
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
