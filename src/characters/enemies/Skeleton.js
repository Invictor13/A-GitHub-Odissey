import * as THREE from 'three';

let texLeatherBump, texClothBump;

function createBumpTexture(type, size = 256) {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas'); canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d'); const imgData = ctx.createImageData(size, size);
    for (let i = 0; i < imgData.data.length; i += 4) {
        let val = 128;
        if (type === 'leather') val += (Math.random() * 80) - 40;
        else if (type === 'cloth') { val += (Math.sin((i / 4) % size) * 20) + (Math.cos(Math.floor((i / 4) / size)) * 20); }
        imgData.data[i] = imgData.data[i+1] = imgData.data[i+2] = val; imgData.data[i+3] = 255;
    }
    ctx.putImageData(imgData, 0, 0); const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.RepeatWrapping; return tex;
}

texLeatherBump = createBumpTexture('leather');
texClothBump = createBumpTexture('cloth', 128);

const charBaseParams = { flatShading: true, roughness: 0.85, metalness: 0.05 };
const matBone = new THREE.MeshStandardMaterial({ color: 0xded8c8, ...charBaseParams, roughness: 0.9 });
const matDarkBone = new THREE.MeshStandardMaterial({ color: 0x9b9381, ...charBaseParams, roughness: 0.95 });
const matCloth = new THREE.MeshStandardMaterial({ color: 0x332a22, ...charBaseParams, bumpMap: texClothBump, bumpScale: 0.1 });
const matLeather = new THREE.MeshStandardMaterial({ color: 0x4a2a18, ...charBaseParams, bumpMap: texLeatherBump, bumpScale: 0.08 });
const matSteel = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 0.7, roughness: 0.4, flatShading: true });
const matEyeGlow = new THREE.MeshBasicMaterial({ color: 0x60a5fa });
const matRope = new THREE.MeshStandardMaterial({ color: 0x8a7051, roughness: 1.0 });
const matBlood = new THREE.MeshStandardMaterial({ color: 0x7a0c0c, roughness: 0.9, flatShading: true });

function createPart(geo, mat, x, y, z, rx=0, ry=0, rz=0, parent) {
    const mesh = new THREE.Mesh(geo, mat); mesh.position.set(x, y, z); mesh.rotation.set(rx, ry, rz);
    mesh.castShadow = true; mesh.receiveShadow = true; if(parent) parent.add(mesh); return mesh;
}

export class Skeleton {
    constructor(scene, position) {
        this.scene = scene;
        this.group = new THREE.Group();

        this.animatedCloth = [];

        this.hips = new THREE.Group(); this.hips.position.set(0, 1.15, 0); this.group.add(this.hips);
        this.baseHipsY = 1.15;

        // --- TORSO E COSTELAS ---
        this.torso = new THREE.Group(); this.torso.position.set(0, 0, 0); this.hips.add(this.torso);
        createPart(new THREE.CylinderGeometry(0.08, 0.08, 0.65, 6), matBone, 0, 0.35, -0.05, 0, 0, 0, this.torso);

        for(let i=0; i<4; i++) {
            const h = 0.25 + i * 0.12; const w = 0.35 - i * 0.04;
            createPart(new THREE.TorusGeometry(w, 0.04, 5, 12, Math.PI * 1.2), matBone, 0, h, 0, Math.PI/2, 0.15, Math.PI * 0.9, this.torso);
        }

        // --- CABEÇA ---
        this.headGroup = new THREE.Group(); this.headGroup.position.set(0, 0.75, 0); this.torso.add(this.headGroup);
        const skull = createPart(new THREE.BoxGeometry(0.35, 0.35, 0.4), matBone, 0, 0.15, 0, 0, 0, 0, this.headGroup);
        createPart(new THREE.BoxGeometry(0.1, 0.12, 0.04), matEyeGlow, -0.09, 0.18, 0.19, 0, 0, 0, this.headGroup);
        createPart(new THREE.BoxGeometry(0.1, 0.12, 0.04), matEyeGlow, 0.09, 0.18, 0.19, 0, 0, 0, this.headGroup);
        createPart(new THREE.BoxGeometry(0.06, 0.1, 0.06), matDarkBone, 0, 0.08, 0.2, 0, 0, 0, this.headGroup);
        this.jawGroup = new THREE.Group(); this.jawGroup.position.set(0, 0.0, 0.02); this.headGroup.add(this.jawGroup);
        createPart(new THREE.BoxGeometry(0.28, 0.1, 0.32), matBone, 0, -0.05, 0.05, 0, 0, 0, this.jawGroup);
        for(let i=0; i<3; i++) {
            createPart(new THREE.BoxGeometry(0.04, 0.06, 0.04), matDarkBone, -0.1 + i*0.1, -0.05, 0.2, 0, 0, 0, this.headGroup);
            createPart(new THREE.BoxGeometry(0.04, 0.06, 0.04), matDarkBone, -0.1 + i*0.1, 0.03, 0.22, 0, 0, 0, this.jawGroup);
        }
        createPart(new THREE.CylinderGeometry(0.42, 0.45, 0.15, 12), matCloth, 0, 0.35, -0.05, 0.1, 0, -0.1, this.headGroup);
        createPart(new THREE.CylinderGeometry(0.45, 0.2, 0.35, 12), matCloth, 0, 0.58, -0.15, 0.2, 0, -0.15, this.headGroup);

        // --- BRAÇOS E OMBROS ---
        this.leftShoulder = new THREE.Group(); this.leftShoulder.position.set(-0.35, 0.65, 0); this.torso.add(this.leftShoulder);
        this.rightShoulder = new THREE.Group(); this.rightShoulder.position.set(0.35, 0.65, 0); this.torso.add(this.rightShoulder);
        this.leftElbow = new THREE.Group(); this.leftElbow.position.set(0, -0.35, 0); this.leftShoulder.add(this.leftElbow);
        this.rightElbow = new THREE.Group(); this.rightElbow.position.set(0, -0.35, 0); this.rightShoulder.add(this.rightElbow);
        createPart(new THREE.CylinderGeometry(0.06, 0.05, 0.4, 6), matBone, 0, -0.15, 0, 0, 0, 0, this.leftShoulder);
        createPart(new THREE.CylinderGeometry(0.06, 0.05, 0.4, 6), matBone, 0, -0.15, 0, 0, 0, 0, this.rightShoulder);
        createPart(new THREE.CylinderGeometry(0.05, 0.04, 0.35, 6), matBone, 0, -0.18, 0, 0, 0, 0, this.leftElbow);
        createPart(new THREE.CylinderGeometry(0.05, 0.04, 0.35, 6), matBone, 0, -0.18, 0, 0, 0, 0, this.rightElbow);
        createPart(new THREE.SphereGeometry(0.07, 6, 6), matDarkBone, 0, 0, 0, 0, 0, 0, this.leftElbow);
        createPart(new THREE.SphereGeometry(0.07, 6, 6), matDarkBone, 0, 0, 0, 0, 0, 0, this.rightElbow);
        createPart(new THREE.BoxGeometry(0.12, 0.16, 0.15), matBone, 0, -0.4, 0, 0, 0, 0, this.leftElbow);
        createPart(new THREE.BoxGeometry(0.12, 0.16, 0.15), matBone, 0, -0.4, 0, 0, 0, 0, this.rightElbow);

        createPart(new THREE.BoxGeometry(0.25, 0.3, 0.25), matCloth, 0, -0.1, 0, 0, 0, 0.1, this.rightShoulder);
        createPart(new THREE.TorusGeometry(0.08, 0.02, 4, 8), matRope, 0, -0.28, 0, Math.PI/2, 0, 0, this.rightShoulder);
        createPart(new THREE.TorusGeometry(0.07, 0.02, 4, 8), matRope, 0, -0.1, 0, Math.PI/2, 0, 0, this.rightElbow);

        // --- ARMA: MACHADO FERRUGENTO ---
        const weaponGroup = new THREE.Group(); weaponGroup.position.set(0, -0.4, 0.15); weaponGroup.rotation.x = Math.PI / 2; this.rightElbow.add(weaponGroup);
        createPart(new THREE.CylinderGeometry(0.03, 0.03, 1.4, 6), matLeather, 0, 0.3, 0, 0, 0, 0, weaponGroup);
        createPart(new THREE.BoxGeometry(0.08, 0.15, 0.25), matLeather, 0, 0.9, -0.05, -0.2, 0, 0, weaponGroup);
        createPart(new THREE.CylinderGeometry(0.04, 0.01, 0.4, 4), matSteel, 0, 0.9, 0.25, Math.PI/2, 0, 0, weaponGroup);
        const axeBladeGeo = new THREE.BufferGeometry();
        const axeVerts = new Float32Array([0,0,-0.15, 0,0.4,0.3, 0,-0.2,0.3, 0.04,0,-0.15, 0.04,0.4,0.3, 0.04,-0.2,0.3]);
        axeBladeGeo.setAttribute('position', new THREE.BufferAttribute(axeVerts, 3)); axeBladeGeo.setIndex([0,2,1, 3,4,5, 0,1,4,0,4,3, 1,2,5,1,5,4, 2,0,3,2,3,5]); axeBladeGeo.computeVertexNormals();
        createPart(axeBladeGeo, matBlood, 0, 0.9, 0.1, 0, 0, 0, weaponGroup);

        // --- BACIA E PERNAS ---
        createPart(new THREE.BoxGeometry(0.35, 0.15, 0.22), matBone, 0, 0, 0, 0, 0, 0, this.hips);
        this.leftHip = new THREE.Group(); this.leftHip.position.set(-0.16, -0.1, 0); this.hips.add(this.leftHip);
        this.rightHip = new THREE.Group(); this.rightHip.position.set(0.16, -0.1, 0); this.hips.add(this.rightHip);
        this.leftKnee = new THREE.Group(); this.leftKnee.position.set(0, -0.45, 0); this.leftHip.add(this.leftKnee);
        this.rightKnee = new THREE.Group(); this.rightKnee.position.set(0, -0.45, 0); this.rightHip.add(this.rightKnee);
        createPart(new THREE.CylinderGeometry(0.07, 0.05, 0.5, 6), matBone, 0, -0.22, 0, 0, 0, 0, this.leftHip);
        createPart(new THREE.CylinderGeometry(0.07, 0.05, 0.5, 6), matBone, 0, -0.22, 0, 0, 0, 0, this.rightHip);
        createPart(new THREE.CylinderGeometry(0.05, 0.04, 0.45, 6), matBone, 0, -0.22, 0, 0, 0, 0, this.leftKnee);
        createPart(new THREE.CylinderGeometry(0.05, 0.04, 0.45, 6), matBone, 0, -0.22, 0, 0, 0, 0, this.rightKnee);
        createPart(new THREE.SphereGeometry(0.08, 6, 6), matDarkBone, 0, 0, 0, 0, 0, 0, this.leftKnee);
        createPart(new THREE.SphereGeometry(0.08, 6, 6), matDarkBone, 0, 0, 0, 0, 0, 0, this.rightKnee);
        createPart(new THREE.BoxGeometry(0.14, 0.1, 0.35), matBone, 0, -0.48, 0.08, 0, 0, 0, this.leftKnee);
        createPart(new THREE.BoxGeometry(0.14, 0.1, 0.35), matBone, 0, -0.48, 0.08, 0, 0, 0, this.rightKnee);

        // --- FARRAPOS DE PANO ---
        const coatGroup = new THREE.Group(); coatGroup.position.set(0, 0.1, 0); this.hips.add(coatGroup);
        const flapGeo = new THREE.BoxGeometry(0.2, 0.8, 0.04); flapGeo.translate(0, -0.4, 0);
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2; const x = Math.sin(angle) * 0.25; const z = Math.cos(angle) * 0.25;
            const flap = createPart(flapGeo, matCloth, x, 0, z, 0.1, angle, 0, coatGroup);
            this.animatedCloth.push({ mesh: flap, baseRx: 0.1, baseRy: angle, offset: i * 0.4, reactY: 2.0, reactDrag: 0.8, reactRun: 1.5, reactAttack: 1.0 });
        }

        this.group.position.copy(position);
        this.scene.add(this.group);

        this.hp = 30;
        this.animTime = Math.random() * 10;
    }

    update(delta, playerPos) {
        if (this.hp <= 0) return;
        this.animTime += delta * 15; // Animation speed

        // Simple chase logic
        let isMoving = false;
        if (playerPos) {
            const dir = new THREE.Vector3().subVectors(playerPos, this.group.position);
            dir.y = 0;
            if (dir.length() > 0.5) {
                dir.normalize();
                this.group.position.addScaledVector(dir, 2 * delta);
                this.group.rotation.y = Math.atan2(dir.x, dir.z);
                isMoving = true;
            }
        }

        const lerpSpeed = 10 * delta;

        // Procedural Animations
        const speedFactor = isMoving ? 1.0 : 0.0;
        const runBounce = Math.sin(this.animTime) * 0.22 * speedFactor;
        const windDrag = isMoving ? 0.38 : 0.0;

        // Cloth physics
        this.animatedCloth.forEach(cloth => {
            const wind = Math.sin(this.animTime * 0.25 + cloth.offset) * 0.08;
            let targetRx = cloth.baseRx + wind;
            let targetRz = cloth.baseRy + Math.cos(this.animTime * 0.2 + cloth.offset) * 0.04; // Used baseRy for Rz base? Concept had baseRz, let's just add wind

            targetRx += windDrag * cloth.reactDrag;
            targetRx += runBounce * cloth.reactRun;

            cloth.mesh.rotation.x += (targetRx - cloth.mesh.rotation.x) * 14 * delta;
            cloth.mesh.rotation.z += (Math.cos(this.animTime * 0.2 + cloth.offset) * 0.04 - cloth.mesh.rotation.z) * 14 * delta;
        });

        if (!isMoving) {
            const breath = Math.sin(this.animTime * 0.15) * 0.03;
            this.hips.position.y = THREE.MathUtils.lerp(this.hips.position.y, this.baseHipsY + breath, lerpSpeed);

            this.torso.rotation.x = THREE.MathUtils.lerp(this.torso.rotation.x, 0.15 + breath * 0.4, lerpSpeed);
            this.headGroup.rotation.x = THREE.MathUtils.lerp(this.headGroup.rotation.x, -0.08, lerpSpeed);
            this.headGroup.rotation.y = THREE.MathUtils.lerp(this.headGroup.rotation.y, Math.sin(this.animTime * 0.08) * 0.18, lerpSpeed);

            this.jawGroup.rotation.x = THREE.MathUtils.lerp(this.jawGroup.rotation.x, Math.sin(this.animTime * 0.3) * 0.05, lerpSpeed);

            this.leftShoulder.rotation.x = THREE.MathUtils.lerp(this.leftShoulder.rotation.x, 0.2, lerpSpeed);
            this.rightShoulder.rotation.x = THREE.MathUtils.lerp(this.rightShoulder.rotation.x, -0.35, lerpSpeed);
            this.rightElbow.rotation.x = THREE.MathUtils.lerp(this.rightElbow.rotation.x, -0.7, lerpSpeed);

            this.leftHip.rotation.x = THREE.MathUtils.lerp(this.leftHip.rotation.x, -0.15, lerpSpeed);
            this.rightHip.rotation.x = THREE.MathUtils.lerp(this.rightHip.rotation.x, -0.15, lerpSpeed);
            this.leftKnee.rotation.x = THREE.MathUtils.lerp(this.leftKnee.rotation.x, 0.3, lerpSpeed);
            this.rightKnee.rotation.x = THREE.MathUtils.lerp(this.rightKnee.rotation.x, 0.3, lerpSpeed);
        } else {
            const bob = Math.abs(Math.sin(this.animTime)) * 0.12;
            this.hips.position.y = THREE.MathUtils.lerp(this.hips.position.y, this.baseHipsY - 0.06 + bob, lerpSpeed);

            this.torso.rotation.x = THREE.MathUtils.lerp(this.torso.rotation.x, 0.35, lerpSpeed);
            this.headGroup.rotation.x = THREE.MathUtils.lerp(this.headGroup.rotation.x, -0.2, lerpSpeed);

            const legAngle = Math.sin(this.animTime) * 0.75;
            this.leftHip.rotation.x = legAngle;
            this.rightHip.rotation.x = -legAngle;

            this.leftKnee.rotation.x = legAngle > 0 ? 0.8 : 0.2;
            this.rightKnee.rotation.x = legAngle < 0 ? 0.8 : 0.2;

            this.leftShoulder.rotation.x = -legAngle * 0.8;
            this.rightShoulder.rotation.x = legAngle * 0.8 - 0.2;
            this.rightElbow.rotation.x = -0.9;
        }
    }

    takeDamage(amount) {
        this.hp -= amount;
        if (this.hp <= 0) {
            this.destroy();
        }
    }

    destroy() {
        if (this.group.parent) {
            this.group.parent.remove(this.group);
        }
    }
}
