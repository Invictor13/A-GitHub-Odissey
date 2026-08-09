import * as THREE from 'three';

const slimeColors = [0x22c55e, 0x3b82f6, 0xef4444, 0xa855f7, 0xeab308, 0xec4899];
const sharedSlimeBodyGeo = new THREE.SphereGeometry(1.0, 24, 24);
const sharedSlimeCoreGeo = new THREE.SphereGeometry(0.35, 12, 12);
const sharedSlimeBubbleGeo = new THREE.SphereGeometry(0.08, 8, 8);
const sharedEyeGeo = new THREE.ConeGeometry(0.12, 0.35, 4);
const sharedPupilGeo = new THREE.BoxGeometry(0.04, 0.18, 0.08);
const sharedMouthBgGeo = new THREE.CylinderGeometry(0.3, 0.25, 0.15, 10, 1, false, 0, Math.PI);
const sharedToothGeo = new THREE.ConeGeometry(0.035, 0.12, 4);

const matEyeBase = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2, emissive: 0xffffff, emissiveIntensity: 0.3 });
const matSlimePupil = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.1 });
const matMouthBg = new THREE.MeshBasicMaterial({ color: 0x0a0000, side: THREE.DoubleSide });
const matTooth = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 });

import { Enemy } from './Enemy.js';

export class Slime extends Enemy {
    constructor(scene, position) {
        super(scene, position, 15, 1.5);

        this.color = slimeColors[Math.floor(Math.random() * slimeColors.length)];
        this.baseScale = (0.8 + Math.random() * 0.6) * 1.5;

        this.baseMat = new THREE.MeshPhysicalMaterial({
            color: this.color, transmission: 0.9, opacity: 0.95, transparent: true,
            roughness: 0.1, ior: 1.2, thickness: 1.5, clearcoat: 0.8, flatShading: false
        });

        this.body = new THREE.Mesh(sharedSlimeBodyGeo, this.baseMat);
        this.body.position.y = 1.0; this.body.castShadow = true;
        this.group.add(this.body);

        const coreMat = new THREE.MeshStandardMaterial({ color: this.color, roughness: 0.4, emissive: this.color, emissiveIntensity: 0.4 });
        this.core = new THREE.Mesh(sharedSlimeCoreGeo, coreMat);
        this.core.position.y = 1.0; this.group.add(this.core);

        this.bubbles = [];
        for(let i=0; i<5; i++) {
            const bubble = new THREE.Mesh(sharedSlimeBubbleGeo, coreMat);
            bubble.position.set((Math.random()-0.5)*0.8, 1.0 + (Math.random()-0.5)*0.8, (Math.random()-0.5)*0.8);
            this.group.add(bubble);
            this.bubbles.push({ mesh: bubble, speed: Math.random()*2+1, angle: Math.random()*Math.PI*2, dist: 0.2 + Math.random()*0.4 });
        }

        this.eyeL = new THREE.Group(); this.eyeL.position.set(-0.35, 1.35, 0.95); this.group.add(this.eyeL);
        this.eyeR = new THREE.Group(); this.eyeR.position.set(0.35, 1.35, 0.95); this.group.add(this.eyeR);

        const leftEyePiece = new THREE.Mesh(sharedEyeGeo, matEyeBase); leftEyePiece.rotation.z = -Math.PI / 2 - 0.35; this.eyeL.add(leftEyePiece);
        const rightEyePiece = new THREE.Mesh(sharedEyeGeo, matEyeBase); rightEyePiece.rotation.z = Math.PI / 2 + 0.35; this.eyeR.add(rightEyePiece);

        const pupilL = new THREE.Mesh(sharedPupilGeo, matSlimePupil); pupilL.position.set(0, 0, 0.05); this.eyeL.add(pupilL);
        const pupilR = new THREE.Mesh(sharedPupilGeo, matSlimePupil); pupilR.position.set(0, 0, 0.05); this.eyeR.add(pupilR);

        this.mouthGroup = new THREE.Group();
        this.mouthGroup.position.set(0, 0.85, 1.02);
        this.mouthGroup.scale.set(0, 0, 0);
        this.group.add(this.mouthGroup);

        this.mouthBg = new THREE.Mesh(sharedMouthBgGeo, matMouthBg);
        this.mouthBg.rotation.z = Math.PI; this.mouthGroup.add(this.mouthBg);

        for(let i = -2; i <= 2; i++) {
            const topTooth = new THREE.Mesh(sharedToothGeo, matTooth);
            topTooth.position.set(i * 0.09, 0.06, 0.04); topTooth.rotation.x = Math.PI;
            this.mouthGroup.add(topTooth);
            const botTooth = new THREE.Mesh(sharedToothGeo, matTooth);
            botTooth.position.set(i * 0.09, -0.06, 0.04);
            this.mouthGroup.add(botTooth);
        }

        this.group.position.copy(position);
        this.group.scale.setScalar(this.baseScale);

        this.time = Math.random() * 10;
        this.mouthOpenAmount = 0;
        this.attackCooldown = 0;
        this.velocityY = 0;
    }

    update(delta, playerContext, getFloorFunc, checkCollisionFunc) {
        if (this.isDead) return;

        // Handle parameters based on the new signature where we pass a context object or vector
        const playerPos = playerContext?.pos || playerContext;

        super.update(delta, playerPos);
        this.time += delta;

        if (this.attackCooldown > 0) {
            this.attackCooldown -= delta;
        }

        // Animate bubbles
        this.bubbles.forEach(b => {
            b.angle += b.speed * delta;
            b.mesh.position.x = Math.sin(b.angle) * b.dist;
            b.mesh.position.z = Math.cos(b.angle) * b.dist;
            b.mesh.position.y = 1.0 + Math.sin(b.angle * 2) * 0.2;
        });

        // Hop logic
        const hopCycle = Math.sin(this.time * 5);
        let targetMouthScale = 0.0;

        if (hopCycle > 0) {
             this.body.position.y = 1.0 + hopCycle * 0.5;
             this.body.scale.set(1 - hopCycle * 0.2, 1 + hopCycle * 0.2, 1 - hopCycle * 0.2);
             targetMouthScale = 1.0;
        } else {
             this.body.position.y = 1.0;
             this.body.scale.set(1 - hopCycle * 0.3, 1 + hopCycle * 0.2, 1 - hopCycle * 0.3); // Squish
        }

        // Animate mouth based on hop
        this.mouthOpenAmount += (targetMouthScale - this.mouthOpenAmount) * 16 * delta;
        this.mouthGroup.scale.setScalar(this.mouthOpenAmount);

        const faceYOffset = (this.body.scale.y - 1.0) * 0.8;
        this.eyeL.position.y = 1.35 + faceYOffset + (this.body.position.y - 1.0);
        this.eyeR.position.y = 1.35 + faceYOffset + (this.body.position.y - 1.0);
        this.mouthGroup.position.y = 0.85 + faceYOffset + (this.body.position.y - 1.0);


        // Slow chase logic
        if (!playerPos) return;
        const dir = new THREE.Vector3().subVectors(playerPos, this.group.position);
        dir.y = 0;

        const distToPlayer = dir.length();

        if (distToPlayer > 1.2 && hopCycle > 0) {
            dir.normalize();

            const pRad = 0.4;
            let nextX = this.group.position.x + dir.x * 1.5 * delta;
            let nextZ = this.group.position.z + dir.z * 1.5 * delta;

            if (checkCollisionFunc) {
                // Check X movement
                const testPosX = new THREE.Vector3(nextX, this.group.position.y, this.group.position.z);
                if (checkCollisionFunc(testPosX, pRad)) {
                    nextX = this.group.position.x; // Blocked on X
                }

                // Check Z movement
                const testPosZ = new THREE.Vector3(this.group.position.x, this.group.position.y, nextZ);
                if (checkCollisionFunc(testPosZ, pRad)) {
                    nextZ = this.group.position.z; // Blocked on Z
                }
            }

            this.group.position.x = nextX;
            this.group.position.z = nextZ;

            this.group.rotation.y = Math.atan2(dir.x, dir.z);
        }

        // Attack logic
        if (distToPlayer < 2.0 && this.attackCooldown <= 0) {
            if (targetContext && typeof targetContext.takeDamage === 'function') {
                targetContext.takeDamage(12);
            }
            this.attackCooldown = 1.0;
        }

        // Floor logic
        this.velocityY -= 60 * delta; // Gravity
        this.group.position.y += this.velocityY * delta;

        if (getFloorFunc) {
            const floorY = getFloorFunc(this.group.position);

            if (this.group.position.y < floorY - 5.0) {
                // Abyss detector fallback
                this.isDead = true;
                this.hp = 0;
                this.destroy();
                return;
            }

            if (this.group.position.y <= floorY) {
                this.group.position.y = floorY;
                this.velocityY = 0;
            }
        }
    }

}
