// Split/js/utils/AssetGenerator.js

import * as THREE from 'three';
import { createNoise2D } from 'simplex-noise';

export function generateAssets(settings, CONSTANTS, renderer) {
    const { TEXTURE_SIZES, BLOCK_TYPES } = CONSTANTS;
    const size = TEXTURE_SIZES[settings.textureQuality];
    const generated = {}, textureDataURLs = {}, materials = {};
    let grassMaterials;
    const blockGeometry = new THREE.BoxGeometry(1, 1, 1);
    const noise2D = createNoise2D(Math.random);

    function createCanvasTexture(s, drawCallback) {
        const canvas = document.createElement('canvas');
        canvas.width = s; canvas.height = s;
        const context = canvas.getContext('2d');
        drawCallback(context, s);
        const texture = new THREE.CanvasTexture(canvas);

        // --- KORREKTUR FÜR HOHE TEXTURQUALITÄT ---
        texture.magFilter = THREE.NearestFilter; // Sorgt für den pixeligen Look beim Vergrößern (Nahansicht)
        texture.minFilter = THREE.NearestMipmapLinearFilter; // WICHTIG: Sorgt für sauberes, scharfes Verkleinern (Fernsicht)
        texture.generateMipmaps = true; // Sagt Three.js, dass Mipmaps erstellt werden sollen
        texture.needsUpdate = true; // Erzwingt die Aktualisierung der Textur und die Generierung der Mipmaps

        if (renderer) {
            texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
        }
        return { texture, dataURL: canvas.toDataURL() };
    }

    function lightenColor(r, g, b, amt) {
        r = Math.max(0, Math.min(255, r + amt));
        g = Math.max(0, Math.min(255, g + amt));
        b = Math.max(0, Math.min(255, b + amt));
        return `rgb(${r},${g},${b})`;
    }

    const drawCloudNoise = (ctx, s, baseR, baseG, baseB, noiseScale = 4.0, intensity = 40) => {
        for (let x = 0; x < s; x++) {
            for (let y = 0; y < s; y++) {
                // --- KORREKTUR DER RAUSCH-SKALIERUNG ---
                // Die Skalierung ist jetzt von der Auflösung 's' entkoppelt.
                // Das Muster sieht bei 16x und 256x nun visuell gleich "grob" aus,
                // bei 256x aber natürlich viel schärfer.
                const noiseVal = noise2D((x / s) * noiseScale, (y / s) * noiseScale);
                const colorAdjust = Math.floor(noiseVal * intensity);
                ctx.fillStyle = lightenColor(baseR, baseG, baseB, colorAdjust);
                ctx.fillRect(x, y, 1, 1);
            }
        }
    };

    const { texture: st, dataURL: su } = createCanvasTexture(size, (c, s) => drawCloudNoise(c, s, 138, 138, 138));
    generated[BLOCK_TYPES.STONE] = st; textureDataURLs[BLOCK_TYPES.STONE] = su;

    const { texture: dt, dataURL: du } = createCanvasTexture(size, (c, s) => drawCloudNoise(c, s, 110, 80, 50));
    generated[BLOCK_TYPES.DIRT] = dt; textureDataURLs[BLOCK_TYPES.DIRT] = du;

    const { texture: grassTop, dataURL: grassTopURL } = createCanvasTexture(size, (c, s) => drawCloudNoise(c, s, 100, 180, 60));
    generated[BLOCK_TYPES.GRASS] = grassTop; textureDataURLs[BLOCK_TYPES.GRASS] = grassTopURL;

    const { texture: grassSide } = createCanvasTexture(size, (c, s) => {
        drawCloudNoise(c, s, 110, 80, 50);
        const gradient = c.createLinearGradient(0, 0, 0, s * 0.4);
        gradient.addColorStop(0, 'rgba(80, 160, 40, 1)');
        gradient.addColorStop(1, 'rgba(80, 160, 40, 0)');
        c.fillStyle = gradient;
        c.fillRect(0, 0, s, s * 0.4);
    });

    grassMaterials = [
        new THREE.MeshLambertMaterial({ map: grassSide }), new THREE.MeshLambertMaterial({ map: grassSide }),
        new THREE.MeshLambertMaterial({ map: grassTop }), new THREE.MeshLambertMaterial({ map: dt }),
        new THREE.MeshLambertMaterial({ map: grassSide }), new THREE.MeshLambertMaterial({ map: grassSide })
    ];

    const { texture: sdt, dataURL: sdu } = createCanvasTexture(size, (c, s) => drawCloudNoise(c, s, 244, 228, 188, 5.0, 20));
    generated[BLOCK_TYPES.SAND] = sdt; textureDataURLs[BLOCK_TYPES.SAND] = sdu;
    const { texture: lt, dataURL: lu } = createCanvasTexture(size, (c, s) => { c.fillStyle = '#FF4500'; c.fillRect(0,0,s,s); });
    generated[BLOCK_TYPES.LAVA] = lt; textureDataURLs[BLOCK_TYPES.LAVA] = lu;

    for (const key in generated) {
        if (key != BLOCK_TYPES.GRASS) {
            materials[key] = new THREE.MeshLambertMaterial({ map: generated[key] });
        }
    }
    materials[BLOCK_TYPES.LAVA].emissive = new THREE.Color('#FF6600');
    materials[BLOCK_TYPES.LAVA].emissiveIntensity = 0.5;

    return { textureDataURLs, materials, grassMaterials, blockGeometry };
}