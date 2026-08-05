import * as THREE from 'three';
import { Enemy } from './Enemy.js';

const matKoboldSkin = new THREE.MeshStandardMaterial({ color: 0x8b4513, roughness: 0.9, flatShading: true }); // SaddleBrown
const matEye = new THREE.MeshBasicMaterial({ color: 0xff4500 }); // OrangeRed

export class Kobold extends Enemy {
    constructor(scene, position) {
        super(scene, position, 18, 4.0);
        this.velocityY = 0;
        this.attackCooldown = 0; // Less HP, faster than Goblin

        // Simple placeholder geometry: A small capsule-like body
        this.bodyGeo = new THREE.CylinderGeometry(0.2, 0.25, 0.6, 8);
        this.bodyGeo.translate(0, 0.3, 0);
        this.mesh = new THREE.Mesh(this.bodyGeo, matKoboldSkin);
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;
        this.group.add(this.mesh);
        this.group.scale.setScalar(1.5);

        // Eyes
        this.eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.08), matEye);
        this.eyeL.position.set(-0.1, 0.45, 0.22);
        this.mesh.add(this.eyeL);

        this.eyeR = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.08), matEye);
        this.eyeR.position.set(0.1, 0.45, 0.22);
        this.mesh.add(this.eyeR);
    }

    update(delta, playerContext, getFloorFunc, checkCollisionFunc) {
        if (this.isDead) return;
        const playerPos = playerContext?.pos || playerContext;
        super.update(delta, playerPos);

        if (this.attackCooldown > 0) {
            this.attackCooldown -= delta;
        }

        let isMoving = false;
        if (playerPos) {
            const dir = new THREE.Vector3().subVectors(playerPos, this.group.position);
            dir.y = 0;
            const dist = dir.length();
            if (dist > 1.2) {
                dir.normalize();

                let nextX = this.group.position.x + dir.x * this.speed * delta;
                let nextZ = this.group.position.z + dir.z * this.speed * delta;
                const pRad = 0.4;

                if (checkCollisionFunc) {
                    const testPosX = new THREE.Vector3(nextX, this.group.position.y, this.group.position.z);
                    if (checkCollisionFunc(testPosX, pRad)) nextX = this.group.position.x;

                    const testPosZ = new THREE.Vector3(this.group.position.x, this.group.position.y, nextZ);
                    if (checkCollisionFunc(testPosZ, pRad)) nextZ = this.group.position.z;
                }

                this.group.position.x = nextX;
                this.group.position.z = nextZ;
                this.group.rotation.y = Math.atan2(dir.x, dir.z);
                isMoving = true;
            }

            if (dist < 2.0 && this.attackCooldown <= 0) {
                if (playerContext && typeof playerContext.takeDamage === 'function') {
                    playerContext.takeDamage(10);
                }
                this.attackCooldown = 1.0;
            }
        }

        this.velocityY -= 60 * delta;
        this.group.position.y += this.velocityY * delta;

        if (getFloorFunc) {
            const floorY = getFloorFunc(this.group.position);
            if (this.group.position.y < floorY - 5.0) {
                this.isDead = true; this.hp = 0; this.destroy(); return;
            }
            if (this.group.position.y <= floorY) {
                this.group.position.y = floorY;
                this.velocityY = 0;
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
