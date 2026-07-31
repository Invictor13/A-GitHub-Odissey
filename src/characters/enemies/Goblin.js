import * as THREE from 'three';

export class Goblin {
    constructor(scene, position) {
        this.scene = scene;
        this.group = new THREE.Group();
        this.group.position.copy(position);

        // Setup visuals
        const matSkin = new THREE.MeshLambertMaterial({ color: 0x228b22 }); // Green
        const geoHead = new THREE.BoxGeometry(0.7, 0.7, 0.7);
        const head = new THREE.Mesh(geoHead, matSkin);
        head.position.y = 1.5;
        this.group.add(head);

        const geoTorso = new THREE.BoxGeometry(0.9, 0.8, 0.6);
        const torso = new THREE.Mesh(geoTorso, new THREE.MeshLambertMaterial({ color: 0x8b4513 }));
        torso.position.y = 0.7;
        this.group.add(torso);

        this.scene.add(this.group);
        this.hp = 20;
    }

    update(delta, playerPos) {
        if (this.hp <= 0) return;

        // Fast chase logic
        const dir = new THREE.Vector3().subVectors(playerPos, this.group.position);
        dir.y = 0;
        if (dir.length() > 0.5) {
            dir.normalize();
            this.group.position.addScaledVector(dir, 3.5 * delta); // Faster than skeleton
            this.group.rotation.y = Math.atan2(dir.x, dir.z);
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
