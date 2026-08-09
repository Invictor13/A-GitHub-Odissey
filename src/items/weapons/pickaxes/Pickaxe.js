import * as THREE from 'three';
import { WeaponMaterials } from '../../WeaponMaterials.js';

export class Pickaxe {
    static create() {
        const group = new THREE.Group();
        group.add(WeaponMaterials.createPart(new THREE.CylinderGeometry(0.12, 0.1, 1.0, 8), WeaponMaterials.matWood, 0, 0.3, 0));

        const head = new THREE.Group();
        head.position.set(0, 0.8, 0);

        // Left curve
        const leftSpike = WeaponMaterials.createPart(new THREE.ConeGeometry(0.1, 0.6, 4), WeaponMaterials.matMetal, -0.3, -0.1, 0, 0, 0, Math.PI/3);
        head.add(leftSpike);

        // Right curve
        const rightSpike = WeaponMaterials.createPart(new THREE.ConeGeometry(0.1, 0.6, 4), WeaponMaterials.matMetal, 0.3, -0.1, 0, 0, 0, -Math.PI/3);
        head.add(rightSpike);

        // Center connector
        const connector = WeaponMaterials.createPart(new THREE.BoxGeometry(0.3, 0.2, 0.2), WeaponMaterials.matMetal, 0, 0, 0);
        head.add(connector);

        group.add(head);
        return group;
    }
}
