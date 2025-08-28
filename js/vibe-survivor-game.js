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
        
        // Mobile touch controls
        this.isMobile = this.detectMobile();
        this.touchControls = {
            joystick: {
                active: false,
                startX: 0,
                startY: 0,
                currentX: 0,
                currentY: 0,
                moveX: 0,
                moveY: 0
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
    }
    
    createGameModal() {
        // Debug: Check for ALL vibe-survivor modals and overlays
        console.log('=== MODAL DEBUGGING ===');
        const allModals = document.querySelectorAll('[id*="vibe-survivor"], [class*="vibe-survivor"], [class*="modal"]');
        console.log('Found elements with vibe-survivor or modal:', allModals.length);
        allModals.forEach((el, index) => {
            console.log(`Element ${index}:`, {
                id: el.id,
                className: el.className,
                display: window.getComputedStyle(el).display,
                zIndex: window.getComputedStyle(el).zIndex,
                position: window.getComputedStyle(el).position
            });
        });
        
        // Remove existing vibe-survivor MODAL elements only (preserve buttons)
        const existingModals = document.querySelectorAll('#vibe-survivor-modal, .vibe-survivor-modal');
        console.log(`Removing ${existingModals.length} existing vibe-survivor modal elements`);
        existingModals.forEach(modal => modal.remove());
        
        // Also check for any high z-index elements that might be covering content
        const highZElements = Array.from(document.querySelectorAll('*')).filter(el => {
            const zIndex = parseInt(window.getComputedStyle(el).zIndex);
            return zIndex > 9000;
        });
        console.log('High z-index elements (>9000):', highZElements.length);
        highZElements.forEach((el, index) => {
            console.log(`High z-index ${index}:`, {
                tag: el.tagName,
                id: el.id,
                className: el.className,
                zIndex: window.getComputedStyle(el).zIndex,
                display: window.getComputedStyle(el).display
            });
        });

        const modalHTML = `
            <div id="vibe-survivor-modal" class="vibe-survivor-modal">
                <div class="vibe-survivor-content">
                    <div id="vibe-survivor-container" class="vibe-survivor-container">
                        <div class="vibe-survivor-header">
                            <h2>VIBE SURVIVOR</h2>
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
                        
                        <div id="game-screen" class="vibe-survivor-screen">
                            <canvas id="survivor-canvas"></canvas>
                            <div id="survivor-ui" class="survivor-ui">
                                <div class="survivor-stats">
                                    <div class="health-bar">
                                        <div class="health-fill" id="health-fill"></div>
                                        <span id="health-text">100/100</span>
                                    </div>
                                    <div class="xp-bar">
                                        <div class="xp-fill" id="xp-fill"></div>
                                        <span id="level-text">Level 1</span>
                                    </div>
                                    <div class="time-display" id="time-display">0:00</div>

                                </div>
                                <div class="weapon-display" id="weapon-display"></div>
                            </div>
                            
                            <!-- Pause Menu -->
                            <div id="pause-menu" class="pause-menu" style="display: none;">
                                <div class="pause-content">
                                    <h2>GAME PAUSED</h2>
                                    <div class="pause-buttons">
                                        <button id="resume-btn" class="survivor-btn primary">RESUME</button>
                                        <button id="exit-to-menu-btn" class="survivor-btn">EXIT TO MENU</button>
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
                                
                                <!-- Dash Button -->
                                <div id="mobile-dash-btn" class="mobile-dash-btn">
                                    <span>DASH</span>
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
        
        console.log('Modal HTML created, checking elements...');
        console.log('vibe-survivor-modal exists:', !!document.getElementById('vibe-survivor-modal'));
        console.log('survivor-start-screen exists:', !!document.getElementById('survivor-start-screen'));
        console.log('survivor-game-over-screen exists:', !!document.getElementById('survivor-game-over-screen'));
    }
    
    addStyles() {
        if (document.getElementById('vibe-survivor-styles')) return;
        
        const styles = document.createElement('style');
        styles.id = 'vibe-survivor-styles';
        styles.textContent = `
            .vibe-survivor-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.9);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                backdrop-filter: blur(5px);
            }

            .vibe-survivor-content {
                background: linear-gradient(135deg, #1a1a2e, #16213e);
                border: 2px solid #9B59B6;
                border-radius: 15px;
                width: 95vw;
                max-width: 95vw;
                height: 90vh;
                max-height: 90vh;
                position: relative;
                overflow: hidden;
                box-shadow: 0 0 30px rgba(155, 89, 182, 0.3);
                display: flex;
                flex-direction: column;
            }

            .vibe-survivor-header {
                background: rgba(155, 89, 182, 0.2);
                padding: 15px 20px;
                border-bottom: 1px solid #9B59B6;
                display: flex !important;
                justify-content: space-between;
                align-items: center;
                position: relative !important;
                z-index: 999999 !important;
                pointer-events: auto !important;
                visibility: visible !important;
                opacity: 1 !important;
            }

            .vibe-survivor-header h2 {
                color: #9B59B6;
                margin: 0;
                font-family: 'Arial', sans-serif;
                font-weight: bold;
                text-shadow: 0 0 10px rgba(155, 89, 182, 0.5);
            }

            .close-btn {
                background: none;
                border: 2px solid #9B59B6;
                color: #9B59B6;
                font-size: 24px;
                width: 35px;
                height: 35px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.3s ease;
                position: relative !important;
                z-index: 999999 !important;
                pointer-events: auto !important;
            }

            .close-btn:hover {
                background: #9B59B6;
                color: white;
                transform: scale(1.1);
            }

            .vibe-survivor-container {
                height: calc(100% - 70px) !important;
                position: relative !important;
                width: 100% !important;
                display: block !important;
                visibility: visible !important;
                overflow: hidden !important;
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
                overflow-y: auto !important;
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
                font-size: 3rem;
                margin: 0 0 10px 0;
                text-shadow: 0 0 20px rgba(155, 89, 182, 0.8);
                color: #9B59B6;
            }

            .survivor-title p {
                font-size: 1.2rem;
                margin: 10px 0;
                opacity: 0.8;
            }

            .controls-info {
                font-size: 0.9rem !important;
                color: #9B59B6 !important;
                margin-top: 20px !important;
            }

            .survivor-btn {
                background: linear-gradient(135deg, #9B59B6, #8E44AD);
                color: white;
                border: none;
                padding: 15px 30px;
                font-size: 1.1rem;
                border-radius: 25px;
                margin: 10px;
                transition: all 0.3s ease;
                text-transform: uppercase;
                font-weight: bold;
                box-shadow: 0 4px 15px rgba(155, 89, 182, 0.3);
            }

            .survivor-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(155, 89, 182, 0.4);
            }

            .survivor-btn.primary {
                background: linear-gradient(135deg, #E74C3C, #C0392B);
                box-shadow: 0 4px 15px rgba(231, 76, 60, 0.3);
            }

            .survivor-btn.primary:hover {
                box-shadow: 0 6px 20px rgba(231, 76, 60, 0.4);
            }

            #survivor-canvas {
                background: #0a0a0a;
                border: 2px solid #9B59B6;
                border-radius: 10px;
                box-shadow: 0 0 20px rgba(155, 89, 182, 0.2);
            }

            .survivor-ui {
                position: absolute;
                top: 20px;
                left: 20px;
                right: 20px;
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                pointer-events: none;
                z-index: 100;
            }

            /* Mobile responsive positioning to prevent overlay */
            @media screen and (max-width: 480px) {
                .survivor-ui {
                    position: relative;
                    top: 0;
                    left: 0;
                    right: 0;
                    margin: 10px;
                    margin-bottom: 5px;
                }
                
                .survivor-stats {
                    position: static;
                    margin-bottom: 5px;
                }
                
                .weapon-display {
                    position: static;
                    margin-top: 5px;
                }
            }

            .survivor-stats {
                background: rgba(0, 0, 0, 0.7);
                padding: 8px 12px;
                border-radius: 8px;
                border: 1px solid #9B59B6;
                backdrop-filter: blur(5px);
                max-height: 120px;
            }

            .health-bar, .xp-bar {
                position: relative;
                width: 200px;
                height: 20px;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 10px;
                margin: 5px 0;
                overflow: hidden;
            }

            .health-fill {
                height: 100%;
                background: linear-gradient(90deg, #E74C3C, #C0392B);
                border-radius: 10px;
                transition: width 0.3s ease;
            }

            .xp-fill {
                height: 100%;
                background: linear-gradient(90deg, #9B59B6, #8E44AD);
                border-radius: 10px;
                transition: width 0.3s ease;
            }

            .health-bar span, .xp-bar span {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                color: white;
                font-size: 12px;
                font-weight: bold;
                text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
            }

            .time-display {
                color: #9B59B6;
                font-size: 18px;
                font-weight: bold;
                text-shadow: 0 0 10px rgba(155, 89, 182, 0.5);
                margin-top: 10px;
            }

            .weapon-display {
                background: rgba(0, 0, 0, 0.7);
                padding: 10px;
                border-radius: 10px;
                border: 1px solid #9B59B6;
                backdrop-filter: blur(5px);
                max-width: 250px;
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
                background: linear-gradient(135deg, #1a1a2e, #16213e);
                border: 2px solid #9B59B6;
                border-radius: 15px;
                padding: 40px;
                text-align: center;
                box-shadow: 0 0 30px rgba(155, 89, 182, 0.5);
            }

            .pause-content h2 {
                color: #9B59B6;
                font-size: 2rem;
                margin-bottom: 30px;
                text-shadow: 0 0 20px rgba(155, 89, 182, 0.8);
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

            /* Mobile Touch Controls */
            .mobile-controls {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                pointer-events: none;
                z-index: 15000;
            }

            .virtual-joystick {
                position: absolute;
                bottom: 40px;
                left: 40px;
                width: 100px;
                height: 100px;
                background: rgba(155, 89, 182, 0.3);
                border: 2px solid rgba(155, 89, 182, 0.6);
                border-radius: 50%;
                pointer-events: auto;
                touch-action: none;
            }

            .joystick-handle {
                position: absolute;
                width: 40px;
                height: 40px;
                background: #9B59B6;
                border-radius: 50%;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                box-shadow: 0 0 10px rgba(155, 89, 182, 0.8);
                transition: all 0.1s ease;
            }

            .mobile-dash-btn {
                position: absolute;
                bottom: 40px;
                right: 40px;
                width: 80px;
                height: 80px;
                background: rgba(155, 89, 182, 0.8);
                border: 2px solid #9B59B6;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-weight: bold;
                font-size: 12px;
                pointer-events: auto;
                touch-action: none;
                user-select: none;
                box-shadow: 0 0 20px rgba(155, 89, 182, 0.6);
            }

            .mobile-dash-btn:active {
                background: #9B59B6;
                transform: scale(0.9);
            }

            /* Show mobile controls only on touch devices */
            @media (hover: none) and (pointer: coarse) {
                .mobile-controls {
                    display: block !important;
                }
            }

            /* Responsive canvas and screen styles */
            .vibe-survivor-screen {
                display: none;
                width: 100%;
                height: 100%;
                position: relative;
                flex: 1;
                min-height: 0;
            }

            .vibe-survivor-screen.active {
                display: flex;
                flex-direction: column;
            }

            #survivor-canvas {
                max-width: 100%;
                max-height: 100%;
                object-fit: contain;
                background: #0a0a0a;
            }

            .weapon-item {
                display: flex;
                align-items: center;
                margin: 5px 0;
                color: white;
                font-size: 12px;
            }

            .weapon-icon {
                width: 20px;
                height: 20px;
                background: #9B59B6;
                border-radius: 3px;
                margin-right: 8px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 10px;
            }

            .survivor-game-over {
                text-align: center;
                color: white;
            }

            .survivor-game-over h2 {
                color: #E74C3C;
                font-size: 2.5rem;
                margin-bottom: 30px;
                text-shadow: 0 0 20px rgba(231, 76, 60, 0.8);
            }

            .survivor-buttons {
                margin-top: 30px;
            }

            .levelup-modal {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: linear-gradient(135deg, #1a1a2e, #16213e);
                border: 2px solid #9B59B6;
                border-radius: 15px;
                padding: 30px;
                z-index: 1000;
                box-shadow: 0 0 30px rgba(155, 89, 182, 0.5);
                backdrop-filter: blur(10px);
            }

            .levelup-title {
                text-align: center;
                color: #9B59B6;
                font-size: 1.8rem;
                margin-bottom: 20px;
                text-shadow: 0 0 10px rgba(155, 89, 182, 0.5);
            }

            .upgrade-choices {
                display: flex;
                gap: 20px;
                flex-wrap: wrap;
                justify-content: center;
            }

            .upgrade-choice {
                background: rgba(155, 89, 182, 0.1);
                border: 2px solid #9B59B6;
                border-radius: 10px;
                padding: 20px;
                width: 200px;
                transition: all 0.3s ease;
                text-align: center;
            }

            .upgrade-choice:hover {
                background: rgba(155, 89, 182, 0.2);
                transform: scale(1.05);
                box-shadow: 0 0 15px rgba(155, 89, 182, 0.4);
            }

            .upgrade-choice h3 {
                color: #9B59B6;
                margin: 0 0 10px 0;
                font-size: 1.2rem;
            }

            .upgrade-choice p {
                color: white;
                margin: 0;
                font-size: 0.9rem;
                opacity: 0.9;
            }

            .vibe-survivor-hidden {
                display: none !important;
            }

            @keyframes pulse {
                from { transform: scale(1); }
                to { transform: scale(1.05); }
            }

            .pulse {
                animation: pulse 0.3s ease-in-out;
            }
        `;
        
        document.head.appendChild(styles);
    }
    
    setupEventHandlers() {
        console.log('setupEventHandlers called - setting up event listeners');
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
        
        // Pause menu event listeners
        document.getElementById('resume-btn').addEventListener('click', () => {
            this.togglePause();
        });
        
        document.getElementById('exit-to-menu-btn').addEventListener('click', () => {
            this.exitToMenu();
        });
        
        // Keyboard controls
        document.addEventListener('keydown', (e) => {
            if (this.gameRunning) {
                this.keys[e.key.toLowerCase()] = true;
                
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
        });
        
        window.addEventListener('resize', () => this.resizeCanvas());
        
        // Setup mobile controls if on mobile device
        if (this.isMobile) {
            this.setupMobileControls();
        }
    }

    launchGame() {
        console.log('launchGame called - ensuring fresh modal state...');
        
        // Always remove existing modal and create fresh one to avoid overlay issues
        const existingModal = document.getElementById('vibe-survivor-modal');
        if (existingModal) {
            console.log('Removing existing modal to prevent overlay issues');
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
            console.log('Fresh modal displayed');
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
        } catch (e) {
            console.error('Canvas initialization error:', e);
        }
        
        this.showStartScreen();
    }
    
    resizeCanvas() {
        if (this.canvas) {
            const container = this.canvas.parentElement;
            if (container) {
                // Get viewport constraints first
                const viewportWidth = window.innerWidth;
                const viewportHeight = window.innerHeight;
                
                // Calculate actual available space in container
                const containerRect = container.getBoundingClientRect();
                let availableWidth = containerRect.width;
                let availableHeight = containerRect.height;
                
                // Account for modal header and other UI elements
                const modal = document.querySelector('#vibe-survivor-modal');
                if (modal) {
                    const header = modal.querySelector('.vibe-survivor-header');
                    const headerHeight = header ? header.offsetHeight : 60; // fallback to 60px
                    
                    // Account for padding, margins, and touch controls space - increased for better spacing
                    const reservedHeight = headerHeight + 160; // header + touch controls + padding + stats + extra margin
                    const reservedWidth = 60; // side padding increased
                    
                    availableWidth = Math.min(availableWidth - reservedWidth, viewportWidth * 0.88);
                    availableHeight = Math.min(availableHeight - reservedHeight, viewportHeight * 0.70);
                }
                
                // Set responsive minimum sizes based on screen size
                let minWidth, minHeight, maxWidth, maxHeight;
                if (viewportWidth <= 480) { // Mobile
                    minWidth = 320;
                    minHeight = 240;
                    maxWidth = viewportWidth * 0.9;
                    maxHeight = viewportHeight * 0.6;
                } else if (viewportWidth <= 768) { // Tablet
                    minWidth = 480;
                    minHeight = 360;
                    maxWidth = viewportWidth * 0.85;
                    maxHeight = viewportHeight * 0.7;
                } else { // Desktop
                    minWidth = 600;
                    minHeight = 450;
                    maxWidth = 1200;
                    maxHeight = 900;
                }
                
                // Flexible aspect ratio between 4:3 and 16:9
                const preferredAspectRatio = 4/3;
                const flexibleAspectMin = 1.2; // 6:5 (taller)
                const flexibleAspectMax = 1.8; // 16:9 (wider)
                
                let canvasWidth, canvasHeight;
                let targetAspectRatio = preferredAspectRatio;
                
                // Try preferred aspect ratio first
                if (availableWidth / availableHeight > preferredAspectRatio) {
                    // Container is wider, fit to height
                    canvasHeight = Math.min(Math.max(availableHeight, minHeight), maxHeight);
                    canvasWidth = canvasHeight * preferredAspectRatio;
                } else {
                    // Container is taller, fit to width
                    canvasWidth = Math.min(Math.max(availableWidth, minWidth), maxWidth);
                    canvasHeight = canvasWidth / preferredAspectRatio;
                }
                
                // Check if we need to adjust aspect ratio to fit better
                if (canvasWidth > availableWidth || canvasHeight > availableHeight) {
                    // Recalculate with flexible aspect ratio
                    const availableAspectRatio = availableWidth / availableHeight;
                    targetAspectRatio = Math.max(flexibleAspectMin, Math.min(flexibleAspectMax, availableAspectRatio));
                    
                    if (availableWidth / availableHeight > targetAspectRatio) {
                        canvasHeight = Math.min(Math.max(availableHeight, minHeight), maxHeight);
                        canvasWidth = canvasHeight * targetAspectRatio;
                    } else {
                        canvasWidth = Math.min(Math.max(availableWidth, minWidth), maxWidth);
                        canvasHeight = canvasWidth / targetAspectRatio;
                    }
                }
                
                // Final constraint check - ensure we don't exceed viewport with more conservative limits
                if (canvasWidth > viewportWidth * 0.90) {
                    canvasWidth = viewportWidth * 0.90;
                    canvasHeight = Math.min(canvasWidth / flexibleAspectMin, maxHeight);
                }
                if (canvasHeight > viewportHeight * 0.72) {
                    canvasHeight = viewportHeight * 0.72;
                    canvasWidth = Math.min(canvasHeight * flexibleAspectMax, maxWidth);
                }
                
                // Ensure minimum viable game area
                canvasWidth = Math.max(canvasWidth, minWidth);
                canvasHeight = Math.max(canvasHeight, minHeight);
                
                this.canvas.width = Math.floor(canvasWidth);
                this.canvas.height = Math.floor(canvasHeight);
                
                // Center canvas in container with proper spacing
                this.canvas.style.display = 'block';
                this.canvas.style.margin = '10px auto';
                this.canvas.style.maxWidth = '100%';
                this.canvas.style.maxHeight = 'calc(100vh - 200px)'; // Ensure touch controls visible
                
                console.log(`Canvas resized to: ${this.canvas.width}x${this.canvas.height} (aspect: ${(canvasWidth/canvasHeight).toFixed(2)})`);
                console.log(`Available space: ${availableWidth}x${availableHeight}, Viewport: ${viewportWidth}x${viewportHeight}`);
            } else {
                // Fallback with responsive defaults
                const isMobile = window.innerWidth <= 768;
                this.canvas.width = isMobile ? 400 : 800;
                this.canvas.height = isMobile ? 300 : 600;
            }
            
            // Update touch controls positioning after canvas resize
            if (this.isMobile) {
                this.updateTouchControlsPositioning();
            }
        }
    }
    
    // Modal header management methods
    hideModalHeader() {
        const header = document.querySelector('#vibe-survivor-modal .vibe-survivor-header');
        if (header) {
            // Keep header visible during gameplay so X button is accessible
            // Only hide the title, keep the close button visible
            const title = header.querySelector('h2');
            if (title) {
                title.style.display = 'none';
            }
            console.log('Modal header title hidden during gameplay, X button remains visible');
        } else {
            console.log('Modal header not found for hiding');
        }
    }
    
    showModalHeader() {
        const header = document.querySelector('#vibe-survivor-modal .vibe-survivor-header');
        if (header) {
            header.style.display = 'flex';
            // Also show the title when showing full header
            const title = header.querySelector('h2');
            if (title) {
                title.style.display = 'block';
            }
            console.log('Modal header shown for menu screens');
        } else {
            console.log('Modal header not found for showing');
        }
    }
    
    showStartScreen() {
        // Show modal header for start screen
        this.showModalHeader();
        
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
            
            console.log('showStartScreen: Start screen activated and forced visible');
            console.log('showStartScreen: Start screen HTML length:', startScreen.innerHTML.length);
            console.log('showStartScreen: First 200 chars:', startScreen.innerHTML.substring(0, 200));
        } else {
            console.error('showStartScreen: Start screen element not found');
        }
    }
    
    startGame() {
        console.log('startGame called - force complete reinitialization...');
        
        // CRITICAL FIX: Hide modal header during gameplay
        this.hideModalHeader();
        
        // CRITICAL FIX: Explicitly hide start screen by clearing inline styles
        const startScreen = document.getElementById('survivor-start-screen');
        if (startScreen) {
            startScreen.style.cssText = 'display: none !important;';
            startScreen.classList.remove('active');
            console.log('Start screen explicitly hidden with cleared inline styles');
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
            console.log('Canvas context successfully obtained');
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
            console.log('Game screen activated');
        } else {
            console.error('Game screen not found! Modal structure may be missing.');
            return;
        }
        
        
        // Setup mobile controls when game starts
        if (this.isMobile) {
            this.setupMobileControls();
        }
        
        this.gameRunning = true;
        console.log('Starting game loop...');
        this.gameLoop();
    }
    
    resetGame() {
        this.gameTime = 0;
        this.frameCount = 0;
        this.lastSpawn = 0;
        this.spawnRate = 120;
        this.waveMultiplier = 1;
        
        // Reset player - start at world center
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
        
        this.update();
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
        
        if (this.isPaused) {
            pauseMenu.style.display = 'flex';
            this.gameRunning = false; // Stop game updates
        } else {
            pauseMenu.style.display = 'none';
            this.gameRunning = true; // Resume game updates
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
            this.setupDashButton(dashBtn);
        }
    }
    
    updateTouchControlsPositioning() {
        if (!this.isMobile) return;
        
        const mobileControls = document.getElementById('mobile-controls');
        const joystick = document.getElementById('virtual-joystick');
        const dashBtn = document.getElementById('mobile-dash-btn');
        const modal = document.querySelector('#vibe-survivor-modal');
        
        if (!mobileControls || !modal) return;
        
        const modalRect = modal.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const viewportWidth = window.innerWidth;
        
        // Calculate safe positioning area
        const modalBottom = modalRect.bottom;
        const availableBottomSpace = viewportHeight - modalBottom;
        const safeBottomMargin = Math.max(20, availableBottomSpace * 0.1);
        
        // Position touch controls relative to modal/viewport, not canvas
        if (joystick) {
            const joystickSize = Math.min(80, viewportWidth * 0.15); // Responsive size
            joystick.style.position = 'fixed';
            joystick.style.bottom = `${safeBottomMargin}px`;
            joystick.style.left = `${Math.max(20, viewportWidth * 0.05)}px`;
            joystick.style.width = `${joystickSize}px`;
            joystick.style.height = `${joystickSize}px`;
            joystick.style.zIndex = '1000010'; // Above modal content
        }
        
        if (dashBtn) {
            const dashBtnSize = Math.min(60, viewportWidth * 0.12); // Responsive size
            dashBtn.style.position = 'fixed';
            dashBtn.style.bottom = `${safeBottomMargin}px`;
            dashBtn.style.right = `${Math.max(20, viewportWidth * 0.05)}px`;
            dashBtn.style.width = `${dashBtnSize}px`;
            dashBtn.style.height = `${dashBtnSize}px`;
            dashBtn.style.zIndex = '1000010'; // Above modal content
            dashBtn.style.fontSize = `${Math.min(12, dashBtnSize * 0.2)}px`;
        }
        
        // Ensure controls don't overlap with modal content
        if (modalRect.height > viewportHeight * 0.8) {
            // Modal is very tall, position controls over the modal with higher z-index
            const controlsOverlayBottom = Math.max(10, viewportHeight * 0.05);
            
            if (joystick) {
                joystick.style.bottom = `${controlsOverlayBottom}px`;
                joystick.style.backgroundColor = 'rgba(155, 89, 182, 0.9)'; // More opaque
            }
            
            if (dashBtn) {
                dashBtn.style.bottom = `${controlsOverlayBottom}px`;
                dashBtn.style.backgroundColor = 'rgba(155, 89, 182, 0.9)'; // More opaque
            }
        }
        
        console.log(`Touch controls positioned: viewport ${viewportWidth}x${viewportHeight}, modal bottom: ${modalBottom}`);
    }
    
    setupVirtualJoystick(joystick) {
        const handle = document.getElementById('joystick-handle');
        const joystickRect = joystick.getBoundingClientRect();
        const maxDistance = 30; // Maximum distance handle can move from center
        
        joystick.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            this.touchControls.joystick.active = true;
            this.touchControls.joystick.startX = touch.clientX;
            this.touchControls.joystick.startY = touch.clientY;
        });
        
        joystick.addEventListener('touchmove', (e) => {
            if (!this.touchControls.joystick.active) return;
            e.preventDefault();
            
            const touch = e.touches[0];
            const deltaX = touch.clientX - this.touchControls.joystick.startX;
            const deltaY = touch.clientY - this.touchControls.joystick.startY;
            
            // Limit movement to circle
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            const limitedDistance = Math.min(distance, maxDistance);
            const angle = Math.atan2(deltaY, deltaX);
            
            const limitedX = Math.cos(angle) * limitedDistance;
            const limitedY = Math.sin(angle) * limitedDistance;
            
            // Update handle position
            handle.style.transform = `translate(calc(-50% + ${limitedX}px), calc(-50% + ${limitedY}px))`;
            
            // Convert to movement values (-1 to 1)
            this.touchControls.joystick.moveX = limitedX / maxDistance;
            this.touchControls.joystick.moveY = limitedY / maxDistance;
        });
        
        const endTouch = () => {
            this.touchControls.joystick.active = false;
            this.touchControls.joystick.moveX = 0;
            this.touchControls.joystick.moveY = 0;
            handle.style.transform = 'translate(-50%, -50%)';
        };
        
        joystick.addEventListener('touchend', endTouch);
        joystick.addEventListener('touchcancel', endTouch);
    }
    
    setupDashButton(dashBtn) {
        dashBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.touchControls.dashButton.pressed = true;
        });
        
        const endDash = () => {
            this.touchControls.dashButton.pressed = false;
        };
        
        dashBtn.addEventListener('touchend', endDash);
        dashBtn.addEventListener('touchcancel', endDash);
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
            
            switch (weapon.type) {
                case 'basic':
                case 'rapid':
                    this.createBasicProjectile(weapon, dx, dy, distance);
                    break;
                case 'spread':
                case 'spread_shot':
                    this.createSpreadProjectiles(weapon, dx, dy, distance);
                    break;
                case 'laser':
                    this.createLaserBeam(weapon, dx, dy, distance);
                    break;
                case 'plasma':
                    this.createPlasmaProjectile(weapon, dx, dy, distance);
                    break;
                case 'shotgun':
                    this.createShotgunBlast(weapon, dx, dy, distance);
                    break;
                case 'lightning':
                    this.createLightningBolt(weapon, nearestEnemy);
                    break;
                case 'flamethrower':
                    this.createFlameStream(weapon, dx, dy, distance);
                    break;
                case 'railgun':
                    this.createRailgunBeam(weapon, dx, dy, distance);
                    break;
                case 'missiles':
                    this.createHomingMissile(weapon, nearestEnemy);
                    break;
            }
        }
    }
    
    createBasicProjectile(weapon, dx, dy, distance) {
        const angle = Math.atan2(dy, dx);
        this.projectiles.push({
            x: this.player.x,
            y: this.player.y,
            vx: Math.cos(angle) * weapon.projectileSpeed,
            vy: Math.sin(angle) * weapon.projectileSpeed,
            damage: weapon.damage,
            life: 120,
            type: 'basic',
            color: '#9B59B6',
            size: 3
        });
    }
    
    createSpreadProjectiles(weapon, dx, dy, distance) {
        const angle = Math.atan2(dy, dx);
        const spreadCount = 3 + Math.floor(weapon.level / 3);
        const spreadAngle = Math.PI / 6; // 30 degrees
        
        for (let i = 0; i < spreadCount; i++) {
            const offsetAngle = angle + (i - Math.floor(spreadCount / 2)) * (spreadAngle / spreadCount);
            this.projectiles.push({
                x: this.player.x,
                y: this.player.y,
                vx: Math.cos(offsetAngle) * weapon.projectileSpeed,
                vy: Math.sin(offsetAngle) * weapon.projectileSpeed,
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
            explosionRadius: 30
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
    
    createHomingMissile(weapon, targetEnemy) {
        this.projectiles.push({
            x: this.player.x,
            y: this.player.y,
            vx: 0,
            vy: 0,
            targetX: targetEnemy.x,
            targetY: targetEnemy.y,
            damage: weapon.damage,
            life: 180,
            type: 'missile',
            color: '#E67E22',
            size: 3,
            homing: true,
            explosionRadius: 60,
            speed: weapon.projectileSpeed || 3
        });
    }
    
    spawnEnemies() {
        this.frameCount++;
        
        // Increase difficulty over time
        const difficultyMultiplier = 1 + Math.floor(this.gameTime / 30) * 0.2;
        this.spawnRate = Math.max(30, 120 - Math.floor(this.gameTime / 10) * 5);
        
        if (this.frameCount - this.lastSpawn >= this.spawnRate) {
            const spawnCount = 1 + Math.floor(this.gameTime / 60);
            for (let i = 0; i < spawnCount; i++) {
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
                x = this.player.x + (Math.random() - 0.5) * this.canvas.width;
                y = this.player.y - spawnDistance;
                break;
            case 1: // Right
                x = this.player.x + spawnDistance;
                y = this.player.y + (Math.random() - 0.5) * this.canvas.height;
                break;
            case 2: // Bottom
                x = this.player.x + (Math.random() - 0.5) * this.canvas.width;
                y = this.player.y + spawnDistance;
                break;
            case 3: // Left
                x = this.player.x - spawnDistance;
                y = this.player.y + (Math.random() - 0.5) * this.canvas.height;
                break;
        }
        
        const enemyTypes = this.getAvailableEnemyTypes();
        const type = this.selectEnemyType(enemyTypes);
        const config = this.getEnemyConfig(type);
        
        this.enemies.push({
            x: x,
            y: y,
            radius: config.radius,
            speed: config.speed * (1 + Math.floor(this.gameTime / 60) * 0.1),
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
    }
    
    getAvailableEnemyTypes() {
        const time = this.gameTime;
        const types = ['basic'];
        
        if (time > 30) types.push('fast');
        if (time > 60) types.push('tank');
        if (time > 120) types.push('flyer');
        if (time > 180) types.push('phantom');
        
        return types;
    }
    
    selectEnemyType(types) {
        const weights = {
            'basic': 0.4,
            'fast': 0.25,
            'tank': 0.15,
            'flyer': 0.15,
            'phantom': 0.05
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
            }
            
            if (enemy.specialCooldown > 0) {
                enemy.specialCooldown--;
            }
            
            enemy.angle += enemy.rotSpeed;
            
            // Remove dead enemies
            if (enemy.health <= 0) {
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
                    if (projectile.homing && projectile.targetX !== undefined) {
                        const dx = projectile.targetX - projectile.x;
                        const dy = projectile.targetY - projectile.y;
                        const distance = Math.sqrt(dx * dx + dy * dy);
                        
                        if (distance > 0) {
                            projectile.vx = (dx / distance) * projectile.speed;
                            projectile.vy = (dy / distance) * projectile.speed;
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
                
                this.projectiles.splice(index, 1);
            }
        });
    }
    
    updateParticles() {
        this.particles.forEach((particle, index) => {
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.vx *= particle.friction || 0.95;
            particle.vy *= particle.friction || 0.95;
            particle.life--;
            particle.alpha = particle.life / particle.maxLife;
            
            if (particle.life <= 0) {
                this.particles.splice(index, 1);
            }
        });
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
                choices.push({
                    type: 'weapon_upgrade',
                    weaponIndex: index,
                    name: `${this.getWeaponName(weapon.type)} LV.${weapon.level + 1}`,
                    description: `+${Math.floor(weapon.damage * 0.3)} damage, faster fire rate`,
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
                <div class="levelup-title">LEVEL UP! Choose an upgrade:</div>
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
            container.style.cssText = `
                max-height: ${modalMaxHeight - 120}px;
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
                    min-height: 120px !important;
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
        // Projectile vs Enemy collisions
        this.projectiles.forEach((projectile, pIndex) => {
            let projectileHit = false;
            let hitCount = 0;
            const maxHits = projectile.piercing || 1;
            
            this.enemies.forEach((enemy, eIndex) => {
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
                this.projectiles.splice(pIndex, 1);
            }
        });
        
        // Enemy vs Player collisions
        this.enemies.forEach((enemy, index) => {
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
    }
    
    createExplosion(x, y, radius, damage) {
        // Create explosion particles
        for (let i = 0; i < 12; i++) {
            const angle = (Math.PI * 2 * i) / 12;
            this.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * 3,
                vy: Math.sin(angle) * 3,
                color: '#FF6B35',
                life: 40,
                maxLife: 40,
                size: 4,
                alpha: 1
            });
        }
        
        // Damage enemies in radius
        this.enemies.forEach(enemy => {
            const dx = enemy.x - x;
            const dy = enemy.y - y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance <= radius) {
                enemy.health -= damage * (1 - distance / radius);
                this.createHitParticles(enemy.x, enemy.y, '#FF6B35');
            }
        });
    }
    
    createHitParticles(x, y, color) {
        for (let i = 0; i < 6; i++) {
            this.particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 4,
                vy: (Math.random() - 0.5) * 4,
                color: color,
                life: 30,
                maxLife: 30,
                size: 2,
                alpha: 1
            });
        }
    }
    
    createDashParticles() {
        for (let i = 0; i < 8; i++) {
            this.particles.push({
                x: this.player.x + (Math.random() - 0.5) * 20,
                y: this.player.y + (Math.random() - 0.5) * 20,
                vx: (Math.random() - 0.5) * 2,
                vy: (Math.random() - 0.5) * 2,
                color: '#9B59B6',
                life: 40,
                maxLife: 40,
                size: 3,
                alpha: 1
            });
        }
    }
    
    createCriticalParticles(x, y) {
        for (let i = 0; i < 8; i++) {
            this.particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 6,
                vy: (Math.random() - 0.5) * 6,
                color: '#FFD700',
                life: 50,
                maxLife: 50,
                size: 4,
                alpha: 1
            });
        }
    }
    
    createTeleportParticles(x, y) {
        for (let i = 0; i < 10; i++) {
            this.particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 4,
                vy: (Math.random() - 0.5) * 4,
                color: '#9B59B6',
                life: 60,
                maxLife: 60,
                size: 2,
                alpha: 1
            });
        }
    }
    
    createDeathParticles(x, y, color) {
        for (let i = 0; i < 12; i++) {
            this.particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 6,
                vy: (Math.random() - 0.5) * 6,
                color: color,
                life: 60,
                maxLife: 60,
                size: 3,
                alpha: 1
            });
        }
    }
    
    showUpgradeNotification(title) {
        this.notifications.push({
            message: `${title} ACQUIRED!`,
            x: this.canvas.width / 2,
            y: this.canvas.height / 2 - 50,
            life: 120,
            maxLife: 120,
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
    
    draw() {
        if (!this.canvas || !this.ctx) return;
        
        // Clear canvas with dark background
        this.ctx.fillStyle = '#0a0a0a';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Apply camera transformation
        this.ctx.save();
        this.ctx.translate(-this.camera.x, -this.camera.y);
        
        this.drawGrid();
        this.drawPlayer();
        this.drawEnemies();
        this.drawProjectiles();
        this.drawXPOrbs();
        this.drawParticles();
        this.drawNotifications();
        
        // Restore transformation
        this.ctx.restore();
    }
    
    drawGrid() {
        const gridSize = 40;
        this.ctx.strokeStyle = 'rgba(155, 89, 182, 0.1)';
        this.ctx.lineWidth = 1;
        
        // Calculate visible grid area based on camera position
        const startX = Math.floor(this.camera.x / gridSize) * gridSize;
        const startY = Math.floor(this.camera.y / gridSize) * gridSize;
        const endX = startX + this.canvas.width + gridSize;
        const endY = startY + this.canvas.height + gridSize;
        
        // Draw vertical lines
        for (let x = startX; x < endX; x += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, startY);
            this.ctx.lineTo(x, endY);
            this.ctx.stroke();
        }
        
        // Draw horizontal lines
        for (let y = startY; y < endY; y += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(startX, y);
            this.ctx.lineTo(endX, y);
            this.ctx.stroke();
        }
        
        // Add some procedural elements - scattered dots for variety
        this.ctx.fillStyle = 'rgba(155, 89, 182, 0.05)';
        const dotSpacing = 120;
        const dotStartX = Math.floor(this.camera.x / dotSpacing) * dotSpacing;
        const dotStartY = Math.floor(this.camera.y / dotSpacing) * dotSpacing;
        
        for (let x = dotStartX; x < endX; x += dotSpacing) {
            for (let y = dotStartY; y < endY; y += dotSpacing) {
                // Use position-based randomness for consistent pattern
                const seed = (x / dotSpacing) * 1000 + (y / dotSpacing);
                if (Math.sin(seed) > 0.7) {
                    this.ctx.beginPath();
                    this.ctx.arc(x, y, 2, 0, Math.PI * 2);
                    this.ctx.fill();
                }
            }
        }
    }
    
    drawPlayer() {
        this.ctx.save();
        
        // Draw trail
        if (this.player.trail.length > 1) {
            this.ctx.strokeStyle = '#9B59B6';
            this.ctx.lineWidth = 3;
            this.ctx.globalAlpha = 0.3;
            
            this.ctx.beginPath();
            this.ctx.moveTo(this.player.trail[0].x, this.player.trail[0].y);
            for (let i = 1; i < this.player.trail.length; i++) {
                this.ctx.lineTo(this.player.trail[i].x, this.player.trail[i].y);
            }
            this.ctx.stroke();
        }
        
        // Draw player
        this.ctx.globalAlpha = this.player.invulnerable > 0 ? 0.5 : 1;
        
        // Glow effect
        const glowSize = 20 + Math.sin(this.player.glow) * 5;
        const gradient = this.ctx.createRadialGradient(
            this.player.x, this.player.y, 0,
            this.player.x, this.player.y, glowSize
        );
        gradient.addColorStop(0, 'rgba(155, 89, 182, 0.4)');
        gradient.addColorStop(1, 'rgba(155, 89, 182, 0)');
        
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(
            this.player.x - glowSize,
            this.player.y - glowSize,
            glowSize * 2,
            glowSize * 2
        );
        
        // Player body
        this.ctx.fillStyle = '#9B59B6';
        this.ctx.strokeStyle = '#FFFFFF';
        this.ctx.lineWidth = 2;
        
        this.ctx.beginPath();
        this.ctx.arc(this.player.x, this.player.y, this.player.radius, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.stroke();
        
        this.ctx.restore();
    }
    
    drawEnemies() {
        this.enemies.forEach(enemy => {
            this.ctx.save();
            this.ctx.translate(enemy.x, enemy.y);
            this.ctx.rotate(enemy.angle);
            
            // Enemy glow
            const gradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, enemy.radius * 2);
            gradient.addColorStop(0, enemy.color + '40');
            gradient.addColorStop(1, enemy.color + '00');
            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(-enemy.radius * 2, -enemy.radius * 2, enemy.radius * 4, enemy.radius * 4);
            
            // Enemy body
            this.ctx.fillStyle = enemy.color;
            this.ctx.strokeStyle = '#FFFFFF';
            this.ctx.lineWidth = 1;
            
            // Different shapes for different enemy types
            switch (enemy.behavior) {
                case 'tank':
                    this.ctx.fillRect(-enemy.radius, -enemy.radius, enemy.radius * 2, enemy.radius * 2);
                    this.ctx.strokeRect(-enemy.radius, -enemy.radius, enemy.radius * 2, enemy.radius * 2);
                    break;
                case 'flyer':
                    this.ctx.beginPath();
                    this.ctx.moveTo(0, -enemy.radius);
                    this.ctx.lineTo(enemy.radius, enemy.radius);
                    this.ctx.lineTo(-enemy.radius, enemy.radius);
                    this.ctx.closePath();
                    this.ctx.fill();
                    this.ctx.stroke();
                    break;
                case 'phantom':
                    this.ctx.globalAlpha = 0.7;
                    this.ctx.beginPath();
                    for (let i = 0; i < 6; i++) {
                        const angle = (Math.PI * 2 * i) / 6;
                        const radius = enemy.radius + Math.sin(this.frameCount * 0.1 + i) * 2;
                        if (i === 0) {
                            this.ctx.moveTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
                        } else {
                            this.ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
                        }
                    }
                    this.ctx.closePath();
                    this.ctx.fill();
                    this.ctx.stroke();
                    break;
                default:
                    this.ctx.beginPath();
                    this.ctx.arc(0, 0, enemy.radius, 0, Math.PI * 2);
                    this.ctx.fill();
                    this.ctx.stroke();
                    break;
            }
            
            // Health bar
            if (enemy.health < enemy.maxHealth) {
                const barWidth = enemy.radius * 2;
                const barHeight = 3;
                const healthPercent = enemy.health / enemy.maxHealth;
                
                this.ctx.fillStyle = '#333';
                this.ctx.fillRect(-barWidth / 2, -enemy.radius - 8, barWidth, barHeight);
                
                this.ctx.fillStyle = healthPercent > 0.5 ? '#4CAF50' : healthPercent > 0.25 ? '#FF9800' : '#F44336';
                this.ctx.fillRect(-barWidth / 2, -enemy.radius - 8, barWidth * healthPercent, barHeight);
            }
            
            // Burning effect
            if (enemy.burning) {
                this.ctx.globalAlpha = 0.8;
                this.ctx.fillStyle = '#FF6B35';
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
            }
            
            this.ctx.restore();
        });
    }
    
    drawXPOrbs() {
        this.xpOrbs.forEach(orb => {
            this.ctx.save();
            
            // Glow effect
            const glowIntensity = 0.5 + Math.sin(orb.glow) * 0.3;
            const gradient = this.ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, 15);
            gradient.addColorStop(0, `rgba(155, 89, 182, ${glowIntensity})`);
            gradient.addColorStop(1, 'rgba(155, 89, 182, 0)');
            
            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(orb.x - 15, orb.y - 15, 30, 30);
            
            // Orb body
            this.ctx.fillStyle = '#9B59B6';
            this.ctx.strokeStyle = '#FFFFFF';
            this.ctx.lineWidth = 1;
            
            this.ctx.beginPath();
            this.ctx.arc(orb.x, orb.y, 5, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.stroke();
            
            this.ctx.restore();
        });
    }
    
    drawParticles() {
        this.particles.forEach(particle => {
            this.ctx.save();
            this.ctx.globalAlpha = particle.alpha;
            this.ctx.fillStyle = particle.color;
            
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            this.ctx.fill();
            
            this.ctx.restore();
        });
    }
    
    drawNotifications() {
        this.notifications.forEach(notification => {
            this.ctx.save();
            this.ctx.globalAlpha = notification.alpha;
            this.ctx.fillStyle = '#FFD700';
            this.ctx.strokeStyle = '#000000';
            this.ctx.lineWidth = 2;
            this.ctx.font = 'bold 24px Arial';
            this.ctx.textAlign = 'center';
            
            this.ctx.strokeText(notification.message, notification.x, notification.y);
            this.ctx.fillText(notification.message, notification.x, notification.y);
            
            this.ctx.restore();
        });
    }
    
    updateUI() {
        // Health bar
        const healthPercent = (this.player.health / this.player.maxHealth) * 100;
        const healthFill = document.getElementById('health-fill');
        const healthText = document.getElementById('health-text');
        if (healthFill && healthText) {
            healthFill.style.width = `${Math.max(0, healthPercent)}%`;
            healthText.textContent = `${Math.max(0, Math.floor(this.player.health))}/${this.player.maxHealth}`;
        }
        
        // XP bar
        const xpRequired = this.player.level * 5 + 10;
        const xpPercent = (this.player.xp / xpRequired) * 100;
        const xpFill = document.getElementById('xp-fill');
        const levelText = document.getElementById('level-text');
        if (xpFill && levelText) {
            xpFill.style.width = `${xpPercent}%`;
            levelText.textContent = `Level ${this.player.level}`;
        }
        
        // Time display
        const timeDisplay = document.getElementById('time-display');
        if (timeDisplay) {
            const minutes = Math.floor(this.gameTime / 60);
            const seconds = Math.floor(this.gameTime % 60);
            timeDisplay.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }
        
        // Position display
        const positionDisplay = document.getElementById('position-display');
        if (positionDisplay) {
            const x = Math.floor(this.player.x);
            const y = Math.floor(this.player.y);
            positionDisplay.textContent = `Position: ${x}, ${y}`;
        }
        
        // Weapon display
        const weaponDisplay = document.getElementById('weapon-display');
        if (weaponDisplay) {
            weaponDisplay.innerHTML = this.weapons.map(weapon => `
                <div class="weapon-item">
                    <div class="weapon-icon">${weapon.level}</div>
                    <span>${this.getWeaponName(weapon.type)}</span>
                </div>
            `).join('');
        }
    }
    
    gameOver() {
        this.gameRunning = false;
        
        console.log('Game over triggered');
        
        // CRITICAL FIX: Show modal header for game over screen
        this.showModalHeader();
        
        
        // IMMEDIATE OVERLAY REMOVAL - before doing anything else
        console.log('=== EMERGENCY OVERLAY REMOVAL ===');
        try {
            // Find and remove any invisible high z-index overlays immediately
            const allElements = document.querySelectorAll('*');
            let removedOverlays = 0;
            
            allElements.forEach(el => {
                const style = window.getComputedStyle(el);
                const zIndex = parseInt(style.zIndex);
                const opacity = parseFloat(style.opacity);
                const display = style.display;
                
                // Remove elements that are likely invisible overlays (but preserve header)
                if ((zIndex > 50000 || 
                    (zIndex > 10000 && opacity < 0.1) ||
                    (display !== 'none' && zIndex > 20000 && el.innerHTML.trim() === '')) &&
                    !el.className.includes('vibe-survivor-header')) {
                    console.log('Removing overlay element:', {
                        tag: el.tagName,
                        id: el.id,
                        className: el.className,
                        zIndex: zIndex,
                        opacity: opacity,
                        display: display
                    });
                    el.remove();
                    removedOverlays++;
                }
            });
            
            console.log(`Emergency removal: ${removedOverlays} overlay elements removed`);
        } catch (e) {
            console.error('Error during emergency overlay removal:', e);
        }
        
        // Switch to game over screen first
        document.querySelectorAll('.vibe-survivor-screen').forEach(screen => screen.classList.remove('active'));
        const gameOverScreen = document.getElementById('survivor-game-over-screen');
        if (gameOverScreen) {
            gameOverScreen.classList.add('active');
            console.log('Game over screen activated');
        } else {
            console.error('Game over screen element not found');
        }
        
        // Calculate final stats
        const minutes = Math.floor(this.gameTime / 60);
        const seconds = Math.floor(this.gameTime % 60);
        const timeText = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        const finalStats = {
            level: this.player.level,
            time: Math.floor(this.gameTime),
            timeText: timeText,
            enemiesKilled: Math.max(1, Math.floor(this.gameTime * 1.8)),
            weaponsObtained: this.weapons.length,
            passivesObtained: Object.keys(this.player.passives).length
        };
        
        // Save high score if better
        const currentScore = this.gameTime;
        const highScore = parseFloat(localStorage.getItem('vibe-survivor-high-score') || '0');
        const isNewRecord = currentScore > highScore;
        
        if (isNewRecord) {
            localStorage.setItem('vibe-survivor-high-score', currentScore.toString());
        }
        
        // Create comprehensive stats HTML
        const statsHTML = `
            <div style="text-align: left; color: white; font-size: 16px; line-height: 1.6; max-height: 400px; overflow-y: auto; padding: 10px;">
                ${isNewRecord ? '<div style="color: #FFD700; font-weight: bold; text-align: center; margin-bottom: 15px; font-size: 18px;">🏆 NEW RECORD! 🏆</div>' : ''}
                
                <div style="margin-bottom: 12px;">
                    <strong style="color: #9B59B6; font-size: 18px;">📊 Final Stats</strong>
                </div>
                
                <div style="margin-left: 15px; margin-bottom: 20px;">
                    <div style="margin: 8px 0;"><strong>Level Reached:</strong> <span style="color: #E74C3C; font-size: 18px; font-weight: bold;">${finalStats.level}</span></div>
                    <div style="margin: 8px 0;"><strong>Survival Time:</strong> <span style="color: #3498DB; font-size: 18px; font-weight: bold;">${finalStats.timeText}</span></div>
                    <div style="margin: 8px 0;"><strong>Enemies Defeated:</strong> <span style="color: #E67E22; font-size: 18px; font-weight: bold;">${finalStats.enemiesKilled}</span></div>
                    <div style="margin: 8px 0;"><strong>Weapons Collected:</strong> <span style="color: #9B59B6; font-size: 18px; font-weight: bold;">${finalStats.weaponsObtained}</span></div>
                    <div style="margin: 8px 0;"><strong>Passive Abilities:</strong> <span style="color: #27AE60; font-size: 18px; font-weight: bold;">${finalStats.passivesObtained}</span></div>
                </div>
                
                <div style="margin-bottom: 10px;">
                    <strong style="color: #9B59B6; font-size: 16px;">🔫 Weapons Mastered</strong>
                </div>
                
                <div style="margin-left: 15px; display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 20px;">
                    ${this.weapons.map(weapon => `
                        <div style="background: rgba(155, 89, 182, 0.3); padding: 6px 12px; border-radius: 6px; border: 2px solid #9B59B6; font-size: 13px; color: white;">
                            <strong>${this.getWeaponName(weapon.type)}</strong> Lv.${weapon.level}
                        </div>
                    `).join('')}
                </div>
                
                ${Object.keys(this.player.passives).length > 0 ? `
                    <div style="margin-bottom: 10px;">
                        <strong style="color: #9B59B6; font-size: 16px;">✨ Abilities Unlocked</strong>
                    </div>
                    
                    <div style="margin-left: 15px; display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 20px;">
                        ${Object.keys(this.player.passives).map(passive => {
                            const passiveNames = {
                                'health_boost': '❤️ Health Boost',
                                'speed_boost': '💨 Speed Boost', 
                                'regeneration': '🔄 Regeneration',
                                'magnet': '🧲 Magnet',
                                'armor': '🛡️ Armor',
                                'critical': '💥 Critical Strike'
                            };
                            return `<div style="background: rgba(46, 204, 113, 0.3); padding: 5px 10px; border-radius: 5px; border: 2px solid #27AE60; font-size: 12px; color: white;">${passiveNames[passive] || passive}</div>`;
                        }).join('')}
                    </div>
                ` : ''}
                
                <div style="margin-top: 20px; text-align: center; color: #BDC3C7; font-size: 14px; padding: 10px; background: rgba(0,0,0,0.3); border-radius: 5px;">
                    ${isNewRecord ? '🎉 Amazing performance! You set a new record! 🎉' : `🏆 Personal Best: ${Math.floor(highScore / 60)}:${(Math.floor(highScore) % 60).toString().padStart(2, '0')}`}
                </div>
            </div>
        `;
        
        // NUCLEAR OPTION: Recreate entire modal to eliminate overlays
        console.log('=== NUCLEAR MODAL RECREATION ===');
        
        // FORCE STOP any background game loop
        this.gameRunning = false;
        console.log('Background game forcefully stopped');
        
        // Remove ALL existing modals and overlays
        const existingModals = document.querySelectorAll('[id*="modal"], [class*="modal"], .vibe-survivor-modal, #vibe-survivor-modal');
        console.log(`Removing ${existingModals.length} existing modal elements`);
        existingModals.forEach(modal => modal.remove());
        
        // Create completely fresh modal
        const newModalHTML = `
            <div id="fresh-game-over-modal" style="
                position: fixed !important;
                top: 0 !important; left: 0 !important;
                width: 100vw !important; height: 100vh !important;
                background: rgba(0,0,0,0.95) !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                z-index: 999999 !important;
                font-family: Arial, sans-serif !important;
            ">
                <div style="
                    background: linear-gradient(135deg, #1a1a2e, #16213e) !important;
                    border: 3px solid #E74C3C !important;
                    border-radius: 15px !important;
                    padding: 40px !important;
                    text-align: center !important;
                    color: white !important;
                    max-width: 600px !important;
                    box-shadow: 0 0 50px rgba(231,76,60,0.5) !important;
                ">
                    <h1 style="color: #E74C3C !important; font-size: 48px !important; margin: 0 0 30px 0 !important;">GAME OVER</h1>
                    
                    <div style="background: rgba(0,0,0,0.8) !important; padding: 20px !important; border-radius: 10px !important; margin-bottom: 30px !important;">
                        <div style="font-size: 24px !important; line-height: 1.6 !important;">
                            <div>Level: <span style="color: #E74C3C !important; font-weight: bold !important;">${finalStats.level}</span></div>
                            <div>Time: <span style="color: #3498DB !important; font-weight: bold !important;">${finalStats.timeText}</span></div>
                            <div>Enemies: <span style="color: #E67E22 !important; font-weight: bold !important;">${finalStats.enemiesKilled}</span></div>
                        </div>
                    </div>
                    
                    <button id="fresh-restart-btn" style="
                        background: #E74C3C !important; color: white !important; border: none !important;
                        padding: 15px 30px !important; font-size: 20px !important; border-radius: 25px !important;
                        margin: 0 10px !important; font-weight: bold !important;
                    ">PLAY AGAIN</button>
                    
                    <button id="fresh-exit-btn" style="
                        background: #9B59B6 !important; color: white !important; border: none !important;
                        padding: 15px 30px !important; font-size: 20px !important; border-radius: 25px !important;
                        margin: 0 10px !important; font-weight: bold !important;
                    ">EXIT</button>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', newModalHTML);
        
        
        // Attach event listeners to new buttons
        document.getElementById('fresh-restart-btn').addEventListener('click', () => {
            console.log('Fresh restart button clicked - implementing clean restart');
            
            // COMPLETELY STOP the background game
            this.gameRunning = false;
            
            // Clear any existing intervals or timeouts that might keep the game running
            if (this.gameLoopId) {
                cancelAnimationFrame(this.gameLoopId);
                this.gameLoopId = null;
            }
            
            // Remove the nuclear modal
            const nuclearModal = document.getElementById('fresh-game-over-modal');
            if (nuclearModal) {
                nuclearModal.remove();
            }
            
            // Clean restart - ensure we start fresh without modal conflicts
            this.cleanRestart();
        });
        
        document.getElementById('fresh-exit-btn').addEventListener('click', () => {
            console.log('Fresh exit button clicked - implementing clean exit');
            
            // COMPLETELY STOP the background game
            this.gameRunning = false;
            
            // Clear any existing intervals or timeouts that might keep the game running
            if (this.gameLoopId) {
                cancelAnimationFrame(this.gameLoopId);
                this.gameLoopId = null;
            }
            
            // Remove the nuclear modal
            const nuclearModal = document.getElementById('fresh-game-over-modal');
            if (nuclearModal) {
                nuclearModal.remove();
            }
            
            // Clean exit - completely reset state
            this.cleanExit();
        });
        
        console.log('Fresh modal created successfully - SHOULD BE VISIBLE NOW!');
        return; // Exit early to use new modal
        
        // Direct HTML replacement approach to bypass any CSS issues
        console.log('Replacing game over screen content entirely...');
        if (gameOverScreen) {
            // Completely replace the game over screen content with stats
            // Ultra-simple test content to isolate the issue
            gameOverScreen.innerHTML = `
                <div style="width: 100%; height: 100%; background: blue; color: white; font-size: 30px; display: flex; align-items: center; justify-content: center;">
                    <div style="text-align: center; padding: 50px; background: rgba(255,255,255,0.2);">
                        <h1 style="color: yellow; font-size: 50px; margin: 20px 0;">GAME OVER TEST</h1>
                        <p style="color: white; font-size: 25px;">Level: ${finalStats.level}</p>
                        <p style="color: white; font-size: 25px;">Time: ${finalStats.timeText}</p>
                        <button id="restart-survivor" style="background: red; color: white; padding: 20px; font-size: 20px; border: none; margin: 20px;">RESTART</button>
                    </div>
                </div>
            `;
            
            // Re-attach button event listeners since we replaced the HTML
            const restartBtn = document.getElementById('restart-survivor');
            const exitBtn = document.getElementById('exit-survivor');
            
            if (restartBtn) {
                restartBtn.addEventListener('click', () => {
                    console.log('Restart button clicked');
                    this.startGame();
                });
            }
            
            if (exitBtn) {
                exitBtn.addEventListener('click', () => {
                    console.log('Exit button clicked');
                    this.closeGame();
                });
            }
            
            // Force visibility and override any CSS issues
            gameOverScreen.style.cssText = `
                display: flex !important;
                visibility: visible !important;
                opacity: 1 !important;
                height: 100% !important;
                width: 100% !important;
                position: absolute !important;
                top: 0 !important;
                left: 0 !important;
                z-index: 100000 !important;
                background: rgba(26, 26, 46, 0.98) !important;
                align-items: center !important;
                justify-content: center !important;
                flex-direction: column !important;
                padding: 20px !important;
                box-sizing: border-box !important;
                overflow-y: auto !important;
                pointer-events: auto !important;
            `;
            
            // Add click debugging to game over screen
            gameOverScreen.addEventListener('click', (e) => {
                console.log('Game over screen clicked!', e.target);
                e.stopPropagation();
            });
            
            // REMOVE ANY POTENTIAL OVERLAYS
            console.log('=== REMOVING POTENTIAL OVERLAYS ===');
            // Remove any elements that might be covering our modal
            const potentialOverlays = document.querySelectorAll('div[style*="position: fixed"], div[style*="position: absolute"]');
            let removedCount = 0;
            potentialOverlays.forEach(overlay => {
                const zIndex = parseInt(window.getComputedStyle(overlay).zIndex);
                const opacity = parseFloat(window.getComputedStyle(overlay).opacity);
                // Remove invisible high z-index elements that might be blocking (but preserve header)
                if (zIndex > 10000 && (opacity === 0 || overlay.innerHTML.trim() === '') &&
                    !overlay.className.includes('vibe-survivor-header')) {
                    console.log('Removing potential overlay:', overlay);
                    overlay.remove();
                    removedCount++;
                }
            });
            console.log(`Removed ${removedCount} potential overlay elements`);
            
            // Force entire modal structure to be visible
            const modal = document.getElementById('vibe-survivor-modal');
            const container = document.getElementById('vibe-survivor-container');
            
            if (modal) {
                modal.style.cssText = `
                    position: fixed !important;
                    top: 0 !important;
                    left: 0 !important;
                    width: 100% !important;
                    height: 100% !important;
                    background: rgba(0, 0, 0, 0.9) !important;
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    z-index: 99999 !important;
                    visibility: visible !important;
                    opacity: 1 !important;
                    pointer-events: auto !important;
                `;
                
                // Add click debugging to modal
                modal.addEventListener('click', (e) => {
                    console.log('Modal clicked!', e.target);
                });
                
                console.log('Modal forced visible with highest z-index');
            }
            
            if (container) {
                container.style.cssText = `
                    background: linear-gradient(135deg, #1a1a2e, #16213e) !important;
                    border: 2px solid #9B59B6 !important;
                    border-radius: 15px !important;
                    width: 95% !important;
                    max-width: 900px !important;
                    height: 90% !important;
                    position: relative !important;
                    display: block !important;
                    visibility: visible !important;
                    opacity: 1 !important;
                `;
                console.log('Container forced visible');
            }
            
            console.log('Game over screen content replaced successfully with stats');
            console.log('Game over screen HTML length:', gameOverScreen.innerHTML.length);
            console.log('First 200 chars of content:', gameOverScreen.innerHTML.substring(0, 200));
            console.log('Game over screen computed style display:', window.getComputedStyle(gameOverScreen).display);
            console.log('Game over screen computed style visibility:', window.getComputedStyle(gameOverScreen).visibility);
            console.log('Game over screen computed style opacity:', window.getComputedStyle(gameOverScreen).opacity);
            console.log('Game over screen z-index:', window.getComputedStyle(gameOverScreen).zIndex);
            
            // Add a bright border to the game over screen for debugging
            gameOverScreen.style.border = '5px solid red';
            console.log('Game over screen computed style display:', window.getComputedStyle(gameOverScreen).display);
            console.log('Game over screen computed style visibility:', window.getComputedStyle(gameOverScreen).visibility);
            console.log('Game over screen computed style opacity:', window.getComputedStyle(gameOverScreen).opacity);
            
            // Add a bright border to the game over screen for debugging
            gameOverScreen.style.border = '5px solid red';
            
            // Content should now be visible without test overlay
        } else {
            console.error('Game over screen element not found for replacement');
        }
    }
    
    restartGame() {
        this.startGame();
    }
    

    closeGame() {
        this.gameRunning = false;
        
        
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
            console.log('Notified Game Manager of clean exit');
        }
        
        console.log('Clean exit completed - game state fully reset');
    }
}

// Initialize when ready - prevent multiple instances
console.log('VibeSurvivor class defined, initializing...');

// Prevent multiple instances
if (window.vibeSurvivor) {
    console.log('VibeSurvivor already exists, not creating duplicate');
} else {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            console.log('DOMContentLoaded - creating VibeSurvivor instance');
            if (!window.vibeSurvivor) {
                window.vibeSurvivor = new VibeSurvivor();
                console.log('window.vibeSurvivor created:', !!window.vibeSurvivor);
            }
        });
    } else {
        console.log('Document ready - creating VibeSurvivor instance with delay');
        setTimeout(() => {
            if (!window.vibeSurvivor) {
                window.vibeSurvivor = new VibeSurvivor();
                console.log('window.vibeSurvivor created:', !!window.vibeSurvivor);
            }
        }, 200);
    }
}