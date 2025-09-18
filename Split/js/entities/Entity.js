import * as THREE from 'three';

// Basisklasse für alle "Lebewesen"
export class Entity {
    constructor(scene, world, pos) {
        this.scene = scene;
        this.world = world;
        this.pos = pos;
        this.velocity = new THREE.Vector3();
        this.mesh = new THREE.Group();
        this.scene.add(this.mesh);
        this.gravity = -20.0;
        this.height = 1.0;
        this.width = 0.8;
        this.jump_force = 6.0;
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

    update(dt) {
        if (!this.on_ground()) { this.velocity.y += this.gravity * dt; }
        else if (this.velocity.y < 0) { this.velocity.y = 0; }

        const deltaPos = this.velocity.clone().multiplyScalar(dt);
        this.pos.y += deltaPos.y; if (this.is_colliding(this.pos)) { this.pos.y -= deltaPos.y; this.velocity.y = 0; }
        this.pos.x += deltaPos.x; if (this.is_colliding(this.pos)) { this.pos.x -= deltaPos.x; this.velocity.x *= -0.5; }
        this.pos.z += deltaPos.z; if (this.is_colliding(this.pos)) { this.pos.z -= deltaPos.z; this.velocity.z *= -0.5; }

        this.mesh.position.copy(this.pos);
    }

    remove() {
        this.scene.remove(this.mesh);
    }
}