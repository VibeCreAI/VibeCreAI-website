export function createToonBands(T) {
    const bands = new T.DataTexture(new Uint8Array([38, 99, 170, 245]), 4, 1, T.LuminanceFormat);
    bands.minFilter = bands.magFilter = T.NearestFilter;
    bands.needsUpdate = true;
    return bands;
}

export function shadeArcadeAvatar(T, mesh, bands) {
    mesh.frustumCulled = false;
    mesh.layers.set(1);
    mesh.material = new T.MeshToonMaterial({
        map: mesh.material.map,
        color: mesh.material.color,
        gradientMap: bands,
        skinning: true
    });
}

export function addArcadeLights(T, scene) {
    const key = new T.DirectionalLight(0xffedcf, 0.68);
    key.position.set(-3, 6, 4);
    const rim = new T.DirectionalLight(0x73e7f9, 0.42);
    rim.position.set(4, 3, -2);
    scene.add(key, rim, new T.HemisphereLight(0xc9e8f6, 0x978aaa, 0.43));
}
