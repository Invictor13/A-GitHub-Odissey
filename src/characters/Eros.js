import * as THREE from 'three';

export class Eros {
    constructor(scene, position = new THREE.Vector3()) {
        this.scene = scene;
        this.group = new THREE.Group();
        this.group.position.copy(position);
        this.scene.add(this.group);

        this.bodyGroup = new THREE.Group();
        this.group.add(this.bodyGroup);

        // Torso Group
        this.torsoGroup = new THREE.Group();
        this.torsoGroup.position.set(0, 0.75, 0);
        this.bodyGroup.add(this.torsoGroup);

        this.particles = [];
        this.actionState = 'none';
        this.animTime = 0;

        this.earRotL = { rx: 0, rz: 0 };
        this.earRotR = { rx: 0, rz: 0 };
        this.earVelL = { rx: 0, rz: 0 };
        this.earVelR = { rx: 0, rz: 0 };

        this.setupMaterials();
        this.buildModel();
    }

    createBumpTexture(type, size = 256) {
        const canvas = document.createElement('canvas');
        canvas.width = size; canvas.height = size;
        const ctx = canvas.getContext('2d');
        const imgData = ctx.createImageData(size, size);

        for (let i = 0; i < imgData.data.length; i += 4) {
            let val = 128;
            if (type === 'fur') {
                val += (Math.random() * 30) - 15;
            } else if (type === 'leather') {
                val += (Math.sin((i / 4) * 0.1) * 15) + (Math.random() * 20 - 10);
            }
            imgData.data[i] = imgData.data[i+1] = imgData.data[i+2] = val;
            imgData.data[i+3] = 255;
        }
        ctx.putImageData(imgData, 0, 0);
        const tex = new THREE.CanvasTexture(canvas);
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        return tex;
    }

    setupMaterials() {
        this.texFurBump = this.createBumpTexture('fur', 256);
        this.texLeatherBump = this.createBumpTexture('leather', 128);

        this.matBlackFur = new THREE.MeshStandardMaterial({
            color: 0x1a1a20,
            roughness: 0.65,
            metalness: 0.1,
            bumpMap: this.texFurBump,
            bumpScale: 0.025
        });

        this.matSnoutDark = new THREE.MeshStandardMaterial({ color: 0x111115, roughness: 0.85 });
        this.matNoseWet = new THREE.MeshStandardMaterial({ color: 0x050508, roughness: 0.15, metalness: 0.4 });
        this.matInnerEar = new THREE.MeshStandardMaterial({ color: 0x483236, roughness: 0.8 });

        this.matBeltLeather = new THREE.MeshStandardMaterial({ color: 0x482615, bumpMap: this.texLeatherBump, bumpScale: 0.08, roughness: 0.55 });
        this.matBrass = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.85, roughness: 0.2 });
        this.matSteel = new THREE.MeshStandardMaterial({ color: 0xb5b5c0, metalness: 0.9, roughness: 0.2 });
        this.matTapeYellow = new THREE.MeshStandardMaterial({ color: 0xffaa00, roughness: 0.3 });
        this.matRolledBp = new THREE.MeshStandardMaterial({ color: 0x1a66ff, roughness: 0.5 });

        this.matEyeWhite = new THREE.MeshStandardMaterial({ color: 0xffffff });
        this.matEyeIris = new THREE.MeshStandardMaterial({ color: 0x422411 });
        this.matEyePupil = new THREE.MeshBasicMaterial({ color: 0x000000 });
        this.matEyeShine = new THREE.MeshBasicMaterial({ color: 0xffffff });
        this.matTongue = new THREE.MeshStandardMaterial({ color: 0xff5577, roughness: 0.5 });

        this.matBarkWave = new THREE.MeshBasicMaterial({ color: 0xffd700, transparent: true, opacity: 0.85 });
        this.matSmoke = new THREE.MeshBasicMaterial({ color: 0xdddddd, transparent: true, opacity: 0.5 });
        this.particleGeo = new THREE.BoxGeometry(0.08, 0.08, 0.08);
    }

    createMesh(geo, mat, x=0, y=0, z=0, rx=0, ry=0, rz=0, parent=null) {
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(x, y, z);
        mesh.rotation.set(rx, ry, rz);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        if (parent) parent.add(mesh);
        return mesh;
    }

    buildModel() {
        // A) CORPO PRINCIPAL
        this.bodyCylinder = this.createMesh(new THREE.CylinderGeometry(0.44, 0.38, 0.85, 16), this.matBlackFur, 0, 0.02, -0.05, Math.PI / 2, 0, 0, this.torsoGroup);

        // B) ESFERA PARRODA DO PEITORAL
        this.chestSphere = this.createMesh(new THREE.SphereGeometry(0.55, 16, 16), this.matBlackFur, 0, 0.05, 0.28, 0, 0, 0, this.torsoGroup);
        this.chestSphere.scale.set(1.15, 1.0, 1.08);

        // C) RABINHO
        this.tailPivot = new THREE.Group();
        this.tailPivot.position.set(0, 0.12, -0.48);
        this.torsoGroup.add(this.tailPivot);
        this.createMesh(new THREE.CapsuleGeometry(0.08, 0.1, 4, 8), this.matBlackFur, 0, 0, -0.06, -0.6, 0, 0, this.tailPivot);

        // D) CINTO DE UTILITÁRIOS
        this.belt = this.createMesh(new THREE.CylinderGeometry(0.46, 0.46, 0.15, 16), this.matBeltLeather, 0, 0.02, 0, Math.PI / 2, 0, 0, this.torsoGroup);
        this.belt.scale.set(1.08, 1.0, 1.08);
        this.createMesh(new THREE.BoxGeometry(0.18, 0.06, 0.18), this.matBrass, 0, 0.48, 0, 0, 0, 0, this.belt); // Fivela

        // Ferramentas no cinto
        const hammer = new THREE.Group(); hammer.position.set(-0.48, 0.1, -0.05); hammer.rotation.x = -0.3; this.belt.add(hammer);
        this.createMesh(new THREE.CylinderGeometry(0.025, 0.025, 0.35, 6), this.matBeltLeather, 0, -0.1, 0, 0, 0, 0, hammer);
        this.createMesh(new THREE.BoxGeometry(0.16, 0.07, 0.07), this.matSteel, 0, 0.06, 0, 0, 0, 0, hammer);

        const wrench = new THREE.Group(); wrench.position.set(0.48, 0.1, -0.05); wrench.rotation.x = 0.3; this.belt.add(wrench);
        this.createMesh(new THREE.CylinderGeometry(0.024, 0.024, 0.32, 6), this.matSteel, 0, -0.08, 0, 0, 0, 0, wrench);
        this.createMesh(new THREE.TorusGeometry(0.055, 0.018, 6, 12), this.matSteel, 0, 0.08, 0, Math.PI/2, 0, 0, wrench);

        this.createMesh(new THREE.BoxGeometry(0.12, 0.12, 0.12), this.matTapeYellow, 0.35, 0.32, 0.05, 0, 0, 0, this.belt);
        this.createMesh(new THREE.CylinderGeometry(0.055, 0.055, 0.45, 10), this.matRolledBp, -0.38, 0.3, -0.05, 0, 0, Math.PI/4, this.belt);

        const pocketWatch = new THREE.Group(); pocketWatch.position.set(0, 0.2, 0.45); this.belt.add(pocketWatch);
        this.createMesh(new THREE.CylinderGeometry(0.065, 0.065, 0.025, 12), this.matBrass, 0, 0, 0, 0, 0, 0, pocketWatch);
        this.createMesh(new THREE.CylinderGeometry(0.05, 0.05, 0.03, 12), this.matEyeWhite, 0, 0.005, 0, 0, 0, 0, pocketWatch);

        // E) PESCOÇO
        this.neckGroup = new THREE.Group();
        this.neckGroup.position.set(0, 0.25, 0.42);
        this.torsoGroup.add(this.neckGroup);
        this.createMesh(new THREE.CylinderGeometry(0.38, 0.46, 0.32, 12), this.matBlackFur, 0, 0.1, 0, 0.25, 0, 0, this.neckGroup);

        this.headPivot = new THREE.Group();
        this.headPivot.position.set(0, 0.22, 0.1);
        this.neckGroup.add(this.headPivot);

        // F) CABEÇA
        const headBase = this.createMesh(new THREE.SphereGeometry(0.46, 16, 16), this.matBlackFur, 0, 0.22, 0, 0, 0, 0, this.headPivot);
        headBase.scale.set(1.15, 0.95, 1.05);

        // Bochechas
        this.createMesh(new THREE.SphereGeometry(0.28, 12, 12), this.matBlackFur, -0.3, 0.08, 0.16, 0, 0, 0, this.headPivot);
        this.createMesh(new THREE.SphereGeometry(0.28, 12, 12), this.matBlackFur, 0.3, 0.08, 0.16, 0, 0, 0, this.headPivot);

        // Focinho
        this.snoutGroup = new THREE.Group();
        this.snoutGroup.position.set(0, 0.1, 0.38);
        this.headPivot.add(this.snoutGroup);
        this.createMesh(new THREE.BoxGeometry(0.44, 0.22, 0.24), this.matSnoutDark, 0, 0, 0, 0.08, 0, 0, this.snoutGroup);
        this.noseMesh = this.createMesh(new THREE.BoxGeometry(0.2, 0.13, 0.11), this.matNoseWet, 0, 0.05, 0.13, 0, 0, 0, this.snoutGroup);

        // Mandíbula
        this.jawPivot = new THREE.Group();
        this.jawPivot.position.set(0, -0.05, 0.28);
        this.headPivot.add(this.jawPivot);
        this.createMesh(new THREE.BoxGeometry(0.36, 0.09, 0.22), this.matSnoutDark, 0, -0.04, 0.04, 0, 0, 0, this.jawPivot);
        this.tongue = this.createMesh(new THREE.BoxGeometry(0.16, 0.03, 0.22), this.matTongue, 0, -0.01, 0.08, 0.15, 0, 0, this.jawPivot);
        this.tongue.scale.set(1, 1, 0);

        // Olhos
        this.eyeL = new THREE.Group(); this.eyeL.position.set(-0.25, 0.28, 0.34); this.headPivot.add(this.eyeL);
        this.eyeR = new THREE.Group(); this.eyeR.position.set(0.25, 0.28, 0.34); this.headPivot.add(this.eyeR);

        const buildEye = (parent) => {
            this.createMesh(new THREE.SphereGeometry(0.11, 10, 10), this.matEyeWhite, 0, 0, 0, 0, 0, 0, parent);
            this.createMesh(new THREE.SphereGeometry(0.075, 10, 10), this.matEyeIris, 0, 0, 0.05, 0, 0, 0, parent);
            this.createMesh(new THREE.SphereGeometry(0.04, 8, 8), this.matEyePupil, 0, 0, 0.075, 0, 0, 0, parent);
            this.createMesh(new THREE.SphereGeometry(0.02, 6, 6), this.matEyeShine, 0.02, 0.02, 0.09, 0, 0, 0, parent);
        }
        buildEye(this.eyeL); buildEye(this.eyeR);

        // Rugas da Testa
        this.createMesh(new THREE.BoxGeometry(0.5, 0.07, 0.14), this.matBlackFur, 0, 0.44, 0.34, 0.2, 0, 0, this.headPivot);

        // G) ORELHAS DE MORCEGO
        this.earPivotL = new THREE.Group(); this.earPivotL.position.set(-0.35, 0.5, 0.0); this.headPivot.add(this.earPivotL);
        this.earPivotR = new THREE.Group(); this.earPivotR.position.set(0.35, 0.5, 0.0); this.headPivot.add(this.earPivotR);

        const buildBatEar = (parent, isLeft) => {
            const earGroup = new THREE.Group();
            const sign = isLeft ? -1 : 1;
            const outer = this.createMesh(new THREE.ConeGeometry(0.22, 0.68, 6), this.matBlackFur, 0, 0.32, 0, 0, 0, sign * 0.15, earGroup);
            outer.scale.set(1.1, 1.0, 0.35);
            const inner = this.createMesh(new THREE.ConeGeometry(0.16, 0.56, 6), this.matInnerEar, 0, 0.3, 0.03, 0, 0, sign * 0.08, earGroup);
            inner.scale.set(1.0, 0.95, 0.25);
            parent.add(earGroup);
        }
        buildBatEar(this.earPivotL, true);
        buildBatEar(this.earPivotR, false);

        this.earPivotL.rotation.set(0.08, 0.2, -0.38);
        this.earPivotR.rotation.set(0.08, -0.2, 0.38);

        // H) PATAS SEGMENTADAS
        this.legFL = new THREE.Group(); this.legFL.position.set(-0.44, 0, 0.32); this.torsoGroup.add(this.legFL);
        this.legFR = new THREE.Group(); this.legFR.position.set(0.44, 0, 0.32); this.torsoGroup.add(this.legFR);
        this.legBL = new THREE.Group(); this.legBL.position.set(-0.4, 0, -0.32); this.torsoGroup.add(this.legBL);
        this.legBR = new THREE.Group(); this.legBR.position.set(0.4, 0, -0.32); this.torsoGroup.add(this.legBR);

        const buildSegmentedLeg = (parent, isFront) => {
            const shoulderGroup = new THREE.Group();
            parent.add(shoulderGroup);
            const shoulderMesh = this.createMesh(new THREE.SphereGeometry(0.19, 12, 12), this.matBlackFur, 0, -0.08, 0, 0, 0, 0, shoulderGroup);
            shoulderMesh.scale.set(1.15, 1.25, 1.15);

            const shinGroup = new THREE.Group();
            shinGroup.position.set(0, -0.22, 0);
            shoulderGroup.add(shinGroup);
            this.createMesh(new THREE.SphereGeometry(0.13, 10, 10), this.matBlackFur, 0, 0, 0, 0, 0, 0, shinGroup);
            this.createMesh(new THREE.CylinderGeometry(0.15, 0.12, 0.28, 10), this.matBlackFur, 0, -0.14, 0, 0, 0, 0, shinGroup);

            const pawGroup = new THREE.Group();
            pawGroup.position.set(0, -0.28, 0);
            shinGroup.add(pawGroup);
            this.createMesh(new THREE.SphereGeometry(0.11, 8, 8), this.matBlackFur, 0, 0, 0, 0, 0, 0, pawGroup);
            const pawMesh = this.createMesh(new THREE.BoxGeometry(0.24, 0.12, 0.28), this.matBlackFur, 0, -0.06, 0.05, 0, 0, 0, pawGroup);

            this.createMesh(new THREE.SphereGeometry(0.06, 8, 8), this.matBlackFur, -0.07, -0.05, 0.16, 0, 0, 0, pawMesh);
            this.createMesh(new THREE.SphereGeometry(0.065, 8, 8), this.matBlackFur, 0, -0.05, 0.17, 0, 0, 0, pawMesh);
            this.createMesh(new THREE.SphereGeometry(0.06, 8, 8), this.matBlackFur, 0.07, -0.05, 0.16, 0, 0, 0, pawMesh);

            this.createMesh(new THREE.BoxGeometry(0.028, 0.028, 0.06), this.matSnoutDark, -0.07, -0.03, 0.2, 0, 0, 0, pawMesh);
            this.createMesh(new THREE.BoxGeometry(0.028, 0.028, 0.06), this.matSnoutDark, 0, -0.03, 0.21, 0, 0, 0, pawMesh);
            this.createMesh(new THREE.BoxGeometry(0.028, 0.028, 0.06), this.matSnoutDark, 0.07, -0.03, 0.2, 0, 0, 0, pawMesh);

            return { shoulderGroup, shinGroup, pawGroup };
        };

        this.legDataFL = buildSegmentedLeg(this.legFL, true);
        this.legDataFR = buildSegmentedLeg(this.legFR, true);
        this.legDataBL = buildSegmentedLeg(this.legBL, false);
        this.legDataBR = buildSegmentedLeg(this.legBR, false);
    }

    spawnVFX(pos, type, count) {
        for (let i = 0; i < count; i++) {
            const p = new THREE.Mesh(this.particleGeo, type === 'bark' ? this.matBarkWave : this.matSmoke);
            p.position.copy(pos);
            const speed = type === 'bark' ? 6.5 : 1.8;
            p.userData = {
                vel: new THREE.Vector3((Math.random()-0.5)*speed, (Math.random()*speed*0.4), (Math.random()-0.5)*speed),
                life: 1.0,
                type
            };
            this.scene.add(p);
            this.particles.push(p);
        }
    }

    bark() {
        if (this.actionState !== 'none') return;
        this.actionState = 'bark';
        const nosePos = new THREE.Vector3(); this.noseMesh.getWorldPosition(nosePos);
        this.spawnVFX(nosePos, 'bark', 10);
        this.earVelL.rz -= 1.6; this.earVelR.rz += 1.6;
        setTimeout(() => { if (this.actionState === 'bark') this.actionState = 'none'; }, 550);
    }

    snort() {
        if (this.actionState !== 'none') return;
        this.actionState = 'snort';
        const nosePos = new THREE.Vector3(); this.noseMesh.getWorldPosition(nosePos);
        this.spawnVFX(nosePos, 'snort', 12);
        setTimeout(() => { if (this.actionState === 'snort') this.actionState = 'none'; }, 850);
    }

    inspect() {
        if (this.actionState !== 'none') return;
        this.actionState = 'inspect';
        setTimeout(() => { if (this.actionState === 'inspect') this.actionState = 'none'; }, 2400);
    }

    sit() {
        this.actionState = this.actionState === 'sit' ? 'none' : 'sit';
    }

    sleep() {
        this.actionState = this.actionState === 'sleep' ? 'none' : 'sleep';
    }

    wiggleEars() {
        this.earVelL.rx += (Math.random() - 0.5) * 3.5;
        this.earVelL.rz += (Math.random() - 0.5) * 3.5;
        this.earVelR.rx += (Math.random() - 0.5) * 3.5;
        this.earVelR.rz += (Math.random() - 0.5) * 3.5;
    }

    update(delta, isMoving = false, isRunning = false) {
        this.animTime += delta;

        // Reset base states
        this.bodyGroup.position.set(0, 0, 0); this.bodyGroup.rotation.set(0, 0, 0);
        this.torsoGroup.rotation.set(0, 0, 0);
        this.headPivot.rotation.set(0, 0, 0);
        this.jawPivot.rotation.x = 0; this.tongue.scale.z = 0;
        this.tailPivot.rotation.y = Math.sin(this.animTime * 10) * 0.35;

        this.legDataFL.shinGroup.rotation.x = 0;
        this.legDataFR.shinGroup.rotation.x = 0;
        this.legDataBL.shinGroup.rotation.x = 0;
        this.legDataBR.shinGroup.rotation.x = 0;

        // FÍSICA DE MOLA DAS ORELHAS
        const kSpring = 48.0, kDamping = 6.5;

        const forceLx = -kSpring * this.earRotL.rx - kDamping * this.earVelL.rx;
        const forceLz = -kSpring * this.earRotL.rz - kDamping * this.earVelL.rz;
        this.earVelL.rx += forceLx * delta; this.earVelL.rz += forceLz * delta;
        this.earRotL.rx += this.earVelL.rx * delta; this.earRotL.rz += this.earVelL.rz * delta;

        const forceRx = -kSpring * this.earRotR.rx - kDamping * this.earVelR.rx;
        const forceRz = -kSpring * this.earRotR.rz - kDamping * this.earVelR.rz;
        this.earVelR.rx += forceRx * delta; this.earVelR.rz += forceRz * delta;
        this.earRotR.rx += this.earVelR.rx * delta; this.earRotR.rz += this.earVelR.rz * delta;

        this.earPivotL.rotation.set(0.08 + this.earRotL.rx, 0.2, -0.38 + this.earRotL.rz);
        this.earPivotR.rotation.set(0.08 + this.earRotR.rx, -0.2, 0.38 + this.earRotR.rz);

        if (this.actionState === 'bark') {
            this.headPivot.rotation.x = -0.35;
            this.jawPivot.rotation.x = 0.45;
            this.tongue.scale.z = 1.0;
            this.torsoGroup.rotation.x = 0.15;
            this.bodyGroup.position.y = Math.abs(Math.sin(this.animTime * 20)) * 0.1;
        }
        else if (this.actionState === 'snort') {
            this.headPivot.rotation.x = 0.18;
            this.tailPivot.rotation.y = Math.sin(this.animTime * 28) * 0.75;
        }
        else if (this.actionState === 'inspect') {
            // Adapted position for when it's attached to the global scene instead of origin
            this.bodyGroup.position.set(-0.2, -0.1, 0.3);
            this.torsoGroup.rotation.y = -Math.PI / 4;
            this.headPivot.rotation.set(0.35, -0.25, 0);
            this.tailPivot.rotation.y = Math.sin(this.animTime * 5) * 0.15;
        }
        else if (this.actionState === 'sit') {
            this.bodyGroup.position.y = -0.25;
            this.torsoGroup.rotation.x = -0.35;
            this.legBL.rotation.x = -0.8; this.legBR.rotation.x = -0.8;
            this.legFL.rotation.x = 0.35; this.legFR.rotation.x = 0.35;
            this.legDataBL.shinGroup.rotation.x = 0.4;
            this.legDataBR.shinGroup.rotation.x = 0.4;
            this.headPivot.rotation.x = 0.35;
        }
        else if (this.actionState === 'sleep') {
            this.bodyGroup.position.y = -0.42;
            this.legBL.rotation.x = -1.2; this.legBR.rotation.x = -1.2;
            this.legFL.rotation.x = 1.2; this.legFR.rotation.x = 1.2;
            this.headPivot.rotation.set(0.2, 0.3, 0.1);
            this.eyeL.scale.y = 0.1; this.eyeR.scale.y = 0.1;
        }
        else if (isMoving) {
            const speedMult = isRunning ? 20 : 13;
            const bounce = Math.abs(Math.sin(this.animTime * speedMult)) * (isRunning ? 0.18 : 0.08);
            this.bodyGroup.position.y = bounce;

            const legCycle = Math.sin(this.animTime * speedMult);

            this.legFL.rotation.x = legCycle * 0.65;
            this.legBR.rotation.x = legCycle * 0.65;
            this.legFR.rotation.x = -legCycle * 0.65;
            this.legBL.rotation.x = -legCycle * 0.65;

            this.legDataFL.shinGroup.rotation.x = legCycle > 0 ? legCycle * 0.35 : 0;
            this.legDataBR.shinGroup.rotation.x = legCycle > 0 ? legCycle * 0.35 : 0;
            this.legDataFR.shinGroup.rotation.x = -legCycle > 0 ? -legCycle * 0.35 : 0;
            this.legDataBL.shinGroup.rotation.x = -legCycle > 0 ? -legCycle * 0.35 : 0;

            this.tailPivot.rotation.y = Math.sin(this.animTime * speedMult * 1.4) * 0.6;
            this.headPivot.rotation.x = Math.sin(this.animTime * speedMult) * 0.05;

            this.earVelL.rz += Math.sin(this.animTime * speedMult) * 0.12;
            this.earVelR.rz -= Math.sin(this.animTime * speedMult) * 0.12;
        } else {
            const breath = Math.sin(this.animTime * 3.5) * 0.018;
            this.bodyGroup.position.y = breath;
            this.eyeL.scale.y = 1.0; this.eyeR.scale.y = 1.0;

            this.legFL.rotation.x = 0;
            this.legBR.rotation.x = 0;
            this.legFR.rotation.x = 0;
            this.legBL.rotation.x = 0;

            if (Math.random() < 0.008) this.wiggleEars();
        }

        // Update particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.userData.life -= delta * 2.2;
            p.position.add(p.userData.vel.clone().multiplyScalar(delta));
            p.scale.setScalar(Math.max(0, p.userData.life));
            if (p.userData.life <= 0) {
                this.scene.remove(p);
                this.particles.splice(i, 1);
            }
        }
    }
}
