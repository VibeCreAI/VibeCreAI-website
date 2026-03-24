/**
 * App Demo Video Modal
 * Opens YouTube embeds from app-card demo buttons.
 */
class DemoVideoModal {
    constructor() {
        this.isOpen = false;
        this.elements = {
            modal: null,
            overlay: null,
            closeButton: null,
            iframe: null,
            title: null,
            demoButtons: []
        };

        this.handleEscape = this.handleEscape.bind(this);
        this.init();
    }

    init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setup());
            return;
        }

        this.setup();
    }

    setup() {
        this.elements.modal = document.getElementById('demo-video-modal');
        this.elements.overlay = document.getElementById('demo-video-modal-overlay');
        this.elements.closeButton = document.getElementById('demo-video-close');
        this.elements.iframe = document.getElementById('demo-video-iframe');
        this.elements.title = document.getElementById('demo-video-title');
        this.elements.demoButtons = Array.from(document.querySelectorAll('[data-demo-id]'));

        if (!this.elements.modal || !this.elements.iframe || !this.elements.demoButtons.length) {
            return;
        }

        this.bindEvents();
    }

    bindEvents() {
        this.elements.demoButtons.forEach((button) => {
            button.addEventListener('click', (event) => this.handleDemoButtonClick(event, button));
        });

        if (this.elements.closeButton) {
            this.elements.closeButton.addEventListener('click', () => this.close());
        }

        if (this.elements.overlay) {
            this.elements.overlay.addEventListener('click', () => this.close());
        }

        document.addEventListener('keydown', this.handleEscape);
    }

    handleDemoButtonClick(event, button) {
        if (this.shouldUseBrowserDefault(event)) {
            return;
        }

        const demoId = button.dataset.demoId;
        if (!demoId) {
            return;
        }

        event.preventDefault();

        const title = button.dataset.demoTitle || 'App Demo';
        this.open(demoId, title);
    }

    shouldUseBrowserDefault(event) {
        return event.defaultPrevented ||
            event.button !== 0 ||
            event.metaKey ||
            event.ctrlKey ||
            event.shiftKey ||
            event.altKey;
    }

    buildEmbedUrl(demoId) {
        const safeId = encodeURIComponent(String(demoId).trim());
        return `https://www.youtube.com/embed/${safeId}?autoplay=1&rel=0&modestbranding=1`;
    }

    open(demoId, title) {
        const { modal, iframe, title: titleElement } = this.elements;
        if (!modal || !iframe) return;

        if (titleElement) {
            titleElement.textContent = title;
        }

        iframe.src = this.buildEmbedUrl(demoId);
        modal.classList.add('is-open');
        modal.setAttribute('aria-hidden', 'false');
        document.body.classList.add('demo-modal-open');
        this.isOpen = true;
    }

    close() {
        const { modal, iframe } = this.elements;
        if (!modal || !iframe || !this.isOpen) return;

        modal.classList.remove('is-open');
        modal.setAttribute('aria-hidden', 'true');
        iframe.src = '';
        document.body.classList.remove('demo-modal-open');
        this.isOpen = false;
    }

    handleEscape(event) {
        if (event.key === 'Escape') {
            this.close();
        }
    }
}

new DemoVideoModal();

