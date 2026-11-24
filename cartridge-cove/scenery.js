const T = window.THREE;
const { t } = window.VibeLocale;
export const stations = [
    {
        id: 'creator',
        title: 'Meet the Developer',
        sign: 'SAMSON',
        color: '#56ffe8',
        art: 'Samson_pixel.png'
    },
    {
        id: 'astrocade',
        title: 'Astrocade',
        sign: 'FLY FOR BRAINROT',
        color: '#a5f776',
        art: 'astrocade-fly-for-brainrots.webp'
    },
    {
        id: 'chroma',
        title: 'Chroma Award',
        sign: 'HOLLOW STRIDER',
        color: '#ffac61',
        art: 'hollow-strider-trailer.webp'
    },
    {
        id: 'apps',
        title: 'Bonus Stage',
        sign: 'SPIN2PICK',
        color: '#d4a7ff',
        art: 'spin2pick_icon.png'
    }
];
export const standTravel = 1.5;
const cabinetOffset = 0.8;
const points = [new T.Vector3(0, 0, 0), new T.Vector3(1.3, 0, -0.16), new T.Vector3(2.65, 0, 0.52)];
const stopKnots = [];
stations.forEach((s, i) => {
    s.x = 5.3 + cabinetOffset + i * 4.65;
    points.push(new T.Vector3(s.x, 0, 0.18));
    stopKnots.push(points.length - 1);
});
export const route = new T.CatmullRomCurve3(points);
route.arcLengthDivisions = (points.length - 1) * 60;
const lengths = route.getLengths(route.arcLengthDivisions);
export const routeLength = lengths[lengths.length - 1];
export const stops = stopKnots.map((i) => standTravel + lengths[i * 60]);

export function makeArcade(scene, onFontReady) {
    const bands = new T.DataTexture(new Uint8Array([38, 99, 170, 245]), 4, 1, T.LuminanceFormat);
    bands.minFilter = bands.magFilter = T.NearestFilter;
    bands.needsUpdate = true;
    const batches = new Map(),
        cube = new T.BoxGeometry(),
        transform = new T.Object3D(),
        materials = new Map();
    const matte = (c) => new T.Color(c).convertSRGBToLinear();
    const palette = new Map();
    function piece(geom, color, x, y, z, w = 1, h = 1, d = 1, rx = 0, ry = 0, rz = 0, lit = false) {
        // Share one draw call per lighting mode and aisle section. Vertex colors preserve the paint.
        const key = [Math.floor(x / 7), lit].join('/');
        if (!batches.has(key)) batches.set(key, { lit, p: [], n: [], colors: [] });
        const b = batches.get(key);
        transform.position.set(x, y, z);
        transform.rotation.set(rx, ry, rz);
        transform.scale.set(w, h, d);
        transform.updateMatrix();
        const g = geom.index ? geom.toNonIndexed() : geom.clone();
        g.applyMatrix4(transform.matrix);
        b.p.push(...g.attributes.position.array);
        b.n.push(...g.attributes.normal.array);
        if (!palette.has(color)) palette.set(color, matte(color));
        const { r, g: green, b: blue } = palette.get(color);
        for (let i = 0; i < g.attributes.position.count; i++) b.colors.push(r, green, blue);
        g.dispose();
    }
    const box = (x, y, z, w, h, d, c, rx = 0, rz = 0, lit = false) =>
        piece(cube, c, x, y, z, w, h, d, rx, 0, rz, lit);
    function cyl(x, y, z, rad, ht, col, sides = 12, lit = false) {
        const g = new T.CylinderGeometry(rad, rad, ht, sides);
        piece(g, col, x, y, z, 1, 1, 1, 0, 0, 0, lit);
        g.dispose();
    }
    const ball = new T.SphereGeometry(1, 10, 7);
    function canvasTexture(w, h, draw) {
        const c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        draw(c.getContext('2d'), w, h);
        const tx = new T.CanvasTexture(c);
        tx.encoding = T.sRGBEncoding;
        tx.magFilter = T.NearestFilter;
        tx.minFilter = T.LinearMipmapLinearFilter;
        tx.anisotropy = 4;
        return tx;
    }
    const signPainters = [];
    function signTexture(w, h, draw) {
        const texture = canvasTexture(w, h, draw);
        signPainters.push(() => {
            draw(texture.image.getContext('2d'), w, h);
            texture.needsUpdate = true;
        });
        return texture;
    }
    function face(tx, x, y, z, w, h, rx = 0) {
        const m = new T.Mesh(
            new T.PlaneGeometry(w, h),
            new T.MeshBasicMaterial({
                map: tx,
                polygonOffset: true,
                polygonOffsetFactor: -1,
                polygonOffsetUnits: -3
            })
        );
        m.position.set(x, y, z);
        m.rotation.x = rx;
        scene.add(m);
        return m;
    }
    const halo = canvasTexture(64, 64, (c) => {
        const gradient = c.createRadialGradient(32, 32, 0, 32, 32, 32);
        gradient.addColorStop(0, 'rgba(255,255,255,.82)');
        gradient.addColorStop(0.46, 'rgba(255,255,255,.34)');
        gradient.addColorStop(1, 'rgba(255,255,255,0)');
        c.fillStyle = gradient;
        c.fillRect(0, 0, 64, 64);
    });
    function pool(x, y, z, w, h, color, opacity, wall = false, shadow = false) {
        const mat = new T.MeshBasicMaterial({
            map: halo,
            color: matte(color),
            opacity,
            transparent: true,
            depthWrite: false,
            blending: shadow ? T.NormalBlending : T.AdditiveBlending,
            polygonOffset: true,
            polygonOffsetFactor: -1,
            polygonOffsetUnits: -2
        });
        const glow = new T.Mesh(new T.PlaneGeometry(w, h), mat);
        glow.layers.set(2);
        glow.position.set(x, y, z);
        glow.rotation.x = wall ? 0 : -Math.PI / 2;
        glow.renderOrder = shadow ? 1 : 2;
        scene.add(glow);
    }
    const alien = ['001000100', '000101000', '001111100', '011010110', '111111111', '101111101', '101000101'];
    function stamp(ctx, x, y, s, col) {
        ctx.fillStyle = col;
        alien.forEach((row, j) =>
            [...row].forEach((v, i) => {
                if (v === '1') ctx.fillRect(x + i * s, y + j * s, s, s);
            })
        );
    }
    function lettering(ctx, str, x, y, px, color, width) {
        const size = /[가-힣]/.test(str) ? Math.round(px * 0.77) : px;
        ctx.font = size + 'px DungGeunMo, sans-serif';
        ctx.fillStyle = color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(str, x, y, width);
    }
    function sign(text, sub, x, y, z, w, h, color) {
        box(x, y, z, w + 0.1, h + 0.09, 0.13, '#111e29');
        const tx = signTexture(640, Math.round((640 * h) / w), (ctx, W, H) => {
            ctx.fillStyle = '#101b27';
            ctx.fillRect(0, 0, W, H);
            ctx.fillStyle = color;
            ctx.fillRect(5, 4, W - 10, 3);
            ctx.fillRect(5, H - 7, W - 10, 3);
            lettering(
                ctx,
                t(text),
                W / 2,
                H * (sub ? 0.41 : 0.52),
                Math.floor(H * (sub ? 0.62 : 0.78)),
                color,
                W * 0.94
            );
            if (sub)
                lettering(
                    ctx,
                    t(sub),
                    W / 2,
                    H * 0.76,
                    Math.floor(H * 0.21),
                    '#e0e6d6',
                    W * 0.87
                );
        });
        return face(tx, x, y, z + 0.073, w, h);
    }
    function stationMarquee(station, cabinetZ) {
        const { x, color } = station;
        const w = 2.64, h = 0.42, y = 2.80, z = cabinetZ + 0.1;
        const roof = 2.49, mountHeight = y - h / 2 - roof;
        // Two feet bolt the lightbox to the cabinet tops, above their individual nameplates.
        for (const side of [-1, 1]) {
            const footX = x + side * cabinetOffset;
            box(footX, roof + mountHeight / 2, z, 0.10, mountHeight, 0.12, '#516778');
            box(footX, 2.50, z, 0.22, 0.045, 0.21, '#293641');
        }
        box(x, y, z, w + 0.13, h + 0.05, 0.16, '#24303c');
        box(x, y, z, w + 0.04, h + 0.12, 0.15, '#24303c');
        const tx = signTexture(768, 122, (ctx, W, H) => {
            const enamel = ctx.createLinearGradient(0, 0, 0, H);
            enamel.addColorStop(0, '#28404c');
            enamel.addColorStop(0.48, '#162832');
            enamel.addColorStop(1, '#0c1725');
            ctx.fillStyle = enamel;
            ctx.fillRect(0, 0, W, H);
            ctx.fillStyle = color;
            ctx.fillRect(10, 5, W - 20, 4);
            ctx.fillRect(24, H - 9, W - 48, 3);
            for (const edge of [0, W - 10]) ctx.fillRect(edge, 19, 10, H - 38);
            let textStart = 35;
            if (station.id === 'astrocade') {
                const path = document.querySelector('#quick-socials a[href*="astrocade.com/profile/"] path');
                ctx.save();
                ctx.translate(53, 25);
                ctx.scale(72 / 512, 72 / 512);
                ctx.fillStyle = '#f7fff6';
                ctx.fill(new Path2D(path.getAttribute('d')), 'evenodd');
                ctx.restore();
                textStart = 142;
            }
            const end = W - 67, center = (textStart + end) / 2;
            const title = t(station.title).toUpperCase();
            lettering(ctx, title, center + 3, H / 2 + 5, 94, '#050c14', end - textStart);
            lettering(ctx, title, center, H / 2 + 1, 94, color, end - textStart);
            // The stepped arrow is visible at a distance and doubles as the tap affordance.
            ctx.fillStyle = color;
            for (let row = 0; row < 5; row++)
                ctx.fillRect(W - 51 + (2 - Math.abs(2 - row)) * 6, H / 2 - 15 + row * 6, 12, 6);
        });
        return face(tx, x, y, z + 0.083, w, h);
    }
    const wall = '#273444',
        ink = '#121923',
        mint = '#50fcee',
        steel = '#74828b',
        ivory = '#c0bdb0',
        wine = '#703954';
    // A tiled basement with painted wall stripes, low fluorescent fixtures and exposed conduit.
    box(18, -0.18, 1.2, 55, 0.3, 14, '#182730');
    const floor = canvasTexture(256, 256, (ctx, W, H) => {
        ctx.fillStyle = '#22343c';
        ctx.fillRect(0, 0, W, H);
        for (let j = 0; j < 4; j++)
            for (let i = 0; i < 4; i++) {
                ctx.fillStyle = (i + j) % 2 ? '#203138' : '#243840';
                ctx.fillRect(i * 64 + 1, j * 64 + 1, 62, 62);
            }
        let seed = 49;
        for (let i = 0; i < 130; i++) {
            seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
            const x = seed % 251,
                y = (seed >>> 9) % 251;
            ctx.fillStyle = i % 3 ? '#34474b' : '#192c36';
            ctx.fillRect(x, y, (i % 5) + 1, 1);
        }
    });
    floor.wrapS = floor.wrapT = T.RepeatWrapping;
    floor.repeat.set(14, 3.5);
    face(floor, 18, -0.019, 1.2, 55, 14, -Math.PI / 2);
    box(18, 2.25, -3.8, 55, 4.5, 0.22, wall);
    box(-7, 2.25, 1, 0.21, 4.5, 10, wall);
    box(18, 0.62, -3.63, 55, 1.25, 0.17, '#152a35');
    for (let i = 0; i < 70; i++) {
        const x = -7 + i * 0.74;
        box(x, 0.68, -3.53, 0.022, 1.07, 0.035, '#283f49');
        if (i % 3 !== 0)
            box(x + 0.26, 0.64 + (i % 3) * 0.17, -3.52, 0.14, 0.14, 0.035, i % 2 ? '#26434c' : '#1b3640');
    }
    for (const [y, h, c] of [
        [0.12, 0.16, '#0d151f'],
        [1.25, 0.07, '#60a7a7'],
        [2.32, 0.19, '#734864'],
        [2.49, 0.07, '#e58b80'],
        [2.61, 0.045, '#55ded4'],
        [3.9, 0.12, '#0d1923']
    ])
        box(18, y, -3.59, 55, h, 0.14, c);
    box(18, 4.63, 0.2, 55, 0.15, 10, '#17212b');
    for (let x = -6; x < 46; x += 4.65) {
        box(x, 4.32, -0.15, 0.16, 0.28, 7.3, '#28313c');
        box(x + 1.3, 4.38, -1.26, 1.9, 0.13, 0.36, steel);
        for (const dz of [-0.09, 0.09])
            box(x + 1.3, 4.295, -1.26 + dz, 1.7, 0.055, 0.04, '#d3ffff', 0, 0, true);
        box(x, 2.8, -3.48, 0.09, 2.8, 0.09, '#60737b');
    }
    box(18, 3.73, -3.39, 55, 0.085, 0.1, '#54646d');
    // The cyan inlay follows the aisle past every cabinet.
    for (let x = -4; x < 44; x += 0.8) box(x, 0.003, 1.82, 0.46, 0.01, 0.037, '#397873', 0, 0, true);
    const loader = new T.TextureLoader();
    const botSheet = loader.load('../images/creator-bot.webp', () => {
        botSign.visible = true;
    });
    botSheet.magFilter = botSheet.minFilter = T.NearestFilter;
    botSheet.generateMipmaps = false;
    botSheet.encoding = T.sRGBEncoding;
    botSheet.repeat.set(1, 1 / 100);
    const botSign = face(botSheet, -0.35, 3.37, -2.942, 0.54, 0.54);
    botSign.visible = false;
    botSign.material.alphaTest = 0.5;
    botSign.layers.set(2);
    const mainSign = canvasTexture(896, 266, () => {});
    const ctx = mainSign.image.getContext('2d');
    const titleParts = [
        ['V', 76],
        ['IBE', 64],
        ['C', 76],
        ['RE', 64],
        ['AI', 76]
    ];
    let previousWord = -1;
    function updateMarquee(now, still) {
        const frame = still ? 50 : (50 + Math.floor(now / 80)) % 100;
        botSheet.offset.y = (99 - frame) / 100;
        const selected = still ? 0 : Math.floor(now / 1500) % 3;
        if (selected === previousWord) return;
        previousWord = selected;
        const { width, height } = mainSign.image;
        ctx.fillStyle = '#080e12';
        ctx.fillRect(0, 0, width, height);
        ctx.imageSmoothingEnabled = false;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
        const widths = titleParts.map(([word, size]) => {
            ctx.font = size + 'px VibeWordmark';
            return ctx.measureText(word).width;
        });
        let x = (width - widths.reduce((a, b) => a + b, 0) - 16) / 2;
        titleParts.forEach(([word, size], i) => {
            ctx.font = size + 'px VibeWordmark';
            ctx.fillStyle = '#28282a';
            ctx.fillText(word, x - 6, 184);
            ctx.fillStyle = word === 'AI' ? '#00ffff' : '#ffffff';
            ctx.fillText(word, x, 177);
            x += widths[i] + 4;
        });
        const words = ['VIBE CODING', 'CREATIVE', 'AI'].map(t);
        ctx.font = '32px DungGeunMo, sans-serif';
        const sizes = words.map((word) => ctx.measureText(word).width);
        x = (width - sizes.reduce((a, b) => a + b, 0) - 52) / 2;
        words.forEach((word, i) => {
            ctx.fillStyle = i === selected ? '#00ffff' : '#59a6a7';
            ctx.fillText(word, x, 236);
            if (i === selected) {
                ctx.fillStyle = '#00ffff';
                for (const [edge, dir] of [
                    [x - 8, 1],
                    [x + sizes[i] + 8, -1]
                ]) {
                    for (const [y, dy] of [
                        [204, 1],
                        [244, -1]
                    ]) {
                        ctx.fillRect(edge, y, dir * 9, dy * 2);
                        ctx.fillRect(edge, y, dir * 2, dy * 7);
                    }
                }
            }
            x += sizes[i] + 26;
        });
        mainSign.needsUpdate = true;
    }
    updateMarquee(0, true);
    box(-0.35, 2.95, -3.12, 4.55, 1.46, 0.27, ink);
    face(mainSign, -0.35, 2.95, -2.947, 4.4, 1.32);
    box(-0.35, 2.18, -3.08, 4.41, 0.038, 0.14, mint, 0, 0, true);
    pool(-0.35, 2.86, -3.43, 7.7, 3.2, '#17d9d1', 0.6, true);
    pool(0.05, 0.016, 0.26, 2.7, 2.15, '#000000', 0.86, false, true);
    pool(-0.6, 0.012, -0.93, 4.4, 2.8, '#0dd9c9', 0.19);
    const sideShape = new T.Shape();
    [
        [-0.65, 0.05],
        [0.64, 0.05],
        [0.65, 0.82],
        [0.74, 1.08],
        [0.7, 1.24],
        [0.36, 1.31],
        [0.16, 2.04],
        [0.48, 2.15],
        [0.45, 2.53],
        [-0.62, 2.53]
    ].forEach(([z, y], i) => (i ? sideShape.lineTo(z, y) : sideShape.moveTo(z, y)));
    sideShape.closePath();
    const shell = new T.ExtrudeGeometry(sideShape, { depth: 0.09, bevelEnabled: false });
    shell.rotateY(-Math.PI / 2);
    function gameScreen(i, color, art) {
        const tx = canvasTexture(320, 230, (c, w, h) => {
            c.fillStyle = '#071026';
            c.fillRect(0, 0, w, h);
            c.fillStyle = color;
            for (let j = 0; j < 70; j++) c.fillRect((j * 71 + 29) % w, (j * 47 + 17) % h, (j % 3) + 1, 2);
            if (i % 3 === 0) {
                for (let j = 0; j < 3; j++)
                    for (let k = 0; k < 7; k++)
                        stamp(c, 23 + k * 40, 40 + j * 32, 2, j === 0 ? '#ffd979' : color);
                c.fillStyle = '#84e6ef';
                c.fillRect(133, 183, 24, 5);
            } else if (i % 3 === 1) {
                c.strokeStyle = color;
                c.lineWidth = 5;
                for (let k = 1; k < 6; k++) c.strokeRect(160 - k * 25, 125 - k * 17, 50 * k, 34 * k);
                stamp(c, 134, 101, 5, '#ffe595');
            } else {
                c.fillStyle = '#594771';
                for (let k = 0; k < 14; k++) c.fillRect(k * 24, 145 - (k % 4) * 12, 22, 100);
                c.fillStyle = color;
                c.fillRect(0, 181, w, 5);
                stamp(c, 154, 121, 4, '#ffb969');
            }
            if (!art) lettering(c, '1UP', 29, 17, 21, '#ecdfbd', 51);
        });
        if (art)
            loader.load('../images/' + art, (asset) => {
                const img = asset.image,
                    c = tx.image.getContext('2d'),
                    w = 320,
                    h = 230;
                c.fillStyle = '#0b1322';
                c.fillRect(0, 0, w, h);
                // The companion artwork is a vertical sprite sheet. Frame 50 shows the complete bot.
                const botSheet = art === 'creator-bot.webp';
                const imageHeight = botSheet ? img.width : img.height;
                const ratio = Math.min(w / img.width, h / imageHeight);
                c.imageSmoothingEnabled = !botSheet;
                c.drawImage(
                    img,
                    0,
                    botSheet ? 50 * imageHeight : 0,
                    img.width,
                    imageHeight,
                    (w - img.width * ratio) / 2,
                    (h - imageHeight * ratio) / 2,
                    img.width * ratio,
                    imageHeight * ratio
                );
                c.fillStyle = 'rgba(5,10,20,.15)';
                for (let j = 0; j < h; j += 4) c.fillRect(0, j, w, 1);
                tx.needsUpdate = true;
                asset.dispose();
            });
        return tx;
    }
    function cabinet(x, z, i, { title, color, art, side = ivory, width = 1.43 }) {
        const w = width;
        box(x, 0.54, z, w, 1.08, 1.19, '#26313d');
        box(x, 1.57, z - 0.26, w, 1.04, 0.66, ink);
        for (const d of [-1, 1]) piece(shell, side, x + d * (w / 2 + 0.025) + 0.045, 0, z);
        box(x, 0.36, z + 0.625, w - 0.12, 0.62, 0.085, '#324053');
        box(x + 0.1, 0.5, z + 0.68, 0.23, 0.28, 0.065, '#a3acac');
        box(x + 0.1, 0.55, z + 0.72, 0.11, 0.05, 0.02, '#ffb969', 0, 0, true);
        box(x + 0.1, 0.46, z + 0.72, 0.06, 0.03, 0.02, ink);
        box(x, 1.12, z + 0.44, w - 0.06, 0.18, 0.6, '#617381', 0.08);
        box(x, 1.63, z + 0.25, w - 0.13, 0.88, 0.19, '#1b2833', -0.24);
        face(gameScreen(i, color, art), x, 1.64, z + 0.358, w - 0.29, 0.7, -0.24);
        box(x, 2.3, z + 0.16, w - 0.01, 0.39, 0.55, '#313b48');
        const nameplate = sign(title, '', x, 2.31, z + 0.44, w - 0.055, 0.3, color);
        box(x, 2.08, z + 0.34, w - 0.12, 0.027, 0.08, color, 0, 0, true);
        cyl(x - w * 0.28, 1.245, z + 0.47, 0.07, 0.033, ink);
        cyl(x - w * 0.28, 1.34, z + 0.47, 0.023, 0.17, steel, 8);
        piece(ball, '#ed526d', x - w * 0.28, 1.44, z + 0.47, 0.079, 0.079, 0.079);
        for (let n = 0; n < 4; n++)
            cyl(
                x + w * 0.07 + (n % 2) * 0.135,
                1.245,
                z + 0.4 + Math.floor(n / 2) * 0.125,
                0.058,
                0.036,
                n % 2 ? '#ffba61' : color,
                10
            );
        // Low round vinyl stools, common in neighborhood arcades.
        cyl(x + 0.13, 0.34, z + 0.99, 0.045, 0.6, steel);
        cyl(x + 0.13, 0.055, z + 0.99, 0.22, 0.06, '#485563');
        cyl(x + 0.13, 0.64, z + 0.99, 0.255, 0.11, '#27212c');
        cyl(x + 0.13, 0.713, z + 0.99, 0.258, 0.09, i % 2 ? '#a44755' : '#397773');
        return nameplate;
    }
    function printTexture(file) {
        const texture = loader.load('../images/' + file);
        texture.encoding = T.sRGBEncoding;
        texture.anisotropy = 2;
        return texture;
    }
    function framedPoster(x, texture) {
        const y = 3.42;
        box(x, y, -3.32, 0.88, 1.32, 0.08, '#c4b498');
        face(texture, x, y, -3.271, 0.84, 1.26);
    }
    function awardPoster() {
        const marks = [];
        const plaque = signTexture(384, 576, (c, w, h) => {
            c.fillStyle = '#100f14';
            c.fillRect(0, 0, w, h);
            c.strokeStyle = '#cd9960';
            c.lineWidth = 4;
            c.strokeRect(9, 9, w - 18, h - 18);
            lettering(c, t('CHROMA AWARDS'), w / 2, 131, 47, '#ffebc8', w - 40);
            lettering(c, t('1ST PLACE'), w / 2, 457, 70, '#f9cb80', w - 44);
            lettering(c, t('FIGHTING & SHOOTER'), w / 2, 512, 28, '#ffebc8', w - 44);
            lettering(c, t('SEASON 1  /  2025'), w / 2, 546, 23, '#dab589', w - 44);
            for (const { img, top, size } of marks) c.drawImage(img, (w - size) / 2, top, size, size);
        });
        const ctx = plaque.image.getContext('2d');
        for (const [file, top, size] of [['chroma-awards-mark.png', 26, 78], ['Vibe_Survivor.png', 161, 250]]) {
            const img = new Image();
            img.onload = () => {
                marks.push({ img, top, size });
                ctx.drawImage(img, (plaque.image.width - size) / 2, top, size, size);
                plaque.needsUpdate = true;
            };
            img.src = '../images/' + file;
        }
        return plaque;
    }
    const gameCover = (slug) => printTexture('astrocade-' + slug + '.webp');
    framedPoster(-5.25, gameCover('neon-circle-traffic'));
    framedPoster(-3.7, gameCover('whos-the-killer'));

    // Start just beyond the desk marquee. The angled walking camera sees several frames past Bonus Stage.
    const appPosters = ['spin2pick', 'vibetube', 'eco-guardian'].map((slug) => printTexture('poster-' + slug + '.webp'));
    const gallery = [
        gameCover('sword-merger-defense'),
        printTexture('poster-samsons-desk.webp'),
        gameCover('forge-beyond'),
        gameCover('hero-link-zombie-city'),
        gameCover('kaiju-city-rampage'),
        gameCover('fly-for-brainrots'),
        gameCover('slash-a-brainrot'),
        gameCover('hollow-strider'),
        awardPoster(),
        gameCover('circle-traffic'),
        gameCover('green-gas-dash'),
        ...appPosters,
        gameCover('phantom-ball-world-cup'),
        gameCover('superheroes-vs-brainrots'),
        gameCover('sticksurvival-io')
    ];
    // Align the middle of the three app prints with the last station's lightbox.
    const spacing = (stations.at(-1).x - 2.6) / gallery.indexOf(appPosters[1]);
    gallery.forEach((texture, i) => framedPoster(2.6 + i * spacing, texture));
    const stationSigns = [];
    stations.forEach((s, i) => {
        const z = -1.55;
        const leftPlate = cabinet(s.x - cabinetOffset, z, i, {
            title: s.sign,
            color: s.color,
            art: s.art,
            side: i % 3 === 1 ? '#447c83' : ivory,
            width: i === 2 ? 1.7 : 1.5
        });
        const accessory = ['AI COLLAB', 'CITY RAMPAGE', 'VIBE SURVIVOR', 'VIBETUBE'];
        const rightPlate = cabinet(s.x + cabinetOffset, z, i + 1, {
            title: accessory[i],
            color: i % 2 ? '#8fbcfa' : '#e8959d',
            side: '#4c5365',
            width: 1.26,
            art: [
                'creator-bot.webp',
                'astrocade-kaiju-city-rampage.webp',
                'Vibe_Survivor.png',
                'vibetube-broadcast.webp'
            ][i]
        });
        pool(s.x, 3.13, -3.46, 4.4, 2.4, s.color, 0.37, true);
        pool(s.x, 0.016, -0.49, 3.1, 1.85, '#000000', 0.8, false, true);
        pool(s.x, 0.021, 0.65, 2.4, 2.84, s.color, 0.23);
        for (const plate of [stationMarquee(s, z), leftPlate, rightPlate]) {
            plate.userData.stationIndex = i;
            stationSigns.push(plate);
        }
    });
    cabinet(-3.58, -1.4, 2, {
        title: 'CIRCLE TRAFFIC',
        color: '#f5a2af',
        side: '#604951',
        art: 'astrocade-circle-traffic.webp'
    });
    cabinet(-5.26, -1.46, 1, { title: '1UP', color: '#6cdbdf', side: '#566274' });
    // Coin changer, slotted counter and a backlit price card by the typing desk.
    const cx = 2.48;
    box(cx, 1.01, -2.2, 0.99, 2.02, 0.85, '#ad6b54');
    box(cx, 1.27, -1.75, 0.81, 0.73, 0.09, '#c0ae8f');
    sign('100 WON', 'COIN EXCHANGE', cx, 1.7, -1.72, 0.78, 0.43, '#ffd58c');
    box(cx, 1.23, -1.66, 0.27, 0.09, 0.09, ink);
    box(cx, 0.85, -1.7, 0.43, 0.18, 0.11, ink);
    for (let i = 0; i < 4; i++) box(cx, 0.29 + i * 0.064, -1.74, 0.57, 0.022, 0.032, '#584d47');
    for (const b of batches.values()) {
        const g = new T.BufferGeometry();
        g.setAttribute('position', new T.Float32BufferAttribute(b.p, 3));
        g.setAttribute('normal', new T.Float32BufferAttribute(b.n, 3));
        g.setAttribute('color', new T.Float32BufferAttribute(b.colors, 3));
        g.computeBoundingSphere();
        const key = b.lit;
        if (!materials.has(key))
            materials.set(
                key,
                b.lit
                    ? new T.MeshBasicMaterial({ vertexColors: true })
                    : new T.MeshToonMaterial({ vertexColors: true, gradientMap: bands })
            );
        scene.add(new T.Mesh(g, materials.get(key)));
    }
    shell.dispose();
    cube.dispose();
    ball.dispose();
    for (const object of scene.children) {
        object.updateMatrix();
        object.matrixAutoUpdate = false;
    }
    function repaintSigns() {
        for (const paint of signPainters) paint();
        previousWord = -1;
        updateMarquee(performance.now(), false);
    }
    document.addEventListener('vibe-language-change', repaintSigns);
    // Canvas textures retain their original glyphs if a web font finishes after the first draw.
    document.fonts.addEventListener('loadingdone', ({ fontfaces }) => {
        if (fontfaces.some((face) => face.family === 'VibeWordmark' || face.family === 'DungGeunMo')) {
            repaintSigns();
            onFontReady();
        }
    });
    return { bands, updateMarquee, stationSigns };
}
