import * as THREE from 'three';
import { Enemy } from './Enemy.js';

const matLizardSkin = new THREE.MeshStandardMaterial({ color: 0x2e8b57, roughness: 0.8, flatShading: true }); // SeaGreen
const matEye = new THREE.MeshBasicMaterial({ color: 0xffff00 }); // Yellow

export class Lizardman extends Enemy {
    constructor(scene, position) {
        super(scene, position, 40, 2.8); // Higher HP, moderate speed

        // Simple placeholder geometry: A larger, taller body
        this.bodyGeo = new THREE.BoxGeometry(0.5, 1.2, 0.4);
        this.bodyGeo.translate(0, 0.6, 0);
        this.mesh = new THREE.Mesh(this.bodyGeo, matLizardSkin);
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;
        this.group.add(this.mesh);

        // Snout
        this.snout = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.4), matLizardSkin);
        this.snout.position.set(0, 0.9, 0.3);
        this.mesh.add(this.snout);

        // Eyes
        this.eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), matEye);
        this.eyeL.position.set(-0.26, 1.0, 0.15);
        this.mesh.add(this.eyeL);

        this.eyeR = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), matEye);
        this.eyeR.position.set(0.26, 1.0, 0.15);
        this.mesh.add(this.eyeR);
    }

    update(delta, playerPos) {
        if (this.isDead) return;
        super.update(delta, playerPos);

        let isMoving = false;
        if (playerPos) {
            const dir = new THREE.Vector3().subVectors(playerPos, this.group.position);
            dir.y = 0;
            if (dir.length() > 0.5) {
                dir.normalize();
                this.group.position.addScaledVector(dir, this.speed * delta);
                this.group.rotation.y = Math.atan2(dir.x, dir.z);
                isMoving = true;
            }
        }

        // Simple waddle animation
        if (isMoving) {
            this.mesh.rotation.z = Math.sin(this.animTime) * 0.15;
            this.mesh.rotation.x = Math.abs(Math.sin(this.animTime * 2.0)) * 0.1;
        } else {
            this.mesh.rotation.z = 0;
            this.mesh.rotation.x = 0;
        }
    }
}
