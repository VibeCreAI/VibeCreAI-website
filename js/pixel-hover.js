/**
 * Pixel Hover Effect JavaScript
 * Creates random pixel fill animation inspired by the pixel maze system
 */

// Global variables for pixel hover system
let pixelHoverElements = new Map();

// Pixel hover class
class PixelHover {
    constructor(element) {
        this.element = element;
        this.svg = null;
        this.pixels = [];
        this.animationId = null;
        this.isAnimating = false;
        this.pixelSize = 36; // Size of each pixel (4x bigger: 12 * 4 = 48)
        this.cols = 0;
        this.rows = 0;

        this.init();
    }

    init() {
        // Create SVG container
        this.createSVG();

        // Use RAF to avoid forced reflow - batch layout reads after DOM changes
        requestAnimationFrame(() => {
            this.calculateGrid();
            this.buildPixelGrid();
            this.setupEventListeners();
        });
    }

    createSVG() {
        this.svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        this.svg.classList.add('pixel-svg');
        this.svg.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 0;
        `;

        this.element.appendChild(this.svg);
    }

    calculateGrid() {
        const rect = this.element.getBoundingClientRect();
        this.cols = Math.ceil(rect.width / this.pixelSize);
        this.rows = Math.ceil(rect.height / this.pixelSize);
    }

    buildPixelGrid() {
        if (!this.svg) return;

        // Clear existing pixels
        this.svg.innerHTML = '';
        this.pixels = [];

        // Create pixel grid
        for (let col = 0; col < this.cols; col++) {
            for (let row = 0; row < this.rows; row++) {
                const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
                rect.setAttribute("x", col * this.pixelSize);
                rect.setAttribute("y", row * this.pixelSize);
                rect.setAttribute("width", this.pixelSize); // No gaps for solid fill
                rect.setAttribute("height", this.pixelSize);
                rect.classList.add('pixel-rect');
                rect.dataset.col = col;
                rect.dataset.row = row;

                this.svg.appendChild(rect);
                this.pixels.push({
                    element: rect,
                    col: col,
                    row: row,
                    active: false
                });
            }
        }
    }

    setupEventListeners() {
        this.element.addEventListener('mouseenter', () => {
            this.startPixelFill();
        });

        this.element.addEventListener('mouseleave', () => {
            this.stopPixelFill();
        });
    }

    startPixelFill() {
        if (this.isAnimating) return;

        this.isAnimating = true;
        this.resetPixels();

        // Start random pixel animation
        this.animatePixels();
    }

    stopPixelFill() {
        this.isAnimating = false;
        if (this.animationId) {
            clearTimeout(this.animationId);
        }

        // Fade out all pixels
        setTimeout(() => {
            if (!this.isAnimating) {
                this.resetPixels();
            }
        }, 200);
    }

    resetPixels() {
        this.pixels.forEach(pixel => {
            pixel.element.classList.remove('active');
            pixel.active = false;
        });
    }

    animatePixels() {
        if (!this.isAnimating) return;

        const totalPixels = this.pixels.length;
        const animationSteps = 8; // 8 steps like your demo
        const stepDuration = 100; // 100ms per step
        let currentStep = 0;

        const activateRandomPixels = () => {
            if (!this.isAnimating || currentStep >= animationSteps) {
                // Final step: fill any remaining gaps
                if (this.isAnimating && currentStep >= animationSteps) {
                    this.fillRemainingPixels();
                }
                return;
            }

            // Calculate how many pixels to activate in this step
            const pixelsPerStep = Math.ceil(totalPixels / animationSteps);
            const inactivePixels = this.pixels.filter(p => !p.active);

            // Activate random pixels from the inactive ones
            const pixelsToActivate = Math.min(pixelsPerStep, inactivePixels.length);

            for (let i = 0; i < pixelsToActivate; i++) {
                if (inactivePixels.length === 0) break;

                const randomIndex = Math.floor(Math.random() * inactivePixels.length);
                const pixel = inactivePixels[randomIndex];

                pixel.element.classList.add('active');
                pixel.active = true;

                // Remove from inactive array
                inactivePixels.splice(randomIndex, 1);
            }

            currentStep++;

            // Schedule next step
            this.animationId = setTimeout(activateRandomPixels, stepDuration);
        };

        // Start the animation
        activateRandomPixels();
    }

    fillRemainingPixels() {
        // Ensure complete coverage by activating any remaining pixels
        const inactivePixels = this.pixels.filter(p => !p.active);

        inactivePixels.forEach((pixel, index) => {
            setTimeout(() => {
                if (this.isAnimating) {
                    pixel.element.classList.add('active');
                    pixel.active = true;
                }
            }, index * 10); // 10ms delay between each pixel
        });
    }

    destroy() {
        this.isAnimating = false;
        if (this.animationId) {
            clearTimeout(this.animationId);
        }
        if (this.svg) {
            this.svg.remove();
        }
    }
}

// Initialize pixel hover effect
function initPixelHoverEffect() {
    const elements = document.querySelectorAll('.pixel-hover-enabled');

    elements.forEach(element => {
        if (!pixelHoverElements.has(element)) {
            const pixelHover = new PixelHover(element);
            pixelHoverElements.set(element, pixelHover);
        }
    });
}

// Cleanup function
function cleanupPixelHoverEffect() {
    pixelHoverElements.forEach((pixelHover, element) => {
        pixelHover.destroy();
    });
    pixelHoverElements.clear();
}

// Handle resize
function handlePixelHoverResize() {
    // Use RAF to batch layout reads and avoid forced reflow during resize
    requestAnimationFrame(() => {
        pixelHoverElements.forEach((pixelHover, element) => {
            pixelHover.calculateGrid();
            pixelHover.buildPixelGrid();
        });
    });
}

// Initialize when DOM is ready
function startPixelHover() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initPixelHoverEffect);
    } else {
        initPixelHoverEffect();
    }

    // Setup resize handler
    window.addEventListener('resize', handlePixelHoverResize);
}

// Auto-start
startPixelHover();

// Global access
window.pixelHover = {
    init: initPixelHoverEffect,
    cleanup: cleanupPixelHoverEffect,
    elements: pixelHoverElements
};