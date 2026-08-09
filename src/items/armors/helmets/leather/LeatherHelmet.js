import * as THREE from 'three';
import { WeaponMaterials } from '../../../WeaponMaterials.js';

export class LeatherHelmet {
    static create() {
        const group = new THREE.Group();
        group.userData = { coverage: 'partial' }; // Cobre apenas o topo, mantendo franjas/cauda

        // Gorro de couro (base)
        const capGeo = new THREE.SphereGeometry(1.02, 16, 16, 0, Math.PI*2, 0, Math.PI/1.8);
        const capMesh = new THREE.Mesh(capGeo, WeaponMaterials.leather);
        capMesh.position.set(0, 0.1, 0);
        capMesh.scale.set(1.05, 1.0, 1.05);

        // Detalhes / costura
        const bandGeo = new THREE.CylinderGeometry(1.06, 1.06, 0.15, 16);
        const bandMesh = new THREE.Mesh(bandGeo, WeaponMaterials.leatherDark);
        bandMesh.position.set(0, 0.2, 0);

        // Adicionando ao grupo
        group.add(capMesh);
        group.add(bandMesh);

        return group;
    }
}
