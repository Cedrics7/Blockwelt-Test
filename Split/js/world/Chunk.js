import * as THREE from 'three';
import { BLOCK_TYPES, CHUNK_SIZE, WORLD_MIN_Y } from '../constants.js';

export class Chunk {
    constructor(scene, chunkX, chunkY, chunkZ, blockGeometry) {
        this.x = chunkX;
        this.y = chunkY;
        this.z = chunkZ;
        this.scene = scene;
        this.blockGeometry = blockGeometry;
        this.meshes = {};
        this.grassMeshes = [];
        this.isActive = false;
    }

    build(world, materials, grassMaterials) {
        const counts = {};
        for (const t in materials) { if (materials.hasOwnProperty(t)) counts[t] = 0; }
        const matrix = new THREE.Matrix4();
        const startX = this.x * CHUNK_SIZE, endX = startX + CHUNK_SIZE;
        const startY = this.y * CHUNK_SIZE + WORLD_MIN_Y, endY = startY + CHUNK_SIZE;
        const startZ = this.z * CHUNK_SIZE, endZ = startZ + CHUNK_SIZE;

        for (let x = startX; x < endX; x++) {
            for (let y = startY; y < endY; y++) {
                for (let z = startZ; z < endZ; z++) {
                    const blockType = world.getBlock(x, y, z);

                    // ### KORREKTUR: Die fehlerhafte "isVisible"-Prüfung wurde komplett entfernt. ###
                    // Jetzt wird jeder Block gezeichnet, der nicht Luft ist, genau wie im Original.
                    // Dies behebt das Problem der unsichtbaren Blöcke an Chunk-Grenzen.
                    if (blockType === BLOCK_TYPES.AIR) continue;

                    if (blockType === BLOCK_TYPES.GRASS) {
                        const mesh = new THREE.Mesh(this.blockGeometry, grassMaterials);
                        mesh.position.set(x + 0.5, y + 0.5, z + 0.5);
                        this.grassMeshes.push(mesh);
                    } else if (materials[blockType]) {
                        matrix.setPosition(x + 0.5, y + 0.5, z + 0.5);
                        if (!this.meshes[blockType]) {
                            this.meshes[blockType] = new THREE.InstancedMesh(this.blockGeometry, materials[blockType], CHUNK_SIZE * CHUNK_SIZE * CHUNK_SIZE);
                        }
                        this.meshes[blockType].setMatrixAt(counts[blockType]++, matrix);
                    }
                }
            }
        }
        for (const t in counts) {
            if (this.meshes[t]) {
                this.meshes[t].count = counts[t];
                this.meshes[t].instanceMatrix.needsUpdate = true;
            }
        }
    }

    setActive(active) {
        if (this.isActive === active) return;
        this.isActive = active;
        for (const type in this.meshes) {
            if (active) this.scene.add(this.meshes[type]);
            else this.scene.remove(this.meshes[type]);
        }
        this.grassMeshes.forEach(mesh => {
            if (active) this.scene.add(mesh);
            else this.scene.remove(mesh);
        });
    }

    dispose() {
        this.setActive(false);
        for (const type in this.meshes) {
            this.meshes[type].geometry.dispose();
            this.meshes[type].material.dispose();
        }
        this.grassMeshes.forEach(mesh => {
            mesh.geometry.dispose();
            if(Array.isArray(mesh.material)) {
                mesh.material.forEach(m => m.dispose());
            } else {
                mesh.material.dispose();
            }
        });
        this.meshes = {};
        this.grassMeshes = [];
    }

    getIntersectables() {
        return [...Object.values(this.meshes), ...this.grassMeshes];
    }
}