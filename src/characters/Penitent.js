import gameState from '../core/GameState.js';
import { ITEM_DATABASE } from '../data/ItemData.js';
import { AnimationController } from '../animations/AnimationController.js';
import { WeaponModels } from '../items/WeaponModels.js';
import * as THREE from 'three';
import { ObjectPool } from '../core/ObjectPoolManager.js';

export class Penitent {
    constructor(scene) {
        this.scene = scene;
        this.group = new THREE.Group();
        this.group.scale.setScalar(0.55);
        this.modelGroup = new THREE.Group();
        this.group.add(this.modelGroup);
        this.animController = new AnimationController(this);
        this.scene.add(this.group);

        this.setupMaterials();
        this.buildModel();

        this.isGrounded = true;
        this.keys = { w: false, a: false, s: false, d: false, shift: false, space: false };
        this.velocityY = 0;
        this.lastSafePos = new THREE.Vector3(0, 5, 0);
        this.isResetting = false;

        // Physics constants
        this.maxSpeed = 10.0;
        this.maxRunSpeed = 20.0;
        this.animTime = 0;
        this.prevPosY = 0;
        this.smoothedDeltaY = 0;
        this.isAttacking = false;
        this.attackTimer = 0;
        this.ATTACK_DURATION = 0.4;

        this.isDefending = false;
        this.currentWeaponModel = 'unarmed';
        this.currentWeaponType = 'unarmed';
        this.currentShieldType = null;
        this.comboStep = 1;
        this.comboMax = 2;
        this.comboResetTimer = 0;
        this.currentDamage = 2;
        this.currentReach = 1.0;
        window.addEventListener('equipment-changed', () => { if (window.gameState) this.refreshEquipment(); });
        setTimeout(() => { if (window.gameState) this.refreshEquipment(); }, 100);

        this.isSwimming = false;
        this.actionState = 'none';
        this.hasHit = false;
        this.wasDefending = false;
        this.wasGrounded = true;
        this.prevVelocityY = 0;
        this.blinkTimer = 2.0;
        this.isBlinking = false;
        this.blinkDuration = 0;

        // Stamina System
        this.stamina = 100;
        this.maxStamina = 100;
        this.staminaRegenRate = 15;
        this.staminaDrainRate = 25;
        this.createFloatingStaminaBar();

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
        this.matSlashArc = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.7, side: THREE.DoubleSide });
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
        this.slotWeapon.position.set(0, -0.1, 0.2);
        this.slotWeapon.rotation.x = Math.PI / 2;
        this.handL.add(this.slotShield);
        this.slotShield.position.set(-0.2, -0.1, 0.3);
        this.slotShield.rotation.y = -Math.PI / 2;



        this.slashArcGroup = new THREE.Group();
        this.group.add(this.slashArcGroup);
        const arcGeo = new THREE.TorusGeometry(3.5, 0.4, 2, 20, Math.PI);
        this.slashArcMesh = new THREE.Mesh(arcGeo, this.matSlashArc);
        this.slashArcMesh.rotation.x = Math.PI / 2;
        this.slashArcMesh.position.z = 2.0; // edge reaches 3.5 + 2.0 = 5.5
        this.slashArcMesh.visible = false;
        this.slashArcGroup.add(this.slashArcMesh);

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


    createFloatingStaminaBar() {
        // Create an HTML element for the floating stamina bar
        this.staminaBarContainer = document.createElement('div');
        this.staminaBarContainer.style.position = 'absolute';
        this.staminaBarContainer.style.width = '40px';
        this.staminaBarContainer.style.height = '4px';
        this.staminaBarContainer.style.backgroundColor = 'rgba(0,0,0,0.6)';
        this.staminaBarContainer.style.border = '1px solid rgba(0,0,0,0.8)';
        this.staminaBarContainer.style.borderRadius = '2px';
        this.staminaBarContainer.style.pointerEvents = 'none';
        this.staminaBarContainer.style.display = 'none';
        this.staminaBarContainer.style.zIndex = '50';
        this.staminaBarContainer.style.transform = 'translate(-50%, -50%)';

        this.staminaBarFill = document.createElement('div');
        this.staminaBarFill.style.width = '100%';
        this.staminaBarFill.style.height = '100%';
        this.staminaBarFill.style.backgroundColor = '#38bdf8'; // sky blue
        this.staminaBarFill.style.borderRadius = '1px';
        this.staminaBarFill.style.transition = 'width 0.1s linear';

        this.staminaBarContainer.appendChild(this.staminaBarFill);
        document.body.appendChild(this.staminaBarContainer);
    }

    updateFloatingStaminaBar(camera) {
        if (this.stamina >= this.maxStamina) {
            this.staminaBarContainer.style.display = 'none';
            return;
        }

        this.staminaBarContainer.style.display = 'block';
        this.staminaBarFill.style.width = `${(this.stamina / this.maxStamina) * 100}%`;

        // Project position above player's head
        const headPos = new THREE.Vector3();
        headPos.copy(this.group.position);
        headPos.y += 2.5; // offset above head

        headPos.project(camera);

        const x = (headPos.x * .5 + .5) * window.innerWidth;
        const y = (headPos.y * -.5 + .5) * window.innerHeight;

        // If behind camera, hide
        if (headPos.z > 1) {
            this.staminaBarContainer.style.display = 'none';
        } else {
            this.staminaBarContainer.style.left = `${x}px`;
            this.staminaBarContainer.style.top = `${y}px`;
        }
    }

    refreshEquipment() {
        if (!window.gameState || !window.gameState.equipmentState) return;
        const weaponId = window.gameState.equipmentState.right_hand;
        const shieldId = window.gameState.equipmentState.left_hand;
        const weaponData = weaponId ? ITEM_DATABASE[weaponId] : null;
        const shieldData = shieldId ? ITEM_DATABASE[shieldId] : null;
        this.setEquipmentFromData(weaponData, shieldData);
    }

    setEquipmentFromData(weaponData, shieldData) {
        this.currentWeaponModel = weaponData ? weaponData.modelType || 'unarmed' : 'unarmed';
        this.currentWeaponType = weaponData ? weaponData.type || 'unarmed' : 'unarmed';
        this.currentShieldType = shieldData ? shieldData.modelType || null : null;

        this.ATTACK_DURATION = weaponData ? (0.4 / (weaponData.comboSpeed || 1.0)) : 0.4;
        this.comboMax = weaponData ? (weaponData.comboMax || 2) : 2;
        this.currentDamage = weaponData ? (weaponData.damage || 2) : 2;
        this.currentReach = weaponData ? (weaponData.reach || 1.0) : 1.0;

        this.updateEquipmentVisuals(this.currentWeaponModel, this.currentShieldType);
    }

    updateEquipmentVisuals(weaponType, shieldType) {
        this.slotWeapon.clear();
        this.slotShield.clear();
        if (this.weaponTip) {
            this.weaponTip.position.set(0, 0, 0);
            this.weaponTip.removeFromParent();
        } else {
            this.weaponTip = new THREE.Group();
        }

        let weaponModel;
        switch (weaponType) {
            case 'knife':
                weaponModel = WeaponModels.createKnife();
                weaponModel.add(this.weaponTip); this.weaponTip.position.set(0, 0.8, 0); break;
            case 'sword1h':
                weaponModel = WeaponModels.createSword1H();
                weaponModel.add(this.weaponTip); this.weaponTip.position.set(0, 1.5, 0); break;
            case 'sword2h':
                weaponModel = WeaponModels.createSword2H();
                weaponModel.add(this.weaponTip); this.weaponTip.position.set(0, 2.5, 0); break;
            case 'bastard_sword':
                weaponModel = WeaponModels.createBastardSword();
                weaponModel.add(this.weaponTip); this.weaponTip.position.set(0, 2.0, 0); break;
            case 'club':
                weaponModel = WeaponModels.createClub();
                weaponModel.add(this.weaponTip); this.weaponTip.position.set(0, 1.3, 0); break;
            case 'hammer':
                weaponModel = WeaponModels.createHammer();
                weaponModel.add(this.weaponTip); this.weaponTip.position.set(0, 1.5, 0); break;
            case 'pickaxe':
                weaponModel = WeaponModels.createPickaxe();
                weaponModel.add(this.weaponTip); this.weaponTip.position.set(0, 1.5, 0); break;
            case 'magic_staff':
                weaponModel = WeaponModels.createMagicStaff();
                weaponModel.add(this.weaponTip); this.weaponTip.position.set(0, 2.0, 0); break;
            case 'gauntlet':
                weaponModel = WeaponModels.createGauntlet();
                weaponModel.add(this.weaponTip); this.weaponTip.position.set(0, 0.5, 0); break;
            case 'spear':
                weaponModel = WeaponModels.createSpear();
                weaponModel.add(this.weaponTip); this.weaponTip.position.set(0, 2.9, 0); break;
            case 'unarmed':
            default:
                weaponModel = new THREE.Group();
                weaponModel.add(this.weaponTip); this.weaponTip.position.set(0, 0, 0); break;
        }

        this.slotWeapon.add(weaponModel);
        if (shieldType === 'shield' && weaponType !== 'sword2h' && weaponType !== 'spear' && weaponType !== 'magic_staff' && weaponType !== 'bastard_sword' && weaponType !== 'hammer' && weaponType !== 'pickaxe') {
            this.slotShield.add(WeaponModels.createShield());
        }

        this.slotHead.clear(); this.slotHead.add(this.currHead === 0 ? this.hairGroup : this.helmetGroup);
        this.slotArmor.clear(); this.slotArmor.add(this.currArmor === 0 ? this.armorLeatherGroup : this.armorSteelGroup);
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
            if (window.hubBuildingState === 'BUILDING_GRID') return;
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
            if (window.hubBuildingState === 'BUILDING_GRID') return;
            if (this.isSwimming || this.actionState === 'inventory' || this.actionState === 'damage') return;

            if (e.button === 0 && !this.isAttacking && !this.isDefending && this.actionState === 'none') {
                this.isAttacking = true;
                this.attackTimer = this.ATTACK_DURATION;

                // Combo progression
                if (this.comboResetTimer > 0) {
                    this.comboStep++;
                    if (this.comboStep > this.comboMax) this.comboStep = 1;
                } else {
                    this.comboStep = 1;
                }
                this.comboResetTimer = 0;
            }

        });

        document.addEventListener('keydown', (e) => {
            if (window.hubBuildingState === 'BUILDING_GRID') return;
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
        if (this.animController) {
            this.animController.update(delta, isMoving, moveSpeed);
        }
    }

    update(delta, camera, getFloorFunc, getMapBoundsFunc, checkCollisionFunc) {
        if (this.isResetting) return;

        let isMoving = false;

        const camDir = new THREE.Vector3(); camera.getWorldDirection(camDir); camDir.y = 0; camDir.normalize();
        const camRight = new THREE.Vector3().crossVectors(camDir, new THREE.Vector3(0, 1, 0)).normalize();

        const isResting = this.actionState === 'sit' || this.actionState === 'sleep' || this.actionState === 'inventory' || this.actionState === 'damage';
        const isBuildingGrid = window.hubBuildingState === 'BUILDING_GRID';
        const canMove = !(this.isAttacking && this.isGrounded && !this.isSwimming) && !isResting && !isBuildingGrid;

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

        const moveVec = new THREE.Vector3(inputX, 0, inputZ);

        let isSprinting = false;
        if (this.keys.shift && this.stamina > 0 && moveVec.lengthSq() > 0) {
            isSprinting = true;
        }

        let targetSpeed = isSprinting ? this.maxRunSpeed : this.maxSpeed;
        if (this.isDefending) targetSpeed = isSprinting ? this.maxRunSpeed * 0.5 : this.maxSpeed * 0.5;
        if (this.isSwimming) targetSpeed = 5;

        if (moveVec.lengthSq() > 0) {
            isMoving = true;
            moveVec.normalize().multiplyScalar(targetSpeed * analogMag * delta);

            const playerRadius = 0.4;
            const originalX = this.group.position.x;
            const originalZ = this.group.position.z;

            // Check X movement
            let nextPosX = originalX + moveVec.x;
            const testPosX = new THREE.Vector3(nextPosX, this.group.position.y, originalZ);
            let canMoveX = true;

            if (checkCollisionFunc && checkCollisionFunc(testPosX, playerRadius)) {
                canMoveX = false;
            }

            // Check Z movement
            let nextPosZ = originalZ + moveVec.z;
            const testPosZ = new THREE.Vector3(originalX, this.group.position.y, nextPosZ);
            let canMoveZ = true;

            if (checkCollisionFunc && checkCollisionFunc(testPosZ, playerRadius)) {
                canMoveZ = false;
            }

            if (canMoveX) this.group.position.x = nextPosX;
            if (canMoveZ) this.group.position.z = nextPosZ;

            // Rotation
            if (canMoveX || canMoveZ) {
                const targetAngle = Math.atan2(moveVec.x, moveVec.z);
                let diff = targetAngle - this.group.rotation.y;
                while (diff < -Math.PI) diff += Math.PI * 2; while (diff > Math.PI) diff -= Math.PI * 2;

                if (!this.isDefending || this.isSwimming) {
                    this.group.rotation.y += diff * 12 * delta;
                } else {
                    this.group.rotation.y += diff * 4 * delta;
                }
            }

            if (isSprinting) {
                this.stamina = Math.max(0, this.stamina - this.staminaDrainRate * delta);
            } else {
                this.stamina = Math.min(this.maxStamina, this.stamina + this.staminaRegenRate * delta);
            }
        } else {
            this.stamina = Math.min(this.maxStamina, this.stamina + this.staminaRegenRate * delta);
        }

        this.updateFloatingStaminaBar(camera);

        // Clamp to World Bounds if provided
        if (getMapBoundsFunc) {
            const bounds = getMapBoundsFunc();
            if (bounds) {
                if (this.group.position.x < bounds.minX) { this.group.position.x = bounds.minX; }
                if (this.group.position.x > bounds.maxX) { this.group.position.x = bounds.maxX; }
                if (this.group.position.z < bounds.minZ) { this.group.position.z = bounds.minZ; }
                if (this.group.position.z > bounds.maxZ) { this.group.position.z = bounds.maxZ; }
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

            // Smoothly glide character to target floorY to absorb steps or snap if very close
            const diffY = Math.abs(floorY - this.group.position.y);
            if (diffY < 0.01) {
                this.group.position.y = floorY;
            } else {
                this.group.position.y += (floorY - this.group.position.y) * 15.0 * delta;
            }

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

        this.updateAnimations(delta, isMoving, isMoving ? targetSpeed * analogMag : 0);
    }

    // Will be injected by the environment (e.g. WorldMap or ProceduralMap)
    setMeleeHitCallback(callback) {
        this.onMeleeHit = callback;
    }

    triggerAbyssReset() {
        this.isResetting = true;
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
