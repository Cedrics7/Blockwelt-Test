import * as THREE from 'three';
import { Entity } from './Entity.js';

export class Skeleton extends Entity {
    constructor(scene, world, pos) {
        super(scene, world, pos);
        this.height = 1.8;
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.2, 0.4), new THREE.MeshLambertMaterial({ color: 0xE0E0E0 }));
        body.position.y = 0.6;
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.6), new THREE.MeshLambertMaterial({ color: 0xE0E0E0 }));
        head.position.set(0, 1.5, 0);
        this.mesh.add(body, head);
        this.state = 'wander';
        this.stateTimer = Math.random() * 5;
        this.seekDistance = 15;
    }
    update(dt, playerPos) {
        this.stateTimer -= dt;
        const distanceToPlayer = this.pos.distanceTo(playerPos);
        if (distanceToPlayer < this.seekDistance) {
            this.state = 'seek';
        } else if (this.state === 'seek') {
            this.state = 'wander';
        }
        if (this.stateTimer < 0 && this.on_ground()) {
            if (this.state === 'wander') {
                this.stateTimer = Math.random() * 5 + 3;
                const angle = Math.random() * Math.PI * 2;
                this.velocity.x = Math.cos(angle);
                this.velocity.z = Math.sin(angle);
            }
        }
        if (this.state === 'seek') {
            const direction = playerPos.clone().sub(this.pos).normalize();
            this.velocity.x = direction.x * 2.5;
            this.velocity.z = direction.z * 2.5;
        }
        if (this.velocity.lengthSq() > 0.1 && this.on_ground()) {
            const forwardDir = this.velocity.clone().normalize();
            const checkPos = this.pos.clone().add(forwardDir.multiplyScalar(this.width));
            if (this.world.isBlockAt(checkPos.x, this.pos.y + 0.5, checkPos.z)) {
                this.velocity.y = this.jump_force;
            }
        }
        this.mesh.rotation.y = Math.atan2(this.velocity.x, this.velocity.z);
        super.update(dt);
    }
}