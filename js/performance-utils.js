/**
 * Performance Utilities for VibeCreAI Website
 * Provides shared optimizations for DOM caching, event handling, and animations
 */

// DOM Cache System
class DOMCache {
    constructor() {
        this.cache = new Map();
        this.initialized = false;
    }

    // Initialize all frequently accessed elements
    init() {
        if (this.initialized) return;

        // Cache all frequently used elements
        const elements = {
            // Navigation elements
            menuToggle: document.getElementById('menu-toggle'),
            navLinks: document.getElementById('nav-links'),
            navLinksItems: null, // Will be set after navLinks is cached

            // Hero section elements
            logoContainer: document.getElementById('logo-text-container'),
            heroSubtitle: document.getElementById('hero-subtitle'),
            tagline: document.getElementById('tagline'),
            taglineContainer: document.querySelector('.tagline-container'),

            // Terminal elements
            sourceTerminal: document.getElementById('source-code-terminal'),
            terminalContent: document.getElementById('terminal-content'),
            closeTerminal: document.getElementById('close-terminal'),

            // Theme switcher elements
            vibeSwitcher: document.getElementById('vibe-switcher'),
            vibeIcon: null, // Will be set after vibeSwitcher
            vibeText: null, // Will be set after vibeSwitcher

            // Form elements
            newsletterForm: document.getElementById('newsletter-form'),

            // Common collections
            ctaButtons: document.querySelectorAll('.cta-button, .app-button'),
            fadeInElements: document.querySelectorAll('.fade-in'),
            anchors: document.querySelectorAll('a[href^="#"]')
        };

        // Set dependent elements
        if (elements.navLinks) {
            elements.navLinksItems = elements.navLinks.querySelectorAll('li');
        }

        if (elements.vibeSwitcher) {
            elements.vibeIcon = elements.vibeSwitcher.querySelector('.vibe-icon');
            elements.vibeText = elements.vibeSwitcher.querySelector('.vibe-text');
        }

        // Store all elements in cache
        for (const [key, element] of Object.entries(elements)) {
            this.cache.set(key, element);
        }

        this.initialized = true;
    }

    // Get cached element
    get(key) {
        if (!this.initialized) this.init();
        return this.cache.get(key);
    }

    // Check if element exists and is valid
    has(key) {
        const element = this.get(key);
        return element && element.nodeType === Node.ELEMENT_NODE;
    }

    // Refresh cache for dynamic elements
    refresh(key) {
        if (key === 'navLinksItems') {
            const navLinks = this.get('navLinks');
            if (navLinks) {
                this.cache.set('navLinksItems', navLinks.querySelectorAll('li'));
            }
        }
        // Add other dynamic refreshes as needed
    }
}

// Event Handler Optimization
class EventOptimizer {
    constructor() {
        this.throttleCache = new Map();
        this.debounceCache = new Map();
    }

    // Throttle function - limits execution frequency
    throttle(func, delay, key) {
        if (!this.throttleCache.has(key)) {
            this.throttleCache.set(key, {
                lastCall: 0,
                timeoutId: null
            });
        }

        const cached = this.throttleCache.get(key);
        const now = Date.now();

        if (now - cached.lastCall >= delay) {
            cached.lastCall = now;
            return func();
        }

        if (!cached.timeoutId) {
            cached.timeoutId = setTimeout(() => {
                cached.lastCall = Date.now();
                cached.timeoutId = null;
                func();
            }, delay - (now - cached.lastCall));
        }
    }

    // Debounce function - delays execution until after delay has passed
    debounce(func, delay, key) {
        if (this.debounceCache.has(key)) {
            clearTimeout(this.debounceCache.get(key));
        }

        const timeoutId = setTimeout(func, delay);
        this.debounceCache.set(key, timeoutId);
    }

    // Add passive event listener with automatic cleanup tracking
    addPassiveListener(element, event, handler, options = {}) {
        const passiveOptions = { ...options, passive: true };
        element.addEventListener(event, handler, passiveOptions);

        // Store for potential cleanup
        if (!element._vibeListeners) {
            element._vibeListeners = [];
        }
        element._vibeListeners.push({ event, handler, options: passiveOptions });
    }

    // Clean up all listeners for an element
    cleanup(element) {
        if (element._vibeListeners) {
            element._vibeListeners.forEach(({ event, handler, options }) => {
                element.removeEventListener(event, handler, options);
            });
            element._vibeListeners = [];
        }
    }
}

// Animation Optimization
class AnimationOptimizer {
    constructor() {
        this.animationQueue = [];
        this.isProcessing = false;
        this.commonTimelines = new Map();
    }

    // Batch multiple animations to run together
    batch(animations) {
        if (!Array.isArray(animations)) {
            animations = [animations];
        }

        this.animationQueue.push(...animations);

        if (!this.isProcessing) {
            this.processBatch();
        }
    }

    // Process batched animations
    processBatch() {
        if (this.animationQueue.length === 0) {
            this.isProcessing = false;
            return;
        }

        this.isProcessing = true;
        const currentBatch = [...this.animationQueue];
        this.animationQueue = [];

        // Execute all animations
        currentBatch.forEach(animation => {
            if (typeof animation === 'function') {
                animation();
            } else {
                anime(animation);
            }
        });

        // Continue processing if more animations were added
        requestAnimationFrame(() => this.processBatch());
    }

    // Create reusable animation timeline
    createTimeline(key, config) {
        if (!this.commonTimelines.has(key)) {
            this.commonTimelines.set(key, anime.timeline(config));
        }
        return this.commonTimelines.get(key);
    }

    // Optimized scale animation (common pattern)
    scaleAnimation(target, fromScale = 1, toScale = 1.05, duration = 200) {
        return {
            targets: target,
            scale: [fromScale, toScale],
            duration,
            easing: 'easeOutQuad'
        };
    }

    // Optimized translate animation
    translateAnimation(target, fromY = 30, toY = 0, duration = 1000) {
        return {
            targets: target,
            translateY: [fromY, toY],
            opacity: [0, 1],
            duration,
            easing: 'easeOutExpo'
        };
    }
}

// Memory Management
class MemoryManager {
    constructor() {
        this.intervals = new Set();
        this.timeouts = new Set();
        this.observers = new Set();
    }

    // Managed setTimeout
    setTimeout(callback, delay) {
        const id = setTimeout(() => {
            this.timeouts.delete(id);
            callback();
        }, delay);
        this.timeouts.add(id);
        return id;
    }

    // Managed setInterval
    setInterval(callback, delay) {
        const id = setInterval(callback, delay);
        this.intervals.add(id);
        return id;
    }

    // Managed IntersectionObserver
    createObserver(callback, options) {
        const observer = new IntersectionObserver(callback, options);
        this.observers.add(observer);
        return observer;
    }

    // Clear specific timeout/interval
    clear(id, type = 'timeout') {
        if (type === 'timeout') {
            clearTimeout(id);
            this.timeouts.delete(id);
        } else if (type === 'interval') {
            clearInterval(id);
            this.intervals.delete(id);
        }
    }

    // Clean up all managed resources
    cleanup() {
        // Clear all timeouts
        this.timeouts.forEach(id => clearTimeout(id));
        this.timeouts.clear();

        // Clear all intervals
        this.intervals.forEach(id => clearInterval(id));
        this.intervals.clear();

        // Disconnect all observers
        this.observers.forEach(observer => observer.disconnect());
        this.observers.clear();
    }
}

// Global performance utilities instance
window.VibePerf = {
    dom: new DOMCache(),
    events: new EventOptimizer(),
    animations: new AnimationOptimizer(),
    memory: new MemoryManager(),

    // Initialize all performance utilities
    init() {
        this.dom.init();
        console.log('🚀 Performance utilities initialized');
    },

    // Global cleanup
    cleanup() {
        this.memory.cleanup();
        console.log('🧹 Performance utilities cleaned up');
    }
};

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.VibePerf.init());
} else {
    window.VibePerf.init();
}