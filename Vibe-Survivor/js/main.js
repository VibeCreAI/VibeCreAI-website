(function () {
    function ensureGameInstance() {
        if (!window.vibeSurvivor) {
            if (typeof VibeSurvivor === 'function') {
                window.vibeSurvivor = new VibeSurvivor();
            } else {
                console.warn('Vibe Survivor script not ready yet.');
                return null;
            }
        }
        return window.vibeSurvivor;
    }

    function launchGame(event) {
        if (event) {
            event.preventDefault();
        }

        const game = ensureGameInstance();
        if (game && typeof game.launchGame === 'function') {
            game.launchGame();
        } else {
            console.error('Unable to launch Vibe Survivor - instance missing.');
        }
    }

    function closeGame(event) {
        if (event) {
            event.preventDefault();
        }

        const game = window.vibeSurvivor;
        if (game && typeof game.cleanExit === 'function') {
            game.cleanExit();
        }
    }

    function wireControls() {
        const launchers = document.querySelectorAll('[data-launch-game]');
        launchers.forEach((el) => {
            el.addEventListener('click', launchGame);
            el.addEventListener('keyup', (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    launchGame(event);
                }
            });
        });

        const closers = document.querySelectorAll('[data-close-game]');
        closers.forEach((el) => {
            el.addEventListener('click', closeGame);
            el.addEventListener('keyup', (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    closeGame(event);
                }
            });
        });
    }

    function updateYear() {
        const target = document.getElementById('copyright-year');
        if (target) {
            target.textContent = new Date().getFullYear();
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        updateYear();
        wireControls();
    });
})();
