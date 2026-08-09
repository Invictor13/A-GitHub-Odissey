import * as THREE from 'three';
import { WeaponMaterials } from '../../WeaponMaterials.js';

export class Club {
    static create() {
        const group = new THREE.Group();
        group.add(WeaponMaterials.createPart(new THREE.CylinderGeometry(0.15, 0.1, 0.6, 8), WeaponMaterials.matWood, 0, 0, 0));
        const head = WeaponMaterials.createPart(new THREE.CylinderGeometry(0.25, 0.15, 1.0, 8), WeaponMaterials.matWood, 0, 0.8, 0);
        for (let i = 0; i < 6; i++) {
            const spike = WeaponMaterials.createPart(new THREE.ConeGeometry(0.05, 0.15, 4), WeaponMaterials.matMetal, 0, 0, 0.25, Math.PI/2, 0, 0);
            const pivot = new THREE.Group();
            pivot.position.y = 0.5 + (i * 0.15);
            pivot.rotation.y = (i * Math.PI) / 1.5;
            pivot.add(spike);
            head.add(pivot);
        }
        group.add(head);
        return group;
    }
}
