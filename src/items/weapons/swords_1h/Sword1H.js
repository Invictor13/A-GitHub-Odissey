import * as THREE from 'three';
import { WeaponMaterials } from '../../WeaponMaterials.js';

export class Sword1H {
    static create() {
        const group = new THREE.Group();
        group.add(WeaponMaterials.createPart(new THREE.CylinderGeometry(0.12, 0.12, 0.5, 8), WeaponMaterials.matLeather, 0, 0, 0));
        group.add(WeaponMaterials.createPart(new THREE.BoxGeometry(0.6, 0.1, 0.2), WeaponMaterials.matMetal, 0, 0.3, 0));
        const blade = WeaponMaterials.createPart(new THREE.CylinderGeometry(0.02, 0.15, 1.2, 4), WeaponMaterials.matMetal, 0, 0.9, 0);
        blade.scale.set(1, 1, 0.2);
        group.add(blade);
        return group;
    }
}
