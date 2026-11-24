// Find depth discontinuities and sharp changes in surface normals before smoothing the finished ink.
// Outlines keep their screen width while the skinned character and camera move.
export function inkRenderer(T, renderer, { transparentBackground = false } = {}) {
    const inkMask = new T.WebGLRenderTarget(1, 1, { depthBuffer: false });
    const surface = new T.WebGLRenderTarget(1, 1, { minFilter: T.NearestFilter, magFilter: T.NearestFilter });
    const normal = new T.MeshNormalMaterial();
    const skinNormal = new T.MeshNormalMaterial({ skinning: true, side: T.DoubleSide });
    normal.onBeforeCompile = skinNormal.onBeforeCompile = (shader) => {
        // Interpolate view depth before encoding it, for both the aisle and orthographic portraits.
        const varying = 'varying float inkViewDepth;\n';
        shader.vertexShader = varying + shader.vertexShader.replace(
            '#include <project_vertex>',
            '#include <project_vertex>\ninkViewDepth = -mvPosition.z;'
        );
        shader.fragmentShader = varying + shader.fragmentShader.replace(
            ' normal ), opacity',
            ' normal ), 1.0 / (1.0 + 0.065 * inkViewDepth)'
        );
    };
    const uniforms = {
        surface: { value: surface.texture },
        pixel: { value: new T.Vector2() }
    };
    const material = new T.ShaderMaterial({
        defines: transparentBackground ? { TRANSPARENT_BACKGROUND: 1 } : {},
        uniforms,
        depthTest: false,
        depthWrite: false,
        vertexShader: 'varying vec2 uvp; void main(){uvp=uv;gl_Position=vec4(position.xy,0.,1.);}',
        fragmentShader: `varying vec2 uvp; uniform sampler2D surface;uniform vec2 pixel;
        float contrast(vec4 a,vec4 b){
            float silhouette=smoothstep(.018,.047,abs(a.a-b.a));
            float crease=smoothstep(.44,.70,length(a.rgb-b.rgb))*smoothstep(.22,.55,max(a.a,b.a));
            return max(silhouette,crease*.73);
        }
        void main(){
            vec4 n=texture2D(surface,uvp);
            float edge=max(max(contrast(n,texture2D(surface,uvp+vec2(pixel.x,0.))),contrast(n,texture2D(surface,uvp-vec2(pixel.x,0.)))),
                           max(contrast(n,texture2D(surface,uvp+vec2(0.,pixel.y))),contrast(n,texture2D(surface,uvp-vec2(0.,pixel.y)))));
            float distanceFade=mix(.27,1.,smoothstep(.16,.44,max(n.a,texture2D(surface,uvp+pixel).a)));
            vec3 ink=vec3(.008,.014,.025);
            float opacity=edge*.94*distanceFade;
            #ifndef TRANSPARENT_BACKGROUND
            if(n.a<.001){
                vec3 sky=mix(vec3(.040,.064,.090),vec3(.014,.022,.049),smoothstep(.30,1.,uvp.y));
                gl_FragColor=vec4(mix(sky,ink,opacity),1.);
                return;
            }
            #endif
            gl_FragColor=vec4(ink*opacity,opacity);}`
    });
    const overlay = new T.ShaderMaterial({
        uniforms: { inkMask: { value: inkMask.texture }, texel: { value: new T.Vector2() } },
        vertexShader: material.vertexShader,
        fragmentShader: `
            varying vec2 uvp;
            uniform sampler2D inkMask;
            uniform vec2 texel;
            void main() {
                // Four bilinear samples soften subpixel steps on diagonal ink lines.
                vec2 d = 0.30 * texel;
                gl_FragColor = 0.25 * (texture2D(inkMask, uvp + d) + texture2D(inkMask, uvp - d)
                    + texture2D(inkMask, uvp + vec2(d.x, -d.y)) + texture2D(inkMask, uvp + vec2(-d.x, d.y)));
            }`,
        depthTest: false,
        depthWrite: false,
        transparent: true,
        premultipliedAlpha: true
    });
    const pass = new T.Scene();
    const screen = new T.Mesh(new T.PlaneGeometry(2, 2), material);
    pass.add(screen);
    const flat = new T.Camera();
    return {
        dispose() {
            surface.dispose();
            inkMask.dispose();
            normal.dispose();
            skinNormal.dispose();
            material.dispose();
            overlay.dispose();
            screen.geometry.dispose();
        },
        resize(w, h, outlineRatio) {
            surface.setSize(Math.round(w * outlineRatio), Math.round(h * outlineRatio));
            inkMask.setSize(surface.width, surface.height);
            uniforms.pixel.value.set(1.2 / w, 1.2 / h);
            overlay.uniforms.texel.value.set(1 / inkMask.width, 1 / inkMask.height);
        },
        draw(scene, camera) {
            renderer.setClearColor(0, 0);
            camera.layers.set(0);
            scene.overrideMaterial = normal;
            renderer.setRenderTarget(surface);
            renderer.render(scene, camera);
            // r128 caches shader programs per material. Keep the animated outline on
            // its own skinned program, while still testing against the arcade's depth.
            camera.layers.set(1);
            renderer.autoClear = false;
            scene.overrideMaterial = skinNormal;
            renderer.render(scene, camera);
            renderer.setRenderTarget(inkMask);
            screen.material = material;
            renderer.render(pass, flat);
            // Render the artwork directly to the display and composite the premultiplied ink over it.
            renderer.autoClear = true;
            camera.layers.enableAll();
            scene.overrideMaterial = null;
            renderer.setRenderTarget(null);
            renderer.render(scene, camera);
            renderer.autoClear = false;
            screen.material = overlay;
            renderer.render(pass, flat);
            renderer.autoClear = true;
        }
    };
}
