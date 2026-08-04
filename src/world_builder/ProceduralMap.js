import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { ForestBiome } from './biomes/forest/ForestBiome.js';
import { PlainsBiome } from './biomes/plains/PlainsBiome.js';
import { EnemyManager } from '../systems/EnemyManager.js';

export class ProceduralMap {
    constructor(scene) {
        this.scene = scene;
        this.enemyManager = new EnemyManager(this.scene);
        this.mapGroup = new THREE.Group();
        this.mapGroup.scale.set(1.0, 1.0, 1.0);
        this.scene.add(this.mapGroup);

        this.terrainGroup = new THREE.Group();
        this.terrainGroup.scale.set(1.0, 1.0, 1.0);
        this.mapGroup.add(this.terrainGroup);

        this.grid = [];
        this.enemies = [];
        this.totalEnemiesSpawned = 0;
        this.chunksList = [];
        this.gridSize = 0;
        this.currentBiomeId = 'floresta';

                this.TILE_EMPTY = -1;
        this.TILE_SOLID = 0;
        this.TILE_FLOOR = 1;
        this.TILE_WATER = 2;
        this.TILE_BRIDGE = 3;
        this.TILE_TRAIL = 4;

        this.STEP_HEIGHT = 1.0;

        this.CHUNK_SIZE = 16;
        this.RENDER_CHUNK_RADIUS = 3;

        this.exitPortal = null;
        this.portalSpawned = false;
        this.portalActive = false;

        // Setup HemisphereLight for the biome
        this.hemisphereLight = new THREE.HemisphereLight(0x0f172a, 0x1f4214, 0.6); // Dark blue sky, earthy green ground
        this.scene.add(this.hemisphereLight);
        this.portalInteractable = false;
        this.currentIslandData = null;

        // Shared uniforms that might be used across biomes
        this.grassUniforms = { uTime: { value: 0 }, uPlayerPos: { value: new THREE.Vector3(999,999,999) } };

        this.activeBiome = null;
        this.biomeCache = {};
    }

    generateGrid(size, islandData = null) {
        this.currentIslandData = islandData;
        size = 100; // Force size 100 as per requirement
        this.gridSize = size;
        console.log(`Generating procedural grid of size ${size}`);

        this.grid = new Array(size).fill(0).map(() => new Array(size).fill(0).map(() => ({ type: this.TILE_SOLID, elev: 0, distToPath: 999 })));

        const targetRooms = Math.floor(Math.random() * 3) + 12; // 12 to 14 rooms
        this.rooms = [];
        let attempts = 0;

        class Room {
            constructor(x, y, w, h, id, targetRooms) {
                this.x = x; this.y = y; this.w = w; this.h = h;
                this.cx = Math.floor(x + w/2); this.cy = Math.floor(y + h/2);
                this.isLake = (id > 0 && id < targetRooms-1 && Math.random() < 0.20);
                this.elev = this.isLake ? 0 : Math.floor(Math.random() * 2) + 1;
            }
            intersects(other) { return (this.x <= other.x + other.w + 2 && this.x + this.w + 2 >= other.x && this.y <= other.y + other.h + 2 && this.y + this.h + 2 >= other.y); }
        }

        while(this.rooms.length < targetRooms && attempts < 700) {
            let w = Math.floor(Math.random() * 18) + 18;
            let h = Math.floor(Math.random() * 18) + 18;
            let x = Math.floor(Math.random() * (size - w - 2)) + 1;
            let y = Math.floor(Math.random() * (size - h - 2)) + 1;

            let r = new Room(x, y, w, h, this.rooms.length, targetRooms);

            if (!this.rooms.some(other => r.intersects(other))) {
                let rType = r.elev === 0 ? this.TILE_WATER : this.TILE_FLOOR;
                for(let ix = x; ix < x+w; ix++) {
                    for(let iy = y; iy < y+h; iy++) {
                        if(Math.random() < 0.99) {
                            if (this.grid[ix][iy].type === this.TILE_WATER && rType !== this.TILE_WATER && r.elev > 0) {
                                this.grid[ix][iy].type = this.TILE_BRIDGE;
                                this.grid[ix][iy].elev = r.elev;
                            } else if (this.grid[ix][iy].type !== this.TILE_BRIDGE) {
                                this.grid[ix][iy].type = rType;
                                this.grid[ix][iy].elev = r.elev;
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
                let t = j / (path.length - 1 || 1);
                let elev = Math.round(r1.elev * (1 - t) + r2.elev * t);
                let px = path[j].x, pz = path[j].z;
                let cType = elev === 0 ? this.TILE_WATER : this.TILE_TRAIL;

                for(let dx=-5; dx<=5; dx++) {
                    for(let dz=-5; dz<=5; dz++) {
                        if (Math.abs(dx) + Math.abs(dz) <= 6 || Math.random() < 0.9) {
                            let nx = px+dx, nz = pz+dz;
                            if (nx >= 0 && nx < size && nz >= 0 && nz < size) {
                                if (this.grid[nx][nz].type === this.TILE_WATER && cType !== this.TILE_WATER && elev > 0) {
                                    this.grid[nx][nz].type = this.TILE_BRIDGE;
                                    this.grid[nx][nz].elev = elev;
                                } else if (this.grid[nx][nz].type !== this.TILE_BRIDGE) {
                                    this.grid[nx][nz].type = cType;
                                    this.grid[nx][nz].elev = elev;
                                }
                            }
                        }
                    }
                }
            }
        }

        let dilation = Array.from({length: size}, () => Array(size).fill(999));
        let queue = [];
        for (let x = 0; x < size; x++) {
            for (let z = 0; z < size; z++) {
                if (this.grid[x][z].type !== this.TILE_SOLID) { dilation[x][z] = 0; queue.push({x: x, z: z}); }
            }
        }

        let head = 0;
        while (head < queue.length) {
            let p = queue[head++]; let d = dilation[p.x][p.z];
            if (d >= 8) continue;
            let dirs = [[0,1], [1,0], [0,-1], [-1,0]];
            for (let dir of dirs) {
                let nx = p.x + dir[0], nz = p.z + dir[1];
                if (nx >= 0 && nx < size && nz >= 0 && nz < size && dilation[nx][nz] > d + 1) {
                    dilation[nx][nz] = d + 1; queue.push({x: nx, z: nz});
                }
            }
        }

        for (let x = 0; x < size; x++) {
            for (let z = 0; z < size; z++) {
                if (this.grid[x][z].type === this.TILE_SOLID) {
                    if (dilation[x][z] > 8) {
                        this.grid[x][z].type = this.TILE_EMPTY;
                    } else {
                        let maxElev = 0;
                        for(let dx=-2; dx<=2; dx++) {
                            for(let dz=-2; dz<=2; dz++) {
                                let nx = x+dx, nz = z+dz;
                                if(nx>=0 && nx<size && nz>=0 && nz<size && this.grid[nx][nz].type >= 0 && this.grid[nx][nz].type !== this.TILE_SOLID) {
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
        this.totalEnemiesSpawned = this.enemies.length;

        for (const enemy of this.enemies) {
            this.enemyManager.addEnemy(enemy);
        }

        // Immediately spawn inactive portal in the last room
        this.spawnPortal();
    }

    spawnPortal() {
        if (this.portalSpawned) return;
        this.portalSpawned = true;
        this.portalActive = false;

        this.exitPortal = new THREE.Group();

        // Place portal in the last room
        let pX = 0, pZ = 0;
        if (this.rooms && this.rooms.length > 0) {
            const lastRoom = this.rooms[this.rooms.length - 1];
            pX = lastRoom.cx - this.gridSize / 2;
            pZ = lastRoom.cy - this.gridSize / 2;
        }

        import('../core/GameState.js').then(({ default: gameState }) => {
            const isBossPortal = gameState.portalCount >= 9;
            const primaryColor = isBossPortal ? 0xff0000 : 0x60a5fa; // Red/Gold for boss
            const secondaryColor = isBossPortal ? 0xff6600 : 0x93c5fd;

            const portalGeo = new THREE.TorusGeometry(1.5, 0.2, 16, 64);
            const portalMat = new THREE.MeshBasicMaterial({ color: primaryColor, transparent: true, opacity: 0.0, side: THREE.DoubleSide });
            const portalMesh = new THREE.Mesh(portalGeo, portalMat);
            portalMesh.rotation.x = Math.PI / 2;
            portalMesh.position.y = 1.0;

            const innerGeo = new THREE.CylinderGeometry(1.4, 1.4, 4, 32, 1, true);
            const innerMat = new THREE.MeshBasicMaterial({ color: secondaryColor, transparent: true, opacity: 0.0, side: THREE.DoubleSide });
            const innerMesh = new THREE.Mesh(innerGeo, innerMat);
            innerMesh.position.y = 2.0;

            const light = new THREE.PointLight(primaryColor, 0, 10);
            light.position.y = 2.0;

            this.exitPortal.add(portalMesh);
            this.exitPortal.add(innerMesh);
            this.exitPortal.add(light);

            this.exitPortal.position.set(pX, this.getFloorY(new THREE.Vector3(pX,0,pZ)), pZ);
            this.mapGroup.add(this.exitPortal);
        });
    }

    getPlayerSpawnPosition() {
        if (this.rooms && this.rooms.length > 0) {
            const r0 = this.rooms[0];
            const px = r0.cx - this.gridSize / 2;
            const pz = r0.cy - this.gridSize / 2;
            const py = (r0.elev * this.STEP_HEIGHT) + 0.5;
            return new THREE.Vector3(px, py, pz);
        }
        return new THREE.Vector3(0, 10, 0);
    }

    cleanup() {
        if (this.mapGroup) {
            this.mapGroup.traverse(child => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(m => m.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
            });
            this.scene.remove(this.mapGroup);
        }

        this.enemyManager.cleanup();
        this.enemies = [];
        this.totalEnemiesSpawned = 0;

        if (this.hemisphereLight) {
            this.scene.remove(this.hemisphereLight);
            this.hemisphereLight.dispose?.();
            this.hemisphereLight = null;
        }

        if (this.exitPortal) {
            this.mapGroup.remove(this.exitPortal);
            this.exitPortal = null;
        }
        this.portalSpawned = false;
        this.portalActive = false;
        this.portalInteractable = false;
        this.activeBiome = null;
        // Optional: We keep this.biomeCache populated to reuse materials/geometries across runs,
        // but we might want to clear it if memory gets too high.
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

        this.enemyManager.update(
            delta,
            window.penitentGroup || { position: targetPos },
            window.inventoryUI,
            window.showToast,
            this.getFloorY.bind(this),
            this.checkCollision.bind(this)
        );

        let allDead = this.enemyManager.areAllEnemiesDead();

        if (this.exitPortal) {
            if (allDead && this.totalEnemiesSpawned > 0 && !this.portalActive) {
                this.portalActive = true;
                // Activate visual elements
                if (this.exitPortal.children.length >= 3) {
                    this.exitPortal.children[0].material.opacity = 0.8;
                    this.exitPortal.children[1].material.opacity = 0.4;
                    this.exitPortal.children[2].intensity = 2.5;
                }
                setTimeout(() => {
                    this.portalInteractable = true;
                }, 1000);
            }

            if (this.exitPortal.children.length > 0) {
                this.exitPortal.children[0].rotation.z += delta * 2;
                this.exitPortal.children[1].rotation.y -= delta;
            }

            if (this.portalActive && this.portalInteractable && targetPos.distanceTo(this.exitPortal.position) < 1.5) {
                this.portalActive = false;

                import('../core/GameState.js').then(({ default: gameState }) => {
                    gameState.portalCount++;
                    gameState.save();

                    if (gameState.portalCount >= 10) {
                        if (this.currentIslandData) {
                            const nodeId = `${this.currentIslandData.gridX},${this.currentIslandData.gridZ}`;
                            if (!gameState.completedNodes.includes(nodeId)) {
                                gameState.completedNodes.push(nodeId);
                                gameState.pendingUnlocks = this.currentIslandData;
                            }
                        }

                        gameState.portalCount = 0; // Reset for next map node
                        gameState.save();
                        window.changeGameState('WORLD_MAP');
                    } else {
                        // Load next rogue-like room
                        window.changeGameState('ROGUELIKE', { biome: this.currentBiomeId, islandData: this.currentIslandData });
                    }
                });
            }
        }
    }

    getFloorY(pos) {
        // Bilinear interpolation for smooth elevation
        const gridX = pos.x + this.gridSize / 2;
        const gridZ = pos.z + this.gridSize / 2;

        const x0 = Math.floor(gridX);
        const x1 = x0 + 1;
        const z0 = Math.floor(gridZ);
        const z1 = z0 + 1;

        if (x0 < 0 || x1 >= this.gridSize || z0 < 0 || z1 >= this.gridSize) return 0;

        const elev00 = this.grid[x0][z0].elev * this.STEP_HEIGHT;
        const elev10 = this.grid[x1][z0].elev * this.STEP_HEIGHT;
        const elev01 = this.grid[x0][z1].elev * this.STEP_HEIGHT;
        const elev11 = this.grid[x1][z1].elev * this.STEP_HEIGHT;

        const wx = gridX - x0;
        const wz = gridZ - z0;

        const y0 = elev00 * (1 - wx) + elev10 * wx;
        const y1 = elev01 * (1 - wx) + elev11 * wx;

        return y0 * (1 - wz) + y1 * wz;
    }

    checkCollision(pos, radius = 0.4) {
        const cornersX = [pos.x - radius, pos.x + radius];
        const cornersZ = [pos.z - radius, pos.z + radius];

        for (let cx of cornersX) {
            for (let cz of cornersZ) {
                let gx = Math.round(cx + this.gridSize / 2);
                let gz = Math.round(cz + this.gridSize / 2);

                if (gx >= 0 && gx < this.gridSize && gz >= 0 && gz < this.gridSize) {
                    let cell = this.grid[gx][gz];
                    let cellElev = cell.elev * this.STEP_HEIGHT;
                    if (cell.type === this.TILE_SOLID || cell.type === this.TILE_EMPTY || cellElev > pos.y + 1.4) {
                        return true;
                    }
                } else {
                    return true;
                }
            }
        }
        return false;
    }
}
