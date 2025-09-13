/**
 * SVG-Based Pixel Maze Background System
 * Adapted from Speckyboy creative snippets
 * Optimized for VibeCreAI website with theme integration
 */

// Global variables
let svg, g;
let WIDTH, COLS, ROWS, TOTAL, CENTERX, CENTERY;
let mazeActive = false;

// Initialize maze system
function initPixelMaze() {
    cleanup();
    createSVGContainer();
    setWindowValues();
    buildGrid();
    
    // Start maze generation
    setTimeout(() => {
        maze();
    }, 500);
}

// Set responsive window values
function setWindowValues() {
    const minFactor = Math.min(window.innerWidth, window.innerHeight);
    // Optimized cell sizes for performance
    WIDTH = minFactor > 1200 ? 60 : minFactor > 950 ? 50 : minFactor > 750 ? 40 : 35;
    COLS = Math.floor(window.innerWidth / WIDTH);
    ROWS = Math.floor(window.innerHeight / WIDTH);
    TOTAL = (COLS + 1) * (ROWS + 1);
    CENTERX = Math.floor(COLS / 2);
    CENTERY = Math.floor(ROWS / 2);
}

// Create SVG container
function createSVGContainer() {
    svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.id = 'mazeGrid';
    svg.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        z-index: -1;
        overflow: hidden;
        background: var(--dark-bg, #0a0a0a);
    `;
    
    g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    svg.appendChild(g);
    document.body.appendChild(svg);
}

// Build SVG grid
function buildGrid() {
    if (!g) return;
    
    g.innerHTML = '';
    const gutter = 1;
    
    for (let col = 0; col <= COLS; col++) {
        for (let row = 0; row <= ROWS; row++) {
            const x = WIDTH * col;
            const y = WIDTH * row;
            drawSquare(row, col, x, y, WIDTH - gutter, WIDTH - gutter);
        }
    }
}

// Draw individual square
function drawSquare(row, col, x, y, w, h) {
    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("x", x);
    rect.setAttribute("y", y);
    rect.setAttribute("row", row);
    rect.setAttribute("col", col);
    rect.setAttribute("width", w);
    rect.setAttribute("height", h);
    rect.setAttribute("class", "maze-cell base");
    g.appendChild(rect);
}

// Get target element
function getTarget(row, col) {
    if (row < 0 || row > ROWS || col < 0 || col > COLS) {
        return null;
    }
    return document.querySelector(`rect[col='${col}'][row='${row}']`);
}

// Point class for coordinate management
function Point(row, col) {
    this.col = parseInt(col);
    this.row = parseInt(row);
}

// Get random point
function getRandomPoint() {
    const row = Math.floor(Math.random() * (ROWS + 1));
    const col = Math.floor(Math.random() * (COLS + 1));
    return new Point(row, col);
}

// Get random direction
function getRandomDirection(not) {
    const generate = () => {
        const seed = Math.random();
        return seed > .75 ? "south" : seed > .5 ? "north" : seed > .25 ? "east" : "west";
    };
    let direction = generate();
    while (not && direction === not) {
        direction = generate();
    }
    return direction;
}

// Get next point in direction
function getNextPointInDirection(point, direction) {
    switch (direction) {
        case "north": return new Point(point.row - 1, point.col);
        case "south": return new Point(point.row + 1, point.col);
        case "east": return new Point(point.row, point.col + 1);
        case "west": return new Point(point.row, point.col - 1);
        default: return point;
    }
}

// Get random move
function getRandomMove(from, xRando = Math.random(), yRando = Math.random()) {
    let xMove = xRando > .66 ? 1 : xRando > .33 ? 0 : -1;
    let yMove = yRando > .66 ? 1 : yRando > .33 ? 0 : -1;

    if (from.row + yMove > ROWS) yMove = 0;
    if (from.row + yMove < 0) yMove = 0;
    if (from.col + xMove < 0) xMove = 0;
    if (from.col + xMove > COLS) xMove = 0;

    return new Point(from.row + yMove, from.col + xMove);
}

// Delay function
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Main maze function
async function maze() {
    if (!mazeActive) {
        mazeActive = true;
    }

    const blockFactor = 0.4; // Balanced density for subtle background
    const time = TOTAL > 500 ? 25 : TOTAL > 250 ? 35 : TOTAL > 150 ? 45 : 55;

    // Start maze builders from multiple points
    mazer(0, 0, time);
    mazer(ROWS, COLS, time);
    mazer(0, COLS, time);
    if (TOTAL > 100) mazer(ROWS, 0, time);
    if (TOTAL > 500) {
        mazer(CENTERY, CENTERX, time);
    }

    await delay(1500);
    
    // Start moving elements with reasonable speeds
    const rp1 = getRandomPoint();
    lostSquare(getTarget(rp1.row, rp1.col), TOTAL > 1000 ? 90 : 110, getRandomDirection(), "solid1");
    
    const rp2 = getRandomPoint();
    lostSquare(getTarget(rp2.row, rp2.col), TOTAL > 1000 ? 75 : 95, getRandomDirection(), "solid2");
    
    const rp3 = getRandomPoint();
    lostSquare(getTarget(rp3.row, rp3.col), TOTAL > 1000 ? 60 : 80, getRandomDirection(), "solid3");
    
    const rp4 = getRandomPoint();
    lostSquare(getTarget(rp4.row, rp4.col), TOTAL > 1000 ? 55 : 75, getRandomDirection(), "solid4");
}

// Maze builder function
async function mazer(row, col, time) {
    if (!mazeActive) return false;

    const rando = Math.random();
    const target = getTarget(row, col);
    
    if (target) {
        const blockFactor = 0.25; // Subtle wall density
        target.setAttribute("class", `maze-cell ${rando < blockFactor ? "blocker" : "base"}`);
        const next = getRandomMove(new Point(row, col), rando);

        await delay(time);
        if (mazeActive) {
            mazer(next.row, next.col, time);
        }
    }
}

// Moving element function
async function lostSquare(target, time, direction, className) {
    if (!mazeActive || !target) return false;
    
    target.setAttribute("class", `maze-cell ${className}`);
    const row = parseInt(target.getAttribute("row"));
    const col = parseInt(target.getAttribute("col"));
    const nextPoint = getNextPointInDirection(new Point(row, col), direction);
    const nextTarget = getTarget(nextPoint.row, nextPoint.col);

    await delay(time);
    
    if (!mazeActive) return false;
    
    target.setAttribute("class", "maze-cell base");

    if (!nextTarget || nextTarget.classList.contains("blocker")) {
        // Hit wall - change direction
        const newDirection = getRandomDirection(direction);
        lostSquare(target, time, newDirection, className);
    } else {
        // Continue moving (5% chance to change direction randomly)
        if (Math.random() > 0.95) {
            lostSquare(nextTarget, time, getRandomDirection(direction), className);
        } else {
            lostSquare(nextTarget, time, direction, className);
        }
    }
}

// Cleanup function
function cleanup() {
    mazeActive = false;
    
    if (svg) {
        svg.remove();
        svg = null;
        g = null;
    }
}

// Resize handler
function handleResize() {
    let resizeTimeout;
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        cleanup();
        initPixelMaze();
    }, 250);
}

// Initialize when DOM is ready
function startMaze() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initPixelMaze);
    } else {
        initPixelMaze();
    }
    
    // Setup resize handler
    window.addEventListener('resize', handleResize);
}

// Auto-start
startMaze();

// Global access
window.pixelMaze = {
    init: initPixelMaze,
    cleanup: cleanup,
    isRunning: () => mazeActive
};