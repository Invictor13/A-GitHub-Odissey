import * as THREE from 'three';
import CurvatureEffect from '../shaders/CurvatureEffect.js';

export class StylizedWater extends THREE.Mesh {
    constructor(width = 400, height = 400, segments = 32) {
        const geometry = new THREE.PlaneGeometry(width, height, segments, segments);

        const material = new THREE.MeshStandardMaterial({
            color: 0x29b6f6,
            transparent: true,
            opacity: 0.75,
            roughness: 0.1,
            metalness: 0.05,
            side: THREE.DoubleSide
        });

        CurvatureEffect.applyCurvature(material);

        super(geometry, material);

        this.rotation.x = -Math.PI / 2;
        this.position.y = -1.5;
    }

    update(time) {
        const position = this.geometry.attributes.position;
        const count = position.count;

        for (let i = 0; i < count; i++) {
            const vx = position.getX(i);
            const vy = position.getY(i);
            const vz = Math.sin(vx * 0.3 + time * 2.0) * 0.12 + Math.cos(vy * 0.3 + time * 1.5) * 0.12;
            position.setZ(i, vz);
        }

        position.needsUpdate = true;
        this.geometry.computeVertexNormals();
    }
}
