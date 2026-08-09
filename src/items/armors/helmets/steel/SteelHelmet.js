import * as THREE from 'three';
import { WeaponMaterials } from '../../../WeaponMaterials.js';

export class SteelHelmet {
    static create() {
        const group = new THREE.Group();
        group.userData = { coverage: 'full' }; // Cobre tudo

        // Elmo de cavaleiro aprimorado
        const helmGeo = new THREE.CylinderGeometry(1.05, 1.05, 1.4, 16);
        const helmMesh = new THREE.Mesh(helmGeo, WeaponMaterials.steel);
        helmMesh.position.set(0, 0.3, 0);

        const topGeo = new THREE.SphereGeometry(1.05, 16, 16, 0, Math.PI*2, 0, Math.PI/2);
        const topMesh = new THREE.Mesh(topGeo, WeaponMaterials.steel);
        topMesh.position.set(0, 1.0, 0);

        // Viseira com fenda dupla
        const visorGeo = new THREE.BoxGeometry(1.2, 0.4, 1.1);
        const visorMesh = new THREE.Mesh(visorGeo, WeaponMaterials.steelLight);
        visorMesh.position.set(0, 0.45, 0.15);

        const slitGeo = new THREE.BoxGeometry(1.22, 0.05, 1.12);
        const slitMesh1 = new THREE.Mesh(slitGeo, WeaponMaterials.steelDark);
        slitMesh1.position.set(0, 0.55, 0.16);
        const slitMesh2 = new THREE.Mesh(slitGeo, WeaponMaterials.steelDark);
        slitMesh2.position.set(0, 0.35, 0.16);

        // Chifres curtos
        const hornGeo = new THREE.ConeGeometry(0.2, 0.8, 6);
        const hornL = new THREE.Mesh(hornGeo, WeaponMaterials.leatherDark);
        hornL.position.set(-1.0, 0.8, 0);
        hornL.rotation.set(-0.2, 0, 0.6);
        const hornR = new THREE.Mesh(hornGeo, WeaponMaterials.leatherDark);
        hornR.position.set(1.0, 0.8, 0);
        hornR.rotation.set(-0.2, 0, -0.6);

        group.add(helmMesh);
        group.add(topMesh);
        group.add(visorMesh);
        group.add(slitMesh1);
        group.add(slitMesh2);
        group.add(hornL);
        group.add(hornR);

        return group;
    }
}
