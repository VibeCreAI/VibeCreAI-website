import { bindAvatarMotion } from '../js/avatar-motion.js';

// Row order follows the VibeTube face atlas. Each row has open and blinking eyes.
const neutral = 0,
    smile = 1,
    surprise = 2,
    focus = 3,
    awkward = 4;
const gestures = {
    'waving-gesture': [smile, surprise],
    'quick-formal-bow': [neutral, smile],
    clapping: [surprise, smile],
    waving: [smile, neutral],
    'whatever-gesture': [awkward, surprise],
    'victory-idle': [smile, surprise],
    'house-dancing': [focus, smile]
};
const pick = (items) => items[Math.floor(Math.random() * items.length)];

export function avatarReactions(T, root, bones, materials, quickWave, loadMotion) {
    const face = new T.Vector2(0, neutral);
    let sinceBlink = 0,
        nextBlink = 2.5;
    const faces = new T.TextureLoader().load(root + 'idle-faces.webp', () => {
        faces.flipY = false;
        faces.encoding = T.sRGBEncoding;
        for (const material of materials) {
            material.onBeforeCompile = (shader) => {
                shader.uniforms.faceTiles = { value: faces };
                shader.uniforms.faceFrame = { value: face };
                shader.fragmentShader =
                    'uniform sampler2D faceTiles;\nuniform vec2 faceFrame;\n' +
                    shader.fragmentShader.replace(
                        '#include <map_fragment>',
                        `#include <map_fragment>
                        if (vUv.x < 0.25 && vUv.y < 0.25) {
                            vec2 uv = (vUv * 4.0 + faceFrame) / vec2(2.0, 6.0);
                            diffuseColor.rgb = mapTexelToLinear(texture2D(faceTiles, uv)).rgb;
                        }`
                    );
            };
            material.needsUpdate = true;
        }
    });
    const clips = new Map([['waving-gesture', quickWave]]);
    const disabled = new Set();
    let bag = [],
        previous = '',
        queued = '',
        action = null;
    let time = 0,
        weight = 0,
        resting = false,
        wait = 0;

    function chooseGesture() {
        if (!bag.length) bag = Object.keys(gestures).filter((name) => !disabled.has(name));
        const choices = bag.filter((name) => name !== previous);
        queued = pick(choices.length ? choices : bag);
        bag.splice(bag.indexOf(queued), 1);
        if (clips.has(queued)) return;
        const name = queued;
        clips.set(name, null);
        loadMotion(root + 'motions/' + name + '.json')
            .then((data) => clips.set(name, bindAvatarMotion(T, data, bones)))
            .catch(() => {
                disabled.add(name);
                clips.delete(name);
            });
    }

    return function update(dt, atRest, still, baseLift) {
        sinceBlink += dt;
        if (sinceBlink >= nextBlink + 0.15) {
            sinceBlink = 0;
            nextBlink = 2.2 + Math.random() * 3.2;
        }
        face.x = !still && sinceBlink >= nextBlink ? 1 : 0;
        if (still) {
            action = null;
            resting = false;
            face.y = neutral;
            return baseLift;
        }
        if (atRest !== resting) {
            resting = atRest;
            if (resting) {
                wait = 0.65 + Math.random() * 0.55;
                face.y = pick([neutral, smile, focus]);
                chooseGesture();
            } else face.y = neutral;
        }
        if (resting && !action) {
            wait -= dt;
            if (disabled.has(queued)) chooseGesture();
            if (wait <= 0 && clips.get(queued)) {
                action = clips.get(queued);
                previous = queued;
                face.y = pick(gestures[queued].filter((row) => row !== face.y));
                time = weight = 0;
            }
        }
        if (!action) return baseLift;
        time += dt;
        weight = T.MathUtils.clamp(weight + dt * (resting ? 4 : -6), 0, 1);
        const blend = Math.min(weight, T.MathUtils.smoothstep(action.duration - time, 0, 0.3));
        if (!blend) {
            action = null;
            if (resting) {
                face.y = pick([neutral, focus, smile]);
                wait = 2.4 + Math.random() * 3.4;
                chooseGesture();
            }
            return baseLift;
        }
        return T.MathUtils.lerp(baseLift, action.sample(time, blend), blend);
    };
}
