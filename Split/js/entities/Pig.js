import * as THREE from 'three';
import { Entity } from './Entity.js';

export class Pig extends Entity {
    constructor(scene, world, pos) {
        super(scene, world, pos);
        this.height = 0.8;
        const body = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.8, 0.8), new THREE.MeshLambertMaterial({ color: 0xFF8FAF }));
        body.position.y = 0.4;
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.6), new THREE.MeshLambertMaterial({ color: 0xFF8FAF }));
        head.position.set(-0.7, 0.5, 0);
        this.mesh.add(body, head);
        this.state = 'wander';
        this.stateTimer = Math.random() * 5;
        this.fleeDistance = 8;
    }

    update(dt, playerPos) {
        this.stateTimer -= dt;
        const distanceToPlayer = this.pos.distanceTo(playerPos);
        if (distanceToPlayer < this.fleeDistance) {
            this.state = 'flee';
        } else if (this.state === 'flee') {
            this.state = 'wander';
        }
        if (this.stateTimer < 0 && this.on_ground()) {
            if (this.state === 'wander') {
                this.stateTimer = Math.random() * 5 + 3;
                const angle = Math.random() * Math.PI * 2;
                this.velocity.x = Math.cos(angle) * 1.5;
                this.velocity.z = Math.sin(angle) * 1.5;
            } else {
                this.stateTimer = 0.5;
            }
        }
        if (this.state === 'flee') {
            const direction = this.pos.clone().sub(playerPos).normalize();
            this.velocity.x = direction.x * 4;
            this.velocity.z = direction.z * 4;
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