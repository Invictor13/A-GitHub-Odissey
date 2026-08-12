import * as THREE from 'three';

export class NPCBase {
    constructor(scene, position, type = 'NPC') {
        this.scene = scene;
        this.type = type;
        this.group = new THREE.Group();
        if (position) {
            this.group.position.copy(position);
        }

        // Stats
        this.hp = 50;
        this.maxHp = 50;
        this.isDead = false;

        // Physics
        this.velocityY = 0;

        // Interaction
        this.group.userData = {
            interactable: true,
            name: this.getDisplayName(),
            type: 'NPC',
            npcInstance: this
        };

        this.scene.add(this.group);

        // Base visuals (to be overridden by subclasses)
        this.meshGroup = new THREE.Group();
        this.group.add(this.meshGroup);

        this.animTime = 0; this.prevPos = new THREE.Vector3(); if(position) this.prevPos.copy(position);
        this.buildModel();
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
    }

    createPart(geo, mat, x, y, z, rx=0, ry=0, rz=0, parent) {
        const mesh = new THREE.Mesh(geo, mat); mesh.position.set(x, y, z); mesh.rotation.set(rx, ry, rz);
        mesh.castShadow = true; mesh.receiveShadow = true; if(parent) parent.add(mesh); return mesh;
    }

    buildHumanoid() {
        this.setupMaterials();

        this.bodyGroup = new THREE.Group();
        this.meshGroup.add(this.bodyGroup);
        this.meshGroup.scale.setScalar(0.55);

        this.torso = this.createPart(new THREE.CylinderGeometry(0.75, 0.8, 1.6, 10), this.matShirt, 0, 2.5, 0, 0, 0, 0, this.bodyGroup);
        this.torso.scale.set(1.2, 1, 0.95);

        // HEAD
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

        // ARMS
        this.shoulderL = new THREE.Group(); this.shoulderL.position.set(-1.35, 3.0, 0); this.bodyGroup.add(this.shoulderL);
        this.shoulderR = new THREE.Group(); this.shoulderR.position.set(1.35, 3.0, 0); this.bodyGroup.add(this.shoulderR);
        this.elbowL = new THREE.Group(); this.elbowL.position.set(0, -0.7, 0); this.shoulderL.add(this.elbowL);
        this.elbowR = new THREE.Group(); this.elbowR.position.set(0, -0.7, 0); this.shoulderR.add(this.elbowR);

        this.createPart(new THREE.CylinderGeometry(0.28, 0.25, 0.8, 8), this.matShirt, 0, -0.3, 0, 0, 0, 0, this.shoulderL);
        this.createPart(new THREE.CylinderGeometry(0.28, 0.25, 0.8, 8), this.matShirt, 0, -0.3, 0, 0, 0, 0, this.shoulderR);
        this.createPart(new THREE.CylinderGeometry(0.28, 0.24, 0.7, 8), this.matLeatherDark, 0, -0.3, 0, 0, 0, 0, this.elbowL);
        this.createPart(new THREE.CylinderGeometry(0.28, 0.24, 0.7, 8), this.matLeatherDark, 0, -0.3, 0, 0, 0, 0, this.elbowR);

        this.handL = this.createPart(new THREE.IcosahedronGeometry(0.3, 1), this.matSkin, 0, -0.75, 0, 0, 0, 0, this.elbowL);
        this.handR = this.createPart(new THREE.IcosahedronGeometry(0.3, 1), this.matSkin, 0, -0.75, 0, 0, 0, 0, this.elbowR);

        // LEGS
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
    }
    getDisplayName() {
        return "Unknown Traveler";
    }

    buildModel() {
        // Default placeholder model (a simple cylinder)
        const geo = new THREE.CylinderGeometry(0.3, 0.3, 1.8, 8);
        const mat = new THREE.MeshStandardMaterial({ color: 0x888888 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.y = 0.9;
        this.meshGroup.add(mesh);
    }

    update(delta, playerContext, getFloorFunc, checkCollisionFunc, enemyManager) {
        if (this.isDead) return;

        if (!this.group.position || this.group.position.x === undefined || this.group.position.z === undefined || isNaN(this.group.position.x) || isNaN(this.group.position.z)) {
            if (this.spawnPosition) {
                this.group.position.copy(this.spawnPosition);
            } else {
                return;
            }
        }

        // Basic Gravity

        this.animTime += delta;
        if(this.bodyGroup) {
            // Idle breathing
            this.bodyGroup.position.y = Math.sin(this.animTime * 2) * 0.05;
            this.shoulderL.rotation.set(0.1, 0, -0.2);
            this.shoulderR.rotation.set(0.1, 0, 0.2);

            // Basic walk cycle if moved
            const moveDist = this.prevPos.distanceTo(this.group.position);
            this.prevPos.copy(this.group.position);

            if (moveDist > 0.001) {
                const moveSin = Math.sin(this.animTime * 15);
                this.bodyGroup.position.y += Math.abs(moveSin) * 0.2;

                this.shoulderL.rotation.set(-moveSin * 0.8, 0, -0.2);
                this.shoulderR.rotation.set(moveSin * 0.8, 0, 0.2);

                this.hipL.rotation.set(moveSin * 0.8, 0, 0);
                this.hipR.rotation.set(-moveSin * 0.8, 0, 0);
                this.kneeL.rotation.set(moveSin > 0 ? moveSin * 0.8 : 0, 0, 0);
                this.kneeR.rotation.set(moveSin < 0 ? -moveSin * 0.8 : 0, 0, 0);
            } else {
                this.hipL.rotation.set(0, 0, 0); this.hipR.rotation.set(0, 0, 0);
                this.kneeL.rotation.set(0, 0, 0); this.kneeR.rotation.set(0, 0, 0);
            }
        }

        if (getFloorFunc) {
            const floorY = getFloorFunc(this.group.position);
            if (this.group.position.y > floorY) {
                this.velocityY -= 20.0 * delta; // Gravity
                this.group.position.y += this.velocityY * delta;
                if (this.group.position.y <= floorY) {
                    this.group.position.y = floorY;
                    this.velocityY = 0;
                }
            } else {
                this.group.position.y = floorY;
                this.velocityY = 0;
            }
        }
    }

    interact(player) {
        if (this.isDead) return;
        console.log(`Interacted with ${this.type}`);
        // To be overridden by subclasses to open menus, etc.
    }

    takeDamage(amount) {
        if (this.isDead) return;
        this.hp -= amount;

        if (window.showFloatingText && this.group && this.group.position) {
            window.showFloatingText(`${amount}`, this.group.position, '#ffaa00');
        }

        // Visual feedback (flash red)
        this.meshGroup.traverse((child) => {
            if (child.isMesh && child.material && child.material.emissive) {
                const originalEmissive = child.material.emissive.getHex();
                child.material.emissive.setHex(0xff0000);
                setTimeout(() => {
                    if (child && child.material) child.material.emissive.setHex(originalEmissive);
                }, 200);
            }
        });

        if (this.hp <= 0) {
            this.die();
        }
    }

    die() {
        this.isDead = true;
        this.hp = 0;
        this.group.userData.interactable = false;

        // Drop loot logic
        this.dropLoot();

        // Death animation (fall over)
        const duration = 0.5;
        let elapsed = 0;
        const startRotX = this.group.rotation.x;

        const animateDeath = () => {
            if (!this.isDead) return; // if resurrected somehow
            elapsed += 0.016; // approx 60fps
            if (elapsed < duration) {
                const t = elapsed / duration;
                this.group.rotation.x = startRotX - (Math.PI / 2) * t;
                requestAnimationFrame(animateDeath);
            } else {
                this.group.rotation.x = startRotX - (Math.PI / 2);
                // Optionally remove from scene after a delay
                setTimeout(() => this.destroy(), 5000);
            }
        };
        animateDeath();
    }

    dropLoot() {
        // Subclasses should implement this to drop their specific items using LootManager
        console.log(`${this.type} dropped loot!`);
    }

    destroy() {
        if (this.group && this.group.parent) {
            this.group.parent.remove(this.group);
        }
    }
}
