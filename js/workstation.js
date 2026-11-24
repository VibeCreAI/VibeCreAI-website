(() => {
    const button = document.getElementById('programmer-character');
    if (new URLSearchParams(location.search).get('hero') === 'gif' || navigator.connection?.saveData) return;

    async function start() {
        await import('./vendor/three/three.min.js');
        await import('./vendor/three/GLTFLoader.js');
        const { bindAvatarMotion } = await import('./avatar-motion.js');
        const T = window.THREE;
        const canvas = document.createElement('canvas');
        const renderer = new T.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
        renderer.outputEncoding = T.sRGBEncoding;
        renderer.setClearColor(0, 0);
        canvas.setAttribute('aria-hidden', 'true');

        const folder = 'images/workstation/';
        const loader = new T.GLTFLoader();
        let avatar, furniture, typing, blink;
        try {
            [avatar, furniture, typing, blink] = await Promise.all([
                loader.loadAsync(folder + 'model.glb'),
                loader.loadAsync(folder + 'workstation.glb'),
                fetch(folder + 'typing.json').then(response => {
                    if (!response.ok) throw new Error('Typing clip is unavailable');
                    return response.json();
                }),
                new T.TextureLoader().loadAsync(folder + 'skin_idle_blink.webp')
            ]);
        } catch (error) {
            renderer.dispose();
            throw error;
        }

        const scene = new T.Scene();
        scene.add(avatar.scene, furniture.scene);
        furniture.scene.traverse(object => {
            if (object.material?.name === 'Warm walnut') {
                object.material.color.setHex(0x935e42).convertSRGBToLinear();
            }
        });
        let body;
        const bones = {};
        avatar.scene.traverse(object => {
            if (object.isBone) bones[object.name.replace(/^mixamorig:?/, '')] = object;
            if (object.isSkinnedMesh) body = object;
        });
        // The GLB already contains the classic head shape. Keep its bind geometry.
        body.frustumCulled = false;
        const skin = body.material.map;
        blink.flipY = false;
        blink.encoding = skin.encoding;
        const gaze = new T.Vector2();
        // Move only the painted iris regions inside the 256px face tile on the 1024px atlas.
        body.material.onBeforeCompile = shader => {
            shader.uniforms.gaze = { value: gaze };
            shader.fragmentShader = 'uniform vec2 gaze;\n' + shader.fragmentShader.replace(
                '#include <map_fragment>',
                `vec2 facePx = vUv * 1024.0;
                vec2 eye = (facePx - vec2(facePx.x < 128.0 ? 85.0 : 174.0, 155.0)) / vec2(22.0, 14.0);
                float mask = 1.0 - smoothstep(0.60, 1.0, length(eye));
                diffuseColor.rgb *= mapTexelToLinear(texture2D(map, vUv - gaze * mask / 1024.0)).rgb;`
            );
        };
        body.material.roughness = 1;

        const fill = new T.HemisphereLight(0xfff5eb, 0x96adc5, 0.94);
        const key = new T.DirectionalLight(0xffead5, 0.85);
        key.position.set(-2.5, 4, 3.5);
        const rim = new T.DirectionalLight(0x92d9ff, 0.7);
        rim.position.set(2.5, 2, -2.4);
        const laptopLight = new T.PointLight(0x75efed, 0.32, 1.55);
        laptopLight.position.set(0, 0.96, 0.68);
        scene.add(fill, key, rim, laptopLight);

        const camera = new T.OrthographicCamera(-1, 1, 1.19, -1.19, 0.1, 20);
        const target = new T.Vector3(-0.08, 0.89, 0.34);
        const initialYaw = 0.43;
        const initialPitch = Math.atan2(2.05, 5.8);
        const radius = Math.hypot(2.05, 5.8);
        const pitchLimit = T.MathUtils.degToRad(80);
        let yaw = initialYaw;
        let desiredYaw = yaw;
        let pitch = initialPitch;
        let desiredPitch = pitch;
        const reduced = matchMedia('(prefers-reduced-motion: reduce)');
        const motion = bindAvatarMotion(T, typing, bones);

        let elapsed = 2;
        let lastFrame = 0;
        let frameId = 0;
        let visible = true;
        let ready = true;
        let dirty = true;
        let pressedAt = -Infinity;
        let drag = null;
        let suppressClick = false;
        let attention = 0;
        const pointer = new T.Vector2();
        const headTurn = new T.Vector2();
        const clamp = T.MathUtils.clamp;

        function schedule() {
            if (ready && visible && !document.hidden && !frameId) frameId = requestAnimationFrame(draw);
        }

        function invalidate() {
            dirty = true;
            schedule();
        }

        function draw(now) {
            frameId = 0;
            if (!ready || !visible || document.hidden) return;
            const moving = button.classList.contains('rotating') || Math.hypot(yaw - desiredYaw, pitch - desiredPitch) > 0.001;
            if (reduced.matches && !dirty && !moving) return;
            if (!dirty && now - lastFrame < (moving ? 15 : 32)) {
                schedule();
                return;
            }
            const dt = Math.min((now - lastFrame) / 1000, 0.06);
            lastFrame = now;
            dirty = false;
            const blend = reduced.matches ? 1 : 1 - Math.exp(-dt * 16);
            yaw += (desiredYaw - yaw) * blend;
            pitch += (desiredPitch - pitch) * blend;
            const horizontalRadius = radius * Math.cos(pitch);
            camera.position.set(
                target.x + horizontalRadius * Math.sin(yaw),
                target.y + radius * Math.sin(pitch),
                target.z + horizontalRadius * Math.cos(yaw)
            );
            camera.lookAt(target);

            if (!reduced.matches) elapsed += dt;
            avatar.scene.position.y = motion.sample(elapsed % motion.duration);

            // Let the hands finish their typing motion as the head turns toward the visitor.
            const front = Math.max(0, Math.cos(yaw));
            const look = reduced.matches || drag ? 0 : attention * front;
            const headBlend = 1 - Math.exp(-dt * 7);
            headTurn.x += (look * clamp(Math.sin(yaw) * 0.6 + pointer.x * 0.42, -0.65, 0.65) - headTurn.x) * headBlend;
            headTurn.y += (look * (-0.18 + pointer.y * 0.19) - headTurn.y) * headBlend;
            bones.Head.rotateY(headTurn.x);
            bones.Head.rotateX(headTurn.y);
            gaze.set(look * pointer.x * 2.8, look * pointer.y * 1.6);
            body.material.map = !reduced.matches && elapsed % 4.7 < 0.115 ? blink : skin;

            const phase = clamp((now - pressedAt) / 360, 0, 1);
            const tap = reduced.matches ? 0 : Math.sin(Math.PI * phase) ** 2;
            bones.RightForeArm.rotateZ(-0.23 * tap);
            bones.RightHand.rotateX(0.34 * tap);
            laptopLight.intensity = 0.32 + tap * 0.18;
            renderer.render(scene, camera);
            if (!reduced.matches || moving) schedule();
        }

        function resize() {
            const width = button.clientWidth;
            const height = button.clientHeight;
            if (!width || !height) return;
            renderer.setDrawingBufferSize(width, height, Math.min(devicePixelRatio, 2));
            camera.right = camera.top * width / height;
            camera.left = -camera.right;
            camera.updateProjectionMatrix();
            invalidate();
        }

        function updatePointer(event) {
            if (drag?.id === event.pointerId) {
                const dx = event.clientX - drag.x;
                const dy = event.clientY - drag.y;
                if (!suppressClick && Math.hypot(dx, dy) < 6) return;
                suppressClick = true;
                button.classList.add('rotating');
                desiredYaw -= dx * 2 * Math.PI / (button.clientWidth * 1.5);
                desiredPitch = clamp(desiredPitch + dy * Math.PI / button.clientHeight, -pitchLimit, pitchLimit);
                drag.x = event.clientX;
                drag.y = event.clientY;
                invalidate();
                return;
            }
            if (!visible || event.pointerType === 'touch') return;
            const rect = button.getBoundingClientRect();
            const x = (event.clientX - rect.left - rect.width / 2) / rect.width;
            const y = (event.clientY - rect.top - rect.height * 0.3) / rect.height;
            attention = clamp(1.65 - Math.hypot(x, y), 0, 1);
            pointer.set(clamp(x * 1.65, -1, 1), clamp(y * 1.65, -1, 1));
        }

        const listeners = new AbortController();
        const options = { signal: listeners.signal };
        document.addEventListener('pointermove', updatePointer, { passive: true, ...options });
        document.addEventListener('pointerleave', () => { attention = 0; }, options);
        button.addEventListener('pointerdown', event => {
            if (!event.isPrimary || event.button !== 0) return;
            suppressClick = false;
            drag = { id: event.pointerId, x: event.clientX, y: event.clientY };
            button.setPointerCapture(event.pointerId);
        }, options);
        button.addEventListener('pointerup', event => {
            if (drag?.id === event.pointerId) updatePointer(event);
        }, options);
        button.addEventListener('lostpointercapture', () => {
            drag = null;
            button.classList.remove('rotating');
        }, options);
        button.addEventListener('click', event => {
            if (suppressClick && event.detail !== 0) {
                event.preventDefault();
                event.stopImmediatePropagation();
            }
            suppressClick = false;
        }, { capture: true, ...options });
        button.addEventListener('keydown', event => {
            if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home'].includes(event.key)) return;
            event.preventDefault();
            const step = Math.PI / 12;
            if (event.key === 'Home') {
                desiredYaw += Math.atan2(Math.sin(initialYaw - desiredYaw), Math.cos(initialYaw - desiredYaw));
                desiredPitch = initialPitch;
            } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
                desiredPitch = clamp(desiredPitch + (event.key === 'ArrowDown' ? step : -step), -pitchLimit, pitchLimit);
            } else {
                desiredYaw += event.key === 'ArrowLeft' ? step : -step;
            }
            invalidate();
        }, options);
        button.addEventListener('workstation-enter', () => {
            pressedAt = performance.now();
            invalidate();
        }, options);
        reduced.addEventListener('change', invalidate, options);
        document.addEventListener('visibilitychange', invalidate, options);
        const sizeObserver = new ResizeObserver(resize);
        sizeObserver.observe(button);
        const observer = new IntersectionObserver(([entry]) => {
            visible = entry.isIntersecting;
            invalidate();
        });
        observer.observe(button);
        canvas.addEventListener('webglcontextlost', () => {
            ready = false;
            cancelAnimationFrame(frameId);
            listeners.abort();
            observer.disconnect();
            sizeObserver.disconnect();
            button.classList.remove('live', 'rotating');
            button.removeAttribute('aria-description');
            canvas.remove();
            renderer.dispose();
        }, { once: true });
        resize();
        button.append(canvas);
        button.classList.add('live');
        const describeControls = () => button.setAttribute('aria-description', window.VibeLocale.t('Drag or use the arrow keys to rotate. Home resets the view. Select to toggle the terminal.'));
        describeControls();
        document.addEventListener('vibe-language-change', describeControls, options);
    }

    start().catch(error => console.warn('Workstation is using the original GIF.', error));
})();
