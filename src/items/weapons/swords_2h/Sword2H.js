import * as THREE from 'three';
import { WeaponMaterials } from '../../WeaponMaterials.js';

export class Sword2H {
    static create() {
        const group = new THREE.Group();
        group.add(WeaponMaterials.createPart(new THREE.CylinderGeometry(0.15, 0.15, 0.9, 8), WeaponMaterials.matLeather, 0, 0, 0));
        group.add(WeaponMaterials.createPart(new THREE.BoxGeometry(0.9, 0.15, 0.25), WeaponMaterials.matMetal, 0, 0.5, 0));
        const blade = WeaponMaterials.createPart(new THREE.CylinderGeometry(0.05, 0.2, 2.0, 4), WeaponMaterials.matMetal, 0, 1.5, 0);
        blade.scale.set(1, 1, 0.3);
        group.add(blade);
        return group;
    }
}
