
import * as THREE from 'three';

export class WeaponModels {
    static matWood = new THREE.MeshStandardMaterial({ color: 0x4a3219, roughness: 0.9, flatShading: true });
    static matMetal = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.8, roughness: 0.4, flatShading: true });
    static matLeather = new THREE.MeshStandardMaterial({ color: 0x3e2723, roughness: 1.0 });

    static _createPart(geo, mat, x, y, z, rx=0, ry=0, rz=0) {
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(x, y, z);
        mesh.rotation.set(rx, ry, rz);
        mesh.castShadow = true;
        return mesh;
    }

    static createKnife() {
        const group = new THREE.Group();
        group.add(this._createPart(new THREE.CylinderGeometry(0.1, 0.1, 0.4, 8), this.matLeather, 0, 0, 0));
        const blade = this._createPart(new THREE.ConeGeometry(0.12, 0.6, 4), this.matMetal, 0, 0.5, 0);
        blade.scale.set(0.2, 1, 1);
        group.add(blade);
        return group;
    }

    static createSword1H() {
        const group = new THREE.Group();
        group.add(this._createPart(new THREE.CylinderGeometry(0.12, 0.12, 0.5, 8), this.matLeather, 0, 0, 0));
        group.add(this._createPart(new THREE.BoxGeometry(0.6, 0.1, 0.2), this.matMetal, 0, 0.3, 0));
        const blade = this._createPart(new THREE.CylinderGeometry(0.02, 0.15, 1.2, 4), this.matMetal, 0, 0.9, 0);
        blade.scale.set(1, 1, 0.2);
        group.add(blade);
        return group;
    }

    static createSword2H() {
        const group = new THREE.Group();
        group.add(this._createPart(new THREE.CylinderGeometry(0.15, 0.15, 0.9, 8), this.matLeather, 0, 0, 0));
        group.add(this._createPart(new THREE.BoxGeometry(0.9, 0.15, 0.25), this.matMetal, 0, 0.5, 0));
        const blade = this._createPart(new THREE.CylinderGeometry(0.05, 0.2, 2.0, 4), this.matMetal, 0, 1.5, 0);
        blade.scale.set(1, 1, 0.3);
        group.add(blade);
        return group;
    }

    static createClub() {
        const group = new THREE.Group();
        group.add(this._createPart(new THREE.CylinderGeometry(0.15, 0.1, 0.6, 8), this.matWood, 0, 0, 0));
        const head = this._createPart(new THREE.CylinderGeometry(0.25, 0.15, 1.0, 8), this.matWood, 0, 0.8, 0);
        for (let i = 0; i < 6; i++) {
            const spike = this._createPart(new THREE.ConeGeometry(0.05, 0.15, 4), this.matMetal, 0, 0, 0.25, Math.PI/2, 0, 0);
            const pivot = new THREE.Group();
            pivot.position.y = 0.5 + (i * 0.15);
            pivot.rotation.y = (i * Math.PI) / 1.5;
            pivot.add(spike);
            head.add(pivot);
        }
        group.add(head);
        return group;
    }

    static createSpear() {
        const group = new THREE.Group();
        group.add(this._createPart(new THREE.CylinderGeometry(0.1, 0.1, 3.0, 8), this.matWood, 0, 0.5, 0));
        const head = this._createPart(new THREE.ConeGeometry(0.12, 0.6, 4), this.matMetal, 0, 2.3, 0);
        head.scale.set(0.3, 1, 1);
        group.add(head);
        return group;
    }

    static createShield() {
        const group = new THREE.Group();
        const base = this._createPart(new THREE.CylinderGeometry(0.8, 0.8, 0.15, 12), this.matWood, 0, 0, 0, Math.PI/2, 0, 0);
        group.add(base);
        const rim = this._createPart(new THREE.TorusGeometry(0.8, 0.08, 8, 12), this.matMetal, 0, 0, 0);
        group.add(rim);
        group.add(this._createPart(new THREE.SphereGeometry(0.25, 8, 8, 0, Math.PI*2, 0, Math.PI/2), this.matMetal, 0, 0, 0.08, Math.PI/2, 0, 0));
        return group;
    }
}
