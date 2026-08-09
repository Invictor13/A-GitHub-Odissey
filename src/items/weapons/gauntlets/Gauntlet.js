import * as THREE from 'three';
import { WeaponMaterials } from '../../WeaponMaterials.js';

export class Gauntlet {
    static create() {
        const group = new THREE.Group();
        // Main glove
        group.add(WeaponMaterials.createPart(new THREE.BoxGeometry(0.3, 0.4, 0.25), WeaponMaterials.matLeather, 0, 0.2, 0));
        // Knuckle guards
        group.add(WeaponMaterials.createPart(new THREE.BoxGeometry(0.35, 0.1, 0.3), WeaponMaterials.matMetal, 0, 0.4, 0));
        return group;
    }
}
