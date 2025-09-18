import { Chunk } from '../world/Chunk.js';
import { CHUNK_SIZE, WORLD_MIN_Y } from '../constants.js';

export class ChunkManager {
    constructor(scene, world, blockGeometry) {
        this.scene = scene;
        this.world = world;
        this.blockGeometry = blockGeometry;
        this.chunks = new Map();
    }

    update(playerPos, materials, grassMaterials, settings) {
        const viewDist = settings.viewDistance;
        const playerChunkX = Math.floor(playerPos.x / CHUNK_SIZE);
        const playerChunkY = Math.floor((playerPos.y - WORLD_MIN_Y) / CHUNK_SIZE);
        const playerChunkZ = Math.floor(playerPos.z / CHUNK_SIZE);
        const visibleChunks = new Set();

        for (let x = playerChunkX - viewDist; x <= playerChunkX + viewDist; x++) {
            for (let z = playerChunkZ - viewDist; z <= playerChunkZ + viewDist; z++) {
                for (let y = playerChunkY - viewDist; y <= playerChunkY + viewDist; y++) {
                    const key = `${x},${y},${z}`;
                    visibleChunks.add(key);
                    if (!this.chunks.has(key)) {
                        const chunk = new Chunk(this.scene, x, y, z, this.blockGeometry);
                        chunk.build(this.world, materials, grassMaterials);
                        this.chunks.set(key, chunk);
                    }
                    this.chunks.get(key).setActive(true);
                }
            }
        }
        for (const [key, chunk] of this.chunks.entries()) {
            if (!visibleChunks.has(key)) {
                chunk.setActive(false);
            }
        }
    }

    rebuildChunkAt(worldX, worldY, worldZ, materials, grassMaterials) {
        const rebuild = (cx, cy, cz) => {
            const key = `${cx},${cy},${cz}`;
            if (this.chunks.has(key)) {
                const chunk = this.chunks.get(key);
                chunk.dispose();
                chunk.build(this.world, materials, grassMaterials);
                chunk.setActive(true);
            }
        };

        const mainChunkX = Math.floor(worldX / CHUNK_SIZE);
        const mainChunkY = Math.floor((worldY - WORLD_MIN_Y) / CHUNK_SIZE);
        const mainChunkZ = Math.floor(worldZ / CHUNK_SIZE);

        rebuild(mainChunkX, mainChunkY, mainChunkZ);

        // ### FINALE KORREKTUR: Mathematisch korrekte Modulo-Berechnung für negative Koordinaten. ###
        // Dies stellt sicher, dass Nachbar-Chunks immer korrekt aktualisiert werden.
        const xInChunk = (worldX % CHUNK_SIZE + CHUNK_SIZE) % CHUNK_SIZE;
        const yInChunk = ((worldY - WORLD_MIN_Y) % CHUNK_SIZE + CHUNK_SIZE) % CHUNK_SIZE;
        const zInChunk = (worldZ % CHUNK_SIZE + CHUNK_SIZE) % CHUNK_SIZE;

        if (xInChunk === 0) rebuild(mainChunkX - 1, mainChunkY, mainChunkZ);
        if (xInChunk === CHUNK_SIZE - 1) rebuild(mainChunkX + 1, mainChunkY, mainChunkZ);
        if (zInChunk === 0) rebuild(mainChunkX, mainChunkY, mainChunkZ - 1);
        if (zInChunk === CHUNK_SIZE - 1) rebuild(mainChunkX, mainChunkY, mainChunkZ + 1);
        if (yInChunk === 0) rebuild(mainChunkX, mainChunkY - 1, mainChunkZ);
        if (yInChunk === CHUNK_SIZE - 1) rebuild(mainChunkX, mainChunkY + 1, mainChunkZ);
    }

    getIntersectableMeshes() {
        const meshes = [];
        for (const chunk of this.chunks.values()) {
            if (chunk.isActive) {
                meshes.push(...chunk.getIntersectables());
            }
        }
        return meshes;
    }
}