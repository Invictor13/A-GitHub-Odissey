import * as THREE from 'three';
import { WeaponMaterials } from '../../WeaponMaterials.js';

export class Hammer {
    static create() {
        const group = new THREE.Group();
        group.add(WeaponMaterials.createPart(new THREE.CylinderGeometry(0.12, 0.1, 1.2, 8), WeaponMaterials.matWood, 0, 0.4, 0));
        const head = WeaponMaterials.createPart(new THREE.BoxGeometry(0.8, 0.4, 0.4), WeaponMaterials.matMetal, 0, 1.0, 0);
        group.add(head);
        return group;
    }
}
