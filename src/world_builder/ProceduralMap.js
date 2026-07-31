import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Skeleton } from '../characters/enemies/Skeleton.js';
import { Goblin } from '../characters/enemies/Goblin.js';
import { Slime } from '../characters/enemies/Slime.js';

export class ProceduralMap {
    constructor(scene) {
        this.scene = scene;
        this.mapGroup = new THREE.Group();
        this.scene.add(this.mapGroup);

        this.terrainGroup = new THREE.Group();
        this.mapGroup.add(this.terrainGroup);

        this.grid = [];
        this.enemies = [];
        this.chunksList = [];
        this.gridSize = 0;
        this.currentBiome = 'forest';

        this.TILE_EMPTY = -1;
        this.TILE_SOLID = 0;
        this.TILE_FLOOR = 1;

        this.CHUNK_SIZE = 16;
        this.RENDER_CHUNK_RADIUS = 3;

        this.exitPortal = null;
        this.portalSpawned = false;
        this.portalActive = false;
        this.currentIslandData = null; // Store current node info

        this.setupMaterials();
    }

    setupMaterials() {
        this.matBase = { roughness: 0.9, flatShading: true };
        this.matFloor = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, flatShading: true });
        this.matDirt = new THREE.MeshStandardMaterial({ color: 0x271c19, ...this.matBase });
        this.matRock = new THREE.MeshStandardMaterial({ color: 0x334155, ...this.matBase });
        this.matTrunk = new THREE.MeshStandardMaterial({ color: 0x1c1917, ...this.matBase });
        this.matCanopy = new THREE.MeshStandardMaterial({ color: 0x022c22, ...this.matBase, transparent: true, depthWrite: false });

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

        this.grassUniforms = { uTime: { value: 0 }, uPlayerPos: { value: new THREE.Vector3(999,999,999) } };
        this.matGrassShader = new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.9, flatShading: true });
        this.matGrassShader.onBeforeCompile = (shader) => {
            shader.uniforms.uTime = this.grassUniforms.uTime; shader.uniforms.uPlayerPos = this.grassUniforms.uPlayerPos;
            shader.vertexShader = shader.vertexShader.replace('#include <common>', `#include <common>\nuniform float uTime;\nuniform vec3 uPlayerPos;\nvarying vec3 vGrassTint;`);
            shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `
                #include <begin_vertex>
                vec4 worldPos = instanceMatrix * vec4(position, 1.0);
                if (position.y > 0.1) {
                    float wind = sin(uTime * 2.0 + worldPos.x + worldPos.z) * 0.15;
                    transformed.x += wind; transformed.z += wind * 0.5;
                    float dist = distance(worldPos.xz, uPlayerPos.xz);
                    if (dist < 1.4) { vec2 push = normalize(worldPos.xz - uPlayerPos.xz) * (1.4 - dist) * 0.5; transformed.x += push.x; transformed.z += push.y; }
                }
                vGrassTint = mix(vec3(0.4), vec3(1.0), clamp(position.y * 2.0, 0.0, 1.0));
            `);
            shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>\nvarying vec3 vGrassTint;`);
            shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>\ndiffuseColor.rgb *= vGrassTint;`);
        };

        this.planeGeo = new THREE.PlaneGeometry(1, 1); this.planeGeo.rotateX(-Math.PI/2);
        this.canopyGeo = new THREE.DodecahedronGeometry(2.5, 0); this.canopyGeo.translate(0, 5.0, 0);
        this.bushGeo = new THREE.DodecahedronGeometry(0.6, 0);
        this.rockGeo = new THREE.IcosahedronGeometry(0.5, 0);

        this.trunkGeo = new THREE.CylinderGeometry(0.22, 0.32, 5.0, 5);
        this.trunkGeo.translate(0, 2.5, 0);

        this.grassGeo = new THREE.BufferGeometry();
        this.grassGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-0.12, 0, 0, 0.12, 0, 0, 0.0, 0.6, 0]), 3));
        this.grassGeo.computeVertexNormals();
    }

    generateGrid(size, islandData = null) {
        this.currentIslandData = islandData;
        console.log(`Generating procedural grid of size ${size}`);
        this.gridSize = size;
        this.grid = new Array(size).fill(0).map(() => new Array(size).fill(0).map(() => ({ type: this.TILE_SOLID, elev: 0 })));

        // Simple cellular automata or room generation for floors
        const targetRooms = Math.floor(size / 10);
        this.rooms = [];
        let attempts = 0;

        while(this.rooms.length < targetRooms && attempts < 200) {
            let w = Math.floor(Math.random() * 10) + 8;
            let h = Math.floor(Math.random() * 10) + 8;
            let x = Math.floor(Math.random() * (size - w - 2)) + 1;
            let y = Math.floor(Math.random() * (size - h - 2)) + 1;

            let r = { x, y, w, h, cx: Math.floor(x + w/2), cy: Math.floor(y + h/2) };

            let intersects = this.rooms.some(other => (r.x <= other.x + other.w + 2 && r.x + r.w + 2 >= other.x && r.y <= other.y + other.h + 2 && r.y + r.h + 2 >= other.y));

            if (!intersects) {
                for(let ix = x; ix < x+w; ix++) {
                    for(let iy = y; iy < y+h; iy++) {
                        if(Math.random() < 0.95) {
                            this.grid[ix][iy].type = this.TILE_FLOOR;
                            this.grid[ix][iy].elev = 0;
                        }
                    }
                }
                this.rooms.push(r);
            }
            attempts++;
        }

        // Connect rooms
        for (let i = 1; i < this.rooms.length; i++) {
            let r1 = this.rooms[i-1], r2 = this.rooms[i];
            let cx = r1.cx, cy = r1.cy;
            let path = [{x: cx, z: cy}];
            while (cx !== r2.cx || cy !== r2.cy) {
                if (cx !== r2.cx) cx += Math.sign(r2.cx - cx);
                else if (cy !== r2.cy) cy += Math.sign(r2.cy - cy);
                path.push({x: cx, z: cy});
            }
            for (let j = 0; j < path.length; j++) {
                let px = path[j].x, pz = path[j].z;
                for(let dx=-2; dx<=2; dx++) {
                    for(let dz=-2; dz<=2; dz++) {
                        if (Math.abs(dx) + Math.abs(dz) <= 3) {
                            if (px+dx >= 0 && px+dx < size && pz+dz >= 0 && pz+dz < size) {
                                this.grid[px+dx][pz+dz].type = this.TILE_FLOOR;
                                this.grid[px+dx][pz+dz].elev = 0;
                            }
                        }
                    }
                }
            }
        }

        // Make sure center is floor
        for(let ix = size/2 - 5; ix < size/2 + 5; ix++) {
            for(let iy = size/2 - 5; iy < size/2 + 5; iy++) {
                 this.grid[ix][iy].type = this.TILE_FLOOR;
            }
        }
    }

    build3DGeometry(biome) {
        console.log(`Building 3D geometry for biome: ${biome}`);
        this.currentBiome = biome;

        // Clear previous
        while (this.terrainGroup.children.length > 0) {
            const child = this.terrainGroup.children[0];
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
                if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
                else child.material.dispose();
            }
            this.terrainGroup.remove(child);
        }
        this.chunksList = [];

        const offsetX = -this.gridSize/2;
        const offsetZ = -this.gridSize/2;

        const baseGrassColor = new THREE.Color(0x064e3b);
        const baseDirtColor = new THREE.Color(0x271c19);
        const tempColor = new THREE.Color();

        const numChunksX = Math.ceil(this.gridSize / this.CHUNK_SIZE);
        const numChunksZ = Math.ceil(this.gridSize / this.CHUNK_SIZE);

        for (let cx = 0; cx < numChunksX; cx++) {
            for (let cz = 0; cz < numChunksZ; cz++) {
                const chunkGroup = new THREE.Group();

                const floorGeos = [], dirtGeos = [];
                const grassMatrices = [], rockMatrices = [], canopyBaseMatrices = [], bushMatrices = [];
                const trunkMatrices = [], trunkData = [], rockData = [], bushData = [];
                const dummy = new THREE.Object3D();

                const startX = cx * this.CHUNK_SIZE;
                const endX = Math.min(this.gridSize, (cx + 1) * this.CHUNK_SIZE);
                const startZ = cz * this.CHUNK_SIZE;
                const endZ = Math.min(this.gridSize, (cz + 1) * this.CHUNK_SIZE);

                for (let x = startX; x < endX; x++) {
                    for (let z = startZ; z < endZ; z++) {
                        const px = x + offsetX; const pz = z + offsetZ;
                        const cell = this.grid[x][z];
                        if (cell.type === this.TILE_EMPTY) continue;

                        let surfaceY = cell.elev;

                        if (cell.type === this.TILE_SOLID) {
                            const dirtDepth = surfaceY + 1.5;
                            const dGeo = new THREE.BoxGeometry(1, dirtDepth, 1);
                            dGeo.translate(px, surfaceY - (dirtDepth/2), pz);
                            dirtGeos.push(dGeo);

                            // Check if near floor to spawn trees
                            let nearFloor = false;
                            for(let dx=-2; dx<=2; dx++) {
                                for(let dz=-2; dz<=2; dz++) {
                                    let nx = x+dx, nz = z+dz;
                                    if(nx>=0 && nx<this.gridSize && nz>=0 && nz<this.gridSize && this.grid[nx][nz].type === this.TILE_FLOOR) {
                                        nearFloor = true;
                                    }
                                }
                            }

                            if (nearFloor && Math.random() < 0.3) {
                                let rndX = px + (Math.random()-0.5)*0.9;
                                let rndZ = pz + (Math.random()-0.5)*0.9;

                                dummy.position.set(rndX, surfaceY, rndZ);
                                dummy.rotation.set(Math.random()*0.2, Math.random()*Math.PI, Math.random()*0.2);
                                dummy.scale.setScalar(1.8 + Math.random()*1.0);
                                dummy.updateMatrix();
                                canopyBaseMatrices.push({ matrix: dummy.matrix.clone(), pos: new THREE.Vector3(rndX, surfaceY, rndZ) });

                                dummy.position.set(rndX, surfaceY, rndZ);
                                dummy.rotation.set(0, Math.random()*Math.PI, 0);
                                dummy.scale.setScalar(1.2 + Math.random()*0.7);
                                dummy.updateMatrix();
                                trunkMatrices.push(dummy.matrix.clone());
                                trunkData.push({ pos: new THREE.Vector3(rndX, surfaceY + 2.5, rndZ) });
                            }

                            if (nearFloor && Math.random() < 0.2) {
                                let rx = px + (Math.random()-0.5)*0.8;
                                let rz = pz + (Math.random()-0.5)*0.8;
                                dummy.position.set(rx, surfaceY + 0.4, rz);
                                dummy.rotation.set(Math.random(),Math.random(),Math.random()); dummy.scale.setScalar(2.0 + Math.random()*2.0);
                                dummy.updateMatrix(); rockMatrices.push(dummy.matrix.clone());
                                rockData.push({ pos: new THREE.Vector3(rx, surfaceY + 0.4, rz) });
                            }

                        } else if (cell.type === this.TILE_FLOOR) {
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
                                dummy.rotation.y = Math.random() * Math.PI; dummy.scale.setScalar(0.8 + Math.random()*0.8);
                                dummy.updateMatrix(); grassMatrices.push({ matrix: dummy.matrix.clone(), color: baseGrassColor });
                            }
                        }
                    }
                }

                if (floorGeos.length > 0) { const mFloor = new THREE.Mesh(mergeGeometries(floorGeos), this.matFloor); mFloor.receiveShadow = true; chunkGroup.add(mFloor); }
                if (dirtGeos.length > 0) { const mDirt = new THREE.Mesh(mergeGeometries(dirtGeos), this.matDirt); mDirt.receiveShadow = true; mDirt.castShadow = true; chunkGroup.add(mDirt); }

                let iTrunk = null, iRock = null, iBush = null;
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
                    rockMatrices.forEach((m, i) => iRock.setMatrixAt(i, m)); iRock.castShadow = true; iRock.receiveShadow = true; chunkGroup.add(iRock);
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

                this.terrainGroup.add(chunkGroup);
                this.chunksList.push({
                    cx: cx, cz: cz,
                    group: chunkGroup,
                    canopyMesh: instCanopyMesh,
                    canopies: canopyBaseMatrices
                });
            }
        }

        this.spawnEnemies();
    }


    spawnEnemies() {
        const numEnemies = Math.floor(Math.random() * 4) + 8;
        // Keep track of total enemies created
        let enemiesCreated = 0;

        for (let i = 0; i < numEnemies * 2; i++) { // Give it some leeway to find spots
            if (enemiesCreated >= numEnemies) break;

            const tileX = (Math.random() - 0.5) * (this.gridSize * 0.8);
            const tileZ = (Math.random() - 0.5) * (this.gridSize * 0.8);

            if (Math.abs(tileX) < 15 && Math.abs(tileZ) < 15) {
                i--; continue;
            }

            // basic check if it's on floor (roughly)
            let gX = Math.round(tileX + this.gridSize/2);
            let gZ = Math.round(tileZ + this.gridSize/2);
            if (gX >= 0 && gX < this.gridSize && gZ >= 0 && gZ < this.gridSize) {
                if(this.grid[gX][gZ].type !== this.TILE_FLOOR) {
                    i--; continue;
                }
            }

            const pos = new THREE.Vector3(tileX, 0, tileZ);

            const rand = Math.random();
            let enemy;
            if (rand < 0.4) {
                enemy = new Slime(this.scene, pos);
            } else if (rand < 0.8) {
                enemy = new Skeleton(this.scene, pos);
            } else {
                enemy = new Goblin(this.scene, pos);
            }

            this.enemies.push(enemy);
            enemiesCreated++;
        }
    }

    spawnPortal() {
        if (this.portalSpawned) return;
        this.portalSpawned = true;

        this.exitPortal = new THREE.Group();

        // A glowing ring/cylinder
        const portalGeo = new THREE.TorusGeometry(1.5, 0.2, 16, 64);
        const portalMat = new THREE.MeshBasicMaterial({ color: 0x60a5fa, transparent: true, opacity: 0.8, side: THREE.DoubleSide });
        const portalMesh = new THREE.Mesh(portalGeo, portalMat);
        portalMesh.rotation.x = Math.PI / 2;
        portalMesh.position.y = 1.0;

        const innerGeo = new THREE.CylinderGeometry(1.4, 1.4, 4, 32, 1, true);
        const innerMat = new THREE.MeshBasicMaterial({ color: 0x93c5fd, transparent: true, opacity: 0.4, side: THREE.DoubleSide });
        const innerMesh = new THREE.Mesh(innerGeo, innerMat);
        innerMesh.position.y = 2.0;

        const light = new THREE.PointLight(0x60a5fa, 2, 10);
        light.position.y = 2.0;

        this.exitPortal.add(portalMesh);
        this.exitPortal.add(innerMesh);
        this.exitPortal.add(light);

        this.exitPortal.position.set(0, this.getFloorY(new THREE.Vector3(0,0,0)), 0);
        this.mapGroup.add(this.exitPortal);
        this.portalActive = true;
    }

    cleanup() {
        this.scene.remove(this.mapGroup);
        for (const enemy of this.enemies) {
            if (enemy && typeof enemy.destroy === 'function') {
                enemy.destroy();
            }
        }
        this.enemies = [];
        if (this.exitPortal) {
            this.mapGroup.remove(this.exitPortal);
            this.exitPortal = null;
        }
    }

    updateAntiOcclusion(delta, camera, playerPos) {
        if (!playerPos) return;

        const px = playerPos.x;
        const py = playerPos.y + 1.8;
        const pz = playerPos.z;

        const cx = camera.position.x;
        const cy = camera.position.y;
        const cz = camera.position.z;

        const vX = px - cx;
        const vY = py - cy;
        const vZ = pz - cz;
        const vLenSq = vX * vX + vY * vY + vZ * vZ;

        const dummy = new THREE.Object3D();

        this.chunksList.forEach(chunk => {
            if (!chunk.group.visible || !chunk.canopyMesh) return;

            let matrixNeedsUpdate = false;
            let opacityNeedsUpdate = false;
            const opacities = chunk.canopyMesh.geometry.attributes.aOpacity.array;

            for (let i = 0; i < chunk.canopies.length; i++) {
                const data = chunk.canopies[i];

                const treeX = data.pos.x;
                const treeY = data.pos.y + 6.0;
                const treeZ = data.pos.z;

                const wX = treeX - cx;
                const wY = treeY - cy;
                const wZ = treeZ - cz;

                let t = vLenSq > 0.001 ? (wX * vX + wY * vY + wZ * vZ) / vLenSq : 0;
                t = Math.max(0, Math.min(1, t));

                const projX = cx + t * vX;
                const projY = cy + t * vY;
                const projZ = cz + t * vZ;

                const distToSight = Math.hypot(treeX - projX, treeY - projY, treeZ - projZ);
                const dist2D = Math.hypot(treeX - px, treeZ - pz);

                let targetOpacity = 1.0;

                if (distToSight < 7.5 || dist2D < 8.0) {
                    targetOpacity = 0.0;
                } else if (distToSight < 13.0) {
                    targetOpacity = (distToSight - 7.5) / 5.5;
                }

                let currentOp = opacities[i];
                if (Math.abs(targetOpacity - currentOp) > 0.01) {
                    currentOp += (targetOpacity - currentOp) * (delta * 14.0);
                    opacities[i] = currentOp;
                    opacityNeedsUpdate = true;

                    const scaleFactor = Math.max(0.001, currentOp);
                    dummy.matrix.copy(data.matrix);
                    dummy.matrix.scale(new THREE.Vector3(scaleFactor, scaleFactor, scaleFactor));
                    chunk.canopyMesh.setMatrixAt(i, dummy.matrix);
                    matrixNeedsUpdate = true;
                }
            }

            if (opacityNeedsUpdate) chunk.canopyMesh.geometry.attributes.aOpacity.needsUpdate = true;
            if (matrixNeedsUpdate) chunk.canopyMesh.instanceMatrix.needsUpdate = true;
        });
    }

    update(delta, time, camera, playerPos) {
        this.grassUniforms.uTime.value = time;
        if (playerPos) this.grassUniforms.uPlayerPos.value.copy(playerPos);

        this.updateAntiOcclusion(delta, camera, playerPos);

        let allDead = true;
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            if (enemy.hp > 0) {
                allDead = false;
                enemy.update(delta, playerPos);
            }
        }

        // Spawn portal if all enemies are defeated and it hasn't spawned yet
        if (allDead && this.enemies.length > 0 && !this.portalSpawned) {
            this.spawnPortal();
        }

        // Portal animation and collision check
        if (this.portalActive && this.exitPortal) {
            this.exitPortal.children[0].rotation.z += delta * 2;
            this.exitPortal.children[1].rotation.y -= delta;

            // Check collision with player
            if (playerPos && playerPos.distanceTo(this.exitPortal.position) < 1.5) {
                this.portalActive = false; // Prevent multiple triggers

                // Track completion in GameState
                import('../core/GameState.js').then(({ default: gameState }) => {
                    if (this.currentIslandData) {
                        const nodeId = `${this.currentIslandData.gridX},${this.currentIslandData.gridZ}`;
                        if (!gameState.completedNodes.includes(nodeId)) {
                            gameState.completedNodes.push(nodeId);
                            gameState.pendingUnlocks = this.currentIslandData;
                            gameState.save();
                        }
                    }

                    // Transition back to world map
                    window.changeGameState('WORLD_MAP');
                });
            }
        }
    }

    getFloorY(pos) {
        let gX = Math.round(pos.x + this.gridSize/2);
        let gZ = Math.round(pos.z + this.gridSize/2);
        if (gX >= 0 && gX < this.gridSize && gZ >= 0 && gZ < this.gridSize) {
            return this.grid[gX][gZ].elev;
        }
        return 0;
    }
}
