import * as THREE from 'three';

export class Skeleton {
    constructor(scene, position) {
        this.scene = scene;
        this.group = new THREE.Group();
        this.group.position.copy(position);

        // Setup visuals
        const matBone = new THREE.MeshLambertMaterial({ color: 0xcccccc });
        const geoHead = new THREE.BoxGeometry(0.8, 0.8, 0.8);
        const head = new THREE.Mesh(geoHead, matBone);
        head.position.y = 2.4;
        this.group.add(head);

        const geoTorso = new THREE.BoxGeometry(1.0, 1.2, 0.5);
        const torso = new THREE.Mesh(geoTorso, matBone);
        torso.position.y = 1.2;
        this.group.add(torso);

        this.scene.add(this.group);
        this.hp = 30;
    }

    update(delta, playerPos) {
        if (this.hp <= 0) return;

        // Simple chase logic
        const dir = new THREE.Vector3().subVectors(playerPos, this.group.position);
        dir.y = 0;
        if (dir.length() > 0.5) {
            dir.normalize();
            this.group.position.addScaledVector(dir, 2 * delta);
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
