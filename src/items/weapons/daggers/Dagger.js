import * as THREE from 'three';
import { WeaponMaterials } from '../../WeaponMaterials.js';

export class Dagger {
    static create() {
        const group = new THREE.Group();
        group.add(WeaponMaterials.createPart(new THREE.CylinderGeometry(0.1, 0.1, 0.4, 8), WeaponMaterials.matLeather, 0, 0, 0));
        const blade = WeaponMaterials.createPart(new THREE.ConeGeometry(0.12, 0.6, 4), WeaponMaterials.matMetal, 0, 0.5, 0);
        blade.scale.set(0.2, 1, 1);
        group.add(blade);
        return group;
    }
}
