// Vibe Runner - Fast Neon Cyber Endless Runner
class VibeRunner {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.gameActive = false;
        this.distance = 0;
        this.highScore = parseInt(localStorage.getItem('vibeRunnerHighScore') || '0');
        
        // Player properties
        this.player = {
            x: 200,
            y: 300,
            size: 15,
            speed: 5,
            trail: [],
            angle: 0,
            glow: 0
        };
        
        // Game properties
        this.obstacles = [];
        this.particles = [];
        this.stars = [];
        this.gameSpeed = 8;
        this.frameCount = 0;
        this.nextObstacleDistance = 100;
        this.gridOffset = 0;
        this.difficulty = 1;
        
        // Level scripting / pattern options
        this.levelEndDistance = 10000; // meters
        this.useScripted = true; // default to scripted obstacle patterns
        this.trackOffsetPx = 0; // how far ahead we've built the track (in px)
        this.patternIndex = 0; // which pattern section we're on
        this.patternPhase = 0; // phase counter for path functions
        this.segmentSpacingPx = 120; // base spacing between obstacle columns (px)
        
        // Visual toggles
        this.enableGlow = true; // glow always on
        
        // Path management (ensures a continuous passable corridor)
        this.pathY = null;
        
        // Controls
        this.isPressed = false;
        
        // Performance optimization
        this.lastTime = 0;
        this.accumulator = 0;
        this.timeStep = 1000 / 60; // 60 FPS
        
        this.initGame();
    }
    
    initGame() {
        this.createGameModal();
        this.attachEventListeners();
    }
    
    createGameModal() {
        // Remove any existing game container
        const existing = document.getElementById('vibe-runner-container');
        if (existing) {
            existing.remove();
        }
        
        const gameContainer = document.createElement('div');
        gameContainer.id = 'vibe-runner-container';
        gameContainer.className = 'vibe-runner-hidden';
        gameContainer.innerHTML = `
            <div class="vibe-runner-overlay"></div>
            <div class="vibe-runner-modal">
                <button class="vibe-runner-close-x">✕</button>
                <div class="vibe-runner-header">
                    <div class="distance-meter">
                        <span class="distance-label">DISTANCE</span>
                        <span class="distance-value" id="distance-display">0m</span>
                    </div>
                    <div class="best-score">
                        <span class="best-label">BEST</span>
                        <span class="best-value" id="best-display">0m</span>
                    </div>
                </div>
                
                <div class="vibe-runner-game-area">
                    <canvas id="vibe-runner-canvas"></canvas>
                    <div class="vibe-runner-start-screen" id="start-screen">
                        <div class="game-logo">⚡ VIBE RUNNER ⚡</div>
                        <p class="game-instructions">Hold to fly UP ↗ • Release to fall DOWN ↘</p>
                        <button class="vibe-runner-btn neon-btn" id="start-runner">START</button>
                    </div>
                    <div class="vibe-runner-game-over" id="game-over-screen" style="display: none;">
                        <div class="game-over-title">GAME OVER</div>
                        <div class="final-stats">
                            <div class="stat-row">
                                <span>Distance:</span>
                                <span id="final-distance">0m</span>
                            </div>
                            <div class="stat-row">
                                <span>Best:</span>
                                <span id="final-best">0m</span>
                            </div>
                        </div>
                        <button class="vibe-runner-btn neon-btn" id="restart-runner">RETRY</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(gameContainer);
        this.addGameStyles();
    }
    
    addGameStyles() {
        // Remove existing style if present
        const existingStyle = document.getElementById('vibe-runner-styles');
        if (existingStyle) {
            existingStyle.remove();
        }
        
        const style = document.createElement('style');
        style.id = 'vibe-runner-styles';
        style.textContent = `
            @keyframes neonPulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.8; }
            }
            
            @keyframes glowPulse {
                0%, 100% { 
                    box-shadow: 0 0 20px rgba(0, 255, 255, 0.8),
                               0 0 40px rgba(0, 255, 255, 0.5),
                               0 0 60px rgba(0, 255, 255, 0.3);
                }
                50% { 
                    box-shadow: 0 0 30px rgba(0, 255, 255, 1),
                               0 0 60px rgba(0, 255, 255, 0.7),
                               0 0 90px rgba(0, 255, 255, 0.5);
                }
            }
            
            .vibe-runner-hidden {
                display: none !important;
            }
            
            #vibe-runner-container {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 99999;
                animation: fadeIn 0.3s ease;
            }
            
            /* Do not force-hide cursor here; inherit from page (desktop uses custom cursor via body, mobile uses auto) */
            
            .vibe-runner-overlay {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.95);
                backdrop-filter: blur(10px);
            }
            
            .vibe-runner-modal {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: linear-gradient(135deg, #0a0a1a 0%, #1a0a2a 100%);
                border-radius: 20px;
                padding: 0;
                width: 90%;
                max-width: 1000px;
                height: 90%;
                max-height: 650px;
                display: flex;
                flex-direction: column;
                border: 2px solid #00ffff;
                box-shadow: 0 0 40px rgba(0, 255, 255, 0.3),
                           inset 0 0 20px rgba(0, 255, 255, 0.1);
                overflow: hidden;
            }
            
            .vibe-runner-close-x {
                position: absolute;
                top: 10px;
                right: 10px;
                background: rgba(255, 0, 255, 0.1);
                border: 2px solid #ff00ff;
                color: #ff00ff;
                width: 40px;
                height: 40px;
                border-radius: 50%;
                font-size: 24px;
                font-weight: bold;
                cursor: inherit !important;
                transition: all 0.3s ease;
                z-index: 20;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .vibe-runner-close-x:hover {
                background: #ff00ff;
                color: #fff;
                transform: rotate(90deg);
                box-shadow: 0 0 20px rgba(255, 0, 255, 0.8);
            }
            
            .vibe-runner-header {
                padding: 15px 20px;
                border-bottom: 2px solid rgba(0, 255, 255, 0.3);
                display: flex;
                justify-content: center;
                gap: 50px;
                background: rgba(0, 20, 40, 0.5);
            }
            
            
            .distance-meter, .best-score {
                display: flex;
                align-items: center;
                gap: 15px;
                font-family: 'Courier New', monospace;
            }
            
            .distance-label, .best-label {
                color: rgba(0, 255, 255, 0.7);
                font-size: 14px;
                letter-spacing: 2px;
                text-transform: uppercase;
            }
            
            .distance-value, .best-value {
                color: #00ffff;
                font-size: 24px;
                font-weight: bold;
                text-shadow: 0 0 10px rgba(0, 255, 255, 0.8);
                min-width: 100px;
            }
            
            .vibe-runner-game-area {
                flex: 1;
                position: relative;
                background: #000;
                overflow: hidden;
            }
            
            #vibe-runner-canvas {
                width: 100%;
                height: 100%;
                display: block;
                cursor: inherit !important;
            }
            
            .vibe-runner-start-screen,
            .vibe-runner-game-over {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                text-align: center;
                background: linear-gradient(135deg, rgba(0, 0, 0, 0.9), rgba(0, 20, 40, 0.9));
                padding: 40px;
                border-radius: 20px;
                border: 2px solid #00ffff;
                color: #fff;
                z-index: 5;
                box-shadow: 0 0 40px rgba(0, 255, 255, 0.4),
                           inset 0 0 30px rgba(0, 255, 255, 0.1);
            }
            
            .game-logo {
                color: #00ffff;
                font-size: 32px;
                margin-bottom: 20px;
                text-shadow: 0 0 20px rgba(0, 255, 255, 0.8),
                            0 0 40px rgba(0, 255, 255, 0.5);
                font-family: 'Arial Black', sans-serif;
                animation: neonPulse 2s ease-in-out infinite;
            }
            
            .game-over-title {
                color: #ff0066;
                font-size: 36px;
                margin-bottom: 25px;
                text-shadow: 0 0 20px rgba(255, 0, 102, 0.8);
                font-family: 'Arial Black', sans-serif;
            }
            
            .game-instructions {
                color: rgba(255, 255, 255, 0.8);
                margin-bottom: 30px;
                font-size: 16px;
                font-family: 'Courier New', monospace;
            }
            
            .final-stats {
                margin: 20px 0 30px;
                font-family: 'Courier New', monospace;
            }
            
            .stat-row {
                display: flex;
                justify-content: space-between;
                margin: 10px 0;
                font-size: 20px;
                color: #00ffff;
                min-width: 200px;
            }
            
            .neon-btn {
                padding: 12px 40px;
                background: transparent;
                border: 2px solid #00ffff;
                color: #00ffff;
                font-weight: bold;
                font-size: 18px;
                cursor: inherit !important;
                transition: all 0.3s ease;
                text-transform: uppercase;
                letter-spacing: 2px;
                font-family: 'Arial', sans-serif;
                border-radius: 30px;
                position: relative;
                overflow: hidden;
            }
            
            .neon-btn::before {
                content: '';
                position: absolute;
                top: 0;
                left: -100%;
                width: 100%;
                height: 100%;
                background: linear-gradient(90deg, transparent, #00ffff, transparent);
                transition: left 0.5s ease;
            }
            
            .neon-btn:hover {
                background: rgba(0, 255, 255, 0.1);
                box-shadow: 0 0 30px rgba(0, 255, 255, 0.8),
                           inset 0 0 20px rgba(0, 255, 255, 0.2);
                transform: translateY(-2px);
            }
            
            .neon-btn:hover::before {
                left: 100%;
            }
            
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            
            @media (max-width: 600px) {
                .vibe-runner-modal {
                    width: 95%;
                    height: 95%;
                    border-radius: 10px;
                }
                
                .distance-meter, .best-score {
                    gap: 10px;
                }
                
                .distance-value, .best-value {
                    font-size: 18px;
                }
                
                .game-logo {
                    font-size: 24px;
                }
            }

            @media (max-width: 480px) {
                .vibe-runner-header { gap: 12px; padding: 10px 12px; }
                .distance-label, .best-label { font-size: 12px; }
                .distance-value, .best-value { font-size: 16px; min-width: initial; }
                .vibe-runner-close-x { top: 6px; right: 6px; width: 32px; height: 32px; font-size: 18px; }
            }
        `;
        document.head.appendChild(style);
    }
    
    attachEventListeners() {
        // Track clicks for double-click detection
        this.clickCounts = new Map();
        this.clickTimers = new Map();
        
        // Helper function to add both click and touch events
        const addDoubleClickEvents = (element, triggerType) => {
            const handler = (e) => {
                e.preventDefault();
                this.handleDoubleClickTrigger(element, triggerType);
            };
            
            // Add both click and touchend events for mobile compatibility
            element.addEventListener('click', handler);
            element.addEventListener('touchend', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.handleDoubleClickTrigger(element, triggerType);
            }, { passive: false });
        };
        
        // Main logo requires two clicks/touches (exclude header logo)
        const mainLogos = document.querySelectorAll('.hero-title, .glitch-text, #logo-text-container');
        mainLogos.forEach(logo => {
            if (!logo) return;
            logo.style.cursor = 'pointer';
            addDoubleClickEvents(logo, 'main-logo');
        });
        
        // Stay Tuned button also requires two clicks/touches
        const stayTunedButtons = document.querySelectorAll('.app-button');
        stayTunedButtons.forEach(button => {
            if (!button || button.textContent.trim() !== 'STAY TUNED') return;
            button.style.cursor = 'pointer';
            addDoubleClickEvents(button, 'stay-tuned');
        });
    }
    
    showGamePrompt() {
        // Check if prompt already exists and remove it
        const existingPrompt = document.querySelector('.vibe-game-prompt');
        if (existingPrompt) {
            existingPrompt.remove();
        }
        
        // Remove existing prompt styles to avoid conflicts
        const existingStyles = document.querySelectorAll('style');
        existingStyles.forEach(style => {
            if (style.textContent.includes('.vibe-game-prompt')) {
                style.remove();
            }
        });
        
        const promptDiv = document.createElement('div');
        promptDiv.className = 'vibe-game-prompt';
        promptDiv.innerHTML = `
            <div class="vibe-prompt-content">
                <h3>🎮 Secret Game Unlocked! 🎮</h3>
                <p>You've discovered the Vibe Runner!</p>
                <p>Navigate through cyber space and survive!</p>
                <div class="vibe-prompt-buttons">
                    <button class="vibe-prompt-play">Play</button>
                    <button class="vibe-prompt-cancel">Cancel</button>
                </div>
            </div>
        `;
        
        const promptStyle = document.createElement('style');
        promptStyle.id = 'vibe-game-prompt-styles';
        promptStyle.textContent = `
            .vibe-game-prompt {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: linear-gradient(135deg, #0a0a1a, #1a0a2a);
                border: 2px solid #00ffff;
                border-radius: 15px;
                padding: 30px;
                z-index: 100000;
                animation: promptBounce 0.5s ease;
                box-shadow: 0 0 40px rgba(0, 255, 255, 0.5);
            }
            
            .vibe-prompt-content h3 {
                color: #00ffff;
                margin-bottom: 15px;
                text-align: center;
                font-size: 24px;
                text-shadow: 0 0 20px rgba(0, 255, 255, 0.8);
            }
            
            .vibe-prompt-content p {
                color: #fff;
                margin-bottom: 10px;
                text-align: center;
                font-size: 14px;
            }
            
            .vibe-prompt-buttons {
                display: flex;
                gap: 15px;
                justify-content: center;
                margin-top: 20px;
            }
            
            .vibe-prompt-buttons button {
                padding: 10px 25px;
                border: 2px solid #00ffff;
                background: transparent;
                color: #00ffff;
                font-weight: bold;
                cursor: inherit;
                transition: all 0.3s ease;
                font-size: 14px;
                border-radius: 20px;
            }
            
            .vibe-prompt-buttons button:hover {
                background: rgba(0, 255, 255, 0.2);
                box-shadow: 0 0 20px rgba(0, 255, 255, 0.5);
            }
            
            @keyframes promptBounce {
                0% { transform: translate(-50%, -50%) scale(0.8); opacity: 0; }
                50% { transform: translate(-50%, -50%) scale(1.1); }
                100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
            }
        `;
        document.head.appendChild(promptStyle);
        document.body.appendChild(promptDiv);
        
        // Use proper event handling with immediate removal
        const handlePlay = (e) => {
            e.preventDefault();
            e.stopPropagation();
            promptDiv.remove();
            const style = document.getElementById('vibe-game-prompt-styles');
            if (style) style.remove();
            this.openGame();
        };
        
        const handleCancel = (e) => {
            e.preventDefault();
            e.stopPropagation();
            promptDiv.remove();
            const style = document.getElementById('vibe-game-prompt-styles');
            if (style) style.remove();
        };
        
        promptDiv.querySelector('.vibe-prompt-play').addEventListener('click', handlePlay);
        promptDiv.querySelector('.vibe-prompt-cancel').addEventListener('click', handleCancel);
    }
    
    handleDoubleClickTrigger(element, triggerType) {
        const elementKey = `${triggerType}-${element.tagName}-${element.className}`;
        
        // Initialize or increment click count
        const currentCount = this.clickCounts.get(elementKey) || 0;
        this.clickCounts.set(elementKey, currentCount + 1);
        
        // Clear existing timer if any
        if (this.clickTimers.has(elementKey)) {
            clearTimeout(this.clickTimers.get(elementKey));
        }
        
        // Check if we've reached 2 clicks
        if (this.clickCounts.get(elementKey) >= 2) {
            // Reset count and show game prompt
            this.clickCounts.set(elementKey, 0);
            this.showGamePrompt();
            return;
        }
        
        // Set timer to reset count after 1.5 seconds
        const timer = setTimeout(() => {
            this.clickCounts.set(elementKey, 0);
            this.clickTimers.delete(elementKey);
        }, 1500);
        
        this.clickTimers.set(elementKey, timer);
        
        // Visual feedback for first click
        this.showClickFeedback(element, triggerType);
    }
    
    showClickFeedback(element, triggerType) {
        // Add subtle visual feedback to indicate first click registered
        const originalTransform = element.style.transform;
        const originalTextShadow = element.style.textShadow;
        
        element.style.transform = 'scale(1.05)';
        element.style.textShadow = '0 0 15px rgba(0, 255, 255, 0.8)';
        element.style.transition = 'all 0.2s ease';
        
        setTimeout(() => {
            element.style.transform = originalTransform;
            element.style.textShadow = originalTextShadow;
        }, 200);
    }
    
    openGame() {
        const container = document.getElementById('vibe-runner-container');
        container.classList.remove('vibe-runner-hidden');
        
        // Reset to start screen
        document.getElementById('start-screen').style.display = 'block';
        document.getElementById('game-over-screen').style.display = 'none';
        document.getElementById('distance-display').textContent = '0m';
        
        // Stop any active game
        if (this.gameActive) {
            this.gameActive = false;
            if (this.animationId) {
                cancelAnimationFrame(this.animationId);
            }
        }
        
        
        // Update best score display
        document.getElementById('best-display').textContent = this.highScore + 'm';
        
        this.setupCanvas();
        this.setupGameControls();
    }
    
    // Mobile detection function matching the main page
    isMobileDevice() {
        // Check for mobile user agents
        const mobileUserAgents = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        // Check for touch devices, but exclude desktop touch screens
        const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        
        // More specific mobile detection - combine user agent with screen size and touch
        const isSmallScreen = window.innerWidth <= 768 && window.innerHeight <= 1024;
        
        // Return true only if it's actually a mobile device
        return mobileUserAgents || (isTouchDevice && isSmallScreen);
    }
    
    closeGame() {
        const container = document.getElementById('vibe-runner-container');
        container.classList.add('vibe-runner-hidden');
        
        if (this.gameActive) {
            this.gameActive = false;
            cancelAnimationFrame(this.animationId);
        }
        
        // Use the same mobile detection function as main page
        const isMobile = this.isMobileDevice();
        
        if (!isMobile) {
            // Restore custom cursor on desktop
            const cursor = document.querySelector('.cursor');
            const cursorFollower = document.querySelector('.cursor-follower');
            if (cursor) cursor.style.display = 'block';
            if (cursorFollower) cursorFollower.style.display = 'block';
            document.body.style.cursor = 'none';
        } else {
            // Restore default cursor on mobile
            document.body.style.cursor = 'auto';
        }
    }
    
    setupCanvas() {
        this.canvas = document.getElementById('vibe-runner-canvas');
        this.ctx = this.canvas.getContext('2d');
        
        const gameArea = document.querySelector('.vibe-runner-game-area');
        this.canvas.width = gameArea.clientWidth;
        this.canvas.height = gameArea.clientHeight;
        
        // Initialize stars for background
        this.initStars();
        
        // Handle window resize
        window.addEventListener('resize', () => {
            if (this.canvas && gameArea) {
                this.canvas.width = gameArea.clientWidth;
                this.canvas.height = gameArea.clientHeight;
                this.initStars();
            }
        });
    }
    
    setupGameControls() {
        // Game button controls
        document.getElementById('start-runner')?.addEventListener('click', () => this.startGame());
        document.getElementById('restart-runner')?.addEventListener('click', () => this.restartGame());
        document.querySelector('.vibe-runner-close-x')?.addEventListener('click', () => this.closeGame());
        document.querySelector('.vibe-runner-overlay')?.addEventListener('click', () => this.closeGame());
        
        // Canvas controls
        this.canvas.addEventListener('mousedown', () => this.isPressed = true);
        this.canvas.addEventListener('mouseup', () => this.isPressed = false);
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.isPressed = true;
        }, { passive: false });
        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.isPressed = false;
        }, { passive: false });
        this.canvas.addEventListener('mouseleave', () => this.isPressed = false);
        
        // ESC to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !document.getElementById('vibe-runner-container').classList.contains('vibe-runner-hidden')) {
                this.closeGame();
            }
        });
    }
    
    initStars() {
        this.stars = [];
        for (let i = 0; i < 100; i++) {
            this.stars.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                size: Math.random() * 2,
                speed: Math.random() * 2 + 1
            });
        }
    }
    
    startGame() {
        document.getElementById('start-screen').style.display = 'none';
        document.getElementById('game-over-screen').style.display = 'none';
        
        // Reset game state
        this.distance = 0;
        this.gameSpeed = 4;
        this.difficulty = 1;
        this.obstacles = [];
        this.particles = [];
        this.frameCount = 0;
        this.nextObstacleDistance = 100;
        this.gridOffset = 0;
        
        // Reset player
        this.player.x = Math.max(60, Math.min(240, this.canvas.width * 0.22));
        this.player.y = this.canvas.height / 2;
        this.player.trail = [];
        this.player.angle = 0;
        this.player.glow = 0;
        
        // Reset path corridor
        this.pathY = this.canvas.height / 2;
        
        // Reset scripted generation state
        this.trackOffsetPx = 0;
        this.patternIndex = 0;
        this.patternPhase = 0;
        this.nextObstacleDistance = 30; // quickly start spawning the first section
        
        // Reset game-over title text
        const gameOverTitle = document.querySelector('.game-over-title');
        if (gameOverTitle) gameOverTitle.textContent = 'GAME OVER';
        
        this.gameActive = true;
        this.lastTime = performance.now();
        this.gameLoop(this.lastTime);
    }
    
    restartGame() {
        this.startGame();
    }
    
    gameLoop(currentTime) {
        if (!this.gameActive) return;
        
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;
        
        // Fixed timestep for consistent physics
        this.accumulator += deltaTime;
        
        while (this.accumulator >= this.timeStep) {
            this.update(this.timeStep / 1000);
            this.accumulator -= this.timeStep;
        }
        
        this.draw();
        this.animationId = requestAnimationFrame((time) => this.gameLoop(time));
    }
    
    update(dt) {
        this.frameCount++;
        
        // Update distance (use float accumulation, show integer)
        this.distance += this.gameSpeed * 0.2;
        document.getElementById('distance-display').textContent = Math.floor(this.distance) + 'm';
        
        // Update difficulty based on distance
        this.difficulty = 1 + Math.floor(this.distance / 500);
        // Compute a target speed that grows very gradually with distance
        const minSpeed = 4; // slower start for approach speed
        const maxSpeed = 15; // current top speed
        const rampDistance = 4500; // meters to reach near max more gradually
        const t = Math.min(1, this.distance / rampDistance);
        // Smoothstep easing (gentler through the middle than cosine)
        const smooth = t * t * (3 - 2 * t);
        const targetSpeed = minSpeed + (maxSpeed - minSpeed) * smooth;
        // Cap acceleration per second to prevent sudden jumps
        const accelPerSec = 2.5; // units per second
        const maxDelta = accelPerSec * dt;
        this.gameSpeed += Math.max(-maxDelta, Math.min(maxDelta, targetSpeed - this.gameSpeed));
        
        // Update grid offset for scrolling effect
        this.gridOffset -= this.gameSpeed;
        if (this.gridOffset <= -60) {
            this.gridOffset = 0;
        }
        
        // Update player position - 45 degree movement
        if (this.isPressed) {
            this.player.y -= this.player.speed;
            this.player.angle = -45;
            this.player.glow = Math.min(this.player.glow + 0.1, 1);
        } else {
            this.player.y += this.player.speed * 1.3;
            this.player.angle = 45;
            this.player.glow = Math.max(this.player.glow - 0.1, 0);
        }
        
        // Keep player in bounds
        if (this.player.y < 20) {
            this.player.y = 20;
        }
        if (this.player.y > this.canvas.height - 20) {
            this.player.y = this.canvas.height - 20;
        }

        // Face forward (0°) at the top or bottom edges
        const atEdge = (this.player.y <= 20 || this.player.y >= this.canvas.height - 20);
        if (atEdge) {
            this.player.angle = 0;
        }
        
        // Pull player back to optimal X position (responsive for mobile/narrow screens)
        const targetX = Math.max(60, Math.min(240, this.canvas.width * 0.22));
        this.player.x += (targetX - this.player.x) * 0.08;
        
        // Update trail with 45-degree segments (horizontal when at edges)
        if (this.frameCount % 2 === 0) { // Add trail points every 2 frames for smoother lines
            this.player.trail.push({
                x: this.player.x,
                y: this.player.y,
                angle: this.player.angle,
                life: 1.0,
                direction: atEdge ? 'flat' : (this.isPressed ? 'up' : 'down')
            });
        }
        
        // Fade trail
        for (let i = this.player.trail.length - 1; i >= 0; i--) {
            this.player.trail[i].life -= 0.025;
            if (this.player.trail[i].life <= 0) {
                this.player.trail.splice(i, 1);
            }
        }
        
        if (this.player.trail.length > 40) {
            this.player.trail.shift();
        }
        
        // Generate next section (scripted or procedural)
        if (this.distance > this.nextObstacleDistance) {
            this.generateNextSection();
        }
        
        // Update obstacles
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const obstacle = this.obstacles[i];
            obstacle.x -= this.gameSpeed;
            
            // Remove off-screen obstacles
            if (obstacle.x + obstacle.maxWidth < 0) {
                this.obstacles.splice(i, 1);
                continue;
            }
            
            // Check collision
            if (this.checkCollision(obstacle)) {
                this.gameOver();
                return;
            }
        }
        
        // Update particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            particle.x -= this.gameSpeed * 0.5;
            particle.y += particle.vy;
            particle.life -= 0.02;
            
            if (particle.life <= 0 || particle.x < -10) {
                this.particles.splice(i, 1);
            }
        }
        
        // Add new particles
        if (Math.random() < 0.3) {
            this.particles.push({
                x: this.player.x - 10,
                y: this.player.y + (Math.random() - 0.5) * 10,
                vy: (Math.random() - 0.5) * 2,
                size: Math.random() * 3 + 1,
                life: 1.0,
                color: this.isPressed ? '#00ffff' : '#ff00ff'
            });
        }
        
        // Update stars
        for (const star of this.stars) {
            star.x -= star.speed;
            if (star.x < 0) {
                star.x = this.canvas.width;
                star.y = Math.random() * this.canvas.height;
            }
        }
    }
    
    generateProceduralObstacle() {
        // Patterns with unlock distance and density flag
        const candidates = [
            { id: 'single',  fn: (o,opts) => this.createSingleBlock(o, opts),      min: 0,    dense: true  },
            { id: 'cluster', fn: (o,opts) => this.createRandomCluster(o, opts),    min: 300,  dense: true  },
            { id: 'triangle',fn: (o,opts) => this.createTriangleObstacle(o, opts), min: 400,  dense: false },
            { id: 'diamond', fn: (o,opts) => this.createDiamondObstacle(o, opts),  min: 700,  dense: false },
            { id: 'zigzag',  fn: (o,opts) => this.createZigzag(o, opts),           min: 600,  dense: true  },
            { id: 'double',  fn: (o,opts) => this.createDoubleStack(o, opts),      min: 1000, dense: true  },
            { id: 'tunnel',  fn: (o,opts) => this.createTunnel(o, opts),           min: 1000, dense: false }
        ];
        
        // Filter by distance and open more options gradually by difficulty
        const unlocked = candidates.filter(c => this.distance >= c.min);
        const maxOptions = Math.max(1, Math.min(unlocked.length, 2 + Math.floor(this.difficulty)));
        const pool = unlocked.slice(0, maxOptions);
        const choice = pool[Math.floor(Math.random() * pool.length)] || candidates[0];
        
        // Depth: chance and magnitude increase with distance
        const depthChance = Math.min(0.6, 0.12 + (this.distance / 3500));
        const maxDepthBase = choice.dense ? 3 : 6;
        const maxDepth = Math.min(maxDepthBase, 1 + Math.floor(this.distance / 700));
        const depth = Math.random() < depthChance ? 1 + Math.floor(Math.random() * maxDepth) : 1;
        const segmentSpacing = Math.max(90, 160 - this.difficulty * 8);
        
        // Compute safe corridor (continuous passable path)
        const minGap = Math.max(80, 140 - this.difficulty * 6);
        const margin = 24;
        const maxDrift = Math.max(20, 60 - this.difficulty * 5);
        const drift = (Math.random() * 2 - 1) * maxDrift;
        let corridorY = (this.pathY ?? this.canvas.height / 2) + drift;
        const halfGap = minGap / 2;
        corridorY = Math.max(margin + halfGap, Math.min(this.canvas.height - margin - halfGap, corridorY));
        this.pathY = corridorY;
        const opts = { corridorY, gap: minGap, margin };
        
        for (let s = 0; s < depth; s++) {
            choice.fn(s * segmentSpacing, opts);
        }
    }
    
    generateNextSection() {
        if (!this.useScripted) {
            // Fallback to existing procedural generator
            this.generateProceduralObstacle();
            const spacing = Math.max(150, 300 - this.difficulty * 20);
            this.nextObstacleDistance = this.distance + spacing + Math.random() * 100;
            return;
        }

        // Difficulty scaling 0..1 over level distance
        const progress = Math.min(1, this.distance / this.levelEndDistance);
        const margin = 24;
        const halfH = this.canvas.height / 2;
        const maxAmp = Math.max(50, this.canvas.height * 0.4);

        // Zones
        const earlyGame = this.distance < 1500;
        const midGame = this.distance >= 1500 && this.distance < 5000;
        const lateGame = this.distance >= 5000 && this.distance < 8000;
        const endGame = this.distance >= 8000;

        // Gap tightens and speed of path movement increases with distance
        const maxAllowedGap = Math.max(60, this.canvas.height - 2 * margin - 40);
        const startGap = Math.min(maxAllowedGap, Math.floor(this.canvas.height * 0.62));
        const endGapFloor = Math.max(80, Math.floor(this.canvas.height * 0.22));
        const endGap = Math.min(maxAllowedGap, endGapFloor);
        const gap = Math.max(endGap, Math.min(maxAllowedGap, Math.floor(startGap - (startGap - endGap) * progress)));
        const amplitude = Math.min(maxAmp, 45 + progress * (maxAmp - 45));
        this.segmentSpacingPx = Math.max(70, 125 - Math.floor(progress * 40));

        // Pattern selection inspired by your references
        // 0: Ramp Up  1: Ramp Down  2: V-Valley (top wedge)  3: Peak (bottom wedge)
        // 4: Ceiling Teeth  5: Floor Teeth  6: Diamond Lane (slalom)
        const mode = this.patternIndex % 7;
        const steps = 14 + Math.floor(progress * 12); // 14..26 columns per section
        const wavelength = 8 + Math.floor(progress * 6);
        const centerIndex = Math.floor(steps / 2);
        const baseX = this.trackOffsetPx;
        const yClamp = (y) => Math.max(margin + gap / 2, Math.min(this.canvas.height - margin - gap / 2, y));

        // Pre-place large wedges for valley/peak patterns to create dramatic triangles like the references
        let wedgeStartIdx = -1, wedgeEndIdx = -1;
        if (mode === 2 || mode === 3) {
            const spanCols = Math.max(5, Math.floor(6 + progress * 4));
            const widthPx = spanCols * this.segmentSpacingPx;
            wedgeStartIdx = Math.max(0, centerIndex - Math.floor(spanCols / 2));
            wedgeEndIdx = Math.min(steps - 1, wedgeStartIdx + spanCols - 1);
            const xStart = baseX + wedgeStartIdx * this.segmentSpacingPx;
            // Apex position uses the corridor center at the section middle, leaving some breathing room (35% of gap)
            const yAtCenter = yClamp(halfH); // initial, refined below in loop by yFor but good enough for apex
            if (mode === 2) {
                // Top wedge pointing down
                const apexY = Math.max(margin + 50, yAtCenter - gap * 0.35);
                const heightFromTop = Math.max(60, Math.min(this.canvas.height - margin, apexY));
                this.createWedgeAt(xStart, widthPx, heightFromTop, 'down');
            } else {
                // Bottom wedge pointing up
                const apexYFromBottom = Math.max(margin + 50, this.canvas.height - (yAtCenter + gap * 0.35));
                const heightFromBottom = Math.max(60, Math.min(this.canvas.height - margin, apexYFromBottom));
                this.createWedgeAt(xStart, widthPx, heightFromBottom, 'up');
            }
        }

        // Helper to spawn a single column and attach pattern-specific hazards
        const spawnColumnAt = (i, yCenter) => {
            const y = yClamp(yCenter);
            const xOffset = this.trackOffsetPx + i * this.segmentSpacingPx;
            const topEdge = y - gap / 2;
            const bottomEdge = y + gap / 2;
            const wallWidth = 60; // inner corridor edge lies at x = xOffset + wallWidth

            // Always create the corridor walls, but skip the side inside a wedge span to avoid visual overlap
            const skipTop = (mode === 2 && i >= wedgeStartIdx && i <= wedgeEndIdx);
            const skipBottom = (mode === 3 && i >= wedgeStartIdx && i <= wedgeEndIdx);
            this.createDoubleStack(xOffset, { corridorY: y, gap, margin, skipTop, skipBottom });

            // When a large wedge is present, sprinkle a few alternating up/down small spikes inside the gap
            if ((mode === 2 || mode === 3) && i >= wedgeStartIdx && i <= wedgeEndIdx) {
                const idx = i - wedgeStartIdx;
                if (idx % 3 === 1) {
                    const ori = (idx % 2 === 0) ? 'top' : 'bottom';
                    const eY = ori === 'top' ? topEdge : bottomEdge;
                    const sizeAlt = Math.max(10, Math.min(Math.floor(gap * 0.1), 18));
                    // Place a bit into the corridor so it doesn't touch the wall line
                    const xInside = xOffset + wallWidth + Math.floor(this.segmentSpacingPx * 0.35);
                    this.createSpikeAt(xInside, eY, sizeAlt, ori);
                }
            }

            // Base sizes
            const baseSpike = Math.min(Math.floor(gap * 0.18), 26) + Math.floor(progress * 6);
            const smallSpike = Math.max(12, Math.min(Math.floor(gap * 0.12), 20));

            // Pattern-driven hazards
            if (mode === 0) {
                // Ramp Up: move corridor upward; punish the ceiling with frequent teeth
                if (i % 2 === 0 || midGame || lateGame) {
                    this.createSpikeAt(xOffset + wallWidth, topEdge, baseSpike, 'top');
                }
                if ((lateGame || endGame) && i % 5 === 2 && gap > 120) {
                    const size = Math.min(28, Math.floor(gap * 0.16));
                    this.createDiamondAt(xOffset + Math.floor(this.segmentSpacingPx / 2), y + (Math.random() - 0.5) * gap * 0.25, size);
                }
            } else if (mode === 1) {
                // Ramp Down: move corridor downward; punish the floor
                if (i % 2 === 0 || midGame || lateGame) {
                    this.createSpikeAt(xOffset + wallWidth, bottomEdge, baseSpike, 'bottom');
                }
                if ((lateGame || endGame) && i % 5 === 3 && gap > 120) {
                    const size = Math.min(28, Math.floor(gap * 0.16));
                    this.createDiamondAt(xOffset + Math.floor(this.segmentSpacingPx / 2), y + (Math.random() - 0.5) * gap * 0.25, size);
                }
            } else if (mode === 2) {
                // V-Valley (top wedge already placed). Approach teeth on ceiling before center, floor after
                if (i < centerIndex) {
                    if (i % 2 === 0) this.createSpikeAt(xOffset + 10, topEdge, smallSpike, 'top');
                } else if (i > centerIndex) {
                    if (i % 2 === 0) this.createSpikeAt(xOffset + 10, bottomEdge, smallSpike, 'bottom');
                }
            } else if (mode === 3) {
                // Peak (bottom wedge already placed). Approach teeth on floor before center, ceiling after
                if (i < centerIndex) {
                    if (i % 2 === 0) this.createSpikeAt(xOffset + wallWidth, bottomEdge, smallSpike, 'bottom');
                } else if (i > centerIndex) {
                    if (i % 2 === 0) this.createSpikeAt(xOffset + wallWidth, topEdge, smallSpike, 'top');
                }
            } else if (mode === 4) {
                // Ceiling teeth corridor (nearly continuous)
                if (i % 1 === 0) this.createSpikeAt(xOffset + wallWidth, topEdge, smallSpike, 'top');
                if ((midGame || lateGame) && i % 4 === 1) {
                    const size = Math.min(26, Math.floor(gap * 0.15));
                    this.createDiamondAt(xOffset + Math.floor(this.segmentSpacingPx * 0.55), y + (Math.random() - 0.5) * gap * 0.2, size);
                }
            } else if (mode === 5) {
                // Floor teeth corridor
                if (i % 1 === 0) this.createSpikeAt(xOffset + wallWidth, bottomEdge, smallSpike, 'bottom');
                if ((midGame || lateGame) && i % 4 === 2) {
                    const size = Math.min(26, Math.floor(gap * 0.15));
                    this.createDiamondAt(xOffset + Math.floor(this.segmentSpacingPx * 0.55), y + (Math.random() - 0.5) * gap * 0.2, size);
                }
            } else {
                // Diamond lane slalom + occasional opposite-side teeth
                if (i % 3 !== 0) {
                    const size = Math.min(24 + Math.floor(progress * 6), Math.floor(gap * 0.2));
                    const offsetY = (i % 2 === 0 ? -1 : 1) * gap * 0.25;
                    this.createDiamondAt(xOffset + Math.floor(this.segmentSpacingPx / 2), y + offsetY, size);
                }
                if ((lateGame || endGame) && i % 4 === 0) {
                    const orient = i % 8 === 0 ? 'top' : 'bottom';
                    const edgeY = orient === 'top' ? topEdge : bottomEdge;
                    this.createSpikeAt(xOffset + wallWidth, edgeY, smallSpike, orient);
                }
            }

            // Extra brutality for end game
            if (endGame && i % 6 === 3 && gap > 110) {
                const b = Math.min(30, Math.floor(gap * 0.16));
                const fy = y + Math.sin((this.patternPhase + i) * 0.5) * gap * 0.22;
                this.createFloatingBlock(xOffset + Math.floor(this.segmentSpacingPx * 0.4), fy, b, b);
            }
        };

        // Y path per pattern (keeps the corridor style while creating the ramp/valley feel)
        const yFor = (i) => {
            const t = this.patternPhase + i;
            if (mode === 0) {
                // Ramp Up
                const start = yClamp(halfH + amplitude * 0.5);
                const end = yClamp(halfH - amplitude * 0.5);
                return start + (end - start) * (i / Math.max(1, steps - 1));
            }
            if (mode === 1) {
                // Ramp Down
                const start = yClamp(halfH - amplitude * 0.5);
                const end = yClamp(halfH + amplitude * 0.5);
                return start + (end - start) * (i / Math.max(1, steps - 1));
            }
            if (mode === 2) {
                // V-Valley (lowest at center)
                const k = (Math.abs(i - centerIndex) / Math.max(1, centerIndex)); // 0 at center .. 1 at ends
                return yClamp(halfH + (1 - k * 2) * amplitude * 0.8); // center -> +amplitude
            }
            if (mode === 3) {
                // Peak (highest at center)
                const k = (Math.abs(i - centerIndex) / Math.max(1, centerIndex));
                return yClamp(halfH - (1 - k * 2) * amplitude * 0.8); // center -> -amplitude
            }
            if (mode === 4) {
                // Mild wave with ceiling teeth
                return yClamp(halfH + amplitude * 0.35 * Math.sin((2 * Math.PI * t) / wavelength));
            }
            if (mode === 5) {
                // Mild wave with floor teeth
                return yClamp(halfH + amplitude * 0.35 * Math.sin((2 * Math.PI * (t + wavelength / 2)) / wavelength));
            }
            // Diamond lane S-curves
            const primary = Math.sin((2 * Math.PI * t) / wavelength);
            const secondary = Math.sin((4 * Math.PI * t) / wavelength) * 0.25;
            return yClamp(halfH + amplitude * 0.45 * (primary + secondary));
        };

        // Build the section
        for (let i = 0; i < steps; i++) {
            spawnColumnAt(i, yFor(i));
        }

        // Advance build head and schedule next
        this.trackOffsetPx += steps * this.segmentSpacingPx;
        this.patternPhase += steps;
        this.patternIndex++;
        const metersPerPx = 0.2;
        const sectionMeters = steps * this.segmentSpacingPx * metersPerPx;
        this.nextObstacleDistance = this.distance + Math.max(60, sectionMeters * 0.4);

        // Check for level completion
        if (this.levelEndDistance && this.distance >= this.levelEndDistance - 1) {
            this.winGame();
        }
    }
    
    winGame() {
        if (!this.gameActive) return;
        this.gameActive = false;
        const title = document.querySelector('.game-over-title');
        if (title) title.textContent = 'RUN COMPLETE';
        document.getElementById('final-distance').textContent = Math.floor(Math.max(this.distance, this.levelEndDistance)) + 'm';
        document.getElementById('final-best').textContent = this.highScore + 'm';
        document.getElementById('game-over-screen').style.display = 'block';
    }
    
    // --- Extra hazard helpers (spikes and diamonds) ---
    createSpikeAt(xOffsetPx, edgeY, size, orientation /* 'top' | 'bottom' */) {
        const h = this.canvas.height;
        const y = orientation === 'top'
            ? Math.max(0, Math.min(h - size, edgeY - size))
            : Math.max(0, Math.min(h - size, edgeY));
        const points = orientation === 'top'
            ? [ { x: 0, y: 0 }, { x: size, y: 0 }, { x: size / 2, y: size } ] // apex down
            : [ { x: 0, y: size }, { x: size, y: size }, { x: size / 2, y: 0 } ]; // apex up
        this.obstacles.push({
            x: this.canvas.width + xOffsetPx,
            triangles: [ { type: 'triangle', x: 0, y, points } ],
            maxWidth: size
        });
    }
    
    createDiamondAt(xOffsetPx, centerY, size) {
        const h = this.canvas.height;
        const y = Math.max(0, Math.min(h - size * 2, centerY - size));
        this.obstacles.push({
            x: this.canvas.width + xOffsetPx,
            triangles: [{
                type: 'diamond',
                x: 0,
                y,
                points: [
                    { x: size / 2, y: 0 },
                    { x: size, y: size },
                    { x: size / 2, y: size * 2 },
                    { x: 0, y: size }
                ]
            }],
            maxWidth: size
        });
    }
    
    createFloatingBlock(xOffsetPx, centerY, width, height) {
        const y = Math.max(0, Math.min(this.canvas.height - height, centerY - height/2));
        this.obstacles.push({
            x: this.canvas.width + xOffsetPx,
            blocks: [{ x: 0, y, width, height }],
            maxWidth: width
        });
    }

    // Large triangle wedge spanning multiple columns (for V-valleys and peaks)
    // orientation: 'down' (from top, apex points down) or 'up' (from bottom, apex points up)
    createWedgeAt(xOffsetPx, widthPx, heightPx, orientation /* 'down' | 'up' */) {
        const clampH = Math.max(20, Math.min(this.canvas.height - 20, heightPx));
        if (orientation === 'down') {
            this.obstacles.push({
                x: this.canvas.width + xOffsetPx,
                triangles: [{
                    type: 'triangle',
                    x: 0,
                    y: 0,
                    points: [ { x: 0, y: 0 }, { x: widthPx, y: 0 }, { x: widthPx / 2, y: clampH } ]
                }],
                maxWidth: widthPx
            });
        } else {
            this.obstacles.push({
                x: this.canvas.width + xOffsetPx,
                triangles: [{
                    type: 'triangle',
                    x: 0,
                    y: this.canvas.height - clampH,
                    points: [ { x: 0, y: clampH }, { x: widthPx, y: clampH }, { x: widthPx / 2, y: 0 } ]
                }],
                maxWidth: widthPx
            });
        }
    }
    
    createSingleBlock(xOffset = 0, opts = null) {
        const width = 40 + Math.random() * 40;
        let height = 50 + Math.random() * 150;
        let y;
        
        if (opts) {
            const topLimit = opts.corridorY - opts.gap / 2 - opts.margin - height;
            const bottomStart = opts.corridorY + opts.gap / 2 + opts.margin;
            const topSpace = Math.max(0, topLimit);
            const bottomSpace = Math.max(0, this.canvas.height - bottomStart - height);
            // Choose side with more space to avoid blocking the corridor
            if (topSpace <= 0 && bottomSpace <= 0) {
                // Not enough space: clamp height
                height = Math.max(20, Math.min(height, opts.corridorY - opts.gap / 2 - opts.margin));
            }
            const placeTop = topSpace >= bottomSpace;
            if (placeTop) {
                y = Math.max(0, Math.random() * (opts.corridorY - opts.gap / 2 - opts.margin - height));
            } else {
                y = bottomStart + Math.random() * Math.max(0, this.canvas.height - bottomStart - height);
            }
        } else {
            y = Math.random() * (this.canvas.height - height);
        }
        
        this.obstacles.push({
            x: this.canvas.width + xOffset,
            blocks: [{ x: 0, y, width, height }],
            maxWidth: width
        });
    }
    
    createDoubleStack(xOffset = 0, opts = null) {
        const width = 60;
        let topHeight, bottomHeight;
        if (opts) {
            const halfGap = opts.gap / 2;
            topHeight = Math.max(20, opts.corridorY - halfGap);
            bottomHeight = Math.max(20, this.canvas.height - (opts.corridorY + halfGap));
        } else {
            topHeight = 50 + Math.random() * 100;
            bottomHeight = 50 + Math.random() * 100;
        }

        const blocks = [];
        if (!(opts && opts.skipTop)) {
            blocks.push({ x: 0, y: 0, width, height: topHeight });
        }
        if (!(opts && opts.skipBottom)) {
            blocks.push({ x: 0, y: this.canvas.height - bottomHeight, width, height: bottomHeight });
        }
        if (blocks.length === 0) return; // nothing to draw for this column
        
        this.obstacles.push({
            x: this.canvas.width + xOffset,
            blocks,
            maxWidth: width
        });
    }
    
    createTunnel(xOffset = 0, opts = null) {
        const width = 80;
        const gap = opts ? opts.gap : Math.max(100, 140 - this.difficulty * 8);
        const centerY = opts ? opts.corridorY : 100 + Math.random() * (this.canvas.height - 200);
        
        this.obstacles.push({
            x: this.canvas.width + xOffset,
            blocks: [
                { x: 0, y: 0, width, height: centerY - gap / 2 },
                { x: 0, y: centerY + gap / 2, width, height: this.canvas.height - (centerY + gap / 2) }
            ],
            maxWidth: width
        });
    }
    
    createZigzag(xOffset = 0, opts = null) {
        const blocks = [];
        const width = 40;
        const count = 3; // keep zigzag compact to preserve corridor
        
        for (let i = 0; i < count; i++) {
            let height = 60 + Math.random() * 40;
            let y;
            if (opts) {
                const placeTop = (i % 2 === 0);
                if (placeTop) {
                    y = Math.max(0, Math.random() * Math.max(0, opts.corridorY - opts.gap / 2 - opts.margin - height));
                } else {
                    const start = opts.corridorY + opts.gap / 2 + opts.margin;
                    y = start + Math.random() * Math.max(0, this.canvas.height - start - height);
                }
            } else {
                y = (i % 2 === 0) ? 50 + Math.random() * 100 : this.canvas.height - 150 - Math.random() * 100;
            }
            blocks.push({ x: i * 50, y, width, height });
        }
        
        this.obstacles.push({
            x: this.canvas.width + xOffset,
            blocks: blocks,
            maxWidth: count * 50
        });
    }
    
    createRandomCluster(xOffset = 0, opts = null) {
        const blocks = [];
        const count = 2 + Math.floor(Math.random() * 2);
        
        for (let i = 0; i < count; i++) {
            const width = 30 + Math.random() * 30;
            const height = 50 + Math.random() * 100;
            let y;
            if (opts) {
                // Pick side that doesn't cross the corridor
                const topMax = Math.max(0, opts.corridorY - opts.gap / 2 - opts.margin - height);
                const bottomStart = opts.corridorY + opts.gap / 2 + opts.margin;
                const bottomMax = Math.max(0, this.canvas.height - bottomStart - height);
                const placeTop = (Math.random() < 0.5) && topMax > 0;
                if (placeTop || bottomMax <= 0) {
                    y = Math.random() * topMax;
                } else {
                    y = bottomStart + Math.random() * bottomMax;
                }
            } else {
                y = Math.random() * (this.canvas.height - 100);
            }
            blocks.push({ x: i * 60, y, width, height });
        }
        
        this.obstacles.push({
            x: this.canvas.width + xOffset,
            blocks: blocks,
            maxWidth: count * 60
        });
    }
    
    createTriangleObstacle(xOffset = 0, opts = null) {
        // Create triangular obstacles pointing inward
        const triangles = [];
        let size = 60 + Math.random() * 40;
        
        // If corridor too close to top/bottom, shrink or skip triangle on that side
        const canPlaceTop = !opts || (opts.corridorY - opts.gap / 2 - opts.margin > size + 10);
        const canPlaceBottom = !opts || (this.canvas.height - (opts.corridorY + opts.gap / 2 + opts.margin) > size + 10);
        
        // Random choice based on availability
        const choices = [];
        if (canPlaceTop) choices.push('top');
        if (canPlaceBottom) choices.push('bottom');
        if (choices.length === 0) return; // nothing to place without blocking corridor
        const pick = choices[Math.floor(Math.random() * choices.length)];
        
        if (pick === 'top') {
            triangles.push({
                type: 'triangle', x: 0, y: 0,
                points: [ { x: 0, y: 0 }, { x: size, y: 0 }, { x: size / 2, y: size } ]
            });
        } else {
            triangles.push({
                type: 'triangle', x: 0, y: this.canvas.height - size,
                points: [ { x: 0, y: size }, { x: size, y: size }, { x: size / 2, y: 0 } ]
            });
        }
        
        this.obstacles.push({
            x: this.canvas.width + xOffset,
            triangles: triangles,
            maxWidth: size
        });
    }
    
    createDiamondObstacle(xOffset = 0, opts = null) {
        // Create diamond-shaped obstacles
        const size = 50 + Math.random() * 30;
        let centerY;
        if (opts) {
            // Place diamond outside corridor
            const aboveMax = opts.corridorY - opts.gap / 2 - opts.margin - size;
            const belowMin = opts.corridorY + opts.gap / 2 + opts.margin + size;
            const canAbove = aboveMax > size;
            const canBelow = this.canvas.height - belowMin > size;
            if (!canAbove && !canBelow) return;
            const placeAbove = canAbove && (!canBelow || Math.random() < 0.5);
            centerY = placeAbove ? (size + Math.random() * (aboveMax - size)) : (belowMin + Math.random() * (this.canvas.height - belowMin - size));
        } else {
            centerY = 100 + Math.random() * (this.canvas.height - 200);
        }
        
        this.obstacles.push({
            x: this.canvas.width + xOffset,
            triangles: [{
                type: 'diamond',
                x: 0,
                y: centerY - size,
                points: [
                    { x: size / 2, y: 0 },      // Top
                    { x: size, y: size },       // Right
                    { x: size / 2, y: size * 2 }, // Bottom
                    { x: 0, y: size }           // Left
                ]
            }],
            maxWidth: size
        });
    }
    
    checkCollision(obstacle) {
        const playerRadius = this.player.size;
        
        // Check block collisions
        if (obstacle.blocks) {
            for (const block of obstacle.blocks) {
                const blockLeft = obstacle.x + block.x;
                const blockRight = blockLeft + block.width;
                const blockTop = block.y;
                const blockBottom = blockTop + block.height;
                
                // Circle-rectangle collision
                const closestX = Math.max(blockLeft, Math.min(this.player.x, blockRight));
                const closestY = Math.max(blockTop, Math.min(this.player.y, blockBottom));
                
                const distanceX = this.player.x - closestX;
                const distanceY = this.player.y - closestY;
                const distanceSquared = distanceX * distanceX + distanceY * distanceY;
                
                if (distanceSquared < playerRadius * playerRadius) {
                    return true;
                }
            }
        }
        
        // Check triangle collisions
        if (obstacle.triangles) {
            for (const triangle of obstacle.triangles) {
                if (this.pointInPolygon(this.player.x, this.player.y, triangle, obstacle)) {
                    return true;
                }
            }
        }
        
        return false;
    }
    
    pointInPolygon(px, py, triangle, obstacle) {
        const points = triangle.points.map(p => ({
            x: obstacle.x + triangle.x + p.x,
            y: triangle.y + p.y
        }));
        
        let inside = false;
        for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
            if (((points[i].y > py) !== (points[j].y > py)) &&
                (px < (points[j].x - points[i].x) * (py - points[i].y) / (points[j].y - points[i].y) + points[i].x)) {
                inside = !inside;
            }
        }
        return inside;
    }
    
    draw() {
        // Clear frame fully (no ghosting/motion persistence)
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw stars
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        for (const star of this.stars) {
            this.ctx.beginPath();
            this.ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            this.ctx.fill();
        }
        
        // Draw grid
        this.drawNeonGrid();
        
        // Draw obstacles with neon effect
        for (const obstacle of this.obstacles) {
            // Draw blocks
            if (obstacle.blocks) {
                for (const block of obstacle.blocks) {
                    // Neon glow
                                        this.ctx.shadowBlur = 20;
                    this.ctx.shadowColor = '#ff00ff';
                    
                    // Draw block
                    this.ctx.strokeStyle = '#ff00ff';
                    this.ctx.lineWidth = 2;
                    this.ctx.strokeRect(obstacle.x + block.x, block.y, block.width, block.height);
                    
                    // Inner glow
                    this.ctx.strokeStyle = 'rgba(255, 0, 255, 0.5)';
                    this.ctx.lineWidth = 1;
                    this.ctx.strokeRect(
                        obstacle.x + block.x + 5,
                        block.y + 5,
                        block.width - 10,
                        block.height - 10
                    );
                    
                    // Grid pattern inside
                    this.ctx.strokeStyle = 'rgba(255, 0, 255, 0.3)';
                    this.ctx.lineWidth = 0.5;
                    for (let i = 10; i < block.width; i += 10) {
                        this.ctx.beginPath();
                        this.ctx.moveTo(obstacle.x + block.x + i, block.y);
                        this.ctx.lineTo(obstacle.x + block.x + i, block.y + block.height);
                        this.ctx.stroke();
                    }
                    for (let i = 10; i < block.height; i += 10) {
                        this.ctx.beginPath();
                        this.ctx.moveTo(obstacle.x + block.x, block.y + i);
                        this.ctx.lineTo(obstacle.x + block.x + block.width, block.y + i);
                        this.ctx.stroke();
                    }
                }
            }
            
            // Draw triangles
            if (obstacle.triangles) {
                for (const triangle of obstacle.triangles) {
                    this.ctx.shadowBlur = this.enableGlow ? 20 : 0;
                    this.ctx.shadowColor = '#ff00ff';
                    this.ctx.strokeStyle = '#ff00ff';
                    this.ctx.fillStyle = 'rgba(255, 0, 255, 0.1)';
                    this.ctx.lineWidth = 2;
                    
                    // Draw triangle shape
                    this.ctx.beginPath();
                    for (let i = 0; i < triangle.points.length; i++) {
                        const point = triangle.points[i];
                        const x = obstacle.x + triangle.x + point.x;
                        const y = triangle.y + point.y;
                        
                        if (i === 0) {
                            this.ctx.moveTo(x, y);
                        } else {
                            this.ctx.lineTo(x, y);
                        }
                    }
                    this.ctx.closePath();
                    this.ctx.fill();
                    this.ctx.stroke();
                    
                    // Inner glow lines
                    this.ctx.strokeStyle = 'rgba(255, 0, 255, 0.5)';
                    this.ctx.lineWidth = 1;
                    this.ctx.beginPath();
                    for (let i = 0; i < triangle.points.length; i++) {
                        const point1 = triangle.points[i];
                        const point2 = triangle.points[(i + 1) % triangle.points.length];
                        const x1 = obstacle.x + triangle.x + point1.x;
                        const y1 = triangle.y + point1.y;
                        const x2 = obstacle.x + triangle.x + point2.x;
                        const y2 = triangle.y + point2.y;
                        
                        // Draw inner line slightly offset
                        const offsetX = (x2 - x1) * 0.1;
                        const offsetY = (y2 - y1) * 0.1;
                        this.ctx.moveTo(x1 + offsetX, y1 + offsetY);
                        this.ctx.lineTo(x2 - offsetX, y2 - offsetY);
                    }
                    this.ctx.stroke();
                }
            }
        }
        
        this.ctx.shadowBlur = 0;
        
        // Draw particles
        for (const particle of this.particles) {
            this.ctx.fillStyle = particle.color;
            this.ctx.globalAlpha = particle.life * 0.6;
            this.ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
        }
        this.ctx.globalAlpha = 1;
        
        // Draw player trail
        this.drawPlayerTrail();
        
        // Draw player
        this.drawNeonPlayer();
    }
    
    drawNeonGrid() {
        this.ctx.strokeStyle = 'rgba(0, 255, 255, 0.1)';
        this.ctx.lineWidth = 1;
        
        const gridSize = 60;
        
        // Vertical lines
        for (let x = this.gridOffset; x < this.canvas.width; x += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }
        
        // Horizontal lines with perspective
        for (let y = 0; y < this.canvas.height; y += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }
    }
    
    drawPlayerTrail() {
        if (this.player.trail.length < 2) return;
        
        // How far to push older samples to the left per step (simulates forward motion)
        const scrollPerStep = this.gameSpeed * 0.7; // tune factor for desired slope
        
        for (let i = 0; i < this.player.trail.length - 1; i++) {
            const point = this.player.trail[i];
            const nextPoint = this.player.trail[i + 1];
            
            const age1 = (this.player.trail.length - 1) - i;
            const age2 = (this.player.trail.length - 1) - (i + 1);
            
            // Shift older points left to simulate world scrolling; also shift vertically to enforce 45° look
            const shiftX1 = age1 * scrollPerStep;
            const shiftX2 = age2 * scrollPerStep;
            const slopeSign1 = point.direction === 'up' ? -1 : (point.direction === 'down' ? 1 : 0); // flat => 0
            const slopeSign2 = nextPoint.direction === 'up' ? -1 : (nextPoint.direction === 'down' ? 1 : 0);
            const shiftY1 = slopeSign1 * shiftX1;
            const shiftY2 = slopeSign2 * shiftX2;
            
            const x1 = point.x - shiftX1;
            const y1 = point.y + shiftY1;
            const x2 = nextPoint.x - shiftX2;
            const y2 = nextPoint.y + shiftY2;
            
            this.ctx.strokeStyle = `rgba(0, 255, 255, ${point.life * 0.7})`;
            this.ctx.lineWidth = Math.max(1, 3 * point.life);
            this.ctx.beginPath();
            this.ctx.moveTo(x1, y1);
            this.ctx.lineTo(x2, y2);
            this.ctx.stroke();
        }
    }
    
    drawNeonPlayer() {
        this.ctx.save();
        this.ctx.translate(this.player.x, this.player.y);
        this.ctx.rotate(this.player.angle * Math.PI / 180);
        
        // Glow effect
        this.ctx.shadowBlur = 20 + this.player.glow * 20;
        this.ctx.shadowColor = '#00ffff';
        
        // Draw arrow
        this.ctx.strokeStyle = '#00ffff';
        this.ctx.fillStyle = 'rgba(0, 255, 255, 0.2)';
        this.ctx.lineWidth = 2;
        
        this.ctx.beginPath();
        this.ctx.moveTo(this.player.size, 0);
        this.ctx.lineTo(-this.player.size, -this.player.size);
        this.ctx.lineTo(-this.player.size / 2, 0);
        this.ctx.lineTo(-this.player.size, this.player.size);
        this.ctx.closePath();
        
        this.ctx.fill();
        this.ctx.stroke();
        
        // Inner glow
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(this.player.size / 2, 0);
        this.ctx.lineTo(-this.player.size / 2, -this.player.size / 2);
        this.ctx.lineTo(-this.player.size / 4, 0);
        this.ctx.lineTo(-this.player.size / 2, this.player.size / 2);
        this.ctx.closePath();
        this.ctx.stroke();
        
        this.ctx.restore();
    }
    
    gameOver() {
        this.gameActive = false;
        
        // Update high score
        const finalDistForScore = Math.floor(this.distance);
        if (finalDistForScore > this.highScore) {
            this.highScore = finalDistForScore;
            localStorage.setItem('vibeRunnerHighScore', this.highScore);
            // Update the best score display immediately
            document.getElementById('best-display').textContent = this.highScore + 'm';
        }
        
        // Show game over screen
        document.getElementById('game-over-screen').style.display = 'block';
        const finalDist = Math.floor(this.distance);
        document.getElementById('final-distance').textContent = finalDist + 'm';
        document.getElementById('final-best').textContent = this.highScore + 'm';
    }
}

// Initialize the game when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.vibeRunner = new VibeRunner();
    });
} else {
    setTimeout(() => {
        window.vibeRunner = new VibeRunner();
    }, 100);
}
