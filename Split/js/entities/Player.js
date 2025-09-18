import * as THREE from 'three';
import { BLOCK_TYPES, WORLD_SIZE_X, WORLD_SIZE_Z, VOID_DEATH_Y, INVENTORY_SIZE, MAX_STACK_SIZE } from '../constants.js';

// ... (imports)

export class Player {
    constructor(world) {
        this.world = world;
        this.pos = new THREE.Vector3(WORLD_SIZE_X / 2, 100, WORLD_SIZE_Z / 2);
        this.velocity = new THREE.Vector3();
        this.speed = 5.0;
        this.sprintSpeed = 9.0;
        this.jump_force = 8.0;
        this.gravity = -25.0;
        this.height = 1.75;
        this.eye_height = 1.65;
        this.width = 0.6;
        this.selectedHotbarSlot = 0;
        this.inventory = Array(INVENTORY_SIZE).fill(null).map(() => ({ type: BLOCK_TYPES.AIR, count: 0 }));
        this.isDead = false;
        this.health = 20;
        this.maxHealth = 20;
        this.fallVelocity = 0;
    }

    takeDamage(amount) {
        this.health -= amount;
        if (this.health <= 0) {
            this.health = 0;
            this.isDead = true;
        }
    }


    setState(playerData) {
        this.pos.set(playerData.pos.x, playerData.pos.y, playerData.pos.z);
        this.inventory = playerData.inventory;
    }

    getState() {
        return { pos: { x: this.pos.x, y: this.pos.y, z: this.pos.z }, inventory: this.inventory };
    }

    addItem(type, count) {
        for (let i = 0; i < INVENTORY_SIZE; i++) {
            const item = this.inventory[i];
            if (item.type === type && item.count < MAX_STACK_SIZE) {
                const canAdd = Math.min(count, MAX_STACK_SIZE - item.count);
                item.count += canAdd;
                count -= canAdd;
                if (count === 0) return true;
            }
        }
        for (let i = 0; i < INVENTORY_SIZE; i++) {
            if (this.inventory[i].type === BLOCK_TYPES.AIR) {
                this.inventory[i] = { type, count };
                return true;
            }
        }
        return false;
    }

    removeItem(slotIndex, count) {
        const item = this.inventory[slotIndex];
        if (item && item.type !== BLOCK_TYPES.AIR && item.count > 0) {
            item.count -= count;
            if (item.count <= 0) {
                item.type = BLOCK_TYPES.AIR;
                item.count = 0;
            }
            return true;
        }
        return false;
    }

    get_camera_position() {
        return new THREE.Vector3(this.pos.x, this.pos.y + this.eye_height, this.pos.z);
    }

    getBoundingBox() {
        const hw = this.width / 2;
        return new THREE.Box3(new THREE.Vector3(this.pos.x - hw, this.pos.y, this.pos.z - hw), new THREE.Vector3(this.pos.x + hw, this.pos.y + this.height, this.pos.z + hw));
    }

    is_colliding(pos) {
        const hw = this.width / 2;
        for (let y = Math.floor(pos.y); y < pos.y + this.height; y++) {
            for (let x = Math.floor(pos.x - hw); x <= Math.floor(pos.x + hw); x++) {
                for (let z = Math.floor(pos.z - hw); z <= Math.floor(pos.z + hw); z++) {
                    if (this.world.isBlockAt(x, y, z)) return true;
                }
            }
        }
        return false;
    }

    on_ground() {
        return this.is_colliding(new THREE.Vector3(this.pos.x, this.pos.y - 0.01, this.pos.z));
    }

    update(dt, keys, camera) {
        const onGround = this.on_ground();

        if (this.pos.y < VOID_DEATH_Y || this.world.getBlock(Math.floor(this.pos.x), Math.floor(this.pos.y - 0.1), Math.floor(this.pos.z)) === BLOCK_TYPES.LAVA) {
            this.isDead = true;
            return;
        }

        if (!onGround) {
            this.velocity.y += this.gravity * dt;
            this.fallVelocity = this.velocity.y; // Speichere die Fallgeschwindigkeit
        } else {
            if (this.fallVelocity < -8) { // Schwellenwert für Fallschaden
                const damage = Math.floor(Math.abs(this.fallVelocity) - 7);
                this.takeDamage(damage);
            }
            this.fallVelocity = 0;
            if (this.velocity.y < 0) this.velocity.y = 0;
        }

        if (keys['Space'] && onGround) { this.velocity.y = this.jump_force; }

        // ... (Bewegungslogik)

        camera.position.copy(this.get_camera_position());
    }

    respawn() {
        this.health = this.maxHealth;
        this.isDead = false;
        this.velocity.set(0, 0, 0);
    }
}