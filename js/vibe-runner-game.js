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
        
        // Performance optimization: Cache frequently used calculations
        this.mathCache = {
            PI2: Math.PI * 2,
            PI_180: Math.PI / 180,
            sqrt2: Math.sqrt(2),
            sin45: Math.sin(45 * Math.PI / 180),
            cos45: Math.cos(45 * Math.PI / 180),
            // Pre-calculated angle values for player
            angleNeg45: -45,
            angle45: 45,
            angle0: 0,
            // Cached strings to avoid concatenation
            meterSuffix: 'm',
            // Cached calculation results
            lastDistanceFloor: 0,
            lastDistanceRaw: 0
        };
        
        // Geometry Dash inspired mechanics
        this.gravityDirection = 1; // 1 = normal, -1 = inverted
        this.gravityPortals = [];
        this.jumpPads = [];
        this.speedZones = [];
        this.pulseTimer = 0;
        this.beatInterval = 30; // frames per beat for rhythmic obstacles
        
        // Audio system
        this.backgroundMusic = new Audio('sound/Vibe_Runner.mp3');
        this.backgroundMusic.loop = true;
        this.backgroundMusic.volume = 0.5;
        
        // Mobile device detection
        this.isMobile = this.detectMobile();
        
        // Frame rate monitoring and adaptive quality (Phase 1 Optimization)
        this.frameRateMonitor = {
            lastFrameTime: 0,
            frameCount: 0,
            currentFPS: 60,
            targetFPS: 60,
            minFPS: 30,
            fpsHistory: [],
            averageFPS: 60,
            adaptiveQuality: {
                particleCount: 1.0,
                effectQuality: 1.0,
                shadowBlur: 1.0,
                trailLength: 1.0
            },
            checkInterval: 30,
            lastCheck: 0
        };
        
        // Object pools (Phase 1 Optimization)
        this.particlePool = [];
        this.obstacleBlockPool = [];
        
        // Level scripting / pattern options
        this.levelEndDistance = 10000; // meters
        this.useScripted = true; // default to scripted obstacle patterns
        this.trackOffsetPx = 0; // how far ahead we've built the track (in px)
        this.patternIndex = 0; // which pattern section we're on
        this.patternPhase = 0; // phase counter for path functions
        this.segmentSpacingPx = 120; // base spacing between obstacle columns (px)
        
        // Geometry Dash pattern system
        this.currentPattern = null;
        this.patternLibrary = this.initPatternLibrary();
        this.obstacleAnimations = new Map(); // Store animation data for obstacles
        
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
    
    detectMobile() {
        // Enhanced mobile detection for real devices and mobile viewports
        const userAgent = navigator.userAgent.toLowerCase();
        const isMobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
        const isTouchOnly = 'ontouchstart' in window && !window.matchMedia('(hover: hover)').matches;
        const isSmallScreen = window.innerWidth <= 768;
        const isMobileViewport = window.innerWidth <= 480; // Very small screens should always use mobile layout
        
        // Mobile if: real mobile device OR touch-only small screen OR very small viewport
        return isMobileUA || (isTouchOnly && isSmallScreen) || isMobileViewport;
    }
    
    initGame() {
        this.createGameModal();
    }
    
    initPatternLibrary() {
        return {
            // Geometry Dash inspired patterns
            'spike_corridor': {
                name: 'Spike Corridor',
                difficulty: 1,
                length: 10,
                generate: () => this.generateSpikeCorridor()
            },
            'saw_gauntlet': {
                name: 'Saw Gauntlet',
                difficulty: 2,
                length: 12,
                generate: () => this.generateSawGauntlet()
            },
            'gravity_flip': {
                name: 'Gravity Flip Zone',
                difficulty: 2,
                length: 15,
                generate: () => this.generateGravityFlipZone()
            },
            'triple_spike': {
                name: 'Triple Spike Jump',
                difficulty: 2,
                length: 8,
                generate: () => this.generateTripleSpike()
            },
            'moving_blocks': {
                name: 'Moving Block Maze',
                difficulty: 3,
                length: 14,
                generate: () => this.generateMovingBlockMaze()
            },
            'rhythm_spikes': {
                name: 'Rhythm Spikes',
                difficulty: 2,
                length: 16,
                generate: () => this.generateRhythmSpikes()
            },
            'saw_wave': {
                name: 'Saw Wave',
                difficulty: 4,
                length: 12,
                generate: () => this.generateSawWave()
            },
            'cube_jump': {
                name: 'Cube Jump Section',
                difficulty: 1,
                length: 10,
                generate: () => this.generateCubeJumpSection()
            },
            'ship_section': {
                name: 'Ship Flying Section',
                difficulty: 2,
                length: 14,
                generate: () => this.generateShipSection()
            },
            'dual_path': {
                name: 'Dual Path Choice',
                difficulty: 3,
                length: 12,
                generate: () => this.generateDualPath()
            }
        };
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
        
        // Apply mobile-specific positioning adjustments
        if (this.isMobile) {
            this.applyMobileAdjustments();
        }
        
        this.addGameStyles();
    }
    
    applyMobileAdjustments() {
        const modal = document.querySelector('.vibe-runner-modal');
        if (modal) {
            // Force mobile-specific positioning with dynamic viewport height
            modal.style.cssText += `
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                transform: none !important;
                width: calc(100dvw - 4px) !important;
                height: 100dvh !important;
                max-width: calc(100dvw - 4px) !important;
                max-height: 100dvh !important;
                border-radius: 0 !important;
                padding: 0 !important;
            `;
            
            // Adjust header for mobile with increased padding
            const header = document.querySelector('.vibe-runner-header');
            if (header) {
                header.style.cssText += `
                    padding: max(env(safe-area-inset-top, 15px), 20px) 20px 15px 20px !important;
                    min-height: 60px !important;
                `;
            }
            
            // Adjust close button for mobile safe areas with better positioning
            const closeBtn = document.querySelector('.vibe-runner-close-x');
            if (closeBtn) {
                closeBtn.style.cssText += `
                    top: max(env(safe-area-inset-top, 15px), 13px) !important;
                    right: max(env(safe-area-inset-right, 15px), 8px) !important;
                    z-index: 30 !important;
                `;
            }
            
            // Fix start screen and game-over screen positioning for mobile
            const startScreen = document.querySelector('.vibe-runner-start-screen');
            const gameOverScreen = document.querySelector('.vibe-runner-game-over');
            
            [startScreen, gameOverScreen].forEach(screen => {
                if (screen) {
                    screen.style.cssText += `
                        position: absolute !important;
                        top: 50% !important;
                        left: 50% !important;
                        transform: translate(-50%, -50%) !important;
                        max-width: 90dvw !important;
                        max-height: 70dvh !important;
                        overflow: auto !important;
                    `;
                }
            });
        }
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
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: linear-gradient(135deg, #0a0a1a 0%, #1a0a2a 100%);
                border-radius: 20px;
                padding: 0;
                width: 90%;
                max-width: 1000px;
                height: calc(90vh - 20px);
                max-height: calc(90vh - 20px);
                display: flex;
                flex-direction: column;
                border: 2px solid #00ffff;
                box-shadow: 0 0 40px rgba(0, 255, 255, 0.3),
                           inset 0 0 20px rgba(0, 255, 255, 0.1);
                overflow: hidden;
            }
            
            /* Mobile adjustments handled by JavaScript applyMobileAdjustments() */
            
            .vibe-runner-close-x {
                position: absolute;
                top: 10px;
                right: 10px;
                background: rgba(255, 0, 255, 0.1);
                border: 2px solid #ff00ff;
                color: #ff00ff;
                width: 30px;
                height: 30px;
                border-radius: 50%;
                font-size: 24px;
                font-weight: bold;
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
            
            /* Real mobile device detection */
            @media (max-width: 600px) and (hover: none) and (pointer: coarse) {
                .vibe-runner-modal {
                    width: calc(100% - 4px);
                    height: calc(100vh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 20px));
                    max-height: calc(100vh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 20px));
                    border-radius: 10px;
                    top: env(safe-area-inset-top, 0px);
                    transform: translateX(-50%);
                    left: 50%;
                }
            }
            
            /* Desktop at mobile dimensions */
            @media (max-width: 600px) and (hover: hover) {
                .vibe-runner-modal {
                    width: calc(100% - 4px);
                    height: calc(95dvh - 10px);
                    max-height: calc(95dvh - 10px);
                    border-radius: 10px;
                }
            }
            
            /* General mobile width catch-all (ensures border fix applies to all mobile scenarios) */
            @media (max-width: 600px) {
                .vibe-runner-modal {
                    width: calc(100% - 4px);
                    max-width: calc(100% - 4px);
                }
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

            /* Mobile responsive adjustments handled by JavaScript */
        `;
        document.head.appendChild(style);
    }
    
    
    // Public method to launch game directly
    launchGame() {
        this.openGame();
    }
    
    
    
    openGame() {
        let container = document.getElementById('vibe-runner-container');
        
        // If container doesn't exist, recreate it
        if (!container) {
            console.log('Vibe Runner container not found, recreating...');
            this.createGameModal();
            container = document.getElementById('vibe-runner-container');
        }
        
        if (container) {
            container.classList.remove('vibe-runner-hidden');
            
            // Disable body scrolling when game is active
            document.body.style.overflow = 'hidden';
            document.body.style.position = 'fixed';
            document.body.style.width = '100%';
            
        } else {
            console.error('Failed to create Vibe Runner container');
            return;
        }
        
        // Start background music when game window opens
        this.backgroundMusic.currentTime = 0;
        this.backgroundMusic.play().catch(e => console.log('Audio play failed:', e));
        
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
        console.log('🔄 Closing Vibe Runner - Refreshing page for clean reset...');
        
        // Stop game immediately to prevent any lingering processes
        this.gameActive = false;
        
        // Cancel any running game loop
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        
        // Stop background music immediately
        try {
            this.backgroundMusic.pause();
            this.backgroundMusic.currentTime = 0;
        } catch (e) {
            console.warn('Could not stop background music:', e);
        }
        
        // Hide game UI immediately for smooth visual transition
        const container = document.getElementById('vibe-runner-container');
        if (container) {
            container.classList.add('vibe-runner-hidden');
        }
        
        // Re-enable body scrolling when game closes
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.width = '';
        
        // Remove game modal class
        document.body.classList.remove('game-modal-open');
        
        // Brief delay to allow final cleanup, then refresh
        setTimeout(() => {
            console.log('🔄 Refreshing page for complete reset...');
            window.location.reload();
        }, 200);
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
        
        // ESC to close and Spacebar for fly up
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !document.getElementById('vibe-runner-container').classList.contains('vibe-runner-hidden')) {
                this.closeGame();
            }
            // Add spacebar support for fly up (same as mouse click)
            if (e.key === ' ' || e.code === 'Space') {
                e.preventDefault(); // Prevent page scroll
                if (this.gameActive && !document.getElementById('vibe-runner-container').classList.contains('vibe-runner-hidden')) {
                    this.isPressed = true;
                }
            }
        });
        
        document.addEventListener('keyup', (e) => {
            // Release spacebar support for fly up
            if (e.key === ' ' || e.code === 'Space') {
                e.preventDefault(); // Prevent page scroll
                if (this.gameActive && !document.getElementById('vibe-runner-container').classList.contains('vibe-runner-hidden')) {
                    this.isPressed = false;
                }
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
        
        // Initialize object pools (Phase 1 Optimization)
        this.initializeParticlePools();
        this.nextObstacleDistance = 100;
        this.gridOffset = 0;
        
        // Reset Geometry Dash mechanics
        this.gravityDirection = 1; // Reset to normal gravity
        this.gravityPortals = [];
        this.jumpPads = [];
        this.speedZones = [];
        
        
        // Reset player
        this.player.x = Math.max(60, Math.min(240, this.canvas.width * 0.22));
        this.player.y = this.canvas.height / 2;
        this.player.trail = [];
        this.player.angle = 0;
        this.player.glow = 0;
        
        // Reset path corridor
        this.pathY = this.canvas.height / 2;
        this.lastCorridorY = this.canvas.height / 2; // Track last corridor position
        
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
        
        // Frame rate monitoring (Phase 1 Optimization)
        this.monitorFrameRate(currentTime);
        
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
    
    // Frame Rate Monitoring (Phase 1 Optimization)
    monitorFrameRate(currentTime) {
        if (this.frameRateMonitor.lastFrameTime === 0) {
            this.frameRateMonitor.lastFrameTime = currentTime;
            return;
        }
        
        const deltaTime = currentTime - this.frameRateMonitor.lastFrameTime;
        this.frameRateMonitor.currentFPS = deltaTime > 0 ? 1000 / deltaTime : 60;
        this.frameRateMonitor.lastFrameTime = currentTime;
        
        this.frameRateMonitor.frameCount++;
        this.frameRateMonitor.fpsHistory.push(this.frameRateMonitor.currentFPS);
        
        if (this.frameRateMonitor.fpsHistory.length > 60) {
            this.frameRateMonitor.fpsHistory.shift();
        }
        
        if (this.frameRateMonitor.frameCount - this.frameRateMonitor.lastCheck >= this.frameRateMonitor.checkInterval) {
            this.updateAdaptiveQuality();
            this.frameRateMonitor.lastCheck = this.frameRateMonitor.frameCount;
        }
    }
    
    updateAdaptiveQuality() {
        const avgFPS = this.frameRateMonitor.fpsHistory.reduce((a, b) => a + b, 0) / this.frameRateMonitor.fpsHistory.length;
        this.frameRateMonitor.averageFPS = avgFPS;
        
        if (avgFPS < this.frameRateMonitor.minFPS) {
            // Reduce quality for better performance
            this.frameRateMonitor.adaptiveQuality.particleCount = Math.max(0.3, this.frameRateMonitor.adaptiveQuality.particleCount - 0.1);
            this.frameRateMonitor.adaptiveQuality.effectQuality = Math.max(0.5, this.frameRateMonitor.adaptiveQuality.effectQuality - 0.1);
            this.frameRateMonitor.adaptiveQuality.shadowBlur = Math.max(0.3, this.frameRateMonitor.adaptiveQuality.shadowBlur - 0.1);
            this.frameRateMonitor.adaptiveQuality.trailLength = Math.max(0.5, this.frameRateMonitor.adaptiveQuality.trailLength - 0.1);
        } else if (avgFPS > this.frameRateMonitor.targetFPS - 5) {
            // Increase quality when performance allows
            this.frameRateMonitor.adaptiveQuality.particleCount = Math.min(1.0, this.frameRateMonitor.adaptiveQuality.particleCount + 0.05);
            this.frameRateMonitor.adaptiveQuality.effectQuality = Math.min(1.0, this.frameRateMonitor.adaptiveQuality.effectQuality + 0.05);
            this.frameRateMonitor.adaptiveQuality.shadowBlur = Math.min(1.0, this.frameRateMonitor.adaptiveQuality.shadowBlur + 0.05);
            this.frameRateMonitor.adaptiveQuality.trailLength = Math.min(1.0, this.frameRateMonitor.adaptiveQuality.trailLength + 0.05);
        }
    }
    
    // Object Pooling System (Phase 1 Optimization)
    getPooledParticle() {
        if (this.particlePool.length > 0) {
            return this.particlePool.pop();
        }
        return {
            x: 0, y: 0, vx: 0, vy: 0, 
            life: 0, maxLife: 0, 
            color: '#ffffff', size: 1, 
            alpha: 1, type: 'default'
        };
    }
    
    releaseParticle(particle) {
        // Reset particle properties
        particle.x = 0;
        particle.y = 0;
        particle.vx = 0;
        particle.vy = 0;
        particle.life = 0;
        particle.alpha = 1;
        particle.type = 'default';
        
        this.particlePool.push(particle);
    }
    
    initializeParticlePools() {
        // Pre-allocate particle objects
        for (let i = 0; i < 100; i++) {
            this.particlePool.push({
                x: 0, y: 0, vx: 0, vy: 0,
                life: 0, maxLife: 0,
                color: '#ffffff', size: 1,
                alpha: 1, type: 'default'
            });
        }
    }
    
    update(dt) {
        this.frameCount++;
        this.pulseTimer++;
        
        // Update distance (use float accumulation, show integer)
        this.distance += this.gameSpeed * 0.2;
        
        // Optimize DOM updates - only update every 5 frames
        if (this.frameCount % 5 === 0) {
            const currentDistanceFloor = Math.floor(this.distance);
            if (currentDistanceFloor !== this.mathCache.lastDistanceFloor) {
                this.mathCache.lastDistanceFloor = currentDistanceFloor;
                document.getElementById('distance-display').textContent = currentDistanceFloor + this.mathCache.meterSuffix;
            }
        }
        
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
        
        // Update player position with gravity mechanics (Geometry Dash style)
        const gravityMultiplier = this.gravityDirection;
        if (this.isPressed) {
            this.player.y -= this.player.speed * gravityMultiplier;
            this.player.angle = this.mathCache.angleNeg45 * gravityMultiplier; // Cached angle
            this.player.glow = Math.min(this.player.glow + 0.1, 1);
        } else {
            this.player.y += this.player.speed * 1.3 * gravityMultiplier;
            this.player.angle = this.mathCache.angle45 * gravityMultiplier; // Cached angle
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
            this.player.angle = this.mathCache.angle0; // Cached angle
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
        
        // Update obstacles with animations
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const obstacle = this.obstacles[i];
            obstacle.x -= this.gameSpeed;
            
            // Update obstacle-specific animations
            if (obstacle.type === 'saw') {
                obstacle.rotation = (obstacle.rotation || 0) + 5;
            } else if (obstacle.type === 'moving_block') {
                obstacle.offsetY = Math.sin(this.frameCount * 0.05 + (obstacle.phase || 0)) * 30;
            } else if (obstacle.type === 'pulsing_spike') {
                const beatPhase = (this.pulseTimer % this.beatInterval) / this.beatInterval;
                obstacle.scale = 1 + Math.sin(beatPhase * Math.PI * 2) * 0.2;
            }
            
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
        
        // Update gravity portals
        for (let i = this.gravityPortals.length - 1; i >= 0; i--) {
            const portal = this.gravityPortals[i];
            portal.x -= this.gameSpeed;
            portal.rotation = (portal.rotation || 0) + 3;
            
            // Check if player hits portal
            const dist = Math.sqrt(
                Math.pow(this.player.x - portal.x, 2) + 
                Math.pow(this.player.y - portal.y, 2)
            );
            
            if (dist < 30 && !portal.used) {
                this.gravityDirection *= -1;
                portal.used = true;
                this.createPortalEffect(portal.x, portal.y);
            }
            
            if (portal.x < -50) {
                this.gravityPortals.splice(i, 1);
            }
        }
        
        // Update jump pads
        for (let i = this.jumpPads.length - 1; i >= 0; i--) {
            const pad = this.jumpPads[i];
            pad.x -= this.gameSpeed;
            
            // Animate jump pad
            pad.compression = Math.max(0, pad.compression - 0.1);
            
            // Check if player hits jump pad
            if (Math.abs(this.player.x - pad.x) < 30 && 
                Math.abs(this.player.y - pad.y) < 20 && !pad.used) {
                // Launch player upward
                this.player.y -= 80 * this.gravityDirection;
                pad.compression = 1;
                pad.used = true;
                this.createJumpEffect(pad.x, pad.y);
            }
            
            if (pad.x < -50) {
                this.jumpPads.splice(i, 1);
            }
        }
        
        // Update particles - Optimized with cached values
        const gameSpeedHalf = this.gameSpeed * 0.5;
        const particleCount = this.particles.length;
        for (let i = particleCount - 1; i >= 0; i--) {
            const particle = this.particles[i];
            particle.x -= gameSpeedHalf;
            particle.x += particle.vx || 0; // Handle vx for pooled particles
            particle.y += particle.vy || 0;
            particle.life -= 0.02;
            particle.alpha = particle.life / (particle.maxLife || 1);
            
            if (particle.life <= 0 || particle.x < -10) {
                this.releaseParticle(particle);
                this.particles.splice(i, 1);
            }
        }
        
        // Add new particles (Object Pooling Optimization)
        if (Math.random() < 0.3 * this.frameRateMonitor.adaptiveQuality.particleCount) {
            const particle = this.getPooledParticle();
            particle.x = this.player.x - 10;
            particle.y = this.player.y + (Math.random() - 0.5) * 10;
            particle.vx = 0;
            particle.vy = (Math.random() - 0.5) * 2;
            particle.size = Math.random() * 3 + 1;
            particle.life = 1.0;
            particle.maxLife = 1.0;
            particle.color = this.isPressed ? '#00ffff' : '#ff00ff';
            particle.alpha = 1.0;
            particle.type = 'trail';
            this.particles.push(particle);
        }
        
        // Update stars - Optimized with cached canvas width
        const canvasWidth = this.canvas.width;
        const canvasHeight = this.canvas.height;
        const starCount = this.stars.length;
        for (let i = 0; i < starCount; i++) {
            const star = this.stars[i];
            star.x -= star.speed;
            if (star.x < 0) {
                star.x = canvasWidth;
                star.y = Math.random() * canvasHeight;
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
        const minGap = Math.max(120, 180 - this.difficulty * 5); // Increased minimum gap
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
        // Use new Geometry Dash pattern system
        const patternKeys = Object.keys(this.patternLibrary);
        const availablePatterns = patternKeys.filter(key => {
            const pattern = this.patternLibrary[key];
            return pattern.difficulty <= Math.ceil(this.difficulty);
        });
        
        if (availablePatterns.length > 0 && Math.random() < 0.5) { // Increased frequency for better gameplay variety
            const patternKey = availablePatterns[Math.floor(Math.random() * availablePatterns.length)];
            const pattern = this.patternLibrary[patternKey];
            this.currentPattern = pattern;
            pattern.generate();
            
            const spacing = Math.max(150, 250 - this.difficulty * 10); // More spacing after patterns
            this.nextObstacleDistance = this.distance + spacing;
            return;
        }
        
        // Fallback to existing system if no patterns available
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
        const maxAllowedGap = Math.max(100, this.canvas.height - 2 * margin - 40);
        const startGap = Math.min(maxAllowedGap, Math.floor(this.canvas.height * 0.75)); // Increased from 0.62
        const endGapFloor = Math.max(120, Math.floor(this.canvas.height * 0.35)); // Increased from 0.22
        const endGap = Math.min(maxAllowedGap, endGapFloor);
        const gap = Math.max(endGap, Math.min(maxAllowedGap, Math.floor(startGap - (startGap - endGap) * progress)));
        const amplitude = Math.min(maxAmp, 45 + progress * (maxAmp - 45));
        this.segmentSpacingPx = Math.max(70, 125 - Math.floor(progress * 40));

        // Pattern selection inspired by your references
        // 0: Ramp Up  1: Ramp Down  2: V-Valley (top wedge)  3: Peak (bottom wedge)
        // 4: Ceiling Teeth  5: Floor Teeth  6: Diamond Lane (slalom)
        const mode = this.patternIndex % 7;
        const steps = Math.max(10, 12 + Math.floor(progress * 8)); // Fewer columns per section (10-20)
        const wavelength = 8 + Math.floor(progress * 4); // Gentler waves
        const centerIndex = Math.floor(steps / 2);
        const baseX = this.trackOffsetPx;
        const yClamp = (y) => Math.max(margin + gap / 2 + 10, Math.min(this.canvas.height - margin - gap / 2 - 10, y)); // Extra safety margin

        // Pre-place large wedges for valley/peak patterns to create dramatic triangles like the references
        let wedgeStartIdx = -1, wedgeEndIdx = -1;
        if ((mode === 2 || mode === 3) && gap > 160) { // Only add wedges if gap is large enough
            const spanCols = Math.max(4, Math.floor(5 + progress * 3)); // Smaller wedges
            const widthPx = spanCols * this.segmentSpacingPx;
            wedgeStartIdx = Math.max(0, centerIndex - Math.floor(spanCols / 2));
            wedgeEndIdx = Math.min(steps - 1, wedgeStartIdx + spanCols - 1);
            const xStart = baseX + wedgeStartIdx * this.segmentSpacingPx;
            // Apex position uses the corridor center at the section middle, leaving more breathing room
            const yAtCenter = yClamp(halfH);
            if (mode === 2) {
                // Top wedge pointing down - smaller to avoid overlap
                const apexY = Math.max(margin + 60, yAtCenter - gap * 0.4);
                const heightFromTop = Math.max(40, Math.min(this.canvas.height * 0.3, apexY));
                this.createWedgeAt(xStart, widthPx, heightFromTop, 'down');
            } else {
                // Bottom wedge pointing up - smaller to avoid overlap
                const apexYFromBottom = Math.max(margin + 60, this.canvas.height - (yAtCenter + gap * 0.4));
                const heightFromBottom = Math.max(40, Math.min(this.canvas.height * 0.3, apexYFromBottom));
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

            // Skip adding spikes inside the corridor when wedges are present
            // This was causing impossible passages

            // Base sizes
            const baseSpike = Math.min(Math.floor(gap * 0.18), 26) + Math.floor(progress * 6);
            const smallSpike = Math.max(12, Math.min(Math.floor(gap * 0.12), 20));

            // Pattern-driven hazards
            if (mode === 0) {
                // Ramp Up: move corridor upward; punish the ceiling with frequent teeth
                if (i % 2 === 0 || midGame || lateGame) {
                    this.createSpikeAt(xOffset + wallWidth, topEdge, baseSpike, 'top');
                }
                // Skip diamonds in corridor - they can block passage
            } else if (mode === 1) {
                // Ramp Down: move corridor downward; punish the floor
                if (i % 2 === 0 || midGame || lateGame) {
                    this.createSpikeAt(xOffset + wallWidth, bottomEdge, baseSpike, 'bottom');
                }
                // Skip diamonds in corridor - they can block passage
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
                // Skip diamonds in corridor - they can block passage
            } else if (mode === 5) {
                // Floor teeth corridor
                if (i % 1 === 0) this.createSpikeAt(xOffset + wallWidth, bottomEdge, smallSpike, 'bottom');
                // Skip diamonds in corridor - they can block passage
            } else {
                // Diamond lane slalom - reduce frequency and ensure they don't block
                if (i % 5 === 2) { // Less frequent diamonds
                    const size = Math.min(20 + Math.floor(progress * 4), Math.floor(gap * 0.15)); // Smaller diamonds
                    const offsetY = (i % 2 === 0 ? -1 : 1) * gap * 0.35; // Push further from center
                    this.createDiamondAt(xOffset + Math.floor(this.segmentSpacingPx / 2), y + offsetY, size);
                }
                if ((lateGame || endGame) && i % 6 === 0) { // Less frequent spikes
                    const orient = i % 12 === 0 ? 'top' : 'bottom';
                    const edgeY = orient === 'top' ? topEdge : bottomEdge;
                    this.createSpikeAt(xOffset + wallWidth, edgeY, smallSpike, orient);
                }
            }

            // Extra challenge for end game - but ensure it doesn't block passage
            if (endGame && i % 8 === 4 && gap > 140) { // Less frequent, needs bigger gap
                const b = Math.min(25, Math.floor(gap * 0.12)); // Smaller blocks
                const fy = y + Math.sin((this.patternPhase + i) * 0.5) * gap * 0.3; // Push further from center
                this.createFloatingBlock(xOffset + Math.floor(this.segmentSpacingPx * 0.4), fy, b, b);
            }
        };

        // Track the last corridor Y position for smooth transitions
        const lastCorridorY = this.lastCorridorY || halfH;
        
        // Y path per pattern (keeps the corridor style while creating the ramp/valley feel)
        const yFor = (i) => {
            const t = this.patternPhase + i;
            const blendFactor = Math.min(1, i / 3); // Smooth transition over first 3 columns
            
            let targetY;
            if (mode === 0) {
                // Ramp Up
                const start = yClamp(halfH + amplitude * 0.4);
                const end = yClamp(halfH - amplitude * 0.4);
                targetY = start + (end - start) * (i / Math.max(1, steps - 1));
            } else if (mode === 1) {
                // Ramp Down
                const start = yClamp(halfH - amplitude * 0.4);
                const end = yClamp(halfH + amplitude * 0.4);
                targetY = start + (end - start) * (i / Math.max(1, steps - 1));
            } else if (mode === 2) {
                // V-Valley (lowest at center)
                const k = (Math.abs(i - centerIndex) / Math.max(1, centerIndex));
                targetY = yClamp(halfH + (1 - k * 2) * amplitude * 0.6);
            } else if (mode === 3) {
                // Peak (highest at center)
                const k = (Math.abs(i - centerIndex) / Math.max(1, centerIndex));
                targetY = yClamp(halfH - (1 - k * 2) * amplitude * 0.6);
            } else if (mode === 4) {
                // Mild wave with ceiling teeth
                targetY = yClamp(halfH + amplitude * 0.3 * Math.sin((2 * Math.PI * t) / wavelength));
            } else if (mode === 5) {
                // Mild wave with floor teeth
                targetY = yClamp(halfH + amplitude * 0.3 * Math.sin((2 * Math.PI * (t + wavelength / 2)) / wavelength));
            } else {
                // Diamond lane S-curves
                const primary = Math.sin((2 * Math.PI * t) / wavelength);
                const secondary = Math.sin((4 * Math.PI * t) / wavelength) * 0.2;
                targetY = yClamp(halfH + amplitude * 0.35 * (primary + secondary));
            }
            
            // Blend from last corridor position to prevent jumps
            if (i === 0) {
                return lastCorridorY + (targetY - lastCorridorY) * 0.3; // Gentle transition
            }
            return lastCorridorY + (targetY - lastCorridorY) * blendFactor;
        };

        // Build the section
        for (let i = 0; i < steps; i++) {
            spawnColumnAt(i, yFor(i));
        }
        
        // Remember the last corridor position for smooth transitions
        this.lastCorridorY = yFor(steps - 1);

        // Advance build head and schedule next
        this.trackOffsetPx += steps * this.segmentSpacingPx;
        this.patternPhase += steps;
        this.patternIndex++;
        const metersPerPx = 0.2;
        const sectionMeters = steps * this.segmentSpacingPx * metersPerPx;
        this.nextObstacleDistance = this.distance + Math.max(80, sectionMeters * 0.5); // More spacing between sections

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
    
    // Geometry Dash Pattern Generators
    generateSpikeCorridor() {
        const spacing = 80;
        for (let i = 0; i < 10; i++) {
            const y = i % 2 === 0 ? 100 : this.canvas.height - 100;
            this.obstacles.push({
                x: this.canvas.width + i * spacing,
                type: 'spike',
                triangles: [{
                    type: 'triangle',
                    x: 0,
                    y: y,
                    points: i % 2 === 0 ? 
                        [{x: 0, y: 0}, {x: 30, y: 0}, {x: 15, y: 30}] : // top spike
                        [{x: 0, y: 30}, {x: 30, y: 30}, {x: 15, y: 0}]  // bottom spike
                }],
                maxWidth: 30
            });
        }
    }
    
    generateSawGauntlet() {
        const spacing = 120;
        for (let i = 0; i < 8; i++) {
            const y = this.canvas.height / 2 + Math.sin(i * 0.5) * 100;
            this.obstacles.push({
                x: this.canvas.width + i * spacing,
                type: 'saw',
                rotation: 0,
                blocks: [{
                    x: 0,
                    y: y - 20,
                    width: 40,
                    height: 40
                }],
                maxWidth: 40
            });
        }
    }
    
    generateGravityFlipZone() {
        // Add gravity portal
        this.gravityPortals.push({
            x: this.canvas.width + 200,
            y: this.canvas.height / 2,
            rotation: 0,
            used: false
        });
        
        // Add obstacles that require gravity flip
        for (let i = 0; i < 8; i++) {
            const isTop = i < 4;
            this.obstacles.push({
                x: this.canvas.width + 400 + i * 100,
                type: 'block',
                blocks: [{
                    x: 0,
                    y: isTop ? 0 : this.canvas.height - 150,
                    width: 50,
                    height: 150
                }],
                maxWidth: 50
            });
        }
    }
    
    generateTripleSpike() {
        const spacing = 60;
        const baseX = this.canvas.width;
        const y = this.canvas.height - 50;
        
        for (let i = 0; i < 3; i++) {
            this.obstacles.push({
                x: baseX + i * spacing,
                type: 'spike',
                triangles: [{
                    type: 'triangle',
                    x: 0,
                    y: y,
                    points: [{x: 0, y: 50}, {x: 50, y: 50}, {x: 25, y: 0}]
                }],
                maxWidth: 50
            });
        }
        
        // Add jump pad before spikes
        this.jumpPads.push({
            x: baseX - 100,
            y: this.canvas.height - 20,
            compression: 0,
            used: false
        });
    }
    
    generateMovingBlockMaze() {
        const spacing = 150;
        for (let i = 0; i < 6; i++) {
            this.obstacles.push({
                x: this.canvas.width + i * spacing,
                type: 'moving_block',
                phase: i * Math.PI / 3,
                offsetY: 0,
                blocks: [{
                    x: 0,
                    y: this.canvas.height / 2 - 30,
                    width: 60,
                    height: 60
                }],
                maxWidth: 60
            });
        }
    }
    
    generateRhythmSpikes() {
        const spacing = 60;
        const pattern = [0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 1, 0]; // Rhythm pattern
        
        pattern.forEach((beat, i) => {
            if (beat === 1) {
                this.obstacles.push({
                    x: this.canvas.width + i * spacing,
                    type: 'pulsing_spike',
                    scale: 1,
                    triangles: [{
                        type: 'triangle',
                        x: 0,
                        y: this.canvas.height - 40,
                        points: [{x: 0, y: 40}, {x: 40, y: 40}, {x: 20, y: 0}]
                    }],
                    maxWidth: 40
                });
            }
        });
    }
    
    generateSawWave() {
        const spacing = 100;
        for (let i = 0; i < 10; i++) {
            const y = this.canvas.height / 2 + Math.sin(i * 0.8) * 150;
            this.obstacles.push({
                x: this.canvas.width + i * spacing,
                type: 'saw',
                rotation: 0,
                triangles: [{
                    type: 'diamond',
                    x: 0,
                    y: y - 25,
                    points: [
                        {x: 25, y: 0},
                        {x: 50, y: 25},
                        {x: 25, y: 50},
                        {x: 0, y: 25}
                    ]
                }],
                maxWidth: 50
            });
        }
    }
    
    generateCubeJumpSection() {
        const spacing = 120;
        for (let i = 0; i < 8; i++) {
            // Platform blocks
            this.obstacles.push({
                x: this.canvas.width + i * spacing,
                type: 'block',
                blocks: [{
                    x: 0,
                    y: this.canvas.height - 40 - (i % 3) * 60,
                    width: 80,
                    height: 20
                }],
                maxWidth: 80
            });
            
            // Ceiling spikes
            if (i % 2 === 0) {
                this.obstacles.push({
                    x: this.canvas.width + i * spacing + 40,
                    type: 'spike',
                    triangles: [{
                        type: 'triangle',
                        x: 0,
                        y: 0,
                        points: [{x: 0, y: 0}, {x: 30, y: 0}, {x: 15, y: 30}]
                    }],
                    maxWidth: 30
                });
            }
        }
    }
    
    generateShipSection() {
        // Narrow corridor with moving obstacles
        const spacing = 100;
        for (let i = 0; i < 12; i++) {
            const gapY = this.canvas.height / 2 + Math.sin(i * 0.4) * 60;
            const gapSize = 200; // Further increased for safety
            
            // Only add blocks if they won't completely block the passage
            const topHeight = Math.max(0, gapY - gapSize / 2);
            const bottomY = gapY + gapSize / 2;
            const bottomHeight = Math.max(0, this.canvas.height - bottomY);
            
            if (topHeight > 20) {
                // Top block
                this.obstacles.push({
                    x: this.canvas.width + i * spacing,
                    type: 'block',
                    blocks: [{
                        x: 0,
                        y: 0,
                        width: 40,
                        height: topHeight
                    }],
                    maxWidth: 40
                });
            }
            
            if (bottomHeight > 20) {
                // Bottom block
                this.obstacles.push({
                    x: this.canvas.width + i * spacing,
                    type: 'block',
                    blocks: [{
                        x: 0,
                        y: bottomY,
                        width: 40,
                        height: bottomHeight
                    }],
                    maxWidth: 40
                });
            }
        }
    }
    
    generateDualPath() {
        // Create two paths with different obstacles
        const topPath = this.canvas.height * 0.25;
        const bottomPath = this.canvas.height * 0.75;
        const spacing = 100;
        
        for (let i = 0; i < 10; i++) {
            if (i < 5) {
                // Top path - easier
                this.obstacles.push({
                    x: this.canvas.width + i * spacing,
                    type: 'spike',
                    triangles: [{
                        type: 'triangle',
                        x: 0,
                        y: topPath + 50,
                        points: [{x: 0, y: 30}, {x: 30, y: 30}, {x: 15, y: 0}]
                    }],
                    maxWidth: 30
                });
            } else {
                // Bottom path - harder
                this.obstacles.push({
                    x: this.canvas.width + i * spacing,
                    type: 'saw',
                    rotation: 0,
                    blocks: [{
                        x: 0,
                        y: bottomPath - 25,
                        width: 50,
                        height: 50
                    }],
                    maxWidth: 50
                });
            }
            
            // Middle barrier
            this.obstacles.push({
                x: this.canvas.width + i * spacing,
                type: 'block',
                blocks: [{
                    x: 0,
                    y: this.canvas.height / 2 - 20,
                    width: 30,
                    height: 40
                }],
                maxWidth: 30
            });
        }
    }
    
    createPortalEffect(x, y) {
        // Create particle burst effect for portal (Object Pooling)
        const particleCount = Math.floor(20 * this.frameRateMonitor.adaptiveQuality.particleCount);
        for (let i = 0; i < particleCount; i++) {
            const angle = (Math.PI * 2 * i) / particleCount;
            const particle = this.getPooledParticle();
            particle.x = x;
            particle.y = y;
            particle.vx = Math.cos(angle) * 5;
            particle.vy = Math.sin(angle) * 5;
            particle.size = 4;
            particle.life = 1.0;
            particle.maxLife = 1.0;
            particle.color = '#ffff00';
            particle.alpha = 1.0;
            particle.type = 'portal';
            this.particles.push(particle);
        }
    }
    
    createJumpEffect(x, y) {
        // Create particle burst for jump pad (Object Pooling)
        const particleCount = Math.floor(10 * this.frameRateMonitor.adaptiveQuality.particleCount);
        for (let i = 0; i < particleCount; i++) {
            const particle = this.getPooledParticle();
            particle.x = x + (Math.random() - 0.5) * 20;
            particle.y = y;
            particle.vx = (Math.random() - 0.5) * 3;
            particle.vy = -Math.random() * 5 - 2;
            particle.size = 3;
            particle.life = 1.0;
            particle.maxLife = 1.0;
            particle.color = '#00ff00';
            particle.alpha = 1.0;
            particle.type = 'jump';
            this.particles.push(particle);
        }
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
            topHeight = Math.max(20, opts.corridorY - halfGap - 10); // Added extra spacing
            bottomHeight = Math.max(20, this.canvas.height - (opts.corridorY + halfGap + 10)); // Added extra spacing
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
        const gap = opts ? opts.gap : Math.max(160, 200 - this.difficulty * 6); // Further increased gap
        const centerY = opts ? opts.corridorY : 100 + Math.random() * (this.canvas.height - 200);
        
        // Ensure tunnel doesn't create impossible passages
        const topHeight = Math.max(0, centerY - gap / 2);
        const bottomY = centerY + gap / 2;
        const bottomHeight = Math.max(0, this.canvas.height - bottomY);
        
        const blocks = [];
        if (topHeight > 10) {
            blocks.push({ x: 0, y: 0, width, height: topHeight });
        }
        if (bottomHeight > 10) {
            blocks.push({ x: 0, y: bottomY, width, height: bottomHeight });
        }
        
        if (blocks.length > 0) {
            this.obstacles.push({
                x: this.canvas.width + xOffset,
                blocks: blocks,
                maxWidth: width
            });
        }
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
            // Viewport culling - only draw visible obstacles
            if (obstacle.x + (obstacle.maxWidth || 100) < 0 || obstacle.x > this.canvas.width + 50) {
                continue;
            }
            
            // Draw blocks
            if (obstacle.blocks) {
                const shadowBlur = 20 * this.frameRateMonitor.adaptiveQuality.shadowBlur;
                
                for (const block of obstacle.blocks) {
                    // Check if this is a bottom obstacle and adjust shadow offset
                    const isBottomObstacle = block.y > this.canvas.height * 0.6;
                    const shadowOffsetY = isBottomObstacle ? -5 : 0;
                    
                    this.ctx.shadowBlur = shadowBlur;
                    this.ctx.shadowColor = '#ff00ff';
                    this.ctx.shadowOffsetY = shadowOffsetY;
                    this.ctx.strokeStyle = '#ff00ff';
                    this.ctx.lineWidth = 2;
                
                    // Draw block
                    this.ctx.strokeRect(obstacle.x + block.x, block.y, block.width, block.height);
                    
                    // Inner glow
                    this.ctx.strokeStyle = 'rgba(255, 0, 255, 0.5)';
                    this.ctx.lineWidth = 1;
                    this.ctx.shadowBlur = 0;
                    this.ctx.shadowOffsetY = 0; // Reset shadow offset
                    this.ctx.strokeRect(
                        obstacle.x + block.x + 5,
                        block.y + 5,
                        block.width - 10,
                        block.height - 10
                    );
                    
                    // Grid pattern inside (Adaptive quality optimization)
                    if (this.frameRateMonitor.adaptiveQuality.effectQuality > 0.7) {
                        this.ctx.strokeStyle = 'rgba(255, 0, 255, 0.3)';
                        this.ctx.lineWidth = 0.5;
                        const gridStep = Math.ceil(10 / this.frameRateMonitor.adaptiveQuality.effectQuality);
                        const blockWidth = block.width;
                        const blockHeight = block.height;
                        const baseX = obstacle.x + block.x;
                        const baseY = block.y;
                        
                        // Optimized vertical grid lines
                        this.ctx.beginPath();
                        for (let i = gridStep; i < blockWidth; i += gridStep) {
                            this.ctx.moveTo(baseX + i, baseY);
                            this.ctx.lineTo(baseX + i, baseY + blockHeight);
                        }
                        this.ctx.stroke();
                        
                        // Optimized horizontal grid lines
                        this.ctx.beginPath();
                        for (let i = gridStep; i < blockHeight; i += gridStep) {
                            this.ctx.moveTo(baseX, baseY + i);
                            this.ctx.lineTo(baseX + blockWidth, baseY + i);
                        }
                        this.ctx.stroke();
                    }
                }
            }
            
            // Draw triangles
            if (obstacle.triangles) {
                for (const triangle of obstacle.triangles) {
                    const adaptiveShadowBlur = (this.enableGlow ? 20 : 0) * this.frameRateMonitor.adaptiveQuality.shadowBlur;
                    
                    // Check if this is a bottom obstacle and adjust shadow offset
                    const isBottomObstacle = triangle.y > this.canvas.height * 0.6;
                    const shadowOffsetY = isBottomObstacle ? -5 : 0;
                    
                    this.ctx.shadowBlur = adaptiveShadowBlur;
                    this.ctx.shadowColor = '#ff00ff';
                    this.ctx.shadowOffsetY = shadowOffsetY;
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
                    this.ctx.shadowBlur = 0;
                    this.ctx.shadowOffsetY = 0; // Reset shadow offset
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
        
        // Draw gravity portals
        for (const portal of this.gravityPortals) {
            // Viewport culling
            if (portal.x + 60 < 0 || portal.x > this.canvas.width + 50) {
                continue;
            }
            
            this.ctx.save();
            this.ctx.translate(portal.x, portal.y);
            this.ctx.rotate((portal.rotation || 0) * Math.PI / 180);
            
            // Portal outer ring
            this.ctx.shadowBlur = 30;
            this.ctx.shadowColor = '#ffff00';
            this.ctx.strokeStyle = '#ffff00';
            this.ctx.lineWidth = 3;
            this.ctx.beginPath();
            this.ctx.arc(0, 0, 25, 0, Math.PI * 2);
            this.ctx.stroke();
            
            // Portal inner ring
            this.ctx.strokeStyle = '#ffffff';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.arc(0, 0, 15, 0, Math.PI * 2);
            this.ctx.stroke();
            
            // Portal center dot
            this.ctx.fillStyle = '#ffff00';
            this.ctx.beginPath();
            this.ctx.arc(0, 0, 5, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Portal arrows indicating gravity flip
            this.ctx.strokeStyle = '#ffffff';
            this.ctx.lineWidth = 2;
            // Up arrow
            this.ctx.beginPath();
            this.ctx.moveTo(-5, -10);
            this.ctx.lineTo(0, -15);
            this.ctx.lineTo(5, -10);
            this.ctx.stroke();
            // Down arrow
            this.ctx.beginPath();
            this.ctx.moveTo(-5, 10);
            this.ctx.lineTo(0, 15);
            this.ctx.lineTo(5, 10);
            this.ctx.stroke();
            
            this.ctx.restore();
        }
        
        // Draw jump pads
        for (const pad of this.jumpPads) {
            // Viewport culling
            if (pad.x + 60 < 0 || pad.x > this.canvas.width + 50) {
                continue;
            }
            
            this.ctx.save();
            
            // Jump pad base
            this.ctx.shadowBlur = 15;
            this.ctx.shadowColor = '#00ff00';
            this.ctx.strokeStyle = '#00ff00';
            this.ctx.fillStyle = 'rgba(0, 255, 0, 0.2)';
            this.ctx.lineWidth = 2;
            
            const compression = pad.compression || 0;
            const height = 15 - compression * 5; // Compress when used
            
            this.ctx.fillRect(pad.x - 25, pad.y - height, 50, height);
            this.ctx.strokeRect(pad.x - 25, pad.y - height, 50, height);
            
            // Jump pad arrow
            this.ctx.strokeStyle = '#ffffff';
            this.ctx.lineWidth = 3;
            this.ctx.beginPath();
            this.ctx.moveTo(pad.x - 10, pad.y - 5);
            this.ctx.lineTo(pad.x, pad.y - 15);
            this.ctx.lineTo(pad.x + 10, pad.y - 5);
            this.ctx.stroke();
            
            this.ctx.restore();
        }
        
        // Draw particles (Phase 2 Optimization - Batched rendering)
        if (this.particles.length > 0) {
            this.ctx.save();
            
            // Group particles by color for batched rendering
            const particlesByColor = {};
            for (const particle of this.particles) {
                if (!particlesByColor[particle.color]) {
                    particlesByColor[particle.color] = [];
                }
                particlesByColor[particle.color].push(particle);
            }
            
            // Render each color group together
            for (const color in particlesByColor) {
                this.ctx.fillStyle = color;
                for (const particle of particlesByColor[color]) {
                    this.ctx.globalAlpha = (particle.alpha || particle.life) * 0.6 * this.frameRateMonitor.adaptiveQuality.particleCount;
                    this.ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
                }
            }
            
            this.ctx.restore();
        }
        
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
        
        // Optimize trail rendering based on adaptive quality
        const maxTrailSegments = Math.floor((this.player.trail.length - 1) * this.frameRateMonitor.adaptiveQuality.trailLength);
        const step = Math.max(1, Math.floor((this.player.trail.length - 1) / maxTrailSegments));
        
        for (let i = 0; i < this.player.trail.length - 1; i += step) {
            const point = this.player.trail[i];
            const nextPoint = this.player.trail[Math.min(i + step, this.player.trail.length - 1)];
            
            const age1 = (this.player.trail.length - 1) - i;
            const age2 = (this.player.trail.length - 1) - Math.min(i + step, this.player.trail.length - 1);
            
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
            
            this.ctx.strokeStyle = `rgba(0, 255, 255, ${point.life * 0.7 * this.frameRateMonitor.adaptiveQuality.effectQuality})`;
            this.ctx.lineWidth = Math.max(1, 3 * point.life * this.frameRateMonitor.adaptiveQuality.effectQuality);
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
        
        // Determine arrow color based on gravity status
        const isReverseGravity = this.gravityDirection === -1;
        const arrowColor = isReverseGravity ? '#ffff00' : '#00ffff'; // Yellow for reverse, cyan for normal
        const shadowColor = isReverseGravity ? '#ffff00' : '#00ffff';
        
        // Glow effect
        this.ctx.shadowBlur = 20 + this.player.glow * 20;
        this.ctx.shadowColor = shadowColor;
        
        // Draw arrow
        this.ctx.strokeStyle = arrowColor;
        this.ctx.fillStyle = isReverseGravity ? 'rgba(255, 255, 0, 0.2)' : 'rgba(0, 255, 255, 0.2)';
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
