import * as THREE from 'three';
import { applyWorldCurvature } from '../core/GraphicsUtils.js';

export class StylizedWater extends THREE.Mesh {
    constructor(width = 50, length = 50, options = {}) {
        const segmentsX = options.segmentsX || options.widthSegments || options.segments || 32;
        const segmentsY = options.segmentsY || options.heightSegments || options.segments || 32;

        const geometry = new THREE.PlaneGeometry(width, length, segmentsX, segmentsY);

        const materialOptions = {
            color: 0x29b6f6,
            transparent: true,
            opacity: 0.75,
            roughness: 0.1,
            metalness: 0.1,
            side: THREE.DoubleSide,
            ...options.materialOptions
        };

        const material = new THREE.MeshStandardMaterial(materialOptions);

        applyWorldCurvature(material);

        super(geometry, material);

        this.rotation.x = -Math.PI / 2;
    }

    update(time) {
        const position = this.geometry.attributes.position;
        const count = position.count;

        for (let i = 0; i < count; i++) {
            const vx = position.getX(i);
            const vy = position.getY(i);
            const vz = Math.sin(vx * 0.5 + time * 2.0) * 0.15 + Math.cos(vy * 0.5 + time * 1.5) * 0.15;
            position.setZ(i, vz);
        }

        position.needsUpdate = true;
        this.geometry.computeVertexNormals();
    }
}
