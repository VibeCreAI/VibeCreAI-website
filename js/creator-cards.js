import { bindAvatarMotion } from './avatar-motion.js';
import { addArcadeLights, createToonBands, shadeArcadeAvatar } from './arcade-look.js';
import { inkRenderer } from '../cartridge-cove/ink-renderer.js';

const programs = {
    greeting: ['quick-formal-bow', 'waving', 'waving-gesture'],
    collaboration: ['house-dancing', 'catwalk-idle'],
    victory: ['victory-idle', 'catwalk-idle']
};

function createPlaylist(kind) {
    const names = programs[kind];
    let remaining = [];
    let previous;
    return () => {
        if (!remaining.length) remaining = [...names];
        const choices = remaining.filter(name => name !== previous);
        const next = kind === 'greeting'
            ? choices[Math.floor(Math.random() * choices.length)]
            : remaining[0];
        remaining.splice(remaining.indexOf(next), 1);
        previous = next;
        return next;
    };
}

async function startCards(icons, celShaded) {
    if (!window.THREE) await import('./vendor/three/three.min.js');
    if (!window.THREE.GLTFLoader) await import('./vendor/three/GLTFLoader.js');
    const T = window.THREE;
    const folder = new URL('../images/workstation/', import.meta.url).href;
    const names = [...new Set(Object.values(programs).flat())];
    const [avatar, ...clips] = await Promise.all([
        new T.GLTFLoader().loadAsync(folder + 'model.glb'),
        ...names.map(async name => {
            const response = await fetch(folder + 'motions/' + name + '.json');
            if (!response.ok) throw new Error('Could not load ' + name);
            return response.json();
        })
    ]);

    const bones = {};
    const bands = celShaded ? createToonBands(T) : null;
    avatar.scene.traverse(object => {
        if (object.isBone) bones[object.name.replace(/^mixamorig:?/, '')] = object;
        if (object.isSkinnedMesh) {
            if (celShaded) shadeArcadeAvatar(T, object, bands);
            else object.frustumCulled = false;
        }
    });
    const motions = new Map(names.map((name, i) => [name, bindAvatarMotion(T, clips[i], bones)]));
    const scene = new T.Scene();
    scene.add(avatar.scene);
    if (celShaded) {
        addArcadeLights(T, scene);
    } else {
        const key = new T.DirectionalLight(0xffead5, 0.85);
        key.position.set(-2.5, 4, 3.5);
        const rim = new T.DirectionalLight(0x92d9ff, 0.7);
        rim.position.set(2.5, 2, -2.4);
        scene.add(key, rim, new T.HemisphereLight(0xfff5eb, 0x96adc5, 0.94));
    }
    const camera = new T.OrthographicCamera(-1.43, 1.43, 1.43, -1.43, 0.1, 20);
    camera.position.set(0.6, 1.55, 6);
    camera.lookAt(0, 1.25, 0);

    // Pose one rig for each visible card and copy its frame before posing the next.
    const renderer = new T.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
    renderer.outputEncoding = T.sRGBEncoding;
    renderer.setClearColor(0, 0);
    renderer.setSize(240, 240, false);
    const ink = celShaded ? inkRenderer(T, renderer, { transparentBackground: true }) : null;
    // Card portraits display at roughly 100 CSS pixels across.
    ink?.resize(120, 120, 2);
    const cards = new Map(icons.map(icon => {
        const stage = document.createElement('span');
        stage.className = 'creator-stage';
        stage.setAttribute('aria-hidden', 'true');
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 240;
        stage.append(canvas);
        const kind = icon.dataset.creator;
        if (kind === 'collaboration') {
            const bot = document.createElement('span');
            bot.className = 'creator-bot';
            stage.append(bot);
        }
        const pick = createPlaylist(kind);
        const state = {
            pick, current: pick(), next: pick(), time: 0, visible: false,
            stage, context: canvas.getContext('2d')
        };
        return [icon, state];
    }));

    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const fade = 0.28;
    let frame = 0;
    let last = 0;

    function draw(now) {
        frame = 0;
        if (document.hidden) return;
        if (last && now - last < 1000 / 24) {
            frame = requestAnimationFrame(draw);
            return;
        }
        const delta = last ? Math.min((now - last) / 1000, 0.12) : 0;
        last = now;
        for (const [icon, card] of cards) {
            if (!card.visible) continue;
            let motion = motions.get(card.current);
            card.time += reduced.matches ? 0 : delta;
            if (card.time >= motion.duration) {
                card.time = card.time - motion.duration + fade;
                card.current = card.next;
                card.next = card.pick();
                motion = motions.get(card.current);
            }
            let height = motion.sample(card.time);
            const overlap = card.time - (motion.duration - fade);
            if (overlap > 0) {
                const blend = T.MathUtils.smoothstep(overlap, 0, fade);
                const nextHeight = motions.get(card.next).sample(overlap, blend);
                height = T.MathUtils.lerp(height, nextHeight, blend);
            }
            avatar.scene.position.y = height;
            if (ink) ink.draw(scene, camera);
            else renderer.render(scene, camera);
            card.context.clearRect(0, 0, 240, 240);
            card.context.drawImage(renderer.domElement, 0, 0);
            if (!card.stage.parentNode) {
                icon.append(card.stage);
                icon.classList.add('has-motion');
            }
        }
        if (!reduced.matches) frame = requestAnimationFrame(draw);
    }

    function schedule() {
        cancelAnimationFrame(frame);
        last = 0;
        if (!document.hidden && [...cards.values()].some(card => card.visible)) {
            frame = requestAnimationFrame(draw);
        }
    }

    const observer = new IntersectionObserver(entries => {
        for (const entry of entries) cards.get(entry.target).visible = entry.isIntersecting;
        schedule();
    });
    for (const icon of icons) observer.observe(icon);
    document.addEventListener('visibilitychange', schedule);
    reduced.addEventListener('change', schedule);
    renderer.domElement.addEventListener('webglcontextlost', () => {
        observer.disconnect();
        cancelAnimationFrame(frame);
        document.removeEventListener('visibilitychange', schedule);
        reduced.removeEventListener('change', schedule);
        for (const [icon, card] of cards) {
            card.stage.remove();
            icon.classList.remove('has-motion');
        }
        ink?.dispose();
        bands?.dispose();
        renderer.dispose();
    }, { once: true });
}

export function mountCreatorCards(section, { celShaded = false } = {}) {
    if (!section || navigator.connection?.saveData) return;
    const preload = new IntersectionObserver(entries => {
        if (!entries.some(entry => entry.isIntersecting)) return;
        preload.disconnect();
        startCards([...section.querySelectorAll('[data-creator]')], celShaded).catch(error => {
            console.warn('Creator cards are using their original artwork.', error);
        });
    }, { rootMargin: '200px' });
    preload.observe(section);
}

mountCreatorCards(document.querySelector('#about'));
