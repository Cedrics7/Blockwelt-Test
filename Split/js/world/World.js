import { createNoise2D, createNoise3D } from 'simplex-noise';
import { BLOCK_TYPES, ORE_PARAMETERS, WORLD_SIZE_X, WORLD_SIZE_Y, WORLD_SIZE_Z, WORLD_MIN_Y } from '../constants.js';

export class World {
    constructor() {
        this.data = null;
    }

    init(data) {
        this.data = data || new Uint8Array(WORLD_SIZE_X * WORLD_SIZE_Y * WORLD_SIZE_Z);
    }

    generate() {
        const noise3D = createNoise3D(Math.random);
        const surfaceLevel = 10; // Durchschnittliche Höhe der Oberfläche
        const stoneThreshold = 0; // Dichtewert, ab dem Stein generiert wird

        // --- Schritt 1: Erschaffe die Grundform der Welt mit 3D-Noise ---
        for (let x = 0; x < WORLD_SIZE_X; x++) {
            for (let z = 0; z < WORLD_SIZE_Z; z++) {
                for (let y = WORLD_MIN_Y; y < WORLD_SIZE_Y + WORLD_MIN_Y; y++) {
                    const noiseScale = 80;
                    const noiseValue = noise3D(x / noiseScale, y / noiseScale, z / noiseScale);

                    // Vertikaler Dichte-Gradient: Je tiefer, desto solider
                    const density = noiseValue + (surfaceLevel - y) * 0.05;

                    if (density > stoneThreshold) {
                        this.setBlock(x, y, z, BLOCK_TYPES.STONE);
                    }
                }
            }
        }

        // --- Schritt 2: Füge eine Oberflächenschicht aus Gras, Erde und Sand hinzu ---
        const seaLevel = 0;
        for (let x = 0; x < WORLD_SIZE_X; x++) {
            for (let z = 0; z < WORLD_SIZE_Z; z++) {
                // Gehe von oben nach unten durch jede Spalte
                for (let y = (WORLD_SIZE_Y + WORLD_MIN_Y) - 1; y > WORLD_MIN_Y; y--) {
                    const currentBlock = this.getBlock(x, y, z);
                    const blockAbove = this.getBlock(x, y + 1, z);

                    // Finde den obersten Steinblock, der an Luft grenzt
                    if (currentBlock === BLOCK_TYPES.STONE && blockAbove === BLOCK_TYPES.AIR) {
                        // Wenn der Block nahe am Meeresspiegel ist, erstelle einen Strand
                        if (y < seaLevel + 2) {
                            this.setBlock(x, y, z, BLOCK_TYPES.SAND);
                            this.setBlock(x, y - 1, z, BLOCK_TYPES.SAND);
                            this.setBlock(x, y - 2, z, BLOCK_TYPES.SAND);
                        } else {
                            // Ansonsten, erstelle eine normale Gras/Erde-Oberfläche
                            this.setBlock(x, y, z, BLOCK_TYPES.GRASS);
                            this.setBlock(x, y - 1, z, BLOCK_TYPES.DIRT);
                            this.setBlock(x, y - 2, z, BLOCK_TYPES.DIRT);
                        }
                        break; // Gehe zur nächsten (x, z)-Spalte, da die Oberfläche gefunden wurde
                    }
                }
            }
        }

        this.generateOres();
    } // <-- Die generate()-Funktion endet HIER

    generateOres() {
        for (const ore of ORE_PARAMETERS) {
            const oreVolume = WORLD_SIZE_X * (ore.maxY - ore.minY) * WORLD_SIZE_Z;
            for (let i = 0; i < oreVolume * ore.scarcity; i++) {
                const x = Math.floor(Math.random() * WORLD_SIZE_X);
                const y = Math.floor(Math.random() * (ore.maxY - ore.minY)) + ore.minY;
                const z = Math.floor(Math.random() * WORLD_SIZE_Z);
                if (this.getBlock(x, y, z) === BLOCK_TYPES.STONE) {
                    this.generateVein(x, y, z, ore);
                }
            }
        }
    }

    generateVein(x, y, z, ore) {
        const v = Math.floor(Math.random() * ore.clusterSize) + 2;
        let c = { x, y, z };
        for (let i = 0; i < v; i++) {
            if (this.getBlock(c.x, c.y, c.z) === BLOCK_TYPES.STONE) {
                this.setBlock(c.x, c.y, c.z, ore.blockType)
            }
            c.x += Math.floor(Math.random() * 3) - 1;
            c.y += Math.floor(Math.random() * 3) - 1;
            c.z += Math.floor(Math.random() * 3) - 1;
        }
    }

    coordToIndex(x, y, z) {
        const wY = y - WORLD_MIN_Y;
        if (wY < 0 || wY >= WORLD_SIZE_Y) return -1;
        return wY * (WORLD_SIZE_X * WORLD_SIZE_Z) + z * WORLD_SIZE_X + x;
    }

    setBlock(x, y, z, t) {
        if (x < 0 || x >= WORLD_SIZE_X || z < 0 || z >= WORLD_SIZE_Z) return;
        const i = this.coordToIndex(x, y, z);
        if (i !== -1) this.data[i] = t;
    }

    getBlock(x, y, z) {
        if (x < 0 || x >= WORLD_SIZE_X || z < 0 || z >= WORLD_SIZE_Z) return 0;
        const i = this.coordToIndex(x, y, z);
        return i === -1 ? 0 : this.data[i];
    }

    isBlockAt(x, y, z) {
        const b = this.getBlock(Math.floor(x), Math.floor(y), Math.floor(z));
        return b !== 0 && b !== BLOCK_TYPES.LAVA;
    }
}