import * as THREE from 'three';

export class Slime {
    constructor(scene, position) {
        this.scene = scene;
        this.group = new THREE.Group();
        this.group.position.copy(position);

        // Setup visuals
        const matSlime = new THREE.MeshLambertMaterial({ color: 0x00ff00, transparent: true, opacity: 0.8 });
        const geoSlime = new THREE.BoxGeometry(1.2, 1.0, 1.2);
        this.mesh = new THREE.Mesh(geoSlime, matSlime);
        this.mesh.position.y = 0.5;
        this.group.add(this.mesh);

        this.scene.add(this.group);
        this.hp = 15;
        this.time = Math.random() * 10;
    }

    update(delta, playerPos) {
        if (this.hp <= 0) return;
        this.time += delta;

        // Hop logic
        const hopCycle = Math.sin(this.time * 5);
        if (hopCycle > 0) {
             this.mesh.position.y = 0.5 + hopCycle * 0.5;
             this.mesh.scale.set(1 - hopCycle * 0.2, 1 + hopCycle * 0.2, 1 - hopCycle * 0.2);
        } else {
             this.mesh.position.y = 0.5;
             this.mesh.scale.set(1 - hopCycle * 0.3, 1 + hopCycle * 0.2, 1 - hopCycle * 0.3); // Squish
        }

        // Slow chase logic
        const dir = new THREE.Vector3().subVectors(playerPos, this.group.position);
        dir.y = 0;
        if (dir.length() > 0.5 && hopCycle > 0) {
            dir.normalize();
            this.group.position.addScaledVector(dir, 1.5 * delta);
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
