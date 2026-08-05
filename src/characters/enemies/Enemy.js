import * as THREE from 'three';

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
        this.attackRadius = attackRadius;
        this.isDead = false;

        this.animTime = Math.random() * 10;
        this.manager = null; // Reference to the EnemyManager
    }

    update(delta, playerContext, getFloorFunc, checkCollisionFunc) {
        if (this.isDead) return;
        this.animTime += delta * 15;
        // Derived classes should override this for specific movement/animations
    }

    takeDamage(amount) {
        if (this.isDead) return;
        this.hp -= amount;
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
            this.group.parent.remove(this.group);
        }
    }
}
