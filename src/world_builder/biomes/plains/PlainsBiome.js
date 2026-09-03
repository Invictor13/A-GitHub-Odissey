import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { BiomeBase } from '../BiomeBase.js';
import { Slime } from '../../../characters/enemies/Slime.js';
import { Goblin } from '../../../characters/enemies/Goblin.js';
import { Kobold } from '../../../characters/enemies/Kobold.js';
// Plains might have mostly slimes or weaker enemies

export class PlainsBiome extends BiomeBase {
    constructor(scene, mapInstance) {
        super(scene, mapInstance);
        this.setupMaterials();
    }

    setupMaterials() {
        this.matFloor = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, flatShading: true });
        this.matDirt = new THREE.MeshStandardMaterial({ color: 0x3e2723, ...this.matBase });
        this.matRock = new THREE.MeshStandardMaterial({ color: 0x607d8b, ...this.matBase });
        this.matTrunk = new THREE.MeshStandardMaterial({ color: 0x4e342e, ...this.matBase });
        this.matWater = this.getWaterMaterial(0x38bdf8);
        this.matCanopy = new THREE.MeshStandardMaterial({ color: 0x33691e, ...this.matBase, transparent: true, depthWrite: false });

        this.matCanopy.onBeforeCompile = (shader) => {
            shader.vertexShader = `
                attribute float aOpacity;
                varying float vOpacity;
                ${shader.vertexShader}
            `.replace('#include <begin_vertex>', `
                #include <begin_vertex>
                vOpacity = aOpacity;
            `);
            shader.fragmentShader = `
                varying float vOpacity;
                ${shader.fragmentShader}
            `.replace('#include <color_fragment>', `
                #include <color_fragment>
                diffuseColor.a *= vOpacity;
            `);
        };

        this.grassUniforms = this.map.grassUniforms;
        this.matGrassShader = new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.8, flatShading: true });
        this.matGrassShader.onBeforeCompile = (shader) => {
            shader.uniforms.uTime = this.grassUniforms.uTime; shader.uniforms.uPlayerPos = this.grassUniforms.uPlayerPos;
            shader.vertexShader = shader.vertexShader.replace('#include <common>', `#include <common>\nuniform float uTime;\nuniform vec3 uPlayerPos;\nvarying vec3 vGrassTint;`);
            shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `
                #include <begin_vertex>
                vec4 worldPos = instanceMatrix * vec4(position, 1.0);
                if (position.y > 0.1) {
                    float wind = sin(uTime * 3.0 + worldPos.x + worldPos.z) * 0.2; // Stronger wind in plains
                    transformed.x += wind; transformed.z += wind * 0.5;
                    float dist = distance(worldPos.xz, uPlayerPos.xz);
                    if (dist < 1.4) { vec2 push = normalize(worldPos.xz - uPlayerPos.xz) * (1.4 - dist) * 0.5; transformed.x += push.x; transformed.z += push.y; }
                }
                vGrassTint = mix(vec3(0.6), vec3(1.0), clamp(position.y * 2.0, 0.0, 1.0));
            `);
            shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>\nvarying vec3 vGrassTint;`);
            shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>\ndiffuseColor.rgb *= vGrassTint;`);
        };

        this.planeGeo = new THREE.PlaneGeometry(1, 1); this.planeGeo.rotateX(-Math.PI/2);
        this.canopyGeo = new THREE.DodecahedronGeometry(2.0, 0); this.canopyGeo.translate(0, 4.0, 0); // Smaller trees
        this.rockGeo = new THREE.IcosahedronGeometry(0.5, 0);

        this.trunkGeo = new THREE.CylinderGeometry(0.15, 0.25, 4.0, 5);
        this.trunkGeo.translate(0, 2.0, 0);

        this.grassGeo = new THREE.BufferGeometry();
        this.grassGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-0.1, 0, 0, 0.1, 0, 0, 0.0, 0.5, 0]), 3));
        this.grassGeo.computeVertexNormals();
    }

    build3DGeometry(terrainGroup, chunksList) {
        const offsetX = -this.gridSize/2;
        const offsetZ = -this.gridSize/2;

        const baseGrassColor = new THREE.Color(0x558b2f); // Lighter, yellowish green for plains
        const baseDirtColor = new THREE.Color(0x3e2723);
        const tempColor = new THREE.Color();

        const numChunksX = Math.ceil(this.gridSize / this.CHUNK_SIZE);
        const numChunksZ = Math.ceil(this.gridSize / this.CHUNK_SIZE);

        const dummy = new THREE.Object3D();

        for (let cx = 0; cx < numChunksX; cx++) {
            for (let cz = 0; cz < numChunksZ; cz++) {
                const chunkGroup = new THREE.Group();

                const floorGeos = [], dirtGeos = [], waterGeos = [];
                const grassMatrices = [], rockMatrices = [], canopyBaseMatrices = [];
                const trunkMatrices = [], trunkData = [], rockData = [];

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
                        let dirtTop = surfaceY;

                        let minDistToRoom = 999;
                        if (this.map.rooms) {
                            this.map.rooms.forEach(r => { let d = Math.hypot(x - r.cx, z - r.cy); if (d < minDistToRoom) minDistToRoom = d; });
                        }
                        const depthFactor = Math.max(0, 1.0 - (minDistToRoom / 20.0));
                        const distToPathMult = (cell.type === this.TILE_SOLID && cell.distToPath !== undefined) ? Math.max(0.2, 1.0 - (cell.distToPath * 0.2)) : 1.0;
                        const islandThickness = (8.0 + (18.0 * depthFactor) + Math.random() * 3.0) * distToPathMult;

                        const dirtDepth = dirtTop + islandThickness;
                        const dGeo = new THREE.BoxGeometry(1, dirtDepth, 1);
                        dGeo.translate(px, dirtTop - (dirtDepth/2) - 0.02, pz);
                        if (dirtDepth > 0) dirtGeos.push(dGeo);

                        let isBoundary = false;
                        if (cell.type === this.TILE_SOLID && cell.distToPath <= 2) {
                            isBoundary = true;
                        } else if (cell.type === this.TILE_FLOOR) {
                            for(let dx=-1; dx<=1; dx+=2) {
                                for(let dz=-1; dz<=1; dz+=2) {
                                    let nx = x+dx, nz = z+dz;
                                    if (nx>=0 && nx<this.gridSize && nz>=0 && nz<this.gridSize && (this.grid[nx][nz].type === this.TILE_TRAIL || this.grid[nx][nz].type === this.TILE_SOLID)) {
                                        isBoundary = true;
                                    }
                                }
                            }
                        }

                        if (cell.type === this.TILE_SOLID) {
                            if (cell.distToPath <= 4 && Math.random() < 0.05) {
                                let rndX = px + (Math.random()-0.5)*0.9;
                                let rndZ = pz + (Math.random()-0.5)*0.9;

                                dummy.position.set(rndX, surfaceY, rndZ);
                                dummy.rotation.set(Math.random()*0.2, Math.random()*Math.PI, Math.random()*0.2);
                                dummy.scale.setScalar(1.5 + Math.random()*0.5);
                                dummy.updateMatrix();
                                canopyBaseMatrices.push({ matrix: dummy.matrix.clone(), pos: new THREE.Vector3(rndX, surfaceY, rndZ) });

                                dummy.position.set(rndX, surfaceY, rndZ);
                                dummy.rotation.set(0, Math.random()*Math.PI, 0);
                                dummy.scale.setScalar(1.0 + Math.random()*0.4);
                                dummy.updateMatrix();
                                trunkMatrices.push(dummy.matrix.clone());
                                trunkData.push({ pos: new THREE.Vector3(rndX, surfaceY + 2.0, rndZ) });
                            }

                            if (cell.distToPath <= 3 && Math.random() < 0.25) {
                                let rx = px + (Math.random()-0.5)*0.8;
                                let rz = pz + (Math.random()-0.5)*0.8;
                                dummy.position.set(rx, surfaceY + 0.3, rz);
                                dummy.rotation.set(Math.random(),Math.random(),Math.random()); dummy.scale.setScalar(2.0 + Math.random()*2.0);
                                dummy.updateMatrix(); rockMatrices.push(dummy.matrix.clone());
                                rockData.push({ pos: new THREE.Vector3(rx, surfaceY + 0.3, rz) });
                            }

                        } else if (cell.type === this.TILE_WATER) {
                            const wGeo = this.waterPlaneGeo.clone();
                            wGeo.translate(px, surfaceY + 0.18, pz);
                            waterGeos.push(wGeo);
                        } else if (cell.type === this.TILE_FLOOR || cell.type === this.TILE_TRAIL) {
                            const fGeo = this.planeGeo.clone(); fGeo.translate(px, surfaceY, pz);
                            const vColors = []; const vCount = fGeo.attributes.position.count;

                            for(let vc=0; vc<vCount; vc++) {
                                tempColor.copy(baseGrassColor);
                                tempColor.offsetHSL(0, 0, (Math.random()-0.5)*0.08);
                                vColors.push(tempColor.r, tempColor.g, tempColor.b);
                            }
                            fGeo.setAttribute('color', new THREE.Float32BufferAttribute(vColors, 3));
                            floorGeos.push(fGeo);

                            for(let i=0; i<3; i++) {
                                dummy.position.set(px + (Math.random()-0.5)*0.9, surfaceY, pz + (Math.random()-0.5)*0.9);
                                dummy.rotation.y = Math.random() * Math.PI; dummy.scale.setScalar(0.7 + Math.random()*0.6);
                                dummy.updateMatrix(); grassMatrices.push({ matrix: dummy.matrix.clone(), color: baseGrassColor });
                            }
                        }
                    }
                }

                if (floorGeos.length > 0) { const mFloor = new THREE.Mesh(mergeGeometries(floorGeos), this.matFloor); mFloor.receiveShadow = true; chunkGroup.add(mFloor); }
                if (dirtGeos.length > 0) { const mDirt = new THREE.Mesh(mergeGeometries(dirtGeos), this.matDirt); mDirt.receiveShadow = true; mDirt.castShadow = false; chunkGroup.add(mDirt); }
                if (waterGeos.length > 0) { const mWater = new THREE.Mesh(mergeGeometries(waterGeos), this.matWater); mWater.renderOrder = 10; mWater.castShadow = false; mWater.receiveShadow = true; chunkGroup.add(mWater); }

                let iTrunk = null, iRock = null;
                if (trunkMatrices.length > 0) {
                    iTrunk = new THREE.InstancedMesh(this.trunkGeo, this.matTrunk.clone(), trunkMatrices.length);
                    trunkMatrices.forEach((m, i) => iTrunk.setMatrixAt(i, m)); iTrunk.castShadow = true; iTrunk.receiveShadow = true; chunkGroup.add(iTrunk);
                }
                if (grassMatrices.length > 0) {
                    const iGrass = new THREE.InstancedMesh(this.grassGeo, this.matGrassShader, grassMatrices.length);
                    grassMatrices.forEach((m, i) => { iGrass.setMatrixAt(i, m.matrix); iGrass.setColorAt(i, m.color); });
                    chunkGroup.add(iGrass);
                }
                if (rockMatrices.length > 0) {
                    iRock = new THREE.InstancedMesh(this.rockGeo, this.matRock.clone(), rockMatrices.length);
                    rockMatrices.forEach((m, i) => iRock.setMatrixAt(i, m)); iRock.castShadow = false; iRock.receiveShadow = false; chunkGroup.add(iRock);
                }

                let instCanopyMesh = null;
                if (canopyBaseMatrices.length > 0) {
                    const chunkCanopyGeo = this.canopyGeo.clone();
                    const opacityArray = new Float32Array(canopyBaseMatrices.length);
                    opacityArray.fill(1.0);
                    chunkCanopyGeo.setAttribute('aOpacity', new THREE.InstancedBufferAttribute(opacityArray, 1));

                    instCanopyMesh = new THREE.InstancedMesh(chunkCanopyGeo, this.matCanopy, canopyBaseMatrices.length);
                    const defaultColor = new THREE.Color(0xffffff);
                    canopyBaseMatrices.forEach((data, i) => {
                        instCanopyMesh.setMatrixAt(i, data.matrix);
                        instCanopyMesh.setColorAt(i, defaultColor);
                    });
                    instCanopyMesh.castShadow = true;
                    instCanopyMesh.receiveShadow = false;
                    chunkGroup.add(instCanopyMesh);
                }

                terrainGroup.add(chunkGroup);
                chunksList.push({
                    cx: cx, cz: cz,
                    group: chunkGroup,
                    canopyMesh: instCanopyMesh,
                    canopies: canopyBaseMatrices
                });
            }
        }
    }

    spawnEnemies(enemiesArray) {
        const numEnemies = Math.floor(Math.random() * 3) + 3;
        let enemiesCreated = 0;

        for (let attempts = 0; attempts < 100 && enemiesCreated < numEnemies; attempts++) {
            const spawnX = Math.floor(Math.random() * (this.gridSize - 8)) + 4;
            const spawnZ = Math.floor(Math.random() * (this.gridSize - 8)) + 4;

            if (this.grid[spawnX] && this.grid[spawnX][spawnZ] && this.grid[spawnX][spawnZ].type === this.TILE_FLOOR) {
                const px = spawnX - this.gridSize / 2;
                const pz = spawnZ - this.gridSize / 2;
                const py = this.grid[spawnX][spawnZ].elev * this.STEP_HEIGHT;

                const rand = Math.random();
                let enemy;
                if (rand < 0.6) enemy = new Slime(this.scene, new THREE.Vector3(px, py, pz));
                else if (rand < 0.8) enemy = new Goblin(this.scene, new THREE.Vector3(px, py, pz));
                else enemy = new Kobold(this.scene, new THREE.Vector3(px, py, pz));

                if (this.map && this.map.mapGroup && enemy.group) {
                    this.map.mapGroup.add(enemy.group);
                }

                enemiesArray.push(enemy);
                enemiesCreated++;
            }
        }
    }
}