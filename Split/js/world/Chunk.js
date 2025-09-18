import * as THREE from 'three';
import { BLOCK_TYPES, CHUNK_SIZE, WORLD_MIN_Y } from '../constants.js';

function isBlockTransparent(blockType) {
    return blockType === BLOCK_TYPES.AIR || blockType === BLOCK_TYPES.LEAVES;
}

export class Chunk {
    constructor(scene, chunkX, chunkY, chunkZ) {
        this.scene = scene;
        this.x = chunkX;
        this.y = chunkY;
        this.z = chunkZ;
        this.mesh = null;
        this.isActive = false;
    }

    build(world, materials, grassMaterials) {
        const geometries = {};

        const startX = this.x * CHUNK_SIZE;
        const startY = this.y * CHUNK_SIZE + WORLD_MIN_Y;
        const startZ = this.z * CHUNK_SIZE;

        for (let y = 0; y < CHUNK_SIZE; y++) {
            for (let z = 0; z < CHUNK_SIZE; z++) {
                for (let x = 0; x < CHUNK_SIZE; x++) {
                    const worldX = startX + x;
                    const worldY = startY + y;
                    const worldZ = startZ + z;
                    const blockType = world.getBlock(worldX, worldY, worldZ);

                    if (blockType === BLOCK_TYPES.AIR) continue;

                    const faces = [
                        { dir: [1, 0, 0], neighbor: [worldX + 1, worldY, worldZ], name: 'right' },
                        { dir: [-1, 0, 0], neighbor: [worldX - 1, worldY, worldZ], name: 'left' },
                        { dir: [0, 1, 0], neighbor: [worldX, worldY + 1, worldZ], name: 'top' },
                        { dir: [0, -1, 0], neighbor: [worldX, worldY - 1, worldZ], name: 'bottom' },
                        { dir: [0, 0, 1], neighbor: [worldX, worldY, worldZ + 1], name: 'front' },
                        { dir: [0, 0, -1], neighbor: [worldX, worldY, worldZ - 1], name: 'back' }
                    ];

                    for (const face of faces) {
                        if (isBlockTransparent(world.getBlock(...face.neighbor))) {
                            // KORREKTUR: Wir verwenden jetzt Material-Indizes anstelle von Blocktypen als Schlüssel.
                            // Das ist entscheidend für Blöcke wie Gras mit mehreren Texturen.
                            let materialIndex = 0; // Standardmaterial für die meisten Blöcke
                            if (blockType === BLOCK_TYPES.GRASS) {
                                if (face.name === 'top') materialIndex = 0;
                                else if (face.name === 'bottom') materialIndex = 2; // Dirt
                                else materialIndex = 1; // Side
                            } else if (blockType === BLOCK_TYPES.WOOD) {
                                materialIndex = 3; // Beispiel: Eigener Index für Holz
                            } else if (blockType === BLOCK_TYPES.LEAVES) {
                                materialIndex = 4;
                            } // ... etc. für andere Blöcke

                            const key = `${blockType}-${materialIndex}`;

                            if (!geometries[key]) {
                                geometries[key] = {
                                    positions: [], normals: [], uvs: [], indices: [], index: 0,
                                    blockType: blockType, materialIndex: materialIndex
                                };
                            }
                            addFace(geometries[key], [x, y, z], face.dir);
                        }
                    }
                }
            }
        }

        const group = new THREE.Group();
        for (const key in geometries) {
            const data = geometries[key];
            if (data.indices.length === 0) continue;

            const geometry = new THREE.BufferGeometry();
            geometry.setAttribute('position', new THREE.Float32BufferAttribute(data.positions, 3));
            geometry.setAttribute('normal', new THREE.Float32BufferAttribute(data.normals, 3));
            geometry.setAttribute('uv', new THREE.Float32BufferAttribute(data.uvs, 2));
            geometry.setIndex(data.indices);

            let material;
            if (data.blockType === BLOCK_TYPES.GRASS) {
                material = grassMaterials[data.materialIndex];
            } else {
                material = materials[data.blockType];
            }

            const mesh = new THREE.Mesh(geometry, material);
            mesh.position.set(startX, startY, startZ);
            group.add(mesh);
        }

        this.mesh = group.children.length > 0 ? group : null;
    }

    // setActive, dispose, getIntersectables bleiben gleich
    setActive(active) {
        if (this.isActive === active || !this.mesh) return;
        this.isActive = active;
        this.scene[active ? 'add' : 'remove'](this.mesh);
    }

    dispose() {
        this.setActive(false);
        if (this.mesh) {
            this.mesh.children.forEach(child => child.geometry.dispose());
        }
        this.mesh = null;
    }

    getIntersectables() {
        return this.mesh ? this.mesh.children : [];
    }
}

// FACE_GEOMETRIES und addFace Funktion bleiben unverändert
const FACE_GEOMETRIES = {
    '1,0,0':   { p: [ [1,0,1], [1,0,0], [1,1,0], [1,1,1] ], u: [ [0,0], [1,0], [1,1], [0,1] ] }, // Right
    '-1,0,0':  { p: [ [0,0,0], [0,0,1], [0,1,1], [0,1,0] ], u: [ [0,0], [1,0], [1,1], [0,1] ] }, // Left
    '0,1,0':   { p: [ [0,1,1], [1,1,1], [1,1,0], [0,1,0] ], u: [ [0,0], [1,0], [1,1], [0,1] ] }, // Top
    '0,-1,0':  { p: [ [0,0,0], [1,0,0], [1,0,1], [0,0,1] ], u: [ [0,0], [1,0], [1,1], [0,1] ] }, // Bottom
    '0,0,1':   { p: [ [0,0,1], [1,0,1], [1,1,1], [0,1,1] ], u: [ [0,0], [1,0], [1,1], [0,1] ] }, // Front
    '0,0,-1':  { p: [ [1,0,0], [0,0,0], [0,1,0], [1,1,0] ], u: [ [0,0], [1,0], [1,1], [0,1] ] }, // Back
};

function addFace(data, pos, dir) {
    const { positions, normals, uvs, indices } = data;
    const faceInfo = FACE_GEOMETRIES[dir.join(',')];
    if (!faceInfo) return;

    for (const p of faceInfo.p) {
        positions.push(pos[0] + p[0], pos[1] + p[1], pos[2] + p[2]);
    }
    normals.push(...dir, ...dir, ...dir, ...dir);
    uvs.push(...faceInfo.u.flat());

    const i = data.index;
    indices.push(i, i + 1, i + 2, i, i + 2, i + 3);
    data.index += 4;
}