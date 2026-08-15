import * as THREE from 'three';

import { disposeHierarchy } from '../../core/GraphicsUtils.js';

export class Enemy {
    constructor(scene, position, hp = 20, speed = 3.5, attackRadius = 1.0) {
        this.scene = scene;
        this.group = new THREE.Group();
        if (position) {
            this.group.position.copy(position);
        }
        this.scene.add(this.group);

        this.hp = hp;
        this.maxHp = hp;
        this.speed = speed;
        this.attackDamage = 10;
        this.attackRadius = attackRadius;
        this.isDead = false;

        this.animTime = Math.random() * 10;
        this.manager = null; // Reference to the EnemyManager

        // Cache vectors for zero allocation in child class updates
        this._dirVec = new THREE.Vector3();
        this._testPosX = new THREE.Vector3();
        this._testPosZ = new THREE.Vector3();
        this.knockbackVelocity = new THREE.Vector3();
        this.hitstopTimer = 0;
        this.knockbackTimer = 0;
    }

    update(delta, playerContext, getFloorFunc, checkCollisionFunc) {
        if (this.isDead) return;

        if (this.hitstopTimer > 0) {
            this.hitstopTimer -= delta;
        }

        if (this.knockbackTimer > 0) {
            this.knockbackTimer -= delta;

            // Move backwards
            this._testPosX.copy(this.group.position);
            this._testPosX.x += this.knockbackVelocity.x * delta;
            if (!checkCollisionFunc || !checkCollisionFunc(this._testPosX, 0.5)) {
                this.group.position.x = this._testPosX.x;
            }

            this._testPosZ.copy(this.group.position);
            this._testPosZ.z += this.knockbackVelocity.z * delta;
            if (!checkCollisionFunc || !checkCollisionFunc(this._testPosZ, 0.5)) {
                this.group.position.z = this._testPosZ.z;
            }
        }

        this.animTime += delta * 15;
        // Derived classes should override this for specific movement/animations, but MUST call super.update first!
    }

    takeDamage(amount, sourcePos = null) {
        if (this.isDead) return;

        this.hitstopTimer = 0.05;
        this.knockbackTimer = 0.15;

        if (sourcePos && this.group) {
            const dir = new THREE.Vector3().subVectors(this.group.position, sourcePos);
            dir.y = 0;
            dir.normalize();
            this.knockbackVelocity.copy(dir).multiplyScalar(5.0); // knockback speed
        }

        // Damage Flash
        if (this.group) {
            const originalColors = new Map();
            this.group.traverse((child) => {
                if (child.isMesh && child.material) {
                    originalColors.set(child.uuid, child.material.color ? child.material.color.getHex() : null);
                    if (child.material.color) {
                        child.material.color.setHex(0xff2222);
                    }
                }
            });
            setTimeout(() => {
                if (this.group) {
                    this.group.traverse((child) => {
                        if (child.isMesh && child.material && originalColors.has(child.uuid)) {
                            const hex = originalColors.get(child.uuid);
                            if (hex !== null) {
                                child.material.color.setHex(hex);
                            }
                        }
                    });
                }
            }, 100);
        }

        this.hp -= amount;

        if (window.showFloatingText && this.group && this.group.position) {
            window.showFloatingText(`${amount}`, this.group.position, '#ffaa00');
        }

        if (this.hp <= 0) {
            this.die();
        }
    }

    die() {
        this.isDead = true;
        this.hp = 0;
        // Optionally dispatch custom event
        if (this.manager && typeof this.manager.onEnemyKilled === 'function') {
            this.manager.onEnemyKilled(this);
        }

        // Let the manager handle destroying it from the scene during its cleanup pass,
        // or trigger animation, disable hitboxes etc.
        this.destroy();
    }

    destroy() {
        if (this.group && this.group.parent) {
            disposeHierarchy(this.group);
            this.group.parent.remove(this.group);
        }
    }
}
