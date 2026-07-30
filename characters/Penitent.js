import * as THREE from 'three';

// Procedural texture generators
function createBumpTexture(type, size = 256) {
    const canvas = document.createElement('canvas'); canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d'); const imgData = ctx.createImageData(size, size);
    for (let i = 0; i < imgData.data.length; i += 4) {
        let val = 128;
        if (type === 'leather') val += (Math.random() * 80) - 40;
        else if (type === 'hair') { val += (Math.sin(Math.floor((i / 4) / size) * 0.5) * 40) + (Math.random() * 30) - 15; }
        else if (type === 'cloth') { val += (Math.sin((i / 4) % size) * 20) + (Math.cos(Math.floor((i / 4) / size)) * 20); }
        imgData.data[i] = imgData.data[i+1] = imgData.data[i+2] = val; imgData.data[i+3] = 255;
    }
    ctx.putImageData(imgData, 0, 0); const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.RepeatWrapping; return tex;
}

const texLeatherBump = createBumpTexture('leather');
const texHairBump = createBumpTexture('hair', 128);
const texClothBump = createBumpTexture('cloth', 128);

// Materials
const charBaseParams = { flatShading: true, roughness: 0.8, metalness: 0.1 };
const matSkin = new THREE.MeshStandardMaterial({ color: 0xffccaa, ...charBaseParams });
const matSkinDark = new THREE.MeshStandardMaterial({ color: 0xe0a080, ...charBaseParams });
const matHair = new THREE.MeshStandardMaterial({ color: 0x4a2a18, ...charBaseParams, bumpMap: texHairBump, bumpScale: 0.08 });
const matArmor = new THREE.MeshStandardMaterial({ color: 0x5a3a29, ...charBaseParams, bumpMap: texLeatherBump, bumpScale: 0.1 });
const matLeatherDark = new THREE.MeshStandardMaterial({ color: 0x332015, ...charBaseParams, bumpMap: texLeatherBump, bumpScale: 0.1 });
const matShirt = new THREE.MeshStandardMaterial({ color: 0x18181a, ...charBaseParams, bumpMap: texClothBump, bumpScale: 0.05 });
const matGreen = new THREE.MeshStandardMaterial({ color: 0x226622, ...charBaseParams, bumpMap: texClothBump, bumpScale: 0.05 });
const matGold = new THREE.MeshStandardMaterial({ color: 0xffaa00, metalness: 0.7, roughness: 0.3, flatShading: true });
const matEyeWhite = new THREE.MeshStandardMaterial({ color: 0xffffff, ...charBaseParams });
const matEyeIris = new THREE.MeshStandardMaterial({ color: 0x0a9922, ...charBaseParams });
const matEyePupil = new THREE.MeshStandardMaterial({ color: 0x000000, ...charBaseParams });
const matEyeShine = new THREE.MeshBasicMaterial({ color: 0xffffff });
const matMouth = new THREE.MeshStandardMaterial({ color: 0x2a1005, ...charBaseParams });
const matSteel = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 0.8, roughness: 0.3, flatShading: true });

function createPart(geo, mat, x, y, z, rx=0, ry=0, rz=0, parent) {
    const mesh = new THREE.Mesh(geo, mat); mesh.position.set(x, y, z); mesh.rotation.set(rx, ry, rz);
    mesh.castShadow = true; mesh.receiveShadow = true; if(parent) parent.add(mesh); return mesh;
}

export class Penitent {
    constructor(scene) {
        this.playerGroup = new THREE.Group();
        this.playerGroup.position.set(0, 4.0, 5.0);
        scene.add(this.playerGroup);

        this.bodyGroup = new THREE.Group();
        this.playerGroup.add(this.bodyGroup);

        // State
        this.animTime = 0;
        this.isGrounded = false;
        this.velocityY = 0;
        this.keys = { w: false, a: false, s: false, d: false, shift: false, ' ': false };
        this.speed = 8.0;

        // Parts references for animation
        this.parts = {};

        this.buildRig();
        this.setupControls();
    }

    buildRig() {
        // TORSO BASE
        this.parts.torso = createPart(new THREE.CylinderGeometry(0.75, 0.8, 1.6, 10), matShirt, 0, 2.5, 0, 0, 0, 0, this.bodyGroup);
        this.parts.torso.scale.set(1.2, 1, 0.95);

        this.parts.slotHead = new THREE.Group();
        this.parts.slotArmor = new THREE.Group(); this.parts.torso.add(this.parts.slotArmor);
        this.parts.slotWeapon = new THREE.Group();
        this.parts.slotShield = new THREE.Group();

        // ARMADURA 1: Couro
        this.parts.armorLeatherGroup = new THREE.Group();
        createPart(new THREE.CylinderGeometry(0.82, 0.85, 1.55, 10, 1, false, Math.PI * 0.15, Math.PI * 1.7), matArmor, 0, 0, 0, 0, 0, 0, this.parts.armorLeatherGroup);
        createPart(new THREE.BoxGeometry(0.6, 0.2, 0.8), matArmor, -0.4, 0.75, 0, 0, 0, -0.2, this.parts.armorLeatherGroup);
        createPart(new THREE.BoxGeometry(0.6, 0.2, 0.8), matArmor, 0.4, 0.75, 0, 0, 0, 0.2, this.parts.armorLeatherGroup);
        const coatGroup = new THREE.Group(); coatGroup.position.set(0, -0.85, 0); this.parts.armorLeatherGroup.add(coatGroup);
        this.animatedCoat = [];
        const flapGeo = new THREE.BoxGeometry(0.45, 1.4, 0.08); flapGeo.translate(0, -0.7, 0);
        for (let i = 0; i < 12; i++) {
            const angle = (i / 12) * Math.PI * 2; const x = Math.sin(angle) * 0.88; const z = Math.cos(angle) * 0.88;
            if (z > 0.4 && Math.abs(x) < 0.6) continue;
            const flap = createPart(flapGeo, matLeatherDark, x, 0, z, 0.1, angle, 0, coatGroup);
            this.animatedCoat.push({ mesh: flap, baseRx: 0.1, baseRy: angle, offset: i * 0.2 });
        }

        this.parts.slotArmor.add(this.parts.armorLeatherGroup);

        // CINTO FIXO
        const belt = createPart(new THREE.CylinderGeometry(0.92, 0.92, 0.3, 12), matLeatherDark, 0, -0.7, 0, 0, 0, 0, this.parts.torso);
        createPart(new THREE.BoxGeometry(0.5, 0.4, 0.2), matGold, 0, 0, 0.9, 0, 0, 0, belt);
        createPart(new THREE.BoxGeometry(0.25, 0.25, 0.25), matEyeIris, 0, 0, 0.95, 0, 0, 0, belt);
        const pouchPivot = new THREE.Group(); pouchPivot.position.set(-0.75, -0.1, 0.6); pouchPivot.rotation.z = 0.2; belt.add(pouchPivot);
        createPart(new THREE.IcosahedronGeometry(0.35, 1), matGreen, 0, -0.3, 0, 0, 0, 0, pouchPivot);
        const lanternPivot = new THREE.Group(); lanternPivot.position.set(0.75, -0.2, 0.5); belt.add(lanternPivot);
        createPart(new THREE.CylinderGeometry(0.12, 0.12, 0.05, 6), matSteel, 0, 0.2, 0, 0, 0, 0, lanternPivot);
        createPart(new THREE.CylinderGeometry(0.1, 0.1, 0.05, 6), matSteel, 0, -0.2, 0, 0, 0, 0, lanternPivot);
        const matFire = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
        createPart(new THREE.CylinderGeometry(0.08, 0.08, 0.35, 6), matFire, 0, 0, 0, 0, 0, 0, lanternPivot);
        this.lanternLight = new THREE.PointLight(0xffaa00, 2, 12); this.lanternLight.position.set(0, 0, 0); lanternPivot.add(this.lanternLight);

        // CABEÇA
        this.parts.headPivot = new THREE.Group(); this.parts.headPivot.position.set(0, 3.5, 0); this.bodyGroup.add(this.parts.headPivot);
        const head = createPart(new THREE.IcosahedronGeometry(0.9, 2), matSkin, 0, 0.5, 0, 0, 0, 0, this.parts.headPivot);
        head.scale.set(1.15, 1.2, 1.15);
        createPart(new THREE.SphereGeometry(0.2, 8, 8), matSkin, -1.0, 0.3, 0, 0, 0, 0, this.parts.headPivot);
        createPart(new THREE.SphereGeometry(0.2, 8, 8), matSkin, 1.0, 0.3, 0, 0, 0, 0, this.parts.headPivot);
        createPart(new THREE.IcosahedronGeometry(0.12, 1), matSkinDark, 0, 0.15, 1.02, 0, 0, 0, this.parts.headPivot).scale.set(1, 0.8, 1);
        this.parts.mouth = createPart(new THREE.BoxGeometry(0.25, 0.04, 0.1), matMouth, 0, 0.0, 0.95, 0, 0, 0.05, this.parts.headPivot);

        // Olhos
        this.parts.eyeL = new THREE.Group(); this.parts.eyeL.position.set(-0.35, 0.35, 0.92); this.parts.headPivot.add(this.parts.eyeL);
        this.parts.eyeR = new THREE.Group(); this.parts.eyeR.position.set(0.35, 0.35, 0.92); this.parts.headPivot.add(this.parts.eyeR);
        const buildEye = (parent) => {
            createPart(new THREE.BoxGeometry(0.3, 0.38, 0.1), matEyeWhite, 0, 0, 0, 0, 0, 0, parent);
            createPart(new THREE.BoxGeometry(0.2, 0.28, 0.12), matEyeIris, 0, 0, 0, 0, 0, 0, parent);
            createPart(new THREE.BoxGeometry(0.12, 0.18, 0.14), matEyePupil, 0, 0, 0, 0, 0, 0, parent);
            createPart(new THREE.BoxGeometry(0.04, 0.04, 0.16), matEyeShine, 0.04, 0.06, 0, 0, 0, 0, parent);
        };
        buildEye(this.parts.eyeL); buildEye(this.parts.eyeR);

        this.parts.browL = createPart(new THREE.BoxGeometry(0.35, 0.12, 0.25), matHair, -0.32, 0.62, 1.05, 0.1, 0, -0.25, this.parts.headPivot);
        this.parts.browR = createPart(new THREE.BoxGeometry(0.35, 0.12, 0.25), matHair, 0.32, 0.62, 1.05, 0.1, 0, 0.25, this.parts.headPivot);

        this.parts.headPivot.add(this.parts.slotHead);

        // CABELO
        const hairGroup = new THREE.Group(); hairGroup.position.set(0, 0.6, 0);
        this.animatedHair = [];
        createPart(new THREE.SphereGeometry(1.0, 16, 16, 0, Math.PI*2, 0, Math.PI/1.5), matHair, 0, 0.1, -0.1, 0, 0, 0, hairGroup).scale.set(1.1, 1.05, 1.1);
        const lockGeo = new THREE.ConeGeometry(0.25, 1.4, 4); lockGeo.translate(0, 0.7, 0);
        for (let i = 0; i < 95; i++) {
            const angle = Math.random() * Math.PI * 2; const radius = Math.sqrt(Math.random()) * 1.05;
            const x = Math.sin(angle) * radius; const z = Math.cos(angle) * radius;
            let y = 0.2 + Math.sqrt(Math.max(0, 1.1 - radius*radius)) * 0.75;
            let rx = 0; let rz = 0; let isBangs = false; let size = 0.6 + Math.random() * 0.6;
            if (z > 0.4 && y < 0.8) { isBangs = true; rx = 1.7 + (Math.random() - 0.5) * 0.4; rz = (x * -0.5); size *= 0.9; }
            else if (z < -0.3) { rx = -1.0 + (Math.random() - 0.5) * 0.5; rz = (x * -0.5); size *= 0.8; }
            else if (radius > 0.7) { rx = (z * -0.5) + (Math.random() - 0.5) * 0.3; rz = (x < 0 ? 1.2 : -1.2) + (Math.random() - 0.5) * 0.3; }
            else { rx = (Math.random() - 0.5) * 0.6; rz = (Math.random() - 0.5) * 0.6; size *= 1.3; }
            if (z > 0.8 && Math.abs(x) < 0.4 && y < 0.5) continue;
            const mesh = createPart(lockGeo, matHair, x, y, z, rx, 0, rz, hairGroup); mesh.scale.set(size, size, size);
            this.animatedHair.push({ mesh, baseRx: rx, baseRz: rz, offset: i * 0.1, reactionStrength: isBangs ? 1.5 : (0.8 + (i % 5) * 0.2), isBangs: isBangs });
        }
        this.parts.slotHead.add(hairGroup);

        // BRAÇOS E PERNAS
        this.parts.shoulderL = new THREE.Group(); this.parts.shoulderL.position.set(-1.35, 3.0, 0); this.bodyGroup.add(this.parts.shoulderL);
        this.parts.shoulderR = new THREE.Group(); this.parts.shoulderR.position.set(1.35, 3.0, 0); this.bodyGroup.add(this.parts.shoulderR);
        this.parts.elbowL = new THREE.Group(); this.parts.elbowL.position.set(0, -0.7, 0); this.parts.shoulderL.add(this.parts.elbowL);
        this.parts.elbowR = new THREE.Group(); this.parts.elbowR.position.set(0, -0.7, 0); this.parts.shoulderR.add(this.parts.elbowR);

        createPart(new THREE.SphereGeometry(0.45, 10, 10, 0, Math.PI * 2, 0, Math.PI/2), matArmor, 0, 0.1, 0, 0, 0, 0, this.parts.shoulderL);
        createPart(new THREE.SphereGeometry(0.45, 10, 10, 0, Math.PI * 2, 0, Math.PI/2), matArmor, 0, 0.1, 0, 0, 0, 0, this.parts.shoulderR);
        createPart(new THREE.CylinderGeometry(0.28, 0.25, 0.8, 8), matShirt, 0, -0.3, 0, 0, 0, 0, this.parts.shoulderL);
        createPart(new THREE.CylinderGeometry(0.28, 0.25, 0.8, 8), matShirt, 0, -0.3, 0, 0, 0, 0, this.parts.shoulderR);
        createPart(new THREE.CylinderGeometry(0.28, 0.24, 0.7, 8), matLeatherDark, 0, -0.3, 0, 0, 0, 0, this.parts.elbowL);
        createPart(new THREE.CylinderGeometry(0.28, 0.24, 0.7, 8), matLeatherDark, 0, -0.3, 0, 0, 0, 0, this.parts.elbowR);

        const handL = createPart(new THREE.IcosahedronGeometry(0.3, 1), matSkin, 0, -0.75, 0, 0, 0, 0, this.parts.elbowL);
        const handR = createPart(new THREE.IcosahedronGeometry(0.3, 1), matSkin, 0, -0.75, 0, 0, 0, 0, this.parts.elbowR);

        handR.add(this.parts.slotWeapon);
        handL.add(this.parts.slotShield);

        // ESPADA
        const swordGroup = new THREE.Group(); swordGroup.position.set(0, -0.1, 0.2); swordGroup.rotation.x = Math.PI / 2;
        createPart(new THREE.CylinderGeometry(0.06, 0.06, 0.6, 6), matLeatherDark, 0, -0.2, 0, 0, 0, 0, swordGroup);
        createPart(new THREE.BoxGeometry(0.5, 0.1, 0.15), matGold, 0, 0.1, 0, 0, 0, 0, swordGroup);
        createPart(new THREE.BoxGeometry(0.15, 1.4, 0.05), matSteel, 0, 0.85, 0, 0, 0, 0, swordGroup);
        this.parts.slotWeapon.add(swordGroup);

        // ESCUDO
        const shieldGroup = new THREE.Group(); shieldGroup.position.set(-0.2, -0.1, 0.3); shieldGroup.rotation.y = -Math.PI / 2;
        createPart(new THREE.CylinderGeometry(0.55, 0.55, 0.1, 14), matLeatherDark, 0, 0, 0, Math.PI/2, 0, 0, shieldGroup);
        createPart(new THREE.TorusGeometry(0.55, 0.05, 8, 16), matSteel, 0, 0, 0, 0, 0, 0, shieldGroup);
        this.parts.slotShield.add(shieldGroup);

        // PERNAS
        this.parts.hipL = new THREE.Group(); this.parts.hipL.position.set(-0.6, 1.6, 0); this.bodyGroup.add(this.parts.hipL);
        this.parts.hipR = new THREE.Group(); this.parts.hipR.position.set(0.6, 1.6, 0); this.bodyGroup.add(this.parts.hipR);
        this.parts.kneeL = new THREE.Group(); this.parts.kneeL.position.set(0, -0.7, 0); this.parts.hipL.add(this.parts.kneeL);
        this.parts.kneeR = new THREE.Group(); this.parts.kneeR.position.set(0, -0.7, 0); this.parts.hipR.add(this.parts.kneeR);
        createPart(new THREE.CylinderGeometry(0.35, 0.3, 0.8, 8), matShirt, 0, -0.3, 0, 0, 0, 0, this.parts.hipL);
        createPart(new THREE.CylinderGeometry(0.35, 0.3, 0.8, 8), matShirt, 0, -0.3, 0, 0, 0, 0, this.parts.hipR);
        createPart(new THREE.CylinderGeometry(0.3, 0.25, 0.7, 8), matShirt, 0, -0.3, 0, 0, 0, 0, this.parts.kneeL);
        createPart(new THREE.CylinderGeometry(0.3, 0.25, 0.7, 8), matShirt, 0, -0.3, 0, 0, 0, 0, this.parts.kneeR);
        createPart(new THREE.BoxGeometry(0.6, 0.4, 0.8), matLeatherDark, 0, -0.7, 0.15, 0, 0, 0, this.parts.kneeL);
        createPart(new THREE.BoxGeometry(0.6, 0.4, 0.8), matLeatherDark, 0, -0.7, 0.15, 0, 0, 0, this.parts.kneeR);
    }

    setupControls() {
        window.addEventListener('keydown', (e) => {
            const k = e.key.toLowerCase();
            if(this.keys.hasOwnProperty(k)) this.keys[k] = true;
            if(e.code === 'Space') this.keys[' '] = true;
        });
        window.addEventListener('keyup', (e) => {
            const k = e.key.toLowerCase();
            if(this.keys.hasOwnProperty(k)) this.keys[k] = false;
            if(e.code === 'Space') this.keys[' '] = false;
        });
    }

    update(delta, camera, getFloorY) {
        this.animTime += delta;

        let moveX = 0, moveZ = 0;
        this.speed = this.keys.shift ? 16.0 : 8.0;

        const camDir = new THREE.Vector3();
        camera.getWorldDirection(camDir);
        camDir.y = 0;
        camDir.normalize();
        const camRight = new THREE.Vector3().crossVectors(camDir, new THREE.Vector3(0,1,0)).normalize();

        if(this.keys.w) { moveX += camDir.x; moveZ += camDir.z; }
        if(this.keys.s) { moveX -= camDir.x; moveZ -= camDir.z; }
        if(this.keys.a) { moveX -= camRight.x; moveZ -= camRight.z; }
        if(this.keys.d) { moveX += camRight.x; moveZ += camRight.z; }

        const moveVec = new THREE.Vector3(moveX, 0, moveZ);
        const isMoving = moveVec.lengthSq() > 0;

        if (isMoving) {
            moveVec.normalize().multiplyScalar(this.speed * delta);
            this.playerGroup.position.x += moveVec.x;
            this.playerGroup.position.z += moveVec.z;

            let targetAngle = Math.atan2(moveVec.x, moveVec.z);
            let diff = targetAngle - this.playerGroup.rotation.y;
            while (diff < -Math.PI) diff += Math.PI * 2;
            while (diff > Math.PI) diff -= Math.PI * 2;
            this.playerGroup.rotation.y += diff * 12 * delta;
        }

        const floorY = getFloorY ? getFloorY(this.playerGroup.position) : 0;

        if (this.keys[' '] && this.isGrounded) {
            this.velocityY = 16.0;
            this.isGrounded = false;
            this.keys[' '] = false;
        }

        if (!this.isGrounded) {
            this.velocityY -= 45.0 * delta;
            this.playerGroup.position.y += this.velocityY * delta;

            if (this.velocityY <= 0 && this.playerGroup.position.y <= floorY) {
                this.playerGroup.position.y = floorY;
                this.isGrounded = true;
                this.velocityY = 0;
            }
        } else {
            if (this.playerGroup.position.y > floorY + 0.4) {
                this.isGrounded = false;
            } else {
                this.playerGroup.position.y += (floorY - this.playerGroup.position.y) * 15 * delta;
            }
        }

        if (this.playerGroup.position.y < -40) {
            this.playerGroup.position.set(0, 10, 5); this.velocityY = 0;
        }

        // Reset parts rotations
        this.parts.headPivot.rotation.set(0, 0, 0);
        this.parts.torso.rotation.set(0, 0, 0);
        this.bodyGroup.position.set(0, 0, 0);
        this.parts.torso.scale.set(1.2, 1, 0.95);

        if (!this.isGrounded) {
            this.bodyGroup.position.y = 0.2;
            this.parts.shoulderL.rotation.set(0, 0, 0.5); this.parts.shoulderR.rotation.set(0, 0, -0.5);
            this.parts.hipL.rotation.set(-0.2, 0, 0); this.parts.hipR.rotation.set(-0.2, 0, 0);
            this.parts.kneeL.rotation.set(0.2, 0, 0); this.parts.kneeR.rotation.set(0.2, 0, 0);
        } else if (!isMoving) {
            this.bodyGroup.position.y = Math.sin(this.animTime * 2) * 0.05;
            this.parts.shoulderL.rotation.set(0.1, 0, -0.2); this.parts.shoulderR.rotation.set(0.1, 0, 0.2);
            this.parts.elbowR.rotation.set(-0.2, 0, 0); this.parts.elbowL.rotation.set(-0.2, 0, 0);
            this.parts.hipL.rotation.set(0, 0, 0); this.parts.hipR.rotation.set(0, 0, 0);
            this.parts.kneeL.rotation.set(0, 0, 0); this.parts.kneeR.rotation.set(0, 0, 0);
        } else {
            const speedMult = this.keys.shift ? 22 : 14;
            const moveSin = Math.sin(this.animTime * speedMult);
            this.bodyGroup.position.y = Math.abs(moveSin) * 0.35;
            this.bodyGroup.rotation.x = 0.2;
            this.parts.shoulderL.rotation.set(-moveSin * 1.2, 0, -0.2);
            this.parts.shoulderR.rotation.set(moveSin * 1.2, 0, 0.2);
            this.parts.hipL.rotation.set(moveSin * 1.0, 0, 0);
            this.parts.hipR.rotation.set(-moveSin * 1.0, 0, 0);
            this.parts.kneeL.rotation.set(moveSin > 0 ? moveSin * 0.8 : 0, 0, 0);
            this.parts.kneeR.rotation.set(moveSin < 0 ? -moveSin * 0.8 : 0, 0, 0);
        }

        const windDrag = isMoving ? (this.speed > 10 ? -0.7 : -0.3) : 0;
        const runBounce = isMoving ? Math.abs(Math.sin(this.animTime * (this.keys.shift ? 22 : 12))) * 0.35 : 0;
        const jumpDrag = !this.isGrounded ? (this.velocityY > 0 ? 0.8 : -0.8) : 0;

        this.animatedHair.forEach(hair => {
            const wind = Math.sin(this.animTime * 3 + hair.offset) * 0.05;
            let targetRx = hair.baseRx + wind - windDrag * hair.reactionStrength * 0.15 - runBounce * hair.reactionStrength + jumpDrag;
            hair.mesh.rotation.x += (targetRx - hair.mesh.rotation.x) * 18 * delta;
        });

        this.animatedCoat.forEach(flap => {
            const wind = Math.sin(this.animTime * 4 + flap.offset) * 0.05;
            let targetRx = flap.baseRx + wind - windDrag * 1.8 + runBounce * 0.6 + jumpDrag * 1.5;
            flap.mesh.rotation.x += (targetRx - flap.mesh.rotation.x) * 12 * delta;
        });

        if (this.lanternLight) this.lanternLight.intensity = 1.2 + Math.random() * 0.8;
    }
}
