import * as THREE from 'three';

export class WeaponModels {
    static createUnarmed() {
        return new THREE.Group();
    }

    static createKnife() {
        const group = new THREE.Group();
        // create knife geometry and materials
        return group;
    }

    // other weapons...
}
