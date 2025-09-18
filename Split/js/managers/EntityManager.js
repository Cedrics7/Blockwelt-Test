import { ItemEntity } from '../entities/ItemEntity.js';
import { Pig } from '../entities/Pig.js';
import { Skeleton } from '../entities/Skeleton.js';
import { BLOCK_TYPES, WORLD_SIZE_X, WORLD_SIZE_Z, WORLD_MIN_Y } from '../constants.js';
import * as THREE from 'three';


export class EntityManager {
    constructor(scene, world) {
        this.scene = scene;
        this.world = world;
        this.entities = [];
        this.maxEntities = 20;
        this.spawnRadius = 80;
    }

    update(dt, player) {
        this.entities.forEach((entity, index) => {
            entity.update(dt, player.pos);
            const distance = entity.pos.distanceTo(player.pos);
            if (distance > this.spawnRadius + 40) {
                entity.remove();
                this.entities.splice(index, 1);
            }
        });
        if (this.entities.length < this.maxEntities && Math.random() < 0.1) {
            this.trySpawn(player.pos);
        }
    }
    spawnItemEntity(pos, itemType, texture, count) {
        const item = new ItemEntity(this.scene, this.world, pos, itemType, texture, count);
        item.velocity.set((Math.random() - 0.5) * 2, 2, (Math.random() - 0.5) * 2);
        this.entities.push(item);
    }

    trySpawn(playerPos) {
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * 20 + (this.spawnRadius - 20);
        const x = Math.floor(playerPos.x + Math.cos(angle) * radius);
        const z = Math.floor(playerPos.z + Math.sin(angle) * radius);
        if (x < 0 || x >= WORLD_SIZE_X || z < 0 || z >= WORLD_SIZE_Z) return;

        const groundY = this.world.getSurfaceY(x, z);

        if (groundY > WORLD_MIN_Y) {
            const pos = new THREE.Vector3(x + 0.5, groundY, z + 0.5);
            const blockBelow = this.world.getBlock(x, groundY - 1, z);
            if (blockBelow === BLOCK_TYPES.GRASS || blockBelow === BLOCK_TYPES.SAND) {
                const entityType = blockBelow === BLOCK_TYPES.SAND ? Pig : (Math.random() > 0.5 ? Pig : Skeleton);

                if (entityType === Pig) this.entities.push(new Pig(this.scene, this.world, pos));
                else this.entities.push(new Skeleton(this.scene, this.world, pos));
            }
        }
    }
}