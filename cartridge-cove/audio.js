const clips = {
    music: ['one-more-coin.mp3', 0.35],
    typing: ['typing.mp3', 0.12],
    stepA: ['stone-step-a.mp3', 0.20],
    stepB: ['stone-step-b.mp3', 0.23],
    stepC: ['stone-step-c.mp3', 0.26],
    tap: ['tap.wav', 0.34],
    select: ['select.wav', 0.32],
    back: ['back.wav', 0.31]
};
const button = document.querySelector('#arcade-sound');
const Context = window.AudioContext || window.webkitAudioContext;
const buffers = new Map();
const loading = new Set();
const nativeClips = new Map();
const stoneSteps = ['stepA', 'stepB', 'stepC'];
const preferenceKey = 'vibecreai.sound';
let nextStep = 0, lastStepAt = -Infinity;
let context, master, music, keyboard, suspendTimer;
let enabled = true, typing = false;
try { enabled = localStorage.getItem(preferenceKey) !== 'off'; } catch { /* Use the default for this visit. */ }

function audible() {
    return enabled && !button.hidden && !document.hidden && !document.body.classList.contains('demo-modal-open');
}

function mediaClip(name) {
    if (!nativeClips.has(name)) {
        const [file, volume] = clips[name];
        const audio = new Audio('/sound/arcade/' + file);
        audio.volume = volume;
        audio.loop = name === 'music' || name === 'typing';
        nativeClips.set(name, audio);
    }
    return nativeClips.get(name);
}

function start(name, loop = false) {
    if (!buffers.has(name)) return;
    const source = context.createBufferSource();
    const gain = context.createGain();
    source.buffer = buffers.get(name);
    source.loop = loop;
    gain.gain.value = clips[name][1];
    source.connect(gain).connect(master);
    source.onended = () => {
        source.disconnect();
        gain.disconnect();
    };
    source.start();
    return { source, gain };
}

function sync() {
    const on = audible();
    if (!Context) {
        if (!on) {
            for (const audio of nativeClips.values()) audio.pause();
            return;
        }
        const track = mediaClip('music');
        if (track.paused) void track.play().catch(() => {});
        const keys = mediaClip('typing');
        if (typing && keys.paused) void keys.play().catch(() => {});
        else if (!typing && !keys.paused) {
            keys.pause();
            keys.currentTime = 0;
        }
        return;
    }
    if (!context) return;
    clearTimeout(suspendTimer);
    master.gain.setTargetAtTime(on ? 1 : 0, context.currentTime, 0.02);
    if (on) {
        if (context.state !== 'running') void context.resume().catch(() => {});
        music ??= start('music', true);
    } else {
        // Let the fade finish, then freeze the playhead until the visitor returns.
        suspendTimer = setTimeout(() => {
            if (!audible()) void context.suspend().catch(() => {});
        }, 120);
    }
    if (on && typing) {
        keyboard ??= start('typing', true);
    } else if (keyboard) {
        keyboard.gain.gain.setTargetAtTime(0, context.currentTime, 0.012);
        keyboard.source.stop(context.currentTime + 0.06);
        keyboard = null;
    }
}

async function load(name) {
    if (buffers.has(name) || loading.has(name)) return;
    loading.add(name);
    try {
        const response = await fetch('/sound/arcade/' + clips[name][0]);
        if (!response.ok) throw Error(response.statusText);
        buffers.set(name, await context.decodeAudioData(await response.arrayBuffer()));
        if (name === 'music' || name === 'typing') sync();
    } catch (error) {
        console.warn('Arcade audio unavailable:', name, error);
    } finally {
        loading.delete(name);
    }
}

function applySoundPreference() {
    button.setAttribute('aria-pressed', String(enabled));
    if (button.hidden) return;
    if (enabled && Context && !context) {
        context = new Context();
        master = context.createGain();
        master.gain.value = 0;
        master.connect(context.destination);
    }
    sync();
    if (enabled) Object.keys(clips).forEach(context ? load : mediaClip);
}

button.hidden = !Context && !document.createElement('audio').canPlayType('audio/mpeg');
applySoundPreference();
button.addEventListener('click', () => {
    enabled = !enabled;
    try { localStorage.setItem(preferenceKey, enabled ? 'on' : 'off'); } catch { /* The toggle still works for this visit. */ }
    applySoundPreference();
});
// Autoplay can be suspended until a trusted interaction. Retry inside the gesture itself.
function unlockOnInteraction(event) {
    if (!event.isTrusted || !audible() || button.contains(event.target)) return;
    if (context ? context.state !== 'running' : nativeClips.get('music')?.paused) sync();
}
for (const type of ['pointerdown', 'pointerup', 'keydown', 'click'])
    document.addEventListener(type, unlockOnInteraction, { capture: true, passive: true });
document.addEventListener('visibilitychange', sync);
new MutationObserver(sync).observe(document.body, { attributeFilter: ['class'] });

export function setTyping(value) {
    typing = value;
    sync();
}

export function playFootstep(now) {
    // A fast finger drag can cross several footfalls in a single rendered frame.
    if (now - lastStepAt < 125) return;
    lastStepAt = now;
    playCue(stoneSteps[nextStep]);
    nextStep = (nextStep + 1) % stoneSteps.length;
}

export function playCue(name) {
    if (!audible()) return;
    if (!Context) {
        const cue = mediaClip(name);
        cue.currentTime = 0;
        void cue.play().catch(() => {});
    } else if (context?.state === 'running') start(name);
}
