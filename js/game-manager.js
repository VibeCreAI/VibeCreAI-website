// Game Manager - Central coordinator for Vibe Runner and Vibe Survivor
class GameManager {
    constructor() {
        this.currentGame = null;
        this.vibeRunner = null;
        this.vibeSurvivor = null;
        
        this.initializeManager();
    }
    
    initializeManager() {
        // Wait for DOM to be ready before setting up event listeners
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.setupEventListeners();
            });
        } else {
            setTimeout(() => {
                this.setupEventListeners();
            }, 100);
        }
    }
    
    setupEventListeners() {
        // Set up event listeners for game buttons
        const vibeRunnerBtn = document.getElementById('vibe-runner-btn');
        const vibeSurvivorBtn = document.getElementById('vibe-survivor-btn');
        
        if (vibeRunnerBtn) {
            vibeRunnerBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.launchVibeRunner();
            });
        }
        
        if (vibeSurvivorBtn) {
            vibeSurvivorBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.launchVibeSurvivor();
            });
        }
    }
    
    launchVibeRunner() {
        console.log('🎮 LAUNCHING VIBE RUNNER - Pausing background animations...');
        
        // Close any existing game first
        this.closeCurrentGame();
        
        // Pause background animations for performance
        this.pauseBackgroundAnimations();
        
        // Add body class to prevent terminal height changes
        document.body.classList.add('game-modal-open');
        
        // Ensure Vibe Runner is available
        if (window.vibeRunner) {
            this.vibeRunner = window.vibeRunner;
            this.currentGame = 'vibe-runner';
            this.vibeRunner.launchGame();
        } else {
            console.error('Vibe Runner not available');
            this.showLoadingScreen('Vibe Runner');
        }
    }
    
    launchVibeSurvivor() {
        console.log('🎮 LAUNCHING VIBE SURVIVOR - Pausing background animations...');
        
        // Close any existing game first
        this.closeCurrentGame();
        
        // Pause background animations for performance
        this.pauseBackgroundAnimations();
        
        // Add body class to prevent terminal height changes
        document.body.classList.add('game-modal-open');
        
        // Check if Vibe Survivor is loaded, if not load it
        if (window.vibeSurvivor) {
            this.vibeSurvivor = window.vibeSurvivor;
            this.currentGame = 'vibe-survivor';
            this.vibeSurvivor.launchGame();
        } else {
            // Load Vibe Survivor game if not already loaded
            this.loadVibeSurvivor();
        }
    }
    
    loadVibeSurvivor() {
        // Check if script is already loading or loaded
        if (document.querySelector('script[src="js/vibe-survivor-game.js"]')) {
            // Script is already loaded or loading, wait for it
            const checkInterval = setInterval(() => {
                if (window.vibeSurvivor) {
                    clearInterval(checkInterval);
                    this.vibeSurvivor = window.vibeSurvivor;
                    this.currentGame = 'vibe-survivor';
                    this.vibeSurvivor.launchGame();
                }
            }, 100);
            return;
        }
        
        const script = document.createElement('script');
        script.src = 'js/vibe-survivor-game.js';
        script.defer = true;
        
        script.onload = () => {
            // Vibe Survivor loaded
            // Give it a moment to initialize
            setTimeout(() => {
                if (window.vibeSurvivor) {
                    this.vibeSurvivor = window.vibeSurvivor;
                    this.currentGame = 'vibe-survivor';
                    this.vibeSurvivor.launchGame();
                } else {
                    // Show loading screen instead of error message
                    this.showLoadingScreen('Vibe Survivor');
                }
            }, 100);
        };
        
        script.onerror = () => {
            // Show loading screen for network issues
            this.showLoadingScreen('Vibe Survivor');
        };
        
        document.head.appendChild(script);
    }
    
    closeCurrentGame() {
        // Remove game modal class to restore normal terminal behavior
        document.body.classList.remove('game-modal-open');
        if (this.currentGame === 'vibe-runner' && this.vibeRunner) {
            // Close Vibe Runner if it has a close method
            const runnerContainer = document.getElementById('vibe-runner-container');
            if (runnerContainer) {
                runnerContainer.classList.add('vibe-runner-hidden');
            }
            // Stop any background music
            if (this.vibeRunner.backgroundMusic) {
                this.vibeRunner.backgroundMusic.pause();
                this.vibeRunner.backgroundMusic.currentTime = 0;
            }
        }
        
        if (this.currentGame === 'vibe-survivor' && this.vibeSurvivor) {
            // Close Vibe Survivor if it has a close method
            if (this.vibeSurvivor.closeGame) {
                this.vibeSurvivor.closeGame();
            }
        }
        
        this.currentGame = null;
    }
    
    pauseBackgroundAnimations() {
        console.log('🛑 PAUSING: Background animations for game launch...');
        
        // Use the existing PerformanceManager system
        if (window.PerformanceManager) {
            window.PerformanceManager.pauseBackgroundAnimations();
            console.log('✅ Background animations paused using PerformanceManager');
        } else {
            // Fallback: direct animation stopping
            try {
                // Cancel specific animation frames
                if (window.neuralNetworkAnimation) {
                    cancelAnimationFrame(window.neuralNetworkAnimation);
                    window.neuralNetworkAnimation = null;
                    console.log('💀 Neural network animation stopped');
                }
                
                if (window.matrixInterval) {
                    clearInterval(window.matrixInterval);
                    window.matrixInterval = null;
                    console.log('💀 Matrix rain animation stopped');
                }
                
                // Clear and hide canvases
                const neuralCanvas = document.getElementById('neural-network');
                if (neuralCanvas) {
                    const ctx = neuralCanvas.getContext('2d');
                    ctx.fillStyle = '#0a0a0a';
                    ctx.fillRect(0, 0, neuralCanvas.width, neuralCanvas.height);
                    neuralCanvas.style.display = 'none';
                    console.log('💀 Neural canvas cleared and hidden');
                }
                
                const matrixCanvas = document.getElementById('matrix');
                if (matrixCanvas) {
                    const ctx = matrixCanvas.getContext('2d');
                    ctx.fillStyle = '#0a0a0a';
                    ctx.fillRect(0, 0, matrixCanvas.width, matrixCanvas.height);
                    matrixCanvas.style.display = 'none';
                    console.log('💀 Matrix canvas cleared and hidden');
                }
                
                console.log('✅ Background animations paused using fallback method');
                
            } catch (e) {
                console.warn('Error pausing background animations:', e);
            }
        }
    }
    
    showLoadingScreen(gameName) {
        // Create a neon-themed loading screen overlay (similar to game over screen)
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'game-loading-screen';
        loadingDiv.innerHTML = `
            <div class="loading-container">
                <div class="loading-logo">🎮</div>
                <h3>Loading ${gameName}...</h3>
                <div class="loading-progress">
                    <div class="loading-bar">
                        <div class="loading-fill"></div>
                    </div>
                    <p class="loading-text">Preparing your gaming experience...</p>
                </div>
            </div>
        `;
        
        const loadingStyle = document.createElement('style');
        loadingStyle.textContent = `
            .game-loading-screen {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: transparent;
                backdrop-filter: blur(5px);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 100000;
                animation: loadingFadeIn 0.5s ease;
            }
            
            .loading-container {
                background: linear-gradient(135deg, #0a0a1a, #1a0a2a);
                border: 2px solid #00ffff;
                border-radius: 15px;
                padding: 40px;
                text-align: center;
                color: white;
                max-width: 400px;
                box-shadow: 0 0 30px rgba(0, 255, 255, 0.5);
            }
            
            .loading-logo {
                font-size: 60px;
                margin-bottom: 20px;
                animation: loadingPulse 1.5s ease-in-out infinite;
            }
            
            .loading-container h3 {
                color: #ff0066;
                margin-bottom: 30px;
                font-size: 24px;
                text-shadow: 0 0 15px rgba(255, 0, 102, 0.8);
            }
            
            .loading-progress {
                margin-bottom: 20px;
            }
            
            .loading-bar {
                width: 100%;
                height: 6px;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 3px;
                overflow: hidden;
                margin-bottom: 15px;
            }
            
            .loading-fill {
                height: 100%;
                background: linear-gradient(90deg, #00ffff, #ff00ff);
                border-radius: 3px;
                width: 0%;
                animation: loadingProgress 2s ease-in-out infinite;
                box-shadow: 0 0 10px rgba(0, 255, 255, 0.5);
            }
            
            .loading-text {
                color: #00ffff;
                font-size: 14px;
                margin: 0;
                animation: loadingText 2s ease-in-out infinite;
            }
            
            @keyframes loadingFadeIn {
                0% { opacity: 0; }
                100% { opacity: 1; }
            }
            
            @keyframes loadingPulse {
                0%, 100% { transform: scale(1); opacity: 0.8; }
                50% { transform: scale(1.1); opacity: 1; }
            }
            
            @keyframes loadingProgress {
                0% { width: 0%; }
                50% { width: 70%; }
                100% { width: 100%; }
            }
            
            @keyframes loadingText {
                0%, 100% { opacity: 0.7; }
                50% { opacity: 1; }
            }
        `;
        
        document.head.appendChild(loadingStyle);
        document.body.appendChild(loadingDiv);
        
        // Auto-close after 3 seconds with fade out
        setTimeout(() => {
            loadingDiv.style.animation = 'loadingFadeOut 0.5s ease forwards';
            setTimeout(() => {
                if (loadingDiv.parentNode) {
                    loadingDiv.remove();
                    loadingStyle.remove();
                }
            }, 500);
        }, 3000);
        
        // Add fade out animation
        const fadeOutStyle = document.createElement('style');
        fadeOutStyle.textContent = `
            @keyframes loadingFadeOut {
                0% { opacity: 1; }
                100% { opacity: 0; }
            }
        `;
        document.head.appendChild(fadeOutStyle);
    }
}

// Initialize Game Manager when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.gameManager = new GameManager();
    });
} else {
    setTimeout(() => {
        window.gameManager = new GameManager();
    }, 100);
}