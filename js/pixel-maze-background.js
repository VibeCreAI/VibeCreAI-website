/**
 * SVG-Based Pixel Maze Background System
 * Adapted from Speckyboy creative snippets
 * Optimized for VibeCreAI website with theme integration
 */

// Global variables
let svg, g;
let WIDTH, COLS, ROWS, TOTAL, CENTERX, CENTERY;
let mazeActive = false;
let activeColorElements = 0;
let mazeLastWidth = 0;
let mazeLastHeight = 0;
let mazeIsMobile = false;
let mazeResizeTimeout = null;

// Canvas overlay for bot sprites
let botCanvas, botCtx;
let activeBots = []; // Track all active bot instances
let botTrails = []; // Track trail effects for fading

// Direction mapping cache for performance
const directionMap = {
    'north': 'up',
    'south': 'down',
    'east': 'right',
    'west': 'left'
};

// Bug tracking system
let bugCells = []; // Track bug locations {row, col, element}
let fixedCells = []; // Track recently fixed cells for fade animation
const MAX_BUGS = 8;
const BUG_SPAWN_INTERVAL = 5000; // Spawn new bugs every 5 seconds
const BUGS_PER_SPAWN = 2; // Number of bugs to spawn at once
let bugSpawnTimer = null;

// Initialize maze system
async function initPixelMaze() {
    cleanup();
    detectMobileDevice();
    createSVGContainer();
    setWindowValues();
    buildGrid();

    // Wait for bot sprites to load before starting maze
    if (window.mazeBotSprite && !window.mazeBotSprite.loaded) {
        await Promise.all(window.mazeBotSprite.loadPromises).catch(() => {
            console.warn('Bot sprites failed to load, maze will continue without them');
        });
    }

    // Start maze generation
    setTimeout(() => {
        maze();
    }, 500);
}

// Mobile device detection
function detectMobileDevice() {
    mazeIsMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                   (window.innerWidth <= 768) ||
                   ('ontouchstart' in window) ||
                   (navigator.maxTouchPoints > 0);
}

// Set responsive window values
function setWindowValues() {
    const currentWidth = window.innerWidth;
    const currentHeight = window.innerHeight;

    // Store current dimensions for resize detection
    mazeLastWidth = currentWidth;
    mazeLastHeight = currentHeight;

    const minFactor = Math.min(currentWidth, currentHeight);
    // Optimized cell sizes for performance
    WIDTH = minFactor > 1200 ? 60 : minFactor > 950 ? 50 : minFactor > 750 ? 40 : 35;
    COLS = Math.floor(currentWidth / WIDTH);
    ROWS = Math.floor(currentHeight / WIDTH);
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
    
    // Create canvas overlay for bot sprites
    createBotCanvas();
}

// Create canvas overlay for animated bot sprites
function createBotCanvas() {
    botCanvas = document.createElement('canvas');
    botCanvas.id = 'mazeBotCanvas';
    botCanvas.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        z-index: 0;
        overflow: hidden;
        pointer-events: none;
        will-change: transform;
        transform: translateZ(0);
    `;
    botCanvas.width = window.innerWidth;
    botCanvas.height = window.innerHeight;
    
    botCtx = botCanvas.getContext('2d', { 
        alpha: true,
        desynchronized: true,  // Optimize for animations
        willReadFrequently: false
    });
    botCtx.imageSmoothingEnabled = false;
    
    document.body.appendChild(botCanvas);
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

// Spawn a bug at random location
function spawnBug() {
    if (bugCells.length >= MAX_BUGS) return;
    
    const row = Math.floor(Math.random() * (ROWS + 1));
    const col = Math.floor(Math.random() * (COLS + 1));
    const target = getTarget(row, col);
    
    // Don't spawn on walls or existing bugs
    if (!target || target.classList.contains('blocker')) return;
    if (bugCells.some(bug => bug.row === row && bug.col === col)) return;
    
    // Mark cell as bug
    target.classList.add('bug-cell');
    bugCells.push({ row, col, element: target });
}

// Remove bug from tracking
function removeBug(row, col) {
    const bugIndex = bugCells.findIndex(bug => bug.row === row && bug.col === col);
    if (bugIndex !== -1) {
        const bug = bugCells[bugIndex];
        bug.element.classList.remove('bug-cell');
        bugCells.splice(bugIndex, 1);
        
        // Add to fixed cells for visual transition
        bug.element.classList.add('fixed-cell');
        fixedCells.push({ element: bug.element, timestamp: Date.now() });
    }
}

// Check if location has a bug
function hasBug(row, col) {
    return bugCells.some(bug => bug.row === row && bug.col === col);
}

// Find nearest bug to given position
function findNearestBug(row, col) {
    if (bugCells.length === 0) return null;
    
    let nearest = null;
    let minDistance = Infinity;
    
    bugCells.forEach(bug => {
        const distance = Math.abs(bug.row - row) + Math.abs(bug.col - col);
        if (distance < minDistance) {
            minDistance = distance;
            nearest = bug;
        }
    });
    
    return { bug: nearest, distance: minDistance };
}

// Start bug spawning system
function startBugSpawning() {
    // Spawn initial bugs
    for (let i = 0; i < 5; i++) {
        spawnBug();
    }
    
    // Set up periodic spawning
    bugSpawnTimer = setInterval(() => {
        if (mazeActive) {
            // Spawn multiple bugs at once
            for (let i = 0; i < BUGS_PER_SPAWN; i++) {
                spawnBug();
            }
        }
    }, BUG_SPAWN_INTERVAL);
}

// Update fixed cells (fade them back to normal)
function updateFixedCells() {
    const now = Date.now();
    fixedCells = fixedCells.filter(fixed => {
        const age = now - fixed.timestamp;
        if (age > 2000) { // Remove "fixed" state after 2 seconds
            fixed.element.classList.remove('fixed-cell');
            return false;
        }
        return true;
    });
}

// Main maze function
async function maze() {
    if (!mazeActive) {
        mazeActive = true;
    }

    // Reset color elements counter
    activeColorElements = 0;

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

    // Start bug spawning system
    startBugSpawning();

    // Start moving elements with reasonable speeds - maximum 4 elements
    if (activeColorElements < 4) {
        const rp1 = getRandomPoint();
        lostSquare(getTarget(rp1.row, rp1.col), TOTAL > 1000 ? 100 : 120, getRandomDirection(), "solid1");
        activeColorElements++;
    }

    if (activeColorElements < 4) {
        const rp2 = getRandomPoint();
        lostSquare(getTarget(rp2.row, rp2.col), TOTAL > 1000 ? 100 : 120, getRandomDirection(), "solid2");
        activeColorElements++;
    }

    if (activeColorElements < 4) {
        const rp3 = getRandomPoint();
        lostSquare(getTarget(rp3.row, rp3.col), TOTAL > 1000 ? 100 : 120, getRandomDirection(), "solid3");
        activeColorElements++;
    }

    if (activeColorElements < 4) {
        const rp4 = getRandomPoint();
        lostSquare(getTarget(rp4.row, rp4.col), TOTAL > 1000 ? 100 : 120, getRandomDirection(), "solid4");
        activeColorElements++;
    }
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

// Moving element function - now renders animated sprites
async function lostSquare(target, time, direction, className) {
    if (!mazeActive || !target) {
        // Decrease counter when element stops
        if (activeColorElements > 0) activeColorElements--;
        return false;
    }

    const row = parseInt(target.getAttribute("row"));
    const col = parseInt(target.getAttribute("col"));
    
    // Create or update bot instance
    const botId = `bot-${className}`;
    let bot = activeBots.find(b => b.id === botId);
    
    // Check if bot is at a bug location - fix it!
    if (hasBug(row, col)) {
        removeBug(row, col);
        // Enter extended idle state for "fixing"
        if (bot) {
            bot.isIdle = true;
            bot.idleFramesRemaining = 5;
            bot.frameIndex = 0;
        }
    }
    
    if (!bot) {
        bot = {
            id: botId,
            row: row,
            col: col,
            direction: direction,
            className: className,
            frameIndex: 0,
            moveCounter: 0,
            trailCount: 0,  // Track trails per bot
            isIdle: false,
            idleFramesRemaining: 0
        };
        activeBots.push(bot);
    } else {
        bot.row = row;
        bot.col = col;
        bot.direction = direction;
    }
    
    // Check if bot should enter idle state (5% chance)
    if (!bot.isIdle && Math.random() < 0.05) {
        bot.isIdle = true;
        bot.idleFramesRemaining = Math.floor(Math.random() * 3) + 2; // Idle for 2-4 moves
        bot.frameIndex = 0; // Reset to first idle frame
    }
    
    // Handle idle state
    if (bot.isIdle) {
        bot.idleFramesRemaining--;
        // Animate idle frames slowly
        bot.moveCounter++;
        if (bot.moveCounter % 3 === 0) {
            bot.frameIndex = (bot.frameIndex + 1) % 12;
        }
        
        // Exit idle state when done
        if (bot.idleFramesRemaining <= 0) {
            bot.isIdle = false;
            bot.frameIndex = 0;
        }
    } else {
        // Normal movement - advance animation frame every 2 moves for smoother animation
        bot.moveCounter++;
        if (bot.moveCounter % 2 === 0) {
            bot.frameIndex = (bot.frameIndex + 1) % 12;
        }
    }
    
    // Add trail effect - create trail every move but limit to 3 per bot
    // Remove oldest trail for this bot if already at max
    const botTrailsForThisBot = botTrails.filter(t => t.botId === botId);
    if (botTrailsForThisBot.length >= 3) {
        // Find and remove the oldest trail for this bot
        const oldestTrailIndex = botTrails.findIndex(t => t.botId === botId);
        if (oldestTrailIndex !== -1) {
            botTrails.splice(oldestTrailIndex, 1);
        }
    }
    
    // Add new trail
    botTrails.push({
        botId: botId,
        x: WIDTH * bot.col,
        y: WIDTH * bot.row,
        size: WIDTH - 1,
        direction: bot.direction,
        frameIndex: bot.frameIndex,
        className: bot.className,
        opacity: 0.6,
        fadeSpeed: 0.02
    });
    
    // Render all bots
    renderBots();

    await delay(time);
    
    // If bot is idle, stay in same position and continue idle animation
    if (bot.isIdle) {
        lostSquare(target, time, direction, className);
        return;
    }

    if (!mazeActive) {
        // Remove this bot and its trails
        activeBots = activeBots.filter(b => b.id !== botId);
        botTrails = botTrails.filter(t => t.botId !== botId);
        if (activeColorElements > 0) activeColorElements--;
        renderBots(); // Clear the bot from canvas
        return false;
    }

    // Check for nearby bugs and steer toward them (within 5 cells)
    const nearestBugInfo = findNearestBug(row, col);
    let targetDirection = direction;
    
    if (nearestBugInfo && nearestBugInfo.distance <= 5) {
        // Steer toward bug
        const bug = nearestBugInfo.bug;
        const rowDiff = bug.row - row;
        const colDiff = bug.col - col;
        
        // Choose direction that gets closer to bug
        if (Math.abs(rowDiff) > Math.abs(colDiff)) {
            targetDirection = rowDiff > 0 ? 'south' : 'north';
        } else if (colDiff !== 0) {
            targetDirection = colDiff > 0 ? 'east' : 'west';
        }
    }
    
    const nextPoint = getNextPointInDirection(new Point(row, col), targetDirection);
    const nextTarget = getTarget(nextPoint.row, nextPoint.col);

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

// Render all active bots to canvas
function renderBots() {
    if (!botCtx || !window.mazeBotSprite || !window.mazeBotSprite.loaded) {
        return;
    }
    
    // Clear canvas efficiently
    botCtx.clearRect(0, 0, botCanvas.width, botCanvas.height);
    
    // Early exit if nothing to render
    if (activeBots.length === 0 && botTrails.length === 0) {
        return;
    }
    
    // Draw trails first (behind the bots)
    botTrails.forEach((trail, index) => {
        // Map maze directions to sprite directions (cached)
        const spriteDirection = directionMap[trail.direction] || trail.direction;
        
        // Calculate fade based on position in bot's trail (newest = index 2, oldest = index 0)
        const botTrailsForThisBot = botTrails.filter(t => t.botId === trail.botId);
        const positionInTrail = botTrailsForThisBot.indexOf(trail);
        const opacity = 0.3 + (positionInTrail * 0.2); // oldest: 0.3, middle: 0.5, newest: 0.7
        
        // Set global alpha for fading effect
        botCtx.globalAlpha = opacity;
        
        window.mazeBotSprite.drawBot(
            botCtx,
            trail.x,
            trail.y,
            trail.size,
            spriteDirection,
            trail.frameIndex,
            trail.className
        );
    });
    
    // Reset global alpha
    botCtx.globalAlpha = 1.0;
    
    // Draw each active bot on top
    activeBots.forEach(bot => {
        const x = WIDTH * bot.col;
        const y = WIDTH * bot.row;
        
        // Use idle sprite when bot is idle, otherwise use direction-based sprite
        const spriteDirection = bot.isIdle ? 'idle' : (directionMap[bot.direction] || bot.direction);
        
        window.mazeBotSprite.drawBot(
            botCtx,
            x,
            y,
            WIDTH - 1, // Match grid cell size minus gutter
            spriteDirection,
            bot.frameIndex,
            bot.className
        );
    });
}

// Cleanup function
function cleanup() {
    mazeActive = false;
    activeColorElements = 0; // Reset counter
    activeBots = []; // Clear all bots
    botTrails = []; // Clear all trails
    bugCells = []; // Clear all bugs
    fixedCells = []; // Clear all fixed cells
    
    // Clear bug spawn timer
    if (bugSpawnTimer) {
        clearInterval(bugSpawnTimer);
        bugSpawnTimer = null;
    }

    if (svg) {
        svg.remove();
        svg = null;
        g = null;
    }
    
    if (botCanvas) {
        botCanvas.remove();
        botCanvas = null;
        botCtx = null;
    }
}

// Smart resize detection to prevent unnecessary maze resets
function shouldResizeMaze() {
    const currentWidth = window.innerWidth;
    const currentHeight = window.innerHeight;

    // Calculate percentage changes
    const widthChangePercent = Math.abs(currentWidth - mazeLastWidth) / mazeLastWidth;
    const heightChangePercent = Math.abs(currentHeight - mazeLastHeight) / mazeLastHeight;

    // Different thresholds for mobile vs desktop
    if (mazeIsMobile) {
        // Mobile: Only reset on significant width changes or very large height changes
        // This ignores typical address bar show/hide (usually 5-15% height change)
        const significantWidthChange = widthChangePercent > 0.1; // 10% width change
        const significantHeightChange = heightChangePercent > 0.2; // 20% height change (orientation)

        return significantWidthChange || significantHeightChange;
    } else {
        // Desktop: Reset on any significant change (old behavior for desktop)
        const significantChange = widthChangePercent > 0.1 || heightChangePercent > 0.1;
        return significantChange;
    }
}

// Enhanced resize handler with smart detection
function handleResize() {
    // Clear any existing timeout
    if (mazeResizeTimeout) {
        clearTimeout(mazeResizeTimeout);
    }

    // Use longer debounce for mobile to handle rapid address bar changes
    const debounceTime = mazeIsMobile ? 500 : 250;

    mazeResizeTimeout = setTimeout(() => {
        // Re-detect mobile state in case of viewport changes
        detectMobileDevice();

        // Only reset maze if significant resize is detected
        if (shouldResizeMaze()) {
            cleanup();
            initPixelMaze();
        }

        mazeResizeTimeout = null;
    }, debounceTime);
}

// Initialize when DOM is ready
function startMaze() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initPixelMaze);
    } else {
        initPixelMaze();
    }

    // Setup smart resize handler
    window.addEventListener('resize', handleResize);

    // Also listen for orientation changes on mobile
    if ('onorientationchange' in window) {
        window.addEventListener('orientationchange', () => {
            // Force reset on orientation change after a delay
            setTimeout(() => {
                cleanup();
                initPixelMaze();
            }, 500);
        });
    }
}

// Auto-start
startMaze();

// Global access
window.pixelMaze = {
    init: initPixelMaze,
    cleanup: cleanup,
    isRunning: () => mazeActive
};