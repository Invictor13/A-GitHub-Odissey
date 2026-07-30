import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { biomes } from '../config/biomes.js';

// Procedural textures
function createBumpTexture(type, size = 256) {
    const canvas = document.createElement('canvas'); canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d'); const imgData = ctx.createImageData(size, size);
    for (let i = 0; i < imgData.data.length; i += 4) {
        let val = 128;
        if (type === 'leather') val += (Math.random() * 80) - 40;
        else if (type === 'straw') val += (Math.sin(((i/4)%size)*0.8) * 35) + (Math.random()*20);
        else val += (Math.random() * 120) - 60; // noise
        imgData.data[i] = imgData.data[i+1] = imgData.data[i+2] = val; imgData.data[i+3] = 255;
    }
    ctx.putImageData(imgData, 0, 0); const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.RepeatWrapping; return tex;
}

const texLeatherBump = createBumpTexture('leather');
const texStrawBump = createBumpTexture('straw', 128);

const STEP_HEIGHT = 1.0;
const TILE_EMPTY = -1;
const TILE_SOLID = 0, TILE_FLOOR = 1, TILE_WATER = 2, TILE_BRIDGE = 3, TILE_TRAIL = 4;

const CHUNK_SIZE = 16;
const RENDER_CHUNK_RADIUS = 3;

class Room {
    constructor(x, y, w, h, id, targetRooms) {
        this.x = x; this.y = y; this.w = w; this.h = h;
        this.cx = Math.floor(x + w/2); this.cy = Math.floor(y + h/2);
        this.isLake = (id > 0 && id < targetRooms-1 && Math.random() < 0.25);
        this.elev = this.isLake ? 0 : Math.floor(Math.random() * 2) + 1;
    }
    intersects(other) { return (this.x <= other.x + other.w + 2 && this.x + this.w + 2 >= other.x && this.y <= other.y + other.h + 2 && this.y + this.h + 2 >= other.y); }
}

export class ProceduralMap {
    constructor(scene) {
        this.scene = scene;
        this.dungeonGroup = new THREE.Group();
        this.scene.add(this.dungeonGroup);

        this.terrainGroup = new THREE.Group(); this.dungeonGroup.add(this.terrainGroup);
        this.dynamicGroup = new THREE.Group(); this.dungeonGroup.add(this.dynamicGroup);

        this.mapW = 100;
        this.mapH = 100;
        this.grid = [];
        this.rooms = [];
        this.chunksList = [];
        this.currentBiomeId = 'campos_pastos';

        // Base materials that will be updated per biome
        this.matBase = { roughness: 0.85, flatShading: true };
        this.matFloor = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, flatShading: true });
        this.matDirt = new THREE.MeshStandardMaterial({ ...this.matBase, color: 0x543818 });
        this.matRock = new THREE.MeshStandardMaterial({ ...this.matBase, color: 0x64748b });
        this.matWater = new THREE.MeshStandardMaterial({ transparent: true, opacity: 0.82, roughness: 0.05, flatShading: true, depthWrite: false });
        this.matWater.renderOrder = 5;

        // Trees and vegetation
        this.matOakTrunk = new THREE.MeshStandardMaterial({ color: 0x522e11, ...this.matBase });
        this.matCanopy = new THREE.MeshStandardMaterial({ color: 0x16a34a, ...this.matBase, transparent: true, depthWrite: false });
        this.matCanopy.renderOrder = 10;
        this.matCanopy.onBeforeCompile = (shader) => {
            shader.vertexShader = `attribute float aOpacity; varying float vOpacity; ${shader.vertexShader}`.replace('#include <begin_vertex>', `#include <begin_vertex>\nvOpacity = aOpacity;`);
            shader.fragmentShader = `varying float vOpacity; ${shader.fragmentShader}`.replace('#include <color_fragment>', `#include <color_fragment>\ndiffuseColor.a *= vOpacity;`);
        };

        this.setupGrassMaterial();

        // Basic Geometries
        this.planeGeo = new THREE.PlaneGeometry(1, 1); this.planeGeo.rotateX(-Math.PI/2);
        this.trunkOakGeo = new THREE.CylinderGeometry(0.45, 0.6, 3.8, 6); this.trunkOakGeo.translate(0, 1.9, 0);
        this.fieldOakGeo = new THREE.IcosahedronGeometry(3.0, 1); this.fieldOakGeo.translate(0, 4.2, 0);
        this.rockGeo = new THREE.DodecahedronGeometry(0.65, 1);
        this.bushGeo = new THREE.DodecahedronGeometry(0.7, 0);
    }

    setupGrassMaterial() {
        this.grassGeo = new THREE.BufferGeometry();
        this.grassGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-0.12, 0, 0, 0.12, 0, 0, 0.0, 0.75, 0]), 3));
        this.grassGeo.computeVertexNormals();

        this.grassUniforms = { uTime: { value: 0 }, uPlayerPos: { value: new THREE.Vector3(999,999,999) } };
        this.matGrassShader = new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.9, flatShading: true });
        this.matGrassShader.onBeforeCompile = (shader) => {
            shader.uniforms.uTime = this.grassUniforms.uTime; shader.uniforms.uPlayerPos = this.grassUniforms.uPlayerPos;
            shader.vertexShader = shader.vertexShader.replace('#include <common>', `#include <common>\nuniform float uTime;\nuniform vec3 uPlayerPos;\nvarying vec3 vGrassTint;`);
            shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `
                #include <begin_vertex>
                vec4 worldPos = instanceMatrix * vec4(position, 1.0);
                if (position.y > 0.1) {
                    float wind = sin(uTime * 2.5 + worldPos.x * 0.8 + worldPos.z * 0.8) * 0.22;
                    transformed.x += wind; transformed.z += wind * 0.6;
                    float dist = distance(worldPos.xz, uPlayerPos.xz);
                    if (dist < 1.5) { vec2 push = normalize(worldPos.xz - uPlayerPos.xz) * (1.5 - dist) * 0.6; transformed.x += push.x; transformed.z += push.y; }
                }
                vGrassTint = mix(vec3(0.6), vec3(1.15), clamp(position.y * 1.8, 0.0, 1.0));
            `);
            shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>\nvarying vec3 vGrassTint;`);
            shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>\ndiffuseColor.rgb *= vGrassTint;`);
        };
    }

    setTile(x, z, type, elev) {
        if(x >= 0 && x < this.mapW && z >= 0 && z < this.mapH) {
            if (this.grid[x][z].type === TILE_WATER && type !== TILE_WATER && elev > 0) {
                this.grid[x][z].type = TILE_BRIDGE; this.grid[x][z].elev = elev;
            } else if (this.grid[x][z].type !== TILE_BRIDGE) {
                this.grid[x][z].type = type; this.grid[x][z].elev = elev;
            }
        }
    }

    generateGrid(targetRooms = 14) {
        this.grid = Array.from({length: this.mapW}, () => Array(this.mapH).fill(null).map(() => ({ type: TILE_SOLID, elev: 0, distToPath: 999 })));
        this.rooms = [];

        let attempts = 0;
        while(this.rooms.length < targetRooms && attempts < 700) {
            let w = Math.floor(Math.random() * 18) + 18;
            let h = Math.floor(Math.random() * 18) + 18;
            let x = Math.floor(Math.random() * (this.mapW - w - 2)) + 1;
            let y = Math.floor(Math.random() * (this.mapH - h - 2)) + 1;
            let r = new Room(x, y, w, h, this.rooms.length, targetRooms);
            if (!this.rooms.some(other => r.intersects(other))) {
                let rType = r.elev === 0 ? TILE_WATER : TILE_FLOOR;
                for(let ix = x; ix < x+w; ix++) {
                    for(let iy = y; iy < y+h; iy++) {
                        if(Math.random() < 0.99) this.setTile(ix, iy, rType, r.elev);
                    }
                }
                this.rooms.push(r);
            }
            attempts++;
        }

        // Paths
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
                let t = j / (path.length - 1 || 1);
                let elev = Math.round(r1.elev * (1 - t) + r2.elev * t);
                let px = path[j].x, pz = path[j].z;
                let cType = elev === 0 ? TILE_WATER : TILE_TRAIL;
                for(let dx=-5; dx<=5; dx++) {
                    for(let dz=-5; dz<=5; dz++) {
                        if (Math.abs(dx) + Math.abs(dz) <= 6 || Math.random() < 0.9) {
                            this.setTile(px+dx, pz+dz, cType, elev);
                        }
                    }
                }
            }
        }

        // Dilation
        let dilation = Array.from({length: this.mapW}, () => Array(this.mapH).fill(999));
        let queue = [];
        for (let x = 0; x < this.mapW; x++) {
            for (let z = 0; z < this.mapH; z++) {
                if (this.grid[x][z].type !== TILE_SOLID) { dilation[x][z] = 0; queue.push({x: x, z: z}); }
            }
        }

        let head = 0;
        while (head < queue.length) {
            let p = queue[head++]; let d = dilation[p.x][p.z];
            if (d >= 8) continue;
            let dirs = [[0,1], [1,0], [0,-1], [-1,0]];
            for (let dir of dirs) {
                let nx = p.x + dir[0], nz = p.z + dir[1];
                if (nx >= 0 && nx < this.mapW && nz >= 0 && nz < this.mapH && dilation[nx][nz] > d + 1) {
                    dilation[nx][nz] = d + 1; queue.push({x: nx, z: nz});
                }
            }
        }

        for (let x = 0; x < this.mapW; x++) {
            for (let z = 0; z < this.mapH; z++) {
                if (this.grid[x][z].type === TILE_SOLID) {
                    if (dilation[x][z] > 8) {
                        this.grid[x][z].type = TILE_EMPTY;
                    } else {
                        let maxElev = 0;
                        for(let dx=-2; dx<=2; dx++) {
                            for(let dz=-2; dz<=2; dz++) {
                                let nx = x+dx, nz = z+dz;
                                if(nx>=0 && nx<this.mapW && nz>=0 && nz<this.mapH && this.grid[nx][nz].type >= 0 && this.grid[nx][nz].type !== TILE_SOLID) {
                                    maxElev = Math.max(maxElev, this.grid[nx][nz].elev);
                                }
                            }
                        }
                        this.grid[x][z].elev = maxElev + Math.floor(dilation[x][z]*0.5);
                        this.grid[x][z].distToPath = dilation[x][z];
                    }
                }
            }
        }
    }

    clearGroup(group) {
        while (group.children.length > 0) {
            const child = group.children[0];
            if (child.isGroup) this.clearGroup(child);
            else {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
                    else child.material.dispose();
                }
            }
            group.remove(child);
        }
    }

    build3DGeometry(biomeId = 'campos_pastos') {
        this.clearGroup(this.terrainGroup);
        this.clearGroup(this.dynamicGroup);
        this.chunksList = [];
        this.currentBiomeId = biomeId;

        const offsetX = -this.mapW/2; const offsetZ = -this.mapH/2;
        const bConf = biomes[this.currentBiomeId];

        this.matDirt.color.setHex(bConf.dirt);
        this.matRock.color.setHex(bConf.rock);
        this.matCanopy.color.setHex(bConf.leafOak || bConf.leaf);
        this.matOakTrunk.color.setHex(bConf.trunkDark || bConf.trunk);
        this.matWater.color.setHex(bConf.water);

        const baseGrassColor = new THREE.Color(bConf.grassBright || bConf.grass);
        const tempColor = new THREE.Color();

        const numChunksX = Math.ceil(this.mapW / CHUNK_SIZE);
        const numChunksZ = Math.ceil(this.mapH / CHUNK_SIZE);

        for (let cx = 0; cx < numChunksX; cx++) {
            for (let cz = 0; cz < numChunksZ; cz++) {
                const chunkGroup = new THREE.Group();
                const floorGeos = [], dirtGeos = [], waterGeos = [];
                const grassMatrices = [], rockMatrices = [], canopyBaseMatrices = [], bushMatrices = [];
                const trunkMatrices = [];
                const dummy = new THREE.Object3D();

                const startX = cx * CHUNK_SIZE;
                const endX = Math.min(this.mapW, (cx + 1) * CHUNK_SIZE);
                const startZ = cz * CHUNK_SIZE;
                const endZ = Math.min(this.mapH, (cz + 1) * CHUNK_SIZE);

                for (let x = startX; x < endX; x++) {
                    for (let z = startZ; z < endZ; z++) {
                        const px = x + offsetX; const pz = z + offsetZ;
                        const cell = this.grid[x][z];
                        if (cell.type === TILE_EMPTY) continue;

                        let surfaceY = cell.elev * STEP_HEIGHT;
                        let dirtTop = cell.type === TILE_WATER ? -0.5 : surfaceY;

                        let minDistToRoom = 999;
                        this.rooms.forEach(r => { let d = Math.hypot(x - r.cx, z - r.cy); if (d < minDistToRoom) minDistToRoom = d; });
                        const depthFactor = Math.max(0, 1.0 - (minDistToRoom / 20.0));
                        const islandThickness = (8.0 + (18.0 * depthFactor) + Math.random() * 3.0) * (cell.type === TILE_SOLID && cell.distToPath ? Math.max(0.2, 1.0 - (cell.distToPath * 0.2)) : 1.0);

                        const dirtDepth = dirtTop + islandThickness;
                        const dGeo = new THREE.BoxGeometry(1, dirtDepth, 1);
                        dGeo.translate(px, dirtTop - (dirtDepth/2) - 0.02, pz);
                        if (dirtDepth > 0) dirtGeos.push(dGeo);

                        if (cell.type === TILE_SOLID) {
                            if (cell.distToPath <= 4 && Math.random() < bConf.treeDensity) {
                                let rndX = px + (Math.random()-0.5)*0.8; let rndZ = pz + (Math.random()-0.5)*0.8;
                                dummy.position.set(rndX, surfaceY, rndZ);
                                dummy.rotation.set(Math.random()*0.1, Math.random()*Math.PI, Math.random()*0.1);
                                dummy.scale.setScalar(1.2 + Math.random()*0.8);
                                dummy.updateMatrix();
                                canopyBaseMatrices.push({ matrix: dummy.matrix.clone(), pos: new THREE.Vector3(rndX, surfaceY, rndZ) });

                                dummy.position.set(rndX, surfaceY, rndZ);
                                dummy.rotation.set(0, Math.random()*Math.PI, 0);
                                dummy.scale.setScalar(1.0 + Math.random()*0.5);
                                dummy.updateMatrix();
                                trunkMatrices.push(dummy.matrix.clone());
                            }

                            if (cell.distToPath <= 3 && Math.random() < 0.15) {
                                let rx = px + (Math.random()-0.5)*0.8; let rz = pz + (Math.random()-0.5)*0.8;
                                dummy.position.set(rx, surfaceY + 0.3, rz);
                                dummy.rotation.set(Math.random(),Math.random(),Math.random()); dummy.scale.setScalar(1.4 + Math.random()*1.6);
                                dummy.updateMatrix(); rockMatrices.push(dummy.matrix.clone());
                            }
                        }
                        else {
                            if (cell.type === TILE_WATER) {
                                const wGeo = this.planeGeo.clone(); wGeo.translate(px, -0.15, pz); waterGeos.push(wGeo);
                            } else {
                                const fGeo = this.planeGeo.clone(); fGeo.translate(px, surfaceY, pz);
                                const vColors = []; const vCount = fGeo.attributes.position.count;

                                for(let vc=0; vc<vCount; vc++) {
                                    tempColor.copy(baseGrassColor);
                                    tempColor.offsetHSL(0, 0, (Math.random()-0.5)*0.06);
                                    vColors.push(tempColor.r, tempColor.g, tempColor.b);
                                }
                                fGeo.setAttribute('color', new THREE.Float32BufferAttribute(vColors, 3));
                                floorGeos.push(fGeo);

                                const instGrassColor = new THREE.Color().copy(baseGrassColor);
                                for(let i=0; i<6; i++) {
                                    dummy.position.set(px + (Math.random()-0.5)*0.9, surfaceY, pz + (Math.random()-0.5)*0.9);
                                    dummy.rotation.y = Math.random() * Math.PI; dummy.scale.setScalar(0.9 + Math.random()*1.0);
                                    dummy.updateMatrix(); grassMatrices.push({ matrix: dummy.matrix.clone(), color: instGrassColor });
                                }
                            }
                        }
                    }
                }

                if (floorGeos.length > 0) chunkGroup.add(new THREE.Mesh(mergeGeometries(floorGeos), this.matFloor));
                if (dirtGeos.length > 0) chunkGroup.add(new THREE.Mesh(mergeGeometries(dirtGeos), this.matDirt));
                if (waterGeos.length > 0) chunkGroup.add(new THREE.Mesh(mergeGeometries(waterGeos), this.matWater));

                if (trunkMatrices.length > 0) {
                    const iOakTrunk = new THREE.InstancedMesh(this.trunkOakGeo, this.matOakTrunk, trunkMatrices.length);
                    trunkMatrices.forEach((m, i) => iOakTrunk.setMatrixAt(i, m)); chunkGroup.add(iOakTrunk);
                }

                if (grassMatrices.length > 0) {
                    const iGrass = new THREE.InstancedMesh(this.grassGeo, this.matGrassShader, grassMatrices.length);
                    grassMatrices.forEach((m, i) => { iGrass.setMatrixAt(i, m.matrix); iGrass.setColorAt(i, m.color); });
                    chunkGroup.add(iGrass);
                }

                if (rockMatrices.length > 0) {
                    const iRock = new THREE.InstancedMesh(this.rockGeo, this.matRock, rockMatrices.length);
                    rockMatrices.forEach((m, i) => iRock.setMatrixAt(i, m)); chunkGroup.add(iRock);
                }

                let instCanopyMesh = null;
                if (canopyBaseMatrices.length > 0) {
                    const chunkCanopyGeo = this.fieldOakGeo.clone();
                    const opacityArray = new Float32Array(canopyBaseMatrices.length);
                    opacityArray.fill(1.0);
                    chunkCanopyGeo.setAttribute('aOpacity', new THREE.InstancedBufferAttribute(opacityArray, 1));
                    instCanopyMesh = new THREE.InstancedMesh(chunkCanopyGeo, this.matCanopy, canopyBaseMatrices.length);
                    const color = new THREE.Color(bConf.leafOak || bConf.leaf);
                    canopyBaseMatrices.forEach((data, i) => {
                        instCanopyMesh.setMatrixAt(i, data.matrix);
                        instCanopyMesh.setColorAt(i, color);
                    });
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
    }

    getFloorY(position) {
        let cGridX = Math.round(position.x + this.mapW/2);
        let cGridZ = Math.round(position.z + this.mapH/2);
        if (cGridX >= 0 && cGridX < this.mapW && cGridZ >= 0 && cGridZ < this.mapH) {
            let cell = this.grid[cGridX][cGridZ];
            if(cell && cell.type !== TILE_SOLID && cell.type !== TILE_EMPTY) {
                if (cell.type === TILE_WATER) return -0.5;
                return cell.elev * STEP_HEIGHT;
            }
        }
        return -50;
    }

    updateActiveChunks(playerPos) {
        const pX = playerPos.x + this.mapW/2;
        const pZ = playerPos.z + this.mapH/2;
        const pChunkX = Math.floor(pX / CHUNK_SIZE);
        const pChunkZ = Math.floor(pZ / CHUNK_SIZE);

        this.chunksList.forEach(c => {
            const isVisible = Math.abs(c.cx - pChunkX) <= RENDER_CHUNK_RADIUS && Math.abs(c.cz - pChunkZ) <= RENDER_CHUNK_RADIUS;
            c.group.visible = isVisible;
        });
    }

    updateAntiOcclusion(delta, camera, playerPos) {
        const px = playerPos.x;
        const py = playerPos.y + 1.8;
        const pz = playerPos.z;

        const cx = camera.position.x;
        const cy = camera.position.y;
        const cz = camera.position.z;

        const vX = px - cx; const vY = py - cy; const vZ = pz - cz;
        const vLenSq = vX * vX + vY * vY + vZ * vZ;
        const dummy = new THREE.Object3D();

        this.chunksList.forEach(chunk => {
            if (!chunk.group.visible || !chunk.canopyMesh) return;

            let matrixNeedsUpdate = false;
            let opacityNeedsUpdate = false;
            const opacities = chunk.canopyMesh.geometry.attributes.aOpacity.array;

            for (let i = 0; i < chunk.canopies.length; i++) {
                const data = chunk.canopies[i];
                const treeX = data.pos.x; const treeY = data.pos.y + 5.0; const treeZ = data.pos.z;

                const wX = treeX - cx; const wY = treeY - cy; const wZ = treeZ - cz;
                let t = vLenSq > 0.001 ? (wX * vX + wY * vY + wZ * vZ) / vLenSq : 0;
                t = Math.max(0, Math.min(1, t));

                const projX = cx + t * vX; const projY = cy + t * vY; const projZ = cz + t * vZ;
                const distToSight = Math.hypot(treeX - projX, treeY - projY, treeZ - projZ);
                const dist2D = Math.hypot(treeX - px, treeZ - pz);

                let targetOpacity = 1.0;
                if (distToSight < 7.5 || dist2D < 8.0) targetOpacity = 0.0;
                else if (distToSight < 13.0) targetOpacity = (distToSight - 7.5) / 5.5;

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
        if(playerPos) {
            this.grassUniforms.uPlayerPos.value.copy(playerPos);
            this.updateActiveChunks(playerPos);
            this.updateAntiOcclusion(delta, camera, playerPos);
        }
    }
}