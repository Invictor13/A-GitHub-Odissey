import * as THREE from 'three';

export class HubTerrain {
    constructor(scene) {
        this.scene = scene;
        this.gridSize = 27;
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
        for (let x = -14; x < 14; x++) {
            this.heightMap[x] = [];
            for (let z = -14; z < 14; z++) {
                const dist = Math.sqrt(x*x + z*z);

                // Area norte do Portal
                if (x >= -2 && x <= 2 && z >= -12 && z <= -8) {
                    this.heightMap[x][z] = 2;
                }
                // Canal fluvial
                else if (z >= 3 && z <= 5 && Math.abs(x) < 8) {
                    this.heightMap[x][z] = 0;
                }
                // Centro da ilha e camadas orgânicas
                else if (dist < 4) {
                    this.heightMap[x][z] = 2; // Platô central
                }
                else if (dist < 8) {
                    this.heightMap[x][z] = 1; // Segunda camada
                }
                else if (dist < 12) {
                    // Adicionar alguma variação orgânica
                    if (Math.sin(x * 0.8) + Math.cos(z * 0.8) > 0.5) {
                        this.heightMap[x][z] = 2; // Bordas elevadas irregulares
                    } else {
                        this.heightMap[x][z] = 1;
                    }
                }
                else if (dist < 13.5) {
                    this.heightMap[x][z] = 3; // Bordas rochosas
                }
                else {
                    this.heightMap[x][z] = -50; // Abismo
                }
            }
        }
    }

        buildTerrain() {
        const topMaterial = new THREE.MeshLambertMaterial({ color: 0x3b7a3a });
        const sideMaterial = new THREE.MeshLambertMaterial({ color: 0x4a3b32 });
        const materials = [sideMaterial, sideMaterial, topMaterial, sideMaterial, sideMaterial, sideMaterial];

        const grassMat = new THREE.MeshLambertMaterial({ color: 0x4ade80, side: THREE.DoubleSide });
        const flowerMat1 = new THREE.MeshLambertMaterial({ color: 0xfde047 }); // Amarelo
        const flowerMat2 = new THREE.MeshLambertMaterial({ color: 0xf472b6 }); // Rosa

        for (let x = -14; x < 14; x++) {
            for (let z = -14; z < 14; z++) {
                const height = this.heightMap[x][z];
                if (height > 0) {
                    const geo = new THREE.BoxGeometry(this.blockSize, height, this.blockSize);
                    const mesh = new THREE.Mesh(geo, materials);
                    mesh.position.set(x + 0.5, height / 2, z + 0.5);
                    mesh.receiveShadow = true;
                    mesh.castShadow = false;
                    this.group.add(mesh);

                    const box = new THREE.Box3().setFromObject(mesh);
                    this.colliders.push(box);

                    // Decoração procedural (grama e flores pontuais)
                    if (height < 3 && Math.random() > 0.7) {
                        const isFlower = Math.random() > 0.8;
                        const decGeo = isFlower ? new THREE.ConeGeometry(0.1, 0.3, 4) : new THREE.PlaneGeometry(0.3, 0.4);
                        const decMat = isFlower ? (Math.random() > 0.5 ? flowerMat1 : flowerMat2) : grassMat;
                        const dec = new THREE.Mesh(decGeo, decMat);

                        dec.position.set(
                            x + 0.2 + Math.random() * 0.6,
                            height + (isFlower ? 0.15 : 0.2),
                            z + 0.2 + Math.random() * 0.6
                        );

                        if (!isFlower) {
                            dec.rotation.y = Math.random() * Math.PI;
                        }

                        dec.castShadow = false;
                        dec.receiveShadow = false;
                        this.group.add(dec);
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
