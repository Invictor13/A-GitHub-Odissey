import * as THREE from 'three';
import { Enemy } from './Enemy.js';

function createPixelTexture(baseHex, detailHex, size = 64, noiseDensity = 0.25) {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = baseHex; ctx.fillRect(0, 0, size, size);
    const grid = 4;
    for (let x = 0; x < size; x += grid) {
        for (let y = 0; y < size; y += grid) {
            if (Math.random() < noiseDensity) {
                ctx.fillStyle = detailHex;
                ctx.globalAlpha = 0.15 + Math.random() * 0.35;
                ctx.fillRect(x, y, grid, grid);
            }
        }
    }
    ctx.globalAlpha = 1.0;
    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter; texture.minFilter = THREE.NearestFilter;
    return texture;
}

const blackFurTex = createPixelTexture('#1a1c20', '#0a0b0d', 64, 0.45);
const whiteFurTex = createPixelTexture('#e3e8ed', '#aab2b8', 64, 0.35);
const snoutNoseTex = createPixelTexture('#0d0d0f', '#000000', 32, 0.4);
const leafGreenTex = createPixelTexture('#437a28', '#214212', 64, 0.4);
const leafDarkTex = createPixelTexture('#2d521c', '#152e0a', 64, 0.35);
const woodTex = createPixelTexture('#4a321d', '#281a0c', 64, 0.4);
const spikeMetalTex = createPixelTexture('#80858e', '#454a52', 32, 0.4);
const eyeTex = createPixelTexture('#ffaa00', '#ffff00', 32, 0.5);

const blackFurMat = new THREE.MeshStandardMaterial({ map: blackFurTex, roughness: 0.85, flatShading: true });
const whiteFurMat = new THREE.MeshStandardMaterial({ map: whiteFurTex, roughness: 0.9, flatShading: true });
const noseMat = new THREE.MeshStandardMaterial({ map: snoutNoseTex, roughness: 0.5, flatShading: true });
const leafMat1 = new THREE.MeshStandardMaterial({ map: leafGreenTex, roughness: 0.7, flatShading: true, side: THREE.DoubleSide });
const leafMat2 = new THREE.MeshStandardMaterial({ map: leafDarkTex, roughness: 0.75, flatShading: true, side: THREE.DoubleSide });
const woodMat = new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.9, flatShading: true });
const spikeMat = new THREE.MeshStandardMaterial({ map: spikeMetalTex, roughness: 0.5, metalness: 0.6, flatShading: true });
const eyeMat = new THREE.MeshBasicMaterial({ map: eyeTex });

function createLeafShapeGeo(width, height) {
    const geo = new THREE.ConeGeometry(width, height, 3);
    geo.rotateX(-Math.PI / 2); geo.translate(0, -height / 2, 0);
    return geo;
}

export class Kobold extends Enemy {
    constructor(scene, position) {
        super(scene, position, 18, 4.0);
        this.attackDamage = 8;
        this.velocityY = 0;
        this.attackCooldown = 0;
        this.baseHipsY = 0.9;
        this.animatedCloth = [];
        this.tailSegments = [];

        this.hips = new THREE.Group();
        this.hips.position.y = this.baseHipsY;
        this.group.add(this.hips);
        this.group.scale.setScalar(1.5);

        const pelvisGeo = new THREE.BoxGeometry(0.35, 0.22, 0.3);
        const pelvis = new THREE.Mesh(pelvisGeo, blackFurMat);
        pelvis.castShadow = true; this.hips.add(pelvis);

        this.torso = new THREE.Group();
        this.torso.position.y = 0.1;
        this.hips.add(this.torso);

        const chestGeo = new THREE.BoxGeometry(0.42, 0.48, 0.32);
        const chest = new THREE.Mesh(chestGeo, blackFurMat);
        chest.position.y = 0.23; chest.castShadow = true; this.torso.add(chest);

        const bellyGeo = new THREE.BoxGeometry(0.3, 0.4, 0.08);
        const belly = new THREE.Mesh(bellyGeo, whiteFurMat);
        belly.position.set(0, 0.2, 0.15); this.torso.add(belly);

        // Cape
        const leafCapeGroup = new THREE.Group();
        leafCapeGroup.position.set(0, 0.38, -0.16);
        this.torso.add(leafCapeGroup);

        for (let i = 0; i < 5; i++) {
            const span = (i / 4 - 0.5) * 0.35;
            const leafGeo = createLeafShapeGeo(0.1 + Math.random() * 0.03, 0.4 + Math.random() * 0.15);
            const leafMesh = new THREE.Mesh(leafGeo, i % 2 === 0 ? leafMat1 : leafMat2);
            leafMesh.position.set(span, 0, 0);
            const baseRx = -0.18 - Math.random() * 0.1; const baseRz = span * 0.25;
            leafMesh.rotation.set(baseRx, 0, baseRz); leafMesh.castShadow = true;
            leafCapeGroup.add(leafMesh);
            this.animatedCloth.push({ mesh: leafMesh, baseRx: baseRx, baseRz: baseRz, offset: i * 0.4 + 1.2, reactRun: 1.0 });
        }

        // Tail
        let parentJoint = this.hips;
        for (let i = 0; i < 5; i++) {
            const joint = new THREE.Group();
            if (i === 0) { joint.position.set(0, -0.08, -0.15); joint.rotation.x = -0.4; }
            else { joint.position.set(0, 0, -0.16); }

            const radiusTop = 0.09 - i * 0.015; const radiusBot = 0.07 - i * 0.015;
            const segGeo = new THREE.CylinderGeometry(radiusTop, radiusBot, 0.18, 6);
            segGeo.rotateX(Math.PI / 2); segGeo.translate(0, 0, -0.09);
            const segMesh = new THREE.Mesh(segGeo, (i >= 3) ? whiteFurMat : blackFurMat);
            segMesh.castShadow = true; joint.add(segMesh);
            parentJoint.add(joint); parentJoint = joint;
            this.tailSegments.push({ group: joint, baseRx: i === 0 ? -0.4 : 0.1, baseRy: 0, index: i });
        }

        // Head
        this.neck = new THREE.Group(); this.neck.position.set(0, 0.45, 0.06); this.torso.add(this.neck);
        this.headGroup = new THREE.Group(); this.headGroup.position.set(0, 0.08, 0.05); this.neck.add(this.headGroup);
        const headMesh = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.28, 0.32), blackFurMat); headMesh.castShadow = true; this.headGroup.add(headMesh);

        const wolfSnoutTop = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.1, 0.32), blackFurMat);
        wolfSnoutTop.position.set(0, 0.02, 0.28); wolfSnoutTop.castShadow = true; this.headGroup.add(wolfSnoutTop);
        const wolfSnoutBot = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.08, 0.3), whiteFurMat);
        wolfSnoutBot.position.set(0, -0.08, 0.28); this.headGroup.add(wolfSnoutBot);

        const wolfNose = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.07, 0.07), noseMat);
        wolfNose.position.set(0, 0.04, 0.45); this.headGroup.add(wolfNose);

        const leftEye = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.04), eyeMat); leftEye.position.set(-0.13, 0.05, 0.15); this.headGroup.add(leftEye);
        const rightEye = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.04), eyeMat); rightEye.position.set(0.13, 0.05, 0.15); this.headGroup.add(rightEye);

        this.leftEar = new THREE.Group(); this.leftEar.position.set(-0.15, 0.18, -0.03); this.headGroup.add(this.leftEar);
        const lEarM = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.3, 4), blackFurMat); lEarM.position.y = 0.15; lEarM.rotation.set(0.1, 0, -0.15); this.leftEar.add(lEarM);
        this.rightEar = new THREE.Group(); this.rightEar.position.set(0.15, 0.18, -0.03); this.headGroup.add(this.rightEar);
        const rEarM = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.3, 4), blackFurMat); rEarM.position.y = 0.15; rEarM.rotation.set(0.1, 0, 0.15); this.rightEar.add(rEarM);

        // Arms
        this.leftShoulder = new THREE.Group(); this.leftShoulder.position.set(-0.25, 0.35, 0); this.torso.add(this.leftShoulder);
        const leftArm = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.28, 6), blackFurMat); leftArm.position.y = -0.14; this.leftShoulder.add(leftArm);
        this.leftElbow = new THREE.Group(); this.leftElbow.position.y = -0.28; this.leftShoulder.add(this.leftElbow);
        const leftForearm = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.28, 6), whiteFurMat); leftForearm.position.y = -0.14; this.leftElbow.add(leftForearm);

        this.rightShoulder = new THREE.Group(); this.rightShoulder.position.set(0.25, 0.35, 0); this.torso.add(this.rightShoulder);
        const rightArm = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.28, 6), blackFurMat); rightArm.position.y = -0.14; this.rightShoulder.add(rightArm);
        this.rightElbow = new THREE.Group(); this.rightElbow.position.y = -0.28; this.rightShoulder.add(this.rightElbow);
        const rightForearm = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.28, 6), whiteFurMat); rightForearm.position.y = -0.14; this.rightElbow.add(rightForearm);

        // Weapon
        const club = new THREE.Group(); club.position.y = -0.28; this.rightElbow.add(club);
        const clubShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.04, 0.8, 6), woodMat); clubShaft.rotation.x = Math.PI/2; club.add(clubShaft);
        const clubHead = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.04, 0.3, 8), woodMat); clubHead.position.z = 0.25; clubHead.rotation.x = Math.PI/2; club.add(clubHead);
        const spike = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.12, 4), spikeMat); spike.position.set(0, 0.06, 0.25); spike.rotation.set(Math.PI/2,0,0); club.add(spike);

        // Legs
        this.leftHip = new THREE.Group(); this.leftHip.position.set(-0.12, -0.05, 0); this.hips.add(this.leftHip);
        const leftThigh = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.05, 0.32, 6), blackFurMat); leftThigh.position.y = -0.16; this.leftHip.add(leftThigh);
        this.leftKnee = new THREE.Group(); this.leftKnee.position.y = -0.32; this.leftHip.add(this.leftKnee);
        const leftShin = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.05, 0.32, 6), whiteFurMat); leftShin.position.y = -0.16; this.leftKnee.add(leftShin);

        this.rightHip = new THREE.Group(); this.rightHip.position.set(0.12, -0.05, 0); this.hips.add(this.rightHip);
        const rightThigh = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.05, 0.32, 6), blackFurMat); rightThigh.position.y = -0.16; this.rightHip.add(rightThigh);
        this.rightKnee = new THREE.Group(); this.rightKnee.position.y = -0.32; this.rightHip.add(this.rightKnee);
        const rightShin = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.05, 0.32, 6), whiteFurMat); rightShin.position.y = -0.16; this.rightKnee.add(rightShin);
    }

    update(delta, playerContext, getFloorFunc, checkCollisionFunc) {
        if (this.isDead) return;
        const defaultPos = playerContext?.pos || playerContext;

        let targetContext = playerContext;
        let targetPos = defaultPos;

        if (playerContext && typeof playerContext.findClosestTarget === 'function') {
            targetContext = playerContext.findClosestTarget(this.group.position, 15.0);
            targetPos = targetContext ? targetContext.pos : null;
        }

        super.update(delta, targetPos);

        if (this.attackCooldown > 0) {
            this.attackCooldown -= delta;
        }

        // Fast chase logic
        let isMoving = false;
        if (targetPos) {
            const dir = new THREE.Vector3().subVectors(targetPos, this.group.position);
            dir.y = 0; const dist = dir.length();
            if (dist > 1.2) {
                dir.normalize();
                let nextX = this.group.position.x + dir.x * this.speed * delta;
                let nextZ = this.group.position.z + dir.z * this.speed * delta;
                const pRad = 0.4;
                if (checkCollisionFunc) {
                    if (checkCollisionFunc(new THREE.Vector3(nextX, this.group.position.y, this.group.position.z), pRad)) nextX = this.group.position.x;
                    if (checkCollisionFunc(new THREE.Vector3(this.group.position.x, this.group.position.y, nextZ), pRad)) nextZ = this.group.position.z;
                }
                this.group.position.x = nextX; this.group.position.z = nextZ;
                this.group.rotation.y = Math.atan2(dir.x, dir.z);
                isMoving = true;
            }
            if (dist < 2.0 && this.attackCooldown <= 0) {
                if (targetContext && typeof targetContext.takeDamage === 'function') targetContext.takeDamage(this.attackDamage);
                this.attackCooldown = 1.0;
                this.rightElbow.rotation.x = -1.5;
            }
        }

        this.velocityY -= 60 * delta;
        this.group.position.y += this.velocityY * delta;

        if (getFloorFunc) {
            const floorY = getFloorFunc(this.group.position);
            if (this.group.position.y < floorY - 5.0) { this.isDead = true; this.hp = 0; this.destroy(); return; }
            if (this.group.position.y <= floorY) { this.group.position.y = floorY; this.velocityY = 0; }
        }

        const lerpSpeed = 10 * delta;

        this.animatedCloth.forEach(cloth => {
            const wind = Math.sin(this.animTime * 4 + cloth.offset) * 0.08;
            cloth.mesh.rotation.x += (cloth.baseRx + wind - cloth.mesh.rotation.x) * 14 * delta;
            cloth.mesh.rotation.z += (cloth.baseRz + Math.cos(this.animTime * 3 + cloth.offset) * 0.04 - cloth.mesh.rotation.z) * 14 * delta;
        });

        this.tailSegments.forEach((seg, idx) => {
            const waveDelay = idx * 0.25;
            const tailWaveY = Math.sin(this.animTime * 8 - waveDelay) * (0.15 + idx * 0.05);
            const tailWaveX = Math.cos(this.animTime * 4 - waveDelay) * 0.08;
            seg.group.rotation.y = THREE.MathUtils.lerp(seg.group.rotation.y, seg.baseRy + tailWaveY, 12 * delta);
            seg.group.rotation.x = THREE.MathUtils.lerp(seg.group.rotation.x, seg.baseRx + tailWaveX + (isMoving ? 0.2 : 0), 12 * delta);
        });

        if (!isMoving) {
            const breath = Math.sin(this.animTime * 2.8) * 0.04;
            this.hips.position.y = THREE.MathUtils.lerp(this.hips.position.y, this.baseHipsY + breath, lerpSpeed);
            this.torso.rotation.x = THREE.MathUtils.lerp(this.torso.rotation.x, 0.3 + breath * 0.5, lerpSpeed);
            this.headGroup.rotation.x = THREE.MathUtils.lerp(this.headGroup.rotation.x, -0.15, lerpSpeed);

            this.leftShoulder.rotation.x = THREE.MathUtils.lerp(this.leftShoulder.rotation.x, 0.3, lerpSpeed);
            this.rightShoulder.rotation.x = THREE.MathUtils.lerp(this.rightShoulder.rotation.x, -0.4, lerpSpeed);
            this.rightElbow.rotation.x = THREE.MathUtils.lerp(this.rightElbow.rotation.x, -0.7, lerpSpeed);

            this.leftHip.rotation.x = THREE.MathUtils.lerp(this.leftHip.rotation.x, -0.25, lerpSpeed);
            this.rightHip.rotation.x = THREE.MathUtils.lerp(this.rightHip.rotation.x, -0.25, lerpSpeed);
            this.leftKnee.rotation.x = THREE.MathUtils.lerp(this.leftKnee.rotation.x, 0.45, lerpSpeed);
            this.rightKnee.rotation.x = THREE.MathUtils.lerp(this.rightKnee.rotation.x, 0.45, lerpSpeed);
        } else {
            const bob = Math.abs(Math.sin(this.animTime * 15)) * 0.13;
            this.hips.position.y = THREE.MathUtils.lerp(this.hips.position.y, this.baseHipsY - 0.08 + bob, lerpSpeed);
            this.torso.rotation.x = THREE.MathUtils.lerp(this.torso.rotation.x, 0.5, lerpSpeed);
            this.headGroup.rotation.x = THREE.MathUtils.lerp(this.headGroup.rotation.x, -0.3, lerpSpeed);

            const legAngle = Math.sin(this.animTime * 15) * 0.8;
            this.leftHip.rotation.x = legAngle; this.rightHip.rotation.x = -legAngle;
            this.leftKnee.rotation.x = legAngle > 0 ? 0.85 : 0.25; this.rightKnee.rotation.x = legAngle < 0 ? 0.85 : 0.25;

            this.leftShoulder.rotation.x = -legAngle * 0.85; this.rightShoulder.rotation.x = legAngle * 0.85 - 0.2;
            this.rightElbow.rotation.x = -0.95;
        }
    }
}
