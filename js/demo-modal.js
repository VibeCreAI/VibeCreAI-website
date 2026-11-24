// Project links open directly when a browser doesn't support modal dialogs.
class DemoVideoModal {
    constructor(dialog) {
        this.dialog = dialog;
        this.frame = dialog.querySelector('iframe');
        this.title = dialog.querySelector('#demo-video-title');
        this.external = dialog.querySelector('#demo-external');

        document.querySelectorAll('[data-demo-id], [data-profile-preview]').forEach((link) => {
            link.addEventListener('click', (event) => {
                if (event.defaultPrevented || event.button !== 0 || event.ctrlKey ||
                    event.metaKey || event.altKey || event.shiftKey) return;

                event.preventDefault();
                this.open(link);
            });
        });

        dialog.querySelector('#demo-video-close').addEventListener('click', () => dialog.close());
        dialog.addEventListener('click', (event) => {
            if (event.target === dialog) dialog.close();
        });
        dialog.addEventListener('close', () => {
            if (dialog.open) return;
            this.frame.removeAttribute('src');
            document.body.classList.remove('demo-modal-open');
        });
    }

    open(link) {
        const profile = link.hasAttribute('data-profile-preview');
        const title = window.VibeLocale.t(link.dataset.demoTitle || 'App Demo');
        this.title.textContent = title;
        this.frame.title = title;
        this.external.href = link.href;
        this.external.textContent = window.VibeLocale.t(profile ? 'Open on Astrocade ↗' : 'Watch on YouTube ↗');
        this.dialog.classList.toggle('profile-preview', profile);
        this.dialog.showModal();
        document.body.classList.add('demo-modal-open');
        this.frame.src = profile ? link.href :
            `https://www.youtube-nocookie.com/embed/${encodeURIComponent(link.dataset.demoId)}?autoplay=1&rel=0`;
    }
}

const demoDialog = document.getElementById('demo-video-modal');
if (demoDialog && typeof demoDialog.showModal === 'function') {
    new DemoVideoModal(demoDialog);
}
