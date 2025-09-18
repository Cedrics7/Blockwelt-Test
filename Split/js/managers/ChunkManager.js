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
        const cX = Math.floor(worldX / CHUNK_SIZE);
        const cY = Math.floor((worldY - WORLD_MIN_Y) / CHUNK_SIZE);
        const cZ = Math.floor(worldZ / CHUNK_SIZE);
        const key = `${cX},${cY},${cZ}`;

        if (this.chunks.has(key)) {
            const chunk = this.chunks.get(key);
            chunk.dispose();
            chunk.build(this.world, materials, grassMaterials);
            chunk.setActive(true);
        }
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