// Enhanced Vibe Survivor Game with Multiple Weapons and Choice System
class VibeSurvivor {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.gameTime = 0;
        this.gameRunning = false;
        this.playerDead = false;
        this.keys = {};
        
        // Player properties - start at world center
        this.player = {
            x: 0,
            y: 0,
            radius: 15,
            speed: 2.5,
            health: 100,
            maxHealth: 100,
            xp: 0,
            level: 1,
            glow: 0,
            invulnerable: 0,
            dashCooldown: 0,
            trail: [],
            passives: {},
            trailMultiplier: 1.0
        };
        
        // Game properties
        this.enemies = [];
        this.projectiles = [];
        this.projectilePool = []; // Object pool for reusing projectile objects
        this.particles = [];
        this.xpOrbs = [];
        this.weapons = [{
            type: 'basic',
            level: 1,
            damage: 15,
            fireRate: 20,
            range: 250,
            projectileSpeed: 4,
            lastFire: 0
        }];
        
        // Pause functionality
        this.isPaused = false;
        
        // Background music
        this.backgroundMusic = new Audio('sound/Vibe_Survivor.mp3');
        this.backgroundMusic.loop = true;
        this.backgroundMusic.volume = 0.3; // Adjust volume as needed
        
        // Mobile touch controls
        this.isMobile = this.detectMobile();
        
        
        // Performance optimization - detect if we should reduce rendering quality
        this.performanceMode = false;
        this.frameSkipCounter = 0;
        
        // Frame rate monitoring and adaptive quality
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
                renderDistance: 1.0,
                trailLength: 1.0
            },
            checkInterval: 30, // Check every 30 frames
            lastCheck: 0
        };
        
        // Initialize object pools
        this.initializeProjectilePool();
        
        // Initialize smart garbage collection system
        this.initializeSmartGarbageCollection();
        
        // Initialize batch rendering system
        this.initializeBatchRenderer();
        
        // Initialize canvas layers (will be called after canvas is ready)
        this.canvasLayersInitialized = false;
        
        // Initialize adaptive quality scaling
        this.initializeAdaptiveQuality();
        this.touchControls = {
            joystick: {
                active: false,
                startX: 0,
                startY: 0,
                currentX: 0,
                currentY: 0,
                moveX: 0,
                moveY: 0,
                floating: true, // Enable floating joystick mode
                visible: false, // Track joystick visibility
                centerX: 0, // Dynamic center position
                centerY: 0,
                touchId: null // Track specific touch ID
            },
            dashButton: {
                pressed: false
            }
        };
        
        // UI properties
        this.frameCount = 0;
        this.lastSpawn = 0;
        this.notifications = [];
        this.camera = { x: 0, y: 0 };
        this.spawnRate = 120; // frames between spawns
        this.waveMultiplier = 1;
        
        // Boss progression system (starts after first boss defeat)
        this.bossesKilled = 0;
        this.bossLevel = 1;
        this.bossDefeating = false; // Animation state for boss defeat
        
        // Menu navigation state for keyboard controls
        this.menuNavigationState = {
            active: false,
            selectedIndex: 0,
            menuType: null, // 'levelup', 'gameover', 'pause'
            menuButtons: []
        };
        
        // Screen effects
        this.redFlash = {
            active: false,
            intensity: 0,
            duration: 0,
            maxIntensity: 0.6,
            decay: 0.9
        };
        
        
        
        this.initGame();
    }
    
    initGame() {
        this.createGameModal();
        this.addStyles();
        this.setupEventHandlers();
        
        // Initialize canvas after modal creation with proper timing
        setTimeout(() => {
            try {
                this.canvas = document.getElementById('survivor-canvas');
                if (this.canvas) {
                    this.ctx = this.canvas.getContext('2d', { 
                        willReadFrequently: false  // Enable GPU acceleration
                    });
                    
                    // Optimize canvas settings for maximum performance
                    this.ctx.imageSmoothingEnabled = false; // Disable antialiasing for speed
                    this.ctx.globalCompositeOperation = 'source-over'; // Fastest composite mode
                    
                    this.resizeCanvas();
                    // Ensure canvas gets proper dimensions after CSS settles
                    setTimeout(() => {
                        this.resizeCanvas();
                        if (!this.gameRunning) {
                            this.renderStartScreenBackground();
                        }
                        // Ensure stats are hidden on start screen
                        this.showModalHeader();
                    }, 100);
                }
            } catch (e) {
                console.error('Initial canvas setup error:', e);
            }
        }, 50);
    }
    
    createGameModal() {
        // Clean up any existing modals
        const allModals = document.querySelectorAll('[id*="vibe-survivor"], [class*="vibe-survivor"], [class*="modal"]');
        
        // Remove existing vibe-survivor MODAL elements only (preserve buttons)
        const existingModals = document.querySelectorAll('#vibe-survivor-modal, .vibe-survivor-modal');
        // Remove existing modal elements
        existingModals.forEach(modal => modal.remove());
        
        // Also check for any high z-index elements that might be covering content
        const highZElements = Array.from(document.querySelectorAll('*')).filter(el => {
            const zIndex = parseInt(window.getComputedStyle(el).zIndex);
            return zIndex > 9000;
        });
        // Check for high z-index elements

        const modalHTML = `
            <div id="vibe-survivor-modal" class="vibe-survivor-modal">
                <div class="vibe-survivor-content">
                    <div id="vibe-survivor-container" class="vibe-survivor-container">
                        <div class="vibe-survivor-header">
                            <button id="pause-btn" class="pause-btn">||</button>
                            
                            <!-- Game Stats in Header -->
                            <div class="header-stats" id="header-stats" style="display: none;">
                                <div class="header-primary-stats">
                                    <!-- Stacked Vitals (HP/XP) -->
                                    <div class="header-vitals">
                                        <div class="header-health">
                                            <div class="header-health-bar">
                                                <div class="header-health-fill" id="header-health-fill"></div>
                                            </div>
                                            <span class="header-health-text" id="header-health-text">100</span>
                                        </div>
                                        
                                        <div class="header-xp">
                                            <div class="header-xp-bar">
                                                <div class="header-xp-fill" id="header-xp-fill"></div>
                                            </div>
                                            <span class="header-level-text" id="header-level-text">Lv1</span>
                                        </div>
                                    </div>
                                    
                                    <!-- Stacked Timing Info (Time/Boss) -->
                                    <div class="header-timing">
                                        <div class="header-time" id="header-time-display">0:00</div>
                                        <div class="header-bosses" id="header-boss-display" style="display: none;">Boss x0</div>
                                    </div>
                                </div>
                                
                                <div class="header-weapons" id="header-weapon-display"></div>
                            </div>
                            
                            <!-- Game Title (shown when not in game) -->
                            <h2 id="game-title">VIBE SURVIVOR</h2>
                            
                            <button id="close-survivor" class="close-btn">×</button>
                        </div>
                        
                        <!-- Separate Start Screen Overlay -->
                        <div id="survivor-start-overlay" class="survivor-start-overlay active">
                            <div class="survivor-title">
                                <h1>VIBE SURVIVOR</h1>
                                <p>Survive the endless waves!</p>
                                <p class="controls-info">Use WASD to move, SPACEBAR to dash</p>
                                <button id="start-survivor" class="survivor-btn primary">START GAME</button>
                            </div>
                        </div>
                        
                        <div id="game-screen" class="vibe-survivor-screen" style="position: relative;">
                            <canvas id="survivor-canvas"></canvas>
                            
                            <!-- Mobile Dash Button (inside canvas area) -->
                            <div id="mobile-dash-btn" class="mobile-dash-btn" style="display: none;">
                                <span>DASH</span>
                            </div>
                            
                            <!-- Pause Menu -->
                            <div id="pause-menu" class="pause-menu" style="display: none;">
                                <div class="pause-content">
                                    <h2>GAME PAUSED</h2>
                                    <div class="pause-buttons">
                                        <button id="resume-btn" class="survivor-btn primary">RESUME</button>
                                        <button id="exit-to-menu-btn" class="survivor-btn">EXIT</button>
                                    </div>
                                    <p class="pause-hint">Press ESC to resume</p>
                                </div>
                            </div>

                            <!-- Mobile Touch Controls -->
                            <div id="mobile-controls" class="mobile-controls" style="display: none;">
                                <!-- Virtual Joystick -->
                                <div id="virtual-joystick" class="virtual-joystick">
                                    <div id="joystick-handle" class="joystick-handle"></div>
                                </div>
                            </div>
                        </div>
                        
                        <div id="survivor-game-over-screen" class="vibe-survivor-screen">
                            <div class="survivor-game-over">
                                <h2>GAME OVER</h2>
                                <div id="final-stats"></div>
                                <div class="survivor-buttons">
                                    <button id="restart-survivor" class="survivor-btn primary">PLAY AGAIN</button>
                                    <button id="exit-survivor" class="survivor-btn">EXIT</button>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Toast Notification Container (at modal level) -->
                    <div id="toast-container" class="toast-container"></div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Add toast notification styles
        this.addToastStyles();
        
        // Add touch event listeners to prevent background page scrolling
        this.preventBackgroundScrolling();
        
        // Modal created successfully
    }
    
    addStyles() {
        if (document.getElementById('vibe-survivor-styles')) return;
        
        const styles = document.createElement('style');
        styles.id = 'vibe-survivor-styles';
        styles.textContent = `
            :root {
                --header-height: 70px; /* Default header height */
                --canvas-margin: 80px;
                --safe-zone-mobile: 60px;
                --touch-control-size: 100px;
            }
            
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
            
            @keyframes joystickPulse {
                0%, 100% {
                    opacity: 0.6;
                    transform: scale(0.8);
                    box-shadow: 0 0 20px rgba(0, 255, 255, 0.3),
                               0 0 40px rgba(0, 255, 255, 0.1);
                }
                50% {
                    opacity: 0.8;
                    transform: scale(0.85);
                    box-shadow: 0 0 25px rgba(0, 255, 255, 0.4),
                               0 0 50px rgba(0, 255, 255, 0.15);
                }
            }
            
            .vibe-survivor-modal {
                position: fixed;
                top: 10px;
                left: 0;
                width: 100%;
                height: calc(100dvh - 40px);
                background: transparent;
                backdrop-filter: blur(10px);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                animation: fadeIn 0.3s ease;
                overscroll-behavior: none;
            }

            .vibe-survivor-content {
                background: linear-gradient(135deg, #0a0a1a 0%, #1a0a2a 100%);
                border-radius: 20px;
                padding: 0;
                width: 95%;
                max-width: 900px;
                height: calc(100dvh - 100px);
                display: flex;
                flex-direction: column;
                border: 2px solid #00ffff;
                box-shadow: 0 0 40px rgba(0, 255, 255, 0.3),
                           inset 0 0 20px rgba(0, 255, 255, 0.1);
                overflow: hidden;
                touch-action: none;
                overscroll-behavior: none;
            }

            .vibe-survivor-header {
                padding: 15px 20px;
                border-bottom: 2px solid rgba(0, 255, 255, 0.3);
                display: flex !important;
                justify-content: space-between;
                align-items: center;
                position: relative !important;
                pointer-events: auto !important;
                visibility: visible !important;
                opacity: 1 !important;
                background: rgba(0, 20, 40, 0.8);
                height: 90px;
                flex-wrap: nowrap;
            }
            
            .header-stats {
                display: flex !important;
                align-items: center;
                gap: 5px;
                flex: 1;
                justify-content: center;
                margin: 0 60px; /* Reserve 60px each side for buttons */
                overflow: hidden; /* Prevent content overflow */
                flex-wrap: wrap; /* Allow wrapping to multiple rows */
            }
            
            .header-primary-stats {
                display: flex;
                align-items: center;
                gap: 20px;
                flex-shrink: 0; /* Prevent primary stats from shrinking */
            }
            
            .header-vitals {
                display: flex;
                flex-direction: column;
                gap: 4px;
            }
            
            .header-timing {
                display: flex;
                flex-direction: column;
                gap: 2px;
                align-items: center;
            }

            .header-health, .header-xp {
                display: flex;
                align-items: center;
                gap: 8px;
            }
            
            .header-health-bar, .header-xp-bar {
                width: 100px;
                height: 8px;
                background: rgba(255, 255, 255, 0.2);
                border: 1px solid rgba(255, 255, 255, 0.3);
                border-radius: 4px;
                overflow: hidden;
            }
            
            .header-health-fill {
                height: 100%;
                background-color: #00ff00; /* Default green, will be overridden by JavaScript */
                transition: width 0.3s ease, background-color 0.3s ease;
                border-radius: 3px;
            }
            
            .header-xp-fill {
                height: 100%;
                background: linear-gradient(90deg, #00ffff, #00cccc);
                transition: width 0.3s ease;
                border-radius: 3px;
                box-shadow: 0 0 5px rgba(0, 255, 255, 0.5);
            }
            
            .header-health-text, .header-level-text, .header-time, .header-bosses {
                color: #00ffff;
                font-size: 14px;
                font-weight: bold;
                text-shadow: 0 0 5px rgba(0, 255, 255, 0.5);
                min-width: 30px;
            }
            
            .header-bosses {
                color: #ff00ff;
                text-shadow: 0 0 5px rgba(255, 0, 255, 0.5);
            }
            
            .header-time {
                font-size: 16px;
                color: #ffff00;
                margin-right: 10px;
                text-shadow: 0 0 8px rgba(255, 255, 0, 0.6);
            }
            
            .header-weapons {
                display: flex;
                gap: 8px;
                align-items: center;
            }
            
            .header-weapon-item {
                background: rgba(0, 255, 255, 0.2);
                border: 1px solid rgba(0, 255, 255, 0.4);
                border-radius: 4px;
                padding: 3px 6px;
                font-size: 11px;
                color: #00ffff;
                text-shadow: 0 0 3px rgba(0, 255, 255, 0.8);
            }
            
            .header-weapon-merge {
                background: rgba(255, 215, 0, 0.3) !important;
                border: 1px solid rgba(255, 215, 0, 0.6) !important;
                color: #FFD700 !important;
                text-shadow: 0 0 5px rgba(255, 215, 0, 0.8) !important;
                font-weight: bold !important;
            }
            
            /* Ultra-narrow mobile screens */
            @media screen and (max-width: 320px) {
                .vibe-survivor-header {
                    padding: 8px 10px;
                    min-height: 70px; /* Increased for two-row layout */
                    flex-direction: row;
                    align-items: center;
                }
                
                .pause-btn, .close-btn {
                    width: 32px !important;
                    height: 32px !important;
                    font-size: 16px !important;
                }
                
                .header-stats {
                    gap: 5px;
                    flex: 1;
                    justify-content: center;
                    align-items: center;
                    margin: 0 45px; /* 32px buttons + 13px clearance each side */
                    overflow: visible; /* Allow overflow for wrapped content */
                    flex-direction: column; /* Stack rows vertically */
                }
                
                .header-primary-stats {
                    gap: 8px;
                    justify-content: space-between;
                    width: 100%;
                }
                
                .header-vitals {
                    gap: 2px;
                }
                
                .header-timing {
                    gap: 1px;
                    align-items: center;
                }
                
                .header-health, .header-xp {
                    flex-direction: column;
                    gap: 2px;
                    align-items: center;
                }
                
                .header-health-bar, .header-xp-bar {
                    width: 40px;
                    height: 4px;
                }
                
                .header-health-text, .header-level-text {
                    font-size: 9px;
                    min-width: 20px;
                }
                
                .header-time {
                    font-size: 11px;
                }
                
                .header-weapons {
                    display: flex; /* Show weapons below on ultra-narrow screens */
                    width: 100%;
                    justify-content: center;
                    margin-top: 3px;
                }
            }
            
            /* Narrow mobile screens */
            @media screen and (min-width: 321px) and (max-width: 400px) {
                .vibe-survivor-header {
                    padding: 8px 12px;
                    min-height: 75px; /* Increased for two-row layout */
                }
                
                .pause-btn, .close-btn {
                    width: 35px !important;
                    height: 35px !important;
                    font-size: 17px !important;
                }
                
                .header-stats {
                    gap: 5px;
                    margin: 0 50px; /* 35px buttons + 15px clearance each side */
                    overflow: visible; /* Allow overflow for wrapped content */
                    flex-direction: column; /* Stack rows vertically */
                }
                
                .header-primary-stats {
                    gap: 15px;
                    justify-content: center;
                    width: 100%;
                }
                
                .header-vitals {
                    gap: 3px;
                }
                
                .header-timing {
                    gap: 2px;
                    align-items: center;
                }
                
                .header-weapons {
                    display: flex; /* Show weapons below on narrow screens */
                    width: 100%;
                    justify-content: center;
                    margin-top: 5px;
                }
                
                .header-health-bar, .header-xp-bar {
                    width: 60px;
                    height: 5px;
                }
                
                .header-health-text, .header-level-text {
                    font-size: 10px;
                    min-width: 22px;
                }
                
                .header-time {
                    font-size: 12px;
                }
                
                .header-weapon-item {
                    padding: 1px 3px;
                    font-size: 8px;
                }
            }
            
            /* Standard mobile screens */
            @media screen and (min-width: 401px) and (max-width: 530px) {
                .vibe-survivor-header {
                    padding: 10px 15px;
                    min-height: 60px;
                }
                
                .header-stats {
                    gap: 5px;
                    margin: 0 55px; /* 40px buttons + 15px clearance each side */
                    overflow: hidden;
                    flex-direction: row; /* Keep single row for standard mobile */
                }
                
                .header-primary-stats {
                    gap: 15px;
                }
                
                .header-vitals {
                    gap: 4px;
                }
                
                .header-timing {
                    gap: 2px;
                    align-items: center;
                }
                
                .header-health-bar, .header-xp-bar {
                    width: 80px;
                    height: 6px;
                }
                
                .header-health-text, .header-level-text {
                    font-size: 12px;
                    min-width: 25px;
                }
                
                .header-time {
                    font-size: 14px;
                }
                
                .header-weapon-item {
                    padding: 2px 4px;
                    font-size: 10px;
                }
            }

            .vibe-survivor-header h2 {
                color: #00ffff;
                margin: 0;
                font-family: 'Arial', sans-serif;
                font-weight: bold;
                text-shadow: 0 0 10px rgba(0, 255, 255, 0.5);
            }

            .close-btn {
                background: rgba(255, 0, 255, 0.1);
                border: 2px solid #ff00ff;
                color: #ff00ff;
                width: 40px;
                height: 40px;
                min-width: 40px;
                min-height: 40px;
                flex-shrink: 0;
                border-radius: 50%;
                font-size: 24px;
                font-weight: bold;
                transition: all 0.3s ease;
                position: absolute !important;
                top: 23px !important;
                right: 15px !important;
                z-index: 999999 !important;
                pointer-events: auto !important;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
                cursor: pointer;
            }

            .close-btn:hover {
                background: #ff00ff;
                color: #fff;
                transform: rotate(90deg);
                box-shadow: 0 0 20px rgba(255, 0, 255, 0.8);
            }
            
            /* Position pause button on left */
            #pause-btn {
                position: absolute !important;
                top: 23px !important;
                left: 15px !important;
                z-index: 999999 !important;
                pointer-events: auto !important;
                min-width: 40px; /* Ensure button maintains size */
                min-height: 40px;
                flex-shrink: 0; /* Prevent button from shrinking */
            }
            
            /* Hide pause button initially */
            #pause-btn {
                display: none;
            }

            .vibe-survivor-screen {
                position: absolute;
                top: 0;
                left: 0;
                width: 100% !important;
                display: none !important;
                align-items: center !important;
                justify-content: center !important;
                flex-direction: column !important;
                z-index: 100 !important;
                background: transparent !important;
                overflow: hidden !important;
            }
            
            /* Separate Start Screen Overlay - Contained within modal */
            .survivor-start-overlay {
                position: relative;
                top: 50%;
                max-height: 100%;
                max-width: 900px;
                display: none !important;
                align-items: center !important;
                justify-content: center !important;
                flex-direction: column !important;
                z-index: 150 !important;
                background: linear-gradient(135deg, #0a0a1a 0%, #1a0a2a 100%);
                backdrop-filter: blur(5px) !important;
                overflow: hidden !important;
                border-radius: inherit;
            }
            
            .survivor-start-overlay.active {
                display: flex !important;
                visibility: visible !important;
                opacity: 1 !important;
            }

            .vibe-survivor-screen.active {
                display: flex !important;
                visibility: visible !important;
                opacity: 1 !important;
            }

            .survivor-title {
                text-align: center;
                margin-bottom: 40px;
                color: white;
            }

            .survivor-title h1 {
                color: #00ffff;
                font-size: 32px;
                margin-bottom: 20px;
                font-family: 'Arial Black', sans-serif;
                animation: neonPulse 2s ease-in-out infinite;
            }

            .survivor-title p {
                color: rgba(255, 255, 255, 0.8);
                margin-bottom: 30px;
                font-size: 16px;
                font-family: 'Courier New', monospace;
            }

            .controls-info {
                color: rgba(255, 255, 255, 0.8) !important;
                margin-top: 20px !important;
                font-size: 16px !important;
                font-family: 'Courier New', monospace !important;
            }

            .survivor-btn {
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
                margin: 10px;
            }

            .survivor-btn::before {
                content: '';
                position: absolute;
                top: 0;
                left: -100%;
                width: 100%;
                height: 100%;
                background: linear-gradient(90deg, transparent, #00ffff, transparent);
                transition: left 0.5s ease;
            }

            .survivor-btn:hover {
                background: rgba(0, 255, 255, 0.1);
                box-shadow: 0 0 30px rgba(0, 255, 255, 0.8),
                           inset 0 0 20px rgba(0, 255, 255, 0.2);
                transform: translateY(-2px);
            }

            .survivor-btn:hover::before {
                left: 100%;
            }

            .survivor-btn.primary {
                background: transparent;
                border: 2px solid #ff00ff;
                color: #ff00ff;
                box-shadow: 0 0 15px rgba(255, 0, 255, 0.3);
            }

            .survivor-btn.primary:hover {
                background: rgba(255, 0, 255, 0.1);
                box-shadow: 0 0 20px rgba(255, 0, 255, 0.8);
            }

            #survivor-canvas {
                border-radius: 10px;
            }



            
            .pause-btn {
                background: rgba(0, 255, 255, 0.1);
                border: 2px solid #00ffff;
                color: #00ffff;
                width: 40px;
                height: 40px;
                border-radius: 50%;
                font-size: 20px;
                cursor: pointer;
                transition: all 0.3s ease;
                z-index: 999999 !important;
                pointer-events: auto !important;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
            }
            
            .pause-btn:hover {
                background: #00ffff;
                color: #000;
                box-shadow: 0 0 20px rgba(0, 255, 255, 0.8);
                transform: scale(1.1);
            }
            

            .pause-menu {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.8);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 20000;
                backdrop-filter: blur(5px);
            }

            .pause-content {
                background: linear-gradient(135deg, #0a0a1a, #1a0a2a);
                border: 2px solid #00ffff;
                border-radius: 15px;
                padding: 40px;
                text-align: center;
                box-shadow: 0 0 30px rgba(0, 255, 255, 0.5);
            }

            .pause-content h2 {
                color: #00ffff;
                font-size: 2rem;
                margin-bottom: 30px;
                text-shadow: 0 0 20px rgba(0, 255, 255, 0.8);
            }

            .pause-buttons {
                display: flex;
                flex-direction: column;
                gap: 15px;
                margin-bottom: 20px;
            }

            .pause-hint {
                color: #888;
                font-size: 0.9rem;
                margin: 0;
            }

            .survivor-game-over {
                text-align: center;
                color: white;
                background: linear-gradient(135deg, rgba(0, 0, 0, 0.95), rgba(0, 20, 40, 0.95));
                padding: 40px;
                border-radius: 20px;
                border: 2px solid #00ffff;
                box-shadow: 0 0 40px rgba(0, 255, 255, 0.4),
                           inset 0 0 30px rgba(0, 255, 255, 0.1);
                backdrop-filter: blur(10px);
                max-width: 500px;
                margin: 0 auto;
            }

            .survivor-game-over h2 {
                color: #ff0066;
                font-size: 36px;
                margin-bottom: 25px;
                text-shadow: 0 0 20px rgba(255, 0, 102, 0.8),
                            0 0 40px rgba(255, 0, 102, 0.5);
                font-family: 'Arial Black', sans-serif;
                animation: neonPulse 2s ease-in-out infinite;
            }

            .final-stats {
                margin: 20px 0 30px;
                font-family: 'Courier New', monospace;
            }

            .stat-row {
                display: flex;
                justify-content: space-between;
                margin: 10px 0;
                font-size: 18px;
                color: #00ffff;
                min-width: 250px;
            }

            .survivor-buttons {
                margin-top: 30px;
                display: flex;
                gap: 15px;
                justify-content: center;
            }

            .levelup-modal {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: linear-gradient(135deg, #0a0a1a, #1a0a2a);
                border: 2px solid #00ffff;
                border-radius: 15px;
                padding: 30px;
                z-index: 2000;
                box-shadow: 0 0 30px rgba(0, 255, 255, 0.5);
                backdrop-filter: blur(10px);
            }

            .levelup-title {
                text-align: center;
                color: #00ffff;
                font-size: 1.5rem;
                margin-bottom: 10px;
                text-shadow: 0 0 10px rgba(0, 255, 255, 0.5);
            }

            .upgrade-choices {
                display: flex;
                gap: 10px;
                flex-wrap: wrap;
                justify-content: center;
            }

            .upgrade-choice {
                background: rgba(0, 255, 255, 0.1);
                border: 2px solid #00ffff;
                border-radius: 10px;
                padding: 10px;
                width: 200px;
                transition: all 0.3s ease;
                text-align: center;
            }

            .upgrade-choice:hover {
                background: rgba(0, 255, 255, 0.2);
                transform: scale(1.03);
                box-shadow: 0 0 15px rgba(0, 255, 255, 0.4);
            }

            .upgrade-choice h3 {
                color: #00ffff;
                margin: 0 0 10px 0;
                font-size: 1.2rem;
            }

            .upgrade-choice p {
                color: white;
                margin: 0;
                font-size: 0.9rem;
                opacity: 0.9;
            }

            /* Mobile Touch Controls */
            .mobile-controls {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                pointer-events: none;
                z-index: 15000;
                background: transparent !important;
            }

            .virtual-joystick {
                position: absolute;
                width: 80px;
                height: 80px;
                background: rgba(0, 255, 255, 0.2);
                border: 2px solid rgba(0, 255, 255, 0.6);
                border-radius: 50%;
                pointer-events: none; /* Let touches pass through to canvas */
                touch-action: none;
                backdrop-filter: blur(3px);
                display: none; /* Hidden by default for floating mode */
                opacity: 0;
                transform: scale(0.8);
                transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
                z-index: 16000; /* Above other controls */
                box-shadow: 0 0 20px rgba(0, 255, 255, 0.3), 
                           0 0 40px rgba(0, 255, 255, 0.1);
                animation: joystickPulse 2s ease-in-out infinite;
            }
            
            .virtual-joystick.active {
                opacity: 0.9;
                transform: scale(1);
                background: rgba(0, 255, 255, 0.4);
                border-color: rgba(0, 255, 255, 0.8);
                box-shadow: 0 0 25px rgba(0, 255, 255, 0.6),
                           0 0 50px rgba(0, 255, 255, 0.2);
                animation: none;
            }

            .joystick-handle {
                position: absolute;
                width: 40px;
                height: 40px;
                background: linear-gradient(135deg, #00ffff 0%, #00cccc 100%);
                border: 2px solid rgba(255, 255, 255, 0.3);
                border-radius: 50%;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                box-shadow: 0 0 15px rgba(0, 255, 255, 0.8),
                           inset 0 0 10px rgba(255, 255, 255, 0.2);
                transition: all 0.15s cubic-bezier(0.25, 0.46, 0.45, 0.94);
                cursor: pointer;
            }
            
            .joystick-handle.moving {
                background: linear-gradient(135deg, #ff00ff 0%, #cc00cc 100%);
                box-shadow: 0 0 20px rgba(255, 0, 255, 0.8),
                           inset 0 0 15px rgba(255, 255, 255, 0.3);
                transform: translate(-50%, -50%) scale(1.1);
            }

            .mobile-dash-btn {
                position: absolute;
                bottom: 60px;
                right: 60px;
                width: 80px;
                height: 80px;
                background: rgba(0, 255, 255, 0.3);
                border: 2px solid rgba(0, 255, 255, 0.6);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                color: #00ffff;
                font-weight: bold;
                font-size: 10px;
                pointer-events: auto;
                touch-action: none;
                user-select: none;
                box-shadow: 0 0 15px rgba(0, 255, 255, 0.6);
                backdrop-filter: blur(3px);
                z-index: 1000;
            }

            .mobile-dash-btn:active {
                background: #00ffff;
                transform: scale(0.9);
            }

            .vibe-survivor-hidden {
                display: none !important;
            }

            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }

            @keyframes pulse {
                from { transform: scale(1); }
                to { transform: scale(1.05); }
            }

            .pulse {
                animation: pulse 0.3s ease-in-out;
            }

            /* Mobile responsive positioning */
            @media screen and (max-width: 480px) {
                .vibe-survivor-content {
                    /* Height handled by earlier mobile media query - don't override */
                    border-radius: 10px;
                }
                
                .vibe-survivor-header {
                    position: relative !important;
                    display: flex !important;
                    flex-direction: row !important;
                    justify-content: space-between !important;
                    align-items: center !important;
                    padding: 10px 15px !important;
                    top: auto !important;
                    left: auto !important;
                    right: auto !important;
                    bottom: auto !important;
                }
                
                .close-btn { 
                    position: absolute !important;
                    top: 23px !important; 
                    right: 15px !important; 
                    width: 32px; 
                    height: 32px; 
                    font-size: 18px; 
                    margin: 0 !important;
                }
                
                .survivor-ui {
                    /* Keep normal UI layout on mobile - no shrinking */
                    position: fixed !important;
                    bottom: 20px !important;
                    left: 20px !important;
                    right: 20px !important;
                    top: auto !important;
                    margin: 0 !important;
                    display: grid !important;
                    grid-template-columns: 1fr auto 1fr !important;
                    grid-template-areas: "stats time weapon" !important;
                    align-items: center !important;
                    padding: 12px 15px !important;
                    /* Remove max-height restriction */
                    text-align: center !important;
                }
                
                .survivor-stats {
                    grid-area: stats !important;
                    gap: 8px !important;
                    justify-content: center !important;
                }
                
                .time-display {
                    grid-area: time !important;
                    justify-self: center !important;
                    font-size: 14px !important;
                }
                
                .weapon-display {
                    /* Place in safe zone - centered between touch controls */
                    position: static !important;
                    margin: 0 auto !important;
                    display: flex !important;
                    justify-content: center !important;
                    align-items: center !important;
                    max-width: calc(100% - 40px) !important;
                }
                
                .distance-meter, .level-display {
                    font-size: 12px !important;
                }
                
                .distance-value, .level-value {
                    font-size: 18px !important;
                }
            }
                
                /* Duplicate CSS rules removed and consolidated above */
                
                .distance-meter, .level-display {
                    gap: 8px;
                }
                
                .distance-value, .level-value {
                    font-size: 16px;
                    min-width: 60px;
                }

                .survivor-title h1 {
                    font-size: 24px;
                }
                
                /* Duplicate rule removed - weapon display handled in main mobile section */
            }
            
            /* Tablet responsive adjustments */
            @media screen and (min-width: 531px) and (max-width: 1024px) {
                .survivor-ui {
                    bottom: 25px;
                    left: 20px;
                    right: 20px;
                    padding: 10px 12px;
                }
                
                .health-bar, .xp-bar {
                    width: 100px;
                }
                
                .time-display {
                    font-size: 15px;
                }
            }

            /* Show mobile controls only on touch devices */
            @media (hover: none) and (pointer: coarse) {
                .mobile-controls {
                    display: block !important;
                }
            }
        `;
        
        document.head.appendChild(styles);
    }
    
    setupEventHandlers() {
        // Setting up event listeners
        document.getElementById('close-survivor').addEventListener('click', () => {
            this.closeGame();
        });
        
        document.getElementById('start-survivor').addEventListener('click', () => {
            this.resetMenuNavigation();
            this.startGame();
        });
        
        document.getElementById('restart-survivor').addEventListener('click', () => {
            this.resetMenuNavigation();
            this.restartGame();
        });
        
        document.getElementById('exit-survivor').addEventListener('click', () => {
            this.resetMenuNavigation();
            this.closeGame();
        });
        
        // Pause button event listener
        document.getElementById('pause-btn').addEventListener('click', () => {
            this.togglePause();
        });
        
        // Pause menu event listeners
        document.getElementById('resume-btn').addEventListener('click', () => {
            this.togglePause();
        });
        
        document.getElementById('exit-to-menu-btn').addEventListener('click', () => {
            this.closeGame();
        });
        
        // Keyboard controls
        document.addEventListener('keydown', (e) => {
            // Menu navigation takes priority
            if (this.menuNavigationState.active) {
                // Handle menu navigation keys
                switch(e.key.toLowerCase()) {
                    case 'arrowup':
                    case 'w':
                        e.preventDefault();
                        this.navigateMenu('up');
                        break;
                    case 'arrowdown':
                    case 's':
                        e.preventDefault();
                        this.navigateMenu('down');
                        break;
                    case 'arrowleft':
                    case 'a':
                        e.preventDefault();
                        this.navigateMenu('left');
                        break;
                    case 'arrowright':
                    case 'd':
                        e.preventDefault();
                        this.navigateMenu('right');
                        break;
                    case 'enter':
                        e.preventDefault();
                        this.selectCurrentMenuItem();
                        break;
                    case 'escape':
                        e.preventDefault();
                        // Close menu or toggle pause based on menu type
                        if (this.menuNavigationState.menuType === 'levelup') {
                            // Can't escape level up menu
                        } else if (this.menuNavigationState.menuType === 'gameover') {
                            // Can't escape game over menu  
                        } else if (this.menuNavigationState.menuType === 'pause') {
                            this.togglePause();
                        }
                        break;
                }
                return;
            }
            
            // Regular game controls
            if (this.gameRunning) {
                // Store both lowercase and original case for arrow keys
                this.keys[e.key.toLowerCase()] = true;
                this.keys[e.key] = true;
                
                // Prevent default for game keys to avoid page scrolling
                if (e.key === ' ' || 
                    e.key.toLowerCase() === 'w' || 
                    e.key.toLowerCase() === 'a' || 
                    e.key.toLowerCase() === 's' || 
                    e.key.toLowerCase() === 'd' ||
                    e.key === 'ArrowUp' ||
                    e.key === 'ArrowDown' ||
                    e.key === 'ArrowLeft' ||
                    e.key === 'ArrowRight' ||
                    e.key.toLowerCase() === 'escape') {
                    e.preventDefault();
                }
                
                if (e.key.toLowerCase() === 'escape') {
                    this.togglePause();
                }
            }
        });
        
        document.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
            this.keys[e.key] = false;
        });
        
        window.addEventListener('resize', () => {
            this.resizeCanvas();
            if (this.isMobile) {
                const dashBtn = document.getElementById('mobile-dash-btn');
                if (dashBtn) {
                    setTimeout(() => this.ensureDashButtonInBounds(dashBtn), 50);
                }
            }
        });
        
        // Setup mobile controls if on mobile device
        if (this.isMobile) {
            this.setupMobileControls();
        }
    }

    launchGame() {
        // Launching game with fresh modal state
        
        // Always remove existing modal and create fresh one to avoid overlay issues
        const existingModal = document.getElementById('vibe-survivor-modal');
        if (existingModal) {
            // Remove existing modal to prevent overlay issues
            existingModal.remove();
        }
        
        // Create completely fresh modal
        this.createGameModal();
        
        // Set up event handlers for the fresh modal
        this.setupEventHandlers();
        
        // Show modal
        const modal = document.getElementById('vibe-survivor-modal');
        if (modal) {
            modal.style.display = 'flex';
            // Modal ready for display
        } else {
            console.error('Failed to create modal!');
            return;
        }
        
        // Show fresh start screen
        this.showStartScreen();
        
    }
    
    openGame() {
        const modal = document.getElementById('vibe-survivor-modal');
        if (modal) {
            modal.style.display = 'flex';
        }
        
        // Pause background animations for better game performance
        if (window.PerformanceManager) {
            window.PerformanceManager.pauseBackgroundAnimations();
        }
        
        try {
            this.canvas = document.getElementById('survivor-canvas');
            this.ctx = this.canvas.getContext('2d', { 
                alpha: false, // No transparency needed - better performance
                desynchronized: true // Allow browser to optimize rendering
            });
            this.resizeCanvas();
            
            // Ensure canvas renders initial background for start screen
            // Use requestAnimationFrame to ensure DOM is ready
            requestAnimationFrame(() => {
                this.renderStartScreenBackground();
            });
        } catch (e) {
            console.error('Canvas initialization error:', e);
        }
        
        this.showStartScreen();
    }
    
    resizeCanvas() {
        if (this.canvas) {
            // First try to get dimensions from getBoundingClientRect
            const rect = this.canvas.getBoundingClientRect();
            let canvasWidth = Math.round(rect.width);
            let canvasHeight = Math.round(rect.height);
            
            // If canvas has zero or invalid dimensions, calculate from modal
            if (canvasWidth <= 0 || canvasHeight <= 0) {
                const modal = document.querySelector('.vibe-survivor-modal');
                if (modal) {
                    const modalRect = modal.getBoundingClientRect();
                    canvasWidth = Math.round(modalRect.width - 40); // 20px padding on each side
                    // Calculate available height: modal height minus header height and padding
                    const headerHeight = 60; // Header height
                    const verticalPadding = 60; // Increased padding to show canvas borders (30px top + 30px bottom)
                    canvasHeight = Math.round(modalRect.height - headerHeight - verticalPadding);
                    console.log(`Fallback canvas sizing from modal: ${canvasWidth}x${canvasHeight} (modal: ${Math.round(modalRect.width)}x${Math.round(modalRect.height)})`);
                }
            }
            
            // For better accuracy, always use modal-based sizing if available
            const modal = document.querySelector('.vibe-survivor-modal');
            if (modal) {
                const modalRect = modal.getBoundingClientRect();
                const modalBasedWidth = Math.round(modalRect.width - 40);
                // Calculate dynamic height based on available modal space
                const headerHeight = 100; // Header height
                const verticalPadding = 60; // Increased padding to show canvas borders
                const modalBasedHeight = Math.round(modalRect.height - headerHeight - verticalPadding);
                
                // Use modal-based sizing if it's different or more accurate
                if (modalBasedWidth > 0 && modalBasedHeight > 0) {
                    canvasWidth = modalBasedWidth;
                    canvasHeight = modalBasedHeight;
                }
            }
            
            // Only set dimensions if we have valid non-zero values
            if (canvasWidth > 0 && canvasHeight > 0) {
                // Set internal canvas resolution to match calculated dimensions
                this.canvas.width = canvasWidth;
                this.canvas.height = canvasHeight;
                console.log(`Canvas resized to: ${canvasWidth}x${canvasHeight}`);
            } else {
                console.warn('Canvas has zero dimensions, skipping resize');
                return;
            }
            
            // Speed scaling removed - game speed should be consistent across all screen sizes
            
            // Don't override CSS - let responsive breakpoints handle sizing
            // CSS already handles display: block, margins, and positioning
            
            // Initialize canvas layers (only once)
            if (!this.canvasLayersInitialized) {
                this.initializeCanvasLayers();
                this.canvasLayersInitialized = true;
            } else if (this.canvasLayers) {
                // Resize existing layers
                this.resizeCanvasLayers();
            }
            
            // Reinitialize offscreen canvases after resize
            if (this.hasOffscreenCanvases) {
                this.initializeOffscreenCanvases();
            }
            
            // If game isn't running, render start screen background (but avoid infinite loop)
            if (!this.gameRunning && !this._isRenderingBackground) {
                this._isRenderingBackground = true;
                setTimeout(() => {
                    this.renderStartScreenBackground();
                    this._isRenderingBackground = false;
                }, 0);
            }
            
            // Canvas resized to match CSS responsive dimensions
        }
    }
    
    
    // Modal header management methods
    hideModalHeader() {
        const header = document.querySelector('#vibe-survivor-modal .vibe-survivor-header');
        if (header) {
            // Hide title and show stats during gameplay
            const title = document.getElementById('game-title');
            const stats = document.getElementById('header-stats');
            
            if (title) {
                title.style.display = 'none';
            }
            if (stats) {
                stats.style.display = 'flex';
            }
            
            // Ensure header maintains proper flexbox layout
            header.style.display = 'flex';
            header.style.justifyContent = 'space-between';
            header.style.alignItems = 'center';
            
            // Header configured for gameplay
        } else {
            // Header not found
        }
    }
    
    showModalHeader() {
        const header = document.querySelector('#vibe-survivor-modal .vibe-survivor-header');
        if (header) {
            // Show title and hide stats during menu screens
            const title = document.getElementById('game-title');
            const stats = document.getElementById('header-stats');
            
            header.style.display = 'flex';
            if (title) {
                title.style.display = 'block';
            }
            if (stats) {
                stats.style.setProperty('display', 'none', 'important');
            }
            // Header shown for menu screens
        } else {
            // Header not found
        }
    }
    
    showStartScreen() {
        // Show modal header for start screen
        this.showModalHeader();
        
        // Ensure game screen (canvas container) is visible behind start screen
        const gameScreen = document.getElementById('game-screen');
        if (gameScreen) {
            gameScreen.style.display = 'flex';
        }
        
        document.querySelectorAll('.vibe-survivor-screen').forEach(screen => screen.classList.remove('active'));
        const startOverlay = document.getElementById('survivor-start-overlay');
        if (startOverlay) {
            startOverlay.classList.add('active');
            
            // Render canvas background now that game screen is visible
            if (this.canvas && this.ctx) {
                requestAnimationFrame(() => {
                    this.renderStartScreenBackground();
                });
            }
            
            // Add menu navigation styles
            this.addMenuNavigationStyles();
            
            // Initialize keyboard navigation for start screen buttons
            const startBtn = document.getElementById('start-survivor');
            const restartBtn = document.getElementById('restart-survivor');
            const exitBtn = document.getElementById('exit-survivor');
            const startButtons = [startBtn, restartBtn, exitBtn].filter(btn => btn); // Filter out null buttons
            
            if (startButtons.length > 0) {
                this.initializeMenuNavigation('start', startButtons);
            }
            
            console.log('showStartScreen: Start screen activated and forced visible');
        } else {
            console.error('showStartScreen: Start screen element not found');
        }
    }
    
    startGame() {
        // Starting game with complete reinitialization
        
        // Reset death flag
        this.playerDead = false;
        
        // Add body class to prevent terminal height changes during gameplay
        document.body.classList.add('game-modal-open');
        
        // Reset pause state and hide pause menu
        this.isPaused = false;
        const pauseMenu = document.getElementById('pause-menu');
        if (pauseMenu) {
            pauseMenu.style.display = 'none';
        }
        
        // CRITICAL FIX: Hide modal header during gameplay
        this.hideModalHeader();
        
        // CRITICAL FIX: Explicitly hide start screen by clearing inline styles
        const startScreen = document.getElementById('survivor-start-overlay');
        if (startScreen) {
            startScreen.style.cssText = 'display: none !important;';
            startScreen.classList.remove('active');
            // Start screen hidden
        }
        
        // Show pause button during gameplay and reset its text
        const pauseBtn = document.getElementById('pause-btn');
        if (pauseBtn) {
            pauseBtn.style.display = 'flex';
            pauseBtn.textContent = '||'; // Reset to pause symbol
        }
        
        // Force complete canvas reinitialization on every start
        this.canvas = null;
        this.ctx = null;
        
        // Cancel any existing game loop first
        if (this.gameLoopId) {
            cancelAnimationFrame(this.gameLoopId);
            this.gameLoopId = null;
        }
        
        // Ensure canvas element exists and get fresh reference
        const canvasElement = document.getElementById('survivor-canvas');
        if (!canvasElement) {
            console.error('Canvas element not found! Recreating modal...');
            // If canvas missing, recreate the entire modal
            this.createGameModal();
            // Try again with new modal
            const newCanvas = document.getElementById('survivor-canvas');
            if (!newCanvas) {
                console.error('Still no canvas after modal recreation!');
                return;
            }
            this.canvas = newCanvas;
        } else {
            this.canvas = canvasElement;
        }
        
        try {
            this.ctx = this.canvas.getContext('2d', { 
                        alpha: false,  // No transparency - better performance
                        willReadFrequently: false  // Enable GPU acceleration
                    });
            if (!this.ctx) {
                throw new Error('Could not get canvas context');
            }
            
            // Optimize canvas settings for maximum performance
            this.ctx.imageSmoothingEnabled = false; // Disable antialiasing for speed
            this.ctx.globalCompositeOperation = 'source-over'; // Fastest composite mode
            
            // Canvas ready
            this.resizeCanvas();
            
            // Initialize offscreen canvases for performance
            this.initializeOffscreenCanvases();
            
        } catch (e) {
            console.error('Canvas initialization failed:', e);
            return;
        }
        
        this.resetGame();
        
        // Optimize memory before starting intensive gameplay
        if (window.PerformanceManager) {
            window.PerformanceManager.optimizeMemory();
        }
        
        // Auto-detect performance mode based on browser and device
        this.detectPerformanceMode();
        
        // Make sure game screen exists before trying to activate it
        const screens = document.querySelectorAll('.vibe-survivor-screen');
        screens.forEach(screen => screen.classList.remove('active'));
        
        const gameScreen = document.getElementById('game-screen');
        if (gameScreen) {
            gameScreen.classList.add('active');
            // Game screen ready
        } else {
            console.error('Game screen not found! Modal structure may be missing.');
            return;
        }
        
        
        // Setup mobile controls when game starts
        if (this.isMobile) {
            this.setupMobileControls();
            
            // Ensure dash button is positioned correctly after canvas setup
            setTimeout(() => {
                const dashBtn = document.getElementById('mobile-dash-btn');
                if (dashBtn) {
                    this.ensureDashButtonInBounds(dashBtn);
                }
            }, 100);
        }
        
        this.gameRunning = true;
        
        // Start background music when game actually begins
        try {
            this.backgroundMusic.currentTime = 0;
            this.backgroundMusic.play();
            // Background music started
        } catch (e) {
            console.warn('Could not start background music:', e);
        }
        
        // Game loop started
        this.gameLoop();
    }
    
    resetGame() {
        this.gameTime = 0;
        this.frameCount = 0;
        this.lastSpawn = 0;
        this.spawnRate = 120;
        this.waveMultiplier = 1;
        this.bossSpawned = false;
        this.isPaused = false; // Ensure pause state is reset
        
        // Reset player - start at world center
        this.player = {
            x: 0,
            y: 0,
            radius: 15,
            speed: 2.0, // Fixed speed for consistent gameplay
            health: 100,
            maxHealth: 100,
            xp: 0,
            level: 1,
            glow: 0,
            invulnerable: 0,
            dashCooldown: 0,
            trail: [],
            passives: {},
            trailMultiplier: 1.0
        };
        
        // Reset weapons to single basic weapon
        this.weapons = [{
            type: 'basic',
            level: 1,
            damage: 15,
            fireRate: 30,
            range: 250,
            projectileSpeed: 6,
            lastFire: 0
        }];
        
        // Clear arrays
        this.enemies = [];
        this.projectiles = [];
        this.particles = [];
        this.xpOrbs = [];
        this.notifications = [];
        
        // Reset object pools - mark all as inactive
        if (this.projectilePool) {
            this.projectilePool.forEach(projectile => projectile.active = false);
        }
        if (this.particlePool) {
            this.particlePool.forEach(particle => particle.active = false);
        }
        if (this.enemyPool) {
            this.enemyPool.forEach(enemy => enemy.active = false);
        }
        
        // Reset frame rate monitoring
        this.frameRateMonitor.frameCount = 0;
        this.frameRateMonitor.lastFrameTime = 0;
        this.frameRateMonitor.fpsHistory = [];
        this.frameRateMonitor.averageFPS = 60;
        this.frameRateMonitor.lastCheck = 0;
        
        // Reset adaptive quality to defaults
        this.frameRateMonitor.adaptiveQuality = {
            particleCount: 1.0,
            effectQuality: 1.0,
            renderDistance: 1.0,
            trailLength: 1.0
        };
        
        // Initialize dirty rectangle system
        this.dirtyRectangles = [];
        this.lastEntityPositions = new Map();
        this.staticCanvasCache = null;
        this.backgroundCanvasCache = null;
        
        this.performanceMode = false;
        this.frameSkipCounter = 0;
        
        this.camera = { x: 0, y: 0 };
    }
    
    gameLoop() {
        if (!this.gameRunning || !this.canvas || !this.ctx) return;
        
        // Update frame rate monitoring
        this.updateFrameRate();
        
        // Performance optimization: Skip frames if needed (FIXED LOGIC)
        if (this.performanceMode) {
            this.frameSkipCounter++;
            // Only skip if counter is odd (runs every other frame = 30fps)
            if (this.frameSkipCounter % 2 === 1) {
                this.gameLoopId = requestAnimationFrame(() => this.gameLoop());
                return;
            }
        }
        
        // Only update game state if not paused, but always draw current state
        if (!this.isPaused) {
            this.update();
        }
        this.draw();
        this.updateUI();
        
        this.gameLoopId = requestAnimationFrame(() => this.gameLoop());
    }
    
    update() {
        // Always update effects even if player is dead
        this.updateScreenShake();
        this.updateRedFlash();
        this.updateExplosions();
        this.updateParticles();
        this.updateNotifications();
        
        // Skip game logic if player is dead
        if (this.playerDead) return;
        
        this.frameCount++;
        this.gameTime = this.frameCount / 60;
        
        this.updatePlayer();
        this.updatePassives();
        this.updateWeapons();
        this.spawnEnemies();
        this.updateEnemies();
        this.updateProjectiles();
        this.updateXPOrbs();
        
        this.checkCollisions();
        this.checkLevelUp();
        this.updateCamera();
        
        // Update adaptive quality scaling
        this.updateAdaptiveQuality();
    }
    
    updatePlayer() {
        const speed = this.player.speed * (this.player.passives.speed_boost ? 1.3 : 1);
        
        // Keyboard WASD movement
        let moveX = 0, moveY = 0;
        
        if (this.keys['w'] || this.keys['arrowup']) {
            moveY -= 1;
        }
        if (this.keys['s'] || this.keys['arrowdown']) {
            moveY += 1;
        }
        if (this.keys['a'] || this.keys['arrowleft']) {
            moveX -= 1;
        }
        if (this.keys['d'] || this.keys['arrowright']) {
            moveX += 1;
        }
        
        // Add mobile joystick movement
        if (this.isMobile && this.touchControls.joystick.active) {
            moveX += this.touchControls.joystick.moveX;
            moveY += this.touchControls.joystick.moveY;
        }
        
        // Apply movement
        this.player.x += moveX * speed;
        this.player.y += moveY * speed;
        
        // Dash mechanic with Spacebar key or mobile dash button
        const shouldDash = this.keys[' '] || (this.isMobile && this.touchControls.dashButton.pressed);
        if (shouldDash && !this.player.dashCooldown) {
            const dashDistance = 40;
            let dashX = 0, dashY = 0;
            
            // Use current movement direction for dash
            if (moveX !== 0 || moveY !== 0) {
                // Normalize the movement direction for consistent dash distance
                const magnitude = Math.sqrt(moveX * moveX + moveY * moveY);
                dashX = (moveX / magnitude) * dashDistance;
                dashY = (moveY / magnitude) * dashDistance;
            } else {
                // Fallback: check individual keys if moveX/moveY are both 0 (keyboard ghosting issue)
                let fallbackX = 0, fallbackY = 0;
                
                // Check arrow keys individually first (prone to ghosting with spacebar)
                if (this.keys['arrowup']) fallbackY -= 1;
                if (this.keys['arrowdown']) fallbackY += 1;
                if (this.keys['arrowleft']) fallbackX -= 1;
                if (this.keys['arrowright']) fallbackX += 1;
                
                // If no arrow keys detected, try WASD as backup
                if (fallbackX === 0 && fallbackY === 0) {
                    if (this.keys['w']) fallbackY -= 1;
                    if (this.keys['s']) fallbackY += 1;
                    if (this.keys['a']) fallbackX -= 1;
                    if (this.keys['d']) fallbackX += 1;
                }
                
                if (fallbackX !== 0 || fallbackY !== 0) {
                    const magnitude = Math.sqrt(fallbackX * fallbackX + fallbackY * fallbackY);
                    dashX = (fallbackX / magnitude) * dashDistance;
                    dashY = (fallbackY / magnitude) * dashDistance;
                } else {
                    // Default forward dash if no direction
                    dashY = -dashDistance;
                }
            }
            
            this.player.x += dashX;
            this.player.y += dashY;
            this.player.dashCooldown = 30;
            this.player.invulnerable = 30;
            this.createDashParticles();
            
            // Reset mobile dash button state after use
            if (this.isMobile) {
                this.touchControls.dashButton.pressed = false;
            }
        }
        
        if (this.player.dashCooldown > 0) {
            this.player.dashCooldown--;
        }
        
        if (this.player.invulnerable > 0) {
            this.player.invulnerable--;
        }
        
        // No bounds checking - infinite world!
        
        // Update trail
        this.player.trail.push({ x: this.player.x, y: this.player.y });
        const baseTrailLength = this.qualitySettings?.trailLength || 8;
        const maxTrailLength = Math.floor(baseTrailLength * (this.player.trailMultiplier || 1.0));
        if (this.player.trail.length > maxTrailLength) {
            this.player.trail.shift();
        }
        
        this.player.glow = (this.player.glow + 0.1) % (Math.PI * 2);
    }
    
    updatePassives() {
        // Regeneration - handle both boolean and object cases
        if (this.player.passives.regeneration && this.player.health < this.player.maxHealth) {
            // Fix: If regeneration is boolean true, convert to object
            if (this.player.passives.regeneration === true) {
                this.player.passives.regeneration = { timer: 0 };
            }
            
            // Ensure regeneration is an object with timer property
            if (typeof this.player.passives.regeneration === 'object') {
                if (!this.player.passives.regeneration.timer) {
                    this.player.passives.regeneration.timer = 0;
                }
                if (this.player.passives.regeneration.timer++ >= 60) { // 1 second
                    this.player.health = Math.min(this.player.maxHealth, this.player.health + 1);
                    this.player.passives.regeneration.timer = 0;
                }
            }
        }
    }
    
    updateWeapons() {
        this.weapons.forEach(weapon => {
            weapon.lastFire++;
            if (weapon.lastFire >= weapon.fireRate) {
                this.fireWeapon(weapon);
                weapon.lastFire = 0;
            }
        });
    }
    
    togglePause() {
        this.isPaused = !this.isPaused;
        const pauseMenu = document.getElementById('pause-menu');
        const pauseBtn = document.getElementById('pause-btn');
        
        if (this.isPaused) {
            // Update pause button to show play symbol
            if (pauseBtn) pauseBtn.textContent = '▶';
            pauseMenu.style.display = 'flex';
            
            // Initialize keyboard navigation for pause menu
            const resumeBtn = document.getElementById('resume-btn');
            const exitBtn = document.getElementById('exit-to-menu-btn');
            const pauseButtons = [resumeBtn, exitBtn].filter(btn => btn); // Filter out null buttons
            
            if (pauseButtons.length > 0) {
                this.menuNavigationState.active = true;
                this.menuNavigationState.menuType = 'pause';
                this.menuNavigationState.selectedIndex = 0;
                this.menuNavigationState.menuButtons = pauseButtons;
                this.updateMenuSelection();
            }
            
            // Pause background music
            if (this.backgroundMusic && !this.backgroundMusic.paused) {
                this.backgroundMusic.pause();
            }
        } else {
            // Update pause button to show pause symbol
            if (pauseBtn) pauseBtn.textContent = '||';
            pauseMenu.style.display = 'none';
            
            // Deactivate keyboard navigation
            this.resetMenuNavigation();
            
            // Resume background music
            if (this.backgroundMusic && this.backgroundMusic.paused) {
                this.backgroundMusic.play().catch(e => {
                    console.warn('Could not resume background music:', e);
                });
            }
        }
    }

    // Menu Navigation Methods
    initializeMenuNavigation(menuType, buttons) {
        this.menuNavigationState.active = true;
        this.menuNavigationState.selectedIndex = 0;
        this.menuNavigationState.menuType = menuType;
        this.menuNavigationState.menuButtons = buttons;
        this.updateMenuSelection();
    }
    
    updateMenuSelection() {
        if (!this.menuNavigationState.active) return;
        
        // Remove previous selection styling
        this.menuNavigationState.menuButtons.forEach((button, index) => {
            button.classList.remove('menu-selected');
            button.style.boxShadow = '';
            button.style.borderColor = '';
        });
        
        // Add current selection styling
        const selectedButton = this.menuNavigationState.menuButtons[this.menuNavigationState.selectedIndex];
        if (selectedButton) {
            selectedButton.classList.add('menu-selected');
            selectedButton.style.boxShadow = '0 0 15px rgba(0, 255, 255, 0.8)';
            selectedButton.style.borderColor = '#00ffff';
        }
    }
    
    navigateMenu(direction) {
        if (!this.menuNavigationState.active) return;
        
        const buttonCount = this.menuNavigationState.menuButtons.length;
        if (buttonCount === 0) return;
        
        if (direction === 'up' || direction === 'left') {
            this.menuNavigationState.selectedIndex = (this.menuNavigationState.selectedIndex - 1 + buttonCount) % buttonCount;
        } else if (direction === 'down' || direction === 'right') {
            this.menuNavigationState.selectedIndex = (this.menuNavigationState.selectedIndex + 1) % buttonCount;
        }
        
        this.updateMenuSelection();
    }
    
    selectCurrentMenuItem() {
        if (!this.menuNavigationState.active) return;
        
        const selectedButton = this.menuNavigationState.menuButtons[this.menuNavigationState.selectedIndex];
        if (selectedButton) {
            selectedButton.click();
        }
    }
    
    resetMenuNavigation() {
        this.menuNavigationState.active = false;
        this.menuNavigationState.selectedIndex = 0;
        this.menuNavigationState.menuType = null;
        this.menuNavigationState.menuButtons = [];
    }
    
    exitToMenu() {
        this.isPaused = false;
        this.gameRunning = false;
        
        // Hide pause menu
        const pauseMenu = document.getElementById('pause-menu');
        if (pauseMenu) {
            pauseMenu.style.display = 'none';
        }
        
        // Show start screen
        this.showStartScreen();
        this.resetGame();
    }
    
    detectMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
               ('ontouchstart' in window) ||
               (navigator.maxTouchPoints > 0);
    }

    detectPerformanceMode() {
        // DISABLED: Don't auto-enable performance mode
        // Let the adaptive system handle performance based on actual FPS measurements
        
        // Only enable for very old mobile devices
        const userAgent = navigator.userAgent.toLowerCase();
        if (this.isMobile && (
            userAgent.includes('android 4') || 
            userAgent.includes('iphone os 9')
        )) {
            console.log('Very old mobile device detected - enabling performance mode');
            this.performanceMode = true;
        } else {
            console.log('Starting in normal performance mode - will adapt based on actual FPS');
            this.performanceMode = false;
        }
    }
    
    preventBackgroundScrolling() {
        const modal = document.getElementById('vibe-survivor-modal');
        const content = document.querySelector('.vibe-survivor-content');
        
        if (!modal || !content) return;
        
        // Prevent touch scrolling on modal and content
        const preventTouchDefault = (e) => {
            // Only prevent default if the touch isn't on game controls
            const target = e.target;
            const isGameControl = target.closest('#survivor-canvas') || 
                                target.closest('.mobile-controls') ||
                                target.closest('.close-btn') ||
                                target.closest('.pause-btn') ||
                                target.closest('.survivor-btn') ||
                                target.closest('.upgrade-choice') ||
                                target.closest('.levelup-modal') ||
                                target.closest('.pause-menu') ||
                                target.closest('#overlay-retry-btn') ||
                                target.closest('#overlay-exit-btn') ||
                                target.closest('#survivor-game-over-overlay');
                                
            if (!isGameControl) {
                e.preventDefault();
                e.stopPropagation();
            }
        };
        
        // Add event listeners to prevent background scrolling
        modal.addEventListener('touchstart', preventTouchDefault, { passive: false });
        modal.addEventListener('touchmove', preventTouchDefault, { passive: false });
        modal.addEventListener('touchend', preventTouchDefault, { passive: false });
        
        content.addEventListener('touchstart', preventTouchDefault, { passive: false });
        content.addEventListener('touchmove', preventTouchDefault, { passive: false });
        content.addEventListener('touchend', preventTouchDefault, { passive: false });
        
        // Also prevent wheel events for desktop
        modal.addEventListener('wheel', (e) => {
            e.preventDefault();
            e.stopPropagation();
        }, { passive: false });
        
        // Prevent body scrolling while modal is open
        document.body.style.overflow = 'hidden';
        document.body.style.position = 'fixed';
        document.body.style.width = '100%';
        document.body.style.height = '100%';
    }
    
    restoreBackgroundScrolling() {
        // Restore normal body scroll behavior
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.width = '';
        document.body.style.height = '';
    }
    
    setupMobileControls() {
        const mobileControls = document.getElementById('mobile-controls');
        const joystick = document.getElementById('virtual-joystick');
        const dashBtn = document.getElementById('mobile-dash-btn');
        
        if (mobileControls && this.isMobile) {
            mobileControls.style.display = 'block';
        }
        
        if (joystick) {
            this.setupVirtualJoystick(joystick);
        }
        
        if (dashBtn) {
            if (this.isMobile) {
                dashBtn.style.display = 'flex';
                this.ensureDashButtonInBounds(dashBtn);
            }
            this.setupDashButton(dashBtn);
        }
    }
    
    ensureDashButtonInBounds(dashBtn) {
        if (!dashBtn) return;
        
        // Always force consistent positioning - same as original CSS
        dashBtn.style.right = '60px';
        dashBtn.style.bottom = '60px';
    }
    
    updateTouchControlsPositioning() {
        if (!this.isMobile) return;
        
        const mobileControls = document.getElementById('mobile-controls');
        const dashBtn = document.getElementById('mobile-dash-btn');
        
        if (!mobileControls) return;
        
        // Only ensure mobile controls are visible - let CSS handle positioning
        if (mobileControls) {
            mobileControls.style.display = 'block';
        }
        
        // Ensure dash button is visible and properly positioned within canvas bounds
        if (dashBtn) {
            // Make sure it's displayed and positioned by CSS responsive breakpoints
            dashBtn.style.display = 'flex';
            
            // Only check bounds, don't override CSS positioning
            this.ensureDashButtonInBounds(dashBtn);
        }
        
        // Let CSS responsive breakpoints handle all positioning
        // JavaScript only ensures visibility and bounds checking
    }
    
    setupVirtualJoystick(joystick) {
        const handle = document.getElementById('joystick-handle');
        const maxDistance = 40; // Increased for better floating experience
        
        // Set up floating joystick with modal-wide touch events
        const canvas = document.getElementById('survivor-canvas');
        const gameModal = document.getElementById('vibe-survivor-modal');
        
        if (!canvas || !gameModal) return;
        
        // Helper function to get touch position relative to modal
        const getTouchPos = (touch) => {
            const modalRect = gameModal.getBoundingClientRect();
            return {
                x: touch.clientX - modalRect.left,
                y: touch.clientY - modalRect.top
            };
        };
        
        // Helper function to check if touch is near dash button area (avoid conflicts)
        const isTouchNearDashButton = (touchX, touchY) => {
            const dashBtn = document.getElementById('mobile-dash-btn');
            if (!dashBtn) return false;
            const rect = dashBtn.getBoundingClientRect();
            const modalRect = gameModal.getBoundingClientRect();
            const btnX = rect.left - modalRect.left + rect.width / 2;
            const btnY = rect.top - modalRect.top + rect.height / 2;
            const distance = Math.sqrt((touchX - btnX) ** 2 + (touchY - btnY) ** 2);
            return distance < 80; // 80px safe zone around dash button
        };
        
        gameModal.addEventListener('touchstart', (e) => {
            // Only handle touches that aren't on interactive elements
            const target = e.target;
            const isInteractiveElement = target.closest('.close-btn') ||
                                       target.closest('.pause-btn') ||
                                       target.closest('.survivor-btn') ||
                                       target.closest('.upgrade-choice') ||
                                       target.closest('.levelup-modal') ||
                                       target.closest('.pause-menu') ||
                                       target.closest('#mobile-dash-btn');
            
            if (isInteractiveElement) return;
            
            e.preventDefault();
            
            // Don't start new joystick if one is already active
            if (this.touchControls.joystick.active) return;
            
            const touch = e.touches[0];
            const pos = getTouchPos(touch);
            
            // Avoid conflicts with dash button
            if (isTouchNearDashButton(pos.x, pos.y)) return;
            
            // Start floating joystick
            this.touchControls.joystick.active = true;
            this.touchControls.joystick.centerX = pos.x;
            this.touchControls.joystick.centerY = pos.y;
            this.touchControls.joystick.startX = pos.x;
            this.touchControls.joystick.startY = pos.y;
            this.touchControls.joystick.visible = true;
            this.touchControls.joystick.touchId = touch.identifier; // Track specific touch ID
            
            // Position joystick at touch location relative to modal
            const modalRect = gameModal.getBoundingClientRect();
            
            // Make joystick visible first, then get its dimensions
            // Keep joystick invisible - no visual feedback needed
            // joystick.style.display = 'block';  // Commented out - keep invisible
            
            // Skip visual feedback - keep joystick invisible
            // joystick.classList.add('active');  // Commented out - no visuals needed
            
        }, { passive: false });
        
        gameModal.addEventListener('touchmove', (e) => {
            if (!this.touchControls.joystick.active) return;
            e.preventDefault();
            
            // Find the specific touch that started the joystick
            let touch = null;
            for (let i = 0; i < e.touches.length; i++) {
                if (e.touches[i].identifier === this.touchControls.joystick.touchId) {
                    touch = e.touches[i];
                    break;
                }
            }
            
            if (!touch) return; // Touch not found, ignore
            const pos = getTouchPos(touch);
            
            const deltaX = pos.x - this.touchControls.joystick.centerX;
            const deltaY = pos.y - this.touchControls.joystick.centerY;
            
            // Limit movement to circle
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            const limitedDistance = Math.min(distance, maxDistance);
            const angle = Math.atan2(deltaY, deltaX);
            
            const limitedX = Math.cos(angle) * limitedDistance;
            const limitedY = Math.sin(angle) * limitedDistance;
            
            // Skip visual handle updates - no graphics needed
            // handle.style.transform = `translate(calc(-50% + ${limitedX}px), calc(-50% + ${limitedY}px))`;  // Commented out
            // Moving class visual feedback not needed
            // if (limitedDistance > 5) { handle.classList.add('moving'); } else { handle.classList.remove('moving'); }
            
            // Convert to movement values (-1 to 1)
            this.touchControls.joystick.moveX = limitedX / maxDistance;
            this.touchControls.joystick.moveY = limitedY / maxDistance;
        }, { passive: false });
        
        const endTouch = () => {
            this.touchControls.joystick.active = false;
            this.touchControls.joystick.moveX = 0;
            this.touchControls.joystick.moveY = 0;
            this.touchControls.joystick.visible = false;
            this.touchControls.joystick.touchId = null; // Clear touch ID
            
            // Skip visual cleanup - joystick stays invisible
            // joystick.classList.remove('active');  // Commented out
            // handle.classList.remove('moving');    // Commented out
            // No need to hide since it's already invisible
            // setTimeout(() => {
            //     joystick.style.display = 'none';
            //     handle.style.transform = 'translate(-50%, -50%)';
            // }, 300);  // Commented out
        };
        
        gameModal.addEventListener('touchend', (e) => {
            // Only end joystick if the specific touch that started it ends
            for (let i = 0; i < e.changedTouches.length; i++) {
                if (e.changedTouches[i].identifier === this.touchControls.joystick.touchId) {
                    endTouch();
                    break;
                }
            }
        });
        
        gameModal.addEventListener('touchcancel', (e) => {
            // Only end joystick if the specific touch that started it is cancelled
            for (let i = 0; i < e.changedTouches.length; i++) {
                if (e.changedTouches[i].identifier === this.touchControls.joystick.touchId) {
                    endTouch();
                    break;
                }
            }
        });
    }
    
    setupDashButton(dashBtn) {
        dashBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            e.stopPropagation(); // Prevent event from bubbling to modal
            this.touchControls.dashButton.pressed = true;
        }, { passive: false });
        
        const endDash = (e) => {
            e.preventDefault();
            e.stopPropagation(); // Prevent event from bubbling to modal
            this.touchControls.dashButton.pressed = false;
        };
        
        dashBtn.addEventListener('touchend', endDash, { passive: false });
        dashBtn.addEventListener('touchcancel', endDash, { passive: false });
    }
    
    fireWeapon(weapon) {
        // Find nearest enemy
        let nearestEnemy = null;
        let nearestDistance = Infinity;
        
        this.enemies.forEach(enemy => {
            const dx = enemy.x - this.player.x;
            const dy = enemy.y - this.player.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < nearestDistance && distance <= weapon.range) {
                nearestDistance = distance;
                nearestEnemy = enemy;
            }
        });
        
        if (nearestEnemy) {
            const dx = nearestEnemy.x - this.player.x;
            const dy = nearestEnemy.y - this.player.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Fire multiple projectiles if weapon has been upgraded
            const projectileCount = weapon.projectileCount || 1;
            
            for (let i = 0; i < projectileCount; i++) {
                // Add slight angle variation for multiple projectiles
                let adjustedDx = dx;
                let adjustedDy = dy;
                
                if (projectileCount > 1) {
                    const angleOffset = (i - (projectileCount - 1) / 2) * 0.2; // Small spread
                    const angle = Math.atan2(dy, dx) + angleOffset;
                    adjustedDx = Math.cos(angle) * distance;
                    adjustedDy = Math.sin(angle) * distance;
                }
            
                switch (weapon.type) {
                    case 'basic':
                    case 'rapid':
                        this.createBasicProjectile(weapon, adjustedDx, adjustedDy, distance);
                        break;
                    case 'spread':
                    case 'spread_shot':
                        this.createSpreadProjectiles(weapon, adjustedDx, adjustedDy, distance);
                        break;
                    case 'laser':
                        this.createLaserBeam(weapon, adjustedDx, adjustedDy, distance);
                        break;
                    case 'plasma':
                        this.createPlasmaProjectile(weapon, adjustedDx, adjustedDy, distance);
                        break;
                    case 'shotgun':
                        this.createShotgunBlast(weapon, adjustedDx, adjustedDy, distance);
                        break;
                    case 'lightning':
                        // Lightning handles its own target distribution, only call once
                        if (i === 0) { // Only create lightning on first iteration
                            this.createLightningBolt(weapon, nearestEnemy);
                        }
                        break;
                    case 'flamethrower':
                        this.createFlameStream(weapon, adjustedDx, adjustedDy, distance);
                        break;
                    case 'railgun':
                        this.createRailgunBeam(weapon, adjustedDx, adjustedDy, distance);
                        break;
                    case 'missiles':
                        this.createHomingMissile(weapon, nearestEnemy);
                        break;
                    case 'homing_laser':
                        this.createHomingLaserBeam(weapon, nearestEnemy);
                        break;
                    case 'shockburst':
                        // Shockburst handles its own target distribution, only call once
                        if (i === 0) { // Only create shockburst on first iteration

                            this.createShockburst(weapon, nearestEnemy);
                        }
                        break;
                }
            }
        }
    }
    
    // Object pooling methods for performance - removed duplicate method
    
    // Removed duplicate returnProjectileToPool method - using the correct one below

    createBasicProjectile(weapon, dx, dy, distance) {
        const angle = Math.atan2(dy, dx);
        const projectile = this.getPooledProjectile();
        
        // Calculate scaled projectile speed for consistent gameplay
        const scaledSpeed = weapon.projectileSpeed;
        
        // Set projectile properties
        projectile.x = this.player.x;
        projectile.y = this.player.y;
        projectile.vx = Math.cos(angle) * scaledSpeed;
        projectile.vy = Math.sin(angle) * scaledSpeed;
        projectile.baseSpeed = weapon.projectileSpeed; // Store base speed for scaling
        projectile.damage = weapon.damage;
        projectile.life = 120;
        projectile.type = 'basic';
        projectile.color = '#9B59B6';
        projectile.size = 3;
        
        this.projectiles.push(projectile);
    }
    
    createSpreadProjectiles(weapon, dx, dy, distance) {
        const angle = Math.atan2(dy, dx);
        const spreadCount = 3 + Math.floor(weapon.level / 3);
        const spreadAngle = Math.PI / 6; // 30 degrees
        
        const scaledSpeed = weapon.projectileSpeed;
        
        for (let i = 0; i < spreadCount; i++) {
            const offsetAngle = angle + (i - Math.floor(spreadCount / 2)) * (spreadAngle / spreadCount);
            const projectile = this.getPooledProjectile();
            
            projectile.x = this.player.x;
            projectile.y = this.player.y;
            projectile.vx = Math.cos(offsetAngle) * scaledSpeed;
            projectile.vy = Math.sin(offsetAngle) * scaledSpeed;
            projectile.baseSpeed = weapon.projectileSpeed;
            projectile.damage = weapon.damage * 0.8;
            projectile.life = 100;
            projectile.type = 'spread';
            projectile.color = '#E67E22';
            projectile.size = 2.5;
            
            this.projectiles.push(projectile);
        }
    }
    
    createLaserBeam(weapon, dx, dy, distance) {
        const angle = Math.atan2(dy, dx);
        const projectile = this.getPooledProjectile();
        
        projectile.x = this.player.x;
        projectile.y = this.player.y;
        projectile.vx = Math.cos(angle) * weapon.projectileSpeed * 2;
        projectile.vy = Math.sin(angle) * weapon.projectileSpeed * 2;
        projectile.damage = weapon.damage;
        projectile.life = 60;
        projectile.type = 'laser';
        projectile.color = '#E74C3C';
        projectile.size = 3;
        projectile.piercing = true;
        
        this.projectiles.push(projectile);
    }
    
    createPlasmaProjectile(weapon, dx, dy, distance) {
        const angle = Math.atan2(dy, dx);
        const projectile = this.getPooledProjectile();
        
        projectile.x = this.player.x;
        projectile.y = this.player.y;
        projectile.vx = Math.cos(angle) * weapon.projectileSpeed;
        projectile.vy = Math.sin(angle) * weapon.projectileSpeed;
        projectile.damage = weapon.damage;
        projectile.life = 150;
        projectile.type = 'plasma';
        projectile.color = '#3498DB';
        projectile.size = 4;
        projectile.explosionRadius = 50;
        
        this.projectiles.push(projectile);
    }
    
    createShotgunBlast(weapon, dx, dy, distance) {
        const angle = Math.atan2(dy, dx);
        const pelletCount = 5 + Math.floor(weapon.level / 2);
        
        for (let i = 0; i < pelletCount; i++) {
            const spreadAngle = (Math.random() - 0.5) * Math.PI / 4; // Random spread
            const shotAngle = angle + spreadAngle;
            const speed = weapon.projectileSpeed * (0.8 + Math.random() * 0.4);
            
            const projectile = this.getPooledProjectile();
            
            projectile.x = this.player.x;
            projectile.y = this.player.y;
            projectile.vx = Math.cos(shotAngle) * speed;
            projectile.vy = Math.sin(shotAngle) * speed;
            projectile.damage = weapon.damage * 0.6;
            projectile.life = 80;
            projectile.type = 'shotgun';
            projectile.color = '#F39C12';
            projectile.size = 2;
            
            this.projectiles.push(projectile);
        }
    }
    
    createLightningBolt(weapon, targetEnemy) {
        // Create multiple lightning bolts based on projectileCount
        const projectileCount = weapon.projectileCount || 1;
        
        // Get multiple different targets for each lightning bolt (similar to homing lasers/missiles)
        const availableTargets = this.enemies.slice().sort((a, b) => {
            const distA = Math.sqrt((a.x - this.player.x) ** 2 + (a.y - this.player.y) ** 2);
            const distB = Math.sqrt((b.x - this.player.x) ** 2 + (b.y - this.player.y) ** 2);
            return distA - distB;
        }).slice(0, Math.max(projectileCount, 8)); // Get up to 8 closest enemies
        
        for (let i = 0; i < projectileCount; i++) {
            // Assign different targets to each lightning bolt (cycle through available targets)
            const assignedTarget = availableTargets[i % availableTargets.length] || targetEnemy;
            
            const hitEnemies = new Set();
            let currentTarget = assignedTarget;
            let chainCount = 0;
            const maxChains = 2 + Math.floor(weapon.level / 2);
            const chainTargets = []; // Store all chain targets for rendering
            
            while (currentTarget && chainCount < maxChains) {
                hitEnemies.add(currentTarget);
                currentTarget.health -= weapon.damage;
                
                // Store target position for rendering
                chainTargets.push({
                    x: currentTarget.x,
                    y: currentTarget.y
                });
                
                // Find next target for chain
                let nextTarget = null;
                let nearestDistance = Infinity;
                
                this.enemies.forEach(enemy => {
                    if (!hitEnemies.has(enemy)) {
                        const dx = enemy.x - currentTarget.x;
                        const dy = enemy.y - currentTarget.y;
                        const distance = Math.sqrt(dx * dx + dy * dy);
                        if (distance < nearestDistance && distance <= 150) {
                            nearestDistance = distance;
                            nextTarget = enemy;
                        }
                    }
                });
                
                currentTarget = nextTarget;
                chainCount++;
            }
            
            const projectile = this.getPooledProjectile();
            
            projectile.x = this.player.x;
            projectile.y = this.player.y;
            projectile.targetX = assignedTarget.x;
            projectile.targetY = assignedTarget.y;
            projectile.chainTargets = chainTargets;
            projectile.damage = weapon.damage;
            projectile.life = 30;
            projectile.type = 'lightning';
            projectile.color = '#F1C40F';
            projectile.chainCount = chainCount;
            
            this.projectiles.push(projectile);
        }
    }

    createShockburst(weapon, targetEnemy) {

        if (!targetEnemy) return; // Need a target for shockburst
        
        // Create multiple shockburst bolts based on projectileCount (same as lightning)
        const projectileCount = weapon.projectileCount || 4;
        
        // Get multiple different targets for each shockburst bolt (same as lightning)
        const availableTargets = this.enemies.slice().sort((a, b) => {
            const distA = Math.sqrt((a.x - this.player.x) ** 2 + (a.y - this.player.y) ** 2);
            const distB = Math.sqrt((b.x - this.player.x) ** 2 + (b.y - this.player.y) ** 2);
            return distA - distB;
        }).slice(0, Math.max(projectileCount, 8)); // Get up to 8 closest enemies
        
        for (let i = 0; i < projectileCount; i++) {
            // Assign different targets to each shockburst bolt (cycle through available targets)
            const assignedTarget = availableTargets[i % availableTargets.length] || targetEnemy;
            
            const hitEnemies = new Set();
            let currentTarget = assignedTarget;
            let chainCount = 0;
            const maxChains = 2 + Math.floor(weapon.level / 2);
            const chainTargets = []; // Store all chain targets for rendering
            
            while (currentTarget && chainCount < maxChains) {
                hitEnemies.add(currentTarget);
                
                // Deal lightning damage
                currentTarget.health -= weapon.damage;
                
                // Store target position for rendering
                chainTargets.push({
                    x: currentTarget.x,
                    y: currentTarget.y
                });
                
                // ADD EXPLOSION EFFECT: Apply explosion damage to nearby enemies
                this.enemies.forEach(enemy => {
                    if (enemy !== currentTarget) {
                        const dx = enemy.x - currentTarget.x;
                        const dy = enemy.y - currentTarget.y;
                        const distance = Math.sqrt(dx * dx + dy * dy);
                        if (distance <= (weapon.explosionRadius || 100)) {
                            enemy.health -= weapon.damage * 1.0; // Explosion at full damage
                            this.createHitParticles(enemy.x, enemy.y, '#00FFFF'); // Cyan particles
                        }
                    }
                });
                
                // Find next target for chain (same as lightning)
                let nextTarget = null;
                let nearestDistance = Infinity;
                
                this.enemies.forEach(enemy => {
                    if (!hitEnemies.has(enemy)) {
                        const dx = enemy.x - currentTarget.x;
                        const dy = enemy.y - currentTarget.y;
                        const distance = Math.sqrt(dx * dx + dy * dy);
                        if (distance < nearestDistance && distance <= 150) {
                            nearestDistance = distance;
                            nextTarget = enemy;
                        }
                    }
                });
                
                currentTarget = nextTarget;
                chainCount++;
            }
            
            // Create projectile (same as lightning but cyan color)
            const projectile = {
                x: this.player.x,
                y: this.player.y,
                targetX: assignedTarget.x,
                targetY: assignedTarget.y,
                chainTargets: chainTargets,
                damage: weapon.damage,
                life: 30,
                type: 'shockburst',
                color: '#00FFFF', // CYAN COLOR (main difference from lightning)
                chainCount: chainCount
            };
            this.projectiles.push(projectile);
        }
    }
    
    createFlameStream(weapon, dx, dy, distance) {
        const angle = Math.atan2(dy, dx);
        const flameCount = 3;
        
        for (let i = 0; i < flameCount; i++) {
            const offsetAngle = angle + (Math.random() - 0.5) * 0.3;
            const speed = weapon.projectileSpeed * (0.7 + Math.random() * 0.6);
            
            const projectile = this.getPooledProjectile();
            
            projectile.x = this.player.x;
            projectile.y = this.player.y;
            projectile.vx = Math.cos(offsetAngle) * speed;
            projectile.vy = Math.sin(offsetAngle) * speed;
            projectile.damage = weapon.damage * 0.4;
            projectile.life = 90;
            projectile.type = 'flame';
            projectile.color = '#E74C3C';
            projectile.size = 3 + Math.random() * 2;
            projectile.dotDamage = weapon.damage * 0.1;
            
            this.projectiles.push(projectile);
        }
    }
    
    createRailgunBeam(weapon, dx, dy, distance) {
        const angle = Math.atan2(dy, dx);
        const projectile = this.getPooledProjectile();
        
        projectile.x = this.player.x;
        projectile.y = this.player.y;
        projectile.vx = Math.cos(angle) * weapon.projectileSpeed * 3;
        projectile.vy = Math.sin(angle) * weapon.projectileSpeed * 3;
        projectile.damage = weapon.damage;
        projectile.life = 45;
        projectile.type = 'railgun';
        projectile.color = '#9B59B6';
        projectile.size = 3;
        projectile.piercing = 999;
        
        this.projectiles.push(projectile);
    }
    
    // Helper function to find nearest enemy to a given position
    findNearestEnemy(x, y, maxRange = Infinity) {
        let nearestEnemy = null;
        let nearestDistance = maxRange;
        
        this.enemies.forEach(enemy => {
            const dx = enemy.x - x;
            const dy = enemy.y - y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearestEnemy = enemy;
            }
        });
        
        return nearestEnemy;
    }
    
    createHomingMissile(weapon, targetEnemy) {
        // Create multiple projectiles based on projectileCount
        const projectileCount = weapon.projectileCount || 1;
        
        // Get multiple different targets for each missile (similar to homing lasers)
        const availableTargets = this.enemies.slice().sort((a, b) => {
            const distA = Math.sqrt((a.x - this.player.x) ** 2 + (a.y - this.player.y) ** 2);
            const distB = Math.sqrt((b.x - this.player.x) ** 2 + (b.y - this.player.y) ** 2);
            return distA - distB;
        }).slice(0, Math.max(projectileCount, 8)); // Get up to 8 closest enemies
        
        for (let i = 0; i < projectileCount; i++) {
            const projectile = this.getPooledProjectile();
            
            // Assign different targets to each missile (cycle through available targets)
            const assignedTarget = availableTargets[i % availableTargets.length] || targetEnemy;
            
            // Set projectile properties
            projectile.x = this.player.x;
            projectile.y = this.player.y;
            projectile.vx = 0;
            projectile.vy = 0;
            projectile.targetEnemy = assignedTarget; // Store reference to enemy, not just position
            projectile.targetX = assignedTarget.x;
            projectile.targetY = assignedTarget.y;
            projectile.damage = weapon.damage;
            projectile.life = 180;
            projectile.type = 'missile';
            projectile.color = '#E67E22';
            projectile.size = 3;
            projectile.homing = true;
            projectile.explosionRadius = 60;
            projectile.speed = (weapon.projectileSpeed || 6);
            projectile.baseSpeed = weapon.projectileSpeed || 3;
            
            this.projectiles.push(projectile);
        }
    }
    
    createHomingLaserBeam(weapon, nearestEnemy) {
        if (!nearestEnemy) return; // Need a target for homing
        
        // Create multiple projectiles based on projectileCount (starts at 4)
        const projectileCount = weapon.projectileCount || 4;
        
        // Get multiple different targets for each laser
        const availableTargets = this.enemies.slice().sort((a, b) => {
            const distA = Math.sqrt((a.x - this.player.x) ** 2 + (a.y - this.player.y) ** 2);
            const distB = Math.sqrt((b.x - this.player.x) ** 2 + (b.y - this.player.y) ** 2);
            return distA - distB;
        }).slice(0, Math.max(projectileCount, 8)); // Get up to 8 closest enemies
        
        for (let i = 0; i < projectileCount; i++) {
            // Get projectile from pool
            const projectile = this.getPooledProjectile();
            
            // Assign different targets to each laser (cycle through available targets)
            const targetEnemy = availableTargets[i % availableTargets.length] || nearestEnemy;
            
            // Start with spread pattern but will curve toward individual targets
            const spreadAngle = (projectileCount > 1) ? (i / (projectileCount - 1) - 0.5) * 1.2 : 0;
            const baseAngle = Math.atan2(targetEnemy.y - this.player.y, targetEnemy.x - this.player.x);
            const angle = baseAngle + spreadAngle;
            
            projectile.x = this.player.x;
            projectile.y = this.player.y;
            projectile.vx = Math.cos(angle) * weapon.projectileSpeed * 0.7; // Start slower for better curves
            projectile.vy = Math.sin(angle) * weapon.projectileSpeed * 0.7;
            projectile.damage = weapon.damage;
            projectile.life = 160; // Slightly longer lifetime: 2.7 seconds for more chasing
            projectile.type = 'homing_laser';
            projectile.color = '#FFD700'; // Gold color for merge weapon
            projectile.size = 5;
            projectile.homing = true;
            projectile.piercing = true;
            projectile.hitCount = 0;
            projectile.maxHits = 10; // Limit to prevent infinite loops
            projectile.targetEnemy = targetEnemy; // Each laser gets its own target
            projectile.speed = weapon.projectileSpeed;
            
            this.projectiles.push(projectile);
        }
    }
    
    createBossMissile(boss, healthPercent = 1.0) {
        const angleToPlayer = Math.atan2(this.player.y - boss.y, this.player.x - boss.x);
        let spreadAngles, damage, speed, homingStrength, color;
        
        // Scale missile stats based on boss level
        const bossLevel = boss.bossLevel || 1;
        const speedMultiplier = Math.pow(1.05, bossLevel - 1);
        const damageMultiplier = Math.pow(1.15, bossLevel - 1);
        
        // Phase 1: Basic 3-missile spread (above 70% health)
        if (healthPercent > 0.7) {
            spreadAngles = [-0.3, 0, 0.3]; // 3 missiles with spread
            damage = Math.floor(25 * damageMultiplier);
            speed = 2.5 * speedMultiplier;
            homingStrength = 0.05;
            color = '#FF0066'; // Pink
        }
        // Phase 2: 5-missile spread with faster speed (30-70% health)
        else if (healthPercent > 0.3) {
            spreadAngles = [-0.6, -0.3, 0, 0.3, 0.6]; // 5 missiles with wider spread
            damage = Math.floor(30 * damageMultiplier);
            speed = 2.75 * speedMultiplier;
            homingStrength = 0.07;
            color = '#FF3366'; // Brighter pink
        }
        // Phase 3: 7-missile burst with high speed and homing (below 30% health)
        else {
            spreadAngles = [-0.9, -0.6, -0.3, 0, 0.3, 0.6, 0.9]; // 7 missiles, wide spread
            damage = Math.floor(35 * damageMultiplier);
            speed = 3 * speedMultiplier;
            homingStrength = 0.10;
            color = '#FF0033'; // Deep red
        }
        
        spreadAngles.forEach(angleOffset => {
            const missile = {
                x: boss.x,
                y: boss.y,
                vx: Math.cos(angleToPlayer + angleOffset) * speed,
                vy: Math.sin(angleToPlayer + angleOffset) * speed,
                damage: damage,
                life: 300, // Long-lived missiles
                type: 'boss-missile',
                color: color,
                size: 4,
                homing: true,
                homingStrength: homingStrength,
                explosionRadius: 40,
                speed: speed,
                owner: 'enemy' // Important: mark as enemy projectile
            };
            this.projectiles.push(missile);
        });
    }
    
    spawnEnemies() {
        this.frameCount++;
        
        // Performance limit: maximum number of enemies on screen
        const maxEnemies = 20; // Increased for performance testing
        
        if (this.enemies.length >= maxEnemies) {
            return; // Don't spawn more if at limit
        }
        
        // Check for exact boss spawn at 5 minutes (300 seconds)
        if (this.gameTime >= 300 && !this.bossSpawned && !this.enemies.some(enemy => enemy.behavior === 'boss')) {
            this.spawnBoss();
            this.bossSpawned = true;
            return; // Don't spawn regular enemies this frame
        }
        
        // Increase difficulty over time
        const difficultyMultiplier = 1 + Math.floor(this.gameTime / 30) * 0.2;
        this.spawnRate = Math.max(30, 120 - Math.floor(this.gameTime / 10) * 5);
        
        if (this.frameCount - this.lastSpawn >= this.spawnRate) {
            const spawnCount = 1 + Math.floor(this.gameTime / 60);
            // Limit spawn count to not exceed max enemies
            const actualSpawnCount = Math.min(spawnCount, maxEnemies - this.enemies.length);
            
            for (let i = 0; i < actualSpawnCount; i++) {
                this.spawnEnemy();
            }
            this.lastSpawn = this.frameCount;
        }
    }
    
    spawnEnemy() {
        const side = Math.floor(Math.random() * 4);
        const spawnDistance = 500; // Distance from player to spawn enemies
        let x, y;
        
        // Spawn enemies around the player's position instead of canvas bounds
        switch (side) {
            case 0: // Top
                x = this.player.x + (Math.random() - 0.5) * 500;
                y = this.player.y - spawnDistance;
                break;
            case 1: // Right
                x = this.player.x + spawnDistance;
                y = this.player.y + (Math.random() - 0.5) * 500;
                break;
            case 2: // Bottom
                x = this.player.x + (Math.random() - 0.5) * 500;
                y = this.player.y + spawnDistance;
                break;
            case 3: // Left
                x = this.player.x - spawnDistance;
                y = this.player.y + (Math.random() - 0.5) * 500;
                break;
        }
        
        const enemyTypes = this.getAvailableEnemyTypes();
        const type = this.selectEnemyType(enemyTypes);
        const config = this.getEnemyConfig(type);
        
        // Calculate scaled speed - keep enemy speed constant to maintain gameplay feel
        const baseSpeed = config.speed; // Removed time-based speed scaling
        const scaledSpeed = baseSpeed;
        
        // Calculate enemy scaling: time-based until first boss, then boss-only scaling
        let timeScaling, bossScaling;
        
        if (this.bossesKilled === 0) {
            // Before first boss: use time-based scaling only
            timeScaling = 1 + Math.floor(this.gameTime / 30) * 0.3; // 30% per 30 seconds
            bossScaling = 1.0; // No boss scaling yet
        } else {
            // After first boss defeated: freeze time scaling, use boss scaling only
            timeScaling = 1 + Math.floor(300 / 30) * 0.3; // Freeze at first boss time (300 seconds = 10 intervals = 4.0x)
            bossScaling = 1 + this.bossesKilled * 0.15; // 15% per boss defeated
        }
        
        const totalHealthMultiplier = config.health * timeScaling * bossScaling;
        const totalDamageMultiplier = config.contactDamage * (1 + (this.bossesKilled || 0) * 0.1); // 10% damage per boss
        
        const enemy = {
            x: x,
            y: y,
            radius: config.radius,
            speed: scaledSpeed,
            baseSpeed: baseSpeed, // Store base speed for future scaling updates
            maxHealth: Math.floor(totalHealthMultiplier),
            health: Math.floor(totalHealthMultiplier),
            contactDamage: Math.floor(totalDamageMultiplier),
            color: config.color,
            behavior: config.behavior,
            specialCooldown: 0,
            burning: null,
            spawnedMinions: false
        };
        
        // Only add rotation properties for tank enemies (boss handled separately)
        if (config.behavior === 'tank') {
            enemy.angle = 0;
            enemy.rotSpeed = 0.05;
        }
        
        this.enemies.push(enemy);
        
        // Show boss notification when boss is spawned
        if (config.behavior === 'boss') {
            this.showBossNotification();
        }
    }
    
    spawnBoss() {
        // Spawn boss at a specific distance from player (reduced for mobile visibility)
        const spawnDistance = 250;
        const angle = Math.random() * Math.PI * 2;
        const x = this.player.x + Math.cos(angle) * spawnDistance;
        const y = this.player.y + Math.sin(angle) * spawnDistance;
        
        const config = this.getEnemyConfig('boss');
        const scaledSpeed = config.speed;
        
        this.enemies.push({
            x: x,
            y: y,
            radius: config.radius,
            speed: scaledSpeed,
            baseSpeed: config.speed,
            maxHealth: config.health * (1 + Math.floor(this.gameTime / 30) * 0.3),
            health: config.health * (1 + Math.floor(this.gameTime / 30) * 0.3),
            contactDamage: config.contactDamage,
            color: config.color,
            behavior: config.behavior,
            angle: 0,
            rotSpeed: 0.05,
            specialCooldown: 0,
            burning: null,
            spawnedMinions: false,
            lastMissileFrame: 0, // Initialize missile timing for boss attacks
            // Dash state for Phase 3 movement
            dashState: {
                active: false,
                targetX: 0,
                targetY: 0,
                duration: 0,
                maxDuration: 30, // 0.5 seconds at 60fps
                originalSpeed: 0
            }
        });
        
        // Show boss notification
        this.showBossNotification();
    }
    
    spawnScaledBoss() {
        // Spawn progressively stronger boss after first boss defeat
        const spawnDistance = 250;
        const angle = Math.random() * Math.PI * 2;
        const x = this.player.x + Math.cos(angle) * spawnDistance;
        const y = this.player.y + Math.sin(angle) * spawnDistance;
        
        const baseConfig = this.getEnemyConfig('boss');
        
        // Calculate scaled stats based on bosses killed
        const healthMultiplier = Math.pow(1.4, this.bossesKilled);
        const speedMultiplier = Math.pow(1.05, this.bossesKilled);
        const damageMultiplier = Math.pow(1.15, this.bossesKilled);
        const sizeMultiplier = Math.pow(1.05, this.bossesKilled);
        
        // Use effective first boss HP (4000) as base instead of config HP (1000)
        // First boss HP = 1000 * (1 + Math.floor(300 / 30) * 0.3) = 1000 * (1 + 10 * 0.3) = 4000
        const effectiveBaseHP = 4000; // Match first boss effective HP after time scaling
        const scaledHealth = Math.floor(effectiveBaseHP * healthMultiplier);
        const scaledSpeed = baseConfig.speed * speedMultiplier;
        const scaledDamage = Math.floor(baseConfig.contactDamage * damageMultiplier);
        const scaledRadius = Math.floor(baseConfig.radius * sizeMultiplier);
        
        this.enemies.push({
            x: x,
            y: y,
            radius: scaledRadius,
            speed: scaledSpeed,
            baseSpeed: scaledSpeed,
            health: scaledHealth,
            maxHealth: scaledHealth,
            contactDamage: scaledDamage,
            color: baseConfig.color,
            behavior: baseConfig.behavior,
            specialCooldown: 0,
            burning: null,
            angle: 0,
            rotSpeed: 0.02,
            lastMissileFrame: 0,
            spawnedMinions: false,
            // Store boss level for rendering effects
            bossLevel: this.bossLevel,
            // Dash state for Phase 3 movement
            dashState: {
                active: false,
                targetX: 0,
                targetY: 0,
                duration: 0,
                maxDuration: 30, // 0.5 seconds at 60fps
                originalSpeed: 0
            }
        });
        
        console.log(`Spawned Boss Level ${this.bossLevel}: HP=${scaledHealth}, Speed=${scaledSpeed.toFixed(2)}, Damage=${scaledDamage}, Size=${scaledRadius}`);
        this.bossSpawned = true;
        
        // Show boss notification for scaled boss
        this.showBossNotification();
    }
    
    getAvailableEnemyTypes() {
        const time = this.gameTime;
        const types = ['basic'];
        
        if (time > 30) types.push('fast');
        if (time > 60) types.push('tank');
        if (time > 120) types.push('flyer');
        if (time > 180) types.push('phantom');
        // Boss spawning is now handled separately in spawnEnemies() method
        
        return types;
    }
    
    selectEnemyType(types) {
        const weights = {
            'basic': 0.35,
            'fast': 0.25,
            'tank': 0.15,
            'flyer': 0.15,
            'phantom': 0.05,
            'boss': 0.05  // Rare but powerful
        };
        
        // Weighted random selection
        const random = Math.random();
        let cumulative = 0;
        
        for (const type of types) {
            cumulative += weights[type] || 0;
            if (random <= cumulative) {
                return type;
            }
        }
        
        return types[0];
    }
    
    getEnemyConfig(type) {
        const configs = {
            basic: {
                radius: 10,
                health: 20,
                speed: 0.75,
                contactDamage: 10,
                color: '#ff00ff', // Neon pink
                behavior: 'chase'
            },
            fast: {
                radius: 7,
                health: 12,
                speed: 1.85,
                contactDamage: 6,
                color: '#ffff00', // Neon yellow
                behavior: 'dodge'
            },
            tank: {
                radius: 15,
                health: 80,
                speed: 0.5,
                contactDamage: 20,
                color: '#ff0040', // Neon red
                behavior: 'tank'
            },
            flyer: {
                radius: 12,
                health: 25,
                speed: 1.25,
                contactDamage: 12,
                color: '#0080ff', // Neon blue
                behavior: 'fly'
            },
            phantom: {
                radius: 9,
                health: 15,
                speed: 0.75,
                contactDamage: 2,
                color: '#74EE15', // Neon green
                behavior: 'teleport'
            },
            boss: {
                radius: 40,
                health: 1000,
                speed: 0.75,
                contactDamage: 50,
                color: '#F000FF', // Neon purple
                behavior: 'boss'
            }
        };
        
        return configs[type] || configs.basic;
    }
    
    updateEnemies() {
        // Use reverse iteration for safe and efficient removal
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            // Handle burning damage over time
            if (enemy.burning) {
                if (enemy.burning.duration-- <= 0) {
                    enemy.burning = null;
                } else if (this.frameCount % 20 === 0) { // Damage every 1/3 second
                    enemy.health -= enemy.burning.damage;
                    this.createHitParticles(enemy.x, enemy.y, '#ff6348');
                }
            }
            
            const dx = this.player.x - enemy.x;
            const dy = this.player.y - enemy.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Enemy behavior
            switch (enemy.behavior) {
                case 'chase':
                    enemy.x += (dx / distance) * enemy.speed;
                    enemy.y += (dy / distance) * enemy.speed;
                    break;
                    
                case 'dodge':
                    // Check for incoming projectiles and try to dodge
                    let dodgeX = 0, dodgeY = 0;
                    this.projectiles.forEach(projectile => {
                        const pDx = projectile.x - enemy.x;
                        const pDy = projectile.y - enemy.y;
                        const pDistance = Math.sqrt(pDx * pDx + pDy * pDy);
                        if (pDistance < 50) {
                            dodgeX -= pDx / pDistance;
                            dodgeY -= pDy / pDistance;
                        }
                    });
                    
                    if (dodgeX === 0 && dodgeY === 0) {
                        enemy.x += (dx / distance) * enemy.speed;
                        enemy.y += (dy / distance) * enemy.speed;
                    } else {
                        enemy.x += dodgeX * enemy.speed * 0.5 + (dx / distance) * enemy.speed * 0.5;
                        enemy.y += dodgeY * enemy.speed * 0.5 + (dy / distance) * enemy.speed * 0.5;
                    }
                    break;
                    
                case 'tank':
                    enemy.x += (dx / distance) * enemy.speed;
                    enemy.y += (dy / distance) * enemy.speed;
                    
                    if (enemy.health < enemy.maxHealth * 0.25 && !enemy.spawnedMinions) {
                        this.spawnMinions(enemy.x, enemy.y, 3);
                        enemy.spawnedMinions = true;
                    }
                    break;
                    
                case 'fly':
                    // Orbital movement
                    if (distance > 100) {
                        enemy.x += (dx / distance) * enemy.speed;
                        enemy.y += (dy / distance) * enemy.speed;
                    } else {
                        const orbitAngle = Math.atan2(dy, dx) + Math.PI / 2;
                        enemy.x += Math.cos(orbitAngle) * enemy.speed;
                        enemy.y += Math.sin(orbitAngle) * enemy.speed;
                    }
                    break;
                    
                case 'teleport':
                    if (enemy.specialCooldown <= 0 && distance > 50) {
                        this.createTeleportParticles(enemy.x, enemy.y);
                        enemy.x = this.player.x + (Math.random() - 0.5) * 100;
                        enemy.y = this.player.y + (Math.random() - 0.5) * 100;
                        this.createTeleportParticles(enemy.x, enemy.y);
                        enemy.specialCooldown = 180;
                    } else {
                        enemy.x += (dx / distance) * enemy.speed * 0.5;
                        enemy.y += (dy / distance) * enemy.speed * 0.5;
                    }
                    break;
                
                case 'boss':
                    // Skip if boss is already dead/dying
                    if (enemy.health <= 0) {
                        break;
                    }
                    // Enhanced boss AI with phases based on health
                    const bossHealthPercent = enemy.health / enemy.maxHealth;
                    
                    // Phase 1: Direct chase (above 70% health)
                    if (bossHealthPercent > 0.7) {
                        const dx = this.player.x - enemy.x;
                        const dy = this.player.y - enemy.y;
                        const distance = Math.sqrt(dx * dx + dy * dy);
                        
                        if (distance > 0) {
                            enemy.x += (dx / distance) * enemy.speed * 1.2;
                            enemy.y += (dy / distance) * enemy.speed * 1.2;
                        }
                        // Boss can move freely in infinite world (no canvas bounds constraint)
                    }
                    // Phase 2: Circle strafe (30-70% health)
                    else if (bossHealthPercent > 0.3) {
                        const dx = this.player.x - enemy.x;
                        const dy = this.player.y - enemy.y;
                        const distance = Math.sqrt(dx * dx + dy * dy);
                        
                        // Maintain distance around 150-200 pixels
                        const idealDistance = 175;
                        if (distance > idealDistance + 50) {
                            // Move closer
                            enemy.x += (dx / distance) * enemy.speed * 1.5;
                            enemy.y += (dy / distance) * enemy.speed * 1.5;
                        } else if (distance < idealDistance - 50) {
                            // Move away
                            enemy.x -= (dx / distance) * enemy.speed;
                            enemy.y -= (dy / distance) * enemy.speed;
                        } else {
                            // Circle strafe
                            const perpX = -dy / distance;
                            const perpY = dx / distance;
                            enemy.x += perpX * enemy.speed * 2;
                            enemy.y += perpY * enemy.speed * 2;
                        }
                        // Boss can move freely in infinite world (no canvas bounds constraint)
                    }
                    // Phase 3: Aggressive and dash (below 30% health)
                    else {
                        const dx = this.player.x - enemy.x;
                        const dy = this.player.y - enemy.y;
                        const distance = Math.sqrt(dx * dx + dy * dy);
                        
                        // Handle dash state
                        if (enemy.dashState.active) {
                            // Continue dash movement
                            const dashDx = enemy.dashState.targetX - enemy.x;
                            const dashDy = enemy.dashState.targetY - enemy.y;
                            const dashDistance = Math.sqrt(dashDx * dashDx + dashDy * dashDy);
                            
                            if (dashDistance > 5 && enemy.dashState.duration > 0) {
                                // Move toward dash target at high speed
                                const dashSpeed = enemy.speed * 6; // 6x normal speed for dash
                                enemy.x += (dashDx / dashDistance) * dashSpeed;
                                enemy.y += (dashDy / dashDistance) * dashSpeed;
                                enemy.dashState.duration--;
                            } else {
                                // End dash
                                enemy.dashState.active = false;
                                enemy.speed = enemy.dashState.originalSpeed; // Restore original speed
                            }
                        } else {
                            // Random chance to start dash toward player
                            if (Math.random() < 0.02 && distance > 100) { // 2% chance per frame, only if far enough
                                // Start dash
                                enemy.dashState.active = true;
                                enemy.dashState.targetX = this.player.x + (Math.random() - 0.5) * 60; // Slight randomness
                                enemy.dashState.targetY = this.player.y + (Math.random() - 0.5) * 60;
                                enemy.dashState.duration = enemy.dashState.maxDuration;
                                enemy.dashState.originalSpeed = enemy.speed;
                            } else {
                                // Aggressive chase
                                if (distance > 0) {
                                    enemy.x += (dx / distance) * enemy.speed * 2;
                                    enemy.y += (dy / distance) * enemy.speed * 2;
                                }
                            }
                        }
                    }
                    
                    // Boss missile attack with different patterns based on health phase
                    let missileInterval;
                    
                    // Scale missile firing rate based on boss level (faster for higher levels)
                    const bossLevel = enemy.bossLevel || 1;
                    const fireRateMultiplier = Math.pow(0.95, bossLevel - 1); // 5% faster per level
                    
                    // Phase 1: Slow missiles (above 70% health) - every 4 seconds
                    if (bossHealthPercent > 0.7) {
                        missileInterval = Math.floor(240 * fireRateMultiplier); // 4 seconds at 60fps
                    }
                    // Phase 2: Moderate missiles (30-70% health) - every 2.5 seconds  
                    else if (bossHealthPercent > 0.3) {
                        missileInterval = Math.floor(150 * fireRateMultiplier); // 2.5 seconds at 60fps
                    }
                    // Phase 3: Rapid missiles (below 30% health) - every 1.5 seconds
                    else {
                        missileInterval = Math.floor(90 * fireRateMultiplier); // 1.5 seconds at 60fps
                    }
                    
                    if (!enemy.lastMissileFrame || this.frameCount - enemy.lastMissileFrame > missileInterval) {
                        enemy.lastMissileFrame = this.frameCount;
                        this.createBossMissile(enemy, bossHealthPercent);
                    }
                    break;
            }
            
            if (enemy.specialCooldown > 0) {
                enemy.specialCooldown--;
            }
            
            // Only rotate tank and boss enemies for performance
            if (enemy.behavior === 'tank' || enemy.behavior === 'boss') {
                enemy.angle += enemy.rotSpeed;
            }
            
            // Remove dead enemies
            if (enemy.health <= 0) {
                // Check if this was a boss enemy
                if (enemy.behavior === 'boss') {
                    // Prevent multiple boss defeat triggers
                    if (this.bossDefeating) {
                        return;
                    }
                    
                    // Start boss defeat animation sequence
                    this.bossDefeating = true;
                    console.log('Boss defeated! Starting animation sequence...');
                    
                    // Create spectacular defeat animation
                    this.createBossDefeatAnimation(enemy.x, enemy.y, enemy.radius);
                    
                    // Remove boss from enemies array
                    this.enemies.splice(i, 1);
                    
                    // Clear all remaining enemies for clean victory
                    this.enemies.length = 0;
                    
                    // Clear all projectiles (including boss missiles)
                    this.projectiles.length = 0;
                    
                    // Delay the victory screen to allow animation to play
                    setTimeout(() => {
                        this.bossDefeated();
                    }, 2000); // 2.0 second delay for animation
                    
                    return; // Exit early, animation will handle the rest
                }
                
                this.createXPOrb(enemy.x, enemy.y);
                this.createDeathParticles(enemy.x, enemy.y, enemy.color);
                this.enemies.splice(i, 1);
            } else {
                // Remove enemies that are too far from player (performance optimization)
                const dx = enemy.x - this.player.x;
                const dy = enemy.y - this.player.y;
                const distanceFromPlayer = Math.sqrt(dx * dx + dy * dy);
                
                if (distanceFromPlayer > 1200) { // Remove enemies beyond this distance
                    this.enemies.splice(i, 1);
                }
            }
        }
        
    }
    
    spawnMinions(x, y, count) {
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 * i) / count;
            this.enemies.push({
                x: x + Math.cos(angle) * 30,
                y: y + Math.sin(angle) * 30,
                radius: 6,
                speed: 1.5,
                maxHealth: 8,
                health: 8,
                contactDamage: 5,
                color: '#7F8C8D',
                behavior: 'chase',
                specialCooldown: 0,
                burning: null,
                spawnedMinions: false
                // No angle/rotSpeed - minions don't rotate for performance
            });
        }
    }
    
    updateProjectiles() {
        
        // Use reverse iteration for safe and efficient removal
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const projectile = this.projectiles[i];
            // Update position based on type
            switch (projectile.type) {
                case 'missile':
                    if (projectile.homing && projectile.targetEnemy) {
                        // Check if target enemy is still alive
                        const targetStillExists = this.enemies.includes(projectile.targetEnemy);
                        
                        if (targetStillExists) {
                            // Update target position to enemy's current location
                            projectile.targetX = projectile.targetEnemy.x;
                            projectile.targetY = projectile.targetEnemy.y;
                            
                            const dx = projectile.targetX - projectile.x;
                            const dy = projectile.targetY - projectile.y;
                            const distance = Math.sqrt(dx * dx + dy * dy);
                            
                            if (distance > 0) {
                                projectile.vx = (dx / distance) * projectile.speed;
                                projectile.vy = (dy / distance) * projectile.speed;
                            }
                        } else {
                            // Target is dead, find a new target or continue straight
                            const nearestEnemy = this.findNearestEnemy(projectile.x, projectile.y, 200);
                            if (nearestEnemy) {
                                projectile.targetEnemy = nearestEnemy;
                            }
                        }
                    }
                    projectile.x += projectile.vx;
                    projectile.y += projectile.vy;
                    break;
                    
                case 'boss-missile':
                    // Boss missiles home in on the player
                    if (projectile.homing) {
                        const dx = this.player.x - projectile.x;
                        const dy = this.player.y - projectile.y;
                        const distance = Math.sqrt(dx * dx + dy * dy);
                        
                        if (distance > 0) {
                            const homingStrength = projectile.homingStrength || 0.05;
                            projectile.vx += (dx / distance) * homingStrength;
                            projectile.vy += (dy / distance) * homingStrength;
                            
                            // Limit max speed
                            const currentSpeed = Math.sqrt(projectile.vx * projectile.vx + projectile.vy * projectile.vy);
                            if (currentSpeed > projectile.speed) {
                                projectile.vx = (projectile.vx / currentSpeed) * projectile.speed;
                                projectile.vy = (projectile.vy / currentSpeed) * projectile.speed;
                            }
                        }
                    }
                    projectile.x += projectile.vx;
                    projectile.y += projectile.vy;
                    break;
                    
                case 'homing_laser':
                    if (projectile.homing && projectile.targetEnemy) {
                        // Check if target enemy is still alive
                        const targetStillExists = this.enemies.includes(projectile.targetEnemy);
                        
                        if (targetStillExists) {
                            // Aggressive homing behavior with smooth curves
                            const dx = projectile.targetEnemy.x - projectile.x;
                            const dy = projectile.targetEnemy.y - projectile.y;
                            const distance = Math.sqrt(dx * dx + dy * dy);
                            
                            if (distance > 0) {
                                // Much stronger homing for dramatic curves
                                const homingStrength = 0.25; // Much higher than 0.08
                                
                                // Calculate desired direction
                                const targetVx = (dx / distance) * projectile.speed;
                                const targetVy = (dy / distance) * projectile.speed;
                                
                                // Smoothly blend current velocity toward target
                                projectile.vx += (targetVx - projectile.vx) * homingStrength;
                                projectile.vy += (targetVy - projectile.vy) * homingStrength;
                                
                                // Normalize to maintain speed
                                const currentSpeed = Math.sqrt(projectile.vx * projectile.vx + projectile.vy * projectile.vy);
                                if (currentSpeed > 0) {
                                    projectile.vx = (projectile.vx / currentSpeed) * projectile.speed;
                                    projectile.vy = (projectile.vy / currentSpeed) * projectile.speed;
                                }
                            }
                        } else {
                            // Target is dead, find a new target within larger range
                            const nearestEnemy = this.findNearestEnemy(projectile.x, projectile.y, 400);
                            if (nearestEnemy) {
                                projectile.targetEnemy = nearestEnemy;
                            }
                        }
                    }
                    projectile.x += projectile.vx;
                    projectile.y += projectile.vy;
                    break;
                    
                case 'lightning':
                    // Lightning bolts don't move, they just display and fade
                    break;
                    
                case 'shockburst':
                    // Shockburst bolts don't move, they just display and fade like lightning
                    break;
                    
                default:
                    projectile.x += projectile.vx;
                    projectile.y += projectile.vy;
                    break;
            }
            
            projectile.life--;
            
            // Remove expired or far-away projectiles
            const dx = projectile.x - this.player.x;
            const dy = projectile.y - this.player.y;
            const distanceFromPlayer = Math.sqrt(dx * dx + dy * dy);
            
            if (projectile.life <= 0 || (distanceFromPlayer > 800 && projectile.type !== 'boss-missile')) {
                    
                if (projectile.type === 'missile' && projectile.explosionRadius) {
                    this.createExplosion(projectile.x, projectile.y, projectile.explosionRadius, projectile.damage * 0.7);
                }
                
                // Return projectile to pool instead of just removing it
                this.returnProjectileToPool(projectile);
                this.projectiles.splice(i, 1);
            }
        }
        
    }
    
    updateParticles() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            
            // Update position
            particle.x += particle.vx;
            particle.y += particle.vy;
            
            // Update life
            particle.life -= 0.016; // Approximate 60fps decay
            
            // Apply drag for realistic deceleration
            particle.vx *= 0.98;
            particle.vy *= 0.98;
            
            // Remove dead particles and return to pool
            if (particle.life <= 0) {
                this.returnParticleToPool(particle);
                this.particles.splice(i, 1);
            }
        }
    }
    
    updateXPOrbs() {
        // Use reverse iteration for safe and efficient removal
        for (let i = this.xpOrbs.length - 1; i >= 0; i--) {
            const orb = this.xpOrbs[i];
            const dx = this.player.x - orb.x;
            const dy = this.player.y - orb.y;
            const distanceSquared = dx * dx + dy * dy;
            
            // Magnet effect
            const magnetRange = this.player.passives.magnet ? 80 : 40;
            const magnetRangeSquared = magnetRange * magnetRange;
            if (distanceSquared < magnetRangeSquared) {
                const distance = Math.sqrt(distanceSquared); // Only calculate sqrt when needed
                orb.x += (dx / distance) * 4;
                orb.y += (dy / distance) * 4;
            }
            
            orb.glow = (orb.glow + 0.2) % (Math.PI * 2);
            
            // Collect orb (optimized comparison)
            if (distanceSquared < 225) { // 15 * 15 = 225
                this.player.xp += orb.value;
                
                // Update trail multiplier based on XP progress
                const xpRequired = this.player.level * 5 + 10;
                const xpProgress = this.player.xp / xpRequired;
                this.player.trailMultiplier = 1.0 + (xpProgress * 3.0);
                
                // Return to pool instead of creating garbage
                orb.active = false;
                this.xpOrbs.splice(i, 1);
            } else if (orb.life-- <= 0) {
                // Return to pool instead of creating garbage
                orb.active = false;
                this.xpOrbs.splice(i, 1);
            }
        }
    }
    
    createXPOrb(x, y) {
        const orb = this.getPooledXPOrb();
        if (orb) {
            orb.x = x;
            orb.y = y;
            orb.value = 1;
            this.xpOrbs.push(orb);
        }
    }
    
    updateNotifications() {
        // Legacy notification system has been replaced with DOM-based toast notifications
        // This method is kept for compatibility but notifications array is no longer used
        this.notifications = [];
    }
    
    checkLevelUp() {
        const xpRequired = this.player.level * 5 + 10;
        if (this.player.xp >= xpRequired) {
            this.player.xp -= xpRequired;
            this.player.level++;
            this.player.trailMultiplier = 1.0; // Reset trail length
            
            // Force trail to shrink back to base length immediately
            const baseMaxLength = 8;
            while (this.player.trail.length > baseMaxLength) {
                this.player.trail.shift();
            }
            
            this.showLevelUpChoices();
        }
    }
    
    showLevelUpChoices() {
        this.gameRunning = false;
        const choices = this.generateUpgradeChoices();
        this.createLevelUpModal(choices);
    }
    
    generateUpgradeChoices() {
        const choices = [];
        
        // Weapon upgrades for existing weapons
        this.weapons.forEach((weapon, index) => {
            if (weapon.level < 10) {
                let description = `+${Math.floor(weapon.damage * 0.3)} damage, faster fire rate`;
                
                // Add projectile count info for level 2+ upgrades
                if (weapon.level === 1) {
                    description += ', +1 projectile';
                } else if (weapon.level >= 2 && weapon.level < 5) {
                    description += ', +1 projectile';
                }
                
                choices.push({
                    type: 'weapon_upgrade',
                    weaponIndex: index,
                    name: `${this.getWeaponName(weapon.type)} LV.${weapon.level + 1}`,
                    description: description,
                    icon: '⚡'
                });
            }
        });
        
        // New weapons (if not at max weapons)
        if (this.weapons.length < 4) {
            const availableWeapons = ['spread', 'laser', 'plasma', 'shotgun', 'lightning', 'flamethrower', 'railgun', 'missiles'];
            const currentTypes = this.weapons.map(w => w.type);
            
            availableWeapons.forEach(weaponType => {
                if (!currentTypes.includes(weaponType)) {
                    choices.push({
                        type: 'new_weapon',
                        weaponType: weaponType,
                        name: this.getWeaponName(weaponType),
                        description: this.getWeaponDescription(weaponType),
                        icon: '🔫'
                    });
                }
            });
        }
        
        // Passive abilities
        const passiveChoices = [
            { id: 'health_boost', name: 'Health Boost', description: '+25 Max Health', icon: '❤️' },
            { id: 'speed_boost', name: 'Speed Boost', description: '+30% Movement Speed', icon: '💨' },
            { id: 'regeneration', name: 'Regeneration', description: 'Slowly heal over time', icon: '🔄' },
            { id: 'magnet', name: 'Magnet', description: 'Attract XP from further away', icon: '🧲' },
            { id: 'armor', name: 'Armor', description: 'Reduce damage taken by 15%', icon: '🛡️' },
            { id: 'critical', name: 'Critical Strike', description: '15% chance for double damage', icon: '💥' }
        ];
        
        passiveChoices.forEach(passive => {
            if (!this.player.passives[passive.id]) {
                choices.push({
                    type: 'passive',
                    passiveId: passive.id,
                    name: passive.name,
                    description: passive.description,
                    icon: passive.icon
                });
            }
        });
        
        // Return 3-4 random choices
        const shuffled = choices.sort(() => Math.random() - 0.5);
        return shuffled.slice(0, Math.min(4, shuffled.length));
    }
    
    getWeaponName(type) {
        const names = {
            'basic': 'Basic Missile',
            'rapid': 'Rapid Fire',
            'spread': 'Spread Shot',
            'spread_shot': 'Spread Shot',
            'laser': 'Laser Beam',
            'plasma': 'Plasma Bolt',
            'shotgun': 'Shotgun',
            'lightning': 'Lightning',
            'flamethrower': 'Flamethrower',
            'railgun': 'Railgun',
            'missiles': 'Homing Missiles',
            'homing_laser': 'Homing Laser',
            'shockburst': 'Shockburst'
        };
        return names[type] || 'Unknown Weapon';
    }
    
    getWeaponDescription(type) {
        const descriptions = {
            'spread': 'Fires multiple projectiles in a spread pattern',
            'laser': 'High-damage piercing beam',
            'plasma': 'Explosive projectiles with area damage',
            'shotgun': 'Close-range high damage spread',
            'lightning': 'Chain lightning that jumps between enemies',
            'flamethrower': 'Continuous flame stream with burning damage',
            'railgun': 'Ultra high damage piercing shot',
            'missiles': 'Homing missiles with explosive damage',
            'homing_laser': 'Homing piercing laser beams with limited duration',
            'shockburst': 'Explosive chain lightning that jumps between enemies'
        };
        return descriptions[type] || 'Unknown weapon type';
    }
    
    createLevelUpModal(choices) {
        // Calculate responsive sizing
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const isMobile = viewportWidth <= 768;
        
        const modalHTML = `
            <div id="levelup-modal" class="levelup-modal levelup-modal-responsive">
                <div class="levelup-title">LEVEL UP!</div>
                <div class="upgrade-choices-container">
                    <div class="upgrade-choices">
                        ${choices.map((choice, index) => `
                            <div class="upgrade-choice" data-choice="${index}">
                                <h3>${choice.icon} ${choice.name}</h3>
                                <p>${choice.description}</p>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
        
        document.getElementById('game-screen').insertAdjacentHTML('beforeend', modalHTML);
        
        // Apply responsive positioning and sizing after insertion
        const modal = document.getElementById('levelup-modal');
        if (modal) {
            this.applyResponsiveModalStyles(modal, choices.length, isMobile);
        }
        
        // Add menu navigation styles
        this.addMenuNavigationStyles();
        
        // Collect upgrade choice buttons for keyboard navigation
        const upgradeButtons = [];
        choices.forEach((choice, index) => {
            const button = document.querySelector(`[data-choice="${index}"]`);
            upgradeButtons.push(button);
        });
        
        // Initialize keyboard navigation
        this.initializeMenuNavigation('levelup', upgradeButtons);
        
        // Add event listeners to choices
        choices.forEach((choice, index) => {
            document.querySelector(`[data-choice="${index}"]`).addEventListener('click', () => {
                this.resetMenuNavigation();
                this.selectUpgrade(choice);
                document.getElementById('levelup-modal').remove();
                this.gameRunning = true;
                this.gameLoop();
            });
        });
    }
    
    applyResponsiveModalStyles(modal, choiceCount, isMobile) {
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        // Calculate optimal modal dimensions
        let modalMaxWidth, modalMaxHeight, choiceWidth, choiceHeight;
        
        if (isMobile) {
            modalMaxWidth = Math.min(viewportWidth * 0.95, 400);
            modalMaxHeight = viewportHeight * 0.85;
            choiceWidth = modalMaxWidth - 60; // Account for padding
            choiceHeight = 'auto';
        } else {
            modalMaxWidth = Math.min(viewportWidth * 0.9, 900);
            modalMaxHeight = viewportHeight * 0.8;
            choiceWidth = Math.min(200, (modalMaxWidth - 100) / Math.min(choiceCount, 3));
            choiceHeight = 'auto';
        }
        
        // Apply styles directly to the modal
        modal.style.cssText += `
            max-width: ${modalMaxWidth}px !important;
            max-height: ${modalMaxHeight}px !important;
            width: auto !important;
            height: auto !important;
            position: fixed !important;
            top: 50% !important;
            left: 50% !important;
            transform: translate(-50%, -50%) !important;
            overflow: visible !important;
        `;
        
        // Style the container for scrolling
        const container = modal.querySelector('.upgrade-choices-container');
        if (container) {
            // Let CSS handle responsive container sizing, only set scroll behavior
            container.style.cssText = `
                max-height: calc(${modalMaxHeight}px - 8rem);
                padding: 0 10px;
                margin: 10px -10px;
            `;
            
            // Custom scrollbar for better mobile experience
            container.style.cssText += `
                scrollbar-width: thin;
                scrollbar-color: #9B59B6 transparent;
            `;
        }
        
        // Style the choices grid
        const choicesGrid = modal.querySelector('.upgrade-choices');
        if (choicesGrid) {
            if (isMobile) {
                // Vertical layout for mobile
                choicesGrid.style.cssText = `
                    display: flex !important;
                    flex-direction: column !important;
                    gap: 15px !important;
                    align-items: center !important;
                `;
            } else {
                // Grid layout for desktop
                choicesGrid.style.cssText = `
                    display: grid !important;
                    grid-template-columns: repeat(auto-fit, minmax(${choiceWidth}px, 1fr)) !important;
                    gap: 5px !important;
                    justify-content: center !important;
                `;
            }
        }
        
        // Style individual choices
        const choices = modal.querySelectorAll('.upgrade-choice');
        choices.forEach(choice => {
            if (isMobile) {
                choice.style.cssText = `
                    width: ${choiceWidth}px !important;
                    min-height: 100px !important;
                    padding: 15px !important;
                    font-size: 14px !important;
                `;
                
                const h3 = choice.querySelector('h3');
                if (h3) h3.style.fontSize = '16px !important';
                
                const p = choice.querySelector('p');
                if (p) p.style.fontSize = '12px !important';
            } else {
                choice.style.cssText = `
                    width: ${choiceWidth}px !important;
                    min-height: auto !important;
                `;
            }
        });
        
        console.log(`Level up modal sized: ${modalMaxWidth}x${modalMaxHeight}, choices: ${choiceCount}, mobile: ${isMobile}`);
    }

    
    addMenuNavigationStyles() {
        // Add CSS styles for keyboard navigation if not already added
        if (document.getElementById('menu-navigation-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'menu-navigation-styles';
        style.textContent = `
            .menu-selected {
                box-shadow: 0 0 15px rgba(0, 255, 255, 0.8) !important;
                border: 2px solid #00ffff !important;
                background: rgba(0, 255, 255, 0.1) !important;
                transform: scale(1.05) !important;
                transition: all 0.2s ease !important;
            }
            
            .upgrade-choice.menu-selected {
                box-shadow: 0 0 20px rgba(0, 255, 255, 0.9) !important;
                border: 2px solid #00ffff !important;
                background: rgba(0, 255, 255, 0.15) !important;
            }
            
            #overlay-retry-btn.menu-selected,
            #overlay-exit-btn.menu-selected {
                background: rgba(0, 255, 255, 0.2) !important;
                box-shadow: 0 0 15px rgba(0, 255, 255, 0.8) !important;
                border-color: #00ffff !important;
                color: #00ffff !important;
                transform: scale(1.1) !important;
            }
            
            #resume-btn.menu-selected,
            #exit-to-menu-btn.menu-selected {
                background: rgba(0, 255, 255, 0.2) !important;
                box-shadow: 0 0 15px rgba(0, 255, 255, 0.8) !important;
                border-color: #00ffff !important;
                transform: scale(1.05) !important;
            }
            
            #start-survivor.menu-selected,
            #restart-survivor.menu-selected,
            #exit-survivor.menu-selected {
                background: rgba(0, 255, 255, 0.2) !important;
                box-shadow: 0 0 15px rgba(0, 255, 255, 0.8) !important;
                border-color: #00ffff !important;
                transform: scale(1.05) !important;
            }
            
            #victory-continue-btn.menu-selected,
            #victory-retry-btn.menu-selected,
            #victory-exit-btn.menu-selected {
                background: rgba(0, 255, 255, 0.2) !important;
                box-shadow: 0 0 15px rgba(0, 255, 255, 0.8) !important;
                border-color: #00ffff !important;
                transform: scale(1.05) !important;
            }
        `;
        document.head.appendChild(style);
    }

    
    addToastStyles() {
        // Add CSS styles for toast notifications if not already added
        if (document.getElementById('toast-notification-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'toast-notification-styles';
        style.textContent = `
            .toast-container {
                position: absolute !important;
                top: 35% !important;
                left: 50% !important;
                transform: translateX(-50%) translateY(-50%) !important;
                z-index: 99999999 !important;
                display: block !important;
                width: 100% !important;
                height: auto !important;
                pointer-events: none !important;
            }
            
            .toast {
                background: transparent !important;
                border: none !important;
                padding: 15px !important;
                color: #ffffff !important;
                font-family: Arial, sans-serif !important;
                text-align: center !important;
                display: block !important;
                pointer-events: auto !important;
                cursor: pointer !important;
                position: relative !important;
                opacity: 0 !important;
                transform: translateY(30px) scale(0.8) !important;
                transition: all 0.6s ease-out !important;
            }
            
            .toast.toast-show {
                opacity: 0.8 !important;
                transform: translateY(0) scale(1) !important;
            }
            

            
            .toast-icon {
                font-size: 30px !important;
                flex-shrink: 0 !important;
                text-shadow: 0 0 20px rgba(255, 255, 255, 1.0),
                           0 0 40px rgba(255, 255, 255, 1.0),
                           0 3px 6px rgba(0, 0, 0, 1.0) !important;
                filter: drop-shadow(0 0 10px rgba(255, 255, 255, 1.0)) !important;
                opacity: 0.8 !important;
            }
            
            .toast-message {
                line-height: 1.2 !important;
                text-shadow: 0 0 20px rgba(0, 255, 255, 1.0),
                           0 0 40px rgba(0, 255, 255, 1.0),
                           0 0 60px rgba(0, 255, 255, 0.8),
                           0 3px 6px rgba(0, 0, 0, 1.0) !important;
                color: #ffffff !important;
                font-weight: 900 !important;
                text-align: center !important;
                opacity: 0.8 !important;
            }
            

            

        `;
        document.head.appendChild(style);
    }

    
    createToast(message, type = 'upgrade', duration = 2500) {
        const toastContainer = document.getElementById('toast-container');
        if (!toastContainer) {
            console.error('Toast container not found');
            return;
        }
        
        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        // Get icon based on type
        const icons = {
            'boss': '⚠️',
            'upgrade': '🔫',
            'victory': '🎉'
        };
        
        toast.innerHTML = `
            <div style="text-align: center;">
                <div style="font-size: 32px; margin-bottom: 8px;">${icons[type] || '📢'}</div>
                <div style="font-size: 22px; font-weight: bold; color: white; text-shadow: 0 0 20px rgba(0,255,255,1), 0 0 40px rgba(0,255,255,0.8), 0 2px 4px rgba(0,0,0,0.9);">${message}</div>
            </div>
        `;
        
        // Click entire toast to dismiss (optional)
        toast.addEventListener('click', () => {
            this.removeToast(toast);
        });
        
        // Add to container
        toastContainer.appendChild(toast);
        
        // Trigger slide-in animation after a small delay
        setTimeout(() => {
            toast.classList.add('toast-show');
        }, 50);
        
        // Auto-dismiss after duration
        if (duration > 0) {
            setTimeout(() => {
                this.removeToast(toast);
            }, duration);
        }
        
        return toast;
    }
    
    removeToast(toast) {
        if (!toast || !toast.parentNode) return;
        
        // Remove the show class and trigger fade out - scale down in place to avoid collision
        toast.classList.remove('toast-show');
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(0) scale(0.5)'; // Scale down in place, no sliding
        
        // Remove after animation completes
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 600);
    }
    
    showToastNotification(message, type = 'upgrade') {
        // Shorter duration based on type and message importance
        const durations = {
            'boss': 3000,      // 3 seconds for boss notifications
            'victory': 3500,   // 3.5 seconds for victory
            'upgrade': 2500    // 2.5 seconds for upgrades
        };
        
        this.createToast(message, type, durations[type]);
    }

    
    testToast() {
        console.log('Testing toast notification...');
        this.showToastNotification('TEST NOTIFICATION!', 'upgrade');
    }
    
    selectUpgrade(choice) {
        switch (choice.type) {
            case 'weapon_upgrade':
                this.upgradeExistingWeapon(choice.weaponIndex);
                break;
            case 'new_weapon':
                this.addNewWeapon(choice.weaponType);
                break;
            case 'passive':
                this.addPassiveAbility(choice.passiveId);
                break;
        }
        
        this.player.health = Math.min(this.player.maxHealth, this.player.health + 10);
        this.showUpgradeNotification(choice.name);
    }
    
    upgradeExistingWeapon(weaponIndex) {
        const weapon = this.weapons[weaponIndex];
        weapon.level++;
        weapon.damage = Math.floor(weapon.damage * 1.3);
        weapon.fireRate = Math.max(10, weapon.fireRate - 3);
        
        // Double projectile count at level 2
        if (weapon.level === 2 && !weapon.projectileCount) {
            weapon.projectileCount = 2;
        } else if (weapon.level >= 2 && weapon.projectileCount) {
            weapon.projectileCount = Math.min(weapon.projectileCount + 1, 5); // Cap at 5 projectiles
        }
        
        // Special upgrades at certain levels
        if (weapon.level === 5 && weapon.type === 'basic') {
            weapon.type = 'rapid';
        } else if (weapon.level === 8 && weapon.type === 'spread_shot') {
            weapon.type = 'spread';
        }
        
        // Check for weapon merges after upgrade
        this.checkForWeaponMerges();
    }
    
    addNewWeapon(weaponType) {
        const weaponConfigs = {
            'spread': { damage: 12, fireRate: 40, range: 200, projectileSpeed: 6 },
            'laser': { damage: 25, fireRate: 60, range: 350, projectileSpeed: 12 },
            'plasma': { damage: 30, fireRate: 80, range: 300, projectileSpeed: 7 },
            'shotgun': { damage: 8, fireRate: 45, range: 150, projectileSpeed: 10 },
            'lightning': { damage: 20, fireRate: 100, range: 250, projectileSpeed: 0 },
            'flamethrower': { damage: 6, fireRate: 15, range: 120, projectileSpeed: 4 },
            'railgun': { damage: 50, fireRate: 90, range: 500, projectileSpeed: 15, piercing: 999 },
            'missiles': { damage: 35, fireRate: 120, range: 400, projectileSpeed: 5, homing: true, explosionRadius: 60 },
            'homing_laser': { damage: 30, fireRate: 100, range: 400, projectileSpeed: 8, homing: true, piercing: true, isMergeWeapon: true },
            'shockburst': { damage: 50, fireRate: 80, range: 300, projectileSpeed: 0, explosionRadius: 100, isMergeWeapon: true }
        };
        
        const config = weaponConfigs[weaponType];
        this.weapons.push({
            type: weaponType,
            level: 1,
            lastFire: 0,
            ...config
        });
    }
    
    checkForWeaponMerges() {
        // Check for laser + missiles both at level 3
        const laserWeapon = this.weapons.find(w => w.type === 'laser' && w.level >= 3);
        const missilesWeapon = this.weapons.find(w => w.type === 'missiles' && w.level >= 3);
        
        if (laserWeapon && missilesWeapon) {
            this.performWeaponMerge('homing_laser', [laserWeapon, missilesWeapon]);
        }
        
        // Check for lightning + plasma both at level 3
        const lightningWeapon = this.weapons.find(w => w.type === 'lightning' && w.level >= 3);
        const plasmaWeapon = this.weapons.find(w => w.type === 'plasma' && w.level >= 3);
        
        if (lightningWeapon && plasmaWeapon) {
            this.performWeaponMerge('shockburst', [lightningWeapon, plasmaWeapon]);
        }
    }
    
    performWeaponMerge(mergeWeaponType, sourceWeapons) {
        // Remove source weapons from array
        sourceWeapons.forEach(sourceWeapon => {
            const index = this.weapons.indexOf(sourceWeapon);
            if (index > -1) {
                this.weapons.splice(index, 1);
            }
        });
        
        // Add merged weapon starting at level 1 with projectileCount 4
        const mergedWeapon = {
            type: mergeWeaponType,
            level: 1,
            lastFire: 0,
            projectileCount: 4,
            ...this.getWeaponConfig(mergeWeaponType)
        };
        
        this.weapons.push(mergedWeapon);
        
        // Show merge notification with reduced delay since we have better stacking
        setTimeout(() => {
            this.showUpgradeNotification(`${this.getWeaponName(mergeWeaponType)} - WEAPONS MERGED!`);
        }, 100); // Reduced from 200ms to 100ms delay
    }
    
    getWeaponConfig(weaponType) {
        const weaponConfigs = {
            'spread': { damage: 12, fireRate: 40, range: 200, projectileSpeed: 6 },
            'laser': { damage: 25, fireRate: 60, range: 350, projectileSpeed: 12 },
            'plasma': { damage: 30, fireRate: 80, range: 300, projectileSpeed: 7 },
            'shotgun': { damage: 8, fireRate: 45, range: 150, projectileSpeed: 10 },
            'lightning': { damage: 20, fireRate: 100, range: 250, projectileSpeed: 0 },
            'flamethrower': { damage: 6, fireRate: 15, range: 120, projectileSpeed: 4 },
            'railgun': { damage: 50, fireRate: 90, range: 500, projectileSpeed: 15, piercing: 999 },
            'missiles': { damage: 35, fireRate: 120, range: 400, projectileSpeed: 5, homing: true, explosionRadius: 60 },
            'homing_laser': { damage: 20, fireRate: 100, range: 400, projectileSpeed: 8, homing: true, piercing: true, isMergeWeapon: true },
            'shockburst': { damage: 50, fireRate: 80, range: 300, projectileSpeed: 0, explosionRadius: 100, isMergeWeapon: true }
        };
        return weaponConfigs[weaponType] || {};
    }
    
    addPassiveAbility(passiveId) {
        switch (passiveId) {
            case 'health_boost':
                this.player.maxHealth += 25;
                this.player.health += 25;
                break;
            case 'speed_boost':
                this.player.speed *= 1.3;
                break;
            case 'regeneration':
                this.player.passives.regeneration = { timer: 0 };
                break;
            case 'magnet':
                this.player.passives.magnet = true;
                break;
            case 'armor':
                this.player.passives.armor = true;
                break;
            case 'critical':
                this.player.passives.critical = true;
                break;
        }
        
        this.player.passives[passiveId] = true;
    }
    
    checkCollisions() {
        
        // Optimized collision detection with distance pre-screening - ONLY for player projectiles
        this.projectiles.forEach((projectile, pIndex) => {
            // Skip enemy projectiles (like boss missiles) - they are handled in the enemy projectile section
            if (projectile.owner === 'enemy') {
                return;
            }
            
            let projectileHit = false;
            let hitCount = 0;
            const maxHits = projectile.piercing === true ? 999 : (projectile.piercing || 1);
            
            // Pre-screen enemies by distance for performance
            const nearbyEnemies = this.enemies.filter(enemy => {
                const dx = projectile.x - enemy.x;
                const dy = projectile.y - enemy.y;
                const roughDistance = Math.abs(dx) + Math.abs(dy); // Manhattan distance (faster)
                return roughDistance < 100; // Only check enemies within rough distance
            });
            
            nearbyEnemies.forEach((enemy, eIndex) => {
                const dx = projectile.x - enemy.x;
                const dy = projectile.y - enemy.y;
                const distanceSquared = dx * dx + dy * dy;
                const collisionRadius = enemy.radius + (projectile.size || 3);
                const collisionRadiusSquared = collisionRadius * collisionRadius;
                
                if (distanceSquared < collisionRadiusSquared && hitCount < maxHits) {
                    hitCount++;
                    let damage = projectile.damage;
                    
                    // For homing lasers, track hit count on the projectile itself
                    if (projectile.type === 'homing_laser') {
                        projectile.hitCount = (projectile.hitCount || 0) + 1;
                    }
                    
                    // Critical hit chance
                    if (this.player.passives.critical && Math.random() < 0.15) {
                        damage *= 2;
                        this.createCriticalParticles(enemy.x, enemy.y);
                    }
                    
                    enemy.health -= damage;
                    this.createHitParticles(enemy.x, enemy.y, projectile.color);
                    
                    // Special effects
                    if (projectile.type === 'plasma' && projectile.explosionRadius) {
                        this.createExplosion(enemy.x, enemy.y, projectile.explosionRadius, projectile.damage * 0.5);
                    } else if (projectile.type === 'missile' && projectile.explosionRadius) {
                        this.createExplosion(enemy.x, enemy.y, projectile.explosionRadius, projectile.damage * 0.7);
                        projectileHit = true;
                    } else if (projectile.type === 'flame' && projectile.dotDamage) {
                        enemy.burning = { damage: projectile.dotDamage, duration: 180 };
                    }
                    
                    // Check if projectile should be removed
                    if (projectile.type === 'homing_laser') {
                        // Homing laser has limited hits and piercing
                        if (projectile.hitCount >= (projectile.maxHits || 10)) {
                            projectileHit = true;
                        }
                    } else if (!['laser', 'railgun'].includes(projectile.type) || hitCount >= maxHits) {
                        projectileHit = true;
                    }
                }
            });
            
            if (projectileHit) {
                // Return projectile to pool before removing from array
                this.returnProjectileToPool(projectile);
                this.projectiles.splice(pIndex, 1);
            }
        });
        
        // Enemy vs Player collisions - only check nearby enemies
        const nearbyEnemies = this.enemies.filter(enemy => {
            const dx = this.player.x - enemy.x;
            const dy = this.player.y - enemy.y;
            const roughDistance = Math.abs(dx) + Math.abs(dy);
            return roughDistance < 100; // Pre-screen for performance
        });
        
        nearbyEnemies.forEach((enemy, index) => {
            const dx = this.player.x - enemy.x;
            const dy = this.player.y - enemy.y;
            const distanceSquared = dx * dx + dy * dy;
            const collisionRadius = this.player.radius + enemy.radius;
            const collisionRadiusSquared = collisionRadius * collisionRadius;
            
            if (distanceSquared < collisionRadiusSquared && !this.player.invulnerable) {
                let damage = enemy.contactDamage;
                
                // Armor reduction
                if (this.player.passives.armor) {
                    damage = Math.floor(damage * 0.85);
                }
                
                this.player.health -= damage;
                this.player.invulnerable = 60;
                this.createHitParticles(this.player.x, this.player.y, '#ff0000');
                
                // Create screen shake effect for enemy contact
                this.createScreenShake(6);
                
                // Create red flash effect for enemy contact
                this.createRedFlash(0.5);
                
                if (this.player.health <= 0) {
                    this.playerDead = true; // Mark player as dead to stop game logic
                    // Delay stopping the game to let red flash complete
                    setTimeout(() => {
                        this.gameRunning = false;
                        this.gameOver();
                        this.showGameOverModal();
                    }, 850);
                }
            }
        });
        
        
        // Check enemy projectiles hitting player - collect indices to remove first
        
        const projectilesToRemove = [];
        for (let pIndex = 0; pIndex < this.projectiles.length; pIndex++) {
            const projectile = this.projectiles[pIndex];
            if (projectile.owner === 'enemy') {
                const dx = projectile.x - this.player.x;
                const dy = projectile.y - this.player.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < this.player.radius + (projectile.size || 3)) {
                    // Player hit by enemy projectile
                    this.player.health -= projectile.damage;
                    
                    // Create screen shake effect for all projectile hits
                    this.createScreenShake(projectile.explosionRadius ? 8 : 4);
                    
                    // Create red flash effect for projectile hits
                    this.createRedFlash(projectile.explosionRadius ? 0.7 : 0.4);
                    
                    // Create explosion if projectile has explosion radius
                    if (projectile.explosionRadius) {
                        this.createExplosion(projectile.x, projectile.y, projectile.explosionRadius, projectile.damage * 0.5);
                    }
                    
                    projectilesToRemove.push(pIndex);
                    
                    // Check for game over
                    if (this.player.health <= 0) {
                        this.playerDead = true; // Mark player as dead to stop game logic
                        // Delay stopping the game to let red flash complete
                        setTimeout(() => {
                            this.gameRunning = false;
                            this.gameOver();
                            this.showGameOverModal();
                        }, 850);
                    }
                }
            }
        }
        
        // Remove projectiles in reverse order to avoid index shifting
        for (let i = projectilesToRemove.length - 1; i >= 0; i--) {
            const index = projectilesToRemove[i];
            const projectile = this.projectiles[index];
            this.returnProjectileToPool(projectile);
            this.projectiles.splice(index, 1);
        }
    }
    
    createExplosion(x, y, radius, damage) {
        // Create visual explosion effect
        if (!this.explosions) this.explosions = [];
        
        const explosion = this.getPooledExplosion();
        explosion.x = x;
        explosion.y = y;
        explosion.radius = 0;
        explosion.maxRadius = radius;
        explosion.life = 30;
        explosion.maxLife = 30;
        explosion.color = '#FF6600';
        
        this.explosions.push(explosion);
        
        // Create explosion particles with adaptive quality
        const baseParticleCount = 15;
        const particleCount = this.shouldCreateExplosion() ? 
            Math.floor(baseParticleCount * (this.qualitySettings?.explosionMultiplier || 1)) : 
            Math.max(1, Math.floor(baseParticleCount * 0.3)); // Minimum particles for visual feedback
        
        for (let i = 0; i < particleCount; i++) {
            const particle = this.getPooledParticle();
            if (particle) {
                const angle = (Math.PI * 2 * i) / particleCount;
                const speed = 3 + Math.random() * 4;
                
                particle.x = x;
                particle.y = y;
                particle.vx = Math.cos(angle) * speed;
                particle.vy = Math.sin(angle) * speed;
                particle.size = 2 + Math.random() * 3;
                particle.color = ['#FF6600', '#FF9900', '#FFCC00'][Math.floor(Math.random() * 3)];
                particle.life = 0.8 + Math.random() * 0.4;
                particle.maxLife = particle.life;
                particle.type = 'explosion';
                
                this.particles.push(particle);
            }
        }
        
        // Damage enemies in radius
        this.enemies.forEach(enemy => {
            const dx = enemy.x - x;
            const dy = enemy.y - y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance <= radius) {
                enemy.health -= damage * (1 - distance / radius);
            }
        });
    }

    createBossDefeatAnimation(bossX, bossY, bossRadius) {
        console.log('Creating boss defeat animation...');
        
        // Show boss defeat notification during animation
        this.createToast("BOSS DEFEATED! DIFFICULTY INCREASED!", 'victory', 3000);
        
        // Create massive explosion at boss location
        const mainExplosionRadius = bossRadius * 3;
        this.createExplosion(bossX, bossY, mainExplosionRadius, 0);
        
        // Create screen shake for dramatic effect
        this.createScreenShake(20, 30); // High intensity, longer duration
        
        // Create spectacular particle burst with boss-themed colors
        const particleCount = this.shouldCreateExplosion() ? 50 : 25;
        for (let i = 0; i < particleCount; i++) {
            const particle = this.getPooledParticle();
            if (particle) {
                const angle = (Math.PI * 2 * i) / particleCount;
                const speed = 4 + Math.random() * 6;
                
                particle.x = bossX;
                particle.y = bossY;
                particle.vx = Math.cos(angle) * speed;
                particle.vy = Math.sin(angle) * speed;
                particle.size = 3 + Math.random() * 5;
                // Gold and orange colors for victory theme
                particle.color = ['#FFD700', '#FF8C00', '#FFA500', '#FFFF00'][Math.floor(Math.random() * 4)];
                particle.life = 1.5 + Math.random() * 1.0;
                particle.maxLife = particle.life;
                particle.type = 'boss_defeat';
                
                this.particles.push(particle);
            }
        }
        
        // Create secondary explosions radiating outward
        const secondaryExplosions = 6;
        for (let i = 0; i < secondaryExplosions; i++) {
            setTimeout(() => {
                const angle = (Math.PI * 2 * i) / secondaryExplosions;
                const distance = bossRadius * 2;
                const explX = bossX + Math.cos(angle) * distance;
                const explY = bossY + Math.sin(angle) * distance;
                
                this.createExplosion(explX, explY, bossRadius * 1.5, 0);
                
                // Add sparkle particles for each secondary explosion
                const sparkleCount = this.shouldCreateParticle() ? 10 : 5;
                for (let j = 0; j < sparkleCount; j++) {
                    const particle = this.getPooledParticle();
                    if (particle) {
                        const sparkleAngle = Math.random() * Math.PI * 2;
                        const sparkleSpeed = 2 + Math.random() * 3;
                        
                        particle.x = explX;
                        particle.y = explY;
                        particle.vx = Math.cos(sparkleAngle) * sparkleSpeed;
                        particle.vy = Math.sin(sparkleAngle) * sparkleSpeed;
                        particle.size = 1 + Math.random() * 2;
                        particle.color = ['#FFFFFF', '#FFFF00', '#FFD700'][Math.floor(Math.random() * 3)];
                        particle.life = 0.8 + Math.random() * 0.5;
                        particle.maxLife = particle.life;
                        particle.type = 'sparkle';
                        
                        this.particles.push(particle);
                    }
                }
            }, i * 200); // Stagger the secondary explosions
        }
        
        // Create a bright flash effect
        this.redFlash.active = true;
        this.redFlash.intensity = 0.8;
        this.redFlash.duration = 60;
        this.redFlash.maxIntensity = 0.8;
        
        console.log('Boss defeat animation created successfully');
    }
    
    createHitParticles(x, y, color) {
        // Particles removed for performance
    }
    
    createDashParticles() {
        // Particles removed for performance
    }
    
    createCriticalParticles(x, y) {
        // Particles removed for performance
    }
    
    createTeleportParticles(x, y) {
        // Particles removed for performance
    }
    
    createScreenShake(intensity) {
        // Create screen shake effect
        this.screenShake = {
            x: 0,
            y: 0,
            intensity: intensity,
            duration: 20,
            decay: 0.95
        };
    }

    createRedFlash(intensity = 0.6) {
        // Create red neon flash effect
        this.redFlash = {
            active: true,
            intensity: intensity,
            duration: 15,
            maxIntensity: intensity,
            decay: 0.85
        };
    }
    
    
    updateScreenShake() {
        if (this.screenShake && this.screenShake.duration > 0) {
            // Random shake in all directions
            this.screenShake.x = (Math.random() - 0.5) * this.screenShake.intensity;
            this.screenShake.y = (Math.random() - 0.5) * this.screenShake.intensity;
            
            // Decay the shake over time
            this.screenShake.intensity *= this.screenShake.decay;
            this.screenShake.duration--;
            
            if (this.screenShake.duration <= 0) {
                this.screenShake = null;
            }
        }
    }

    updateRedFlash() {
        if (this.redFlash && this.redFlash.active) {
            // Decay the flash intensity over time
            this.redFlash.intensity *= this.redFlash.decay;
            this.redFlash.duration--;
            
            // Deactivate when duration expires or intensity is very low
            if (this.redFlash.duration <= 0 || this.redFlash.intensity < 0.01) {
                this.redFlash.active = false;
                this.redFlash.intensity = 0;
            }
        }
    }
    
    updateExplosions() {
        if (!this.explosions) return;
        
        // Use reverse iteration for safe removal during loop
        for (let i = this.explosions.length - 1; i >= 0; i--) {
            const explosion = this.explosions[i];
            
            // Expand the explosion radius over time
            const progress = 1 - (explosion.life / explosion.maxLife);
            explosion.radius = explosion.maxRadius * progress;
            
            explosion.life--;
            
            if (explosion.life <= 0) {
                // Return to pool and remove from active array
                this.returnExplosionToPool(explosion);
                this.explosions.splice(i, 1);
            }
        }
    }
    
    createDeathParticles(x, y, color) {
        // Particles removed for performance
    }
    
    showUpgradeNotification(title) {
        this.showToastNotification(`${title} ACQUIRED!`, 'upgrade');
    }
    
    showBossNotification() {
        this.showToastNotification("BOSS APPEARED!", 'boss');
    }
    
    showContinueNotification() {
        this.showToastNotification("BOSS DEFEATED! DIFFICULTY INCREASED!", 'victory');
    }
    
    calculateNotificationPosition(type) {
        // This method has been replaced by the toast notification system
        // Kept for compatibility but no longer used
        return 0;
    }

    
    addNotificationSafely(notificationData) {
        // This method has been replaced by the toast notification system
        // Kept for compatibility but no longer used
    }

    
    repositionOverlappingNotifications() {
        // This method has been replaced by the toast notification system
        // Kept for compatibility but no longer used
    }
    
    updateCamera() {
        // Calculate target camera position
        const targetX = this.player.x - this.canvas.width / 2;
        const targetY = this.player.y - this.canvas.height / 2;
        
        // Use different smoothing based on player state
        let lerpFactor = 0.1; // Default smooth following
        
        // During dash, use faster but still smooth camera movement
        if (this.player.dashCooldown > 0) {
            lerpFactor = 0.2; // Faster follow during dash, but not instant
        }
        
        // Smooth camera movement
        this.camera.x += (targetX - this.camera.x) * lerpFactor;
        this.camera.y += (targetY - this.camera.y) * lerpFactor;
    }

    
    // Performance optimization: Check if object is visible on screen
    isInViewport(x, y, radius = 0, cullingLevel = 'normal') {
        if (!this.canvas) return true; // Fallback to render everything if no canvas
        
        // Different buffer sizes based on culling aggressiveness
        let buffer;
        switch (cullingLevel) {
            case 'aggressive':
                buffer = 50; // Very tight culling for particles/effects
                break;
            case 'tight':
                buffer = 75; // Tighter culling for small entities
                break;
            case 'normal':
                buffer = 100; // Standard buffer
                break;
            case 'loose':
                buffer = 150; // Loose culling for important entities
                break;
            default:
                buffer = 100;
        }
        
        const left = this.camera.x - buffer;
        const right = this.camera.x + this.canvas.width + buffer;
        const top = this.camera.y - buffer;
        const bottom = this.camera.y + this.canvas.height + buffer;
        
        return (x + radius > left && 
                x - radius < right && 
                y + radius > top && 
                y - radius < bottom);
    }

    
    // Enhanced frustum culling with distance-based LOD
    shouldRender(entity, entityType) {
        // Always render critical entities
        if (entityType === 'player' || entity.type === 'boss') {
            return true;
        }
        
        // Calculate distance from player for LOD decisions
        const dx = entity.x - this.player.x;
        const dy = entity.y - this.player.y;
        const distanceFromPlayer = Math.sqrt(dx * dx + dy * dy);
        
        // Different culling strategies based on entity type and distance
        switch (entityType) {
            case 'particle':
                // Very aggressive culling for particles
                if (distanceFromPlayer > 400) return false;
                return this.isInViewport(entity.x, entity.y, entity.size || 2, 'aggressive');
                
            case 'projectile':
                // Tight culling for projectiles
                if (distanceFromPlayer > 600) return false;
                return this.isInViewport(entity.x, entity.y, entity.size || 3, 'tight');
                
            case 'enemy':
                // Standard culling for enemies, but skip very distant ones
                if (distanceFromPlayer > 800) return false;
                return this.isInViewport(entity.x, entity.y, entity.radius || 15, 'normal');
                
            case 'effect':
                // Aggressive culling for explosions and effects
                if (distanceFromPlayer > 500) return false;
                return this.isInViewport(entity.x, entity.y, entity.radius || 20, 'aggressive');
                
            case 'xp':
                // Standard culling for XP orbs
                return this.isInViewport(entity.x, entity.y, 15, 'normal');
                
            default:
                return this.isInViewport(entity.x, entity.y, entity.radius || 10, 'normal');
        }
    }


    
    // Object pooling for projectiles
    initializeProjectilePool() {
        // Projectile pool
        this.projectilePool = [];
        this.poolSize = 200; // Increased pool size for better performance
        
        // Pre-create projectiles
        for (let i = 0; i < this.poolSize; i++) {
            this.projectilePool.push({
                x: 0, y: 0, vx: 0, vy: 0,
                damage: 0, speed: 0, life: 0,
                size: 3, color: '#ffffff',
                type: 'basic', active: false,
                trail: [], rotation: 0,
                homing: false, target: null
            });
        }
        
        // Particle pool for explosions and effects
        this.particlePool = [];
        this.particlePoolSize = 500;
        
        for (let i = 0; i < this.particlePoolSize; i++) {
            this.particlePool.push({
                x: 0, y: 0, vx: 0, vy: 0,
                size: 2, color: '#ffffff',
                life: 1, maxLife: 1, active: false,
                type: 'basic'
            });
        }
        
        // Enemy pool for frequently spawned enemies
        this.enemyPool = [];
        this.enemyPoolSize = 50;
        
        for (let i = 0; i < this.enemyPoolSize; i++) {
            this.enemyPool.push({
                x: 0, y: 0, vx: 0, vy: 0,
                health: 100, maxHealth: 100,
                size: 20, color: '#ff0000',
                type: 'basic', active: false,
                lastHit: 0, flashTime: 0
            });
        }
        
        // Explosion pool for effects
        this.explosionPool = [];
        this.explosionPoolSize = 50;
        
        for (let i = 0; i < this.explosionPoolSize; i++) {
            this.explosionPool.push({
                x: 0, y: 0, radius: 0, maxRadius: 0,
                life: 0, maxLife: 0, color: '#FF6600',
                active: false
            });
        }
        
        // XP orb pool for performance
        this.xpOrbPool = [];
        this.xpOrbPoolSize = 100;
        
        for (let i = 0; i < this.xpOrbPoolSize; i++) {
            this.xpOrbPool.push({
                x: 0, y: 0, value: 1,
                life: 1800, glow: 0,
                active: false
            });
        }
    }
    
    // Get projectile from pool
    getPooledProjectile() {
        for (let i = 0; i < this.projectilePool.length; i++) {
            if (!this.projectilePool[i].active) {
                const projectile = this.projectilePool[i];
                projectile.active = true;
                projectile.trail = []; // Reset trail
                projectile.rotation = 0;
                projectile.homing = false;
                projectile.target = null;
                return projectile;
            }
        }
        
        // If no available projectile in pool, expand pool dynamically
        const newProjectile = {
            x: 0, y: 0, vx: 0, vy: 0,
            damage: 0, speed: 0, life: 0,
            size: 3, color: '#ffffff',
            type: 'basic', active: true,
            trail: [], rotation: 0,
            homing: false, target: null
        };
        this.projectilePool.push(newProjectile);
        return newProjectile;
    }

    getPooledXPOrb() {
        for (let i = 0; i < this.xpOrbPool.length; i++) {
            if (!this.xpOrbPool[i].active) {
                const orb = this.xpOrbPool[i];
                orb.active = true;
                orb.life = 1800; // Reset life
                orb.glow = 0; // Reset glow
                return orb;
            }
        }
        
        // If no available orb in pool, expand pool dynamically
        const newOrb = {
            x: 0, y: 0, value: 1,
            life: 1800, glow: 0,
            active: true
        };
        this.xpOrbPool.push(newOrb);
        return newOrb;
    }

    // Smart garbage collection system
    initializeSmartGarbageCollection() {
        this.garbageCollectionSystem = {
            enabled: true,
            cleanupScheduled: false,
            lastCleanup: Date.now(),
            cleanupInterval: 5000, // Cleanup every 5 seconds
            
            // Cleanup tasks to perform during idle periods
            cleanupTasks: [
                () => this.compactProjectilePool(),
                () => this.compactParticlePool(),
                () => this.compactXPOrbPool(),
                () => this.cleanupTrails()
            ]
        };
        
        console.log('Smart garbage collection system initialized');
        this.scheduleIdleCleanup();
    }
    
    scheduleIdleCleanup() {
        if (!this.garbageCollectionSystem.enabled || this.garbageCollectionSystem.cleanupScheduled) {
            return;
        }
        
        this.garbageCollectionSystem.cleanupScheduled = true;
        
        // Use requestIdleCallback if available, otherwise fallback to setTimeout
        if (typeof requestIdleCallback !== 'undefined') {
            requestIdleCallback((deadline) => {
                this.performIdleCleanup(deadline);
            }, { timeout: 1000 });
        } else {
            setTimeout(() => {
                this.performIdleCleanup({ timeRemaining: () => 16 }); // Simulate 16ms budget
            }, 100);
        }
    }
    
    performIdleCleanup(deadline) {
        this.garbageCollectionSystem.cleanupScheduled = false;
        
        const now = Date.now();
        const timeSinceLastCleanup = now - this.garbageCollectionSystem.lastCleanup;
        
        // Only perform cleanup if enough time has passed
        if (timeSinceLastCleanup < this.garbageCollectionSystem.cleanupInterval) {
            this.scheduleIdleCleanup();
            return;
        }
        
        // Perform cleanup tasks while we have idle time
        const tasks = this.garbageCollectionSystem.cleanupTasks;
        let taskIndex = 0;
        
        while (deadline.timeRemaining() > 1 && taskIndex < tasks.length) {
            try {
                tasks[taskIndex]();
                taskIndex++;
            } catch (e) {
                console.warn('Cleanup task failed:', e);
                taskIndex++;
            }
        }
        
        this.garbageCollectionSystem.lastCleanup = now;
        
        // Schedule next cleanup
        this.scheduleIdleCleanup();
    }
    
    // Pool compaction methods - remove excess inactive objects
    compactProjectilePool() {
        if (this.projectilePool.length > this.poolSize * 1.5) {
            const activeCount = this.projectilePool.filter(p => p.active).length;
            const keepCount = Math.max(this.poolSize, activeCount + 20);
            
            if (this.projectilePool.length > keepCount) {
                // Keep active objects and some inactive ones
                const newPool = this.projectilePool.filter(p => p.active);
                const inactivePool = this.projectilePool.filter(p => !p.active);
                newPool.push(...inactivePool.slice(0, keepCount - newPool.length));
                this.projectilePool = newPool;
                console.log(`Compacted projectile pool: ${this.projectilePool.length} objects`);
            }
        }
    }
    
    compactParticlePool() {
        if (this.particlePool.length > this.particlePoolSize * 1.5) {
            const activeCount = this.particlePool.filter(p => p.active).length;
            const keepCount = Math.max(this.particlePoolSize, activeCount + 50);
            
            if (this.particlePool.length > keepCount) {
                const newPool = this.particlePool.filter(p => p.active);
                const inactivePool = this.particlePool.filter(p => !p.active);
                newPool.push(...inactivePool.slice(0, keepCount - newPool.length));
                this.particlePool = newPool;
                console.log(`Compacted particle pool: ${this.particlePool.length} objects`);
            }
        }
    }
    
    compactXPOrbPool() {
        if (this.xpOrbPool && this.xpOrbPool.length > this.xpOrbPoolSize * 1.5) {
            const activeCount = this.xpOrbPool.filter(o => o.active).length;
            const keepCount = Math.max(this.xpOrbPoolSize, activeCount + 20);
            
            if (this.xpOrbPool.length > keepCount) {
                const newPool = this.xpOrbPool.filter(o => o.active);
                const inactivePool = this.xpOrbPool.filter(o => !o.active);
                newPool.push(...inactivePool.slice(0, keepCount - newPool.length));
                this.xpOrbPool = newPool;
                console.log(`Compacted XP orb pool: ${this.xpOrbPool.length} objects`);
            }
        }
    }
    
    cleanupTrails() {
        // Clean up excessive trail points from player and projectiles
        if (this.player && this.player.trail && this.player.trail.length > 20) {
            this.player.trail = this.player.trail.slice(-15);
            console.log('Cleaned up player trail');
        }
        
        // Clean up projectile trails
        let cleanedProjectiles = 0;
        this.projectiles.forEach(projectile => {
            if (projectile.trail && projectile.trail.length > 10) {
                projectile.trail = projectile.trail.slice(-8);
                cleanedProjectiles++;
            }
        });
        
        if (cleanedProjectiles > 0) {
            console.log(`Cleaned up trails from ${cleanedProjectiles} projectiles`);
        }
    }

    getPooledParticle() {
        for (let i = 0; i < this.particlePool.length; i++) {
            if (!this.particlePool[i].active) {
                const particle = this.particlePool[i];
                particle.active = true;
                return particle;
            }
        }
        
        // If no available particle in pool, expand pool dynamically
        const newParticle = {
            x: 0, y: 0, vx: 0, vy: 0,
            size: 2, color: '#ffffff',
            life: 1, maxLife: 1, active: true,
            type: 'basic'
        };
        this.particlePool.push(newParticle);
        return newParticle;
    }
    
    returnParticleToPool(particle) {
        particle.active = false;
        particle.life = 1;
        particle.maxLife = 1;
        particle.vx = 0;
        particle.vy = 0;
    }
    
    getPooledEnemy() {
        for (let i = 0; i < this.enemyPool.length; i++) {
            if (!this.enemyPool[i].active) {
                const enemy = this.enemyPool[i];
                enemy.active = true;
                enemy.lastHit = 0;
                enemy.flashTime = 0;
                return enemy;
            }
        }
        
        // If no available enemy in pool, expand pool dynamically
        const newEnemy = {
            x: 0, y: 0, vx: 0, vy: 0,
            health: 100, maxHealth: 100,
            size: 20, color: '#ff0000',
            type: 'basic', active: true,
            lastHit: 0, flashTime: 0
        };
        this.enemyPool.push(newEnemy);
        return newEnemy;
    }
    
    returnEnemyToPool(enemy) {
        enemy.active = false;
        enemy.health = enemy.maxHealth;
        enemy.lastHit = 0;
        enemy.flashTime = 0;
        enemy.vx = 0;
        enemy.vy = 0;
    }

    getPooledExplosion() {
        for (let i = 0; i < this.explosionPool.length; i++) {
            if (!this.explosionPool[i].active) {
                const explosion = this.explosionPool[i];
                explosion.active = true;
                return explosion;
            }
        }
        
        // If no available explosion in pool, expand pool dynamically
        const newExplosion = {
            x: 0, y: 0, radius: 0, maxRadius: 0,
            life: 0, maxLife: 0, color: '#FF6600',
            active: true
        };
        this.explosionPool.push(newExplosion);
        return newExplosion;
    }
    
    returnExplosionToPool(explosion) {
        explosion.active = false;
        explosion.x = 0;
        explosion.y = 0;
        explosion.radius = 0;
        explosion.maxRadius = 0;
        explosion.life = 0;
        explosion.maxLife = 0;
    }

    // =====================
    // BATCH RENDERING SYSTEM
    // =====================
    
    initializeBatchRenderer() {
        this.batchRenderer = {
            entityBatches: {
                enemies: {},
                projectiles: {},
                particles: {},
                explosions: {}
            },
            maxBatchSize: 50, // Maximum entities per batch before forcing a draw
            enabled: true
        };
        console.log('Batch rendering system initialized');
    }

    // =====================
    // CANVAS LAYERS SYSTEM
    // =====================
    
    initializeCanvasLayers() {
        if (!this.canvas || !this.canvas.parentNode) {
            console.warn('Cannot initialize canvas layers - main canvas not ready');
            return;
        }
        
        this.canvasLayers = {
            background: null,
            grid: null,
            entities: null,
            effects: null,
            ui: null,
            enabled: true,
            needsGridRedraw: true
        };
        
        // Create layer canvases
        this.createCanvasLayer('background', 0); // Bottom layer
        this.createCanvasLayer('grid', 1);       // Grid layer
        this.createCanvasLayer('entities', 2);   // Entities (enemies, projectiles, player)
        this.createCanvasLayer('effects', 3);    // Particles, explosions
        this.createCanvasLayer('ui', 4);         // UI elements, notifications
        
        console.log('Canvas layers system initialized');
    }
    
    createCanvasLayer(name, zIndex) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { 
            willReadFrequently: false 
        });
        
        // Copy dimensions from main canvas
        canvas.width = this.canvas.width;
        canvas.height = this.canvas.height;
        
        // Style the canvas
        canvas.style.position = 'absolute';
        canvas.style.left = '0px';
        canvas.style.top = '0px';
        canvas.style.zIndex = zIndex.toString();
        canvas.style.pointerEvents = 'none'; // Allow events to pass through
        
        // Insert into DOM right after main canvas
        this.canvas.parentNode.insertBefore(canvas, this.canvas.nextSibling);
        
        // Store layer info
        this.canvasLayers[name] = {
            canvas: canvas,
            ctx: ctx,
            zIndex: zIndex,
            needsRedraw: true
        };
        
        console.log(`Canvas layer '${name}' created with z-index ${zIndex}`);
    }
    
    resizeCanvasLayers() {
        if (!this.canvasLayers || !this.canvasLayers.enabled) return;
        
        for (const layerName in this.canvasLayers) {
            const layer = this.canvasLayers[layerName];
            if (layer && layer.canvas && this.canvas) {
                layer.canvas.width = this.canvas.width;
                layer.canvas.height = this.canvas.height;
                layer.needsRedraw = true;
            }
        }
        
        // Mark grid for redraw since canvas was resized
        if (this.canvasLayers.grid) {
            this.canvasLayers.needsGridRedraw = true;
        }
    }
    
    clearCanvasLayer(layerName) {
        const layer = this.canvasLayers[layerName];
        if (!layer || !layer.canvas) return;
        
        layer.ctx.clearRect(0, 0, layer.canvas.width, layer.canvas.height);
    }
    
    drawToLayer(layerName, drawFunction) {
        if (!this.canvasLayers || !this.canvasLayers.enabled) {
            // Fallback to main canvas
            drawFunction(this.ctx);
            return;
        }
        
        const layer = this.canvasLayers[layerName];
        if (!layer || !layer.canvas) {
            // Fallback to main canvas
            drawFunction(this.ctx);
            return;
        }
        
        // Draw to the layer
        drawFunction(layer.ctx);
    }
    
    invalidateLayer(layerName) {
        if (this.canvasLayers && this.canvasLayers[layerName]) {
            this.canvasLayers[layerName].needsRedraw = true;
        }
    }
    
    cleanupCanvasLayers() {
        if (!this.canvasLayers) return;
        
        // Remove layer canvases from DOM
        for (const layerName in this.canvasLayers) {
            const layer = this.canvasLayers[layerName];
            if (layer && layer.canvas && layer.canvas.parentNode) {
                layer.canvas.parentNode.removeChild(layer.canvas);
            }
        }
        
        this.canvasLayers = null;
        console.log('Canvas layers cleaned up');
    }

    // =====================
    // ADAPTIVE QUALITY SCALING SYSTEM
    // =====================
    
    initializeAdaptiveQuality() {
        this.adaptiveQuality = {
            enabled: true,
            currentLevel: 3, // 1=lowest, 5=highest
            targetFPS: 55,   // Target FPS to maintain
            lowFPSThreshold: 35, // More responsive - reduce quality sooner
            highFPSThreshold: 50, // More conservative - don't increase quality too eagerly
            checkInterval: 30, // Check every 30 frames - twice as responsive
            frameCount: 0,
            adjustmentCooldown: 180, // Wait 3 seconds between adjustments
            lastAdjustment: 0,
            
            levels: {
                1: { // Ultra Low - Crisis mode
                    particleCount: 0.1,
                    explosionCount: 0.3,
                    shadowBlur: 0,
                    glowEffects: false,
                    batchRendering: true,
                    canvasLayers: false,
                    trailLength: 3
                },
                2: { // Low
                    particleCount: 0.3,
                    explosionCount: 0.5,
                    shadowBlur: 2,
                    glowEffects: false,
                    batchRendering: true,
                    canvasLayers: false,
                    trailLength: 5
                },
                3: { // Medium (default)
                    particleCount: 0.6,
                    explosionCount: 0.8,
                    shadowBlur: 5,
                    glowEffects: true,
                    batchRendering: true,
                    canvasLayers: true,
                    trailLength: 8
                },
                4: { // High
                    particleCount: 0.8,
                    explosionCount: 1.0,
                    shadowBlur: 8,
                    glowEffects: true,
                    batchRendering: true,
                    canvasLayers: true,
                    trailLength: 12
                },
                5: { // Ultra High
                    particleCount: 1.0,
                    explosionCount: 1.0,
                    shadowBlur: 15,
                    glowEffects: true,
                    batchRendering: false, // Allow individual rendering for quality
                    canvasLayers: true,
                    trailLength: 15
                }
            }
        };
        
        console.log('Adaptive quality scaling initialized at level', this.adaptiveQuality.currentLevel);
    }
    
    updateAdaptiveQuality() {
        if (!this.adaptiveQuality || !this.adaptiveQuality.enabled) return;
        
        this.adaptiveQuality.frameCount++;
        
        // Only check performance periodically
        if (this.adaptiveQuality.frameCount % this.adaptiveQuality.checkInterval !== 0) return;
        
        // Don't adjust too frequently
        const timeSinceLastAdjustment = Date.now() - this.adaptiveQuality.lastAdjustment;
        if (timeSinceLastAdjustment < this.adaptiveQuality.adjustmentCooldown * 16.67) return; // Convert to ms
        
        const currentFPS = this.averageFPS || this.fps || 60;
        const currentLevel = this.adaptiveQuality.currentLevel;
        let newLevel = currentLevel;
        
        // Decide if we need to adjust quality
        if (currentFPS < this.adaptiveQuality.lowFPSThreshold && currentLevel > 1) {
            // Performance too low, decrease quality
            newLevel = Math.max(1, currentLevel - 1);
            console.log(`🔻 Adaptive quality: FPS ${currentFPS.toFixed(1)} < ${this.adaptiveQuality.lowFPSThreshold}, reducing quality ${currentLevel} → ${newLevel}`);
        } else if (currentFPS > this.adaptiveQuality.highFPSThreshold && currentLevel < 5) {
            // Performance good, try increasing quality
            newLevel = Math.min(5, currentLevel + 1);
            console.log(`🔺 Adaptive quality: FPS ${currentFPS.toFixed(1)} > ${this.adaptiveQuality.highFPSThreshold}, increasing quality ${currentLevel} → ${newLevel}`);
        }
        
        // Apply quality change if needed
        if (newLevel !== currentLevel) {
            this.setQualityLevel(newLevel);
            this.adaptiveQuality.lastAdjustment = Date.now();
        }
    }
    
    setQualityLevel(level) {
        if (!this.adaptiveQuality || level < 1 || level > 5) return;
        
        const oldLevel = this.adaptiveQuality.currentLevel;
        this.adaptiveQuality.currentLevel = level;
        const config = this.adaptiveQuality.levels[level];
        
        // Apply quality settings
        this.qualitySettings = {
            particleMultiplier: config.particleCount,
            explosionMultiplier: config.explosionCount,
            shadowBlur: config.shadowBlur,
            glowEffects: config.glowEffects,
            batchRendering: config.batchRendering,
            canvasLayers: config.canvasLayers,
            trailLength: config.trailLength
        };
        
        // Keep canvas layers enabled but note the quality preference
        // (Canvas layers temporarily disabled for debugging)
        this.canvasLayersPreferred = config.canvasLayers;
        
        // Toggle batch rendering based on quality level
        if (this.batchRenderer) {
            this.batchRenderer.enabled = config.batchRendering;
        }
        
        // Adjust player trail length
        if (this.player && this.player.trail) {
            const maxTrailLength = Math.min(config.trailLength, this.player.trail.length);
            if (this.player.trail.length > maxTrailLength) {
                this.player.trail = this.player.trail.slice(-maxTrailLength);
            }
            this.player.maxTrailLength = maxTrailLength;
        }
        
        console.log(`⚙️ Quality level set to ${level} (${this.getQualityLevelName(level)})`);
    }
    
    getQualityLevelName(level) {
        const names = ['', 'Ultra Low', 'Low', 'Medium', 'High', 'Ultra High'];
        return names[level] || 'Unknown';
    }
    
    shouldCreateParticle() {
        if (!this.adaptiveQuality || !this.qualitySettings) return true;
        return Math.random() < this.qualitySettings.particleMultiplier;
    }
    
    shouldCreateExplosion() {
        if (!this.adaptiveQuality || !this.qualitySettings) return true;
        return Math.random() < this.qualitySettings.explosionMultiplier;
    }
    
    getQualityShadowBlur() {
        if (!this.adaptiveQuality || !this.qualitySettings) return 10;
        return this.qualitySettings.shadowBlur;
    }
    
    shouldUseGlowEffects() {
        if (!this.adaptiveQuality || !this.qualitySettings) return true;
        return this.qualitySettings.glowEffects;
    }
    
    forceQualityLevel(level) {
        // Allow manual quality override for testing
        console.log(`🔧 Manual quality override: ${this.adaptiveQuality.currentLevel} → ${level}`);
        this.setQualityLevel(level);
        this.adaptiveQuality.lastAdjustment = Date.now();
    }
    
    addToBatch(entityType, renderType, entity) {
        if (!this.batchRenderer || !this.batchRenderer.enabled) {
            return false;
        }
        
        const batch = this.batchRenderer.entityBatches[entityType];
        if (!batch) return false;
        
        if (!batch[renderType]) {
            batch[renderType] = [];
        }
        
        batch[renderType].push(entity);
        
        // Auto-flush if batch gets too large
        if (batch[renderType].length >= this.batchRenderer.maxBatchSize) {
            this.flushBatch(entityType, renderType);
            return true;
        }
        
        return true;
    }
    
    flushBatch(entityType, renderType) {
        if (!this.batchRenderer || !this.batchRenderer.enabled) return;
        
        const batch = this.batchRenderer.entityBatches[entityType];
        if (!batch || !batch[renderType] || batch[renderType].length === 0) return;
        
        // Set up common rendering state for this batch
        this.ctx.save();
        
        switch (renderType) {
            case 'basic':
                this.renderBasicEnemyBatch(batch[renderType]);
                break;
            case 'projectile':
                this.renderProjectileBatch(batch[renderType]);
                break;
            case 'particle':
                this.renderParticleBatch(batch[renderType]);
                break;
            case 'explosion':
                this.renderExplosionBatch(batch[renderType]);
                break;
        }
        
        this.ctx.restore();
        
        // Clear the batch
        batch[renderType] = [];
    }
    
    flushAllBatches() {
        if (!this.batchRenderer || !this.batchRenderer.enabled) return;
        
        for (const entityType in this.batchRenderer.entityBatches) {
            const batches = this.batchRenderer.entityBatches[entityType];
            for (const renderType in batches) {
                this.flushBatch(entityType, renderType);
            }
        }
    }
    
    renderBasicEnemyBatch(enemies) {
        if (!enemies || enemies.length === 0) return;
        
        // Set common properties for basic enemies
        this.ctx.fillStyle = '#ff4444';
        this.ctx.strokeStyle = '#ff0000';
        this.ctx.lineWidth = 2;
        
        // Draw all enemies in one pass
        this.ctx.beginPath();
        for (const enemy of enemies) {
            if (this.shouldRender(enemy, 'enemy')) {
                this.ctx.moveTo(enemy.x + enemy.size, enemy.y);
                this.ctx.arc(enemy.x, enemy.y, enemy.size, 0, Math.PI * 2);
            }
        }
        this.ctx.fill();
        this.ctx.stroke();
    }
    
    renderProjectileBatch(projectiles) {
        if (!projectiles || projectiles.length === 0) return;
        
        // Group projectiles by type for efficient rendering
        const typeGroups = {};
        for (const projectile of projectiles) {
            if (!this.shouldRender(projectile, 'projectile')) continue;
            
            const type = projectile.type || 'basic';
            if (!typeGroups[type]) {
                typeGroups[type] = [];
            }
            typeGroups[type].push(projectile);
        }
        
        // Render each type group
        for (const type in typeGroups) {
            this.renderProjectileTypeGroup(type, typeGroups[type]);
        }
    }
    
    renderProjectileTypeGroup(type, projectiles) {
        switch (type) {
            case 'basic':
                this.ctx.fillStyle = '#00ffff';
                this.ctx.beginPath();
                for (const p of projectiles) {
                    this.ctx.moveTo(p.x + 3, p.y);
                    this.ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
                }
                this.ctx.fill();
                break;
                
            case 'plasma':
                this.ctx.fillStyle = '#ff00ff';
                this.ctx.beginPath();
                for (const p of projectiles) {
                    this.ctx.moveTo(p.x + 4, p.y);
                    this.ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
                }
                this.ctx.fill();
                break;
                
            // Add more projectile types as needed
            default:
                this.ctx.fillStyle = '#ffffff';
                this.ctx.beginPath();
                for (const p of projectiles) {
                    this.ctx.moveTo(p.x + 2, p.y);
                    this.ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
                }
                this.ctx.fill();
        }
    }
    
    renderParticleBatch(particles) {
        if (!particles || particles.length === 0) return;
        
        // Sort particles by alpha for better blending
        particles.sort((a, b) => (b.alpha || 1) - (a.alpha || 1));
        
        this.ctx.globalCompositeOperation = 'lighter';
        
        for (const particle of particles) {
            if (!this.shouldRender(particle, 'particle')) continue;
            
            this.ctx.globalAlpha = particle.alpha || 1;
            this.ctx.fillStyle = particle.color || '#ffffff';
            this.ctx.fillRect(particle.x - 1, particle.y - 1, 2, 2);
        }
        
        this.ctx.globalCompositeOperation = 'source-over';
        this.ctx.globalAlpha = 1;
    }
    
    renderExplosionBatch(explosions) {
        if (!explosions || explosions.length === 0) return;
        
        for (const explosion of explosions) {
            if (!this.shouldRender(explosion, 'explosion')) continue;
            
            const progress = 1 - (explosion.life / explosion.maxLife);
            this.ctx.globalAlpha = 1 - progress;
            
            // Create radial gradient for explosion effect
            const gradient = this.ctx.createRadialGradient(
                explosion.x, explosion.y, 0,
                explosion.x, explosion.y, explosion.radius
            );
            gradient.addColorStop(0, '#ffffff');
            gradient.addColorStop(0.3, explosion.color || '#ff4400');
            gradient.addColorStop(1, 'transparent');
            
            this.ctx.fillStyle = gradient;
            this.ctx.beginPath();
            this.ctx.arc(explosion.x, explosion.y, explosion.radius, 0, Math.PI * 2);
            this.ctx.fill();
        }
        
        this.ctx.globalAlpha = 1;
    }

    
    updateFrameRate() {
        const currentTime = performance.now();
        if (this.frameRateMonitor.lastFrameTime > 0) {
            const deltaTime = currentTime - this.frameRateMonitor.lastFrameTime;
            this.frameRateMonitor.currentFPS = Math.round(1000 / deltaTime);
            
            // Only update history occasionally to reduce overhead
            if (this.frameRateMonitor.frameCount % 5 === 0) {
                this.frameRateMonitor.fpsHistory.push(this.frameRateMonitor.currentFPS);
                if (this.frameRateMonitor.fpsHistory.length > 20) {
                    this.frameRateMonitor.fpsHistory.shift();
                }
                
                // Calculate average FPS
                const sum = this.frameRateMonitor.fpsHistory.reduce((a, b) => a + b, 0);
                this.frameRateMonitor.averageFPS = sum / this.frameRateMonitor.fpsHistory.length;
            }
        }
        this.frameRateMonitor.lastFrameTime = currentTime;
        this.frameRateMonitor.frameCount++;
        
        // Check quality less frequently to reduce overhead
        if (this.frameRateMonitor.frameCount % 60 === 0) { // Every 60 frames instead of 30
            this.adjustQuality();
            this.frameRateMonitor.lastCheck = this.frameRateMonitor.frameCount;
        }
    }
    
    adjustQuality() {
        const avgFPS = this.frameRateMonitor.averageFPS;
        const targetFPS = this.frameRateMonitor.targetFPS;
        const minFPS = this.frameRateMonitor.minFPS;
        const quality = this.frameRateMonitor.adaptiveQuality;
        
        // FIXED: Be much more conservative about enabling performance mode
        // Only enable performance mode if FPS is extremely low for extended period
        if (avgFPS < 15 && this.frameRateMonitor.fpsHistory.length >= 30) {
            // Only enable if consistently below 15 FPS
            const recentLowFPS = this.frameRateMonitor.fpsHistory.slice(-10).every(fps => fps < 20);
            if (recentLowFPS) {
                quality.particleCount = Math.max(0.5, quality.particleCount - 0.1);
                quality.effectQuality = Math.max(0.7, quality.effectQuality - 0.1);
                quality.renderDistance = Math.max(0.8, quality.renderDistance - 0.05);
                quality.trailLength = Math.max(0.7, quality.trailLength - 0.1);
                this.performanceMode = true;
                console.log('Performance mode enabled due to consistent low FPS:', avgFPS);
            }
        } else if (avgFPS > 45) {
            // Good performance - restore quality and disable performance mode
            quality.particleCount = Math.min(1.0, quality.particleCount + 0.05);
            quality.effectQuality = Math.min(1.0, quality.effectQuality + 0.05);
            quality.renderDistance = Math.min(1.0, quality.renderDistance + 0.02);
            quality.trailLength = Math.min(1.0, quality.trailLength + 0.05);
            this.performanceMode = false;
        }
        
        // Never enable performance mode on initial load
        if (this.frameRateMonitor.frameCount < 120) { // First 2 seconds
            this.performanceMode = false;
        }
    }

    // Dirty Rectangle Rendering System
    addDirtyRectangle(x, y, width, height) {
        // Add buffer around dirty area for proper cleanup
        const buffer = 10;
        this.dirtyRectangles.push({
            x: x - buffer,
            y: y - buffer, 
            width: width + buffer * 2,
            height: height + buffer * 2
        });
    }
    
    mergeDirtyRectangles() {
        if (this.dirtyRectangles.length === 0) return [];
        
        // Sort rectangles by x position
        this.dirtyRectangles.sort((a, b) => a.x - b.x);
        
        const merged = [];
        let current = this.dirtyRectangles[0];
        
        for (let i = 1; i < this.dirtyRectangles.length; i++) {
            const rect = this.dirtyRectangles[i];
            
            // Check if rectangles overlap or are adjacent
            if (rect.x <= current.x + current.width + 20) { // 20px tolerance for merging
                // Merge rectangles
                const right = Math.max(current.x + current.width, rect.x + rect.width);
                const bottom = Math.max(current.y + current.height, rect.y + rect.height);
                current.x = Math.min(current.x, rect.x);
                current.y = Math.min(current.y, rect.y);
                current.width = right - current.x;
                current.height = bottom - current.y;
            } else {
                merged.push(current);
                current = rect;
            }
        }
        merged.push(current);
        
        return merged;
    }
    
    trackEntityMovement(entity, id) {
        // DISABLED: Skip entity tracking for now to improve performance
        // We can re-enable this later once base performance is stable
        return;
    }

    // OffscreenCanvas and Static Element Caching
    initializeOffscreenCanvases() {
        if (!this.canvas) return;
        
        try {
            // SIMPLIFIED: Only create grid cache for now
            // Skip complex offscreen canvas setup that might cause performance issues
            
            if (typeof OffscreenCanvas !== 'undefined') {
                this.gridOffscreen = new OffscreenCanvas(this.canvas.width, this.canvas.height);
                this.gridOffscreenCtx = this.gridOffscreen.getContext('2d', { 
                    willReadFrequently: false 
                });
            } else {
                // Fallback for browsers without OffscreenCanvas
                this.gridOffscreen = document.createElement('canvas');
                this.gridOffscreen.width = this.canvas.width;
                this.gridOffscreen.height = this.canvas.height;
                this.gridOffscreenCtx = this.gridOffscreen.getContext('2d', { 
                    willReadFrequently: false 
                });
            }
            
            // Pre-render the grid (but don't block if it fails)
            this.prerenderGrid();
            
            this.hasOffscreenCanvases = true;
            console.log('Grid caching enabled');
            
        } catch (e) {
            console.warn('OffscreenCanvas setup failed, using normal rendering:', e);
            this.hasOffscreenCanvases = false;
            this.gridOffscreen = null;
            this.gridOffscreenCtx = null;
        }
    }
    
    prerenderGrid() {
        if (!this.gridOffscreenCtx) return;
        
        const ctx = this.gridOffscreenCtx;
        const width = this.gridOffscreen.width;
        const height = this.gridOffscreen.height;
        
        // Clear the grid canvas
        ctx.clearRect(0, 0, width, height);
        
        // Render the grid pattern
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        
        const gridSize = 60;
        const cameraOffsetX = this.camera.x % gridSize;
        const cameraOffsetY = this.camera.y % gridSize;
        
        // Vertical lines
        for (let x = -cameraOffsetX; x < width + gridSize; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }
        
        // Horizontal lines
        for (let y = -cameraOffsetY; y < height + gridSize; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }
        
        this.gridCacheValid = true;
    }
    
    renderCachedBackground() {
        if (!this.hasOffscreenCanvases || !this.gridCacheValid) {
            return false; // Fall back to regular rendering
        }
        
        // Copy the pre-rendered grid to main canvas
        this.ctx.drawImage(this.gridOffscreen, 0, 0);
        return true;
    }

    // Performance monitoring display (optional debug feature)
    drawPerformanceStats() {
        if (!this.showPerformanceStats) return;
        
        this.ctx.save();
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(10, 10, 200, 120);
        
        this.ctx.fillStyle = '#00ff00';
        this.ctx.font = '12px monospace';
        
        const fps = Math.round(this.frameRateMonitor.currentFPS);
        const avgFps = Math.round(this.frameRateMonitor.averageFPS);
        const quality = this.frameRateMonitor.adaptiveQuality;
        
        this.ctx.fillText(`FPS: ${fps} (avg: ${avgFps})`, 15, 25);
        this.ctx.fillText(`Performance: ${this.performanceMode ? 'LOW' : 'NORMAL'}`, 15, 40);
        this.ctx.fillText(`Particles: ${Math.round(quality.particleCount * 100)}%`, 15, 55);
        this.ctx.fillText(`Effects: ${Math.round(quality.effectQuality * 100)}%`, 15, 70);
        this.ctx.fillText(`Trails: ${Math.round(quality.trailLength * 100)}%`, 15, 85);
        this.ctx.fillText(`Enemies: ${this.enemies.length}`, 15, 100);
        this.ctx.fillText(`Projectiles: ${this.projectiles.length}`, 15, 115);
        
        this.ctx.restore();
    }
    
    // Return projectile to pool
    returnProjectileToPool(projectile) {
        // Mark as inactive for reuse
        projectile.active = false;
        // Reset properties for reuse
        projectile.x = 0;
        projectile.y = 0;
        projectile.vx = 0;
        projectile.vy = 0;
        projectile.life = 0;
        projectile.damage = 0;
        projectile.type = 'basic';
        projectile.color = '#ffffff';
        projectile.size = 3;
        projectile.homing = false;
        projectile.target = null;
        projectile.targetEnemy = null;
        projectile.trail = [];
        projectile.rotation = 0;
        projectile.owner = null;
        projectile.explosionRadius = 0;
        projectile.homingStrength = 0;
    }

    
    // Performance optimization: Batch canvas state changes
    setCanvasStyle(strokeStyle, lineWidth, shadowBlur = 0, shadowColor = null, fillStyle = null) {
        if (this.ctx.strokeStyle !== strokeStyle) {
            this.ctx.strokeStyle = strokeStyle;
        }
        if (this.ctx.lineWidth !== lineWidth) {
            this.ctx.lineWidth = lineWidth;
        }
        if (this.ctx.shadowBlur !== shadowBlur) {
            this.ctx.shadowBlur = shadowBlur;
        }
        if (shadowColor && this.ctx.shadowColor !== shadowColor) {
            this.ctx.shadowColor = shadowColor;
        }
        if (fillStyle && this.ctx.fillStyle !== fillStyle) {
            this.ctx.fillStyle = fillStyle;
        }
    }
    
    draw() {
        if (!this.canvas || !this.ctx) return;
        
        // Temporarily disable canvas layers to fix rendering issues
        this.drawTraditional();
    }
    
    drawWithLayers() {
        // Clear main canvas (background layer)
        this.drawToLayer('background', (ctx) => {
            ctx.fillStyle = '#0a0a0a';
            ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        });
        
        // Draw grid on grid layer (only when needed)
        if (this.canvasLayers.needsGridRedraw) {
            this.clearCanvasLayer('grid');
            this.drawToLayer('grid', (ctx) => {
                ctx.save();
                let shakeX = 0, shakeY = 0;
                if (this.screenShake) {
                    shakeX = this.screenShake.x;
                    shakeY = this.screenShake.y;
                }
                ctx.translate(-this.camera.x + shakeX, -this.camera.y + shakeY);
                this.drawGridToContext(ctx);
                ctx.restore();
            });
            this.canvasLayers.needsGridRedraw = false;
        }
        
        // Clear and draw entities layer
        this.clearCanvasLayer('entities');
        this.drawToLayer('entities', (ctx) => {
            ctx.save();
            let shakeX = 0, shakeY = 0;
            if (this.screenShake) {
                shakeX = this.screenShake.x;
                shakeY = this.screenShake.y;
            }
            ctx.translate(-this.camera.x + shakeX, -this.camera.y + shakeY);
            
            // Switch context temporarily for drawing functions
            const originalCtx = this.ctx;
            this.ctx = ctx;
            
            this.drawPlayerWithBatching();
            this.drawEnemiesWithBatching();
            this.drawProjectilesWithBatching();
            this.drawXPOrbs();
            
            // Restore original context
            this.ctx = originalCtx;
            ctx.restore();
        });
        
        // Clear and draw effects layer
        this.clearCanvasLayer('effects');
        this.drawToLayer('effects', (ctx) => {
            ctx.save();
            let shakeX = 0, shakeY = 0;
            if (this.screenShake) {
                shakeX = this.screenShake.x;
                shakeY = this.screenShake.y;
            }
            ctx.translate(-this.camera.x + shakeX, -this.camera.y + shakeY);
            
            // Switch context temporarily for drawing functions
            const originalCtx = this.ctx;
            this.ctx = ctx;
            
            this.drawExplosionsWithBatching();
            this.drawParticlesWithBatching();
            
            // Restore original context
            this.ctx = originalCtx;
            ctx.restore();
        });
        
        // Clear and draw UI layer
        this.clearCanvasLayer('ui');
        this.drawToLayer('ui', (ctx) => {
            // Switch context temporarily for drawing functions
            const originalCtx = this.ctx;
            this.ctx = ctx;
            
            this.drawNotifications();
            this.drawRedFlash();
            
            // Restore original context
            this.ctx = originalCtx;
        });
        
        // Flush any remaining batches
        this.flushAllBatches();
        
        // Mark grid for redraw on camera movement
        if (this.camera && this.camera.lastX !== this.camera.x || this.camera.lastY !== this.camera.y) {
            this.canvasLayers.needsGridRedraw = true;
            this.camera.lastX = this.camera.x;
            this.camera.lastY = this.camera.y;
        }
    }
    
    drawTraditional() {
        // Fallback to original rendering method
        this.ctx.fillStyle = '#0a0a0a';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.save();
        let shakeX = 0, shakeY = 0;
        if (this.screenShake) {
            shakeX = this.screenShake.x;
            shakeY = this.screenShake.y;
        }
        this.ctx.translate(-this.camera.x + shakeX, -this.camera.y + shakeY);
        
        this.drawGrid();
        this.drawPlayerWithBatching();
        this.drawEnemiesWithBatching();
        this.drawProjectilesWithBatching();
        this.drawXPOrbs();
        this.drawExplosionsWithBatching();
        this.drawParticlesWithBatching();
        this.drawNotifications();
        
        this.flushAllBatches();
        
        this.ctx.restore();
        
        this.drawRedFlash();
        
        this.dirtyRectangles = [];
    }

    drawRedFlash() {
        if (this.redFlash && this.redFlash.active && this.redFlash.intensity > 0) {
            // Create red neon flash overlay
            this.ctx.fillStyle = `rgba(255, 0, 50, ${this.redFlash.intensity})`;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            // Add neon glow effect with adaptive quality
            if (this.shouldUseGlowEffects()) {
                this.ctx.shadowColor = '#ff0032';
                this.ctx.shadowBlur = this.getQualityShadowBlur();
            }
            this.ctx.fillStyle = `rgba(255, 0, 50, ${this.redFlash.intensity * 0.3})`;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            // Reset shadow
            this.ctx.shadowColor = 'transparent';
            this.ctx.shadowBlur = 0;
        }
    }
    
    renderStartScreenBackground() {
        if (!this.canvas || !this.ctx) return;
        
        // Only render if canvas has valid dimensions (don't call resizeCanvas to avoid infinite loop)
        if (this.canvas.width > 0 && this.canvas.height > 0) {
            // Clear canvas with dark background
            this.ctx.fillStyle = '#0a0a0a';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            // Draw grid without camera transformation (for start screen)
            this.ctx.save();
            this.drawGrid();
            this.ctx.restore();
            
            console.log(`Start screen background rendered: ${this.canvas.width}x${this.canvas.height}`);
        } else {
            console.warn(`Cannot render background - invalid canvas dimensions: ${this.canvas.width}x${this.canvas.height}`);
        }
    }
    
    drawGrid() {
        // Set grid styling with cyan neon color (more visible)
        this.ctx.strokeStyle = 'rgba(0, 255, 255, 0.15)';
        this.ctx.lineWidth = 1;
        
        const gridSize = 60;
        
        // Calculate visible world area based on camera position - FIXED BOUNDS
        const canvasWidth = this.canvas.width;
        const canvasHeight = this.canvas.height;
        
        // Calculate grid bounds to FULLY COVER the visible canvas area
        const margin = gridSize * 3; // Extra margin to ensure full coverage
        const startX = Math.floor((this.camera.x - margin) / gridSize) * gridSize;
        const endX = Math.ceil((this.camera.x + canvasWidth + margin) / gridSize) * gridSize;
        const startY = Math.floor((this.camera.y - margin) / gridSize) * gridSize;
        const endY = Math.ceil((this.camera.y + canvasHeight + margin) / gridSize) * gridSize;
        
        // Draw vertical lines in world coordinates
        for (let x = startX; x <= endX; x += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, startY);
            this.ctx.lineTo(x, endY);
            this.ctx.stroke();
        }
        
        // Draw horizontal lines in world coordinates
        for (let y = startY; y <= endY; y += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(startX, y);
            this.ctx.lineTo(endX, y);
            this.ctx.stroke();
        }
    }

    drawGridToContext(ctx) {
        // Set grid styling with cyan neon color (more visible)
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.15)';
        ctx.lineWidth = 1;
        
        const gridSize = 60;
        
        // Calculate visible world area based on camera position - FIXED BOUNDS
        const canvasWidth = this.canvas.width;
        const canvasHeight = this.canvas.height;
        
        // Calculate grid bounds to FULLY COVER the visible canvas area
        const margin = gridSize * 3; // Extra margin to ensure full coverage
        const startX = Math.floor((this.camera.x - margin) / gridSize) * gridSize;
        const endX = Math.ceil((this.camera.x + canvasWidth + margin) / gridSize) * gridSize;
        const startY = Math.floor((this.camera.y - margin) / gridSize) * gridSize;
        const endY = Math.ceil((this.camera.y + canvasHeight + margin) / gridSize) * gridSize;
        
        // Draw vertical lines in world coordinates
        for (let x = startX; x <= endX; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, startY);
            ctx.lineTo(x, endY);
            ctx.stroke();
        }
        
        // Draw horizontal lines in world coordinates
        for (let y = startY; y <= endY; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(startX, y);
            ctx.lineTo(endX, y);
            ctx.stroke();
        }
    }
    
    drawPlayer() {
        this.ctx.save();
        
        // Calculate movement direction for arrow orientation
        // Support both WASD/arrow keys and virtual joystick
        const up = this.keys.w || this.keys.ArrowUp;
        const down = this.keys.s || this.keys.ArrowDown;
        const left = this.keys.a || this.keys.ArrowLeft;
        const right = this.keys.d || this.keys.ArrowRight;
        
        let movementAngle = this.player.lastMovementAngle || 0; // Use last direction as default
        let isMoving = false;
        
        // Check for joystick movement first (takes priority for mobile)
        if (this.isMobile && this.touchControls.joystick.active && 
            (Math.abs(this.touchControls.joystick.moveX) > 0.1 || Math.abs(this.touchControls.joystick.moveY) > 0.1)) {
            // Calculate angle from joystick movement (-1 to 1 range)
            const joystickAngle = Math.atan2(this.touchControls.joystick.moveY, this.touchControls.joystick.moveX);
            movementAngle = (joystickAngle * 180 / Math.PI); // Convert to degrees
            isMoving = true;
        }
        // Fall back to keyboard controls if no joystick movement
        else if (up && right) {
            movementAngle = -45; // Up-right
            isMoving = true;
        } else if (up && left) {
            movementAngle = -135; // Up-left
            isMoving = true;
        } else if (down && right) {
            movementAngle = 45; // Down-right
            isMoving = true;
        } else if (down && left) {
            movementAngle = 135; // Down-left
            isMoving = true;
        } else if (up) {
            movementAngle = -90; // Up
            isMoving = true;
        } else if (down) {
            movementAngle = 90; // Down
            isMoving = true;
        } else if (right) {
            movementAngle = 0; // Right
            isMoving = true;
        } else if (left) {
            movementAngle = 180; // Left
            isMoving = true;
        }
        
        // Remember the last movement direction
        if (isMoving) {
            this.player.lastMovementAngle = movementAngle;
        }
        
        // Smooth angle transition
        if (this.player.angle === undefined) this.player.angle = 0;
        let angleDiff = movementAngle - this.player.angle;
        if (angleDiff > 180) angleDiff -= 360;
        if (angleDiff < -180) angleDiff += 360;
        this.player.angle += angleDiff * 0.2;
        
        // Draw trail with neon cyan segments (ALWAYS VISIBLE)
        if (this.player.trail.length > 1) {
            this.ctx.strokeStyle = '#00ffff';
            this.ctx.lineWidth = 3;
            this.ctx.globalAlpha = 0.7;
            this.ctx.shadowBlur = 10;
            this.ctx.shadowColor = '#00ffff';
            
            this.ctx.beginPath();
            this.ctx.moveTo(this.player.trail[0].x, this.player.trail[0].y);
            for (let i = 1; i < this.player.trail.length; i++) {
                const alpha = i / this.player.trail.length;
                this.ctx.globalAlpha = alpha * 0.7;
                this.ctx.lineTo(this.player.trail[i].x, this.player.trail[i].y);
            }
            this.ctx.stroke();
        }
        
        // Reset for player drawing
        this.ctx.globalAlpha = this.player.invulnerable > 0 ? 0.5 : 1;
        
        // Neon glow effect
        const glowSize = 20 + Math.sin(this.player.glow) * 5;
        const gradient = this.ctx.createRadialGradient(
            this.player.x, this.player.y, 0,
            this.player.x, this.player.y, glowSize
        );
        gradient.addColorStop(0, 'rgba(0, 255, 255, 0.4)');
        gradient.addColorStop(1, 'rgba(0, 255, 255, 0)');
        
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(
            this.player.x - glowSize,
            this.player.y - glowSize,
            glowSize * 2,
            glowSize * 2
        );
        
        // Draw HP bar above player
        this.ctx.save();
        
        // HP bar positioning and styling
        const hpBarWidth = 30;
        const hpBarHeight = 4;
        const hpBarOffset = 25; // Distance above player
        
        // HP bar background
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        this.ctx.fillRect(
            this.player.x - hpBarWidth / 2,
            this.player.y - hpBarOffset,
            hpBarWidth,
            hpBarHeight
        );
        
        // HP bar border
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(
            this.player.x - hpBarWidth / 2,
            this.player.y - hpBarOffset,
            hpBarWidth,
            hpBarHeight
        );
        
        // HP bar fill
        const healthPercent = this.player.health / this.player.maxHealth;
        const fillWidth = hpBarWidth * healthPercent;
        
        // Color based on health level
        let fillColor = '#00ff00'; // Green for high health
        if (healthPercent < 0.6) fillColor = '#ffff00'; // Yellow for medium health
        if (healthPercent < 0.3) fillColor = '#ff0000'; // Red for low health
        
        this.ctx.fillStyle = fillColor;
        this.ctx.shadowBlur = 2;
        this.ctx.shadowColor = fillColor;
        this.ctx.fillRect(
            this.player.x - hpBarWidth / 2,
            this.player.y - hpBarOffset,
            fillWidth,
            hpBarHeight
        );
        
        this.ctx.restore();

        // Draw arrow player
        this.ctx.save();
        this.ctx.translate(this.player.x, this.player.y);
        this.ctx.rotate(this.player.angle * Math.PI / 180);
        
        // Main glow effect
        this.ctx.shadowBlur = 20;
        this.ctx.shadowColor = '#00ffff';
        
        // Arrow body
        this.ctx.strokeStyle = '#00ffff';
        this.ctx.fillStyle = 'rgba(0, 255, 255, 0.2)';
        this.ctx.lineWidth = 2;
        
        const size = this.player.radius;
        this.ctx.beginPath();
        this.ctx.moveTo(size, 0); // Arrow tip
        this.ctx.lineTo(-size, -size);
        this.ctx.lineTo(-size / 2, 0);
        this.ctx.lineTo(-size, size);
        this.ctx.closePath();
        
        this.ctx.fill();
        this.ctx.stroke();
        
        // Inner glow
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        this.ctx.lineWidth = 1;
        this.ctx.shadowBlur = 5;
        this.ctx.beginPath();
        this.ctx.moveTo(size / 2, 0);
        this.ctx.lineTo(-size / 2, -size / 2);
        this.ctx.lineTo(-size / 4, 0);
        this.ctx.lineTo(-size / 2, size / 2);
        this.ctx.closePath();
        this.ctx.stroke();
        
        this.ctx.restore();
        this.ctx.restore();
    }
    
    drawEnemies() {
        if (this.enemies.length === 0) return;
        
        // Batch enemies by behavior type to reduce context state changes
        const enemiesByType = {};
        
        for (const enemy of this.enemies) {
            // Enhanced frustum culling: Skip enemies that shouldn't be rendered
            if (!this.shouldRender(enemy, 'enemy')) {
                continue;
            }
            
            if (!enemiesByType[enemy.behavior]) {
                enemiesByType[enemy.behavior] = [];
            }
            enemiesByType[enemy.behavior].push(enemy);
        }
        
        this.ctx.save();
        
        // Render basic enemies with simplified visuals - FIXED BEHAVIOR NAMES
        const basicTypes = ['chase', 'dodge', 'fly', 'teleport']; // Updated to match actual behavior values
        for (const type of basicTypes) {
            const enemies = enemiesByType[type];
            if (!enemies) continue;
            
            for (const enemy of enemies) {
                this.ctx.save();
                this.ctx.translate(enemy.x, enemy.y);
                
                // Remove shadow for better performance and visibility on black background
                
                // Simple wireframe circle - ALWAYS render
                this.ctx.strokeStyle = enemy.color || '#00ffff';
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.arc(0, 0, enemy.radius || 15, 0, Math.PI * 2);
                this.ctx.stroke();
                
                // Always show inner cross pattern for visibility
                this.ctx.strokeStyle = (enemy.color || '#00ffff') + '80';
                this.ctx.lineWidth = 1;
                this.ctx.beginPath();
                const r = enemy.radius || 15;
                this.ctx.moveTo(-r * 0.7, 0);
                this.ctx.lineTo(r * 0.7, 0);
                this.ctx.moveTo(0, -r * 0.7);
                this.ctx.lineTo(0, r * 0.7);
                this.ctx.stroke();
                
                // Health bar (always show when damaged)
                if (enemy.health < enemy.maxHealth) {
                    const barWidth = (enemy.radius || 15) * 1.5;
                    const barHeight = 2;
                    const healthPercent = enemy.health / enemy.maxHealth;
                    
                    this.ctx.fillStyle = '#333';
                    this.ctx.fillRect(-barWidth / 2, -(enemy.radius || 15) - 6, barWidth, barHeight);
                    
                    this.ctx.fillStyle = healthPercent > 0.5 ? '#0f0' : healthPercent > 0.25 ? '#ff0' : '#f00';
                    this.ctx.fillRect(-barWidth / 2, -(enemy.radius || 15) - 6, barWidth * healthPercent, barHeight);
                }
                
                this.ctx.restore();
            }
        }
        
        // Render special enemies with more detail
        const specialTypes = ['tank', 'boss'];
        for (const type of specialTypes) {
            const enemies = enemiesByType[type];
            if (!enemies) continue;
            
            for (const enemy of enemies) {
                this.ctx.save();
                this.ctx.translate(enemy.x, enemy.y);
                
                // Apply rotation only for tank and boss
                if (type === 'tank' || type === 'boss') {
                    this.ctx.rotate(enemy.angle || 0);
                }
                
                // Add glow effect for boss like player has
                if (type === 'boss') {
                    // Scale glow based on boss level for higher level bosses
                    const bossLevel = enemy.bossLevel || 1;
                    const glowMultiplier = Math.pow(1.1, bossLevel - 1); // Scale glow with boss level
                    const baseGlowSize = 60 * glowMultiplier;
                    const glowSize = baseGlowSize + Math.sin(Date.now() * 0.008) * (20 * glowMultiplier);
                    
                    // Increase glow intensity for higher level bosses
                    const glowIntensity = Math.min(0.6, 0.4 + (bossLevel - 1) * 0.02);
                    
                    const gradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, glowSize);
                    gradient.addColorStop(0, `rgba(255, 0, 255, ${glowIntensity})`); // Magenta glow
                    gradient.addColorStop(1, 'rgba(255, 0, 255, 0)');
                    
                    this.ctx.fillStyle = gradient;
                    this.ctx.fillRect(-glowSize, -glowSize, glowSize * 2, glowSize * 2);
                }
                
                this.ctx.strokeStyle = enemy.color || '#ff00ff';
                this.ctx.lineWidth = type === 'boss' ? 3 : 2;
                
                switch (type) {
                    case 'tank':
                        // Wireframe square
                        const r = enemy.radius || 20;
                        this.ctx.strokeRect(-r, -r, r * 2, r * 2);
                        
                        // Grid pattern
                        this.ctx.strokeStyle = (enemy.color || '#ff00ff') + '60';
                        this.ctx.lineWidth = 1;
                        this.ctx.beginPath();
                        this.ctx.moveTo(-r, 0);
                        this.ctx.lineTo(r, 0);
                        this.ctx.moveTo(0, -r);
                        this.ctx.lineTo(0, r);
                        this.ctx.stroke();
                        break;
                        
                    case 'boss':
                        // Large octagon wireframe
                        const rb = enemy.radius || 40;
                        this.ctx.beginPath();
                        for (let i = 0; i < 8; i++) {
                            const angle = (Math.PI * 2 * i) / 8;
                            const x = Math.cos(angle) * rb;
                            const y = Math.sin(angle) * rb;
                            if (i === 0) {
                                this.ctx.moveTo(x, y);
                            } else {
                                this.ctx.lineTo(x, y);
                            }
                        }
                        this.ctx.closePath();
                        this.ctx.stroke();
                        
                        // Inner cross pattern with reduced shadow for inner details
                        const originalShadowBlur = this.ctx.shadowBlur;
                        this.ctx.shadowBlur = 15; // Reduced shadow for inner pattern
                        this.ctx.strokeStyle = (enemy.color || '#ff00ff') + '80';
                        this.ctx.lineWidth = 2;
                        this.ctx.beginPath();
                        this.ctx.moveTo(-rb * 0.7, -rb * 0.7);
                        this.ctx.lineTo(rb * 0.7, rb * 0.7);
                        this.ctx.moveTo(-rb * 0.7, rb * 0.7);
                        this.ctx.lineTo(rb * 0.7, -rb * 0.7);
                        this.ctx.stroke();
                        
                        // Reset alpha after boss drawing is complete
                        this.ctx.globalAlpha = 1.0;
                        break;
                }
                
                // Health bar for special enemies
                if (enemy.health < enemy.maxHealth) {
                    const barWidth = (enemy.radius || 20) * 2;
                    const barHeight = 3;
                    const healthPercent = enemy.health / enemy.maxHealth;
                    
                    this.ctx.fillStyle = '#333';
                    this.ctx.fillRect(-barWidth / 2, -(enemy.radius || 20) - 8, barWidth, barHeight);
                    
                    this.ctx.fillStyle = healthPercent > 0.5 ? '#0f0' : healthPercent > 0.25 ? '#ff0' : '#f00';
                    this.ctx.fillRect(-barWidth / 2, -(enemy.radius || 20) - 8, barWidth * healthPercent, barHeight);
                }
                
                this.ctx.restore();
            }
        }
        
        this.ctx.restore();
    }
    
    drawProjectiles() {
        if (this.projectiles.length === 0) return;
        
        // Batch projectiles by type to reduce state changes
        const projectilesByType = {};
        
        for (const projectile of this.projectiles) {
            // Enhanced frustum culling: Skip projectiles that shouldn't be rendered
            if (!this.shouldRender(projectile, 'projectile')) {
                continue;
            }
            
            if (!projectilesByType[projectile.type]) {
                projectilesByType[projectile.type] = [];
            }
            projectilesByType[projectile.type].push(projectile);
        }
        
        // Render batched projectiles
        this.ctx.save();
        
        // Render basic/spread/shotgun projectiles together (simple circles)
        const basicTypes = ['basic', 'spread', 'shotgun'];
        for (const type of basicTypes) {
            const projectiles = projectilesByType[type];
            if (!projectiles) continue;
            
            this.ctx.beginPath();
            for (const projectile of projectiles) {
                this.ctx.fillStyle = projectile.color;
                this.ctx.arc(projectile.x, projectile.y, projectile.size, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.beginPath();
            }
        }
        
        // Render laser/railgun projectiles (lines)
        const laserTypes = ['laser', 'railgun'];
        for (const type of laserTypes) {
            const projectiles = projectilesByType[type];
            if (!projectiles) continue;
            
            this.ctx.globalAlpha = 0.8;
            this.ctx.beginPath();
            for (const projectile of projectiles) {
                this.ctx.strokeStyle = projectile.color;
                this.ctx.lineWidth = projectile.size;
                this.ctx.moveTo(projectile.x - projectile.vx * 3, projectile.y - projectile.vy * 3);
                this.ctx.lineTo(projectile.x, projectile.y);
                this.ctx.stroke();
            }
            this.ctx.globalAlpha = 1;
        }
        
        // Render homing laser projectiles (special curved beams)
        const homingLasers = projectilesByType['homing_laser'];
        if (homingLasers) {
            for (const projectile of homingLasers) {
                this.ctx.globalAlpha = 0.9;
                
                // Draw outer glow
                this.ctx.strokeStyle = projectile.color;
                this.ctx.lineWidth = projectile.size + 2;
                this.ctx.shadowColor = projectile.color;
                this.ctx.shadowBlur = 10;
                this.ctx.beginPath();
                this.ctx.moveTo(projectile.x - projectile.vx * 4, projectile.y - projectile.vy * 4);
                this.ctx.lineTo(projectile.x, projectile.y);
                this.ctx.stroke();
                
                // Draw inner core
                this.ctx.shadowBlur = 0;
                this.ctx.strokeStyle = '#FFFFFF';
                this.ctx.lineWidth = Math.max(1, projectile.size - 2);
                this.ctx.beginPath();
                this.ctx.moveTo(projectile.x - projectile.vx * 4, projectile.y - projectile.vy * 4);
                this.ctx.lineTo(projectile.x, projectile.y);
                this.ctx.stroke();
                
                // Draw trail particles for homing effect
                if (Math.random() < 0.3) {
                    this.ctx.fillStyle = projectile.color;
                    this.ctx.globalAlpha = 0.6;
                    this.ctx.beginPath();
                    this.ctx.arc(
                        projectile.x - projectile.vx * (2 + Math.random() * 6),
                        projectile.y - projectile.vy * (2 + Math.random() * 6),
                        1 + Math.random() * 2,
                        0,
                        2 * Math.PI
                    );
                    this.ctx.fill();
                }
                
                this.ctx.globalAlpha = 1;
            }
        }
        
        // Render complex projectiles individually (plasma, flame, lightning, missiles)
        const complexTypes = ['plasma', 'flame', 'lightning', 'missile', 'boss-missile', 'shockburst'];
        for (const type of complexTypes) {
            const projectiles = projectilesByType[type];
            if (!projectiles) continue;
            
            for (const projectile of projectiles) {
                this.ctx.save();
                
                switch (type) {
                    case 'plasma':
                        // Simplified plasma effect for performance
                        this.ctx.fillStyle = projectile.color;
                        this.ctx.globalAlpha = 0.7;
                        this.ctx.beginPath();
                        this.ctx.arc(projectile.x, projectile.y, projectile.size * 1.5, 0, Math.PI * 2);
                        this.ctx.fill();
                        
                        this.ctx.globalAlpha = 1;
                        this.ctx.beginPath();
                        this.ctx.arc(projectile.x, projectile.y, projectile.size, 0, Math.PI * 2);
                        this.ctx.fill();
                        break;
                        
                    case 'flame':
                        this.ctx.fillStyle = projectile.color;
                        this.ctx.globalAlpha = 0.7;
                        // Simplified flame - reduce from 3 to 1 circle for performance
                        const x = projectile.x + (Math.random() - 0.5) * 3;
                        const y = projectile.y + (Math.random() - 0.5) * 3;
                        this.ctx.beginPath();
                        this.ctx.arc(x, y, projectile.size + Math.random(), 0, Math.PI * 2);
                        this.ctx.fill();
                        break;
                        
                    case 'lightning':
                        this.ctx.strokeStyle = projectile.color;
                        this.ctx.lineWidth = 2;
                        this.ctx.globalAlpha = Math.max(0.1, projectile.life / 30);
                        
                        // Render lightning chains to all targets
                        if (projectile.chainTargets && projectile.chainTargets.length > 0) {
                            let prevX = projectile.x;
                            let prevY = projectile.y;
                            
                            // Draw line to each chained enemy
                            projectile.chainTargets.forEach(target => {
                                this.ctx.beginPath();
                                this.ctx.moveTo(prevX, prevY);
                                
                                // Simplified lightning with fewer steps for performance
                                const steps = 3;
                                for (let i = 1; i <= steps; i++) {
                                    const progress = i / steps;
                                    const x = prevX + (target.x - prevX) * progress + (Math.random() - 0.5) * 10;
                                    const y = prevY + (target.y - prevY) * progress + (Math.random() - 0.5) * 10;
                                    this.ctx.lineTo(x, y);
                                }
                                this.ctx.stroke();
                                
                                // Update previous position for next chain segment
                                prevX = target.x;
                                prevY = target.y;
                            });
                        } else {
                            // Fallback to original single-target rendering
                            this.ctx.beginPath();
                            this.ctx.moveTo(projectile.x, projectile.y);
                            const steps = 3;
                            for (let i = 1; i <= steps; i++) {
                                const progress = i / steps;
                                const x = projectile.x + (projectile.targetX - projectile.x) * progress + (Math.random() - 0.5) * 10;
                                const y = projectile.y + (projectile.targetY - projectile.y) * progress + (Math.random() - 0.5) * 10;
                                this.ctx.lineTo(x, y);
                            }
                            this.ctx.stroke();
                        }
                        break;
                        
                    case 'shockburst':
                        // Simple rendering like lightning but cyan color

                        this.ctx.strokeStyle = '#00FFFF'; // Cyan color
                        this.ctx.lineWidth = 2;
                        this.ctx.globalAlpha = Math.max(0.1, projectile.life / 30);
                        
                        // Render shockburst chains to all targets (same as lightning)
                        if (projectile.chainTargets && projectile.chainTargets.length > 0) {
                            let prevX = projectile.x;
                            let prevY = projectile.y;
                            
                            // Draw line to each chained enemy
                            projectile.chainTargets.forEach((target, targetIndex) => {
                                this.ctx.beginPath();
                                this.ctx.moveTo(prevX, prevY);
                                
                                // Simplified lightning with fewer steps for performance
                                const steps = 3;
                                for (let i = 1; i <= steps; i++) {
                                    const progress = i / steps;
                                    const x = prevX + (target.x - prevX) * progress + (Math.random() - 0.5) * 10;
                                    const y = prevY + (target.y - prevY) * progress + (Math.random() - 0.5) * 10;
                                    this.ctx.lineTo(x, y);
                                }
                                this.ctx.stroke();
                                
                                // Add explosion visual effect at each chain target
                                const explosionRadius = 100; // Explosion radius for visuals
                                const explosionAlpha = Math.max(0.1, projectile.life / 30) * 0.6; // Slightly transparent
                                
                                // Draw explosion ring
                                this.ctx.globalAlpha = explosionAlpha;
                                this.ctx.strokeStyle = '#00FFFF'; // Cyan explosion
                                this.ctx.lineWidth = 1;
                                this.ctx.beginPath();
                                this.ctx.arc(target.x, target.y, explosionRadius * (1 - projectile.life / 30), 0, Math.PI * 2);
                                this.ctx.stroke();
                                
                                // Draw inner explosion pulse
                                this.ctx.globalAlpha = explosionAlpha * 1.5;
                                this.ctx.lineWidth = 0.5;
                                this.ctx.beginPath();
                                this.ctx.arc(target.x, target.y, (explosionRadius * 0.6) * (1 - projectile.life / 30), 0, Math.PI * 2);
                                this.ctx.stroke();
                                
                                // Reset for next chain
                                this.ctx.strokeStyle = '#00FFFF';
                                this.ctx.lineWidth = 2;
                                this.ctx.globalAlpha = Math.max(0.1, projectile.life / 30);
                                
                                // Update previous position for next chain segment
                                prevX = target.x;
                                prevY = target.y;
                            });
                        } else {
                            // Fallback to original single-target rendering
                            this.ctx.beginPath();
                            this.ctx.moveTo(projectile.x, projectile.y);
                            const steps = 3;
                            for (let i = 1; i <= steps; i++) {
                                const progress = i / steps;
                                const x = projectile.x + (projectile.targetX - projectile.x) * progress + (Math.random() - 0.5) * 10;
                                const y = projectile.y + (projectile.targetY - projectile.y) * progress + (Math.random() - 0.5) * 10;
                                this.ctx.lineTo(x, y);
                            }
                            this.ctx.stroke();
                        }
                        break;
                        
                    case 'missile':
                        this.ctx.translate(projectile.x, projectile.y);
                        this.ctx.rotate(Math.atan2(projectile.vy, projectile.vx));
                        
                        // Missile body
                        this.ctx.fillStyle = projectile.color;
                        this.ctx.fillRect(-6, -2, 12, 4);
                        
                        // Missile tip
                        this.ctx.fillStyle = '#FF6B35';
                        this.ctx.beginPath();
                        this.ctx.moveTo(6, 0);
                        this.ctx.lineTo(3, -2);
                        this.ctx.lineTo(3, 2);
                        this.ctx.closePath();
                        this.ctx.fill();
                        
                        // Simplified exhaust trail
                        this.ctx.fillStyle = '#FF4444';
                        this.ctx.globalAlpha = 0.6;
                        this.ctx.fillRect(-9, -1, 3, 2);
                        break;
                        
                    case 'boss-missile':
                        this.ctx.translate(projectile.x, projectile.y);
                        this.ctx.rotate(Math.atan2(projectile.vy, projectile.vx));
                        
                        // Boss missile body
                        this.ctx.fillStyle = projectile.color;
                        this.ctx.fillRect(-8, -3, 16, 6);
                        
                        // Boss missile tip
                        this.ctx.fillStyle = '#FF0000';
                        this.ctx.beginPath();
                        this.ctx.moveTo(8, 0);
                        this.ctx.lineTo(4, -3);
                        this.ctx.lineTo(4, 3);
                        this.ctx.closePath();
                        this.ctx.fill();
                        
                        // Simplified exhaust trail
                        this.ctx.fillStyle = '#FF0066';
                        this.ctx.globalAlpha = 0.8;
                        this.ctx.fillRect(-12, -2, 4, 4);
                        break;
                }
                
                this.ctx.restore();
            }
        }
        
        this.ctx.restore();
    }
    
    drawXPOrbs() {
        this.xpOrbs.forEach(orb => {
            // Enhanced frustum culling: Skip XP orbs that shouldn't be rendered
            if (!this.shouldRender(orb, 'xp')) {
                return; // Skip rendering this orb
            }
            this.ctx.save();
            
            // Glow effect
            const glowIntensity = 0.5 + Math.sin(orb.glow) * 0.3;
            const gradient = this.ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, 15);
            gradient.addColorStop(0, `rgba(0, 255, 255, ${glowIntensity})`);
            gradient.addColorStop(1, 'rgba(0, 255, 255, 0)');
            
            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(orb.x - 15, orb.y - 15, 30, 30);
            
            // Orb body
            this.ctx.fillStyle = '#00FFFF';
            this.ctx.strokeStyle = '#FFFFFF';
            this.ctx.lineWidth = 1;
            
            this.ctx.beginPath();
            this.ctx.arc(orb.x, orb.y, 5, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.stroke();
            
            this.ctx.restore();
        });
    }
    
    drawExplosions() {
        if (!this.explosions) return;
        
        this.explosions.forEach(explosion => {
            // Enhanced frustum culling: Skip explosions that shouldn't be rendered
            if (!this.shouldRender(explosion, 'effect')) return;
            if (!this.isInViewport(explosion.x, explosion.y, explosion.maxRadius)) {
                return;
            }
            
            this.ctx.save();
            
            // Calculate explosion progress and alpha
            const progress = 1 - (explosion.life / explosion.maxLife);
            const alpha = 1 - progress; // Fade out as explosion progresses
            
            // Create radial gradient for explosion effect
            const gradient = this.ctx.createRadialGradient(
                explosion.x, explosion.y, 0,
                explosion.x, explosion.y, explosion.radius
            );
            
            // Color transitions from bright orange to red to transparent
            if (progress < 0.3) {
                gradient.addColorStop(0, `rgba(255, 255, 100, ${alpha})`); // Bright yellow center
                gradient.addColorStop(0.5, `rgba(255, 140, 0, ${alpha * 0.8})`); // Orange
                gradient.addColorStop(1, `rgba(255, 69, 0, ${alpha * 0.4})`); // Red-orange edge
            } else if (progress < 0.7) {
                gradient.addColorStop(0, `rgba(255, 140, 0, ${alpha})`); // Orange center
                gradient.addColorStop(0.5, `rgba(255, 69, 0, ${alpha * 0.8})`); // Red-orange
                gradient.addColorStop(1, `rgba(128, 0, 0, ${alpha * 0.3})`); // Dark red edge
            } else {
                gradient.addColorStop(0, `rgba(255, 69, 0, ${alpha})`); // Red-orange center
                gradient.addColorStop(0.7, `rgba(128, 0, 0, ${alpha * 0.5})`); // Dark red
                gradient.addColorStop(1, `rgba(64, 0, 0, ${alpha * 0.2})`); // Very dark red edge
            }
            
            this.ctx.fillStyle = gradient;
            this.ctx.beginPath();
            this.ctx.arc(explosion.x, explosion.y, explosion.radius, 0, Math.PI * 2);
            this.ctx.fill();
            
            this.ctx.restore();
        });
    }
    
    drawParticles() {
        if (this.particles.length === 0) return;
        
        const quality = this.frameRateMonitor.adaptiveQuality;
        
        // Enhanced frustum culling: Pre-filter particles aggressively
        const visibleParticles = [];
        for (const particle of this.particles) {
            if (this.shouldRender(particle, 'particle')) {
                visibleParticles.push(particle);
            }
        }
        
        // Early exit if no visible particles
        if (visibleParticles.length === 0) return;
        
        // Use simpler rendering for better performance
        if (quality.effectQuality < 0.6) {
            // Ultra-fast particle rendering - single color, no alpha blending
            this.ctx.save();
            this.ctx.fillStyle = '#00ffff';
            
            for (const particle of visibleParticles) {
                // Simple rectangle instead of circle for speed
                const size = particle.size * (particle.life / particle.maxLife);
                this.ctx.fillRect(particle.x - size/2, particle.y - size/2, size, size);
            }
            this.ctx.restore();
            return;
        }
        
        // Batch particles by color to reduce state changes (medium quality)
        const particlesByColor = {};
        
        for (const particle of visibleParticles) {
            // Quantize colors to reduce the number of batches
            let batchColor = particle.color;
            if (quality.effectQuality < 0.8) {
                // Simplify to primary colors for batching
                if (particle.color.includes('ff6') || particle.color.includes('FF6')) batchColor = '#ff6600';
                else if (particle.color.includes('ff9') || particle.color.includes('FF9')) batchColor = '#ff9900';
                else if (particle.color.includes('ffc') || particle.color.includes('FFC')) batchColor = '#ffcc00';
                else batchColor = '#00ffff'; // Default cyan
            }
            
            if (!particlesByColor[batchColor]) {
                particlesByColor[batchColor] = [];
            }
            particlesByColor[batchColor].push(particle);
        }
        
        // Render batched particles with minimal alpha blending
        this.ctx.save();
        
        for (const color in particlesByColor) {
            const particles = particlesByColor[color];
            this.ctx.fillStyle = color;
            
            if (quality.effectQuality > 0.8) {
                // High quality - individual alpha per particle
                for (const particle of particles) {
                    const alpha = (particle.life / particle.maxLife) * 0.8;
                    this.ctx.globalAlpha = alpha;
                    const size = particle.size * alpha;
                    
                    // Use rectangles instead of circles for performance
                    this.ctx.fillRect(particle.x - size/2, particle.y - size/2, size, size);
                }
            } else {
                // Medium quality - batched alpha, simpler shapes
                this.ctx.globalAlpha = 0.7;
                
                // Draw all particles of this color at once
                for (const particle of particles) {
                    const lifeFactor = particle.life / particle.maxLife;
                    const size = particle.size * lifeFactor;
                    
                    // Simple filled rectangles for speed
                    this.ctx.fillRect(particle.x - size/2, particle.y - size/2, size, size);
                }
            }
        }
        
        this.ctx.restore();
    }
    
    drawNotifications() {
        // Notifications are now handled by DOM-based toast system
        // This method is kept for compatibility but does nothing
    }

    // =====================
    // BATCHED DRAWING FUNCTIONS
    // =====================
    
    drawPlayerWithBatching() {
        // Player is unique, so just draw normally
        this.drawPlayer();
    }
    
    drawEnemiesWithBatching() {
        if (!this.enemies || this.enemies.length === 0) return;
        
        // Fallback to traditional enemy drawing for now
        this.drawEnemies();
    }
    
    drawProjectilesWithBatching() {
        if (!this.projectiles || this.projectiles.length === 0) return;
        
        // Fallback to traditional projectile drawing for now
        this.drawProjectiles();
    }
    
    drawExplosionsWithBatching() {
        if (!this.explosions || this.explosions.length === 0) return;
        
        // Fallback to traditional explosion drawing for now
        this.drawExplosions();
    }
    
    drawParticlesWithBatching() {
        if (!this.particles || this.particles.length === 0) return;
        
        // Fallback to traditional particle drawing for now
        this.drawParticles();
    }
    
    // Fallback individual rendering functions
    drawIndividualEnemy(enemy) {
        this.ctx.save();
        
        // Basic enemy rendering (simplified from original drawEnemies)
        if (enemy.type === 'boss') {
            // Boss rendering
            this.ctx.fillStyle = '#ff0000';
            this.ctx.strokeStyle = '#ffaa00';
            this.ctx.lineWidth = 4;
        } else {
            // Normal enemy rendering
            this.ctx.fillStyle = '#ff4444';
            this.ctx.strokeStyle = '#ff0000';
            this.ctx.lineWidth = 2;
        }
        
        this.ctx.beginPath();
        this.ctx.arc(enemy.x, enemy.y, enemy.size, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.stroke();
        
        this.ctx.restore();
    }
    
    drawIndividualProjectile(projectile) {
        this.ctx.save();
        
        // Basic projectile rendering
        switch (projectile.type) {
            case 'plasma':
                this.ctx.fillStyle = '#ff00ff';
                this.ctx.shadowColor = '#ff00ff';
                this.ctx.shadowBlur = 10;
                break;
            case 'laser':
                this.ctx.strokeStyle = '#00ff00';
                this.ctx.lineWidth = 2;
                this.ctx.shadowColor = '#00ff00';
                this.ctx.shadowBlur = 5;
                break;
            default:
                this.ctx.fillStyle = '#00ffff';
                this.ctx.shadowColor = '#00ffff';
                this.ctx.shadowBlur = 5;
        }
        
        if (projectile.type === 'laser') {
            this.ctx.beginPath();
            this.ctx.moveTo(projectile.x - 10, projectile.y);
            this.ctx.lineTo(projectile.x + 10, projectile.y);
            this.ctx.stroke();
        } else {
            this.ctx.beginPath();
            this.ctx.arc(projectile.x, projectile.y, projectile.size || 3, 0, Math.PI * 2);
            this.ctx.fill();
        }
        
        this.ctx.restore();
    }
    
    drawIndividualExplosion(explosion) {
        this.ctx.save();
        
        const progress = 1 - (explosion.life / explosion.maxLife);
        this.ctx.globalAlpha = 1 - progress;
        
        const gradient = this.ctx.createRadialGradient(
            explosion.x, explosion.y, 0,
            explosion.x, explosion.y, explosion.radius
        );
        gradient.addColorStop(0, '#ffffff');
        gradient.addColorStop(0.3, explosion.color || '#ff4400');
        gradient.addColorStop(1, 'transparent');
        
        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(explosion.x, explosion.y, explosion.radius, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.restore();
    }
    
    drawIndividualParticle(particle) {
        this.ctx.save();
        
        this.ctx.globalAlpha = particle.alpha || 1;
        this.ctx.fillStyle = particle.color || '#ffffff';
        this.ctx.shadowColor = particle.color || '#ffffff';
        this.ctx.shadowBlur = 3;
        
        this.ctx.fillRect(particle.x - 1, particle.y - 1, 2, 2);
        
        this.ctx.restore();
    }
    
    updateUI() {
        // Header Health bar
        const healthPercent = (this.player.health / this.player.maxHealth) * 100;
        const headerHealthFill = document.getElementById('header-health-fill');
        const headerHealthText = document.getElementById('header-health-text');
        if (headerHealthFill && headerHealthText) {
            headerHealthFill.style.width = `${Math.max(0, healthPercent)}%`;
            headerHealthText.textContent = `${Math.max(0, Math.floor(this.player.health))}`;
            
            // Color-changing health bar (same logic as enemy health bars)
            const healthRatio = this.player.health / this.player.maxHealth;
            const healthColor = healthRatio > 0.5 ? '#00ff00' : healthRatio > 0.25 ? '#ffff00' : '#ff0000';
            headerHealthFill.style.backgroundColor = healthColor;
        }
        
        // Header XP bar
        const xpRequired = this.player.level * 5 + 10;
        const xpPercent = (this.player.xp / xpRequired) * 100;
        const headerXpFill = document.getElementById('header-xp-fill');
        const headerLevelText = document.getElementById('header-level-text');
        if (headerXpFill && headerLevelText) {
            headerXpFill.style.width = `${xpPercent}%`;
            headerLevelText.textContent = `Lv${this.player.level}`;
        }
        
        // Header Time display
        const headerTimeDisplay = document.getElementById('header-time-display');
        if (headerTimeDisplay) {
            const minutes = Math.floor(this.gameTime / 60);
            const seconds = Math.floor(this.gameTime % 60);
            headerTimeDisplay.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }
        
        // Header Weapon display
        const headerWeaponDisplay = document.getElementById('header-weapon-display');
        if (headerWeaponDisplay) {
            headerWeaponDisplay.innerHTML = this.weapons.map(weapon => {
                const isMergeWeapon = weapon.isMergeWeapon || (weapon.type && weapon.type.includes('homing_laser'));
                const mergeClass = isMergeWeapon ? ' header-weapon-merge' : '';
                return `
                    <div class="header-weapon-item${mergeClass}">
                        ${this.getWeaponName(weapon.type)} ${weapon.level}
                    </div>
                `;
            }).join('');
        }
        
        // Header Boss counter (only show after first boss defeat)
        const headerBossDisplay = document.getElementById('header-boss-display');
        if (headerBossDisplay) {
            if (this.bossesKilled > 0) {
                headerBossDisplay.style.display = 'block';
                headerBossDisplay.textContent = `Boss x${this.bossesKilled}`;
            } else {
                headerBossDisplay.style.display = 'none';
            }
        }
    }
    
    gameOver() {
        this.gameRunning = false;
        
        // Hide pause button during game over
        const pauseBtn = document.getElementById('pause-btn');
        if (pauseBtn) {
            pauseBtn.style.display = 'none';
        }
    }
    
    showGameOverModal() {
        // Creating game over overlay
        
        // Calculate final stats
        const minutes = Math.floor(this.gameTime / 60);
        const seconds = Math.floor(this.gameTime % 60);
        const timeText = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        const finalStats = {
            level: this.player.level,
            timeText: timeText,
            enemiesKilled: Math.max(1, Math.floor(this.gameTime * 1.8))
        };
        
        // Create game over overlay (similar to Vibe Runner style)
        const gameOverOverlay = document.createElement('div');
        gameOverOverlay.id = 'survivor-game-over-overlay';
        gameOverOverlay.style.cssText = `
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            height: 100% !important;
            background: transparent !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            z-index: 99999 !important;
            backdrop-filter: blur(5px) !important;
        `;
        
        // Create game over content with neon theme
        gameOverOverlay.innerHTML = `
            <div style="
                background: linear-gradient(135deg, #0a0a1a, #1a0a2a) !important;
                border: 2px solid #00ffff !important;
                border-radius: 15px !important;
                padding: 30px !important;
                text-align: center !important;
                color: white !important;
                max-width: 400px !important;
                box-shadow: 0 0 30px rgba(0, 255, 255, 0.5) !important;
                font-family: Arial, sans-serif !important;
            ">
                <div style="
                    color: #ff0066 !important;
                    font-size: 36px !important;
                    font-weight: bold !important;
                    margin-bottom: 20px !important;
                    text-shadow: 0 0 15px rgba(255, 0, 102, 0.8) !important;
                ">GAME OVER</div>
                
                <div style="margin-bottom: 25px !important;">
                    <div style="
                        display: flex;
                        justify-content: space-between;
                        margin: 8px 0;
                        font-size: 18px;
                        color: #00ffff;
                    ">
                        <span>Level:</span>
                        <span style="color: #ff00ff; font-weight: bold;">${finalStats.level}</span>
                    </div>
                    <div style="
                        display: flex;
                        justify-content: space-between;
                        margin: 8px 0;
                        font-size: 18px;
                        color: #00ffff;
                    ">
                        <span>Time:</span>
                        <span style="color: #ff00ff; font-weight: bold;">${finalStats.timeText}</span>
                    </div>
                    <div style="
                        display: flex;
                        justify-content: space-between;
                        margin: 8px 0;
                        font-size: 18px;
                        color: #00ffff;
                    ">
                        <span>Enemies:</span>
                        <span style="color: #ff00ff; font-weight: bold;">${finalStats.enemiesKilled}</span>
                    </div>
                    ${this.bossesKilled > 0 ? `
                    <div style="
                        display: flex;
                        justify-content: space-between;
                        margin: 8px 0;
                        font-size: 18px;
                        color: #00ffff;
                    ">
                        <span>Bosses Defeated:</span>
                        <span style="color: #ff00ff; font-weight: bold;">${this.bossesKilled}</span>
                    </div>
                    ` : ''}
                </div>
                
                <div style="display: flex; gap: 15px; justify-content: center;">
                    <button id="overlay-retry-btn" style="
                        background: transparent !important;
                        border: 2px solid #00ffff !important;
                        color: #00ffff !important;
                        padding: 12px 25px !important;
                        font-size: 16px !important;
                        border-radius: 25px !important;
                        font-weight: bold !important;
                        transition: all 0.3s ease !important;
                        cursor: pointer !important;
                        touch-action: manipulation !important;
                        min-width: 44px !important;
                        min-height: 44px !important;
                        user-select: none !important;
                        -webkit-user-select: none !important;
                        -webkit-tap-highlight-color: transparent !important;
                    ">RETRY</button>
                    
                    <button id="overlay-exit-btn" style="
                        background: transparent !important;
                        border: 2px solid #ff00ff !important;
                        color: #ff00ff !important;
                        padding: 12px 25px !important;
                        font-size: 16px !important;
                        border-radius: 25px !important;
                        font-weight: bold !important;
                        transition: all 0.3s ease !important;
                        cursor: pointer !important;
                        touch-action: manipulation !important;
                        min-width: 44px !important;
                        min-height: 44px !important;
                        user-select: none !important;
                        -webkit-user-select: none !important;
                        -webkit-tap-highlight-color: transparent !important;
                    ">EXIT</button>
                </div>
            </div>
        `;
        
        // Add hover effects
        const style = document.createElement('style');
        style.textContent = `
            #overlay-retry-btn:hover {
                background: rgba(0, 255, 255, 0.1) !important;
                box-shadow: 0 0 15px rgba(0, 255, 255, 0.5) !important;
            }
            #overlay-exit-btn:hover {
                background: rgba(255, 0, 255, 0.1) !important;
                box-shadow: 0 0 15px rgba(255, 0, 255, 0.5) !important;
            }
        `;
        document.head.appendChild(style);
        
        // Add overlay to the game container (not the modal)
        const gameContainer = document.getElementById('vibe-survivor-container');
        if (gameContainer) {
            gameContainer.appendChild(gameOverOverlay);
        }
        
        // Add event listeners with both click and touch support
        const retryBtn = document.getElementById('overlay-retry-btn');
        const exitBtn = document.getElementById('overlay-exit-btn');
        
        const retryHandler = (e) => {
            e.preventDefault();
            e.stopPropagation();
            // Reset menu navigation
            this.resetMenuNavigation();
            // Remove overlay
            gameOverOverlay.remove();
            style.remove();
            // Restart game
            this.startGame();
        };
        
        const exitHandler = (e) => {
            e.preventDefault();
            e.stopPropagation();
            // Reset menu navigation
            this.resetMenuNavigation();
            // Remove overlay
            gameOverOverlay.remove();
            style.remove();
            // Close game
            this.closeGame();
        };
        
        // Add both click and touch events for better mobile support
        retryBtn.addEventListener('click', retryHandler);
        retryBtn.addEventListener('touchend', retryHandler);
        exitBtn.addEventListener('click', exitHandler);
        exitBtn.addEventListener('touchend', exitHandler);
        
        // Add menu navigation styles
        this.addMenuNavigationStyles();
        
        // Initialize keyboard navigation for game over buttons
        const gameOverButtons = [retryBtn, exitBtn];
        this.initializeMenuNavigation('gameover', gameOverButtons);
        
        // Game over overlay ready
    }
    
    bossDefeated() {
        console.log('Boss defeated! Starting victory sequence...');
        
        // Reset boss defeat animation state
        this.bossDefeating = false;
        this.gameRunning = false;
        
        // Cancel any running game loop
        if (this.gameLoopId) {
            cancelAnimationFrame(this.gameLoopId);
            this.gameLoopId = null;
            console.log('Game loop cancelled');
        }
        
        // Creating victory overlay
        
        // Calculate final stats
        const minutes = Math.floor(this.gameTime / 60);
        const seconds = Math.floor(this.gameTime % 60);
        const timeText = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        const finalStats = {
            level: this.player.level,
            timeText: timeText,
            enemiesKilled: Math.max(1, Math.floor(this.gameTime * 1.8))
        };
        
        // Create victory overlay (similar to game over but with victory theme)
        const victoryOverlay = document.createElement('div');
        victoryOverlay.id = 'survivor-victory-overlay';
        victoryOverlay.style.cssText = `
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            height: 100% !important;
            background: transparent !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            z-index: 99999 !important;
            backdrop-filter: blur(5px) !important;
        `;
        
        // Create victory content with neon theme
        victoryOverlay.innerHTML = `
            <div style="
                background: linear-gradient(135deg, #0a1a0a, #1a2a0a) !important;
                border: 2px solid #00ff00 !important;
                border-radius: 15px !important;
                padding: 30px !important;
                text-align: center !important;
                color: white !important;
                max-width: 400px !important;
                box-shadow: 0 0 30px rgba(0, 255, 0, 0.5) !important;
                font-family: Arial, sans-serif !important;
            ">
                <div style="
                    color: #00ff00 !important;
                    font-size: 36px !important;
                    font-weight: bold !important;
                    margin-bottom: 20px !important;
                    text-shadow: 0 0 15px rgba(0, 255, 0, 0.8) !important;
                ">VICTORY!</div>
                
                <div style="
                    color: #ffff00 !important;
                    font-size: 18px !important;
                    font-weight: bold !important;
                    margin-bottom: 25px !important;
                    text-shadow: 0 0 10px rgba(255, 255, 0, 0.6) !important;
                ">${this.bossesKilled === 0 ? 'BOSS DEFEATED' : `BOSS LEVEL ${this.bossLevel - 1} DEFEATED`}</div>
                
                <div style="margin-bottom: 25px !important;">
                    <div style="
                        display: flex;
                        justify-content: space-between;
                        margin: 8px 0;
                        font-size: 18px;
                        color: #00ffff;
                    ">
                        <span>Level:</span>
                        <span style="color: #00ff00; font-weight: bold;">${finalStats.level}</span>
                    </div>
                    <div style="
                        display: flex;
                        justify-content: space-between;
                        margin: 8px 0;
                        font-size: 18px;
                        color: #00ffff;
                    ">
                        <span>Survival Time:</span>
                        <span style="color: #00ff00; font-weight: bold;">${finalStats.timeText}</span>
                    </div>
                    <div style="
                        display: flex;
                        justify-content: space-between;
                        margin: 8px 0;
                        font-size: 18px;
                        color: #00ffff;
                    ">
                        <span>Enemies Defeated:</span>
                        <span style="color: #00ff00; font-weight: bold;">${finalStats.enemiesKilled}</span>
                    </div>
                    ${this.bossesKilled >= 1 ? `
                    <div style="
                        display: flex;
                        justify-content: space-between;
                        margin: 8px 0;
                        font-size: 18px;
                        color: #00ffff;
                    ">
                        <span>Total Bosses Defeated:</span>
                        <span style="color: #ff00ff; font-weight: bold;">${this.bossesKilled}</span>
                    </div>
                    <div style="
                        margin: 15px 0;
                        font-size: 16px;
                        color: #ffff00;
                        text-align: center;
                        font-weight: bold;
                        text-shadow: 0 0 8px rgba(255, 255, 0, 0.8);
                    ">
                        Next: Boss Level ${this.bossLevel}
                    </div>
                    ` : ''}
                </div>
                
                <div style="display: flex; gap: 15px; justify-content: center; flex-wrap: wrap;">
                    <button id="victory-continue-btn" style="
                        background: transparent !important;
                        border: 2px solid #ff00ff !important;
                        color: #ff00ff !important;
                        padding: 12px 25px !important;
                        font-size: 16px !important;
                        border-radius: 25px !important;
                        font-weight: bold !important;
                        transition: all 0.3s ease !important;
                        cursor: pointer !important;
                        touch-action: manipulation !important;
                        min-width: 44px !important;
                        min-height: 44px !important;
                        user-select: none !important;
                        -webkit-user-select: none !important;
                        -webkit-tap-highlight-color: transparent !important;
                    ">CONTINUE</button>
                    
                    <button id="victory-retry-btn" style="
                        background: transparent !important;
                        border: 2px solid #00ff00 !important;
                        color: #00ff00 !important;
                        padding: 12px 25px !important;
                        font-size: 16px !important;
                        border-radius: 25px !important;
                        font-weight: bold !important;
                        transition: all 0.3s ease !important;
                        cursor: pointer !important;
                        touch-action: manipulation !important;
                        min-width: 44px !important;
                        min-height: 44px !important;
                        user-select: none !important;
                        -webkit-user-select: none !important;
                        -webkit-tap-highlight-color: transparent !important;
                    ">PLAY AGAIN</button>
                    
                    <button id="victory-exit-btn" style="
                        background: transparent !important;
                        border: 2px solid #ffff00 !important;
                        color: #ffff00 !important;
                        padding: 12px 25px !important;
                        font-size: 16px !important;
                        border-radius: 25px !important;
                        font-weight: bold !important;
                        transition: all 0.3s ease !important;
                        cursor: pointer !important;
                        touch-action: manipulation !important;
                        min-width: 44px !important;
                        min-height: 44px !important;
                        user-select: none !important;
                        -webkit-user-select: none !important;
                        -webkit-tap-highlight-color: transparent !important;
                    ">EXIT</button>
                </div>
            </div>
        `;
        
        // Add hover effects
        const style = document.createElement('style');
        style.textContent = `
            #victory-continue-btn:hover {
                background: rgba(255, 0, 255, 0.1) !important;
                box-shadow: 0 0 15px rgba(255, 0, 255, 0.5) !important;
            }
            #victory-retry-btn:hover {
                background: rgba(0, 255, 0, 0.1) !important;
                box-shadow: 0 0 15px rgba(0, 255, 0, 0.5) !important;
            }
            #victory-exit-btn:hover {
                background: rgba(255, 255, 0, 0.1) !important;
                box-shadow: 0 0 15px rgba(255, 255, 0, 0.5) !important;
            }
        `;
        document.head.appendChild(style);
        
        // Add overlay to the game container - try multiple possible containers
        let gameContainer = document.getElementById('vibe-survivor-container');
        if (!gameContainer) {
            gameContainer = document.getElementById('vibe-survivor-modal');
        }
        if (!gameContainer) {
            gameContainer = document.getElementById('game-screen');
        }
        if (!gameContainer) {
            gameContainer = document.body; // Fallback to body
        }
        
        if (gameContainer) {
            gameContainer.appendChild(victoryOverlay);
            console.log('Victory overlay added to:', gameContainer.id || 'body');
        } else {
            console.error('Could not find container for victory overlay');
        }
        
        // Add event listeners with both click and touch support
        const victoryContinueBtn = document.getElementById('victory-continue-btn');
        const victoryRetryBtn = document.getElementById('victory-retry-btn');
        const victoryExitBtn = document.getElementById('victory-exit-btn');
        
        const victoryContinueHandler = (e) => {
            e.preventDefault();
            e.stopPropagation();
            // Reset menu navigation
            this.resetMenuNavigation();
            // Remove overlay
            victoryOverlay.remove();
            style.remove();
            // Continue game with increased difficulty
            this.continueAfterBoss();
        };
        
        const victoryRetryHandler = (e) => {
            e.preventDefault();
            e.stopPropagation();
            // Reset menu navigation
            this.resetMenuNavigation();
            // Remove overlay
            victoryOverlay.remove();
            style.remove();
            // Restart game
            this.startGame();
        };
        
        const victoryExitHandler = (e) => {
            e.preventDefault();
            e.stopPropagation();
            // Reset menu navigation
            this.resetMenuNavigation();
            // Remove overlay
            victoryOverlay.remove();
            style.remove();
            // Close game
            this.closeGame();
        };
        
        // Add both click and touch events for better mobile support
        victoryContinueBtn.addEventListener('click', victoryContinueHandler);
        victoryContinueBtn.addEventListener('touchend', victoryContinueHandler);
        victoryRetryBtn.addEventListener('click', victoryRetryHandler);
        victoryRetryBtn.addEventListener('touchend', victoryRetryHandler);
        victoryExitBtn.addEventListener('click', victoryExitHandler);
        victoryExitBtn.addEventListener('touchend', victoryExitHandler);
        
        // Add menu navigation styles
        this.addMenuNavigationStyles();
        
        // Initialize keyboard navigation for victory buttons
        const victoryButtons = [victoryContinueBtn, victoryRetryBtn, victoryExitBtn];
        this.initializeMenuNavigation('victory', victoryButtons);
        
        // Victory overlay ready
    }
    
    continueAfterBoss() {
        // Resume the game with increased difficulty after beating the boss
        this.gameRunning = true;
        
        // Clear any existing enemies and projectiles for fresh start
        this.enemies = [];
        this.projectiles = [];
        
        // Increment boss progression counters
        this.bossesKilled++;
        this.bossLevel++;
        
        // Spawn the next scaled boss after 10-second delay
        setTimeout(() => {
            this.spawnScaledBoss();
        }, 30000); // 10 seconds
        
        // Increase general game difficulty
        this.waveNumber = Math.max(1, this.waveNumber + 1);
        this.spawnRate = Math.max(0.3, this.spawnRate * 0.9); // Spawn enemies faster
        
        // Restore player to full health as a reward
        this.player.health = this.player.maxHealth;
        
        // Add bonus XP for defeating boss
        this.player.xp += 50;
        this.checkLevelUp();
        
        // Boss defeat notification already shown during animation
        
        // Resume game loop
        this.gameLoop();
    }
    
    restartGame() {
        this.startGame();
    }
    

    closeGame() {
        console.log('🔄 Closing Vibe Survivor - Refreshing page for clean reset...');
        
        // Stop game immediately to prevent any lingering processes
        this.gameRunning = false;
        this.isPaused = false;
        
        // Cancel any running game loop
        if (this.gameLoopId) {
            cancelAnimationFrame(this.gameLoopId);
            this.gameLoopId = null;
        }
        
        // Stop background music immediately
        try {
            this.backgroundMusic.pause();
            this.backgroundMusic.currentTime = 0;
        } catch (e) {
            console.warn('Could not stop background music:', e);
        }
        
        // Hide game UI immediately for smooth visual transition
        const container = document.getElementById('vibe-survivor-container');
        if (container) {
            container.classList.add('vibe-survivor-hidden');
        }
        
        // Remove game modal class
        document.body.classList.remove('game-modal-open');
        
        // Brief delay to allow final cleanup, then refresh
        setTimeout(() => {
            console.log('🔄 Refreshing page for complete reset...');
            window.location.reload();
        }, 200);
    }
    
    reopenGame() {
        const modal = document.getElementById('vibe-survivor-modal');
        if (modal) {
            modal.style.display = 'flex';
        }
        
        const container = document.getElementById('vibe-survivor-container');
        if (container) {
            container.classList.remove('vibe-survivor-hidden');
        }
        
        // Force show start screen and hide all others
        document.querySelectorAll('.vibe-survivor-screen').forEach(screen => screen.classList.remove('active'));
        const startScreen = document.getElementById('survivor-start-overlay');
        if (startScreen) {
            startScreen.classList.add('active');
            
            // Re-attach start button event listener
            const startBtn = document.getElementById('start-survivor');
            if (startBtn) {
                startBtn.addEventListener('click', () => {
                    console.log('Start button clicked');
                    this.startGame();
                });
            }
            
            console.log('Start screen recreated and activated');
            console.log('Start screen HTML length:', startScreen.innerHTML.length);
        } else {
            console.error('Start screen element not found');
        }
        
        console.log('Game reopened and showing start screen');
    }
    
    
    cleanRestart() {
        console.log('Executing clean restart...');
        
        // Reset all game state
        this.resetGame();
        
        // Remove any existing modals to prevent conflicts
        const existingModals = document.querySelectorAll('#vibe-survivor-modal, [id*="fresh-game-over"]');
        existingModals.forEach(modal => modal.remove());
        
        // Create fresh modal structure
        this.createGameModal();
        
        // Start the game directly - no intermediate screens
        setTimeout(() => {
            console.log('Starting fresh game after clean restart...');
            this.startGame();
        }, 200);
    }
    
    cleanExit() {
        console.log('Executing clean exit...');
        
        // Restore body scrolling behavior
        this.restoreBackgroundScrolling();
        
        // Reset all game state completely
        this.resetGame();
        
        // Clean up canvas layers
        this.cleanupCanvasLayers();
        
        // Remove all vibe-survivor specific elements only
        const existingModals = document.querySelectorAll('#vibe-survivor-modal, [id*="fresh-game-over"], .vibe-survivor-modal, .vibe-survivor-container, [class*="vibe-survivor-"]');
        existingModals.forEach(modal => {
            if (modal.id !== 'vibe-survivor-btn') { // Preserve the main launch button
                modal.remove();
            }
        });
        
        
        // Notify Game Manager that we've exited
        if (window.gameManager && window.gameManager.currentGame === 'vibe-survivor') {
            window.gameManager.currentGame = null;
            // Notified Game Manager
        }
        
        // Game state fully reset
    }
}

// Initialize when ready - prevent multiple instances
// VibeSurvivor class defined

// Prevent multiple instances
if (window.vibeSurvivor) {
    // VibeSurvivor already exists
} else {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            // Creating VibeSurvivor instance
            if (!window.vibeSurvivor) {
                window.vibeSurvivor = new VibeSurvivor();
                // VibeSurvivor instance created
            }
        });
    } else {
        // Creating VibeSurvivor instance
        setTimeout(() => {
            if (!window.vibeSurvivor) {
                window.vibeSurvivor = new VibeSurvivor();
                // VibeSurvivor instance created
            }
        }, 200);
    }
}