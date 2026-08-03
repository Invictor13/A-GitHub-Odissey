import * as THREE from 'three';
import { Enemy } from './Enemy.js';

const matKoboldSkin = new THREE.MeshStandardMaterial({ color: 0x8b4513, roughness: 0.9, flatShading: true }); // SaddleBrown
const matEye = new THREE.MeshBasicMaterial({ color: 0xff4500 }); // OrangeRed

export class Kobold extends Enemy {
    constructor(scene, position) {
        super(scene, position, 18, 4.0); // Less HP, faster than Goblin

        // Simple placeholder geometry: A small capsule-like body
        this.bodyGeo = new THREE.CylinderGeometry(0.2, 0.25, 0.6, 8);
        this.bodyGeo.translate(0, 0.3, 0);
        this.mesh = new THREE.Mesh(this.bodyGeo, matKoboldSkin);
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;
        this.group.add(this.mesh);

        // Eyes
        this.eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.08), matEye);
        this.eyeL.position.set(-0.1, 0.45, 0.22);
        this.mesh.add(this.eyeL);

        this.eyeR = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.08), matEye);
        this.eyeR.position.set(0.1, 0.45, 0.22);
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

        // Simple hop animation
        if (isMoving) {
            this.mesh.position.y = Math.abs(Math.sin(this.animTime * 1.5)) * 0.2;
            this.mesh.rotation.z = Math.sin(this.animTime * 0.75) * 0.1;
        } else {
            this.mesh.position.y = 0;
            this.mesh.rotation.z = 0;
        }
    }
}
