import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { BiomeBase } from '../BiomeBase.js';
import { Slime } from '../../../characters/enemies/Slime.js';
import { Goblin } from '../../../characters/enemies/Goblin.js';

export class MushroomBiome extends BiomeBase {
    constructor(scene, mapInstance) {
        super(scene, mapInstance);
        this.setupMaterials();
    }

    setupMaterials() {
        this.matFloor = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, flatShading: true });
        this.matDirt = new THREE.MeshStandardMaterial({ color: 0x1f1025, ...this.matBase });
        this.matRock = new THREE.MeshStandardMaterial({ color: 0x3d2b38, ...this.matBase });
        this.matWater = new THREE.MeshStandardMaterial({ color: 0x0ea5e9, transparent: true, opacity: 0.8, roughness: 0.1, flatShading: true, depthWrite: false }); // Maybe glowing water?

        this.planeGeo = new THREE.PlaneGeometry(1, 1); this.planeGeo.rotateX(-Math.PI/2);
        this.rockGeo = new THREE.IcosahedronGeometry(0.5, 0);

        // Giant Mushroom Props
        this.mushroomStemGeo = new THREE.CylinderGeometry(0.2, 0.3, 3.0, 6);
        this.mushroomStemGeo.translate(0, 1.5, 0);
        this.mushroomCapGeo = new THREE.ConeGeometry(1.5, 1.2, 8);
        this.mushroomCapGeo.translate(0, 3.5, 0);

        this.matMushroomStem = new THREE.MeshStandardMaterial({ color: 0xeae5e3, ...this.matBase });
        this.matMushroomCap1 = new THREE.MeshStandardMaterial({ color: 0x7b2cbf, ...this.matBase }); // Purple
        this.matMushroomCap2 = new THREE.MeshStandardMaterial({ color: 0x00b4d8, ...this.matBase }); // Cyan

        this.matPebble = new THREE.MeshStandardMaterial({ color: 0x221c27, ...this.matBase });
        this.pebbleGeo = new THREE.TetrahedronGeometry(0.15, 0);
    }

    build3DGeometry(terrainGroup, chunksList) {
        const offsetX = -this.gridSize/2;
        const offsetZ = -this.gridSize/2;

        const colorBaseFloor = new THREE.Color(0x3c1b40); // Dark purple ground
        const colorSpot = new THREE.Color(0x5c2b60);
        const colorTrail = new THREE.Color(0x2a162e);
        const tempColor = new THREE.Color();

        const numChunksX = Math.ceil(this.gridSize / this.CHUNK_SIZE);
        const numChunksZ = Math.ceil(this.gridSize / this.CHUNK_SIZE);

        const dummy = new THREE.Object3D();

        for (let cx = 0; cx < numChunksX; cx++) {
            for (let cz = 0; cz < numChunksZ; cz++) {
                const chunkGroup = new THREE.Group();

                const floorGeos = [], dirtGeos = [], waterGeos = [];
                const rockMatrices = [], pebbleMatrices = [];
                const stemMatrices = [], cap1Matrices = [], cap2Matrices = [];

                const startX = cx * this.CHUNK_SIZE;
                const endX = Math.min(this.gridSize, (cx + 1) * this.CHUNK_SIZE);
                const startZ = cz * this.CHUNK_SIZE;
                const endZ = Math.min(this.gridSize, (cz + 1) * this.CHUNK_SIZE);

                for (let x = startX; x < endX; x++) {
                    for (let z = startZ; z < endZ; z++) {
                        const px = x + offsetX; const pz = z + offsetZ;
                        const cell = this.grid[x][z];
                        if (cell.type === this.TILE_EMPTY) continue;

                        let surfaceY = cell.elev * this.STEP_HEIGHT;
                        let dirtTop = cell.type === this.TILE_WATER ? -0.5 : surfaceY;
                        let islandThickness = 15.0;

                        const dirtDepth = dirtTop + islandThickness;
                        const dGeo = new THREE.BoxGeometry(1, dirtDepth, 1);
                        dGeo.translate(px, dirtTop - (dirtDepth/2) - 0.02, pz);
                        if (dirtDepth > 0) dirtGeos.push(dGeo);

                        if (cell.type === this.TILE_SOLID) {
                            if (cell.distToPath <= 4 && Math.random() < 0.25) { // Giant Mushrooms
                                let rndX = px + (Math.random()-0.5)*0.8;
                                let rndZ = pz + (Math.random()-0.5)*0.8;

                                dummy.position.set(rndX, surfaceY, rndZ);
                                dummy.rotation.set((Math.random()-0.5)*0.2, Math.random()*Math.PI, (Math.random()-0.5)*0.2);
                                dummy.scale.setScalar(1.0 + Math.random()*1.0);
                                dummy.updateMatrix();
                                stemMatrices.push(dummy.matrix.clone());

                                if (Math.random() > 0.5) cap1Matrices.push(dummy.matrix.clone());
                                else cap2Matrices.push(dummy.matrix.clone());
                            }
                            if (cell.distToPath <= 3 && Math.random() < 0.15) { // Rocks
                                let rx = px + (Math.random()-0.5)*0.8;
                                let rz = pz + (Math.random()-0.5)*0.8;
                                dummy.position.set(rx, surfaceY + 0.3, rz);
                                dummy.rotation.set(Math.random(),Math.random(),Math.random()); dummy.scale.setScalar(1.5 + Math.random()*1.5);
                                dummy.updateMatrix(); rockMatrices.push(dummy.matrix.clone());
                            }
                        } else if (cell.type === this.TILE_WATER) {
                            const wGeo = this.planeGeo.clone(); wGeo.translate(px, surfaceY - 0.2, pz); waterGeos.push(wGeo);
                        } else if (cell.type === this.TILE_FLOOR || cell.type === this.TILE_TRAIL) {
                            const fGeo = this.planeGeo.clone(); fGeo.translate(px, surfaceY, pz);
                            const vColors = []; const vCount = fGeo.attributes.position.count;
                            const posAttr = fGeo.attributes.position;

                            let noiseVal = this.noiseGen.noise(px * 0.2, pz * 0.2);
                            let cellColor = colorBaseFloor;
                            if (cell.type === this.TILE_TRAIL) cellColor = colorTrail;
                            else if (noiseVal > 0.3) cellColor = colorSpot;

                            for(let vc=0; vc<vCount; vc++) {
                                let vNoise = this.noiseGen.noise(posAttr.getX(vc) * 0.8, posAttr.getZ(vc) * 0.8);
                                tempColor.copy(cellColor);
                                tempColor.offsetHSL(0, 0, vNoise * 0.08);
                                vColors.push(tempColor.r, tempColor.g, tempColor.b);
                            }
                            fGeo.setAttribute('color', new THREE.Float32BufferAttribute(vColors, 3));
                            floorGeos.push(fGeo);

                            if (Math.random() < 0.2 && cell.type !== this.TILE_TRAIL) {
                                dummy.position.set(px + (Math.random()-0.5)*0.8, surfaceY + 0.05, pz + (Math.random()-0.5)*0.8);
                                dummy.rotation.set(Math.random(), Math.random(), Math.random()); dummy.scale.setScalar(0.5 + Math.random()*1.0);
                                dummy.updateMatrix(); pebbleMatrices.push(dummy.matrix.clone());
                            }
                        }
                    }
                }

                if (floorGeos.length > 0) { const mFloor = new THREE.Mesh(mergeGeometries(floorGeos), this.matFloor); mFloor.receiveShadow = true; chunkGroup.add(mFloor); }
                if (dirtGeos.length > 0) { const mDirt = new THREE.Mesh(mergeGeometries(dirtGeos), this.matDirt); mDirt.receiveShadow = true; mDirt.castShadow = true; chunkGroup.add(mDirt); }
                if (waterGeos.length > 0) { const mWater = new THREE.Mesh(mergeGeometries(waterGeos), this.matWater); mWater.renderOrder = 5; chunkGroup.add(mWater); }

                if (stemMatrices.length > 0) {
                    const iStem = new THREE.InstancedMesh(this.mushroomStemGeo, this.matMushroomStem, stemMatrices.length);
                    stemMatrices.forEach((m, i) => iStem.setMatrixAt(i, m)); iStem.castShadow = true; iStem.receiveShadow = true; chunkGroup.add(iStem);
                }
                if (cap1Matrices.length > 0) {
                    const iCap1 = new THREE.InstancedMesh(this.mushroomCapGeo, this.matMushroomCap1, cap1Matrices.length);
                    cap1Matrices.forEach((m, i) => iCap1.setMatrixAt(i, m)); iCap1.castShadow = true; iCap1.receiveShadow = true; chunkGroup.add(iCap1);
                }
                if (cap2Matrices.length > 0) {
                    const iCap2 = new THREE.InstancedMesh(this.mushroomCapGeo, this.matMushroomCap2, cap2Matrices.length);
                    cap2Matrices.forEach((m, i) => iCap2.setMatrixAt(i, m)); iCap2.castShadow = true; iCap2.receiveShadow = true; chunkGroup.add(iCap2);
                }
                if (rockMatrices.length > 0) {
                    const iRock = new THREE.InstancedMesh(this.rockGeo, this.matRock, rockMatrices.length);
                    rockMatrices.forEach((m, i) => iRock.setMatrixAt(i, m)); iRock.castShadow = true; iRock.receiveShadow = true; chunkGroup.add(iRock);
                }
                if (pebbleMatrices.length > 0) {
                    const iPebble = new THREE.InstancedMesh(this.pebbleGeo, this.matPebble, pebbleMatrices.length);
                    pebbleMatrices.forEach((m, i) => iPebble.setMatrixAt(i, m)); chunkGroup.add(iPebble);
                }

                terrainGroup.add(chunkGroup);
                chunksList.push({ cx: cx, cz: cz, group: chunkGroup, canopies: [] }); // Anti-occlusion not applied here to simplify
            }
        }
    }

    spawnEnemies(enemiesArray) {
        const numEnemies = Math.floor(Math.random() * 4) + 6;
        let enemiesCreated = 0;

        if (this.map.rooms && this.map.rooms.length > 1) {
            for (let rIdx = 1; rIdx < this.map.rooms.length; rIdx++) {
                if (enemiesCreated >= numEnemies) break;
                const r = this.map.rooms[rIdx];
                const spawnX = r.x + Math.floor(Math.random() * r.w);
                const spawnZ = r.y + Math.floor(Math.random() * r.h);

                if (this.grid[spawnX] && this.grid[spawnX][spawnZ] && this.grid[spawnX][spawnZ].type === this.TILE_FLOOR) {
                    const px = spawnX - this.gridSize / 2;
                    const pz = spawnZ - this.gridSize / 2;
                    const py = this.grid[spawnX][spawnZ].elev * this.STEP_HEIGHT;

                    // Most slimes in mushroom biome
                    const enemy = Math.random() < 0.7 ? new Slime(this.scene, new THREE.Vector3(px, py, pz)) : new Goblin(this.scene, new THREE.Vector3(px, py, pz));
                    enemiesArray.push(enemy);
                    enemiesCreated++;
                }
            }
        }
    }
}
