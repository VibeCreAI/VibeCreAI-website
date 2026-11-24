const buildSeconds = 4;
const launchSeconds = 0.65;
const volleySeconds = 1.1;
const hitOrder = [1, 5, 2, 6, 3, 0, 4];
const brickColors = ['#64edeb', '#91eac3', '#ffdc81', '#ffad83', '#ffacc9', '#cbb1ff', '#8bd7ff'];
const codeLines = ['const bricks = row(7);', 'spawn(paddle, ball);', 'game.start();'];
const brickX = (column) => 86 + column * 46;
const mix = (from, to, amount) => from + (to - from) * amount;
const clamp01 = (value) => Math.max(0, Math.min(1, value));

export const demoSeconds = buildSeconds + launchSeconds + volleySeconds * hitOrder.length + 1.8;

// A single overlay shutters the game, title and separate animated mascot together.
export function createMarqueeShutter(T, screen) {
    const material = new T.ShaderMaterial({
        uniforms: { aperture: { value: 1 } },
        transparent: true,
        depthWrite: false,
        vertexShader: `
            varying vec2 screenUV;
            void main() {
                screenUV = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }`,
        fragmentShader: `
            varying vec2 screenUV;
            uniform float aperture;
            void main() {
                vec2 d = abs(screenUV * 2.0 - 1.0);
                float edge = mix(-0.025, 1.025, aperture);
                float cover = smoothstep(edge - 0.015, edge + 0.015, d.y);
                float beam = 1.0 - smoothstep(0.003, 0.028, abs(d.y - max(0.0, edge)));
                float width = mix(0.14, 1.04, smoothstep(0.0, 0.28, aperture));
                beam *= (1.0 - smoothstep(width - 0.04, width, d.x))
                      * (1.0 - smoothstep(0.75, 1.0, aperture));
                vec3 phosphor = mix(vec3(0.031, 0.055, 0.071), vec3(0.23, 0.85, 0.84), beam);
                gl_FragColor = vec4(phosphor, max(cover, beam));
            }`
    });
    const shutter = new T.Mesh(screen.geometry, material);
    shutter.position.z = 0.015;
    shutter.layers.set(2);
    shutter.renderOrder = 4;
    shutter.visible = false;
    screen.add(shutter);
    return shutter;
}

// The build meter and the game share the same seven bricks on this 448 × 133 display.
export function drawDeskDemo(ctx, time, stamp, t, scale) {
    const launch = clamp01((time - buildSeconds) / launchSeconds);
    const volleys = Math.max(0, (time - buildSeconds - launchSeconds) / volleySeconds);
    const cleared = Math.min(hitOrder.length, Math.floor(volleys + 0.5));
    const building = time < buildSeconds;
    const progress = clamp01(time / (buildSeconds - 0.45));
    ctx.resetTransform();
    ctx.fillStyle = '#071321';
    ctx.fillRect(0, 0, 448, 133);
    ctx.setTransform(scale, 0, 0, scale, 224 * (1 - scale), 66.5 * (1 - scale));
    ctx.fillStyle = '#102b37';
    for (let i = 0; i < 44; i++) {
        ctx.fillRect((i * 83) % 414 + 17, (i * 37) % 89 + 39, 2, 2);
    }
    ctx.fillStyle = '#28515b';
    ctx.fillRect(40, 30, 368, 1);
    stamp(ctx, 42, 9, 2, '#50f5e3');
    ctx.font = '18px DungGeunMo, monospace';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#e4fcff';
    ctx.fillText(building ? 'brick-break.js' : t('BRICK BREAK'), 70, 17);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#ffdc81';
    ctx.fillText(building ? t('BUILD') + ' ' + Math.floor(progress * 100) + '%' :
        '1UP ' + String(cleared * 100).padStart(4, '0'), 406, 17);

    if (building) {
        ctx.textAlign = 'left';
        ctx.font = '19px DungGeunMo, monospace';
        codeLines.forEach((line, i) => {
            const letters = Math.floor(clamp01((time - i * 1.05) / 1.05) * line.length);
            ctx.fillStyle = ['#83e9f3', '#e8f7fa', '#a9f49e'][i];
            if (letters > 0) ctx.fillText(line.slice(0, letters), 68, 45 + i * 22);
            if (time >= i * 1.05 && letters < line.length) {
                const cursor = ctx.measureText(line.slice(0, letters)).width;
                ctx.fillRect(69 + Math.round(cursor), 50 + i * 22, 9, 2);
            }
        });
    }

    const brickY = Math.round(mix(105, 42, launch * launch * (3 - 2 * launch)));
    for (let i = 0; i < hitOrder.length; i++) {
        if (hitOrder.indexOf(i) < cleared) continue;
        const filled = i < Math.floor(progress * hitOrder.length);
        const x = brickX(i) - 19;
        ctx.fillStyle = filled ? brickColors[i] : '#29424f';
        ctx.fillRect(x, brickY, 38, 11);
        ctx.fillStyle = filled ? '#ffffff80' : '#0e202d';
        ctx.fillRect(x + 2, brickY + 2, 34, 2);
    }
    if (building) return;
    if (volleys >= hitOrder.length) {
        ctx.textAlign = 'center';
        ctx.font = '30px DungGeunMo, monospace';
        ctx.fillStyle = '#ffdc81';
        ctx.fillText(t('STAGE CLEAR'), 224, 81);
        return;
    }

    // Each volley starts and ends at the paddle, touching its target brick at the midpoint.
    const volley = Math.floor(volleys);
    const phase = volleys - volley;
    const target = brickX(hitOrder[volley]);
    const from = volley ? (brickX(hitOrder[volley - 1]) + target) / 2 : 224;
    const to = volley + 1 < hitOrder.length ? (brickX(hitOrder[volley + 1]) + target) / 2 : 224;
    const ballX = phase < 0.5 ? mix(from, target, phase * 2) : mix(target, to, phase * 2 - 1);
    const ballY = mix(105, 56, 1 - Math.abs(phase * 2 - 1));
    const paddleX = Math.round(mix(from, to, phase * phase * (3 - 2 * phase)));
    ctx.fillStyle = '#35d8e0';
    ctx.fillRect(paddleX - 18, 109, 36, 6);
    ctx.fillStyle = '#c8ffff';
    ctx.fillRect(paddleX - 15, 108, 30, 2);
    ctx.fillStyle = '#fff4c5';
    ctx.fillRect(Math.round(ballX) - 3, Math.round(ballY) - 3, 6, 6);

    const burst = (phase - 0.5) * 4;
    if (burst >= 0 && burst < 1) {
        ctx.fillStyle = brickColors[hitOrder[volley]];
        for (let i = 0; i < 6; i++) {
            const angle = Math.PI * i / 3;
            ctx.fillRect(Math.round(target + Math.cos(angle) * (6 + 16 * burst)),
                Math.round(48 + Math.sin(angle) * (5 + 12 * burst)), 3, 3);
        }
    }
}
