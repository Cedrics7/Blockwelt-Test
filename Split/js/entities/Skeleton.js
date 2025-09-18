// Split/js/entities/Skeleton.js

import * as THREE from 'three';
import { Entity } from './Entity.js';

export class Skeleton extends Entity {
    constructor(scene, world, pos) {
        super(scene, world, pos);
        this.height = 1.8;
        this.width = 0.6;

        const boneMaterial = new THREE.MeshLambertMaterial({ color: 0xE0E0E0 });
        const blackMaterial = new THREE.MeshLambertMaterial({ color: 0x222222 });

        // Kopf
        const head = new THREE.Group();
        const mainHead = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.6), boneMaterial);

        // --- KORREKTUR DER AUGENPOSITION ---
        // Die Augen sind jetzt auf der +Z-Achse (vorne) platziert.
        const eye1 = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 0.1), blackMaterial);
        eye1.position.set(0.15, 0.1, 0.31);
        const eye2 = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 0.1), blackMaterial);
        eye2.position.set(-0.15, 0.1, 0.31);

        head.add(mainHead, eye1, eye2);
        head.position.set(0, 1.5, 0);

        // (Restlicher Code für Körper, Arme, Beine bleibt gleich)
        const torso = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.0, 0.4), boneMaterial);
        torso.position.y = 0.7;
        const armLeft = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.0, 0.2), boneMaterial);
        armLeft.position.set(-0.45, 0.7, 0);
        const armRight = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.0, 0.2), boneMaterial);
        armRight.position.set(0.45, 0.7, 0);
        const legLeft = new THREE.Mesh(new THREE.BoxGeometry(0.25, 1.0, 0.25), boneMaterial);
        legLeft.position.set(-0.15, -0.3, 0);
        const legRight = new THREE.Mesh(new THREE.BoxGeometry(0.25, 1.0, 0.25), boneMaterial);
        legRight.position.set(0.15, -0.3, 0);

        this.mesh.add(head, torso, armLeft, armRight, legLeft, legRight);

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
        if (this.velocity.lengthSq() > 0.1) {
            this.mesh.rotation.y = Math.atan2(this.velocity.x, this.velocity.z);
        }

        super.update(dt);
    }

}