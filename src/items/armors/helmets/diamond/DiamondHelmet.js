import * as THREE from 'three';
import { WeaponMaterials } from '../../../WeaponMaterials.js';

export class DiamondHelmet {
    static create() {
        const group = new THREE.Group();
        group.userData = { coverage: 'full' }; // Total

        // Base elmo de cristal/diamante
        const helmGeo = new THREE.CylinderGeometry(1.08, 1.05, 1.4, 16);
        const helmMesh = new THREE.Mesh(helmGeo, WeaponMaterials.magicBlue); // Reutilizando magicBlue para efeito de cristal
        helmMesh.position.set(0, 0.3, 0);

        const topGeo = new THREE.SphereGeometry(1.08, 16, 16, 0, Math.PI*2, 0, Math.PI/2);
        const topMesh = new THREE.Mesh(topGeo, WeaponMaterials.magicBlue);
        topMesh.position.set(0, 1.0, 0);

        // Viseira estilizada
        const visorGeo = new THREE.BoxGeometry(1.2, 0.5, 1.15);
        const visorMesh = new THREE.Mesh(visorGeo, WeaponMaterials.steel);
        visorMesh.position.set(0, 0.45, 0.15);

        // Gema central
        const gemGeo = new THREE.OctahedronGeometry(0.15);
        const gemMesh = new THREE.Mesh(gemGeo, WeaponMaterials.magicBlue);
        gemMesh.position.set(0, 0.8, 1.1);

        group.add(helmMesh);
        group.add(topMesh);
        group.add(visorMesh);
        group.add(gemMesh);

        return group;
    }
}
