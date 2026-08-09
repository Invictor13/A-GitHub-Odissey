import * as THREE from 'three';

export class WeaponMaterials {
    static matWood = new THREE.MeshStandardMaterial({ color: 0x4a3219, roughness: 0.9, flatShading: true });
    static matMetal = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.8, roughness: 0.4, flatShading: true });
    static matLeather = new THREE.MeshStandardMaterial({ color: 0x3e2723, roughness: 1.0 });

    static createPart(geo, mat, x, y, z, rx=0, ry=0, rz=0) {
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(x, y, z);
        mesh.rotation.set(rx, ry, rz);
        mesh.castShadow = true;
        return mesh;
    }
}
