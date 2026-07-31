import * as THREE from 'three';

export class HubEnvironment {
    constructor(scene) {
        this.scene = scene;
        this.hubGroup = new THREE.Group();
        this.isNearDog = true; // Set to true to test the E interaction
        this.isModalOpen = false;

        // Ground plane
        const groundGeo = new THREE.PlaneGeometry(50, 50);
        const groundMat = new THREE.MeshLambertMaterial({ color: 0x2e8b57 });
        this.ground = new THREE.Mesh(groundGeo, groundMat);
        this.ground.rotation.x = -Math.PI / 2;
        this.hubGroup.add(this.ground);

        // Dummy dog (NPC)
        const dogGeo = new THREE.BoxGeometry(1, 1, 1);
        const dogMat = new THREE.MeshLambertMaterial({ color: 0x8b4513 });
        this.dog = new THREE.Mesh(dogGeo, dogMat);
        this.dog.position.set(2, 0.5, -2);
        this.hubGroup.add(this.dog);

        this.scene.add(this.hubGroup);
    }

    cleanup() {
        this.scene.remove(this.hubGroup);
    }

    update(delta, time, camera, playerPos) {
        // Optional logic like floating dog, etc.
    }

    getFloorY(pos) {
        return 0; // Flat floor in hub for now
    }
}
