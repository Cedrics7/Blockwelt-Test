import * as THREE from 'three';
import { Entity } from './Entity.js';

export class Pig extends Entity {
    constructor(scene, world, pos) {
        super(scene, world, pos);
        this.height = 0.9;
        this.width = 0.7;

        const pigMaterial = new THREE.MeshLambertMaterial({ color: 0xFF8FAF });
        const darkPinkMaterial = new THREE.MeshLambertMaterial({ color: 0xEAA9C3 });
        const blackMaterial = new THREE.MeshLambertMaterial({ color: 0x000000 });

        // Körper
        const body = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.8, 0.9), pigMaterial);
        body.position.y = 0.6;

        // Kopf
        const head = new THREE.Group();
        const mainHead = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.7), pigMaterial);
        const snout = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.25, 0.1), darkPinkMaterial);
        snout.position.set(-0.36, -0.1, 0);
        const eye1 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), blackMaterial);
        eye1.position.set(-0.2, 0.15, 0.2);
        const eye2 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), blackMaterial);
        eye2.position.set(-0.2, 0.15, -0.2);
        head.add(mainHead, snout, eye1, eye2);
        head.position.set(-0.8, 0.8, 0);

        // Beine
        const leg1 = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.4, 0.3), pigMaterial);
        leg1.position.set(-0.5, 0.2, 0.25);
        const leg2 = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.4, 0.3), pigMaterial);
        leg2.position.set(0.5, 0.2, 0.25);
        const leg3 = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.4, 0.3), pigMaterial);
        leg3.position.set(-0.5, 0.2, -0.25);
        const leg4 = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.4, 0.3), pigMaterial);
        leg4.position.set(0.5, 0.2, -0.25);

        this.mesh.add(body, head, leg1, leg2, leg3, leg4);

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