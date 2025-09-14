/**
 * Optimized Hamburger Menu Handler for VibeCreAI Website
 * Eliminates lag and animation conflicts through intelligent event handling
 */

class MenuHandler {
    constructor() {
        this.isOpen = false;
        this.isAnimating = false;
        this.elements = {};
        this.animationDuration = 600;
        this.throttleDelay = 100; // Prevent rapid clicks

        this.init();
    }

    init() {
        // Wait for performance utils to be ready
        const initMenu = () => {
            if (!window.VibePerf?.dom?.initialized) {
                setTimeout(initMenu, 50);
                return;
            }
            this.setupElements();
            this.bindEvents();
            this.initializeStyles();
        };

        initMenu();
    }

    setupElements() {
        const { dom } = window.VibePerf;

        // Cache all menu-related elements
        this.elements = {
            menuToggle: dom.get('menuToggle'),
            navLinks: dom.get('navLinks'),
            navLinksItems: dom.get('navLinksItems'),
            anchors: dom.get('anchors')
        };

        // Validate required elements
        if (!this.elements.menuToggle || !this.elements.navLinks) {
            console.error('Menu handler: Required elements not found');
            return;
        }
    }

    initializeStyles() {
        const { menuToggle, navLinks, navLinksItems } = this.elements;

        // Set initial styles with anime.js for consistency
        anime.set(menuToggle, { rotate: 0 });

        anime.set(navLinks, {
            translateX: '100%',
            opacity: 0
        });

        if (navLinksItems) {
            anime.set(navLinksItems, {
                translateY: 0,
                opacity: 1,
                scale: 1,
                textShadow: '0 0 0px rgba(0, 255, 255, 0)'
            });
        }
    }

    bindEvents() {
        const { events } = window.VibePerf;
        const { menuToggle, anchors } = this.elements;

        if (!menuToggle) return;

        // Throttled click handler to prevent rapid firing
        menuToggle.addEventListener('click', (e) => {
            e.preventDefault();
            events.throttle(() => this.toggleMenu(), this.throttleDelay, 'menu-toggle');
        });

        // Optimized hover effects
        events.addPassiveListener(menuToggle, 'mouseenter', () => {
            if (!this.isOpen && !this.isAnimating) {
                this.hoverAnimation(true);
            }
        });

        events.addPassiveListener(menuToggle, 'mouseleave', () => {
            if (!this.isOpen && !this.isAnimating) {
                this.hoverAnimation(false);
            }
        });

        // Close menu when clicking outside
        events.addPassiveListener(document, 'click', (e) => {
            if (this.isOpen && !menuToggle.contains(e.target) && !this.elements.navLinks.contains(e.target)) {
                this.closeMenu();
            }
        });

        // Close menu when touching outside (mobile)
        events.addPassiveListener(document, 'touchstart', (e) => {
            if (this.isOpen && !menuToggle.contains(e.target) && !this.elements.navLinks.contains(e.target)) {
                this.closeMenu();
            }
        });

        // Handle anchor clicks
        if (anchors) {
            anchors.forEach(anchor => {
                anchor.addEventListener('click', () => {
                    if (this.isOpen) {
                        this.closeMenu();
                    }
                });
            });
        }
    }

    toggleMenu() {
        if (this.isAnimating) return; // Prevent conflicts

        if (this.isOpen) {
            this.closeMenu();
        } else {
            this.openMenu();
        }
    }

    openMenu() {
        if (this.isAnimating || this.isOpen) return;

        this.isAnimating = true;
        this.isOpen = true;

        const { menuToggle, navLinks, navLinksItems } = this.elements;
        const { animations } = window.VibePerf;

        // Add active classes
        menuToggle.classList.add('active');
        navLinks.classList.add('active');

        // Reset positions before animating
        anime.set(navLinks, {
            translateX: '100%',
            opacity: 0
        });

        if (navLinksItems) {
            anime.set(navLinksItems, {
                translateY: 50,
                opacity: 0,
                scale: 0.8,
                textShadow: '0 0 0px rgba(0, 255, 255, 0)'
            });
        }

        // Batch all opening animations
        const openAnimations = [
            // Hamburger button transformation
            {
                targets: menuToggle,
                scale: [1, 1.1, 1],
                rotate: '+=360',
                duration: this.animationDuration,
                easing: 'easeOutBack'
            },
            // Mobile menu sliding in
            {
                targets: navLinks,
                translateX: ['100%', '0%'],
                opacity: [0, 1],
                duration: 500,
                easing: 'easeOutExpo'
            }
        ];

        // Add nav links animation if they exist
        if (navLinksItems) {
            openAnimations.push({
                targets: navLinksItems,
                translateY: [50, 0],
                opacity: [0, 1],
                scale: [0.8, 1],
                duration: this.animationDuration,
                delay: anime.stagger(80, { start: 200 }), // Reduced from 100ms to 80ms
                easing: 'easeOutBack'
            });

            // Add pulsing glow effect
            openAnimations.push({
                targets: navLinksItems,
                textShadow: [
                    '0 0 5px rgba(0, 255, 255, 0)',
                    '0 0 20px rgba(0, 255, 255, 0.8)',
                    '0 0 5px rgba(0, 255, 255, 0.3)'
                ],
                duration: 2000,
                direction: 'alternate',
                loop: true,
                easing: 'easeInOutQuad',
                delay: anime.stagger(200, { start: 800 })
            });
        }

        // Execute all animations in batch
        animations.batch(openAnimations);

        // Reset animation flag after completion
        window.VibePerf.memory.setTimeout(() => {
            this.isAnimating = false;
        }, this.animationDuration + 200);
    }

    closeMenu() {
        if (this.isAnimating || !this.isOpen) return;

        this.isAnimating = true;
        this.isOpen = false;

        const { menuToggle, navLinks, navLinksItems } = this.elements;
        const { animations } = window.VibePerf;

        // Batch all closing animations
        const closeAnimations = [
            // Hamburger button animation
            {
                targets: menuToggle,
                scale: [1, 0.9, 1],
                rotate: '-=360',
                duration: 400,
                easing: 'easeInBack',
                complete: () => {
                    menuToggle.classList.remove('active');
                }
            }
        ];

        // Add nav links closing animation
        if (navLinksItems) {
            closeAnimations.push({
                targets: navLinksItems,
                translateY: [0, -30],
                opacity: [1, 0],
                scale: [1, 0.8],
                duration: 300,
                delay: anime.stagger(50),
                easing: 'easeInBack'
            });
        }

        // Menu slide out animation
        closeAnimations.push({
            targets: navLinks,
            translateX: ['0%', '100%'],
            opacity: [1, 0],
            duration: 400,
            delay: 150,
            easing: 'easeInExpo',
            complete: () => {
                navLinks.classList.remove('active');
                // Reset transforms for next opening
                if (navLinksItems) {
                    anime.set(navLinksItems, {
                        translateY: 0,
                        opacity: 1,
                        scale: 1,
                        textShadow: '0 0 0px rgba(0, 255, 255, 0)'
                    });
                }
            }
        });

        // Execute all animations in batch
        animations.batch(closeAnimations);

        // Reset animation flag after completion
        window.VibePerf.memory.setTimeout(() => {
            this.isAnimating = false;
        }, 600);
    }

    hoverAnimation(isEntering) {
        const { menuToggle } = this.elements;
        const spans = menuToggle.querySelectorAll('span');

        if (spans.length === 0) return;

        const scale = isEntering ? [1, 1.1] : [1.1, 1];
        const delay = isEntering ? anime.stagger(50) : anime.stagger(25);

        anime({
            targets: spans,
            scaleX: scale,
            duration: 200,
            delay,
            easing: 'easeOutQuad'
        });
    }

    // Public method to get menu state
    getState() {
        return {
            isOpen: this.isOpen,
            isAnimating: this.isAnimating
        };
    }

    // Cleanup method
    cleanup() {
        const { events } = window.VibePerf;

        // Clean up event listeners
        Object.values(this.elements).forEach(element => {
            if (element) {
                events.cleanup(element);
            }
        });
    }
}

// Initialize menu handler when DOM and performance utils are ready
const initMenuHandler = () => {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.menuHandler = new MenuHandler();
        });
    } else {
        window.menuHandler = new MenuHandler();
    }
};

initMenuHandler();