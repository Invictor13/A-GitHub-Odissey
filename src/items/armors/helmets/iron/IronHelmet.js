import * as THREE from 'three';
import { WeaponMaterials } from '../../../WeaponMaterials.js';

export class IronHelmet {
    static create() {
        const group = new THREE.Group();
        group.userData = { coverage: 'full' }; // Cobre toda a cabeça (oculta cabelo)

        // Base elmo (barril)
        const helmGeo = new THREE.CylinderGeometry(1.05, 1.05, 1.4, 16);
        const helmMesh = new THREE.Mesh(helmGeo, WeaponMaterials.iron);
        helmMesh.position.set(0, 0.3, 0);

        // Topo arredondado
        const topGeo = new THREE.SphereGeometry(1.05, 16, 16, 0, Math.PI*2, 0, Math.PI/2);
        const topMesh = new THREE.Mesh(topGeo, WeaponMaterials.iron);
        topMesh.position.set(0, 1.0, 0);

        // Viseira / fenda
        const visorGeo = new THREE.BoxGeometry(1.2, 0.2, 1.05);
        const visorMesh = new THREE.Mesh(visorGeo, WeaponMaterials.steelDark);
        visorMesh.position.set(0, 0.45, 0.15);

        group.add(helmMesh);
        group.add(topMesh);
        group.add(visorMesh);

        return group;
    }
}
