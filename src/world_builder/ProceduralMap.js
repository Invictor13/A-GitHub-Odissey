import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { ForestBiome } from './biomes/forest/ForestBiome.js';
import { PlainsBiome } from './biomes/plains/PlainsBiome.js';

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
        this.currentBiomeId = 'floresta';

        this.TILE_EMPTY = -1;
        this.TILE_SOLID = 0;
        this.TILE_FLOOR = 1;

        this.CHUNK_SIZE = 16;
        this.RENDER_CHUNK_RADIUS = 3;

        this.exitPortal = null;
        this.portalSpawned = false;
        this.portalActive = false;
        this.currentIslandData = null;

        // Shared uniforms that might be used across biomes
        this.grassUniforms = { uTime: { value: 0 }, uPlayerPos: { value: new THREE.Vector3(999,999,999) } };

        this.activeBiome = null;
        this.biomeCache = {};
    }

    generateGrid(size, islandData = null) {
        this.currentIslandData = islandData;
        console.log(`Generating procedural grid of size ${size}`);
        this.gridSize = size;
        this.grid = new Array(size).fill(0).map(() => new Array(size).fill(0).map(() => ({ type: this.TILE_SOLID, elev: 0 })));

        const targetRooms = Math.floor(size / 10);
        this.rooms = [];
        let attempts = 0;

        while(this.rooms.length < targetRooms && attempts < 200) {
            let w = Math.min(Math.floor(Math.random() * 10) + 8, size - 4);
            let h = Math.min(Math.floor(Math.random() * 10) + 8, size - 4);
            let x = Math.floor(Math.random() * (size - w - 2)) + 1;
            let y = Math.floor(Math.random() * (size - h - 2)) + 1;

            let r = { x, y, w, h, cx: Math.floor(x + w/2), cy: Math.floor(y + h/2) };

            let intersects = this.rooms.some(other => (r.x <= other.x + other.w + 2 && r.x + r.w + 2 >= other.x && r.y <= other.y + other.h + 2 && r.y + r.h + 2 >= other.y));

            if (!intersects) {
                for(let ix = x; ix < x+w; ix++) {
                    for(let iy = y; iy < y+h; iy++) {
                        if(ix >= 0 && ix < size && iy >= 0 && iy < size) {
                            if(Math.random() < 0.95) {
                                this.grid[ix][iy].type = this.TILE_FLOOR;
                                this.grid[ix][iy].elev = 0;
                            }
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
                if(ix >= 0 && ix < size && iy >= 0 && iy < size) {
                    this.grid[ix][iy].type = this.TILE_FLOOR;
                }
            }
        }
    }

    build3DGeometry(biomeId) {
        this.currentBiomeId = biomeId || 'floresta';
        console.log(`Building 3D geometry for biome: ${this.currentBiomeId}`);

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

        let biomeKey = 'forest';
        if (this.currentBiomeId.includes('campos') || this.currentBiomeId.includes('planície')) {
            biomeKey = 'plains';
        }

        // Cache biome instances to prevent WebGL memory leaks
        if (!this.biomeCache[biomeKey]) {
            if (biomeKey === 'plains') {
                this.biomeCache[biomeKey] = new PlainsBiome(this.scene, this);
            } else {
                this.biomeCache[biomeKey] = new ForestBiome(this.scene, this);
            }
        }

        this.activeBiome = this.biomeCache[biomeKey];

        // Re-assign grid dependencies just in case the map instance properties updated
        this.activeBiome.grid = this.grid;
        this.activeBiome.gridSize = this.gridSize;

        this.activeBiome.build3DGeometry(this.terrainGroup, this.chunksList);
        this.activeBiome.spawnEnemies(this.enemies);
    }

    spawnPortal() {
        if (this.portalSpawned) return;
        this.portalSpawned = true;

        this.exitPortal = new THREE.Group();

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
        this.activeBiome = null;
        // Optional: We keep this.biomeCache populated to reuse materials/geometries across runs
    }

    updateAntiOcclusion(delta, camera, playerPos) {
        const safePos = (playerPos && typeof playerPos.x === 'number') ? playerPos : new THREE.Vector3(0, 0, 0);

        const px = safePos.x;
        const py = safePos.y + 1.8;
        const pz = safePos.z;

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
        const targetPos = (playerPos && typeof playerPos.x === 'number') ? playerPos : new THREE.Vector3(0, 0, 0);

        this.grassUniforms.uTime.value = time;
        this.grassUniforms.uPlayerPos.value.copy(targetPos);

        this.updateAntiOcclusion(delta, camera, targetPos);

        let allDead = true;
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            if (enemy.hp > 0) {
                allDead = false;
                enemy.update(delta, targetPos);
            }
        }

        if (allDead && this.enemies.length > 0 && !this.portalSpawned) {
            this.spawnPortal();
        }

        if (this.portalActive && this.exitPortal) {
            this.exitPortal.children[0].rotation.z += delta * 2;
            this.exitPortal.children[1].rotation.y -= delta;

            if (targetPos.distanceTo(this.exitPortal.position) < 1.5) {
                this.portalActive = false;

                import('../core/GameState.js').then(({ default: gameState }) => {
                    if (this.currentIslandData) {
                        const nodeId = `${this.currentIslandData.gridX},${this.currentIslandData.gridZ}`;
                        if (!gameState.completedNodes.includes(nodeId)) {
                            gameState.completedNodes.push(nodeId);
                            gameState.pendingUnlocks = this.currentIslandData;
                            gameState.save();
                        }
                    }

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
