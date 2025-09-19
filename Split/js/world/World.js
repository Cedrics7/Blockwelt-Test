// Split/js/world/World.js

import { createNoise2D } from 'simplex-noise';
import { BLOCK_TYPES, ORE_PARAMETERS, WORLD_SIZE_X, WORLD_SIZE_Y, WORLD_SIZE_Z, WORLD_MIN_Y } from '../constants.js';

export class World {
    constructor() {
        this.data = null;
        this.dirtToGrassQueue = new Map();
    }

    init(data) {
        this.data = data || new Uint8Array(WORLD_SIZE_X * WORLD_SIZE_Y * WORLD_SIZE_Z);
    }

    generate() {
        const noise2D = createNoise2D(Math.random);
        const seaLevel = 0;

        for (let x = 0; x < WORLD_SIZE_X; x++) {
            for (let z = 0; z < WORLD_SIZE_Z; z++) {
                // Exakt die gleiche Noise-Berechnung wie in Spielseite.html
                const n1 = noise2D(x / 250, z / 250);
                const n2 = noise2D(x / 90, z / 90) * 0.4;
                const n3 = noise2D(x / 40, z / 40) * 0.2;
                const n4 = noise2D(x / 15, z / 15) * 0.1;
                const elevation = (n1 + n2 + n3 + n4) / (1 + 0.4 + 0.2 + 0.1);
                const height = seaLevel + 30 + Math.pow(elevation, 3) * 50;

                for (let y = WORLD_MIN_Y; y < height; y++) {
                    if (y < -190) {
                        this.setBlock(x, y, z, BLOCK_TYPES.LAVA);
                    } else if (y < height - 4) {
                        this.setBlock(x, y, z, BLOCK_TYPES.STONE);
                    } else if (y < height) {
                        if (height < seaLevel + 2) {
                            this.setBlock(x, y, z, BLOCK_TYPES.SAND);
                        } else {
                            this.setBlock(x, y, z, BLOCK_TYPES.DIRT);
                        }
                    }
                }

                if (height >= seaLevel) {
                    if (height < seaLevel + 2) {
                        this.setBlock(x, Math.floor(height), z, BLOCK_TYPES.SAND);
                    } else {
                        this.setBlock(x, Math.floor(height), z, BLOCK_TYPES.GRASS);
                    }
                }
            }
        }
        this.generateOres();
        this.generateTrees(); // NEU: Bäume nach allem anderen generieren
    }

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
    generateTree(x, y, z) {
        const height = Math.floor(Math.random() * 3) + 4; // Stammhöhe 4-6 Blöcke
        // Stamm bauen
        for (let i = 0; i < height; i++) {
            this.setBlock(x, y + i, z, BLOCK_TYPES.WOOD);
        }

        // Blätterdach (Krone)
        const topY = y + height;
        for (let dx = -2; dx <= 2; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                for (let dz = -2; dz <= 2; dz++) {
                    const d = Math.sqrt(dx*dx + dy*dy*2 + dz*dz);
                    if (d <= 2.5) {
                        this.setBlock(x + dx, topY + dy, z + dz, BLOCK_TYPES.LEAVES);
                    }
                }
            }
        }
    }

    generateTrees() {
        for (let x = 2; x < WORLD_SIZE_X - 2; x++) {
            for (let z = 2; z < WORLD_SIZE_Z - 2; z++) {
                if (Math.random() < 0.005) { // Baum-Dichte
                    const y = this.getSurfaceY(x, z);
                    const groundBlock = this.getBlock(x, y - 1, z);
                    if (groundBlock === BLOCK_TYPES.GRASS) {
                        this.generateTree(x, y, z);
                    }
                }
            }
        }
    }

    getSurfaceY(x, z) {
        for (let y = (WORLD_SIZE_Y + WORLD_MIN_Y) - 1; y > WORLD_MIN_Y; y--) {
            const block = this.getBlock(Math.floor(x), y, Math.floor(z));
            if (block !== BLOCK_TYPES.AIR) {
                return y + 1;
            }
        }
        return WORLD_MIN_Y;
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
        if (t === BLOCK_TYPES.AIR) {
            const blockBelow = this.getBlock(x, y - 1, z);
            if (blockBelow === BLOCK_TYPES.DIRT) {
                const key = `${x},${y - 1},${z}`;
                this.dirtToGrassQueue.set(key, Date.now());
            }
        }
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