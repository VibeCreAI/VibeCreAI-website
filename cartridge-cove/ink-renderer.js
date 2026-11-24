// The second pass finds depth discontinuities and sharp changes in surface normals.
// Outlines keep their screen width while the skinned character and camera move.
export function inkRenderer(T, renderer) {
    const color = new T.WebGLRenderTarget(1, 1);
    color.texture.encoding = T.sRGBEncoding;
    const surface = new T.WebGLRenderTarget(1, 1, { minFilter: T.NearestFilter, magFilter: T.NearestFilter });
    const normal = new T.MeshNormalMaterial({ side: T.DoubleSide });
    const skinNormal = new T.MeshNormalMaterial({ skinning: true, side: T.DoubleSide });
    normal.onBeforeCompile = skinNormal.onBeforeCompile = (shader) => {
        shader.vertexShader =
            'varying float inkDepth;\n' +
            shader.vertexShader.replace(
                '#include <project_vertex>',
                '#include <project_vertex>\ninkDepth=1.0/(1.0-0.065*mvPosition.z);'
            );
        shader.fragmentShader =
            'varying float inkDepth;\n' +
            shader.fragmentShader.replace(' normal ), opacity', ' normal ), inkDepth');
    };
    const uniforms = {
        beauty: { value: color.texture },
        surface: { value: surface.texture },
        pixel: { value: new T.Vector2() }
    };
    const material = new T.ShaderMaterial({
        uniforms,
        depthTest: false,
        depthWrite: false,
        vertexShader: 'varying vec2 uvp; void main(){uvp=uv;gl_Position=vec4(position.xy,0.,1.);}',
        fragmentShader: `varying vec2 uvp; uniform sampler2D beauty;uniform sampler2D surface;uniform vec2 pixel;
        float contrast(vec4 a,vec4 b){
            float silhouette=smoothstep(.018,.047,abs(a.a-b.a));
            float crease=smoothstep(.44,.70,length(a.rgb-b.rgb))*smoothstep(.22,.55,max(a.a,b.a));
            return max(silhouette,crease*.73);
        }
        void main(){
            vec4 n=texture2D(surface,uvp);
            vec3 c=texture2D(beauty,uvp).rgb;
            if(n.a<.001)c=mix(vec3(.040,.064,.090),vec3(.014,.022,.049),smoothstep(.30,1.,uvp.y));
            float edge=max(max(contrast(n,texture2D(surface,uvp+vec2(pixel.x,0.))),contrast(n,texture2D(surface,uvp-vec2(pixel.x,0.)))),
                           max(contrast(n,texture2D(surface,uvp+vec2(0.,pixel.y))),contrast(n,texture2D(surface,uvp-vec2(0.,pixel.y)))));
            float distanceFade=mix(.27,1.,smoothstep(.16,.44,max(n.a,texture2D(surface,uvp+pixel).a)));
            gl_FragColor=vec4(mix(c,vec3(.008,.014,.025),edge*.94*distanceFade),1.);}`
    });
    const pass = new T.Scene();
    pass.add(new T.Mesh(new T.PlaneGeometry(2, 2), material));
    const flat = new T.Camera();
    return {
        resize(w, h, dpr, outlineRatio) {
            color.setSize(Math.round(w * dpr), Math.round(h * dpr));
            surface.setSize(Math.round(w * outlineRatio), Math.round(h * outlineRatio));
            uniforms.pixel.value.set(1.2 / w, 1.2 / h);
        },
        draw(scene, camera) {
            renderer.setClearColor(0, 0);
            camera.layers.enableAll();
            renderer.setRenderTarget(color);
            renderer.render(scene, camera);
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
            renderer.autoClear = true;
            camera.layers.enableAll();
            scene.overrideMaterial = null;
            renderer.setRenderTarget(null);
            renderer.render(pass, flat);
        }
    };
}
