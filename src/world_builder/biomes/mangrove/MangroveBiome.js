import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { BiomeBase } from '../BiomeBase.js';
import { Slime } from '../../../characters/enemies/Slime.js';
import { Lizardman } from '../../../characters/enemies/Lizardman.js';

export class MangroveBiome extends BiomeBase {
    constructor(scene, mapInstance) {
        super(scene, mapInstance);
        this.setupMaterials();
    }

    setupMaterials() {
        this.matFloor = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, flatShading: true });
        this.matDirt = new THREE.MeshStandardMaterial({ color: 0x1f2617, ...this.matBase });
        this.matRock = new THREE.MeshStandardMaterial({ color: 0x2e3825, ...this.matBase });
        this.matWater = this.getWaterMaterial(0x3d5431); // Muddy green water

        this.planeGeo = new THREE.PlaneGeometry(1, 1); this.planeGeo.rotateX(-Math.PI/2);
        this.rockGeo = new THREE.IcosahedronGeometry(0.5, 0);

        // Mangrove Roots and Trees
        this.rootGeo = new THREE.CylinderGeometry(0.08, 0.2, 2.5, 5);
        this.rootGeo.translate(0, 1.25, 0);
        this.treeGeo = new THREE.CylinderGeometry(0.3, 0.4, 4.0, 6);
        this.treeGeo.translate(0, 2.0, 0);
        this.canopyGeo = new THREE.DodecahedronGeometry(3.0, 0);
        this.canopyGeo.translate(0, 5.0, 0);

        this.matWood = new THREE.MeshStandardMaterial({ color: 0x221a14, ...this.matBase });
        this.matCanopy = new THREE.MeshStandardMaterial({ color: 0x143314, ...this.matBase, transparent: true, opacity: 0.9, depthWrite: false });
    }

    build3DGeometry(terrainGroup, chunksList) {
        const offsetX = -this.gridSize/2;
        const offsetZ = -this.gridSize/2;

        const colorBaseFloor = new THREE.Color(0x2a361e); // Dark muddy green
        const colorSpot = new THREE.Color(0x384a27);
        const colorTrail = new THREE.Color(0x1f2617);
        const tempColor = new THREE.Color();

        const numChunksX = Math.ceil(this.gridSize / this.CHUNK_SIZE);
        const numChunksZ = Math.ceil(this.gridSize / this.CHUNK_SIZE);

        const dummy = new THREE.Object3D();

        for (let cx = 0; cx < numChunksX; cx++) {
            for (let cz = 0; cz < numChunksZ; cz++) {
                const chunkGroup = new THREE.Group();

                const floorGeos = [], dirtGeos = [], waterGeos = [];
                const rockMatrices = [], treeMatrices = [], rootMatrices = [], canopyMatrices = [];

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
                        let islandThickness = 12.0;

                        const dirtDepth = dirtTop + islandThickness;
                        const dGeo = new THREE.BoxGeometry(1, dirtDepth, 1);
                        dGeo.translate(px, dirtTop - (dirtDepth/2) - 0.02, pz);
                        if (dirtDepth > 0) dirtGeos.push(dGeo);

                        if (cell.type === this.TILE_SOLID) {
                            if (cell.distToPath <= 4 && Math.random() < 0.3) { // Trees & Roots
                                let rndX = px + (Math.random()-0.5)*0.8;
                                let rndZ = pz + (Math.random()-0.5)*0.8;
                                dummy.position.set(rndX, surfaceY, rndZ);
                                dummy.rotation.set((Math.random()-0.5)*0.1, Math.random()*Math.PI, (Math.random()-0.5)*0.1);
                                dummy.scale.set(1.0, 1.0 + Math.random()*0.5, 1.0);
                                dummy.updateMatrix();
                                treeMatrices.push(dummy.matrix.clone());
                                canopyMatrices.push(dummy.matrix.clone());

                                // Add roots spreading out
                                for(let r=0; r<4; r++) {
                                    dummy.position.set(rndX, surfaceY + 0.5, rndZ);
                                    dummy.rotation.set((Math.random()-0.5)*1.0, (r * Math.PI/2) + Math.random(), (Math.random()-0.5)*1.0);
                                    dummy.scale.set(1.0, 1.0, 1.0);
                                    dummy.updateMatrix(); rootMatrices.push(dummy.matrix.clone());
                                }
                            }
                            if (cell.distToPath <= 3 && Math.random() < 0.1) { // Rocks
                                let rx = px + (Math.random()-0.5)*0.8;
                                let rz = pz + (Math.random()-0.5)*0.8;
                                dummy.position.set(rx, surfaceY + 0.3, rz);
                                dummy.rotation.set(Math.random(),Math.random(),Math.random()); dummy.scale.setScalar(1.5 + Math.random()*1.0);
                                dummy.updateMatrix(); rockMatrices.push(dummy.matrix.clone());
                            }
                        } else if (cell.type === this.TILE_WATER) {
                            const wGeo = this.planeGeo.clone(); wGeo.translate(px, surfaceY - 0.2, pz); waterGeos.push(wGeo);
                            // Mangrove roots in water
                            if (Math.random() < 0.1) {
                                dummy.position.set(px + (Math.random()-0.5)*0.5, surfaceY - 0.5, pz + (Math.random()-0.5)*0.5);
                                dummy.rotation.set((Math.random()-0.5)*0.5, Math.random()*Math.PI, (Math.random()-0.5)*0.5);
                                dummy.scale.set(1.0, 1.5, 1.0);
                                dummy.updateMatrix(); rootMatrices.push(dummy.matrix.clone());
                            }
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
                                tempColor.offsetHSL(0, 0, vNoise * 0.05);
                                vColors.push(tempColor.r, tempColor.g, tempColor.b);
                            }
                            fGeo.setAttribute('color', new THREE.Float32BufferAttribute(vColors, 3));
                            floorGeos.push(fGeo);

                            // Random roots popping up
                            if (Math.random() < 0.05 && cell.type !== this.TILE_TRAIL) {
                                dummy.position.set(px + (Math.random()-0.5)*0.8, surfaceY - 0.5, pz + (Math.random()-0.5)*0.8);
                                dummy.rotation.set((Math.random()-0.5)*1.0, Math.random()*Math.PI, (Math.random()-0.5)*1.0);
                                dummy.scale.set(0.6, 1.0, 0.6);
                                dummy.updateMatrix(); rootMatrices.push(dummy.matrix.clone());
                            }
                        }
                    }
                }

                if (floorGeos.length > 0) { const mFloor = new THREE.Mesh(mergeGeometries(floorGeos), this.matFloor); mFloor.receiveShadow = true; chunkGroup.add(mFloor); }
                if (dirtGeos.length > 0) { const mDirt = new THREE.Mesh(mergeGeometries(dirtGeos), this.matDirt); mDirt.receiveShadow = true; mDirt.castShadow = true; chunkGroup.add(mDirt); }
                if (waterGeos.length > 0) { const mWater = new THREE.Mesh(mergeGeometries(waterGeos), this.matWater); mWater.renderOrder = 5; chunkGroup.add(mWater); }

                if (treeMatrices.length > 0) {
                    const iTree = new THREE.InstancedMesh(this.treeGeo, this.matWood, treeMatrices.length);
                    treeMatrices.forEach((m, i) => iTree.setMatrixAt(i, m)); iTree.castShadow = true; iTree.receiveShadow = true; chunkGroup.add(iTree);
                }
                if (rootMatrices.length > 0) {
                    const iRoot = new THREE.InstancedMesh(this.rootGeo, this.matWood, rootMatrices.length);
                    rootMatrices.forEach((m, i) => iRoot.setMatrixAt(i, m)); iRoot.castShadow = true; iRoot.receiveShadow = true; chunkGroup.add(iRoot);
                }
                if (canopyMatrices.length > 0) {
                    const iCanopy = new THREE.InstancedMesh(this.canopyGeo, this.matCanopy, canopyMatrices.length);
                    canopyMatrices.forEach((m, i) => iCanopy.setMatrixAt(i, m)); iCanopy.castShadow = true; chunkGroup.add(iCanopy);
                }
                if (rockMatrices.length > 0) {
                    const iRock = new THREE.InstancedMesh(this.rockGeo, this.matRock, rockMatrices.length);
                    rockMatrices.forEach((m, i) => iRock.setMatrixAt(i, m)); iRock.castShadow = true; iRock.receiveShadow = true; chunkGroup.add(iRock);
                }

                terrainGroup.add(chunkGroup);
                chunksList.push({ cx: cx, cz: cz, group: chunkGroup, canopies: [] });
            }
        }
    }

    spawnEnemies(enemiesArray) {
        const numEnemies = Math.floor(Math.random() * 5) + 6;
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

                    const enemy = Math.random() < 0.6 ? new Slime(this.scene, new THREE.Vector3(px, py, pz)) : new Lizardman(this.scene, new THREE.Vector3(px, py, pz));
                    enemiesArray.push(enemy);
                    enemiesCreated++;
                }
            }
        }
    }
}
