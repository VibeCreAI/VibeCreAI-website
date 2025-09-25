/**
 * Optimized Terminal Interface for VibeCreAI Website
 * High-performance terminal with efficient content rendering and interaction
 */

class Terminal {
    constructor() {
        this.isOpen = false;
        this.currentContentIndex = 0;
        this.keyBuffer = '';
        this.elements = {};
        this.isAnimating = false;
        this.ignoreNextClick = false;
        this.touchCooldownId = null;

        this.handleTaglineTouch = this.handleTaglineTouch.bind(this);

        // Terminal content sections
        this.storyContent = [
            {
                title: "ABOUT THIS PROJECT",
                prompt: "cat about_project.md",
                content: `/*
 * VibeCreAI Website
 * Built with: HTML5, CSS3, JavaScript, Anime.js
 * Created by: Samson (with AI assistance)
 *
 * This website is a testament to what's possible when
 * creativity meets AI collaboration. Every line of code
 * was written through the partnership between human
 * imagination and artificial intelligence.
 */`
            },
            {
                title: "TECH STACK",
                prompt: "cat tech_stack.js",
                content: `const techStack = {
    "frontend": ["HTML5", "CSS3", "Vanilla JS"],
    "animations": ["Anime.js", "CSS Keyframes"],
    "effects": [
        "Pixel Maze Background",
        "Pixel Art Dinosaur",
        "Interactive Terminal"
    ],
    "icons": "Grommet Icons (SVG)",
    "ai_tools": ["Claude Code", "Cursor IDE"],
    "deployment": "Vercel + Custom Domain"
};`
            },
            {
                title: "THE VIBE CODE",
                prompt: "cat vibe_philosophy.js",
                content: `function createWithVibes() {
    const passion = "unlimited";
    const codingSkills = "learning";
    const aiAssistance = true;

    if (passion === "unlimited" && aiAssistance) {
        return "Amazing things are possible!";
    }
}

// Remember: You don't need to be a coding expert
// to build something amazing. You just need ideas,
// determination, and the right AI partner!`
            },
            {
                title: "GET THE SOURCE",
                prompt: "cat repository_info.md",
                content: `// This website is open source!
// Feel free to explore, learn, and create your own version.

GitHub Repository:
https://github.com/VibeCreAI/vibecreai-website

// Want to collaborate or have questions?
Email: contact@vibecreai.com`
            }
        ];

        this.init();
    }

    init() {
        // Wait for performance utils to be ready
        const initTerminal = () => {
            if (!window.VibePerf?.dom?.initialized) {
                setTimeout(initTerminal, 50);
                return;
            }
            this.setupElements();
            this.bindEvents();
        };

        initTerminal();
    }

    setupElements() {
        const { dom } = window.VibePerf;

        // Cache terminal-related elements
        this.elements = {
            taglineContainer: dom.get('taglineContainer'),
            sourceTerminal: dom.get('sourceTerminal'),
            terminalContent: dom.get('terminalContent'),
            closeTerminal: dom.get('closeTerminal'),
            tagline: dom.get('tagline')
        };

        // Validate required elements
        if (!this.elements.sourceTerminal || !this.elements.terminalContent) {
            console.error('Terminal: Required elements not found');
            return;
        }
    }

    bindEvents() {
        const { events } = window.VibePerf;
        const { taglineContainer, closeTerminal, sourceTerminal } = this.elements;

        if (!taglineContainer) return;

        // Tagline container click handler
        taglineContainer.addEventListener('click', (e) => {
            e.preventDefault();
            if (this.ignoreNextClick) {
                return;
            }
            this.toggleTerminal();
        });

        // Mobile touch handler to avoid double-trigger flashes
        taglineContainer.addEventListener('touchstart', this.handleTaglineTouch, { passive: false });

        // Close button handler
        if (closeTerminal) {
            closeTerminal.addEventListener('click', (e) => {
                e.stopPropagation();
                this.closeTerminal();
            });
        }

        // Prevent terminal content clicks from closing
        if (sourceTerminal) {
            sourceTerminal.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        }

        // Keyboard handlers
        events.addPassiveListener(document, 'keydown', (e) => {
            this.handleKeyPress(e);
        });

        // Event delegation for /next clicks
        document.addEventListener('click', (e) => {
            // Check direct target
            if (e.target && e.target.classList && e.target.classList.contains('terminal-next-text')) {
                e.preventDefault();
                e.stopPropagation();
                this.goToNextSection();
                return;
            }
            
            // Check if clicked inside /next element
            let currentElement = e.target;
            while (currentElement && currentElement !== document) {
                if (currentElement.classList && currentElement.classList.contains('terminal-next-text')) {
                    e.preventDefault();
                    e.stopPropagation();
                    this.goToNextSection();
                    return;
                }
                currentElement = currentElement.parentElement;
            }
        });

        // Touch events for mobile
        document.addEventListener('touchstart', (e) => {
            if (e.target && e.target.classList.contains('terminal-next-text')) {
                e.preventDefault();
                e.stopPropagation();
                this.goToNextSection();
            }
        });
    }

    toggleTerminal() {
        if (this.isAnimating) return;

        if (this.isOpen) {
            this.closeTerminal();
        } else {
            this.openTerminal();
        }
    }

    handleTaglineTouch(e) {
        if (this.isAnimating) return;

        if (e.touches && e.touches.length > 1) return;

        e.preventDefault();
        e.stopPropagation();

        this.ignoreNextClick = true;

        const memory = window.VibePerf?.memory;
        if (this.touchCooldownId) {
            if (memory) {
                memory.clear(this.touchCooldownId, 'timeout');
            } else {
                clearTimeout(this.touchCooldownId);
            }
        }

        const releaseClickBlock = () => {
            this.ignoreNextClick = false;
            this.touchCooldownId = null;
        };

        this.touchCooldownId = memory
            ? memory.setTimeout(releaseClickBlock, 350)
            : setTimeout(releaseClickBlock, 350);

        this.toggleTerminal();
    }

    openTerminal() {
        if (this.isOpen || this.isAnimating) return;

        this.isAnimating = true;
        this.isOpen = true;

        const { sourceTerminal, tagline } = this.elements;

        // Add active classes
        sourceTerminal.classList.add('active');
        document.body.classList.add('terminal-active');

        // Load initial content
        this.loadContent();

        // Animate tagline click feedback
        anime({
            targets: tagline,
            scale: [1, 0.98, 1],
            duration: 300,
            easing: 'easeOutQuad',
            complete: () => {
                this.isAnimating = false;
            }
        });
    }

    closeTerminal() {
        if (!this.isOpen || this.isAnimating) return;

        this.isAnimating = true;
        this.isOpen = false;

        const { sourceTerminal } = this.elements;

        // Remove active classes
        sourceTerminal.classList.remove('active');
        document.body.classList.remove('terminal-active');

        window.VibePerf.memory.setTimeout(() => {
            this.isAnimating = false;
        }, 300);
    }

    loadContent() {
        const contentData = this.getProgressiveContent();
        this.renderContent(contentData);
    }

    getProgressiveContent() {
        const content = this.storyContent[this.currentContentIndex];
        const displayIndex = this.currentContentIndex + 1;
        this.currentContentIndex = (this.currentContentIndex + 1) % this.storyContent.length;
        return { ...content, displayIndex };
    }

    renderContent(contentData) {
        const { terminalContent } = this.elements;
        if (!terminalContent) return;

        // Clear current content
        terminalContent.innerHTML = '';

        // Create document fragment for efficient DOM manipulation
        const fragment = document.createDocumentFragment();

        // Add terminal prompt
        const promptLine = this.createElement('div', 'terminal-line',
            `<span class="terminal-prompt">$</span> ${contentData.prompt}`);
        promptLine.style.animationDelay = '0s';
        fragment.appendChild(promptLine);

        // Add empty line
        const emptyLine = this.createElement('div', 'terminal-line', '&nbsp;');
        emptyLine.style.animationDelay = '0.05s';
        fragment.appendChild(emptyLine);

        // Add section indicator
        const sectionIndicator = this.createElement('div', 'terminal-line',
            `<span style="color: #ffffff; font-size: 1.1em; font-weight: bold;"># ${contentData.title} (${contentData.displayIndex}/${this.storyContent.length})</span>`);
        sectionIndicator.style.animationDelay = '0.1s';
        fragment.appendChild(sectionIndicator);

        // Add spacer line
        const spacerLine = this.createElement('div', 'terminal-line', '&nbsp;');
        spacerLine.style.animationDelay = '0.15s';
        fragment.appendChild(spacerLine);

        // Split content into lines and add them
        const lines = contentData.content.split('\n');
        const maxLines = Math.min(lines.length, 12);

        lines.slice(0, maxLines).forEach((line, index) => {
            const lineElement = this.createElement('div', 'terminal-line');
            lineElement.textContent = line; // Automatically escapes HTML
            lineElement.style.animationDelay = `${0.2 + (index * 0.03)}s`;
            fragment.appendChild(lineElement);
        });

        // Add final spacer
        const finalSpacer = this.createElement('div', 'terminal-line', '&nbsp;');
        finalSpacer.style.animationDelay = `${0.2 + (maxLines * 0.03)}s`;
        fragment.appendChild(finalSpacer);

        // Add cursor line with /next command
        const cursorLine = this.createCursorLine(maxLines);
        fragment.appendChild(cursorLine);

        // Append all at once for better performance
        terminalContent.appendChild(fragment);
    }

    createCursorLine(maxLines) {
        const cursorLine = this.createElement('div', 'terminal-line');

        // Create prompt element
        const promptElement = this.createElement('span', 'terminal-prompt', '$ ');

        // Create /next element with enhanced debugging
        const nextElement = this.createElement('span', 'terminal-next-text');
        nextElement.textContent = '/next';
        nextElement.style.pointerEvents = 'auto';
        nextElement.style.cursor = 'pointer';
        nextElement.style.display = 'inline-block';
        nextElement.style.zIndex = '1000';
        
        // Add data attribute for easier debugging
        nextElement.setAttribute('data-clickable', 'true');
        
        // Add direct click handler as backup
        nextElement.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.goToNextSection();
        });

        // Create cursor element
        const cursorElement = this.createElement('span', 'terminal-cursor');

        // Assemble the line
        cursorLine.appendChild(promptElement);
        cursorLine.appendChild(nextElement);
        cursorLine.appendChild(cursorElement);
        cursorLine.style.animationDelay = `${0.25 + (maxLines * 0.03)}s`;

        return cursorLine;
    }

    createElement(tag, className, innerHTML = '') {
        const element = document.createElement(tag);
        if (className) element.className = className;
        if (innerHTML) element.innerHTML = innerHTML;
        return element;
    }

    goToNextSection() {
        if (!this.isOpen) return;

        // Simple click animation
        anime({
            targets: '.terminal-next-text',
            scale: [1, 0.95, 1],
            duration: 150,
            easing: 'easeOutQuad'
        });

        // Load next content
        const contentData = this.getProgressiveContent();
        this.renderContent(contentData);
    }

    handleKeyPress(e) {
        if (!this.isOpen) return;

        // Handle ESC key to close terminal
        if (e.key === 'Escape') {
            this.closeTerminal();
            return;
        }

        // Build key buffer for /next command
        if (e.key.length === 1) {
            this.keyBuffer += e.key;

            // Check for /next command
            if (this.keyBuffer.includes('/next')) {
                this.goToNextSection();
                this.keyBuffer = '';
            }

            // Keep buffer manageable
            if (this.keyBuffer.length > 10) {
                this.keyBuffer = this.keyBuffer.slice(-10);
            }
        }

        // Reset buffer on Enter or Escape
        if (e.key === 'Enter' || e.key === 'Escape') {
            this.keyBuffer = '';
        }
    }

    // Public method to get terminal state
    getState() {
        return {
            isOpen: this.isOpen,
            currentSection: this.currentContentIndex,
            totalSections: this.storyContent.length
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

        if (this.elements.taglineContainer) {
            this.elements.taglineContainer.removeEventListener('touchstart', this.handleTaglineTouch);
        }

        if (this.touchCooldownId) {
            if (window.VibePerf?.memory) {
                window.VibePerf.memory.clear(this.touchCooldownId, 'timeout');
            } else {
                clearTimeout(this.touchCooldownId);
            }
        }

        this.touchCooldownId = null;
        this.ignoreNextClick = false;

        // Reset state
        this.isOpen = false;
        this.keyBuffer = '';
        this.currentContentIndex = 0;
    }
}

// Initialize terminal when DOM and performance utils are ready
const initTerminal = () => {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.terminal = new Terminal();
        });
    } else {
        window.terminal = new Terminal();
    }
};

initTerminal();
