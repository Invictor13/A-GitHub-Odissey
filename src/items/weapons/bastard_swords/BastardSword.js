import * as THREE from 'three';
import { WeaponMaterials } from '../../WeaponMaterials.js';

export class BastardSword {
    static create() {
        const group = new THREE.Group();
        group.add(WeaponMaterials.createPart(new THREE.CylinderGeometry(0.13, 0.13, 0.7, 8), WeaponMaterials.matLeather, 0, 0, 0));
        group.add(WeaponMaterials.createPart(new THREE.BoxGeometry(0.75, 0.12, 0.22), WeaponMaterials.matMetal, 0, 0.4, 0));
        const blade = WeaponMaterials.createPart(new THREE.CylinderGeometry(0.04, 0.18, 1.6, 4), WeaponMaterials.matMetal, 0, 1.2, 0);
        blade.scale.set(1, 1, 0.25);
        group.add(blade);
        return group;
    }
}
