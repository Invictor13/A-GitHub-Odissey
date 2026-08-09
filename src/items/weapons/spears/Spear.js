import * as THREE from 'three';
import { WeaponMaterials } from '../../WeaponMaterials.js';

export class Spear {
    static create() {
        const group = new THREE.Group();
        group.add(WeaponMaterials.createPart(new THREE.CylinderGeometry(0.1, 0.1, 3.0, 8), WeaponMaterials.matWood, 0, 0.5, 0));
        const head = WeaponMaterials.createPart(new THREE.ConeGeometry(0.12, 0.6, 4), WeaponMaterials.matMetal, 0, 2.3, 0);
        head.scale.set(0.3, 1, 1);
        group.add(head);
        return group;
    }
}
