/**
 * Optimized Theme Switcher for VibeCreAI Website
 * Efficient theme management with better memory usage and performance
 */

class ThemeSwitcher {
    constructor() {
        this.currentThemeIndex = 0; // Always start with default theme
        this.isAnimating = false;
        this.elements = {};
        this.notificationTimeout = null;

        // Theme configuration
        this.themes = [
            {
                name: 'default',
                class: '',
                text: 'VIBE',
                description: 'Default'
            },
            {
                name: 'matrix',
                class: 'theme-matrix',
                text: 'MTRX',
                description: 'Matrix'
            },
            {
                name: 'ghost',
                class: 'theme-ghost',
                text: 'GHST',
                description: 'Ghost'
            },
            {
                name: 'synthwave',
                class: 'theme-synthwave',
                text: 'SYNTH',
                description: 'Synthwave'
            }
        ];

        this.init();
    }

    init() {
        // Wait for performance utils to be ready
        const initThemer = () => {
            if (!window.VibePerf?.dom?.initialized) {
                setTimeout(initThemer, 50);
                return;
            }
            this.setupElements();
            this.bindEvents();
            this.applyInitialTheme();
        };

        initThemer();
    }

    setupElements() {
        const { dom } = window.VibePerf;

        // Cache theme-related elements
        this.elements = {
            vibeSwitcher: dom.get('vibeSwitcher'),
            vibeIcon: dom.get('vibeIcon'),
            vibeText: dom.get('vibeText')
        };

        // Validate required elements
        if (!this.elements.vibeSwitcher || !this.elements.vibeIcon) {
            console.error('Theme switcher: Required elements not found');
            return;
        }
    }

    bindEvents() {
        const { vibeSwitcher, vibeIcon } = this.elements;
        const { events } = window.VibePerf;

        if (!vibeSwitcher) return;

        // Click handler with throttling
        vibeSwitcher.addEventListener('click', (e) => {
            e.preventDefault();
            events.throttle(() => this.cycleTheme(), 300, 'theme-switch');
        });

        // Optimized hover effects
        events.addPassiveListener(vibeSwitcher, 'mouseenter', () => {
            if (!this.isAnimating) {
                this.hoverAnimation(vibeIcon, true);
            }
        });

        events.addPassiveListener(vibeSwitcher, 'mouseleave', () => {
            if (!this.isAnimating) {
                this.hoverAnimation(vibeIcon, false);
            }
        });
    }

    applyInitialTheme() {
        this.applyTheme(this.currentThemeIndex, false);
    }

    cycleTheme() {
        if (this.isAnimating) return;

        // Cycle to next theme
        this.currentThemeIndex = (this.currentThemeIndex + 1) % this.themes.length;
        this.applyTheme(this.currentThemeIndex, true);
    }

    applyTheme(themeIndex, animate = false) {
        if (themeIndex < 0 || themeIndex >= this.themes.length) return;

        const theme = this.themes[themeIndex];
        const { vibeSwitcher, vibeIcon } = this.elements;

        // Remove all theme classes efficiently
        const classesToRemove = this.themes
            .filter(t => t.class)
            .map(t => t.class);

        if (classesToRemove.length > 0) {
            document.body.classList.remove(...classesToRemove);
        }

        // Apply new theme class
        if (theme.class) {
            document.body.classList.add(theme.class);
        }

        // Update button appearance with animation
        if (animate && vibeIcon) {
            this.isAnimating = true;

            // Button click animation
            anime({
                targets: vibeSwitcher,
                scale: [1, 0.95, 1],
                duration: 200,
                easing: 'easeOutQuad'
            });

            // Icon text change animation
            anime({
                targets: vibeIcon,
                scale: [1, 0, 1],
                duration: 400,
                easing: 'easeInOutQuad',
                complete: () => {
                    vibeIcon.textContent = theme.text;
                    this.isAnimating = false;
                }
            });
        } else if (vibeIcon) {
            vibeIcon.textContent = theme.text;
        }

        // Show theme change notification
        this.showThemeNotification(theme.description);
    }

    showThemeNotification(themeName) {
        const { memory } = window.VibePerf;

        // Clear existing notification
        const existingNotification = document.querySelector('.theme-notification');
        if (existingNotification) {
            existingNotification.remove();
        }

        // Clear existing timeout
        if (this.notificationTimeout) {
            memory.clear(this.notificationTimeout, 'timeout');
        }

        // Create notification element with optimized styles
        const notification = this.createNotificationElement(themeName);
        document.body.appendChild(notification);

        // Animate notification in
        anime({
            targets: notification,
            opacity: [0, 1],
            translateX: [100, 0],
            scale: [0.8, 1],
            duration: 400,
            easing: 'easeOutBack',
            complete: () => {
                // Auto-hide after 2 seconds
                this.notificationTimeout = memory.setTimeout(() => {
                    this.hideNotification(notification);
                }, 2000);
            }
        });
    }

    createNotificationElement(themeName) {
        const notification = document.createElement('div');
        notification.className = 'theme-notification';
        notification.textContent = `${themeName} Theme Active`;

        // Apply optimized styles using CSS custom properties
        Object.assign(notification.style, {
            position: 'fixed',
            top: '100px',
            right: '20px',
            background: 'rgba(0, 0, 0, 0.9)',
            color: 'var(--primary-color)',
            padding: '12px 20px',
            border: '1px solid var(--primary-color)',
            borderRadius: '25px',
            fontSize: '0.9rem',
            fontWeight: 'bold',
            letterSpacing: '0.1em',
            zIndex: '10000',
            pointerEvents: 'none',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 0 20px rgba(0, 255, 255, 0.3)',
            opacity: '0',
            transform: 'translateX(100px) scale(0.8)'
        });

        return notification;
    }

    hideNotification(notification) {
        anime({
            targets: notification,
            opacity: [1, 0],
            translateX: [0, 100],
            scale: [1, 0.8],
            duration: 300,
            easing: 'easeInBack',
            complete: () => {
                notification.remove();
            }
        });
    }

    hoverAnimation(target, isEntering) {
        const scale = isEntering ? [1, 1.05] : [1.05, 1];

        anime({
            targets: target,
            scale,
            duration: 200,
            easing: 'easeOutQuad'
        });
    }

    // Public method to get current theme
    getCurrentTheme() {
        return this.themes[this.currentThemeIndex];
    }

    // Public method to set theme by name
    setThemeByName(themeName) {
        const themeIndex = this.themes.findIndex(theme => theme.name === themeName);
        if (themeIndex !== -1) {
            this.currentThemeIndex = themeIndex;
            this.applyTheme(themeIndex, true);
        }
    }

    // Cleanup method
    cleanup() {
        const { events, memory } = window.VibePerf;

        // Clear notification timeout
        if (this.notificationTimeout) {
            memory.clear(this.notificationTimeout, 'timeout');
        }

        // Clean up event listeners
        Object.values(this.elements).forEach(element => {
            if (element) {
                events.cleanup(element);
            }
        });

        // Remove any lingering notifications
        const notifications = document.querySelectorAll('.theme-notification');
        notifications.forEach(notification => notification.remove());
    }
}

// Initialize theme switcher when DOM and performance utils are ready
const initThemeSwitcher = () => {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.themeSwitcher = new ThemeSwitcher();
        });
    } else {
        window.themeSwitcher = new ThemeSwitcher();
    }
};

initThemeSwitcher();