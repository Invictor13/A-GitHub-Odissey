import * as THREE from 'three';
import { WeaponMaterials } from '../WeaponMaterials.js';

export class Shield {
    static create() {
        const group = new THREE.Group();
        const base = WeaponMaterials.createPart(new THREE.CylinderGeometry(0.8, 0.8, 0.15, 12), WeaponMaterials.matWood, 0, 0, 0, Math.PI/2, 0, 0);
        group.add(base);
        const rim = WeaponMaterials.createPart(new THREE.TorusGeometry(0.8, 0.08, 8, 12), WeaponMaterials.matMetal, 0, 0, 0);
        group.add(rim);
        group.add(WeaponMaterials.createPart(new THREE.SphereGeometry(0.25, 8, 8, 0, Math.PI*2, 0, Math.PI/2), WeaponMaterials.matMetal, 0, 0, 0.08, Math.PI/2, 0, 0));
        return group;
    }
}
