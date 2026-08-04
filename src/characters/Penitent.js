import * as THREE from 'three';
import { ObjectPool } from '../core/ObjectPoolManager.js';

export class Penitent {
    constructor(scene) {
        this.scene = scene;
        this.group = new THREE.Group();
        this.modelGroup = new THREE.Group();
        this.group.add(this.modelGroup);
        this.scene.add(this.group);

        this.setupMaterials();
        this.buildModel();

        this.isGrounded = true;
        this.keys = { w: false, a: false, s: false, d: false, shift: false, space: false };
        this.velocityX = 0;
        this.velocityZ = 0;
        this.velocityY = 0;
        this.lastSafePos = new THREE.Vector3(0, 5, 0);
        this.isResetting = false;

        // Physics constants
        this.acceleration = 224.0; // Increased to allow reaching higher terminal velocities against friction
        this.friction = 12.0; // Damping
        this.maxSpeed = 10.0;
        this.maxRunSpeed = 20.0;
        this.animTime = 0;
        this.prevPosY = 0;
        this.smoothedDeltaY = 0;
        this.isAttacking = false;
        this.attackTimer = 0;
        this.ATTACK_DURATION = 0.4;
        this.isDefending = false;
        this.isSwimming = false;
        this.actionState = 'none';
        this.hasHit = false;
        this.wasDefending = false;
        this.wasGrounded = true;
        this.prevVelocityY = 0;
        this.blinkTimer = 2.0;
        this.isBlinking = false;
        this.blinkDuration = 0;

        this.currHead = 0;
        this.currArmor = 0;
        this.currWeapon = 0;

        this.updateGear();
        this.initInput();
    }

    createBumpTexture(type, size = 256) {
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

    setupMaterials() {
        this.texLeatherBump = this.createBumpTexture('leather');
        this.texHairBump = this.createBumpTexture('hair', 128);
        this.texClothBump = this.createBumpTexture('cloth', 128);

        const baseParams = { flatShading: true, roughness: 0.8, metalness: 0.1 };
        this.matSkin = new THREE.MeshStandardMaterial({ color: 0xffccaa, ...baseParams });
        this.matSkinDark = new THREE.MeshStandardMaterial({ color: 0xe0a080, ...baseParams });
        this.matHair = new THREE.MeshStandardMaterial({ color: 0x4a2a18, ...baseParams, bumpMap: this.texHairBump, bumpScale: 0.08 });
        this.matArmor = new THREE.MeshStandardMaterial({ color: 0x5a3a29, ...baseParams, bumpMap: this.texLeatherBump, bumpScale: 0.1 });
        this.matLeatherDark = new THREE.MeshStandardMaterial({ color: 0x332015, ...baseParams, bumpMap: this.texLeatherBump, bumpScale: 0.1 });
        this.matShirt = new THREE.MeshStandardMaterial({ color: 0x18181a, ...baseParams, bumpMap: this.texClothBump, bumpScale: 0.05 });
        this.matGreen = new THREE.MeshStandardMaterial({ color: 0x226622, ...baseParams, bumpMap: this.texClothBump, bumpScale: 0.05 });
        this.matGold = new THREE.MeshStandardMaterial({ color: 0xffaa00, metalness: 0.7, roughness: 0.3, flatShading: true });
        this.matEyeWhite = new THREE.MeshStandardMaterial({ color: 0xffffff, ...baseParams });
        this.matEyeIris = new THREE.MeshStandardMaterial({ color: 0x0a9922, ...baseParams });
        this.matEyePupil = new THREE.MeshStandardMaterial({ color: 0x000000, ...baseParams });
        this.matEyeShine = new THREE.MeshBasicMaterial({ color: 0xffffff });
        this.matMouth = new THREE.MeshStandardMaterial({ color: 0x2a1005, ...baseParams });
        this.matSteel = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 0.8, roughness: 0.3, flatShading: true });
        this.matFire = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
        this.matVisor = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
        this.matSlash = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 });
        this.matDust = new THREE.MeshBasicMaterial({ color: 0x887766, transparent: true, opacity: 0.6 });

        this.particleGeo = new THREE.BoxGeometry(0.15, 0.15, 0.15);
    }

    createPart(geo, mat, x, y, z, rx=0, ry=0, rz=0, parent) {
        const mesh = new THREE.Mesh(geo, mat); mesh.position.set(x, y, z); mesh.rotation.set(rx, ry, rz);
        mesh.castShadow = true; mesh.receiveShadow = true; if(parent) parent.add(mesh); return mesh;
    }

    buildModel() {
        this.penitente = this.modelGroup;
        this.bodyGroup = new THREE.Group(); this.penitente.add(this.bodyGroup);

        this.torso = this.createPart(new THREE.CylinderGeometry(0.75, 0.8, 1.6, 10), this.matShirt, 0, 2.5, 0, 0, 0, 0, this.bodyGroup);
        this.torso.scale.set(1.2, 1, 0.95);

        this.slotHead = new THREE.Group();
        this.slotArmor = new THREE.Group(); this.torso.add(this.slotArmor);
        this.slotWeapon = new THREE.Group();
        this.slotShield = new THREE.Group();

        // ARMADURA 1
        this.armorLeatherGroup = new THREE.Group();
        this.createPart(new THREE.CylinderGeometry(0.82, 0.85, 1.55, 10, 1, false, Math.PI * 0.15, Math.PI * 1.7), this.matArmor, 0, 0, 0, 0, 0, 0, this.armorLeatherGroup);
        this.createPart(new THREE.BoxGeometry(0.6, 0.2, 0.8), this.matArmor, -0.4, 0.75, 0, 0, 0, -0.2, this.armorLeatherGroup);
        this.createPart(new THREE.BoxGeometry(0.6, 0.2, 0.8), this.matArmor, 0.4, 0.75, 0, 0, 0, 0.2, this.armorLeatherGroup);
        this.coatGroup = new THREE.Group(); this.coatGroup.position.set(0, -0.85, 0); this.armorLeatherGroup.add(this.coatGroup);
        this.animatedCoat = []; const flapGeo = new THREE.BoxGeometry(0.45, 1.4, 0.08); flapGeo.translate(0, -0.7, 0);
        for (let i = 0; i < 12; i++) {
            const angle = (i / 12) * Math.PI * 2; const x = Math.sin(angle) * 0.88; const z = Math.cos(angle) * 0.88;
            if (z > 0.4 && Math.abs(x) < 0.6) continue;
            const flap = this.createPart(flapGeo, this.matLeatherDark, x, 0, z, 0.1, angle, 0, this.coatGroup);
            this.animatedCoat.push({ mesh: flap, baseRx: 0.1, baseRy: angle, offset: i * 0.2 });
        }

        // ARMADURA 2
        this.armorSteelGroup = new THREE.Group();
        this.createPart(new THREE.CylinderGeometry(0.88, 0.9, 1.6, 8), this.matSteel, 0, 0, 0, 0, 0, 0, this.armorSteelGroup);
        this.createPart(new THREE.BoxGeometry(1.0, 0.3, 1.0), this.matSteel, 0, 0.75, 0, 0, 0, 0, this.armorSteelGroup);
        this.createPart(new THREE.CylinderGeometry(0.95, 0.95, 0.4, 12), this.matLeatherDark, 0, -0.6, 0, 0, 0, 0, this.armorSteelGroup);

        // CINTO FIXO
        this.belt = this.createPart(new THREE.CylinderGeometry(0.92, 0.92, 0.3, 12), this.matLeatherDark, 0, -0.7, 0, 0, 0, 0, this.torso);
        this.createPart(new THREE.BoxGeometry(0.5, 0.4, 0.2), this.matGold, 0, 0, 0.9, 0, 0, 0, this.belt);
        this.createPart(new THREE.BoxGeometry(0.25, 0.25, 0.25), this.matEyeIris, 0, 0, 0.95, 0, 0, 0, this.belt);
        this.pouchPivot = new THREE.Group(); this.pouchPivot.position.set(-0.75, -0.1, 0.6); this.pouchPivot.rotation.z = 0.2; this.belt.add(this.pouchPivot);
        this.createPart(new THREE.IcosahedronGeometry(0.35, 1), this.matGreen, 0, -0.3, 0, 0, 0, 0, this.pouchPivot);
        this.lanternPivot = new THREE.Group(); this.lanternPivot.position.set(0.75, -0.2, 0.5); this.belt.add(this.lanternPivot);
        this.createPart(new THREE.CylinderGeometry(0.12, 0.12, 0.05, 6), this.matSteel, 0, 0.2, 0, 0, 0, 0, this.lanternPivot);
        this.createPart(new THREE.CylinderGeometry(0.1, 0.1, 0.05, 6), this.matSteel, 0, -0.2, 0, 0, 0, 0, this.lanternPivot);
        this.createPart(new THREE.CylinderGeometry(0.08, 0.08, 0.35, 6), this.matFire, 0, 0, 0, 0, 0, 0, this.lanternPivot);
        this.lanternLight = new THREE.PointLight(0xffaa00, 2, 12); this.lanternLight.position.set(0, 0, 0); this.lanternPivot.add(this.lanternLight);
        this.penitente.userData.lanternLight = this.lanternLight;

        // CABEÇA
        this.headPivot = new THREE.Group(); this.headPivot.position.set(0, 3.5, 0); this.bodyGroup.add(this.headPivot);
        this.head = this.createPart(new THREE.IcosahedronGeometry(0.9, 2), this.matSkin, 0, 0.5, 0, 0, 0, 0, this.headPivot);
        this.head.scale.set(1.15, 1.2, 1.15);
        this.createPart(new THREE.SphereGeometry(0.2, 8, 8), this.matSkin, -1.0, 0.3, 0, 0, 0, 0, this.headPivot);
        this.createPart(new THREE.SphereGeometry(0.2, 8, 8), this.matSkin, 1.0, 0.3, 0, 0, 0, 0, this.headPivot);
        this.createPart(new THREE.IcosahedronGeometry(0.12, 1), this.matSkinDark, 0, 0.15, 1.02, 0, 0, 0, this.headPivot).scale.set(1, 0.8, 1);
        this.mouth = this.createPart(new THREE.BoxGeometry(0.25, 0.04, 0.1), this.matMouth, 0, 0.0, 0.95, 0, 0, 0.05, this.headPivot);

        this.eyeL = new THREE.Group(); this.eyeL.position.set(-0.35, 0.35, 0.92); this.headPivot.add(this.eyeL);
        this.eyeR = new THREE.Group(); this.eyeR.position.set(0.35, 0.35, 0.92); this.headPivot.add(this.eyeR);
        const buildEye = (parent) => {
            this.createPart(new THREE.BoxGeometry(0.3, 0.38, 0.1), this.matEyeWhite, 0, 0, 0, 0, 0, 0, parent);
            this.createPart(new THREE.BoxGeometry(0.2, 0.28, 0.12), this.matEyeIris, 0, 0, 0, 0, 0, 0, parent);
            this.createPart(new THREE.BoxGeometry(0.12, 0.18, 0.14), this.matEyePupil, 0, 0, 0, 0, 0, 0, parent);
            this.createPart(new THREE.BoxGeometry(0.04, 0.04, 0.16), this.matEyeShine, 0.04, 0.06, 0, 0, 0, 0, parent);
        };
        buildEye(this.eyeL); buildEye(this.eyeR);

        this.browL = this.createPart(new THREE.BoxGeometry(0.35, 0.12, 0.25), this.matHair, -0.32, 0.62, 1.05, 0.1, 0, -0.25, this.headPivot);
        this.browR = this.createPart(new THREE.BoxGeometry(0.35, 0.12, 0.25), this.matHair, 0.32, 0.62, 1.05, 0.1, 0, 0.25, this.headPivot);

        this.headPivot.add(this.slotHead);

        // CABEÇA 1
        this.hairGroup = new THREE.Group(); this.hairGroup.position.set(0, 0.6, 0);
        this.animatedHair = [];
        this.createPart(new THREE.SphereGeometry(1.0, 16, 16, 0, Math.PI*2, 0, Math.PI/1.5), this.matHair, 0, 0.1, -0.1, 0, 0, 0, this.hairGroup).scale.set(1.1, 1.05, 1.1);
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
            const mesh = this.createPart(lockGeo, this.matHair, x, y, z, rx, 0, rz, this.hairGroup); mesh.scale.set(size, size, size);
            this.animatedHair.push({ mesh, baseRx: rx, baseRz: rz, offset: i * 0.1, reactionStrength: isBangs ? 1.5 : (0.8 + (i % 5) * 0.2), isBangs: isBangs });
        }

        // CABEÇA 2
        this.helmetGroup = new THREE.Group(); this.helmetGroup.position.set(0, 0.2, 0);
        this.createPart(new THREE.CylinderGeometry(1.05, 1.05, 1.4, 16), this.matSteel, 0, 0.3, 0, 0, 0, 0, this.helmetGroup);
        this.createPart(new THREE.SphereGeometry(1.05, 16, 16, 0, Math.PI*2, 0, Math.PI/2), this.matSteel, 0, 1.0, 0, 0, 0, 0, this.helmetGroup);
        this.createPart(new THREE.BoxGeometry(1.2, 0.2, 1.05), this.matVisor, 0, 0.45, 0.15, 0, 0, 0, this.helmetGroup);
        this.createPart(new THREE.ConeGeometry(0.2, 0.8, 6), this.matLeatherDark, -1.0, 0.8, 0, -0.2, 0, 0.6, this.helmetGroup);
        this.createPart(new THREE.ConeGeometry(0.2, 0.8, 6), this.matLeatherDark, 1.0, 0.8, 0, -0.2, 0, -0.6, this.helmetGroup);

        // BRAÇOS E PERNAS
        this.shoulderL = new THREE.Group(); this.shoulderL.position.set(-1.35, 3.0, 0); this.bodyGroup.add(this.shoulderL);
        this.shoulderR = new THREE.Group(); this.shoulderR.position.set(1.35, 3.0, 0); this.bodyGroup.add(this.shoulderR);
        this.elbowL = new THREE.Group(); this.elbowL.position.set(0, -0.7, 0); this.shoulderL.add(this.elbowL);
        this.elbowR = new THREE.Group(); this.elbowR.position.set(0, -0.7, 0); this.shoulderR.add(this.elbowR);

        this.createPart(new THREE.SphereGeometry(0.45, 10, 10, 0, Math.PI * 2, 0, Math.PI/2), this.matArmor, 0, 0.1, 0, 0, 0, 0, this.shoulderL);
        this.createPart(new THREE.SphereGeometry(0.45, 10, 10, 0, Math.PI * 2, 0, Math.PI/2), this.matArmor, 0, 0.1, 0, 0, 0, 0, this.shoulderR);
        this.createPart(new THREE.CylinderGeometry(0.28, 0.25, 0.8, 8), this.matShirt, 0, -0.3, 0, 0, 0, 0, this.shoulderL);
        this.createPart(new THREE.CylinderGeometry(0.28, 0.25, 0.8, 8), this.matShirt, 0, -0.3, 0, 0, 0, 0, this.shoulderR);
        this.createPart(new THREE.CylinderGeometry(0.28, 0.24, 0.7, 8), this.matLeatherDark, 0, -0.3, 0, 0, 0, 0, this.elbowL);
        this.createPart(new THREE.CylinderGeometry(0.28, 0.24, 0.7, 8), this.matLeatherDark, 0, -0.3, 0, 0, 0, 0, this.elbowR);

        this.handL = this.createPart(new THREE.IcosahedronGeometry(0.3, 1), this.matSkin, 0, -0.75, 0, 0, 0, 0, this.elbowL);
        this.handR = this.createPart(new THREE.IcosahedronGeometry(0.3, 1), this.matSkin, 0, -0.75, 0, 0, 0, 0, this.elbowR);

        this.handR.add(this.slotWeapon);
        this.handL.add(this.slotShield);

        // ARMA 1
        this.swordGroup = new THREE.Group(); this.swordGroup.position.set(0, -0.1, 0.2); this.swordGroup.rotation.x = Math.PI / 2;
        this.createPart(new THREE.CylinderGeometry(0.06, 0.06, 0.6, 6), this.matLeatherDark, 0, -0.2, 0, 0, 0, 0, this.swordGroup);
        this.createPart(new THREE.BoxGeometry(0.5, 0.1, 0.15), this.matGold, 0, 0.1, 0, 0, 0, 0, this.swordGroup);
        this.createPart(new THREE.BoxGeometry(0.15, 1.4, 0.05), this.matSteel, 0, 0.85, 0, 0, 0, 0, this.swordGroup);
        this.swordTip = this.createPart(new THREE.ConeGeometry(0.075, 0.3, 4).rotateY(Math.PI/4), this.matSteel, 0, 1.7, 0, 0, 0, 0, this.swordGroup);

        // ARMA 2
        this.axeGroup = new THREE.Group(); this.axeGroup.position.set(0, -0.1, 0.2); this.axeGroup.rotation.x = Math.PI / 2;
        this.createPart(new THREE.CylinderGeometry(0.06, 0.06, 1.5, 6), this.matLeatherDark, 0, 0.5, 0, 0, 0, 0, this.axeGroup);
        this.createPart(new THREE.BoxGeometry(0.6, 0.5, 0.1), this.matSteel, 0.2, 1.0, 0, 0, 0, 0, this.axeGroup);
        this.createPart(new THREE.ConeGeometry(0.1, 0.4, 4), this.matSteel, -0.2, 1.0, 0, 0, 0, Math.PI/2, this.axeGroup);

        // ESCUDO
        this.shieldGroup = new THREE.Group(); this.shieldGroup.position.set(-0.2, -0.1, 0.3); this.shieldGroup.rotation.y = -Math.PI / 2;
        this.createPart(new THREE.CylinderGeometry(0.55, 0.55, 0.1, 14), this.matLeatherDark, 0, 0, 0, Math.PI/2, 0, 0, this.shieldGroup);
        this.createPart(new THREE.TorusGeometry(0.55, 0.05, 8, 16), this.matSteel, 0, 0, 0, 0, 0, 0, this.shieldGroup);
        this.createPart(new THREE.SphereGeometry(0.15, 8, 8, 0, Math.PI*2, 0, Math.PI/2), this.matSteel, 0, 0, 0.05, Math.PI/2, 0, 0, this.shieldGroup);
        this.slotShield.add(this.shieldGroup);

        // PERNAS
        this.hipL = new THREE.Group(); this.hipL.position.set(-0.6, 1.6, 0); this.bodyGroup.add(this.hipL);
        this.hipR = new THREE.Group(); this.hipR.position.set(0.6, 1.6, 0); this.bodyGroup.add(this.hipR);
        this.kneeL = new THREE.Group(); this.kneeL.position.set(0, -0.7, 0); this.hipL.add(this.kneeL);
        this.kneeR = new THREE.Group(); this.kneeR.position.set(0, -0.7, 0); this.hipR.add(this.kneeR);
        this.createPart(new THREE.CylinderGeometry(0.35, 0.3, 0.8, 8), this.matShirt, 0, -0.3, 0, 0, 0, 0, this.hipL);
        this.createPart(new THREE.CylinderGeometry(0.35, 0.3, 0.8, 8), this.matShirt, 0, -0.3, 0, 0, 0, 0, this.hipR);
        this.createPart(new THREE.CylinderGeometry(0.3, 0.25, 0.7, 8), this.matShirt, 0, -0.3, 0, 0, 0, 0, this.kneeL);
        this.createPart(new THREE.CylinderGeometry(0.3, 0.25, 0.7, 8), this.matShirt, 0, -0.3, 0, 0, 0, 0, this.kneeR);
        this.createPart(new THREE.BoxGeometry(0.6, 0.4, 0.8), this.matLeatherDark, 0, -0.7, 0.15, 0, 0, 0, this.kneeL);
        this.createPart(new THREE.BoxGeometry(0.6, 0.4, 0.8), this.matLeatherDark, 0, -0.7, 0.15, 0, 0, 0, this.kneeR);

        this.particles = [];

        ObjectPool.createPool('vfx_slash', () => {
            const p = new THREE.Mesh(this.particleGeo, this.matSlash);
            p.visible = false;
            this.scene.add(p);
            return p;
        }, 20);

        ObjectPool.createPool('vfx_dust', () => {
            const p = new THREE.Mesh(this.particleGeo, this.matDust);
            p.visible = false;
            this.scene.add(p);
            return p;
        }, 30);
    }

    spawnVFX(pos, type, count) {
        const poolName = type === 'slash' ? 'vfx_slash' : 'vfx_dust';
        for(let i = 0; i < count; i++) {
            const p = ObjectPool.get(poolName);
            if (!p) continue;

            p.visible = true;
            p.position.copy(pos);
            p.position.x += (Math.random() - 0.5) * 0.5;
            p.position.y += (Math.random() - 0.5) * 0.5;
            p.position.z += (Math.random() - 0.5) * 0.5;

            const speed = type === 'slash' ? 12 : 5;
            p.userData = {
                vel: new THREE.Vector3((Math.random()-0.5)*speed, (Math.random()-0.5)*speed, (Math.random()-0.5)*speed),
                life: 1.0,
                type: type
            };

            // Set scale to 1 on spawn
            p.scale.setScalar(1);

            this.particles.push(p);
        }
    }

    updateGear() {
        this.slotHead.clear(); this.slotHead.add(this.currHead === 0 ? this.hairGroup : this.helmetGroup);
        this.slotArmor.clear(); this.slotArmor.add(this.currArmor === 0 ? this.armorLeatherGroup : this.armorSteelGroup);
        this.slotWeapon.clear(); this.slotWeapon.add(this.currWeapon === 0 ? this.swordGroup : this.axeGroup);
    }

    toggleHelmet() { this.currHead = (this.currHead + 1) % 2; this.updateGear(); }
    setArmorType(type) { this.currArmor = type; this.updateGear(); }
    setWeaponType(type) { this.currWeapon = type; this.updateGear(); }

    initInput() {
        document.addEventListener('keydown', (e) => {
            const k = (e.key || '').toLowerCase(); if (this.keys.hasOwnProperty(k)) this.keys[k] = true;

            if (this.actionState !== 'inventory') {
                if (k === 'z') this.actionState = this.actionState === 'sit' ? 'none' : 'sit';
                if (k === 'x') this.actionState = this.actionState === 'sleep' ? 'none' : 'sleep';

                if (k === 'c' && this.actionState === 'none') { this.actionState = 'eat'; setTimeout(() => { if(this.actionState === 'eat') this.actionState = 'none'; }, 3000); }
                if (k === 'v' && this.actionState === 'none') { this.actionState = 'drink'; setTimeout(() => { if(this.actionState === 'drink') this.actionState = 'none'; }, 3000); }

                if (k === 'f' && this.actionState === 'none') {
                    this.actionState = 'damage';
                    this.spawnVFX(this.penitente.position, 'dust', 6);
                    setTimeout(() => { if(this.actionState === 'damage') this.actionState = 'none'; }, 500);
                }

                if (e.code === 'Space' || k === ' ') {
                    if ((this.isGrounded || this.isSwimming) && !this.isDefending && !this.isAttacking && this.actionState === 'none') {
                        this.velocityY = 22; this.isGrounded = false; this.isSwimming = false;
                    }
                }
            }
        });
        document.addEventListener('keyup', (e) => { const k = (e.key || '').toLowerCase(); if (this.keys.hasOwnProperty(k)) this.keys[k] = false; });

        document.addEventListener('mousedown', (e) => {
            if (this.isSwimming || this.actionState === 'inventory' || this.actionState === 'damage') return;
            if (e.button === 0 && !this.isAttacking && !this.isDefending && this.actionState === 'none') { this.isAttacking = true; this.attackTimer = this.ATTACK_DURATION; }
        });

        document.addEventListener('keydown', (e) => {
            if (this.isSwimming || this.actionState === 'inventory' || this.actionState === 'damage') return;
            if ((e.key === 'r' || e.key === 'R') && !this.isAttacking && this.actionState === 'none') {
                this.isDefending = true;
            }
        });

        document.addEventListener('keyup', (e) => {
            if (e.key === 'r' || e.key === 'R') {
                this.isDefending = false;
            }
        });
    }

    updateAnimations(delta, isMoving, moveSpeed) {
        this.animTime += delta;
        this.headPivot.rotation.set(0, 0, 0); this.torso.rotation.set(0, 0, 0);
        this.bodyGroup.position.set(0, 0, 0); this.torso.scale.set(1.2, 1, 0.95);

        const rawDeltaY = this.penitente.position.y - this.prevPosY; this.prevPosY = this.penitente.position.y;
        this.smoothedDeltaY += (rawDeltaY - this.smoothedDeltaY) * 15.0 * delta;

        let gravityImpact = -this.smoothedDeltaY * 6.0; if (this.isSwimming) gravityImpact = 0.5;

        const windDrag = isMoving ? (moveSpeed > 10 ? -0.7 : -0.3) : 0;
        const runBounce = isMoving && this.isGrounded && !this.isSwimming ? Math.abs(Math.sin(this.animTime * (this.keys.shift ? 18 : 10))) * 0.3 : 0;

        let attackImpact = 0;
        const isResting = this.actionState === 'sit' || this.actionState === 'sleep' || this.actionState === 'inventory' || this.actionState === 'damage';

        if (this.actionState === 'damage') {
            this.bodyGroup.rotation.x = -0.3;
            this.headPivot.rotation.x = -0.4;
            this.shoulderL.rotation.set(-0.5, 0, 1.2);
            this.shoulderR.rotation.set(-0.5, 0, -1.2);
            this.elbowL.rotation.set(-0.2, 0, 0); this.elbowR.rotation.set(-0.2, 0, 0);
            this.bodyGroup.position.x += (Math.random() - 0.5) * 0.15;
            this.bodyGroup.position.z += (Math.random() - 0.5) * 0.15;
        }
        else if (this.actionState === 'sit') {
            this.bodyGroup.position.y = -1.1;
            this.hipL.rotation.set(-1.5, 0.2, 0); this.hipR.rotation.set(-1.5, -0.2, 0);
            this.kneeL.rotation.set(0.1, 0, 0); this.kneeR.rotation.set(0.1, 0, 0);
            this.shoulderL.rotation.set(0.2, 0, -0.2); this.shoulderR.rotation.set(0.2, 0, 0.2);
            this.elbowL.rotation.set(-0.2, 0, 0); this.elbowR.rotation.set(-0.2, 0, 0);
            this.torso.rotation.x = 0.1; this.headPivot.rotation.x = 0.2;
        } else if (this.actionState === 'sleep') {
            this.bodyGroup.position.y = 0.85;
            this.bodyGroup.position.z = 0;
            this.bodyGroup.rotation.x = -Math.PI / 2;
            this.torso.scale.z = 0.95 + Math.sin(this.animTime * 2.5) * 0.08;
            this.torso.scale.y = 1.0 + Math.sin(this.animTime * 2.5) * 0.05;
            this.shoulderL.rotation.set(-0.2, 0, -1.2); this.shoulderR.rotation.set(-0.2, 0, 1.2);
            this.elbowL.rotation.set(0, 0, 0); this.elbowR.rotation.set(0, 0, 0);
            this.hipL.rotation.set(0, 0, 0); this.hipR.rotation.set(0, 0, 0); this.kneeL.rotation.set(0, 0, 0); this.kneeR.rotation.set(0, 0, 0);
        } else if (this.actionState === 'inventory') {
            this.bodyGroup.position.y = Math.sin(this.animTime * 2) * 0.02;
            this.torso.rotation.x = 0.3; this.headPivot.rotation.x = 0.4;
            this.shoulderL.rotation.set(0.4, 0, -0.2); this.elbowL.rotation.set(-1.2, 0, 0);
            this.shoulderR.rotation.set(0.2, 0, 0.2); this.elbowR.rotation.set(-0.2, 0, 0);
            this.hipL.rotation.set(0, 0, 0); this.hipR.rotation.set(0, 0, 0); this.kneeL.rotation.set(0, 0, 0); this.kneeR.rotation.set(0, 0, 0);
        }
        else if (this.isSwimming) {
            this.bodyGroup.position.y = Math.sin(this.animTime * 3) * 0.1;
            this.bodyGroup.rotation.x = isMoving ? 0.6 : 0.1; this.headPivot.rotation.x = isMoving ? -0.5 : 0;
            if (isMoving) {
                const swimCycle = this.animTime * 8;
                this.shoulderL.rotation.set(-1.0 + Math.sin(swimCycle) * 0.8, 0, -0.4);
                this.shoulderR.rotation.set(-1.0 + Math.sin(swimCycle + Math.PI) * 0.8, 0, 0.4);
                this.elbowL.rotation.set(-0.2, 0, 0); this.elbowR.rotation.set(-0.2, 0, 0);
                this.hipL.rotation.set(Math.sin(swimCycle*2) * 0.4, 0, 0); this.hipR.rotation.set(-Math.sin(swimCycle*2) * 0.4, 0, 0);
                this.kneeL.rotation.set(0.2, 0, 0); this.kneeR.rotation.set(0.2, 0, 0);
            } else {
                this.shoulderL.rotation.set(-0.2, 0, -0.5); this.shoulderR.rotation.set(-0.2, 0, 0.5);
                this.elbowL.rotation.set(-0.5, 0, 0); this.elbowR.rotation.set(-0.5, 0, 0);
                this.hipL.rotation.set(0,0,0); this.hipR.rotation.set(0,0,0); this.kneeL.rotation.set(0,0,0); this.kneeR.rotation.set(0,0,0);
            }
        }
        else {
            this.bodyGroup.rotation.set(0, 0, 0);
            if (!this.isGrounded) {
                if (this.velocityY > 0) {
                    if(!this.isAttacking && !this.isDefending) { this.shoulderL.rotation.set(-2.5, 0, -0.3); this.shoulderR.rotation.set(-2.5, 0, 0.3); this.elbowR.rotation.set(0,0,0); }
                    this.hipL.rotation.set(-0.5, 0, 0); this.hipR.rotation.set(0.2, 0, 0); this.kneeL.rotation.set(0.5, 0, 0); this.kneeR.rotation.set(0.1, 0, 0);
                } else {
                    if(!this.isAttacking && !this.isDefending) { this.shoulderL.rotation.set(-1.0, 0, -0.5); this.shoulderR.rotation.set(-1.0, 0, 0.5); }
                    this.hipL.rotation.set(-0.2, 0, 0); this.hipR.rotation.set(-0.2, 0, 0);
                }
            } else {
                if (!isMoving) {
                    this.bodyGroup.position.y = Math.sin(this.animTime * 2) * 0.05;
                    if(!this.isAttacking && !this.isDefending && this.actionState === 'none') {
                        this.shoulderL.rotation.set(0.1, 0, -0.2); this.shoulderR.rotation.set(0.1, 0, 0.2); this.elbowR.rotation.set(-0.2, 0, 0);
                    }
                    if (this.actionState === 'none') this.elbowL.rotation.set(-0.1, 0, 0);
                    this.hipL.rotation.set(0, 0, 0); this.hipR.rotation.set(0, 0, 0); this.kneeL.rotation.set(0, 0, 0); this.kneeR.rotation.set(0, 0, 0);
                } else {
                    const speedMult = this.keys.shift ? 18 : 10; const moveSin = Math.sin(this.animTime * speedMult);
                    this.bodyGroup.position.y = Math.abs(moveSin) * (this.keys.shift ? 0.35 : 0.2); this.bodyGroup.rotation.x = this.keys.shift ? 0.2 : 0.05;
                    if(!this.isAttacking && !this.isDefending) {
                        this.shoulderL.rotation.set(-moveSin * (this.keys.shift ? 1.2 : 0.6), 0, -0.2); this.shoulderR.rotation.set(moveSin * (this.keys.shift ? 1.2 : 0.6), 0, 0.2); this.elbowR.rotation.set(this.keys.shift ? -0.5 : -0.2, 0, 0);
                    }
                    this.elbowL.rotation.set(this.keys.shift ? -0.5 : -0.2, 0, 0);
                    this.hipL.rotation.set(moveSin * (this.keys.shift ? 1.0 : 0.6), 0, 0); this.hipR.rotation.set(-moveSin * (this.keys.shift ? 1.0 : 0.6), 0, 0);
                    this.kneeL.rotation.set(moveSin > 0 ? moveSin * 0.8 : 0, 0, 0); this.kneeR.rotation.set(moveSin < 0 ? -moveSin * 0.8 : 0, 0, 0);
                }
            }

            if (this.isDefending && !this.isAttacking) {
                this.shoulderL.rotation.set(-0.6, 0.4, -0.6); this.elbowL.rotation.set(-2.0, -1.4, 0);
                this.torso.rotation.y = -0.7; this.headPivot.rotation.y = 0.7;
                this.bodyGroup.position.y -= 0.2;
                this.hipL.rotation.set(-0.5, 0.2, 0); this.kneeL.rotation.set(0.6, 0, 0); this.hipR.rotation.set(0.2, -0.2, 0); this.kneeR.rotation.set(0.4, 0, 0);
                this.torso.rotation.x += 0.2;
            }

            if (this.isAttacking) {
                this.attackTimer -= delta; const progress = 1 - (this.attackTimer / this.ATTACK_DURATION);
                this.torso.rotation.y = Math.sin(progress * Math.PI) * 0.4;
                if (progress < 0.35) {
                    const p = progress / 0.35;
                    this.shoulderR.rotation.set(-Math.PI * 0.8 * p, -0.2 * p, 0.4 * p); this.elbowR.rotation.set(-1.5 * p, 0, 0);
                } else {
                    const p = (progress - 0.35) / 0.65;
                    this.shoulderR.rotation.set(-Math.PI * 0.8 + (Math.PI * 1.1 * p), -0.2 + (0.7 * p), 0.4 - (0.2 * p));
                    this.elbowR.rotation.set(-1.5 + (1.2 * p), 0, 0);
                    if (p > 0.5) {
                        if (!this.hasHit) {
                            this.hasHit = true; const tipPos = new THREE.Vector3();
                            if(this.currWeapon === 0) this.swordTip.getWorldPosition(tipPos); else this.axeGroup.getWorldPosition(tipPos);
                            this.spawnVFX(tipPos, 'slash', 12);

                            if (this.onMeleeHit) {
                                const forward = new THREE.Vector3();
                                this.group.getWorldDirection(forward);
                                // The damage can be determined by the equipped weapon or a default value
                                // 12 damage was used in the concept code, let's pass a base of 15
                                this.onMeleeHit(this.group.position, forward, 15, 5.5);
                            }
                        }
                        attackImpact = Math.sin(((p - 0.5) / 0.5) * Math.PI) * 2.0;
                        this.bodyGroup.position.y -= attackImpact * 0.05; this.torso.rotation.x += attackImpact * 0.15;
                    }
                }
                if (this.attackTimer <= 0) { this.isAttacking = false; this.hasHit = false; this.torso.rotation.y = 0; }
            } else if (!this.isDefending && !isResting) {
                this.hasHit = false; this.torso.rotation.y += (0 - this.torso.rotation.y) * 10 * delta;
            }
        }

        if (this.actionState === 'eat') {
            const chewCycle = Math.sin(this.animTime * 15);
            this.shoulderL.rotation.set(-1.0, 0.6, -0.2);
            this.elbowL.rotation.set(-2.0, 0, 0);
            this.headPivot.rotation.x = chewCycle * 0.05;
        } else if (this.actionState === 'drink') {
            const gulpCycle = Math.sin(this.animTime * 8);
            this.shoulderL.rotation.set(-1.2, 0.6, -0.2);
            this.elbowL.rotation.set(-2.2, 0, 0);
            this.headPivot.rotation.x = -0.4 + gulpCycle * 0.08;
        }

        let emotion = 'neutral';
        if (this.actionState === 'sleep') emotion = 'sleep';
        else if (this.actionState === 'inventory') emotion = 'focus';
        else if (this.actionState === 'damage') emotion = 'hurt';
        else if (this.isAttacking) emotion = 'angry';
        else if (this.isDefending) emotion = 'guard';
        else if (!this.isGrounded && this.velocityY > 5) emotion = 'jump';
        else if (!this.isGrounded && this.velocityY < -5) emotion = 'fall';

        let targetBrowZ = -0.25, targetMouthX = 1.0, targetMouthY = 1.0;
        if (emotion === 'angry') { targetBrowZ = -0.6; targetMouthX = 0.6; targetMouthY = 0.6; }
        else if (emotion === 'guard') { targetBrowZ = -0.5; targetMouthX = 0.5; targetMouthY = 0.3; }
        else if (emotion === 'jump') { targetBrowZ = 0.1; targetMouthX = 0.6; targetMouthY = 1.5; }
        else if (emotion === 'fall') { targetBrowZ = 0.4; targetMouthX = 1.4; targetMouthY = 0.5; }
        else if (emotion === 'sleep') { targetBrowZ = 0; targetMouthX = 0.5; targetMouthY = 0.5; }
        else if (emotion === 'focus') { targetBrowZ = -0.4; targetMouthX = 0.8; targetMouthY = 0.8; }
        else if (emotion === 'hurt') { targetBrowZ = 0.6; targetMouthX = 1.2; targetMouthY = 1.5; }

        if (this.actionState === 'eat') targetMouthY = 1.0 + Math.abs(Math.sin(this.animTime * 15)) * 1.5;
        else if (this.actionState === 'drink') { targetMouthY = 2.0; targetMouthX = 0.5; }

        this.browL.rotation.z += (targetBrowZ - this.browL.rotation.z) * 15 * delta; this.browR.rotation.z += (-targetBrowZ - this.browR.rotation.z) * 15 * delta;
        this.mouth.scale.x += (targetMouthX - this.mouth.scale.x) * 15 * delta; this.mouth.scale.y += (targetMouthY - this.mouth.scale.y) * 15 * delta;

        this.blinkTimer -= delta;
        if (this.blinkTimer <= 0) { this.isBlinking = true; this.blinkTimer = 2.0 + Math.random() * 4.0; this.blinkDuration = 0.15; }
        if (this.isBlinking || emotion === 'hurt') {
            this.blinkDuration -= delta; this.eyeL.scale.y = 0.1; this.eyeR.scale.y = 0.1;
            if (this.blinkDuration <= 0) this.isBlinking = false;
        } else {
            let targetEyeScale = (emotion === 'fall' || emotion === 'jump') ? 1.3 : 1.0;
            if (emotion === 'angry' || emotion === 'guard' || emotion === 'focus') targetEyeScale = 0.7;
            if (emotion === 'sleep') targetEyeScale = 0.05;
            this.eyeL.scale.y += (targetEyeScale - this.eyeL.scale.y) * 20 * delta; this.eyeR.scale.y += (targetEyeScale - this.eyeR.scale.y) * 20 * delta;
        }

        this.animatedHair.forEach(hair => {
            if(this.currHead !== 0) return;
            const wind = Math.sin(this.animTime * 3 + hair.offset) * 0.05;
            let targetRx = hair.baseRx + wind; let targetRz = hair.baseRz + Math.cos(this.animTime * 2 + hair.offset) * 0.03;

            if (hair.isBangs) {
                targetRx -= gravityImpact * hair.reactionStrength; targetRx -= windDrag * hair.reactionStrength * 0.15; targetRx -= runBounce * hair.reactionStrength;
                if (Math.abs(windDrag) > 0.1) targetRz += Math.abs(windDrag) * (hair.baseRz > 0 ? 1 : -1) * 1.5;
            } else {
                targetRx += gravityImpact * hair.reactionStrength; targetRx += windDrag * hair.reactionStrength; targetRx += runBounce * hair.reactionStrength;
            }

            if (attackImpact > 0) {
                if (hair.isBangs) targetRx += attackImpact * hair.reactionStrength * 0.4; else targetRx -= attackImpact * hair.reactionStrength * 0.4;
            }
            if (this.actionState === 'inventory') targetRx += 0.3;
            if (this.actionState === 'damage') targetRx += 0.5;

            hair.mesh.rotation.x += (targetRx - hair.mesh.rotation.x) * 18 * delta; hair.mesh.rotation.z += (targetRz - hair.mesh.rotation.z) * 18 * delta;
        });

        this.animatedCoat.forEach(flap => {
            if(this.currArmor !== 0) return;
            const wind = Math.sin(this.animTime * 4 + flap.offset) * 0.05; let targetRx = flap.baseRx + wind;
            targetRx += gravityImpact * 0.5; targetRx -= windDrag * 1.8; targetRx += runBounce * 0.6;
            if (attackImpact > 0) targetRx += attackImpact * 0.5;
            if (this.isDefending || this.actionState === 'sit') targetRx += 0.3;
            if (this.actionState === 'damage') targetRx -= 0.5;
            flap.mesh.rotation.x += (targetRx - flap.mesh.rotation.x) * 12 * delta;
        });
    }

    update(delta, camera, getFloorFunc, getMapBoundsFunc, checkCollisionFunc) {
        if (this.isResetting) return;

        let isMoving = false;

        const camDir = new THREE.Vector3(); camera.getWorldDirection(camDir); camDir.y = 0; camDir.normalize();
        const camRight = new THREE.Vector3().crossVectors(camDir, new THREE.Vector3(0, 1, 0)).normalize();

        const isResting = this.actionState === 'sit' || this.actionState === 'sleep' || this.actionState === 'inventory' || this.actionState === 'damage';
        const canMove = !(this.isAttacking && this.isGrounded && !this.isSwimming) && !isResting;

        let inputX = 0; let inputZ = 0;
        let analogMag = 1.0;
        let useKeyboard = false;

        if (canMove) {
            // Check joystick first
            if (window.virtualJoystick && window.virtualJoystick.active) {
                const jx = window.virtualJoystick.x;
                const jy = window.virtualJoystick.y; // Negative jy means pressing UP

                // Add forward/backward (w/s)
                inputX -= camDir.x * jy;
                inputZ -= camDir.z * jy;

                // Add left/right (a/d)
                inputX += camRight.x * jx;
                inputZ += camRight.z * jx;

                analogMag = Math.sqrt(jx*jx + jy*jy);
                if (analogMag > 1.0) analogMag = 1.0;
            } else {
                useKeyboard = true;
            }

            if (useKeyboard || (inputX === 0 && inputZ === 0)) {
                let kbX = 0; let kbZ = 0;
                if (this.keys.w) { kbX += camDir.x; kbZ += camDir.z; }
                if (this.keys.s) { kbX -= camDir.x; kbZ -= camDir.z; }
                if (this.keys.a) { kbX -= camRight.x; kbZ -= camRight.z; }
                if (this.keys.d) { kbX += camRight.x; kbZ += camRight.z; }

                if (kbX !== 0 || kbZ !== 0) {
                    inputX += kbX;
                    inputZ += kbZ;
                    analogMag = 1.0;
                }
            }
        }

        const inputVec = new THREE.Vector3(inputX, 0, inputZ);
        if (inputVec.lengthSq() > 0) inputVec.normalize();

        // Apply acceleration based on input
        if (inputVec.lengthSq() > 0) {
            this.velocityX += inputVec.x * this.acceleration * analogMag * delta;
            this.velocityZ += inputVec.z * this.acceleration * analogMag * delta;
        }

        // Apply friction/damping using exponential decay to prevent overshooting at low framerates
        const dampingFactor = Math.max(0, 1 - this.friction * delta);
        this.velocityX *= dampingFactor;
        this.velocityZ *= dampingFactor;

        // Cap speed
        const currentSpeedSq = this.velocityX * this.velocityX + this.velocityZ * this.velocityZ;

        let targetMaxSpeed = this.keys.shift ? this.maxRunSpeed : this.maxSpeed;
        if (this.isDefending) targetMaxSpeed = this.keys.shift ? this.maxRunSpeed * 0.5 : this.maxSpeed * 0.5;
        if (this.isSwimming) targetMaxSpeed = 5;

        if (currentSpeedSq > targetMaxSpeed * targetMaxSpeed) {
            const currentSpeed = Math.sqrt(currentSpeedSq);
            this.velocityX = (this.velocityX / currentSpeed) * targetMaxSpeed;
            this.velocityZ = (this.velocityZ / currentSpeed) * targetMaxSpeed;
        }

        // Rotation
        if (currentSpeedSq > 0.1) {
            isMoving = true;
            if (!this.isDefending || this.isSwimming) {
                const targetAngle = Math.atan2(this.velocityX, this.velocityZ);
                let diff = targetAngle - this.group.rotation.y;
                while (diff < -Math.PI) diff += Math.PI * 2; while (diff > Math.PI) diff -= Math.PI * 2;
                this.group.rotation.y += diff * 12 * delta;
            } else if (this.isDefending) {
                 const targetAngle = Math.atan2(this.velocityX, this.velocityZ);
                 let diff = targetAngle - this.group.rotation.y;
                 while (diff < -Math.PI) diff += Math.PI * 2; while (diff > Math.PI) diff -= Math.PI * 2;
                 this.group.rotation.y += diff * 4 * delta;
            }
        }

        // Movement with proper AABB wall check against static grid logic
        const playerRadius = 0.4; // Approximated cylinder collision radius for Penitent

        const originalX = this.group.position.x;
        const originalZ = this.group.position.z;

        // Check X movement
        let nextPosX = originalX + this.velocityX * delta;
        const testPos = new THREE.Vector3(nextPosX, this.group.position.y, originalZ);

        if (checkCollisionFunc && checkCollisionFunc(testPos, playerRadius)) {
            this.velocityX = 0;
        } else {
            this.group.position.x = nextPosX;
        }

        // Check Z movement
        let nextPosZ = originalZ + this.velocityZ * delta;
        testPos.set(originalX, this.group.position.y, nextPosZ);

        if (checkCollisionFunc && checkCollisionFunc(testPos, playerRadius)) {
            this.velocityZ = 0;
        } else {
            this.group.position.z = nextPosZ;
        }

        // Clamp to World Bounds if provided
        if (getMapBoundsFunc) {
            const bounds = getMapBoundsFunc();
            if (bounds) {
                if (this.group.position.x < bounds.minX) { this.group.position.x = bounds.minX; this.velocityX = 0; }
                if (this.group.position.x > bounds.maxX) { this.group.position.x = bounds.maxX; this.velocityX = 0; }
                if (this.group.position.z < bounds.minZ) { this.group.position.z = bounds.minZ; this.velocityZ = 0; }
                if (this.group.position.z > bounds.maxZ) { this.group.position.z = bounds.maxZ; this.velocityZ = 0; }
            }
        }

        const floorY = getFloorFunc ? getFloorFunc(this.group.position) : 0;
        let isSwimmingState = false;

        if (this.isDefending && !this.wasDefending && this.isGrounded) {
            this.spawnVFX(this.group.position, 'dust', 8);
            const shieldPos = new THREE.Vector3(); this.slotShield.getWorldPosition(shieldPos); this.spawnVFX(shieldPos, 'slash', 6);
        }
        this.wasDefending = this.isDefending;

        // Apply Gravity
        this.velocityY -= 60 * delta;
        this.group.position.y += this.velocityY * delta;

        // Abyss Detector Trigger
        if (this.group.position.y < floorY - 5.0) {
             this.triggerAbyssReset();
             return; // Stop updating this frame
        }

        if (this.group.position.y <= floorY) {
            this.velocityY = 0;
            this.isGrounded = true;

            // Smoothly glide character to target floorY to absorb steps
            this.group.position.y += (floorY - this.group.position.y) * 15.0 * delta;

            // Update last safe pos when grounded and not falling
            this.lastSafePos.copy(this.group.position);
        }

        if (this.isGrounded && !this.wasGrounded && !this.isSwimming) {
            if (this.prevVelocityY < -10) { this.spawnVFX(this.group.position, 'dust', 12); }
        }
        this.wasGrounded = this.isGrounded; this.prevVelocityY = this.velocityY;
        this.isSwimming = isSwimmingState;

        if (this.lanternLight) this.lanternLight.intensity = 1.2 + Math.random() * 0.8;

        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.userData.life -= delta * (p.userData.type === 'slash' ? 3.0 : 1.5);
            p.position.add(p.userData.vel.clone().multiplyScalar(delta));
            if (p.userData.type === 'slash') p.scale.setScalar(Math.max(0, p.userData.life));
            else { p.position.y += delta * 1.5; p.scale.setScalar(Math.max(0, p.userData.life * 1.5)); }
            if (p.userData.life <= 0) {
                ObjectPool.release(p.userData.type === 'slash' ? 'vfx_slash' : 'vfx_dust', p);
                this.particles.splice(i, 1);
            }
        }

        this.updateAnimations(delta, isMoving, Math.sqrt(currentSpeedSq));
    }

    // Will be injected by the environment (e.g. WorldMap or ProceduralMap)
    setMeleeHitCallback(callback) {
        this.onMeleeHit = callback;
    }

    triggerAbyssReset() {
        this.isResetting = true;
        this.velocityX = 0;
        this.velocityZ = 0;
        this.velocityY = 0;

        // Create a quick fade effect
        const fadeDiv = document.createElement('div');
        fadeDiv.style.position = 'absolute';
        fadeDiv.style.top = '0';
        fadeDiv.style.left = '0';
        fadeDiv.style.width = '100%';
        fadeDiv.style.height = '100%';
        fadeDiv.style.backgroundColor = 'black';
        fadeDiv.style.opacity = '0';
        fadeDiv.style.transition = 'opacity 0.15s ease-in-out';
        fadeDiv.style.zIndex = '9999';
        fadeDiv.style.pointerEvents = 'none';
        document.body.appendChild(fadeDiv);

        // Trigger fade to black
        setTimeout(() => { fadeDiv.style.opacity = '1'; }, 10);

        // Reset pos and fade back
        setTimeout(() => {
            this.group.position.copy(this.lastSafePos);
            this.group.position.y += 1.0; // Small bump up
            this.isGrounded = false; // Fall down to floor

            fadeDiv.style.opacity = '0';
            this.isResetting = false;

            setTimeout(() => { document.body.removeChild(fadeDiv); }, 200);
        }, 200);
    }
}
