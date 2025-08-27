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
        console.log('Launching Vibe Runner...');
        
        // Close any existing game first
        this.closeCurrentGame();
        
        // Ensure Vibe Runner is available
        if (window.vibeRunner) {
            this.vibeRunner = window.vibeRunner;
            this.currentGame = 'vibe-runner';
            this.vibeRunner.launchGame();
        } else {
            console.error('Vibe Runner not available');
            this.showGameNotReadyMessage('Vibe Runner');
        }
    }
    
    launchVibeSurvivor() {
        console.log('Launching Vibe Survivor...');
        
        // Close any existing game first
        this.closeCurrentGame();
        
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
            console.log('Vibe Survivor loaded successfully');
            // Give it a moment to initialize
            setTimeout(() => {
                if (window.vibeSurvivor) {
                    this.vibeSurvivor = window.vibeSurvivor;
                    this.currentGame = 'vibe-survivor';
                    this.vibeSurvivor.launchGame();
                } else {
                    console.error('Vibe Survivor failed to initialize');
                    this.showGameNotReadyMessage('Vibe Survivor');
                }
            }, 100);
        };
        
        script.onerror = () => {
            console.error('Failed to load Vibe Survivor');
            this.showGameNotReadyMessage('Vibe Survivor');
        };
        
        document.head.appendChild(script);
    }
    
    closeCurrentGame() {
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
    
    showGameNotReadyMessage(gameName) {
        // Create a temporary message overlay
        const messageDiv = document.createElement('div');
        messageDiv.className = 'game-not-ready-message';
        messageDiv.innerHTML = `
            <div class="message-content">
                <h3>🚧 ${gameName} Not Ready Yet! 🚧</h3>
                <p>This game is still being prepared. Please try again in a moment!</p>
                <button class="message-close-btn">OK</button>
            </div>
        `;
        
        const messageStyle = document.createElement('style');
        messageStyle.textContent = `
            .game-not-ready-message {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: linear-gradient(135deg, #1a0a0a, #2a0a1a);
                border: 2px solid #ff6b6b;
                border-radius: 15px;
                padding: 30px;
                z-index: 100000;
                animation: messageSlideIn 0.5s ease;
                box-shadow: 0 0 40px rgba(255, 107, 107, 0.5);
            }
            
            .message-content h3 {
                color: #ff6b6b;
                margin-bottom: 15px;
                text-align: center;
                font-size: 20px;
                text-shadow: 0 0 20px rgba(255, 107, 107, 0.8);
            }
            
            .message-content p {
                color: #fff;
                margin-bottom: 20px;
                text-align: center;
                font-size: 14px;
                opacity: 0.9;
            }
            
            .message-close-btn {
                display: block;
                margin: 0 auto;
                padding: 10px 25px;
                border: 2px solid #ff6b6b;
                background: transparent;
                color: #ff6b6b;
                font-weight: bold;
                cursor: pointer;
                transition: all 0.3s ease;
                font-size: 14px;
                border-radius: 20px;
            }
            
            .message-close-btn:hover {
                background: rgba(255, 107, 107, 0.2);
                box-shadow: 0 0 20px rgba(255, 107, 107, 0.5);
            }
            
            @keyframes messageSlideIn {
                0% { transform: translate(-50%, -50%) scale(0.8); opacity: 0; }
                100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
            }
        `;
        
        document.head.appendChild(messageStyle);
        document.body.appendChild(messageDiv);
        
        // Add close button functionality
        messageDiv.querySelector('.message-close-btn').addEventListener('click', () => {
            messageDiv.remove();
            messageStyle.remove();
        });
        
        // Auto-close after 3 seconds
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.remove();
                messageStyle.remove();
            }
        }, 3000);
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