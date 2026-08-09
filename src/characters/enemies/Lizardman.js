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
                ctx.fillStyle = detailHex; ctx.globalAlpha = 0.15 + Math.random() * 0.35; ctx.fillRect(x, y, grid, grid);
            }
        }
    }
    ctx.globalAlpha = 1.0;
    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter; texture.minFilter = THREE.NearestFilter;
    return texture;
}

const scaleTex = createPixelTexture('#9e3820', '#5e1b0c', 64, 0.45);
const bellyScaleTex = createPixelTexture('#d6905c', '#8a5026', 64, 0.35);
const clothTex = createPixelTexture('#42352b', '#241b15', 64, 0.3);
const metalTex = createPixelTexture('#737780', '#3b3d42', 64, 0.4);
const woodTex = createPixelTexture('#3b2513', '#1e1106', 64, 0.3);
const eyeTex = createPixelTexture('#ff9900', '#ffff00', 32, 0.5);

const scaleMat = new THREE.MeshStandardMaterial({ map: scaleTex, roughness: 0.75, flatShading: true });
const bellyMat = new THREE.MeshStandardMaterial({ map: bellyScaleTex, roughness: 0.8, flatShading: true });
const clothMat = new THREE.MeshStandardMaterial({ map: clothTex, roughness: 0.9, flatShading: true });
const metalMat = new THREE.MeshStandardMaterial({ map: metalTex, roughness: 0.4, metalness: 0.8, flatShading: true });
const woodMat = new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.9, flatShading: true });
const eyeMat = new THREE.MeshBasicMaterial({ map: eyeTex });

function createPivotedStripGeo(width, height, depth) {
    const geo = new THREE.BoxGeometry(width, height, depth); geo.translate(0, -height / 2, 0);
    return geo;
}

export class Lizardman extends Enemy {
    constructor(scene, position) {
        super(scene, position, 40, 2.8);
        this.velocityY = 0;
        this.attackCooldown = 0;
        this.baseHipsY = 1.0;
        this.animatedCloth = [];
        this.tailSegments = [];

        this.hips = new THREE.Group();
        this.hips.position.y = this.baseHipsY;
        this.group.add(this.hips);
        this.group.scale.setScalar(1.5);

        const pelvis = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.22, 0.32), scaleMat);
        pelvis.castShadow = true; this.hips.add(pelvis);

        const belt = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.08, 0.34), clothMat); belt.position.y = 0.08; this.hips.add(belt);

        this.torso = new THREE.Group();
        this.torso.position.y = 0.12;
        this.hips.add(this.torso);

        const chest = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.52, 0.35), scaleMat);
        chest.position.y = 0.25; chest.castShadow = true; this.torso.add(chest);

        const belly = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.42, 0.06), bellyMat);
        belly.position.set(0, 0.22, 0.16); this.torso.add(belly);

        // Loincloth
        const loinclothGroup = new THREE.Group(); loinclothGroup.position.set(0, -0.08, 0); this.hips.add(loinclothGroup);
        const stripCount = 8;
        for (let i = 0; i < stripCount; i++) {
            const angle = (i / stripCount) * Math.PI * 2;
            const x = Math.sin(angle) * 0.22; const z = Math.cos(angle) * 0.18;
            const stripGeo = createPivotedStripGeo(0.08 + Math.random() * 0.04, 0.3 + Math.random() * 0.2, 0.03);
            const stripMesh = new THREE.Mesh(stripGeo, clothMat);
            stripMesh.position.set(x, 0, z);
            const baseRx = 0.15 + Math.random() * 0.1; const baseRy = angle; const baseRz = (Math.random() - 0.5) * 0.1;
            stripMesh.rotation.set(baseRx, baseRy, baseRz); stripMesh.castShadow = true;
            loinclothGroup.add(stripMesh);
            this.animatedCloth.push({ mesh: stripMesh, baseRx: baseRx, baseRz: baseRz, offset: i * 0.35 });
        }

        // Tail
        let parentJoint = this.hips;
        for (let i = 0; i < 5; i++) {
            const joint = new THREE.Group();
            if (i === 0) { joint.position.set(0, -0.1, -0.15); joint.rotation.x = -0.6; }
            else { joint.position.set(0, 0, -0.2); }

            const radiusTop = 0.1 - i * 0.015; const radiusBot = 0.08 - i * 0.015;
            const segGeo = new THREE.CylinderGeometry(radiusTop, radiusBot, 0.22, 6);
            segGeo.rotateX(Math.PI / 2); segGeo.translate(0, 0, -0.11);
            const segMesh = new THREE.Mesh(segGeo, scaleMat); segMesh.castShadow = true; joint.add(segMesh);

            const spine = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.08, 4), scaleMat);
            spine.position.set(0, radiusTop + 0.03, -0.11); spine.rotation.x = -0.3; joint.add(spine);

            parentJoint.add(joint); parentJoint = joint;
            this.tailSegments.push({ group: joint, baseRx: i === 0 ? -0.6 : 0.12, baseRy: 0, index: i });
        }

        // Head
        this.neck = new THREE.Group(); this.neck.position.set(0, 0.45, 0.08); this.torso.add(this.neck);
        this.headGroup = new THREE.Group(); this.headGroup.position.set(0, 0.08, 0.08); this.neck.add(this.headGroup);
        const headMesh = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.32, 0.4), scaleMat); headMesh.castShadow = true; this.headGroup.add(headMesh);

        const snout = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.32), scaleMat);
        snout.position.set(0, -0.04, 0.3); snout.castShadow = true; this.headGroup.add(snout);

        const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.1, 0.28), scaleMat);
        jaw.position.set(0, -0.16, 0.28); jaw.castShadow = true; this.headGroup.add(jaw);

        const leftEye = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.08, 0.04), eyeMat); leftEye.position.set(-0.18, 0.08, 0.15); this.headGroup.add(leftEye);
        const rightEye = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.08, 0.04), eyeMat); rightEye.position.set(0.18, 0.08, 0.15); this.headGroup.add(rightEye);

        this.leftHornGroup = new THREE.Group(); this.leftHornGroup.position.set(-0.15, 0.2, -0.12); this.headGroup.add(this.leftHornGroup);
        const leftHorn = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.4, 5), clothMat); leftHorn.rotation.set(-0.8, -0.2, -0.3); this.leftHornGroup.add(leftHorn);

        this.rightHornGroup = new THREE.Group(); this.rightHornGroup.position.set(0.15, 0.2, -0.12); this.headGroup.add(this.rightHornGroup);
        const rightHorn = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.4, 5), clothMat); rightHorn.rotation.set(-0.8, 0.2, 0.3); this.rightHornGroup.add(rightHorn);

        // Arms
        this.leftShoulder = new THREE.Group(); this.leftShoulder.position.set(-0.3, 0.35, 0); this.torso.add(this.leftShoulder);
        const leftArm = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.32, 6), scaleMat); leftArm.position.y = -0.14; this.leftShoulder.add(leftArm);
        this.leftElbow = new THREE.Group(); this.leftElbow.position.y = -0.28; this.leftShoulder.add(this.leftElbow);
        const leftForearm = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.32, 6), scaleMat); leftForearm.position.y = -0.14; this.leftElbow.add(leftForearm);

        this.rightShoulder = new THREE.Group(); this.rightShoulder.position.set(0.3, 0.35, 0); this.torso.add(this.rightShoulder);
        const rightArm = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.32, 6), scaleMat); rightArm.position.y = -0.14; this.rightShoulder.add(rightArm);
        this.rightElbow = new THREE.Group(); this.rightElbow.position.y = -0.28; this.rightShoulder.add(this.rightElbow);
        const rightForearm = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.32, 6), scaleMat); rightForearm.position.y = -0.14; this.rightElbow.add(rightForearm);

        // Weapon (Pickaxe)
        const pickaxe = new THREE.Group(); pickaxe.position.y = -0.3; this.rightElbow.add(pickaxe);
        const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.85, 6), woodMat); hilt.rotation.x = Math.PI/2; pickaxe.add(hilt);
        const pickHead = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.12), metalMat); pickHead.position.z = 0.32; pickaxe.add(pickHead);
        const pickSpikeFront = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.45, 4), metalMat); pickSpikeFront.position.set(0, 0.2, 0.32); pickSpikeFront.rotation.set(-0.2, 0, 0); pickaxe.add(pickSpikeFront);
        const pickSpikeBack = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.45, 4), metalMat); pickSpikeBack.position.set(0, -0.2, 0.32); pickSpikeBack.rotation.set(Math.PI+0.2, 0, 0); pickaxe.add(pickSpikeBack);

        // Legs
        this.leftHip = new THREE.Group(); this.leftHip.position.set(-0.15, -0.05, 0); this.hips.add(this.leftHip);
        const leftThigh = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.06, 0.35, 6), scaleMat); leftThigh.position.y = -0.15; this.leftHip.add(leftThigh);
        this.leftKnee = new THREE.Group(); this.leftKnee.position.y = -0.32; this.leftHip.add(this.leftKnee);
        const leftShin = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.06, 0.35, 6), scaleMat); leftShin.position.y = -0.15; this.leftKnee.add(leftShin);
        const leftFoot = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.06, 0.28), scaleMat); leftFoot.position.set(0, -0.34, 0.08); this.leftKnee.add(leftFoot);

        this.rightHip = new THREE.Group(); this.rightHip.position.set(0.15, -0.05, 0); this.hips.add(this.rightHip);
        const rightThigh = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.06, 0.35, 6), scaleMat); rightThigh.position.y = -0.15; this.rightHip.add(rightThigh);
        this.rightKnee = new THREE.Group(); this.rightKnee.position.y = -0.32; this.rightHip.add(this.rightKnee);
        const rightShin = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.06, 0.35, 6), scaleMat); rightShin.position.y = -0.15; this.rightKnee.add(rightShin);
        const rightFoot = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.06, 0.28), scaleMat); rightFoot.position.set(0, -0.34, 0.08); this.rightKnee.add(rightFoot);
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
            if (dist > 1.4) {
                dir.normalize();
                let nextX = this.group.position.x + dir.x * this.speed * delta;
                let nextZ = this.group.position.z + dir.z * this.speed * delta;
                const pRad = 0.5;
                if (checkCollisionFunc) {
                    if (checkCollisionFunc(new THREE.Vector3(nextX, this.group.position.y, this.group.position.z), pRad)) nextX = this.group.position.x;
                    if (checkCollisionFunc(new THREE.Vector3(this.group.position.x, this.group.position.y, nextZ), pRad)) nextZ = this.group.position.z;
                }
                this.group.position.x = nextX; this.group.position.z = nextZ;
                this.group.rotation.y = Math.atan2(dir.x, dir.z);
                isMoving = true;
            }
            if (dist < 2.2 && this.attackCooldown <= 0) {
                if (playerContext && typeof playerContext.takeDamage === 'function') playerContext.takeDamage(15);
                this.attackCooldown = 1.2;
                this.rightShoulder.rotation.x = -1.8;
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
            const wind = Math.sin(this.animTime * 4 + cloth.offset) * 0.06;
            cloth.mesh.rotation.x += (cloth.baseRx + wind - cloth.mesh.rotation.x) * 14 * delta;
            cloth.mesh.rotation.z += (cloth.baseRz + Math.cos(this.animTime * 3 + cloth.offset) * 0.03 - cloth.mesh.rotation.z) * 14 * delta;
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
            this.headGroup.rotation.x = THREE.MathUtils.lerp(this.headGroup.rotation.x, -0.2, lerpSpeed);

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
            this.headGroup.rotation.x = THREE.MathUtils.lerp(this.headGroup.rotation.x, -0.35, lerpSpeed);

            const legAngle = Math.sin(this.animTime * 15) * 0.8;
            this.leftHip.rotation.x = legAngle; this.rightHip.rotation.x = -legAngle;
            this.leftKnee.rotation.x = legAngle > 0 ? 0.85 : 0.25; this.rightKnee.rotation.x = legAngle < 0 ? 0.85 : 0.25;

            this.leftShoulder.rotation.x = -legAngle * 0.85; this.rightShoulder.rotation.x = legAngle * 0.85 - 0.2;
            this.rightElbow.rotation.x = -0.95;
        }
    }
}
