import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { BiomeBase } from '../BiomeBase.js';
import { Goblin } from '../../../characters/enemies/Goblin.js';
import { Slime } from '../../../characters/enemies/Slime.js';

export class BambooBiome extends BiomeBase {
    constructor(scene, mapInstance) {
        super(scene, mapInstance);
        this.setupMaterials();
    }

    setupMaterials() {
        this.matFloor = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, flatShading: true });
        this.matDirt = new THREE.MeshStandardMaterial({ color: 0x474a28, ...this.matBase });
        this.matRock = new THREE.MeshStandardMaterial({ color: 0x6e7d69, ...this.matBase });
        this.matWater = this.getWaterMaterial(0x4db6ac);

        this.planeGeo = new THREE.PlaneGeometry(1, 1); this.planeGeo.rotateX(-Math.PI/2);
        this.rockGeo = new THREE.IcosahedronGeometry(0.5, 0);

        this.bambooGeo = new THREE.CylinderGeometry(0.08, 0.12, 6.0, 5);
        this.bambooGeo.translate(0, 3.0, 0);
        this.bambooGeo.computeVertexNormals();

        this.bambooUniforms = this.map.grassUniforms; // Reuse uTime and uPlayerPos
        this.matBambooShader = new THREE.MeshStandardMaterial({ color: 0x8bc34a, roughness: 0.7, flatShading: true });
        this.matBambooShader.onBeforeCompile = (shader) => {
            shader.uniforms.uTime = this.bambooUniforms.uTime;
            shader.uniforms.uPlayerPos = this.bambooUniforms.uPlayerPos;
            shader.vertexShader = shader.vertexShader.replace('#include <common>', `#include <common>\nuniform float uTime;\nuniform vec3 uPlayerPos;\nvarying float vH;`);
            shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `
                #include <begin_vertex>
                vec4 worldPos = instanceMatrix * vec4(position, 1.0);
                if (position.y > 0.5) {
                    float wind = sin(uTime * 3.0 + worldPos.x * 0.5 + worldPos.z * 0.5) * 0.3 * (position.y / 6.0);
                    transformed.x += wind;
                    float dist = distance(worldPos.xz, uPlayerPos.xz);
                    if (dist < 1.0) { vec2 push = normalize(worldPos.xz - uPlayerPos.xz) * (1.0 - dist) * 0.5 * (position.y / 6.0); transformed.x += push.x; transformed.z += push.y; }
                }
                vH = position.y / 6.0;
            `);
            shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>\nvarying float vH;`);
            shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>\ndiffuseColor.rgb = mix(vec3(0.35, 0.53, 0.22), vec3(0.68, 0.88, 0.38), vH);`);
        };
    }

    build3DGeometry(terrainGroup, chunksList) {
        const offsetX = -this.gridSize/2;
        const offsetZ = -this.gridSize/2;

        const colorBaseFloor = new THREE.Color(0x7cb342); // Yellow-green
        const colorSpot = new THREE.Color(0x9ccc65);
        const colorTrail = new THREE.Color(0x558b2f);
        const tempColor = new THREE.Color();

        const numChunksX = Math.ceil(this.gridSize / this.CHUNK_SIZE);
        const numChunksZ = Math.ceil(this.gridSize / this.CHUNK_SIZE);

        const dummy = new THREE.Object3D();

        for (let cx = 0; cx < numChunksX; cx++) {
            for (let cz = 0; cz < numChunksZ; cz++) {
                const chunkGroup = new THREE.Group();

                const floorGeos = [], dirtGeos = [], waterGeos = [];
                const rockMatrices = [], bambooMatrices = [];

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
                            if (cell.distToPath <= 4 && Math.random() < 0.6) { // Dense Bamboo
                                let rndX = px + (Math.random()-0.5)*0.8;
                                let rndZ = pz + (Math.random()-0.5)*0.8;
                                dummy.position.set(rndX, surfaceY, rndZ);
                                dummy.rotation.set((Math.random()-0.5)*0.1, Math.random()*Math.PI, (Math.random()-0.5)*0.1);
                                dummy.scale.set(1.0, 1.0 + Math.random()*0.5, 1.0);
                                dummy.updateMatrix(); bambooMatrices.push(dummy.matrix.clone());
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

                            // Occasional bamboo on floor
                            if (Math.random() < 0.05 && cell.type !== this.TILE_TRAIL) {
                                dummy.position.set(px + (Math.random()-0.5)*0.8, surfaceY, pz + (Math.random()-0.5)*0.8);
                                dummy.rotation.set((Math.random()-0.5)*0.1, Math.random()*Math.PI, (Math.random()-0.5)*0.1);
                                dummy.scale.set(1.0, 0.8 + Math.random()*0.4, 1.0);
                                dummy.updateMatrix(); bambooMatrices.push(dummy.matrix.clone());
                            }
                        }
                    }
                }

                if (floorGeos.length > 0) { const mFloor = new THREE.Mesh(mergeGeometries(floorGeos), this.matFloor); mFloor.receiveShadow = true; chunkGroup.add(mFloor); }
                if (dirtGeos.length > 0) { const mDirt = new THREE.Mesh(mergeGeometries(dirtGeos), this.matDirt); mDirt.receiveShadow = true; mDirt.castShadow = false; chunkGroup.add(mDirt); }
                if (waterGeos.length > 0) { const mWater = new THREE.Mesh(mergeGeometries(waterGeos), this.matWater); mWater.renderOrder = 10; mWater.castShadow = false; mWater.receiveShadow = true; chunkGroup.add(mWater); }

                if (bambooMatrices.length > 0) {
                    const iBamboo = new THREE.InstancedMesh(this.bambooGeo, this.matBambooShader, bambooMatrices.length);
                    bambooMatrices.forEach((m, i) => iBamboo.setMatrixAt(i, m)); iBamboo.castShadow = true; iBamboo.receiveShadow = true; chunkGroup.add(iBamboo);
                }

                terrainGroup.add(chunkGroup);
                chunksList.push({ cx: cx, cz: cz, group: chunkGroup, canopies: [] });
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

                    const enemy = Math.random() < 0.6 ? new Goblin(this.scene, new THREE.Vector3(px, py, pz)) : new Slime(this.scene, new THREE.Vector3(px, py, pz));
                    enemiesArray.push(enemy);
                    enemiesCreated++;
                }
            }
        }
    }
}
