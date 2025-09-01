// Enhanced Vibe Survivor Game with Multiple Weapons and Choice System
class VibeSurvivor {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.gameTime = 0;
        this.gameRunning = false;
        this.keys = {};
        
        // Player properties - start at world center
        this.player = {
            x: 0,
            y: 0,
            radius: 15,
            speed: 3,
            health: 100,
            maxHealth: 100,
            xp: 0,
            level: 1,
            glow: 0,
            invulnerable: 0,
            dashCooldown: 0,
            trail: [],
            passives: {}
        };
        
        // Game properties
        this.enemies = [];
        this.projectiles = [];
        this.particles = [];
        this.xpOrbs = [];
        this.weapons = [{
            type: 'basic',
            level: 1,
            damage: 15,
            fireRate: 30,
            range: 250,
            projectileSpeed: 8,
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
        
        // Initialize speed scaling (will be properly set when canvas is created)
        this.speedScale = 1.0;
        
        // Initialize object pools
        this.initializeProjectilePool();
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
                centerY: 0
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
                    this.ctx = this.canvas.getContext('2d');
                    this.resizeCanvas();
                    // Ensure canvas gets proper dimensions after CSS settles
                    setTimeout(() => {
                        this.resizeCanvas();
                        if (!this.gameRunning) {
                            this.renderStartScreenBackground();
                        }
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
                                
                                <div class="header-time" id="header-time-display">0:00</div>
                                
                                <div class="header-weapons" id="header-weapon-display"></div>
                            </div>
                            
                            <!-- Game Title (shown when not in game) -->
                            <h2 id="game-title">VIBE SURVIVOR</h2>
                            
                            <button id="close-survivor" class="close-btn">×</button>
                        </div>
                        
                        <div id="survivor-start-screen" class="vibe-survivor-screen active">
                            <div class="survivor-title">
                                <h1>VIBE SURVIVOR</h1>
                                <p>Survive the endless waves!</p>
                                <p class="controls-info">Use WASD to move, SPACEBAR to dash</p>
                            </div>
                            <button id="start-survivor" class="survivor-btn primary">START GAME</button>
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
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
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
                top: 0;
                left: 0;
                width: 100%;
                height: 100vh;
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
                width: 90%;
                max-width: 1500px;
                height: calc(95vh - 20px);
                max-height: calc(95vh - 20px);
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
                z-index: 999999 !important;
                pointer-events: auto !important;
                visibility: visible !important;
                opacity: 1 !important;
                background: rgba(0, 20, 40, 0.8);
                min-height: 70px;
                flex-wrap: nowrap;
            }
            
            .header-stats {
                display: flex !important;
                align-items: center;
                gap: 20px;
                flex: 1;
                justify-content: center;
                max-width: 600px;
            }
            
            .header-health, .header-xp {
                display: flex;
                align-items: center;
                gap: 8px;
            }
            
            .header-health-bar, .header-xp-bar {
                width: 80px;
                height: 8px;
                background: rgba(255, 255, 255, 0.2);
                border: 1px solid rgba(255, 255, 255, 0.3);
                border-radius: 4px;
                overflow: hidden;
            }
            
            .header-health-fill {
                height: 100%;
                background: linear-gradient(90deg, #ff4444, #44ff44);
                transition: width 0.3s ease;
                border-radius: 3px;
            }
            
            .header-xp-fill {
                height: 100%;
                background: linear-gradient(90deg, #4444ff, #ffff44);
                transition: width 0.3s ease;
                border-radius: 3px;
            }
            
            .header-health-text, .header-level-text, .header-time {
                color: #00ffff;
                font-size: 14px;
                font-weight: bold;
                text-shadow: 0 0 5px rgba(0, 255, 255, 0.5);
                min-width: 30px;
            }
            
            .header-time {
                font-size: 16px;
                color: #ffff00;
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
            
            /* Ultra-narrow mobile screens */
            @media screen and (max-width: 320px) {
                .vibe-survivor-header {
                    padding: 8px 10px;
                    min-height: 50px;
                    flex-direction: row;
                    align-items: center;
                }
                
                .pause-btn, .close-btn {
                    width: 32px !important;
                    height: 32px !important;
                    font-size: 16px !important;
                }
                
                .header-stats {
                    gap: 8px;
                    max-width: none;
                    flex: 1;
                    justify-content: space-between;
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
                    display: none; /* Hide weapons on ultra-narrow screens */
                }
            }
            
            /* Narrow mobile screens */
            @media screen and (min-width: 321px) and (max-width: 400px) {
                .vibe-survivor-header {
                    padding: 8px 12px;
                    min-height: 55px;
                }
                
                .pause-btn, .close-btn {
                    width: 35px !important;
                    height: 35px !important;
                    font-size: 17px !important;
                }
                
                .header-stats {
                    gap: 10px;
                    max-width: none;
                }
                
                .header-health-bar, .header-xp-bar {
                    width: 45px;
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
            @media screen and (min-width: 401px) and (max-width: 480px) {
                .vibe-survivor-header {
                    padding: 10px 15px;
                    min-height: 60px;
                }
                
                .header-stats {
                    gap: 15px;
                }
                
                .header-health-bar, .header-xp-bar {
                    width: 60px;
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
                border-radius: 50%;
                font-size: 24px;
                font-weight: bold;
                transition: all 0.3s ease;
                position: absolute !important;
                top: 15px !important;
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
                top: 15px !important;
                left: 15px !important;
                z-index: 999999 !important;
                pointer-events: auto !important;
            }
            
            /* Hide pause button initially */
            #pause-btn {
                display: none;
            }

            .vibe-survivor-container {
                height: calc(100% - 70px) !important;
                position: relative !important;
                width: 100% !important;
                display: block !important;
                visibility: visible !important;
                overflow: hidden !important;
                background: transparent;
                margin-top: 70px;
            }

            .vibe-survivor-screen {
                position: absolute;
                top: 0;
                left: 0;
                width: 100% !important;
                height: 100% !important;
                display: none !important;
                align-items: center !important;
                justify-content: center !important;
                flex-direction: column !important;
                z-index: 100 !important;
                background: transparent !important;
                overflow: hidden !important;
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
                text-shadow: 0 0 20px rgba(0, 255, 255, 0.8),
                            0 0 40px rgba(0, 255, 255, 0.5);
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
                background: #000;
                border: 2px solid #00ffff;
                border-radius: 10px;
                box-shadow: 0 0 20px rgba(0, 255, 255, 0.2);
                width: calc(100% - 40px);
                max-width: 760px; /* Performance-optimized max width */
                height: calc(100% - 20px); /* Full container height minus small margin */
                max-width: calc(130%);
                object-fit: contain;
                display: block;
                margin: 10px auto 10px;
            }
            
            /* Ultra-narrow canvas sizing */
            @media screen and (max-width: 320px) {
                #survivor-canvas {
                    width: calc(100% - 16px);
                    height: calc(100% - 16px);
                    max-width: calc(100% - 16px);
                    margin: 8px auto 8px;
                }
            }
            
            /* Narrow mobile canvas sizing */
            @media screen and (min-width: 321px) and (max-width: 400px) {
                #survivor-canvas {
                    width: calc(100% - 18px);
                    height: calc(100% - 18px);
                    max-width: calc(100% - 18px);
                    margin: 9px auto 9px;
                }
            }
            
            /* Standard mobile canvas sizing */
            @media screen and (min-width: 401px) and (max-width: 480px) {
                #survivor-canvas {
                    width: calc(100% - 20px);
                    height: calc(100% - 20px);
                    max-width: calc(100% - 20px);
                    margin: 10px auto 10px;
                }
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
                z-index: 1000;
                box-shadow: 0 0 30px rgba(0, 255, 255, 0.5);
                backdrop-filter: blur(10px);
            }

            .levelup-title {
                text-align: center;
                color: #00ffff;
                font-size: 1.8rem;
                margin-bottom: 20px;
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
                bottom: 40px;
                right: 20px;
                width: 60px;
                height: 60px;
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
                    width: 95%;
                    height: 95%;
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
                    top: 15px !important; 
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
            @media screen and (min-width: 481px) and (max-width: 1024px) {
                .survivor-ui {
                    bottom: 25px;
                    left: 25px;
                    right: 25px;
                    padding: 10px 12px;
                }
                
                .health-bar, .xp-bar {
                    width: 120px;
                }
                
                .time-display {
                    font-size: 16px;
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
            this.startGame();
        });
        
        document.getElementById('restart-survivor').addEventListener('click', () => {
            this.restartGame();
        });
        
        document.getElementById('exit-survivor').addEventListener('click', () => {
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
        
        try {
            this.canvas = document.getElementById('survivor-canvas');
            this.ctx = this.canvas.getContext('2d');
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
            
            // Calculate speed scaling factor to maintain consistent perceived speed
            // Base reference: mobile canvas width (~400px)
            const baseCanvasWidth = 400;
            this.speedScale = Math.max(1.0, this.canvas.width / baseCanvasWidth);
            
            // Update player and enemy speeds based on canvas size
            this.updateSpeedScaling();
            
            // Don't override CSS - let responsive breakpoints handle sizing
            // CSS already handles display: block, margins, and positioning
            
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
    
    updateSpeedScaling() {
        // Apply speed scaling to maintain consistent perceived speed across different canvas sizes
        if (!this.speedScale) this.speedScale = 1.0;
        
        // Base speeds (designed for mobile ~400px width)
        const basePlayerSpeed = 3;
        const baseEnemySpeedMultiplier = 1.0;
        const baseProjectileSpeedMultiplier = 1.0;
        
        // Update player speed
        if (this.player) {
            this.player.speed = basePlayerSpeed * this.speedScale;
        }
        
        // Update existing enemy speeds
        this.enemies.forEach(enemy => {
            if (enemy.baseSpeed === undefined) {
                // Store original speed if not already stored
                enemy.baseSpeed = enemy.speed;
            }
            enemy.speed = enemy.baseSpeed * this.speedScale * baseEnemySpeedMultiplier;
        });
        
        // Update existing projectile speeds
        this.projectiles.forEach(projectile => {
            if (projectile.baseSpeed === undefined && (projectile.vx || projectile.vy)) {
                // Calculate and store base speed from velocity
                projectile.baseSpeed = Math.sqrt(projectile.vx * projectile.vx + projectile.vy * projectile.vy);
            }
            if (projectile.baseSpeed && projectile.baseSpeed > 0) {
                const angle = Math.atan2(projectile.vy, projectile.vx);
                const newSpeed = projectile.baseSpeed * this.speedScale * baseProjectileSpeedMultiplier;
                projectile.vx = Math.cos(angle) * newSpeed;
                projectile.vy = Math.sin(angle) * newSpeed;
            }
        });
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
                stats.style.display = 'none';
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
        const startScreen = document.getElementById('survivor-start-screen');
        if (startScreen) {
            startScreen.classList.add('active');
            
            // Force visibility and override any CSS issues
            startScreen.style.cssText = `
                display: flex !important;
                visibility: visible !important;
                opacity: 1 !important;
                height: 100% !important;
                width: 100% !important;
                position: absolute !important;
                top: 0 !important;
                left: 0 !important;
                z-index: 1000 !important;
                background: transparent !important;
                align-items: center !important;
                justify-content: center !important;
                flex-direction: column !important;
            `;
            
            // Render canvas background now that game screen is visible
            if (this.canvas && this.ctx) {
                requestAnimationFrame(() => {
                    this.renderStartScreenBackground();
                });
            }
            
            console.log('showStartScreen: Start screen activated and forced visible');
            console.log('showStartScreen: Start screen HTML length:', startScreen.innerHTML.length);
            console.log('showStartScreen: First 200 chars:', startScreen.innerHTML.substring(0, 200));
        } else {
            console.error('showStartScreen: Start screen element not found');
        }
    }
    
    startGame() {
        // Starting game with complete reinitialization
        
        // Reset pause state and hide pause menu
        this.isPaused = false;
        const pauseMenu = document.getElementById('pause-menu');
        if (pauseMenu) {
            pauseMenu.style.display = 'none';
        }
        
        // CRITICAL FIX: Hide modal header during gameplay
        this.hideModalHeader();
        
        // CRITICAL FIX: Explicitly hide start screen by clearing inline styles
        const startScreen = document.getElementById('survivor-start-screen');
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
            this.ctx = this.canvas.getContext('2d');
            if (!this.ctx) {
                throw new Error('Could not get canvas context');
            }
            // Canvas ready
            this.resizeCanvas();
        } catch (e) {
            console.error('Canvas initialization failed:', e);
            return;
        }
        
        this.resetGame();
        
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
            speed: 3 * (this.speedScale || 1.0), // Apply speed scaling
            health: 100,
            maxHealth: 100,
            xp: 0,
            level: 1,
            glow: 0,
            invulnerable: 0,
            dashCooldown: 0,
            trail: [],
            passives: {}
        };
        
        // Reset weapons to single basic weapon
        this.weapons = [{
            type: 'basic',
            level: 1,
            damage: 15,
            fireRate: 30,
            range: 250,
            projectileSpeed: 8,
            lastFire: 0
        }];
        
        // Clear arrays
        this.enemies = [];
        this.projectiles = [];
        this.particles = [];
        this.xpOrbs = [];
        this.notifications = [];
        
        this.camera = { x: 0, y: 0 };
    }
    
    gameLoop() {
        if (!this.gameRunning || !this.canvas || !this.ctx) return;
        
        // Only update game state if not paused, but always draw current state
        if (!this.isPaused) {
            this.update();
        }
        this.draw();
        this.updateUI();
        
        this.gameLoopId = requestAnimationFrame(() => this.gameLoop());
    }
    
    update() {
        this.frameCount++;
        this.gameTime = this.frameCount / 60;
        
        this.updatePlayer();
        this.updatePassives();
        this.updateWeapons();
        this.spawnEnemies();
        this.updateEnemies();
        this.updateProjectiles();
        this.updateParticles();
        this.updateXPOrbs();
        this.updateNotifications();
        this.checkCollisions();
        this.checkLevelUp();
        this.updateCamera();
        this.updateScreenShake();
        this.updateExplosions();
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
                // Default forward dash if no direction
                dashY = -dashDistance;
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
        if (this.player.trail.length > 8) {
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
                    this.player.health = Math.min(this.player.maxHealth, this.player.health + 4);
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
            // Pause background music
            if (this.backgroundMusic && !this.backgroundMusic.paused) {
                this.backgroundMusic.pause();
            }
        } else {
            // Update pause button to show pause symbol
            if (pauseBtn) pauseBtn.textContent = '||';
            pauseMenu.style.display = 'none';
            // Resume background music
            if (this.backgroundMusic && this.backgroundMusic.paused) {
                this.backgroundMusic.play().catch(e => {
                    console.warn('Could not resume background music:', e);
                });
            }
        }
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
                                target.closest('.pause-menu');
                                
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
        if (!dashBtn || !this.canvas) return;
        
        const canvas = this.canvas;
        const gameScreen = document.getElementById('game-screen');
        
        if (!gameScreen) return;
        
        // Get current CSS computed values (from responsive breakpoints)
        const buttonStyle = window.getComputedStyle(dashBtn);
        const buttonSize = parseFloat(buttonStyle.width);
        const currentRight = parseFloat(buttonStyle.right);
        const currentBottom = parseFloat(buttonStyle.bottom);
        
        // Get canvas dimensions
        const canvasRect = canvas.getBoundingClientRect();
        const gameScreenRect = gameScreen.getBoundingClientRect();
        
        const buttonMargin = 10; // Small safety margin
        
        // Calculate if button would be outside canvas bounds
        const maxAllowedRight = canvasRect.width - buttonSize - buttonMargin;
        const maxAllowedBottom = canvasRect.height - buttonSize - buttonMargin;
        
        // Only adjust if actually outside bounds (safety check)
        if (currentRight > maxAllowedRight || currentBottom > maxAllowedBottom) {
            const safeRight = Math.min(currentRight, maxAllowedRight);
            const safeBottom = Math.min(currentBottom, maxAllowedBottom);
            
            // Apply minimal adjustment only if needed
            dashBtn.style.right = `${Math.max(safeRight, buttonMargin)}px`;
            dashBtn.style.bottom = `${Math.max(safeBottom, buttonMargin)}px`;
        }
        
        // Otherwise, let CSS responsive breakpoints handle positioning
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
            
            // Position joystick at touch location relative to modal
            const modalRect = gameModal.getBoundingClientRect();
            joystick.style.display = 'block';
            joystick.style.left = `${touch.clientX - modalRect.left - 40}px`; // Center joystick on touch
            joystick.style.top = `${touch.clientY - modalRect.top - 40}px`;
            
            // Add active class for enhanced visuals
            joystick.classList.add('active');
            
        }, { passive: false });
        
        gameModal.addEventListener('touchmove', (e) => {
            if (!this.touchControls.joystick.active) return;
            e.preventDefault();
            
            const touch = e.touches[0];
            const pos = getTouchPos(touch);
            
            const deltaX = pos.x - this.touchControls.joystick.centerX;
            const deltaY = pos.y - this.touchControls.joystick.centerY;
            
            // Limit movement to circle
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            const limitedDistance = Math.min(distance, maxDistance);
            const angle = Math.atan2(deltaY, deltaX);
            
            const limitedX = Math.cos(angle) * limitedDistance;
            const limitedY = Math.sin(angle) * limitedDistance;
            
            // Update handle position relative to joystick center
            handle.style.transform = `translate(calc(-50% + ${limitedX}px), calc(-50% + ${limitedY}px))`;
            
            // Add moving class when joystick is being used
            if (limitedDistance > 5) {
                handle.classList.add('moving');
            } else {
                handle.classList.remove('moving');
            }
            
            // Convert to movement values (-1 to 1)
            this.touchControls.joystick.moveX = limitedX / maxDistance;
            this.touchControls.joystick.moveY = limitedY / maxDistance;
        }, { passive: false });
        
        const endTouch = () => {
            this.touchControls.joystick.active = false;
            this.touchControls.joystick.moveX = 0;
            this.touchControls.joystick.moveY = 0;
            this.touchControls.joystick.visible = false;
            
            // Remove active classes for smooth fade out
            joystick.classList.remove('active');
            handle.classList.remove('moving');
            
            // Hide and reset joystick with smooth transition
            setTimeout(() => {
                joystick.style.display = 'none';
                handle.style.transform = 'translate(-50%, -50%)';
            }, 300); // Match the CSS transition duration
        };
        
        gameModal.addEventListener('touchend', endTouch);
        gameModal.addEventListener('touchcancel', endTouch);
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
                        this.createLightningBolt(weapon, nearestEnemy);
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
                }
            }
        }
    }
    
    createBasicProjectile(weapon, dx, dy, distance) {
        const angle = Math.atan2(dy, dx);
        const projectile = this.getPooledProjectile();
        
        // Calculate scaled projectile speed for consistent gameplay
        const scaledSpeed = weapon.projectileSpeed * (this.speedScale || 1.0);
        
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
        
        const scaledSpeed = weapon.projectileSpeed * (this.speedScale || 1.0);
        
        for (let i = 0; i < spreadCount; i++) {
            const offsetAngle = angle + (i - Math.floor(spreadCount / 2)) * (spreadAngle / spreadCount);
            this.projectiles.push({
                x: this.player.x,
                y: this.player.y,
                vx: Math.cos(offsetAngle) * scaledSpeed,
                vy: Math.sin(offsetAngle) * scaledSpeed,
                baseSpeed: weapon.projectileSpeed,
                damage: weapon.damage * 0.8,
                life: 100,
                type: 'spread',
                color: '#E67E22',
                size: 2.5
            });
        }
    }
    
    createLaserBeam(weapon, dx, dy, distance) {
        const angle = Math.atan2(dy, dx);
        this.projectiles.push({
            x: this.player.x,
            y: this.player.y,
            vx: Math.cos(angle) * weapon.projectileSpeed * 2,
            vy: Math.sin(angle) * weapon.projectileSpeed * 2,
            damage: weapon.damage,
            life: 60,
            type: 'laser',
            color: '#E74C3C',
            size: 2,
            piercing: true
        });
    }
    
    createPlasmaProjectile(weapon, dx, dy, distance) {
        const angle = Math.atan2(dy, dx);
        this.projectiles.push({
            x: this.player.x,
            y: this.player.y,
            vx: Math.cos(angle) * weapon.projectileSpeed,
            vy: Math.sin(angle) * weapon.projectileSpeed,
            damage: weapon.damage,
            life: 150,
            type: 'plasma',
            color: '#3498DB',
            size: 4,
            explosionRadius: 50
        });
    }
    
    createShotgunBlast(weapon, dx, dy, distance) {
        const angle = Math.atan2(dy, dx);
        const pelletCount = 5 + Math.floor(weapon.level / 2);
        
        for (let i = 0; i < pelletCount; i++) {
            const spreadAngle = (Math.random() - 0.5) * Math.PI / 4; // Random spread
            const shotAngle = angle + spreadAngle;
            const speed = weapon.projectileSpeed * (0.8 + Math.random() * 0.4);
            
            this.projectiles.push({
                x: this.player.x,
                y: this.player.y,
                vx: Math.cos(shotAngle) * speed,
                vy: Math.sin(shotAngle) * speed,
                damage: weapon.damage * 0.6,
                life: 80,
                type: 'shotgun',
                color: '#F39C12',
                size: 2
            });
        }
    }
    
    createLightningBolt(weapon, targetEnemy) {
        const hitEnemies = new Set();
        let currentTarget = targetEnemy;
        let chainCount = 0;
        const maxChains = 2 + Math.floor(weapon.level / 2);
        
        while (currentTarget && chainCount < maxChains) {
            hitEnemies.add(currentTarget);
            currentTarget.health -= weapon.damage;
            
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
        
        this.projectiles.push({
            x: this.player.x,
            y: this.player.y,
            targetX: targetEnemy.x,
            targetY: targetEnemy.y,
            damage: weapon.damage,
            life: 30,
            type: 'lightning',
            color: '#F1C40F',
            chainCount: chainCount
        });
    }
    
    createFlameStream(weapon, dx, dy, distance) {
        const angle = Math.atan2(dy, dx);
        const flameCount = 3;
        
        for (let i = 0; i < flameCount; i++) {
            const offsetAngle = angle + (Math.random() - 0.5) * 0.3;
            const speed = weapon.projectileSpeed * (0.7 + Math.random() * 0.6);
            
            this.projectiles.push({
                x: this.player.x,
                y: this.player.y,
                vx: Math.cos(offsetAngle) * speed,
                vy: Math.sin(offsetAngle) * speed,
                damage: weapon.damage * 0.4,
                life: 90,
                type: 'flame',
                color: '#E74C3C',
                size: 3 + Math.random() * 2,
                dotDamage: weapon.damage * 0.1
            });
        }
    }
    
    createRailgunBeam(weapon, dx, dy, distance) {
        const angle = Math.atan2(dy, dx);
        this.projectiles.push({
            x: this.player.x,
            y: this.player.y,
            vx: Math.cos(angle) * weapon.projectileSpeed * 3,
            vy: Math.sin(angle) * weapon.projectileSpeed * 3,
            damage: weapon.damage,
            life: 45,
            type: 'railgun',
            color: '#9B59B6',
            size: 1,
            piercing: 999
        });
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
        const projectile = this.getPooledProjectile();
        
        // Set projectile properties
        projectile.x = this.player.x;
        projectile.y = this.player.y;
        projectile.vx = 0;
        projectile.vy = 0;
        projectile.targetEnemy = targetEnemy; // Store reference to enemy, not just position
        projectile.targetX = targetEnemy.x;
        projectile.targetY = targetEnemy.y;
        projectile.damage = weapon.damage;
        projectile.life = 180;
        projectile.type = 'missile';
        projectile.color = '#E67E22';
        projectile.size = 3;
        projectile.homing = true;
        projectile.explosionRadius = 60;
        projectile.speed = (weapon.projectileSpeed || 3) * (this.speedScale || 1.0);
        projectile.baseSpeed = weapon.projectileSpeed || 3;
        
        this.projectiles.push(projectile);
    }
    
    createBossMissile(boss) {
        // Boss fires 3 missiles in a spread pattern
        const angleToPlayer = Math.atan2(this.player.y - boss.y, this.player.x - boss.x);
        const spreadAngles = [-0.3, 0, 0.3]; // 3 missiles with spread
        
        spreadAngles.forEach(angleOffset => {
            const missile = {
                x: boss.x,
                y: boss.y,
                vx: Math.cos(angleToPlayer + angleOffset) * 3,
                vy: Math.sin(angleToPlayer + angleOffset) * 3,
                damage: 25, // Boss missiles do significant damage
                life: 300, // Long-lived missiles
                type: 'boss-missile',
                color: '#FF0066', // Distinctive boss missile color
                size: 4,
                homing: true,
                homingStrength: 0.05, // Moderate homing for fair gameplay
                explosionRadius: 40,
                speed: 3,
                owner: 'enemy' // Important: mark as enemy projectile
            };
            this.projectiles.push(missile);
        });
    }
    
    spawnEnemies() {
        this.frameCount++;
        
        // Performance limit: maximum number of enemies on screen
        const maxEnemies = 30; // Reduced for better desktop performance
        
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
        const spawnDistance = 600; // Distance from player to spawn enemies
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
        
        // Calculate scaled speed for consistent gameplay across canvas sizes
        const baseSpeed = config.speed * (1 + Math.floor(this.gameTime / 60) * 0.1);
        const scaledSpeed = baseSpeed * (this.speedScale || 1.0);
        
        this.enemies.push({
            x: x,
            y: y,
            radius: config.radius,
            speed: scaledSpeed,
            baseSpeed: baseSpeed, // Store base speed for future scaling updates
            maxHealth: config.health * (1 + Math.floor(this.gameTime / 30) * 0.3),
            health: config.health * (1 + Math.floor(this.gameTime / 30) * 0.3),
            contactDamage: config.contactDamage,
            color: config.color,
            behavior: config.behavior,
            angle: 0,
            rotSpeed: 0.05,
            specialCooldown: 0,
            burning: null,
            spawnedMinions: false
        });
        
        // Show boss notification when boss is spawned
        if (config.behavior === 'boss') {
            this.showBossNotification();
        }
    }
    
    spawnBoss() {
        // Spawn boss at a specific distance from player
        const spawnDistance = 400;
        const angle = Math.random() * Math.PI * 2;
        const x = this.player.x + Math.cos(angle) * spawnDistance;
        const y = this.player.y + Math.sin(angle) * spawnDistance;
        
        const config = this.getEnemyConfig('boss');
        const scaledSpeed = config.speed * (this.speedScale || 1.0);
        
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
            spawnedMinions: false
        });
        
        // Show boss notification
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
                speed: 1.0,
                contactDamage: 10,
                color: '#E74C3C',
                behavior: 'chase'
            },
            fast: {
                radius: 8,
                health: 12,
                speed: 2.0,
                contactDamage: 8,
                color: '#F39C12',
                behavior: 'dodge'
            },
            tank: {
                radius: 15,
                health: 80,
                speed: 0.5,
                contactDamage: 20,
                color: '#34495E',
                behavior: 'tank'
            },
            flyer: {
                radius: 12,
                health: 25,
                speed: 1.5,
                contactDamage: 12,
                color: '#3498DB',
                behavior: 'fly'
            },
            phantom: {
                radius: 9,
                health: 15,
                speed: 1.0,
                contactDamage: 2,
                color: '#9b59b6',
                behavior: 'teleport'
            },
            boss: {
                radius: 30,
                health: 500,
                speed: 0.8,
                contactDamage: 50,
                color: '#ff0066',
                behavior: 'boss'
            }
        };
        
        return configs[type] || configs.basic;
    }
    
    updateEnemies() {
        this.enemies.forEach((enemy, index) => {
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
                        // Keep boss within bounds
                        enemy.x = Math.max(enemy.radius, Math.min(this.canvas.width - enemy.radius, enemy.x));
                        enemy.y = Math.max(enemy.radius, Math.min(this.canvas.height - enemy.radius, enemy.y));
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
                        // Keep boss within bounds for phase 2
                        enemy.x = Math.max(enemy.radius, Math.min(this.canvas.width - enemy.radius, enemy.x));
                        enemy.y = Math.max(enemy.radius, Math.min(this.canvas.height - enemy.radius, enemy.y));
                    }
                    // Phase 3: Aggressive and teleport (below 30% health)
                    else {
                        const dx = this.player.x - enemy.x;
                        const dy = this.player.y - enemy.y;
                        const distance = Math.sqrt(dx * dx + dy * dy);
                        
                        // Random chance to teleport closer to player
                        if (Math.random() < 0.02) { // 2% chance per frame
                            const teleportDistance = 100 + Math.random() * 100;
                            const angle = Math.atan2(dy, dx);
                            enemy.x = this.player.x - Math.cos(angle) * teleportDistance;
                            enemy.y = this.player.y - Math.sin(angle) * teleportDistance;
                            
                            // Keep boss within canvas bounds
                            enemy.x = Math.max(enemy.size, Math.min(this.canvas.width - enemy.size, enemy.x));
                            enemy.y = Math.max(enemy.size, Math.min(this.canvas.height - enemy.size, enemy.y));
                        } else {
                            // Aggressive chase
                            if (distance > 0) {
                                enemy.x += (dx / distance) * enemy.speed * 2;
                                enemy.y += (dy / distance) * enemy.speed * 2;
                            }
                            // Keep boss within bounds for phase 3 aggressive chase
                            enemy.x = Math.max(enemy.radius, Math.min(this.canvas.width - enemy.radius, enemy.x));
                            enemy.y = Math.max(enemy.radius, Math.min(this.canvas.height - enemy.radius, enemy.y));
                        }
                    }
                    
                    // Boss missile attack every 4 seconds (240 frames at 60fps)
                    if (!enemy.lastMissileFrame || this.frameCount - enemy.lastMissileFrame > 240) {
                        enemy.lastMissileFrame = this.frameCount;
                        this.createBossMissile(enemy);
                    }
                    break;
            }
            
            if (enemy.specialCooldown > 0) {
                enemy.specialCooldown--;
            }
            
            enemy.angle += enemy.rotSpeed;
            
            // Remove dead enemies
            if (enemy.health <= 0) {
                // Check if this was a boss enemy
                if (enemy.behavior === 'boss') {
                    // Remove boss from enemies array first
                    this.enemies.splice(index, 1);
                    this.bossDefeated();
                    return; // Exit early, bossDefeated handles the rest
                }
                
                this.createXPOrb(enemy.x, enemy.y);
                this.createDeathParticles(enemy.x, enemy.y, enemy.color);
                this.enemies.splice(index, 1);
            } else {
                // Remove enemies that are too far from player (performance optimization)
                const dx = enemy.x - this.player.x;
                const dy = enemy.y - this.player.y;
                const distanceFromPlayer = Math.sqrt(dx * dx + dy * dy);
                
                if (distanceFromPlayer > 1200) { // Remove enemies beyond this distance
                    this.enemies.splice(index, 1);
                }
            }
        });
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
                angle: 0,
                rotSpeed: 0.1,
                specialCooldown: 0,
                burning: null,
                spawnedMinions: false
            });
        }
    }
    
    updateProjectiles() {
        this.projectiles.forEach((projectile, index) => {
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
                    
                case 'lightning':
                    // Lightning bolts don't move, they just display and fade
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
            
            if (projectile.life <= 0 || distanceFromPlayer > 800) {
                    
                if (projectile.type === 'missile' && projectile.explosionRadius) {
                    this.createExplosion(projectile.x, projectile.y, projectile.explosionRadius, projectile.damage * 0.7);
                }
                
                // Return projectile to pool instead of just removing it
                this.returnProjectileToPool(projectile);
                this.projectiles.splice(index, 1);
            }
        });
    }
    
    updateParticles() {
        // Particles completely removed for performance
    }
    
    updateXPOrbs() {
        this.xpOrbs.forEach((orb, index) => {
            const dx = this.player.x - orb.x;
            const dy = this.player.y - orb.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Magnet effect
            const magnetRange = this.player.passives.magnet ? 80 : 40;
            if (distance < magnetRange) {
                orb.x += (dx / distance) * 2;
                orb.y += (dy / distance) * 2;
            }
            
            orb.glow = (orb.glow + 0.2) % (Math.PI * 2);
            
            // Collect orb
            if (distance < 15) {
                this.player.xp += orb.value;
                this.xpOrbs.splice(index, 1);
            } else if (orb.life-- <= 0) {
                this.xpOrbs.splice(index, 1);
            }
        });
    }
    
    createXPOrb(x, y) {
        this.xpOrbs.push({
            x: x,
            y: y,
            value: 1,
            life: 1800, // 30 seconds
            glow: 0
        });
    }
    
    updateNotifications() {
        this.notifications.forEach((notification, index) => {
            notification.y -= 1;
            notification.alpha = notification.life / notification.maxLife;
            notification.life--;
            
            if (notification.life <= 0) {
                this.notifications.splice(index, 1);
            }
        });
    }
    
    checkLevelUp() {
        const xpRequired = this.player.level * 5 + 10;
        if (this.player.xp >= xpRequired) {
            this.player.xp -= xpRequired;
            this.player.level++;
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
        if (this.weapons.length < 3) {
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
            'basic': 'Magic Missile',
            'rapid': 'Rapid Fire',
            'spread': 'Spread Shot',
            'spread_shot': 'Spread Shot',
            'laser': 'Laser Beam',
            'plasma': 'Plasma Bolt',
            'shotgun': 'Shotgun',
            'lightning': 'Lightning',
            'flamethrower': 'Flamethrower',
            'railgun': 'Railgun',
            'missiles': 'Homing Missiles'
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
            'missiles': 'Homing missiles with explosive damage'
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
        
        // Add event listeners to choices
        choices.forEach((choice, index) => {
            document.querySelector(`[data-choice="${index}"]`).addEventListener('click', () => {
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
                overflow-y: auto;
                overflow-x: hidden;
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
                    gap: 20px !important;
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
            'missiles': { damage: 35, fireRate: 120, range: 400, projectileSpeed: 5, homing: true, explosionRadius: 60 }
        };
        
        const config = weaponConfigs[weaponType];
        this.weapons.push({
            type: weaponType,
            level: 1,
            lastFire: 0,
            ...config
        });
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
        // Optimized collision detection with distance pre-screening
        this.projectiles.forEach((projectile, pIndex) => {
            let projectileHit = false;
            let hitCount = 0;
            const maxHits = projectile.piercing || 1;
            
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
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < enemy.radius + (projectile.size || 3) && hitCount < maxHits) {
                    hitCount++;
                    let damage = projectile.damage;
                    
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
                    
                    if (!['laser', 'railgun'].includes(projectile.type) || hitCount >= maxHits) {
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
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < this.player.radius + enemy.radius && !this.player.invulnerable) {
                let damage = enemy.contactDamage;
                
                // Armor reduction
                if (this.player.passives.armor) {
                    damage = Math.floor(damage * 0.85);
                }
                
                this.player.health -= damage;
                this.player.invulnerable = 60;
                this.createHitParticles(this.player.x, this.player.y, '#ff0000');
                
                if (this.player.health <= 0) {
                    this.gameOver();
                }
            }
        });
        
        // Check enemy projectiles hitting player
        this.projectiles.forEach((projectile, pIndex) => {
            if (projectile.owner === 'enemy') {
                const dx = projectile.x - this.player.x;
                const dy = projectile.y - this.player.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < this.player.radius + (projectile.size || 3)) {
                    // Player hit by enemy projectile
                    this.player.health -= projectile.damage;
                    
                    // Create explosion if projectile has explosion radius
                    if (projectile.explosionRadius) {
                        this.createExplosion(projectile.x, projectile.y, projectile.explosionRadius, projectile.damage * 0.5);
                        // Create screen shake effect
                        this.createScreenShake(8);
                    }
                    
                    // Remove the projectile
                    this.projectiles.splice(pIndex, 1);
                    
                    // Check for game over
                    if (this.player.health <= 0) {
                        this.gameOver();
                    }
                }
            }
        });
    }
    
    createExplosion(x, y, radius, damage) {
        // Create visual explosion effect
        if (!this.explosions) this.explosions = [];
        
        this.explosions.push({
            x: x,
            y: y,
            radius: 0,
            maxRadius: radius,
            life: 30,
            maxLife: 30,
            color: '#FF6600'
        });
        
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
    
    updateExplosions() {
        if (!this.explosions) return;
        
        this.explosions.forEach((explosion, index) => {
            // Expand the explosion radius over time
            const progress = 1 - (explosion.life / explosion.maxLife);
            explosion.radius = explosion.maxRadius * progress;
            
            explosion.life--;
            
            if (explosion.life <= 0) {
                this.explosions.splice(index, 1);
            }
        });
    }
    
    createDeathParticles(x, y, color) {
        // Particles removed for performance
    }
    
    showUpgradeNotification(title) {
        this.notifications.push({
            message: `${title} ACQUIRED!`,
            x: this.player.x,
            y: this.player.y - 30, // Slightly above the player
            life: 120,
            maxLife: 120,
            alpha: 1
        });
    }
    
    showBossNotification() {
        this.notifications.push({
            message: "⚠️ BOSS APPEARED! ⚠️",
            x: this.player.x,
            y: this.player.y - 50, // Higher above the player for boss warning
            life: 180, // Show longer than regular notifications
            maxLife: 180,
            alpha: 1
        });
    }
    
    updateCamera() {
        // Smooth camera following the player
        const targetX = this.player.x - this.canvas.width / 2;
        const targetY = this.player.y - this.canvas.height / 2;
        
        // Smooth camera movement (lerp)
        const lerpFactor = 0.05;
        this.camera.x += (targetX - this.camera.x) * lerpFactor;
        this.camera.y += (targetY - this.camera.y) * lerpFactor;
    }

    
    // Performance optimization: Check if object is visible on screen
    isInViewport(x, y, radius = 0) {
        if (!this.canvas) return true; // Fallback to render everything if no canvas
        
        const buffer = 50; // Small buffer to prevent pop-in effects
        const left = this.camera.x - buffer;
        const right = this.camera.x + this.canvas.width + buffer;
        const top = this.camera.y - buffer;
        const bottom = this.camera.y + this.canvas.height + buffer;
        
        return (x + radius > left && 
                x - radius < right && 
                y + radius > top && 
                y - radius < bottom);
    }


    
    // Object pooling for projectiles
    initializeProjectilePool() {
        this.projectilePool = [];
        this.poolSize = 100; // Pre-allocate 100 projectiles
        
        // Pre-create projectiles
        for (let i = 0; i < this.poolSize; i++) {
            this.projectilePool.push({
                x: 0, y: 0, vx: 0, vy: 0,
                damage: 0, speed: 0, life: 0,
                size: 3, color: '#ffffff',
                type: 'basic', active: false
            });
        }
    }
    
    // Get projectile from pool
    getPooledProjectile() {
        for (let i = 0; i < this.projectilePool.length; i++) {
            if (!this.projectilePool[i].active) {
                this.projectilePool[i].active = true;
                return this.projectilePool[i];
            }
        }
        
        // If no available projectile in pool, create a new one
        const newProjectile = {
            x: 0, y: 0, vx: 0, vy: 0,
            damage: 0, speed: 0, life: 0,
            size: 3, color: '#ffffff',
            type: 'basic', active: true
        };
        this.projectilePool.push(newProjectile);
        return newProjectile;
    }
    
    // Return projectile to pool
    returnProjectileToPool(projectile) {
        projectile.active = false;
        // Reset properties
        projectile.x = 0;
        projectile.y = 0;
        projectile.vx = 0;
        projectile.vy = 0;
        projectile.life = 0;
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
        
        // Clear canvas with dark background
        this.ctx.fillStyle = '#0a0a0a';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Apply camera transformation with screen shake
        this.ctx.save();
        let shakeX = 0, shakeY = 0;
        if (this.screenShake) {
            shakeX = this.screenShake.x;
            shakeY = this.screenShake.y;
        }
        this.ctx.translate(-this.camera.x + shakeX, -this.camera.y + shakeY);
        
        this.drawGrid();
        this.drawPlayer();
        this.drawEnemies();
        this.drawProjectiles();
        this.drawXPOrbs();
        this.drawExplosions();
        this.drawParticles();
        this.drawNotifications();
        
        // Restore transformation
        this.ctx.restore();
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
    // Set grid styling with light gray color
    this.ctx.strokeStyle = 'rgba(200, 200, 200, 0.3)';
    this.ctx.lineWidth = 1;
    
    const gridSize = 60;
    
    // Calculate visible world area based on camera position, ensuring full canvas coverage
    const halfCanvasWidth = this.canvas.width / 1;
    const halfCanvasHeight = this.canvas.height / 1;
    
    // Calculate grid bounds to ensure complete canvas coverage with extra margin
    const margin = gridSize * 10;
    const startX = Math.floor((this.camera.x - halfCanvasWidth - margin) / gridSize) * gridSize;
    const endX = Math.ceil((this.camera.x + halfCanvasWidth + margin) / gridSize) * gridSize;
    const startY = Math.floor((this.camera.y - halfCanvasHeight - margin) / gridSize) * gridSize;
    const endY = Math.ceil((this.camera.y + halfCanvasHeight + margin) / gridSize) * gridSize;
    
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
        
        // Draw trail with neon cyan segments
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
        this.enemies.forEach(enemy => {
            // Frustum culling: Only render enemies visible on screen
            if (!this.isInViewport(enemy.x, enemy.y, enemy.radius)) {
                return; // Skip rendering this enemy
            }
            // Cache context transformations for performance
            this.ctx.save();
            this.ctx.translate(enemy.x, enemy.y);
            this.ctx.rotate(enemy.angle);
            
            // Define neon colors based on enemy type
            let enemyColor, glowColor;
            switch (enemy.behavior) {
                case 'tank':
                    enemyColor = '#ff0040'; // Neon red
                    glowColor = '#ff0040';
                    break;
                case 'flyer':
                    enemyColor = '#0080ff'; // Neon blue
                    glowColor = '#0080ff';
                    break;
                case 'phantom':
                    enemyColor = '#ffff00'; // Neon yellow (dodging enemy)
                    glowColor = '#ffff00';
                    break;
                case 'boss':
                    enemyColor = '#00ff80'; // Neon green
                    glowColor = '#00ff80';
                    break;
                default:
                    // Differentiate by enemy size - smallest gets yellow (dodge ability), larger gets pink
                    if (enemy.radius <= 8) {
                        enemyColor = '#ffff00'; // Yellow neon (smallest, dodge ability)
                        glowColor = '#ffff00';
                    } else {
                        enemyColor = '#ff00ff'; // Pink neon (larger default)
                        glowColor = '#ff00ff';
                    }
                    break;
            }
            
            // Enemy glow effect
            const gradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, enemy.radius * 2);
            gradient.addColorStop(0, enemyColor + '40');
            gradient.addColorStop(1, enemyColor + '00');
            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(-enemy.radius * 2, -enemy.radius * 2, enemy.radius * 4, enemy.radius * 4);
            
            // Neon wireframe styling
            this.ctx.shadowBlur = 20;
            this.ctx.shadowColor = enemyColor;
            this.ctx.strokeStyle = enemyColor;
            this.ctx.lineWidth = 2;
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
            
            // Different wireframe shapes for different enemy types
            switch (enemy.behavior) {
                case 'tank':
                    // Wireframe square
                    this.ctx.strokeRect(-enemy.radius, -enemy.radius, enemy.radius * 2, enemy.radius * 2);
                    
                    // Inner grid pattern
                    this.ctx.strokeStyle = enemyColor + '80';
                    this.ctx.lineWidth = 1;
                    for (let i = -enemy.radius + 10; i < enemy.radius; i += 10) {
                        this.ctx.beginPath();
                        this.ctx.moveTo(i, -enemy.radius);
                        this.ctx.lineTo(i, enemy.radius);
                        this.ctx.stroke();
                        
                        this.ctx.beginPath();
                        this.ctx.moveTo(-enemy.radius, i);
                        this.ctx.lineTo(enemy.radius, i);
                        this.ctx.stroke();
                    }
                    break;
                    
                case 'flyer':
                    // Wireframe triangle
                    this.ctx.beginPath();
                    this.ctx.moveTo(0, -enemy.radius);
                    this.ctx.lineTo(enemy.radius, enemy.radius);
                    this.ctx.lineTo(-enemy.radius, enemy.radius);
                    this.ctx.closePath();
                    this.ctx.stroke();
                    
                    // Inner wireframe lines
                    this.ctx.strokeStyle = enemyColor + '80';
                    this.ctx.lineWidth = 1;
                    this.ctx.beginPath();
                    this.ctx.moveTo(0, -enemy.radius / 2);
                    this.ctx.lineTo(enemy.radius / 2, enemy.radius / 2);
                    this.ctx.lineTo(-enemy.radius / 2, enemy.radius / 2);
                    this.ctx.closePath();
                    this.ctx.stroke();
                    
                    // Center lines
                    this.ctx.beginPath();
                    this.ctx.moveTo(0, -enemy.radius);
                    this.ctx.lineTo(0, enemy.radius / 3);
                    this.ctx.stroke();
                    break;
                    
                case 'phantom':
                    this.ctx.globalAlpha = 0.7;
                    // Wireframe hexagon with animation
                    this.ctx.beginPath();
                    for (let i = 0; i < 6; i++) {
                        const angle = (Math.PI * 2 * i) / 6;
                        const radius = enemy.radius + Math.sin(this.frameCount * 0.1 + i) * 2;
                        const x = Math.cos(angle) * radius;
                        const y = Math.sin(angle) * radius;
                        if (i === 0) {
                            this.ctx.moveTo(x, y);
                        } else {
                            this.ctx.lineTo(x, y);
                        }
                    }
                    this.ctx.closePath();
                    this.ctx.stroke();
                    
                    // Inner hexagon pattern
                    this.ctx.strokeStyle = enemyColor + '60';
                    this.ctx.lineWidth = 1;
                    this.ctx.beginPath();
                    for (let i = 0; i < 6; i++) {
                        const angle = (Math.PI * 2 * i) / 6;
                        const radius = enemy.radius * 0.5;
                        const x = Math.cos(angle) * radius;
                        const y = Math.sin(angle) * radius;
                        if (i === 0) {
                            this.ctx.moveTo(x, y);
                        } else {
                            this.ctx.lineTo(x, y);
                        }
                    }
                    this.ctx.closePath();
                    this.ctx.stroke();
                    break;
                    
                case 'boss':
                    // Large octagon wireframe for boss
                    this.ctx.lineWidth = 3;
                    this.ctx.beginPath();
                    for (let i = 0; i < 8; i++) {
                        const angle = (Math.PI * 2 * i) / 8;
                        const radius = enemy.radius;
                        const x = Math.cos(angle) * radius;
                        const y = Math.sin(angle) * radius;
                        if (i === 0) {
                            this.ctx.moveTo(x, y);
                        } else {
                            this.ctx.lineTo(x, y);
                        }
                    }
                    this.ctx.closePath();
                    this.ctx.stroke();
                    
                    // Inner cross pattern
                    this.ctx.strokeStyle = enemyColor + '80';
                    this.ctx.lineWidth = 2;
                    this.ctx.beginPath();
                    this.ctx.moveTo(-enemy.radius, 0);
                    this.ctx.lineTo(enemy.radius, 0);
                    this.ctx.moveTo(0, -enemy.radius);
                    this.ctx.lineTo(0, enemy.radius);
                    this.ctx.moveTo(-enemy.radius * 0.7, -enemy.radius * 0.7);
                    this.ctx.lineTo(enemy.radius * 0.7, enemy.radius * 0.7);
                    this.ctx.moveTo(-enemy.radius * 0.7, enemy.radius * 0.7);
                    this.ctx.lineTo(enemy.radius * 0.7, -enemy.radius * 0.7);
                    this.ctx.stroke();
                    break;
                    
                default:
                    // Wireframe circle
                    this.ctx.beginPath();
                    this.ctx.arc(0, 0, enemy.radius, 0, Math.PI * 2);
                    this.ctx.stroke();
                    
                    // Inner circle grid
                    this.ctx.strokeStyle = enemyColor + '80';
                    this.ctx.lineWidth = 1;
                    this.ctx.beginPath();
                    this.ctx.arc(0, 0, enemy.radius * 0.6, 0, Math.PI * 2);
                    this.ctx.stroke();
                    
                    // Cross lines
                    this.ctx.beginPath();
                    this.ctx.moveTo(-enemy.radius, 0);
                    this.ctx.lineTo(enemy.radius, 0);
                    this.ctx.moveTo(0, -enemy.radius);
                    this.ctx.lineTo(0, enemy.radius);
                    this.ctx.stroke();
                    break;
            }
            
            // Health bar with neon styling
            if (enemy.health < enemy.maxHealth) {
                const barWidth = enemy.radius * 2;
                const barHeight = 3;
                const healthPercent = enemy.health / enemy.maxHealth;
                
                this.ctx.fillStyle = '#333';
                this.ctx.fillRect(-barWidth / 2, -enemy.radius - 8, barWidth, barHeight);
                
                this.ctx.fillStyle = healthPercent > 0.5 ? '#00ff00' : healthPercent > 0.25 ? '#ffff00' : '#ff0000';
                this.ctx.shadowBlur = 10;
                this.ctx.shadowColor = this.ctx.fillStyle;
                this.ctx.fillRect(-barWidth / 2, -enemy.radius - 8, barWidth * healthPercent, barHeight);
            }
            
            // Burning effect with neon style
            if (enemy.burning) {
                this.ctx.globalAlpha = 0.8;
                this.ctx.fillStyle = '#ff6600';
                this.ctx.shadowBlur = 15;
                this.ctx.shadowColor = '#ff6600';
                for (let i = 0; i < 3; i++) {
                    const x = (Math.random() - 0.5) * enemy.radius;
                    const y = (Math.random() - 0.5) * enemy.radius;
                    this.ctx.fillRect(x, y, 2, 4);
                }
            }
            
            this.ctx.restore();
        });
    }
    
    drawProjectiles() {
        this.projectiles.forEach(projectile => {
            // Frustum culling: Only render projectiles visible on screen
            if (!this.isInViewport(projectile.x, projectile.y, projectile.size || 3)) {
                return; // Skip rendering this projectile
            }
            this.ctx.save();
            
            switch (projectile.type) {
                case 'basic':
                case 'spread':
                case 'shotgun':
                    this.ctx.fillStyle = projectile.color;
                    this.ctx.beginPath();
                    this.ctx.arc(projectile.x, projectile.y, projectile.size, 0, Math.PI * 2);
                    this.ctx.fill();
                    break;
                    
                case 'laser':
                case 'railgun':
                    this.ctx.strokeStyle = projectile.color;
                    this.ctx.lineWidth = projectile.size;
                    this.ctx.globalAlpha = 0.8;
                    this.ctx.beginPath();
                    this.ctx.moveTo(projectile.x - projectile.vx * 3, projectile.y - projectile.vy * 3);
                    this.ctx.lineTo(projectile.x, projectile.y);
                    this.ctx.stroke();
                    break;
                    
                case 'plasma':
                    const gradient = this.ctx.createRadialGradient(
                        projectile.x, projectile.y, 0,
                        projectile.x, projectile.y, projectile.size * 2
                    );
                    gradient.addColorStop(0, projectile.color);
                    gradient.addColorStop(1, projectile.color + '00');
                    this.ctx.fillStyle = gradient;
                    this.ctx.fillRect(
                        projectile.x - projectile.size * 2,
                        projectile.y - projectile.size * 2,
                        projectile.size * 4,
                        projectile.size * 4
                    );
                    
                    this.ctx.fillStyle = projectile.color;
                    this.ctx.beginPath();
                    this.ctx.arc(projectile.x, projectile.y, projectile.size, 0, Math.PI * 2);
                    this.ctx.fill();
                    break;
                    
                case 'flame':
                    this.ctx.fillStyle = projectile.color;
                    this.ctx.globalAlpha = 0.7;
                    for (let i = 0; i < 3; i++) {
                        const x = projectile.x + (Math.random() - 0.5) * 6;
                        const y = projectile.y + (Math.random() - 0.5) * 6;
                        this.ctx.beginPath();
                        this.ctx.arc(x, y, projectile.size + Math.random() * 2, 0, Math.PI * 2);
                        this.ctx.fill();
                    }
                    break;
                    
                case 'lightning':
                    this.ctx.strokeStyle = projectile.color;
                    this.ctx.lineWidth = 3;
                    this.ctx.globalAlpha = Math.max(0.1, projectile.life / 30);
                    this.ctx.beginPath();
                    this.ctx.moveTo(projectile.x, projectile.y);
                    
                    // Jagged lightning effect
                    const steps = 5;
                    for (let i = 1; i <= steps; i++) {
                        const progress = i / steps;
                        const x = projectile.x + (projectile.targetX - projectile.x) * progress + (Math.random() - 0.5) * 20;
                        const y = projectile.y + (projectile.targetY - projectile.y) * progress + (Math.random() - 0.5) * 20;
                        this.ctx.lineTo(x, y);
                    }
                    this.ctx.stroke();
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
                    
                    // Exhaust trail
                    this.ctx.fillStyle = '#FF4444';
                    this.ctx.globalAlpha = 0.6;
                    for (let i = 0; i < 3; i++) {
                        this.ctx.fillRect(-6 - i * 3, -1, 3, 2);
                    }
                    break;
                    
                case 'boss-missile':
                    this.ctx.translate(projectile.x, projectile.y);
                    this.ctx.rotate(Math.atan2(projectile.vy, projectile.vx));
                    
                    // Boss missile body - larger and more menacing
                    this.ctx.fillStyle = projectile.color;
                    this.ctx.fillRect(-8, -3, 16, 6);
                    
                    // Boss missile tip - more aggressive
                    this.ctx.fillStyle = '#FF0000';
                    this.ctx.beginPath();
                    this.ctx.moveTo(8, 0);
                    this.ctx.lineTo(4, -3);
                    this.ctx.lineTo(4, 3);
                    this.ctx.closePath();
                    this.ctx.fill();
                    
                    // Pulsing glow effect for boss missiles
                    const pulseIntensity = 0.7 + Math.sin(Date.now() * 0.01) * 0.3;
                    this.ctx.shadowColor = '#FF0066';
                    this.ctx.shadowBlur = 10 * pulseIntensity;
                    this.ctx.fillStyle = '#FF0066';
                    this.ctx.fillRect(-6, -2, 12, 4);
                    
                    // Exhaust trail - more intense
                    this.ctx.shadowBlur = 0;
                    this.ctx.fillStyle = '#FF0066';
                    this.ctx.globalAlpha = 0.8;
                    for (let i = 0; i < 4; i++) {
                        const alpha = 0.8 - (i * 0.2);
                        this.ctx.globalAlpha = alpha;
                        this.ctx.fillRect(-8 - i * 4, -2, 4, 4);
                    }
                    this.ctx.globalAlpha = 1;
                    break;
            }
            
            this.ctx.restore();
        });
    }
    
    drawXPOrbs() {
        this.xpOrbs.forEach(orb => {
            // Frustum culling: Only render XP orbs visible on screen
            if (!this.isInViewport(orb.x, orb.y, 15)) {
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
            // Only render explosions visible on screen
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
        // Particles completely removed for performance
    }
    
    drawNotifications() {
        this.notifications.forEach(notification => {
            this.ctx.save();
            
            // Reset transform to draw in screen coordinates
            this.ctx.resetTransform();
            
            this.ctx.globalAlpha = notification.alpha;
            this.ctx.fillStyle = '#FFD700';
            this.ctx.strokeStyle = '#000000';
            this.ctx.lineWidth = 2;
            this.ctx.font = 'bold 24px Arial';
            this.ctx.textAlign = 'center';
            
            // Draw notification in the center of the screen
            const screenX = this.canvas.width / 2;
            const screenY = this.canvas.height / 2 - 100; // Above center
            
            this.ctx.strokeText(notification.message, screenX, screenY);
            this.ctx.fillText(notification.message, screenX, screenY);
            
            this.ctx.restore();
        });
    }
    
    updateUI() {
        // Header Health bar
        const healthPercent = (this.player.health / this.player.maxHealth) * 100;
        const headerHealthFill = document.getElementById('header-health-fill');
        const headerHealthText = document.getElementById('header-health-text');
        if (headerHealthFill && headerHealthText) {
            headerHealthFill.style.width = `${Math.max(0, healthPercent)}%`;
            headerHealthText.textContent = `${Math.max(0, Math.floor(this.player.health))}`;
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
            headerWeaponDisplay.innerHTML = this.weapons.map(weapon => `
                <div class="header-weapon-item">
                    ${this.getWeaponName(weapon.type)} ${weapon.level}
                </div>
            `).join('');
        }
    }
    
    gameOver() {
        this.gameRunning = false;
        
        // Hide pause button during game over
        const pauseBtn = document.getElementById('pause-btn');
        if (pauseBtn) {
            pauseBtn.style.display = 'none';
        }
        
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
            z-index: 10000 !important;
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
        
        // Add event listeners
        document.getElementById('overlay-retry-btn').addEventListener('click', () => {
            // Remove overlay
            gameOverOverlay.remove();
            style.remove();
            // Restart game
            this.startGame();
        });
        
        document.getElementById('overlay-exit-btn').addEventListener('click', () => {
            // Remove overlay
            gameOverOverlay.remove();
            style.remove();
            // Close game
            this.closeGame();
        });
        
        // Game over overlay ready
    }
    
    bossDefeated() {
        this.gameRunning = false;
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
            z-index: 10000 !important;
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
                ">BOSS DEFEATED</div>
                
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
                </div>
                
                <div style="display: flex; gap: 15px; justify-content: center;">
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
                    ">EXIT</button>
                </div>
            </div>
        `;
        
        // Add hover effects
        const style = document.createElement('style');
        style.textContent = `
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
        
        // Add overlay to the game container
        const gameContainer = document.getElementById('vibe-survivor-container');
        if (gameContainer) {
            gameContainer.appendChild(victoryOverlay);
        }
        
        // Add event listeners
        document.getElementById('victory-retry-btn').addEventListener('click', () => {
            // Remove overlay
            victoryOverlay.remove();
            style.remove();
            // Restart game
            this.startGame();
        });
        
        document.getElementById('victory-exit-btn').addEventListener('click', () => {
            // Remove overlay
            victoryOverlay.remove();
            style.remove();
            // Close game
            this.closeGame();
        });
        
        // Victory overlay ready
    }
    
    restartGame() {
        this.startGame();
    }
    

    closeGame() {
        this.gameRunning = false;
        this.isPaused = false; // Reset pause state
        
        // Cancel any running game loop
        if (this.gameLoopId) {
            cancelAnimationFrame(this.gameLoopId);
            this.gameLoopId = null;
        }
        
        // Hide pause menu if it's open
        const pauseMenu = document.getElementById('pause-menu');
        if (pauseMenu) {
            pauseMenu.style.display = 'none';
        }
        
        // Restore body scrolling behavior
        this.restoreBackgroundScrolling();
        
        // Hide pause button when closing game
        const pauseBtn = document.getElementById('pause-btn');
        if (pauseBtn) {
            pauseBtn.style.display = 'none';
        }
        
        // Stop background music
        try {
            this.backgroundMusic.pause();
            this.backgroundMusic.currentTime = 0;
            console.log('Background music stopped');
        } catch (e) {
            console.warn('Could not stop background music:', e);
        }
        
        // Remove any fresh modals that might exist
        const freshModal = document.getElementById('fresh-game-over-modal');
        if (freshModal) {
            freshModal.remove();
        }
        
        const modal = document.getElementById('vibe-survivor-modal');
        if (modal) {
            modal.style.display = 'none';
            
            const container = document.getElementById('vibe-survivor-container');
            if (container) {
                container.classList.add('vibe-survivor-hidden');
            }
            
            this.showStartScreen();
        } else {
            // If modal doesn't exist, recreate it but keep it hidden
            console.log('Modal not found, recreating hidden modal');
            this.createGameModal();
            const newModal = document.getElementById('vibe-survivor-modal');
            if (newModal) {
                newModal.style.display = 'none';
            }
        }
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
        const startScreen = document.getElementById('survivor-start-screen');
        if (startScreen) {
            startScreen.classList.add('active');
            
            // Recreate start screen content to ensure visibility
            startScreen.innerHTML = `
                <div style="
                    width: 100%;
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    align-items: center;
                    color: white;
                    font-family: Arial, sans-serif;
                    text-align: center;
                    padding: 40px;
                    box-sizing: border-box;
                ">
                    <div style="margin-bottom: 40px;">
                        <h1 style="
                            font-size: 4rem;
                            margin: 0 0 20px 0;
                            text-shadow: 0 0 20px rgba(155, 89, 182, 0.8);
                            color: #9B59B6;
                        ">VIBE SURVIVOR</h1>
                        <p style="font-size: 1.4rem; margin: 15px 0; opacity: 0.9; color: white;">Survive the endless waves!</p>
                        <p style="font-size: 1rem; color: #9B59B6; margin-top: 25px; font-weight: bold;">Use WASD to move, SPACEBAR to dash</p>
                    </div>
                    <button id="start-survivor" style="
                        background: linear-gradient(135deg, #E74C3C, #C0392B);
                        color: white;
                        border: none;
                        padding: 20px 40px;
                        font-size: 1.3rem;
                        border-radius: 25px;
                                text-transform: uppercase;
                        font-weight: bold;
                        box-shadow: 0 4px 15px rgba(231, 76, 60, 0.3);
                        transition: transform 0.2s;
                    " onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">START GAME</button>
                </div>
            `;
            
            // Force visibility and override any CSS issues
            startScreen.style.cssText = `
                display: flex !important;
                visibility: visible !important;
                opacity: 1 !important;
                height: 100% !important;
                width: 100% !important;
                position: absolute !important;
                top: 0 !important;
                left: 0 !important;
                z-index: 1000 !important;
                background: transparent !important;
                align-items: center !important;
                justify-content: center !important;
                flex-direction: column !important;
            `;
            
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