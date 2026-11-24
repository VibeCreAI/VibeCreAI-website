const number = new Intl.NumberFormat('en-US');
const storageKey = 'vibecreai.astrocade.scores.v1';
const isCount = (n) => Number.isSafeInteger(n) && n >= 0;

function valid(data) {
    return data && isCount(data.total) && isCount(data.updatedAt) && Array.isArray(data.games) &&
        data.games.length === 10 && new Set(data.games.map((g) => g?.id)).size === 10 &&
        data.games.every((g) => g && /^[A-Z0-9]{26}$/.test(g.id) && typeof g.title === 'string' && isCount(g.plays));
}

function roll(node, value, previous) {
    const text = number.format(value);
    node.textContent = text;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || !node.animate) return;
    const label = document.createElement('span');
    label.className = 'score-accessible';
    label.textContent = text;
    const reels = document.createElement('span');
    reels.className = 'score-reels';
    reels.setAttribute('aria-hidden', 'true');
    node.replaceChildren(label, reels);
    const from = String(previous ?? 0).padStart(String(value).length, '0').slice(-String(value).length);
    let index = 0;
    const animations = [];
    for (const char of text) {
        if (char === ',') {
            reels.append(char);
            continue;
        }
        const lane = document.createElement('span');
        lane.className = 'score-lane';
        const tape = document.createElement('span');
        lane.append(tape);
        reels.append(lane);
        const start = Number(from[index++]);
        const steps = (Number(char) - start + 10) % 10 || (previous === undefined ? 10 : 0);
        tape.textContent = Array.from({ length: steps + 1 }, (_, i) => (start + i) % 10).join('\n');
        if (steps) animations.push(tape.animate(
            [{ transform: 'translateY(0)' }, { transform: 'translateY(-' + steps + 'em)' }],
            { duration: 420 + index * 42, easing: 'cubic-bezier(.18,.75,.18,1)', fill: 'forwards' }
        ).finished);
    }
    Promise.allSettled(animations).then(() => {
        if (node.contains(reels)) node.textContent = text;
    });
}

export function mountArcadeScores(root, onLayout = () => {}) {
    const total = root.querySelector('.arcade-plays strong');
    const list = root.querySelector('.arcade-covers');
    const status = root.querySelector('.score-status');
    const entries = new Map();
    const shown = new WeakMap();
    const observer = new IntersectionObserver((changes) => {
        for (const { target, isIntersecting } of changes) {
            if (!isIntersecting) continue;
            const value = Number(target.dataset.score);
            roll(target, value, shown.get(target));
            shown.set(target, value);
            observer.unobserve(target);
        }
    });
    function score(node, value) {
        if (node.dataset.score === String(value)) return;
        node.dataset.score = value;
        node.textContent = number.format(value);
        observer.observe(node);
    }
    function register(item) {
        const link = item.querySelector('a'), small = link.querySelector('small');
        const count = document.createElement('span');
        const value = Number(small.textContent.replace(/[^0-9]/g, ''));
        small.replaceChildren(count, ' plays');
        window.VibeLocale.localize(small);
        const entry = { item, link, count };
        entries.set(link.href.split('/').pop(), entry);
        score(count, value);
        return entry;
    }
    for (const item of list.children) register(item);
    score(total, Number(total.textContent.replace(/,/g, '')));

    function apply(data) {
        const ids = new Set(data.games.map((g) => g.id));
        for (const [id, entry] of entries) {
            if (!ids.has(id)) {
                observer.unobserve(entry.count);
                entry.item.remove();
                entries.delete(id);
            }
        }
        for (const [index, game] of data.games.entries()) {
            let entry = entries.get(game.id);
            if (!entry) {
                const item = document.createElement('li');
                item.innerHTML = '<a class="game-cover" target="_blank" rel="noopener"><img width="384" height="576" loading="lazy" alt=""><strong></strong><small></small></a>';
                const slug = game.title.toLowerCase().replace(/'/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'game';
                item.firstChild.href = 'https://www.astrocade.com/games/' + slug + '/' + game.id;
                if (typeof game.thumbnail === 'string' && game.thumbnail.startsWith('https://'))
                    item.querySelector('img').src = game.thumbnail;
                entry = register(item);
            }
            entry.link.querySelector('strong').textContent = game.title;
            window.VibeLocale.localize(entry.link);
            score(entry.count, game.plays);
            if (list.children[index] !== entry.item) list.insertBefore(entry.item, list.children[index] || null);
        }
        score(total, data.total);
        onLayout();
    }
    try {
        const saved = JSON.parse(localStorage.getItem(storageKey));
        if (valid(saved)) apply(saved);
    } catch { /* Storage is optional in private browsing. */ }
    fetch('/api/astrocade-stats', { cache: 'no-store', signal: AbortSignal.timeout?.(50000) })
        .then(async (response) => {
            if (!response.ok) throw Error('Scores unavailable');
            const data = await response.json();
            if (!valid(data)) throw Error('Incomplete scoreboard');
            apply(data);
            status.hidden = !data.stale;
            try { localStorage.setItem(storageKey, JSON.stringify(data)); } catch { /* Optional. */ }
            onLayout();
        }).catch(() => {
            status.hidden = false;
            onLayout();
        });
}
