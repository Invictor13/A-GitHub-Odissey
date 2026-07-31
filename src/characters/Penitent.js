import * as THREE from 'three';

export class Penitent {
    constructor(scene) {
        this.scene = scene;
        this.playerGroup = new THREE.Group();
        this.group = new THREE.Group(); // Represents the visual model

        // Placeholder visual for Penitent
        const geometry = new THREE.BoxGeometry(1, 2, 1);
        const material = new THREE.MeshLambertMaterial({ color: 0xff0000 });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.y = 1;
        this.group.add(this.mesh);

        this.playerGroup.add(this.group);
        this.scene.add(this.playerGroup);

        this.isGrounded = false;

        // Input state for simple movement stub
        this.keys = { w: false, a: false, s: false, d: false };
        this.initInput();
    }

    initInput() {
        window.addEventListener('keydown', (e) => {
            if (this.keys.hasOwnProperty(e.key.toLowerCase())) {
                this.keys[e.key.toLowerCase()] = true;
            }
        });
        window.addEventListener('keyup', (e) => {
            if (this.keys.hasOwnProperty(e.key.toLowerCase())) {
                this.keys[e.key.toLowerCase()] = false;
            }
        });
    }

    update(delta, camera, getFloorFunc) {
        const speed = 10 * delta;
        if (this.keys.w) this.playerGroup.position.z -= speed;
        if (this.keys.s) this.playerGroup.position.z += speed;
        if (this.keys.a) this.playerGroup.position.x -= speed;
        if (this.keys.d) this.playerGroup.position.x += speed;

        if (getFloorFunc) {
            const floorY = getFloorFunc(this.playerGroup.position);
            this.playerGroup.position.y = floorY;
        }
    }
}
