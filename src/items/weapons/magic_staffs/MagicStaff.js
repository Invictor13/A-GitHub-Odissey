import * as THREE from 'three';
import { WeaponMaterials } from '../../WeaponMaterials.js';

export class MagicStaff {
    static create() {
        const group = new THREE.Group();
        group.add(WeaponMaterials.createPart(new THREE.CylinderGeometry(0.08, 0.1, 1.8, 8), WeaponMaterials.matWood, 0, 0.7, 0));

        // Crystal holder
        const holder = WeaponMaterials.createPart(new THREE.TorusGeometry(0.15, 0.05, 8, 12), WeaponMaterials.matMetal, 0, 1.6, 0);
        holder.rotation.x = Math.PI/2;
        group.add(holder);

        // Glowing Crystal
        const matCrystal = new THREE.MeshStandardMaterial({
            color: 0x00ffff,
            emissive: 0x008888,
            transparent: true,
            opacity: 0.8
        });
        const crystal = WeaponMaterials.createPart(new THREE.OctahedronGeometry(0.12), matCrystal, 0, 1.7, 0);
        group.add(crystal);

        return group;
    }
}
