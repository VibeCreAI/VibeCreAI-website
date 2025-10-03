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
let webglRenderer = null; // WebGL renderer instance
let useWebGL = false; // Flag for renderer selection
let renderLoopId = null; // RAF loop ID

// Bot intelligence systems (simplified)
let botPreviousCell = new Map(); // Track only last cell per bot (anti-oscillation)
let botLastDirection = new Map(); // Track last direction per bot
let botRecentCells = new Map(); // Track last 3 cells to prevent tight loops

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

// User interaction system for bug placement

// Ensure cell visuals are reset before marking as a bug
function prepareCellForBug(target) {
    if (!target) return;

    if (target.classList.contains('fixed-cell')) {
        target.classList.remove('fixed-cell');
        fixedCells = fixedCells.filter(fixed => fixed.element !== target);
    }

    if (target.classList.contains('bug-cell')) {
        target.classList.remove('bug-cell');
    }

    target.style.removeProperty('opacity');
    target.style.removeProperty('filter');
    target.style.removeProperty('transform');
    target.style.removeProperty('transition');
}

let lastBugPlacementTime = 0;
const BUG_PLACEMENT_COOLDOWN = 500; // 500ms cooldown between user placements

// Initialize maze system
async function initPixelMaze() {
    cleanup();
    detectMobileDevice();
    createSVGContainer();
    setWindowValues();
    buildGrid();

    // Align SVG and canvas to the finalized viewport on first paint
    syncLayerViewport();
    requestAnimationFrame(syncLayerViewport);

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

// Handle click/touch on canvas to place bugs
function handleCanvasInteraction(event) {
    if (!mazeActive) return;

    const clickedElement = event.target;
    const withinHeroTitle = !!clickedElement.closest('.hero-title');
    const withinTaglineContainer = !!clickedElement.closest('.tagline-container');
    const withinProgrammerArea = !!clickedElement.closest('#programmer-container, #programmer-character');
    const withinTerminal = !!clickedElement.closest('#source-code-terminal');
    const allowHeroOverrides = (withinHeroTitle || withinTaglineContainer) && !withinProgrammerArea && !withinTerminal;

    // Ignore clearly interactive elements unless we're on explicitly allowed hero areas
    const interactiveElements = ['A', 'BUTTON', 'INPUT', 'TEXTAREA', 'SELECT', 'IMG', 'VIDEO', 'CANVAS', 'LABEL'];
    if (interactiveElements.includes(clickedElement.tagName) && !allowHeroOverrides) return;

    const interactiveSelector = "a, button, input, textarea, select, img, video, canvas, [role=\"button\"], [data-no-bug], .no-bug-area, .cta-button, .app-button";
    if (clickedElement.closest(interactiveSelector) && !allowHeroOverrides) return;

    // Never spawn bugs on the character or terminal itself
    if (withinProgrammerArea || withinTerminal) return;

    // Get coordinates (handle both mouse and touch)
    let clientX, clientY;
    if (event.type === 'touchstart') {
        const touch = event.touches[0];
        clientX = touch.clientX;
        clientY = touch.clientY;
    } else {
        clientX = event.clientX;
        clientY = event.clientY;
    }

    // Convert to grid coordinates
    const cell = getCellFromScreenCoords(clientX, clientY);
    if (!cell) return;

    // Try to spawn bug at position
    spawnBugAtPosition(cell.row, cell.col);
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

    // Add click and touch event listeners to DOCUMENT for bug placement
    // This way clicks anywhere on the page can place bugs
    document.addEventListener('click', handleCanvasInteraction);
    document.addEventListener('touchstart', handleCanvasInteraction, { passive: false });

    // Try WebGL first, fallback to Canvas2D
    // Temporarily disabled - WebGL sprite frames need debugging
    useWebGL = false;
    if (false && window.WebGLMazeRenderer && window.mazeBotSprite) {
        webglRenderer = new WebGLMazeRenderer(botCanvas, window.mazeBotSprite);
        useWebGL = webglRenderer.initialize();

        if (useWebGL) {
            console.log('✅ WebGL renderer initialized');
        } else {
            console.log('⚠️ WebGL not available, using Canvas2D fallback');
        }
    }

    // Fallback to Canvas2D
    if (!useWebGL) {
        console.log('✅ Using Canvas2D renderer');
        botCtx = botCanvas.getContext('2d', {
            alpha: true,
            desynchronized: true,
            willReadFrequently: false
        });
        botCtx.imageSmoothingEnabled = false;
    }

    document.body.appendChild(botCanvas);

    // Don't start render loop yet - wait for maze to activate
}

// Keep SVG and canvas aligned with the current visual viewport
function syncLayerViewport() {
    if (!svg || !botCanvas) {
        return;
    }

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Anchor SVG coordinate space to CSS pixels so rect positions remain accurate
    svg.setAttribute('width', viewportWidth);
    svg.setAttribute('height', viewportHeight);
    svg.setAttribute('viewBox', `0 0 ${viewportWidth} ${viewportHeight}`);
    svg.setAttribute('preserveAspectRatio', 'xMinYMin meet');

    // Mirror dimensions on the bot canvas, both CSS size and backing store
    botCanvas.style.width = `${viewportWidth}px`;
    botCanvas.style.height = `${viewportHeight}px`;
    botCanvas.style.transformOrigin = 'top left';
    botCanvas.width = viewportWidth;
    botCanvas.height = viewportHeight;

    if (webglRenderer) {
        webglRenderer.resize(viewportWidth, viewportHeight);
    }

    // Update last known viewport values so minor resize detection stays accurate
    mazeLastWidth = viewportWidth;
    mazeLastHeight = viewportHeight;
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
    
    // Reset any lingering fixed/fade state before marking bug
    prepareCellForBug(target);

    // Mark cell as bug
    target.classList.add('bug-cell');
    bugCells.push({ row, col, element: target });
}

// Convert screen coordinates to grid cell coordinates
function getCellFromScreenCoords(screenX, screenY) {
    const col = Math.floor(screenX / WIDTH);
    const row = Math.floor(screenY / WIDTH);

    // Validate bounds
    if (row < 0 || row > ROWS || col < 0 || col > COLS) {
        return null;
    }

    return { row, col };
}

// Spawn bug at specific position (user-placed)
function spawnBugAtPosition(row, col) {
    // Check cooldown
    const now = Date.now();
    if (now - lastBugPlacementTime < BUG_PLACEMENT_COOLDOWN) {
        return false;
    }

    // Check if max bugs reached
    if (bugCells.length >= MAX_BUGS) {
        return false;
    }

    const target = getTarget(row, col);

    // Validate: must be valid cell, not a wall, not an existing bug
    if (!target || target.classList.contains('blocker')) {
        return false;
    }
    if (bugCells.some(bug => bug.row === row && bug.col === col)) {
        return false;
    }

    // Place the bug
    prepareCellForBug(target);
    target.classList.add('bug-cell');
    bugCells.push({ row, col, element: target });

    // Visual feedback: brief flash animation
    target.style.transition = 'all 0.3s ease';
    target.style.transform = 'scale(1.2)';
    setTimeout(() => {
        target.style.transform = 'scale(1)';
    }, 300);

    // Update cooldown
    lastBugPlacementTime = now;

    return true;
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

// Simple direction helpers for ultra-minimal AI
function isPathClear(row, col, direction) {
    const nextPoint = getNextPointInDirection(new Point(row, col), direction);
    const nextTarget = getTarget(nextPoint.row, nextPoint.col);
    return nextTarget && !nextTarget.classList.contains('blocker');
}

// Get direction toward a target (simple Manhattan pathfinding)
function getDirectionToward(fromRow, fromCol, toRow, toCol) {
    const rowDiff = toRow - fromRow;
    const colDiff = toCol - fromCol;

    // Move in the direction of largest difference
    if (Math.abs(rowDiff) > Math.abs(colDiff)) {
        return rowDiff > 0 ? 'south' : 'north';
    } else if (colDiff !== 0) {
        return colDiff > 0 ? 'east' : 'west';
    }

    // Same position, pick random
    return ['north', 'south', 'east', 'west'][Math.floor(Math.random() * 4)];
}

// Get opposite direction helper
function getOppositeDirection(direction) {
    const opposites = {
        'north': 'south',
        'south': 'north',
        'east': 'west',
        'west': 'east'
    };
    return opposites[direction] || direction;
}

// Get random valid direction (avoiding walls, previous cells, and backtracking)
function getRandomValidDirection(row, col, currentDirection, botId) {
    const directions = ['north', 'south', 'east', 'west'];
    const previousCell = botPreviousCell.get(botId);
    const lastDirection = botLastDirection.get(botId);
    const oppositeDir = getOppositeDirection(lastDirection || currentDirection);
    const recentCells = botRecentCells.get(botId) || [];

    // Filter to valid directions
    let validDirs = directions.filter(dir => isPathClear(row, col, dir));

    if (validDirs.length === 0) {
        return currentDirection; // Stuck, keep trying current direction
    }

    // STRONG anti-oscillation: avoid opposite of last direction
    if (validDirs.length > 1) {
        const nonBacktrackDirs = validDirs.filter(dir => dir !== oppositeDir);
        if (nonBacktrackDirs.length > 0) {
            validDirs = nonBacktrackDirs;
        }
    }

    // Avoid going back to any recently visited cells (last 3 cells)
    if (recentCells.length > 0 && validDirs.length > 1) {
        const nonRecentDirs = validDirs.filter(dir => {
            const nextPoint = getNextPointInDirection(new Point(row, col), dir);
            const cellKey = `${nextPoint.row},${nextPoint.col}`;
            return !recentCells.includes(cellKey);
        });

        if (nonRecentDirs.length > 0) {
            validDirs = nonRecentDirs;
        }
    }

    // Pick random from valid directions
    return validDirs[Math.floor(Math.random() * validDirs.length)];
}

// Ultra-simple next direction logic (4 rules only)
// Get perpendicular directions to the given direction
function getPerpendicularDirections(direction) {
    switch (direction) {
        case 'north':
        case 'south':
            return ['east', 'west'];
        case 'east':
        case 'west':
            return ['north', 'south'];
        default:
            return ['north', 'south', 'east', 'west'];
    }
}

// Breadth-first search to find the first move toward a target while avoiding blockers
function findDirectionWithShortestPath(startRow, startCol, targetRow, targetCol, maxDepth = 32) {
    if (startRow === targetRow && startCol === targetCol) {
        return null;
    }

    const visited = new Set();
    const queue = [];
    const dirVectors = [
        { dir: 'north', dr: -1, dc: 0 },
        { dir: 'south', dr: 1, dc: 0 },
        { dir: 'east', dr: 0, dc: 1 },
        { dir: 'west', dr: 0, dc: -1 }
    ];

    queue.push({ row: startRow, col: startCol, firstDir: null, depth: 0 });
    visited.add(`${startRow},${startCol}`);

    while (queue.length > 0) {
        const current = queue.shift();

        if (current.depth >= maxDepth) {
            continue;
        }

        for (const vector of dirVectors) {
            const nextRow = current.row + vector.dr;
            const nextCol = current.col + vector.dc;
            const key = `${nextRow},${nextCol}`;

            if (visited.has(key)) {
                continue;
            }

            const nextTarget = getTarget(nextRow, nextCol);

            if (!nextTarget || nextTarget.classList.contains('blocker')) {
                continue;
            }

            const firstDir = current.firstDir || vector.dir;

            if (nextRow === targetRow && nextCol === targetCol) {
                return firstDir;
            }

            visited.add(key);
            queue.push({ row: nextRow, col: nextCol, firstDir, depth: current.depth + 1 });
        }
    }

    return null;
}

function getNextDirection(row, col, currentDirection, botId) {
    const nearestBugInfo = findNearestBug(row, col);

    // Rule 1: Hunt bug if within 10 cells
    if (nearestBugInfo && nearestBugInfo.distance <= 10) {
        // Try a shortest-path search to navigate around walls toward the bug
        const pathDirection = findDirectionWithShortestPath(
            row,
            col,
            nearestBugInfo.bug.row,
            nearestBugInfo.bug.col,
            40
        );

        if (pathDirection) {
            return pathDirection;
        }

        const bugDirection = getDirectionToward(row, col, nearestBugInfo.bug.row, nearestBugInfo.bug.col);

        // If bug direction is clear, go for it
        if (isPathClear(row, col, bugDirection)) {
            return bugDirection;
        }

        // If blocked, try to navigate around the obstacle
        // Try perpendicular directions first (wall-hugging behavior)
        const perpDirs = getPerpendicularDirections(bugDirection);
        const recentCells = botRecentCells.get(botId) || [];
        
        // Filter perpendicular directions: must be clear AND not recently visited
        let validPerpDirs = perpDirs.filter(dir => {
            if (!isPathClear(row, col, dir)) return false;
            
            // Also check if this direction leads to a recently visited cell
            const nextPoint = getNextPointInDirection(new Point(row, col), dir);
            const cellKey = `${nextPoint.row},${nextPoint.col}`;
            return !recentCells.includes(cellKey);
        });
        
        // If all perpendicular directions are recent, allow them (escape hatch)
        if (validPerpDirs.length === 0) {
            validPerpDirs = perpDirs.filter(dir => isPathClear(row, col, dir));
        }
        
        if (validPerpDirs.length > 0) {
            // Prefer the perpendicular direction that gets us closer to bug
            const bugRow = nearestBugInfo.bug.row;
            const bugCol = nearestBugInfo.bug.col;
            
            let bestDir = validPerpDirs[0];
            let bestDistance = Infinity;
            
            validPerpDirs.forEach(dir => {
                const nextPoint = getNextPointInDirection(new Point(row, col), dir);
                const distance = Math.abs(nextPoint.row - bugRow) + Math.abs(nextPoint.col - bugCol);
                if (distance < bestDistance) {
                    bestDistance = distance;
                    bestDir = dir;
                }
            });
            
            return bestDir;
        }

        // If perpendicular directions blocked too, check if we're truly stuck
        // Get all valid directions that aren't recently visited
        const allValidDirs = ['north', 'south', 'east', 'west'].filter(dir => {
            if (!isPathClear(row, col, dir)) return false;
            const nextPoint = getNextPointInDirection(new Point(row, col), dir);
            const cellKey = `${nextPoint.row},${nextPoint.col}`;
            return !recentCells.includes(cellKey);
        });
        
        // If no fresh directions available, bot is stuck - return null to signal idle
        if (allValidDirs.length === 0) {
            return null; // Signal to enter idle state
        }
        
        return getRandomValidDirection(row, col, currentDirection, botId);
    }

    // Rule 2: Random direction change (15% chance for exploration variety)
    if (Math.random() < 0.15) {
        return getRandomValidDirection(row, col, currentDirection, botId);
    }

    // Rule 3: Continue current direction if clear
    if (isPathClear(row, col, currentDirection)) {
        return currentDirection;
    }

    // Rule 4: Blocked, pick new random direction
    return getRandomValidDirection(row, col, currentDirection, botId);
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
        // Start render loop now that maze is active
        startRenderLoop();
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
    // Bots start at random positions (30% slower: 100->130, 120->156)
    if (activeColorElements < 4) {
        const rp1 = getRandomPoint();
        lostSquare(getTarget(rp1.row, rp1.col), TOTAL > 1000 ? 130 : 156, getRandomDirection(), "solid1", 0);
        activeColorElements++;
    }

    if (activeColorElements < 4) {
        const rp2 = getRandomPoint();
        lostSquare(getTarget(rp2.row, rp2.col), TOTAL > 1000 ? 130 : 156, getRandomDirection(), "solid2", 1);
        activeColorElements++;
    }

    if (activeColorElements < 4) {
        const rp3 = getRandomPoint();
        lostSquare(getTarget(rp3.row, rp3.col), TOTAL > 1000 ? 130 : 156, getRandomDirection(), "solid3", 2);
        activeColorElements++;
    }

    if (activeColorElements < 4) {
        const rp4 = getRandomPoint();
        lostSquare(getTarget(rp4.row, rp4.col), TOTAL > 1000 ? 130 : 156, getRandomDirection(), "solid4", 3);
        activeColorElements++;
    }
}

// Maze builder function
async function mazer(row, col, time) {
    if (!mazeActive) return false;

    const rando = Math.random();
    const target = getTarget(row, col);

    if (target) {
        // Don't overwrite bug cells or fixed cells!
        if (target.classList.contains('bug-cell') || target.classList.contains('fixed-cell')) {
            const next = getRandomMove(new Point(row, col), rando);
            await delay(time);
            if (mazeActive) {
                mazer(next.row, next.col, time);
            }
            return;
        }

        const blockFactor = 0.18; // Reduced wall density for better bot movement
        target.setAttribute("class", `maze-cell ${rando < blockFactor ? "blocker" : "base"}`);
        const next = getRandomMove(new Point(row, col), rando);

        await delay(time);
        if (mazeActive) {
            mazer(next.row, next.col, time);
        }
    }
}

// Moving element function - now renders animated sprites with smart AI
async function lostSquare(target, time, direction, className, botIndex = 0) {
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
            targetRow: row,      // Interpolation target
            targetCol: col,      // Interpolation target
            x: WIDTH * col,      // Visual position (pixels)
            y: WIDTH * row,      // Visual position (pixels)
            interpolation: 1.0,  // 0-1, progress to target
            moveStartTime: Date.now(),
            moveDelay: time,
            direction: direction,
            className: className,
            frameIndex: 0,
            moveCounter: 0,
            trailCount: 0,
            isIdle: false,
            idleFramesRemaining: 0,
            botIndex: botIndex
        };
        activeBots.push(bot);
    } else {
        // Update current position to where bot actually is (previous target)
        bot.row = bot.targetRow;
        bot.col = bot.targetCol;
        
        // Set new target for interpolation
        bot.targetRow = row;
        bot.targetCol = col;
        bot.interpolation = 0.0; // Start interpolating
        bot.moveStartTime = Date.now();
        bot.moveDelay = time;
        bot.direction = direction;
    }

    // Update bot memory (track previous cell, direction, and recent cell history)
    const cellKey = `${row},${col}`;
    botPreviousCell.set(botId, cellKey);
    botLastDirection.set(botId, direction);
    
    // Maintain recent cells list (max 3 cells)
    let recentCells = botRecentCells.get(botId) || [];
    recentCells.push(cellKey);
    if (recentCells.length > 3) {
        recentCells.shift(); // Remove oldest cell
    }
    botRecentCells.set(botId, recentCells);

    // Check if bot should enter idle state (1% chance - reduced frequency)
    if (!bot.isIdle && Math.random() < 0.01) {
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
    
    // Add trail effect - create trail every move but limit to 2 per bot (reduced from 3)
    // Remove oldest trail for this bot if already at max
    const botTrailsForThisBot = botTrails.filter(t => t.botId === botId);
    if (botTrailsForThisBot.length >= 2) {
        // Find and remove the oldest trail for this bot
        const oldestTrailIndex = botTrails.findIndex(t => t.botId === botId);
        if (oldestTrailIndex !== -1) {
            botTrails.splice(oldestTrailIndex, 1);
        }
    }
    
    // Add new trail using interpolated position (reduced opacity: 0.42 -> 0.25)
    botTrails.push({
        botId: botId,
        x: bot.x || (WIDTH * bot.col),
        y: bot.y || (WIDTH * bot.row),
        size: WIDTH - 1,
        direction: bot.isIdle ? 'idle' : bot.direction,
        frameIndex: bot.frameIndex,
        className: bot.className,
        opacity: 0.25,
        fadeSpeed: 0.04  // Faster fade (doubled from 0.02)
    });
    
    // Render loop handles all rendering now

    await delay(time);

    // If bot is idle, stay in same position and continue idle animation
    if (bot.isIdle) {
        lostSquare(target, time, direction, className, botIndex);
        return;
    }

    if (!mazeActive) {
        // Remove this bot and its trails
        activeBots = activeBots.filter(b => b.id !== botId);
        botTrails = botTrails.filter(t => t.botId !== botId);
        if (activeColorElements > 0) activeColorElements--;
        // Render loop will clear the bot automatically
        return false;
    }

    // ULTRA-SIMPLE AI - Use new minimal decision system
    const nextDirection = getNextDirection(row, col, direction, botId);

    // If bot is stuck (null direction), enter idle state
    if (nextDirection === null) {
        // Stay in place and become idle
        const botData = activeBots[botIndex];
        if (botData) {
            botData.isIdle = true;
            botData.direction = 'idle';
            botData.targetRow = row;
            botData.targetCol = col;
            botData.moveStartTime = time;
            botData.interpolation = 1.0; // Fully "arrived" at current position
        }
        
        // Schedule next check with idle duration
        setTimeout(() => {
            // Clear recent history to give bot a fresh start
            botRecentCells.delete(botId);
            // Try moving again
            lostSquare(target, time, direction, className, botIndex);
        }, 1000); // Wait 1 second before trying to move again
        
        return;
    }

    // Get next position based on decision
    const nextPoint = getNextPointInDirection(new Point(row, col), nextDirection);
    const nextTarget = getTarget(nextPoint.row, nextPoint.col);

    // Move to next position (or stay if somehow blocked)
    if (nextTarget && !nextTarget.classList.contains("blocker")) {
        lostSquare(nextTarget, time, nextDirection, className, botIndex);
    } else {
        // Stuck, stay in place and try again
        lostSquare(target, time, nextDirection, className, botIndex);
    }
}

// Update bot positions with smooth interpolation
function updateBotPositions() {
    const now = Date.now();

    activeBots.forEach(bot => {
        // Calculate interpolation progress (0 to 1)
        const elapsed = now - bot.moveStartTime;
        bot.interpolation = Math.min(1.0, elapsed / bot.moveDelay);

        // Smooth easing function (ease-out for more natural movement)
        const t = bot.interpolation;
        const eased = t * (2 - t); // Quadratic ease-out

        // Interpolate position
        const startX = WIDTH * bot.col;
        const startY = WIDTH * bot.row;
        const targetX = WIDTH * bot.targetCol;
        const targetY = WIDTH * bot.targetRow;

        bot.x = startX + (targetX - startX) * eased;
        bot.y = startY + (targetY - startY) * eased;

        // When interpolation complete, update logical position
        if (bot.interpolation >= 1.0) {
            bot.row = bot.targetRow;
            bot.col = bot.targetCol;
        }
    });
}

// Start requestAnimationFrame render loop
function startRenderLoop() {
    function renderFrame() {
        if (!mazeActive) {
            renderLoopId = null;
            return;
        }

        updateBotPositions(); // Update interpolated positions
        renderBots();
        renderLoopId = requestAnimationFrame(renderFrame);
    }

    if (!renderLoopId && mazeActive) {
        renderLoopId = requestAnimationFrame(renderFrame);
    }
}

// Stop render loop
function stopRenderLoop() {
    if (renderLoopId) {
        cancelAnimationFrame(renderLoopId);
        renderLoopId = null;
    }
}

// Render all active bots to canvas
function renderBots() {
    
    // Early exit if nothing to render
    if (activeBots.length === 0 && botTrails.length === 0) {
        return;
    }
    
    if (!window.mazeBotSprite || !window.mazeBotSprite.loaded) {
        return;
    }
    
    // Check if WebGL failed and fallback to Canvas2D
    if (useWebGL && webglRenderer && !webglRenderer.gl) {
        console.log('🔄 WebGL failed, switching to Canvas2D fallback');
        useWebGL = false;
        if (!botCtx) {
            botCtx = botCanvas.getContext('2d', { 
                alpha: true,
                desynchronized: true,
                willReadFrequently: false
            });
            botCtx.imageSmoothingEnabled = false;
        }
    }
    
    // Use WebGL renderer if available and ready
    if (useWebGL && webglRenderer && webglRenderer.isReady) {
        // Prepare trail data with reduced opacity
        const trailsWithOpacity = botTrails.map((trail, index) => {
            const botTrailsForThisBot = botTrails.filter(t => t.botId === trail.botId);
            const positionInTrail = botTrailsForThisBot.indexOf(trail);
            const opacity = 0.10 + (positionInTrail * 0.15); // oldest: 0.10, newest: 0.25
            return { ...trail, opacity, size: WIDTH };
        });
        
        // Prepare bot data with size and interpolated positions
        const botsWithSize = activeBots.map(bot => ({
            ...bot,
            size: WIDTH,
            // Use interpolated position if available
            row: bot.y !== undefined ? Math.floor(bot.y / WIDTH) : bot.row,
            col: bot.x !== undefined ? Math.floor(bot.x / WIDTH) : bot.col
        }));
        
        webglRenderer.render(botsWithSize, trailsWithOpacity, directionMap);
        return;
    }
    
    // Fallback to Canvas2D
    if (!botCtx) return;
    
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
        
        // Calculate fade based on position in bot's trail (reduced further)
        const botTrailsForThisBot = botTrails.filter(t => t.botId === trail.botId);
        const positionInTrail = botTrailsForThisBot.indexOf(trail);
        const opacity = 0.10 + (positionInTrail * 0.15); // oldest: 0.10, newest: 0.25

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
    
    // Draw each active bot on top using interpolated positions
    activeBots.forEach(bot => {
        // Use interpolated position for smooth movement
        const x = bot.x !== undefined ? bot.x : (WIDTH * bot.col);
        const y = bot.y !== undefined ? bot.y : (WIDTH * bot.row);

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
    botPreviousCell.clear(); // Clear bot memory
    botLastDirection.clear(); // Clear direction memory
    botRecentCells.clear(); // Clear recent cells history

    // Stop render loop
    stopRenderLoop();

    // Clear bug spawn timer
    if (bugSpawnTimer) {
        clearInterval(bugSpawnTimer);
        bugSpawnTimer = null;
    }

    // Destroy WebGL renderer
    if (webglRenderer) {
        webglRenderer.destroy();
        webglRenderer = null;
    }
    useWebGL = false;

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
        } else if (botCanvas) {
            // Minor resize - keep SVG and canvas in sync without rebuilding the maze
            syncLayerViewport();
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
