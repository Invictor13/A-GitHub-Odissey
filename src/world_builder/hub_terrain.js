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
        // Expand by ~35%. Original was -10 to 10 (20x20). New is -14 to 14 (28x28).
        const radiusSq = 13.5 * 13.5;
        for (let x = -14; x < 14; x++) {
            this.heightMap[x] = [];
            for (let z = -14; z < 14; z++) {
                // Determine if this cell is inside the rounded island (organic shape)
                const distSq = x * x + z * z;

                if (distSq > radiusSq) {
                    // Out of bounds
                    continue;
                }

                // Area norte do Portal (X entre -2 e 2, Z entre -12 e -7): Altura Y = 2
                if (x >= -2 && x <= 2 && z >= -12 && z <= -7) {
                    this.heightMap[x][z] = 2;
                }
                // Canal fluvial orgânico
                else if ((z >= 3 && z <= 5 && Math.abs(x) < 8) || (z >= 2 && z <= 4 && Math.abs(x) < 10)) {
                    this.heightMap[x][z] = 0;
                }
                // Centro da ilha: Altura Y = 2
                else if (Math.abs(x) <= 4 && Math.abs(z) <= 4) {
                    this.heightMap[x][z] = 2;
                }
                // Bordas elevadas orgânicas (distSq próximo ao raio ou ruído)
                else if (distSq > 10 * 10 && Math.random() > 0.4) {
                    this.heightMap[x][z] = 3;
                }
                // Platô base
                else {
                    // Vary between 1 and 2 for some organic terrain steps
                    this.heightMap[x][z] = Math.random() > 0.8 ? 1 : 2;
                }
            }
        }
    }

    buildTerrain() {
        const topMaterial = new THREE.MeshLambertMaterial({ color: 0x3b7a3a });
        const sideMaterial = new THREE.MeshLambertMaterial({ color: 0x4a3b32 });
        const materials = [sideMaterial, sideMaterial, topMaterial, sideMaterial, sideMaterial, sideMaterial];

        for (let x = -14; x < 14; x++) {
            for (let z = -14; z < 14; z++) {
                if (this.heightMap[x] && this.heightMap[x][z] !== undefined) {
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

        for (let x = -14; x < 14; x++) {
            for (let z = -14; z < 14; z++) {
                if (this.heightMap[x] && this.heightMap[x][z] === 0) {
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

        if (gridX >= -14 && gridX < 14 && gridZ >= -14 && gridZ < 14) {
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
