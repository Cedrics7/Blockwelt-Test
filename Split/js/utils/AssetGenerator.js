import * as THREE from 'three';
import { createNoise2D } from 'simplex-noise';

export function generateAssets(settings, CONSTANTS) {
    const { TEXTURE_SIZES, BLOCK_TYPES } = CONSTANTS;
    const size = TEXTURE_SIZES[settings.textureQuality];
    const generated = {}, textureDataURLs = {}, materials = {};
    let grassMaterials;
    const blockGeometry = new THREE.BoxGeometry(1, 1, 1);

    // KORREKTUR: Wir verwenden eine neue Methode zum Zeichnen der Texturen
    const noise2D = createNoise2D(Math.random);

    function createCanvasTexture(s, drawCallback) {
        const canvas = document.createElement('canvas');
        canvas.width = s; canvas.height = s;
        const context = canvas.getContext('2d');
        drawCallback(context, s);
        const texture = new THREE.CanvasTexture(canvas);
        texture.magFilter = THREE.NearestFilter;
        texture.minFilter = THREE.NearestFilter;
        return { texture, dataURL: canvas.toDataURL() };
    }

    function lightenColor(r, g, b, amt) {
        r += amt; g += amt; b += amt;
        if (r > 255) r = 255; else if (r < 0) r = 0;
        if (g > 255) g = 255; else if (g < 0) g = 0;
        if (b > 255) b = 255; else if (b < 0) b = 0;
        return `rgb(${r},${g},${b})`;
    }

    // Neue, verbesserte Zeichenfunktion für natürlich aussehendes Rauschen
    const drawCloudNoise = (ctx, s, baseR, baseG, baseB, noiseScale = 2.5, intensity = 40) => {
        for (let x = 0; x < s; x++) {
            for (let y = 0; y < s; y++) {
                const noiseVal = noise2D(x / (s / noiseScale), y / (s / noiseScale));
                const colorAdjust = Math.floor(noiseVal * intensity);
                ctx.fillStyle = lightenColor(baseR, baseG, baseB, colorAdjust);
                ctx.fillRect(x, y, 1, 1);
            }
        }
    };

    // STEIN
    const { texture: st, dataURL: su } = createCanvasTexture(size, (c, s) => {
        drawCloudNoise(c, s, 138, 138, 138); // RGB für #8a8a8a
    });
    generated[BLOCK_TYPES.STONE] = st; textureDataURLs[BLOCK_TYPES.STONE] = su;

    // ERDE
    const { texture: dt, dataURL: du } = createCanvasTexture(size, (c, s) => {
        drawCloudNoise(c, s, 150, 108, 74, 3.0, 50); // RGB für #966C4A
    });
    generated[BLOCK_TYPES.DIRT] = dt; textureDataURLs[BLOCK_TYPES.DIRT] = du;

    // GRAS-OBERSEITE
    const { texture: grassTop, dataURL: grassTopURL } = createCanvasTexture(size, (c, s) => {
        drawCloudNoise(c, s, 126, 200, 80, 2.0, 30); // RGB für #7EC850
    });
    generated[BLOCK_TYPES.GRASS] = grassTop; textureDataURLs[BLOCK_TYPES.GRASS] = grassTopURL;

    // GRAS-SEITE
    const { texture: grassSide } = createCanvasTexture(size, (c, s) => {
        drawCloudNoise(c, s, 150, 108, 74, 3.0, 50); // Zeichne Erde als Basis
        c.fillStyle = '#7EC850'; // Flaches Grün für den oberen Rand
        c.fillRect(0, 0, s, s * 0.25);
        drawCloudNoise(c, s, 126, 200, 80, 2.0, 20); // Zeichne Gras-Rauschen darüber
    });

    grassMaterials = [
        new THREE.MeshLambertMaterial({ map: grassSide }), new THREE.MeshLambertMaterial({ map: grassSide }),
        new THREE.MeshLambertMaterial({ map: grassTop }), new THREE.MeshLambertMaterial({ map: dt }),
        new THREE.MeshLambertMaterial({ map: grassSide }), new THREE.MeshLambertMaterial({ map: grassSide })
    ];

    // ... (SAND, LAVA und ERZE bleiben vorerst bei den simpleren Texturen) ...
    const { texture: sdt, dataURL: sdu } = createCanvasTexture(size, (c, s) => { c.fillStyle = '#F4A460'; c.fillRect(0,0,s,s); });
    generated[BLOCK_TYPES.SAND] = sdt; textureDataURLs[BLOCK_TYPES.SAND] = sdu;
    const { texture: lt, dataURL: lu } = createCanvasTexture(size, (c, s) => { c.fillStyle = '#FF4500'; c.fillRect(0,0,s,s); });
    generated[BLOCK_TYPES.LAVA] = lt; textureDataURLs[BLOCK_TYPES.LAVA] = lu;

    const { texture: ct, dataURL: cu } = createCanvasTexture(size, (c, s) => { drawCloudNoise(c,s,138,138,138); /* ... ore drawing logic ... */ });
    generated[BLOCK_TYPES.COAL_ORE] = ct; textureDataURLs[BLOCK_TYPES.COAL_ORE] = cu;
    // ... etc. für andere Erze

    for (const key in generated) {
        if (key != BLOCK_TYPES.GRASS) {
            materials[key] = new THREE.MeshLambertMaterial({ map: generated[key] });
        }
    }
    materials[BLOCK_TYPES.LAVA].emissive = new THREE.Color('#FF6600');
    materials[BLOCK_TYPES.LAVA].emissiveIntensity = 0.5;

    return { textureDataURLs, materials, grassMaterials, blockGeometry };
}