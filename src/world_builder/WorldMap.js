import * as THREE from 'three';

export class WorldMap {
    constructor(scene) {
        this.scene = scene;
        this.worldGroup = new THREE.Group();

        // Simple map plane
        const mapGeo = new THREE.PlaneGeometry(200, 200);
        const mapMat = new THREE.MeshLambertMaterial({ color: 0x1e3f66 });
        this.mapMesh = new THREE.Mesh(mapGeo, mapMat);
        this.mapMesh.rotation.x = -Math.PI / 2;
        this.worldGroup.add(this.mapMesh);

        // Simple node on map
        const nodeGeo = new THREE.SphereGeometry(2, 16, 16);
        const nodeMat = new THREE.MeshLambertMaterial({ color: 0xffd700 });
        this.nodeMesh = new THREE.Mesh(nodeGeo, nodeMat);
        this.nodeMesh.position.set(0, 2, 0);
        this.worldGroup.add(this.nodeMesh);

        this.scene.add(this.worldGroup);
    }

    cleanup() {
        this.scene.remove(this.worldGroup);
    }

    update(delta, time, camera, playerPos) {
        // Map update logic
    }
}
