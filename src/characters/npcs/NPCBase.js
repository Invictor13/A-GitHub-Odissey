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

        this.buildModel();
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
