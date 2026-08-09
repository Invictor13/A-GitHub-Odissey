import * as THREE from 'three';
import { WeaponMaterials } from '../../../WeaponMaterials.js';

export class GoldHelmet {
    static create() {
        const group = new THREE.Group();
        group.userData = { coverage: 'partial' }; // Coroa de ouro, permite cabelo completo

        // Coroa base
        const crownBaseGeo = new THREE.CylinderGeometry(1.05, 1.05, 0.3, 16);
        const crownBase = new THREE.Mesh(crownBaseGeo, WeaponMaterials.gold);
        crownBase.position.set(0, 0.8, 0); // Posição mais alta

        // Pontas da coroa
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const spikeGeo = new THREE.ConeGeometry(0.15, 0.4, 4);
            const spike = new THREE.Mesh(spikeGeo, WeaponMaterials.gold);

            const x = Math.sin(angle) * 1.05;
            const z = Math.cos(angle) * 1.05;

            spike.position.set(x, 1.05, z);
            // Rotacionar ponta ligeiramente para fora
            spike.rotation.x = z * 0.2;
            spike.rotation.z = -x * 0.2;

            group.add(spike);
        }

        group.add(crownBase);
        return group;
    }
}
