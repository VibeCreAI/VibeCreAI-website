/**
 * Main Application Logic for VibeCreAI Website
 * Core initialization, animations, and global functionality
 */

class VibeCreAIApp {
    constructor() {
        this.isInitialized = false;
        this.elements = {};
        this.animations = {};
        
        // Focus bracket system variables
        this.focusBracket = {
            chunkElements: [],
            chunkPositions: [],
            focusFrame: null,
            cachePositions: null,
            currentIndex: 0
        };

        this.init();
    }

    init() {
        // Wait for performance utils to be ready
        const initApp = () => {
            if (!window.VibePerf?.dom?.initialized) {
                setTimeout(initApp, 50);
                return;
            }
            this.setupElements();
            this.initializeYear();
            this.setupScrollBehavior();
            this.initializeAnimations();
            this.setupEventHandlers();
            this.isInitialized = true;
            console.log('🎉 VibeCreAI App initialized');
        };

        initApp();
    }

    setupElements() {
        const { dom } = window.VibePerf;

        // Cache frequently used elements
        this.elements = {
            // Core elements
            body: document.body,

            // Hero elements
            heroTitle: document.querySelector('.hero-title'),
            logoContainer: dom.get('logoContainer'),
            heroSubtitle: dom.get('heroSubtitle'),
            tagline: dom.get('tagline'),

            // Form elements
            newsletterForm: dom.get('newsletterForm'),

            // Collections
            ctaButtons: dom.get('ctaButtons'),
            fadeInElements: dom.get('fadeInElements'),
            anchors: dom.get('anchors')
        };
    }

    initializeYear() {
        const yearElement = document.getElementById('year');
        if (yearElement) {
            yearElement.textContent = new Date().getFullYear();
        }
    }

    setupScrollBehavior() {
        const { events } = window.VibePerf;

        // Ensure hero start functionality
        this.ensureHeroStart();

        // Handle browser navigation
        events.addPassiveListener(window, 'popstate', (event) => {
            if (!window.location.hash) {
                this.ensureHeroStart();
            }
        });

        // Smooth scrolling for anchor links
        if (this.elements.anchors) {
            this.elements.anchors.forEach(anchor => {
                anchor.addEventListener('click', (e) => {
                    e.preventDefault();
                    const target = document.querySelector(anchor.getAttribute('href'));
                    if (target) {
                        target.scrollIntoView({
                            behavior: 'smooth',
                            block: 'start'
                        });
                    }
                });
            });
        }
    }

    ensureHeroStart() {
        // Remove any hash from URL without triggering scroll
        if (window.location.hash) {
            history.replaceState(null, null, window.location.pathname + window.location.search);
        }

        // Force scroll to top with multiple methods
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;

        // Temporarily reset scroll behavior
        const htmlStyle = document.documentElement.style;
        const bodyStyle = document.body.style;

        htmlStyle.scrollBehavior = 'auto';
        bodyStyle.scrollBehavior = 'auto';

        // Restore smooth scrolling after brief delay
        window.VibePerf.memory.setTimeout(() => {
            htmlStyle.scrollBehavior = '';
            bodyStyle.scrollBehavior = '';
        }, 100);
    }

    initializeAnimations() {
        // Hero title animation
        if (this.elements.heroTitle) {
            anime({
                targets: this.elements.heroTitle,
                opacity: [0, 1],
                translateY: [-100, 0],
                duration: 1200,
                easing: 'easeOutExpo',
                delay: 0
            });
        }

        // Logo shuffle animation
        if (this.elements.logoContainer) {
            this.initLogoShuffle();
        }

        // Hero subtitle with focus effect
        if (this.elements.heroSubtitle) {
            this.initHeroSubtitle();
        }

        // CTA buttons animation
        if (this.elements.ctaButtons) {
            anime({
                targets: this.elements.ctaButtons,
                opacity: [0, 1],
                translateY: [30, 0],
                duration: 1000,
                delay: anime.stagger(100, { start: 0 }),
                easing: 'easeOutExpo'
            });
        }

        // Text scramble animation for tagline
        if (this.elements.tagline) {
            this.initTaglineScramble();
        }

        // Scroll animations
        this.initScrollAnimations();

        // Button hover effects
        this.initButtonHoverEffects();
    }

    initLogoShuffle() {
        const logoShuffle = new LogoShuffle(this.elements.logoContainer);
        logoShuffle.shuffle();
    }

    initHeroSubtitle() {
        const { heroSubtitle } = this.elements;
        heroSubtitle.textContent = "VIBE CODING CREATIVE AI";
        this.applyTrueFocusEffect(heroSubtitle);
    }

    initTaglineScramble() {
        const taglineScramble = new TextScramble(this.elements.tagline);
        const taglines = [
            "Building the future with AI...",
            "Solo developer + AI agents = ∞",
            "Creating fun digital experiences",
            "Vibe coding in progress...",
            "Press this to open terminal!",
            "Where creativity meets AI"
        ];

        let taglineCounter = 0;
        const nextTagline = () => {
            taglineScramble.setText(taglines[taglineCounter]).then(() => {
                this.animations.taglineTimeout = window.VibePerf.memory.setTimeout(nextTagline, 3000);
            });
            taglineCounter = (taglineCounter + 1) % taglines.length;
        };

        this.animations.taglineScramble = taglineScramble;
        nextTagline();
    }

    initScrollAnimations() {
        if (!this.elements.fadeInElements) return;

        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -100px 0px'
        };

        const observer = window.VibePerf.memory.createObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    anime({
                        targets: entry.target,
                        opacity: [0, 1],
                        translateY: [30, 0],
                        duration: 1000,
                        easing: 'easeOutExpo'
                    });
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target);
                }
            });
        }, observerOptions);

        this.elements.fadeInElements.forEach(el => {
            observer.observe(el);
        });
    }

    initButtonHoverEffects() {
        if (!this.elements.ctaButtons) return;

        const { events, animations } = window.VibePerf;

        this.elements.ctaButtons.forEach(button => {
            events.addPassiveListener(button, 'mouseenter', () => {
                const animation = animations.scaleAnimation(button, 1, 1.05, 300);
                anime(animation);
            });

            events.addPassiveListener(button, 'mouseleave', () => {
                const animation = animations.scaleAnimation(button, 1.05, 1, 300);
                anime(animation);
            });
        });
    }

    setupEventHandlers() {
        this.setupFormHandlers();
        this.setupResizeHandler();
        this.setupLoadingScreen();
    }

    setupFormHandlers() {
        const { newsletterForm } = this.elements;
        if (!newsletterForm) return;

        newsletterForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const email = newsletterForm.querySelector('input[type="email"]').value;
            const button = newsletterForm.querySelector('button');
            const originalText = button.textContent;

            // Animate subscription process
            button.textContent = 'SUBSCRIBING...';
            button.disabled = true;

            // Simulate API call
            window.VibePerf.memory.setTimeout(() => {
                button.textContent = 'SUBSCRIBED!';
                button.style.background = 'linear-gradient(90deg, #00ff00, #00ffcc)';
                newsletterForm.querySelector('input').value = '';

                anime({
                    targets: button,
                    scale: [1, 1.1, 1],
                    duration: 500,
                    easing: 'easeInOutQuad'
                });

                window.VibePerf.memory.setTimeout(() => {
                    button.textContent = originalText;
                    button.disabled = false;
                    button.style.background = '';
                }, 3000);
            }, 1500);
        });
    }

    setupResizeHandler() {
        const { events, memory } = window.VibePerf;
        let lastWidth = window.innerWidth;
        let lastHeight = window.innerHeight;

        events.addPassiveListener(window, 'resize', () => {
            events.debounce(() => {
                const currentWidth = window.innerWidth;
                const currentHeight = window.innerHeight;

                // Define thresholds to prevent constant retriggering
                const widthThreshold = 100;
                const heightThreshold = 150;

                const widthChange = Math.abs(currentWidth - lastWidth);
                const heightChange = Math.abs(currentHeight - lastHeight);

                // Only process significant changes
                if (widthChange >= widthThreshold || heightChange >= heightThreshold) {
                    this.handleResize();
                    lastWidth = currentWidth;
                    lastHeight = currentHeight;
                }
            }, 300, 'main-resize');
        });
    }

    handleResize() {
        // Update responsive button text
        this.updateButtonTextForMobile();

        // Refresh DOM cache for dynamic elements
        window.VibePerf.dom.refresh('navLinksItems');
        
        // Recalculate focus bracket positions on resize
        this.recalculateFocusBracket();
    }

    recalculateFocusBracket() {
        // Only recalculate if focus bracket system is active
        if (!this.focusBracket.cachePositions || this.focusBracket.chunkElements.length === 0) {
            return;
        }
        
        // Recalculate positions
        this.focusBracket.cachePositions();
        
        // Update current focus frame position immediately
        const currentIndex = this.focusBracket.currentIndex;
        const chunkPositions = this.focusBracket.chunkPositions;
        const focusFrame = this.focusBracket.focusFrame;
        
        if (chunkPositions[currentIndex] && focusFrame) {
            const pos = chunkPositions[currentIndex];
            Object.assign(focusFrame.style, {
                left: (pos.left - 8) + 'px',
                top: (pos.top - 8) + 'px',
                width: (pos.width + 16) + 'px',
                height: (pos.height + 16) + 'px'
            });
        }
    }

    updateButtonTextForMobile() {
        const joinButton = document.querySelector('.form-group button[type="submit"]');
        if (joinButton) {
            joinButton.textContent = window.innerWidth <= 480 ? 'JOIN' : 'JOIN THE VIBE';
        }
    }

    setupLoadingScreen() {
        window.addEventListener('load', () => {
            const loadingProgress = document.querySelector('.loading-progress');
            const loadingScreen = document.getElementById('loading-screen');

            if (!loadingProgress || !loadingScreen) return;

            anime({
                targets: loadingProgress,
                width: '100%',
                duration: 1500,
                easing: 'easeInOutQuad',
                complete: () => {
                    anime({
                        targets: loadingScreen,
                        opacity: 0,
                        duration: 500,
                        easing: 'easeOutQuad',
                        complete: () => {
                            loadingScreen.style.display = 'none';

                            // Apply browser optimizations
                            if (window.PerformanceManager) {
                                window.PerformanceManager.applyBrowserOptimizations();
                            }
                        }
                    });
                }
            });
        });
    }

    // Helper methods from original implementation
    applyTrueFocusEffect(element) {
        const wordChunks = ["VIBE CODING", "CREATIVE", "AI"];

        element.innerHTML = '';
        element.className += ' focus-container';

        // Clear previous focus bracket data
        this.focusBracket.chunkElements = [];
        this.focusBracket.chunkPositions = [];
        this.focusBracket.currentIndex = 0;

        wordChunks.forEach((chunk, index) => {
            const chunkSpan = document.createElement('span');
            chunkSpan.className = 'focus-word';
            chunkSpan.textContent = chunk;
            chunkSpan.style.marginRight = '1em';
            element.appendChild(chunkSpan);
            this.focusBracket.chunkElements.push(chunkSpan);

            if (index < wordChunks.length - 1) {
                element.appendChild(document.createTextNode(' '));
            }
        });

        // Create focus frame
        const focusFrame = document.createElement('div');
        focusFrame.className = 'focus-frame';
        this.focusBracket.focusFrame = focusFrame;

        const corners = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
        corners.forEach(corner => {
            const cornerDiv = document.createElement('div');
            cornerDiv.className = `corner ${corner}`;
            focusFrame.appendChild(cornerDiv);
        });

        element.appendChild(focusFrame);

        // Create position caching function and store reference
        this.focusBracket.cachePositions = () => {
            this.focusBracket.chunkPositions = this.focusBracket.chunkElements.map(chunk => ({
                left: chunk.offsetLeft,
                top: chunk.offsetTop,
                width: chunk.offsetWidth,
                height: chunk.offsetHeight
            }));
        };

        const focusChunk = (index) => {
            if (window.PerformanceManager?.neuralNetworkPaused) return;

            this.focusBracket.chunkElements.forEach(chunk => chunk.classList.remove('focused'));

            if (this.focusBracket.chunkElements[index] && this.focusBracket.chunkPositions[index]) {
                const currentChunk = this.focusBracket.chunkElements[index];
                const pos = this.focusBracket.chunkPositions[index];
                currentChunk.classList.add('focused');

                Object.assign(focusFrame.style, {
                    left: (pos.left - 8) + 'px',
                    top: (pos.top - 8) + 'px',
                    width: (pos.width + 16) + 'px',
                    height: (pos.height + 16) + 'px'
                });
                focusFrame.classList.add('active');
            }
        };

        const cycleFocus = () => {
            focusChunk(this.focusBracket.currentIndex);
            this.focusBracket.currentIndex = (this.focusBracket.currentIndex + 1) % this.focusBracket.chunkElements.length;
        };

        // Initialize focus animation
        window.VibePerf.memory.setTimeout(() => {
            this.focusBracket.cachePositions();
            cycleFocus();
            this.animations.chunkFocusInterval = window.VibePerf.memory.setInterval(cycleFocus, 2000);
        }, 500);
    }

    // Public methods
    getState() {
        return {
            isInitialized: this.isInitialized,
            animations: Object.keys(this.animations).reduce((acc, key) => {
                acc[key] = !!this.animations[key];
                return acc;
            }, {})
        };
    }

    cleanup() {
        const { memory, events } = window.VibePerf;

        // Clear all managed timeouts and intervals
        Object.values(this.animations).forEach(item => {
            if (typeof item === 'number') {
                memory.clear(item, 'timeout');
            }
        });

        // Clean up event listeners
        Object.values(this.elements).forEach(element => {
            if (element && element.nodeType === Node.ELEMENT_NODE) {
                events.cleanup(element);
            }
        });

        console.log('🧹 Main app cleaned up');
    }
}

// Text Scramble Class (optimized version)
class TextScramble {
    constructor(el) {
        this.el = el;
        this.chars = '!<>-_\\/[]{}—=+*^?#________';
        this.update = this.update.bind(this);
        this.frameRequest = null;
    }

    setText(newText) {
        const oldText = this.el.innerText;
        const length = Math.max(oldText.length, newText.length);
        const promise = new Promise((resolve) => this.resolve = resolve);

        this.queue = [];
        for (let i = 0; i < length; i++) {
            const from = oldText[i] || '';
            const to = newText[i] || '';
            const start = Math.floor(Math.random() * 40);
            const end = start + Math.floor(Math.random() * 40);
            this.queue.push({ from, to, start, end });
        }

        cancelAnimationFrame(this.frameRequest);
        this.frame = 0;
        this.update();
        return promise;
    }

    update() {
        let output = '';
        let complete = 0;

        for (let i = 0, n = this.queue.length; i < n; i++) {
            let { from, to, start, end, char } = this.queue[i];
            if (this.frame >= end) {
                complete++;
                output += to;
            } else if (this.frame >= start) {
                if (!char || Math.random() < 0.28) {
                    char = this.randomChar();
                    this.queue[i].char = char;
                }
                output += `<span class="dud">${char}</span>`;
            } else {
                output += from;
            }
        }

        this.el.innerHTML = output;
        if (complete === this.queue.length) {
            this.resolve();
        } else {
            this.frameRequest = requestAnimationFrame(this.update);
            this.frame++;
        }
    }

    randomChar() {
        return this.chars[Math.floor(Math.random() * this.chars.length)];
    }
}

// Logo Shuffle Class (optimized version)
class LogoShuffle {
    constructor(container) {
        this.container = container;
        this.logoText = "VIBECREAI";
        this.logoStructure = [
            { text: "V", class: "title-v" },
            { text: "IBE", class: "title-small" },
            { text: "C", class: "title-c" },
            { text: "RE", class: "title-small" },
            { text: "AI", class: "title-ai" }
        ];
        this.scrambleChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
    }

    shuffle() {
        return new Promise((resolve) => {
            this.container.innerHTML = '';
            const characterElements = [];

            // Create structure using document fragment
            const fragment = document.createDocumentFragment();

            this.logoStructure.forEach((part) => {
                const partSpan = document.createElement('span');
                partSpan.className = part.class;

                for (let i = 0; i < part.text.length; i++) {
                    const charSpan = document.createElement('span');
                    charSpan.textContent = part.text[i];
                    charSpan.style.display = 'inline-block';
                    partSpan.appendChild(charSpan);

                    characterElements.push({
                        element: charSpan,
                        finalChar: part.text[i],
                        isShuffling: true
                    });
                }
                fragment.appendChild(partSpan);
            });

            this.container.appendChild(fragment);

            // Optimized shuffle animation
            const shuffleDuration = 1000;
            const updateInterval = 50;
            let startTime = Date.now();

            const shuffleInterval = setInterval(() => {
                const elapsed = Date.now() - startTime;
                let allComplete = true;

                characterElements.forEach((charData, index) => {
                    if (charData.isShuffling) {
                        const charDelay = index * 80;
                        const charDuration = 400;

                        if (elapsed < charDelay) {
                            allComplete = false;
                        } else if (elapsed < charDelay + charDuration) {
                            charData.element.textContent = this.getRandomChar();
                            allComplete = false;
                        } else {
                            charData.element.textContent = charData.finalChar;
                            charData.isShuffling = false;
                        }
                    }
                });

                if (allComplete) {
                    clearInterval(shuffleInterval);
                    resolve();
                }
            }, updateInterval);

            // Safety timeout
            setTimeout(() => {
                clearInterval(shuffleInterval);
                characterElements.forEach((charData) => {
                    charData.element.textContent = charData.finalChar;
                });
                resolve();
            }, shuffleDuration + 500);
        });
    }

    getRandomChar() {
        return this.scrambleChars[Math.floor(Math.random() * this.scrambleChars.length)];
    }
}

// Initialize main application
const initMainApp = () => {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.vibeApp = new VibeCreAIApp();
        });
    } else {
        window.vibeApp = new VibeCreAIApp();
    }
};

initMainApp();