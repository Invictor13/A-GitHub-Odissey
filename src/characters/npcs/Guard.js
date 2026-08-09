import { NPCBase } from './NPCBase.js';
import * as THREE from 'three';

export class Guard extends NPCBase {
    constructor(scene, position) {
        super(scene, position, 'Guard');
        this.hp = 120;
        this.maxHp = 120;
        this.speed = 2.0;
        this.attackDamage = 15;
        this.attackRadius = 1.2;
        this.attackCooldown = 0;

        this.spawnPoint = position ? position.clone() : new THREE.Vector3();
        this.patrolTarget = this.getNewPatrolTarget();
        this.state = 'PATROL'; // PATROL, PURSUE, ATTACK
        this.targetEnemy = null;
    }

    getDisplayName() {
        return "Guarda Mercenário";
    }

    buildModel() {
        // Body (Armor)
        const bodyGeo = new THREE.CylinderGeometry(0.3, 0.4, 1.4, 8);
        const armorMat = new THREE.MeshStandardMaterial({ color: 0x777777, metalness: 0.8, roughness: 0.3 });
        const body = new THREE.Mesh(bodyGeo, armorMat);
        body.position.y = 0.7;

        // Head
        const headGeo = new THREE.BoxGeometry(0.35, 0.35, 0.35);
        const headMat = new THREE.MeshStandardMaterial({ color: 0xffccaa });
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.y = 1.55;

        // Helmet (Random style)
        const helmetType = Math.random() > 0.5 ? 'full' : 'open';
        let helmetGeo, helmetMat;

        if (helmetType === 'full') {
            helmetGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.4, 8);
            helmetMat = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.9, roughness: 0.2 });
        } else {
            helmetGeo = new THREE.BoxGeometry(0.4, 0.15, 0.4);
            helmetMat = new THREE.MeshStandardMaterial({ color: 0x666666, metalness: 0.7 });
            // Add some hair
            const hairGeo = new THREE.BoxGeometry(0.38, 0.1, 0.38);
            const hairMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
            const hair = new THREE.Mesh(hairGeo, hairMat);
            hair.position.y = 1.65;
            this.meshGroup.add(hair);
        }

        const helmet = new THREE.Mesh(helmetGeo, helmetMat);
        helmet.position.y = helmetType === 'full' ? 1.6 : 1.75;

        // Weapon (Spear/Halberd)
        const handleGeo = new THREE.CylinderGeometry(0.03, 0.03, 2.0);
        const handleMat = new THREE.MeshStandardMaterial({ color: 0x4a3c31 });
        const handle = new THREE.Mesh(handleGeo, handleMat);

        const bladeGeo = new THREE.ConeGeometry(0.1, 0.4, 4);
        const bladeMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 0.9 });
        const blade = new THREE.Mesh(bladeGeo, bladeMat);
        blade.position.y = 1.0;

        this.weaponGroup = new THREE.Group();
        this.weaponGroup.add(handle);
        this.weaponGroup.add(blade);

        this.weaponGroup.position.set(0.4, 1.0, 0.2);
        this.weaponGroup.rotation.x = Math.PI / 8; // Held diagonally

        this.meshGroup.add(body);
        this.meshGroup.add(head);
        this.meshGroup.add(helmet);
        this.meshGroup.add(this.weaponGroup);
    }

    getNewPatrolTarget() {
        // Find a random spot within 5 units of the spawn point
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * 5;
        return new THREE.Vector3(
            this.spawnPoint.x + Math.cos(angle) * radius,
            this.spawnPoint.y,
            this.spawnPoint.z + Math.sin(angle) * radius
        );
    }

findClosestEnemy(enemyManager) {
        if (!enemyManager || !enemyManager.enemies) return null;

        let closest = null;
        let minDist = 10.0; // Aggro radius

        for (const enemy of enemyManager.enemies) {
            // Ignore dead entities, self, and other friendly NPCs
            if (enemy.isDead || enemy === this || (enemy.constructor && (enemy.constructor.name === 'Merchant' || enemy.constructor.name === 'Guard' || enemy.constructor.name === 'Alchemist' || enemy.constructor.name === 'Explorer' || enemy.type === 'NPC'))) continue;

            const dist = this.group.position.distanceTo(enemy.group.position);
            if (dist < minDist) {
                minDist = dist;
                closest = enemy;
            }
        }

        return closest;
    }

    update(delta, playerContext, getFloorFunc, checkCollisionFunc, enemyManager) {
        super.update(delta, playerContext, getFloorFunc, checkCollisionFunc, enemyManager);
        if (this.isDead) return;

        if (this.attackCooldown > 0) {
            this.attackCooldown -= delta;
        }

        // Logic loop
        if (!this.targetEnemy || this.targetEnemy.isDead) {
            this.targetEnemy = this.findClosestEnemy(enemyManager);
            if (this.targetEnemy) {
                this.state = 'PURSUE';
            } else {
                this.state = 'PATROL';
            }
        }

        const pos2D = new THREE.Vector2(this.group.position.x, this.group.position.z);
        let moveDir2D = new THREE.Vector2();

        if (this.state === 'PATROL') {
            const target2D = new THREE.Vector2(this.patrolTarget.x, this.patrolTarget.z);
            const distToTarget = pos2D.distanceTo(target2D);

            if (distToTarget < 0.5) {
                // Reached patrol point, wait a bit then pick a new one
                if (Math.random() < 0.01) {
                    this.patrolTarget = this.getNewPatrolTarget();
                }
            } else {
                moveDir2D.subVectors(target2D, pos2D).normalize();

                // Animate weapon slightly while walking
                this.weaponGroup.rotation.z = Math.sin(Date.now() * 0.005) * 0.1;
            }
        }
        else if (this.state === 'PURSUE' || this.state === 'ATTACK') {
            const enemy2D = new THREE.Vector2(this.targetEnemy.group.position.x, this.targetEnemy.group.position.z);
            const distToEnemy = pos2D.distanceTo(enemy2D);

            if (distToEnemy <= this.attackRadius) {
                this.state = 'ATTACK';
                moveDir2D.set(0, 0); // Stop moving

                // Face enemy
                this.group.lookAt(this.targetEnemy.group.position.x, this.group.position.y, this.targetEnemy.group.position.z);

                // Attack
                if (this.attackCooldown <= 0) {
                    this.attackCooldown = 1.5;
                    if (this.targetEnemy && typeof this.targetEnemy.takeDamage === 'function') {
                        this.targetEnemy.takeDamage(this.attackDamage);
                    }

                    // Simple attack animation
                    const origRot = this.weaponGroup.rotation.x;
                    this.weaponGroup.rotation.x -= Math.PI / 2;
                    setTimeout(() => {
                        if(this.weaponGroup) this.weaponGroup.rotation.x = origRot;
                    }, 200);
                }
            } else {
                this.state = 'PURSUE';
                moveDir2D.subVectors(enemy2D, pos2D).normalize();
            }
        }

        // Apply Movement
        if (moveDir2D.lengthSq() > 0) {
            const nextX = this.group.position.x + moveDir2D.x * this.speed * delta;
            const nextZ = this.group.position.z + moveDir2D.y * this.speed * delta;

            let canMove = true;
            if (checkCollisionFunc) {
                canMove = !checkCollisionFunc(nextX, nextZ, 0.3); // simple radius
            }

            if (canMove) {
                this.group.position.x = nextX;
                this.group.position.z = nextZ;

                // Face movement direction
                const lookAngle = Math.atan2(moveDir2D.x, moveDir2D.y);
                this.group.rotation.y = lookAngle;
            }
        }
    }

    interact(player) {
        if (this.isDead) return;
        super.interact(player);

        // Future interaction: "Hire Guard" UI
        if (window.showToast) {
            window.showToast("Guarda: 'Mantenha-se seguro. A escuridão espreita.'");
        }
    }
}
