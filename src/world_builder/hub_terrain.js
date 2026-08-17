import * as THREE from 'three';

export class HubTerrain {
    constructor(scene) {
        this.scene = scene;
        this.gridSize = 20;
        this.blockSize = 1;
        this.heightMap = {};
        this.colliders = [];
        this.group = new THREE.Group();
        this.waterMeshes = [];

        this.initHeightMap();
        this.buildTerrain();
        this.createWaterLayer();
        this.scene.add(this.group);
    }

    initHeightMap() {
        for (let x = -10; x < 10; x++) {
            this.heightMap[x] = [];
            for (let z = -10; z < 10; z++) {
                // Area norte do Portal (X entre -2 e 2, Z entre -9 e -7): Altura Y = 2
                if (x >= -2 && x <= 2 && z >= -9 && z <= -7) {
                    this.heightMap[x][z] = 2;
                }
                // Canal fluvial (Z entre 2 e 3 e |X| < 6): Altura Y = 0
                else if (z >= 2 && z <= 3 && Math.abs(x) < 6) {
                    this.heightMap[x][z] = 0;
                }
                // Centro da ilha (X entre -3 e 3, Z entre -3 e 3): Altura Y = 2
                else if (x >= -3 && x <= 3 && z >= -3 && z <= 3) {
                    this.heightMap[x][z] = 2;
                }
                // Bordas elevadas (|X| > 7 ou |Z| > 7): Altura Y = 3
                else if (Math.abs(x) > 7 || Math.abs(z) > 7) {
                    this.heightMap[x][z] = 3;
                }
                // Platô base
                else {
                    this.heightMap[x][z] = 2;
                }
            }
        }
    }

    buildTerrain() {
        const topMaterial = new THREE.MeshLambertMaterial({ color: 0x3b7a3a });
        const sideMaterial = new THREE.MeshLambertMaterial({ color: 0x4a3b32 });
        const materials = [sideMaterial, sideMaterial, topMaterial, sideMaterial, sideMaterial, sideMaterial];

        for (let x = -10; x < 10; x++) {
            for (let z = -10; z < 10; z++) {
                const height = this.heightMap[x][z];
                if (height > 0) {
                    const geo = new THREE.BoxGeometry(this.blockSize, height, this.blockSize);
                    const mesh = new THREE.Mesh(geo, materials);
                    mesh.position.set(x + 0.5, height / 2, z + 0.5);
                    mesh.receiveShadow = true;
                    mesh.castShadow = false; // Optimize terrain shadows
                    this.group.add(mesh);

                    const box = new THREE.Box3().setFromObject(mesh);
                    this.colliders.push(box);
                }
            }
        }
    }

    createWaterLayer() {
        const waterGeo = new THREE.PlaneGeometry(1, 1);
        const waterMat = new THREE.MeshStandardMaterial({
            color: 0x29adff,
            transparent: true,
            opacity: 0.75,
            roughness: 0.1,
            metalness: 0.2,
            depthWrite: false, // Prevent z-fighting and sorting issues
            side: THREE.DoubleSide
        });

        for (let x = -10; x < 10; x++) {
            for (let z = -10; z < 10; z++) {
                if (this.heightMap[x][z] === 0) {
                    const water = new THREE.Mesh(waterGeo, waterMat);
                    water.rotation.x = -Math.PI / 2;
                    water.position.set(x + 0.5, 0.45, z + 0.5);
                    water.renderOrder = 10; // Ensure it renders correctly with transparency
                    water.receiveShadow = true;
                    water.castShadow = false;
                    this.group.add(water);
                    this.waterMeshes.push(water);
                }
            }
        }
    }

    getColliders() {
        return this.colliders;
    }

    getHeightAt(x, z) {
        const gridX = Math.floor(x);
        const gridZ = Math.floor(z);

        if (gridX >= -10 && gridX < 10 && gridZ >= -10 && gridZ < 10) {
            if(this.heightMap[gridX] && typeof this.heightMap[gridX][gridZ] !== 'undefined') {
                 return this.heightMap[gridX][gridZ];
            }
        }
        return -50; // Abyss
    }

    update(time) {
        // Ondulação senoidal leve na camada d'água
        for (let i = 0; i < this.waterMeshes.length; i++) {
            this.waterMeshes[i].position.y = 0.45 + Math.sin(time * 2 + i) * 0.05;
        }
    }
}
