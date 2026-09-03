import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { ForestBiome } from './biomes/forest/ForestBiome.js';
import { PlainsBiome } from './biomes/plains/PlainsBiome.js';
import { disposeHierarchy } from '../core/GraphicsUtils.js';
import { EnemyManager } from '../systems/EnemyManager.js';
import { MushroomBiome } from './biomes/mushroom/MushroomBiome.js';
import { BambooBiome } from './biomes/bamboo/BambooBiome.js';
import { DesertBiome } from './biomes/desert/DesertBiome.js';
import { CanyonBiome } from './biomes/canyon/CanyonBiome.js';
import { MangroveBiome } from './biomes/mangrove/MangroveBiome.js';


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
        this.portalActive = true;

        // Setup HemisphereLight for the biome
        this.hemisphereLight = new THREE.HemisphereLight(0x0f172a, 0x1f4214, 0.6);

        // Weather System
        this.weatherType = Math.random() < 0.3 ? 'RAIN' : 'CLEAR';
        this.weatherParticles = null;
        this.weatherTimer = 0;
        this.lightningTimer = 0;
        this.scene.add(this.hemisphereLight);
        this.setupWeather();
        this.portalInteractable = true;
        this.currentIslandData = null;

        this.fireflies = null;
        this.setupFireflies();

        // Shared uniforms that might be used across biomes
        this.grassUniforms = { uTime: { value: 0 }, uPlayerPos: { value: new THREE.Vector3(999,999,999) } };
        this.waterUniforms = { uTime: { value: 0 }, uPlayerPos: { value: new THREE.Vector3(999,999,999) } };

        this.activeBiome = null;
        this.biomeCache = {};
    }

    setupFireflies() {
        const particleCount = 200;
        const geo = new THREE.BufferGeometry();
        const pos = new Float32Array(particleCount * 3);
        const phases = new Float32Array(particleCount);
        const speeds = new Float32Array(particleCount);

        for (let i = 0; i < particleCount; i++) {
            pos[i*3] = (Math.random() - 0.5) * 60;
            pos[i*3+1] = Math.random() * 4 + 0.5;
            pos[i*3+2] = (Math.random() - 0.5) * 60;
            phases[i] = Math.random() * Math.PI * 2;
            speeds[i] = 0.5 + Math.random() * 1.5;
        }

        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        geo.setAttribute('phase', new THREE.BufferAttribute(phases, 1));
        geo.setAttribute('speed', new THREE.BufferAttribute(speeds, 1));

        const mat = new THREE.PointsMaterial({
            color: 0xccff00,
            size: 0.25,
            transparent: true,
            opacity: 0.0,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });

        this.fireflies = new THREE.Points(geo, mat);
        this.fireflies.visible = false;
        this.scene.add(this.fireflies);
    }

    setupWeather() {
        if (this.weatherType === 'CLEAR') return;

        const particleCount = 2000;
        const geo = new THREE.BufferGeometry();
        const pos = new Float32Array(particleCount * 3);
        const vel = [];

        for (let i = 0; i < particleCount; i++) {
            pos[i * 3] = (Math.random() - 0.5) * 40;
            pos[i * 3 + 1] = Math.random() * 20;
            pos[i * 3 + 2] = (Math.random() - 0.5) * 40;
            vel.push(0, -10 - Math.random() * 10, 0);
        }

        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        const mat = new THREE.PointsMaterial({ color: 0xaaaaaa, size: 0.1, transparent: true, opacity: 0.6 });
        this.weatherParticles = new THREE.Points(geo, mat);
        this.weatherParticles.userData.velocities = vel;
        this.scene.add(this.weatherParticles);
    }

    generateGrid(size = 48, islandData = null) {
        this.currentIslandData = islandData;
        size = 48; // Compact high-quality island grid (48x48)
        this.gridSize = size;
        console.log(`Generating compact procedural grid of size ${size}`);

        this.grid = new Array(size).fill(0).map(() => new Array(size).fill(0).map(() => ({ type: this.TILE_EMPTY, elev: 0, distToPath: 999 })));

        const center = size / 2; // 24
        const maxRadius = 20;

        // Base circular/organic compact island terrain
        for (let x = 0; x < size; x++) {
            for (let z = 0; z < size; z++) {
                const dx = x - center;
                const dz = z - center;
                const dist = Math.sqrt(dx * dx + dz * dz);

                // Add slight noise variation to island edge
                const angle = Math.atan2(dz, dx);
                const noiseRadius = maxRadius + Math.sin(angle * 5) * 2.5 + Math.cos(angle * 3) * 1.5;

                if (dist <= noiseRadius) {
                    let elev = 1;
                    if (dist < 8) elev = 3;
                    else if (dist < 14) elev = 2;

                    // Central room area
                    this.grid[x][z].type = this.TILE_FLOOR;
                    this.grid[x][z].elev = elev;
                    this.grid[x][z].distToPath = Math.floor(dist);
                }
            }
        }

        // Main clearing room (Room 0) for enemy and portal placement
        this.rooms = [{
            x: 14, y: 14, w: 20, h: 20,
            cx: 24, cy: 24,
            elev: 1,
            isLake: false
        }];

        // Carve landing corridor facing the bridge socket
        const rawDockSide = islandData?.dockSide || 'north';
        const dockSide = rawDockSide.replace('dock_', '');
        let corrMinX = 22, corrMaxX = 26, corrMinZ = 38, corrMaxZ = 47;

        if (dockSide === 'south') {
            corrMinX = 22; corrMaxX = 26; corrMinZ = 0; corrMaxZ = 10;
        } else if (dockSide === 'east') {
            corrMinX = 0; corrMaxX = 10; corrMinZ = 22; corrMaxZ = 26;
        } else if (dockSide === 'west') {
            corrMinX = 38; corrMaxX = 47; corrMinZ = 22; corrMaxZ = 26;
        }

        for (let ix = corrMinX; ix <= corrMaxX; ix++) {
            for (let iy = corrMinZ; iy <= corrMaxZ; iy++) {
                if (ix >= 0 && ix < size && iy >= 0 && iy < size) {
                    this.grid[ix][iy].type = this.TILE_TRAIL;
                    this.grid[ix][iy].elev = 1;
                    this.grid[ix][iy].distToPath = 0;
                }
            }
        }

        // Add some rock/solid boundary nodes around edges
        for (let x = 0; x < size; x++) {
            for (let z = 0; z < size; z++) {
                if (this.grid[x][z].type === this.TILE_FLOOR) {
                    const dx = x - center;
                    const dz = z - center;
                    const dist = Math.sqrt(dx * dx + dz * dz);
                    if (dist > 16 && Math.random() < 0.25) {
                        this.grid[x][z].type = this.TILE_SOLID;
                        this.grid[x][z].elev = 2;
                        this.grid[x][z].distToPath = 1;
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
        const biomeStr = this.currentBiomeId.toLowerCase();

        if (biomeStr.includes('campos') || biomeStr.includes('planície')) biomeKey = 'plains';
        else if (biomeStr.includes('cogumelo') || biomeStr.includes('mushroom')) biomeKey = 'mushroom';
        else if (biomeStr.includes('bambu') || biomeStr.includes('bamboo')) biomeKey = 'bamboo';
        else if (biomeStr.includes('deserto') || biomeStr.includes('desert')) biomeKey = 'desert';
        else if (biomeStr.includes('canyon') || biomeStr.includes('desfiladeiro')) biomeKey = 'canyon';
        else if (biomeStr.includes('mangue') || biomeStr.includes('mangrove')) biomeKey = 'mangrove';

        // Cache biome instances to prevent WebGL memory leaks
        if (!this.biomeCache[biomeKey]) {
            if (biomeKey === 'plains') this.biomeCache[biomeKey] = new PlainsBiome(this.scene, this);
            else if (biomeKey === 'mushroom') this.biomeCache[biomeKey] = new MushroomBiome(this.scene, this);
            else if (biomeKey === 'bamboo') this.biomeCache[biomeKey] = new BambooBiome(this.scene, this);
            else if (biomeKey === 'desert') this.biomeCache[biomeKey] = new DesertBiome(this.scene, this);
            else if (biomeKey === 'canyon') this.biomeCache[biomeKey] = new CanyonBiome(this.scene, this);
            else if (biomeKey === 'mangrove') this.biomeCache[biomeKey] = new MangroveBiome(this.scene, this);
            else this.biomeCache[biomeKey] = new ForestBiome(this.scene, this);
        }

        // Adjust Hemisphere light based on biome
        if (this.hemisphereLight) {
            if (biomeKey === 'desert') {
                this.hemisphereLight.color.setHex(0xe8cda5); // Sand bright
                this.hemisphereLight.groundColor.setHex(0xa07e54);
            } else if (biomeKey === 'mushroom') {
                this.hemisphereLight.color.setHex(0x3e185e); // Purple dark
                this.hemisphereLight.groundColor.setHex(0x1a0f2e);
            } else if (biomeKey === 'bamboo') {
                this.hemisphereLight.color.setHex(0xe8f5e9); // Bright green tint
                this.hemisphereLight.groundColor.setHex(0x33691e);
            } else if (biomeKey === 'canyon') {
                this.hemisphereLight.color.setHex(0xd28666); // Orange tint
                this.hemisphereLight.groundColor.setHex(0x6a2c15);
            } else if (biomeKey === 'mangrove') {
                this.hemisphereLight.color.setHex(0x405948); // Murky green
                this.hemisphereLight.groundColor.setHex(0x1a2119);
            } else {
                // Default forest / plains
                this.hemisphereLight.color.setHex(0x0f172a);
                this.hemisphereLight.groundColor.setHex(0x1f4214);
            }
        }

        this.activeBiome = this.biomeCache[biomeKey];

        // Re-assign grid dependencies just in case the map instance properties updated
        this.activeBiome.grid = this.grid;
        this.activeBiome.gridSize = this.gridSize;

        this.activeBiome.build3DGeometry(this.terrainGroup, this.chunksList);
        this.activeBiome.spawnEnemies(this.enemies);
        // Ensure interactiveObjects array exists so NPCs can be interacted with
        if (!this.interactiveObjects) this.interactiveObjects = [];
        if (typeof this.activeBiome.spawnNPCs === 'function') {
            this.activeBiome.spawnNPCs(this.terrainGroup, this.enemies, this.interactiveObjects);
        }
        if (typeof this.activeBiome.spawnHarvestables === 'function') {
            this.activeBiome.spawnHarvestables(this.terrainGroup, this.interactiveObjects);
        }
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
        this.portalActive = true;
        this.portalInteractable = true;

        this.exitPortal = new THREE.Group();

        // Place portal in the last room
        let pX = 0, pZ = 0;
        if (this.rooms && this.rooms.length > 0) {
            const lastRoom = this.rooms[this.rooms.length - 1];
            pX = lastRoom.cx - this.gridSize / 2;
            pZ = lastRoom.cy - this.gridSize / 2;
        }

        const isBossPortal = window.gameState.portalCount >= 9;
        const primaryColor = isBossPortal ? 0xff0000 : 0x60a5fa; // Red/Gold for boss
        const secondaryColor = isBossPortal ? 0xff6600 : 0x93c5fd;

        const portalGeo = new THREE.TorusGeometry(1.5, 0.2, 16, 64);
        const portalMat = new THREE.MeshBasicMaterial({ color: primaryColor, transparent: true, opacity: 0.8, side: THREE.DoubleSide });
        const portalMesh = new THREE.Mesh(portalGeo, portalMat);
        portalMesh.rotation.x = Math.PI / 2;
        portalMesh.position.y = 1.0;

        const innerGeo = new THREE.CylinderGeometry(1.4, 1.4, 4, 32, 1, true);
        const innerMat = new THREE.MeshBasicMaterial({ color: secondaryColor, transparent: true, opacity: 0.4, side: THREE.DoubleSide });
        const innerMesh = new THREE.Mesh(innerGeo, innerMat);
        innerMesh.position.y = 2.0;

        const light = new THREE.PointLight(primaryColor, 2.5, 10);
        light.position.y = 2.0;

        this.exitPortal.add(portalMesh);
        this.exitPortal.add(innerMesh);
        this.exitPortal.add(light);

        this.exitPortal.position.set(pX, this.getFloorY(new THREE.Vector3(pX,0,pZ)), pZ);
        this.mapGroup.add(this.exitPortal);
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
            disposeHierarchy(this.mapGroup);
            this.scene.remove(this.mapGroup);
        }

        if (this.weatherParticles) {
            disposeHierarchy(this.weatherParticles);
            this.scene.remove(this.weatherParticles);
            this.weatherParticles = null;
        }
        if (this.fireflies) {
            disposeHierarchy(this.fireflies);
            this.scene.remove(this.fireflies);
            this.fireflies = null;
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

        // Update Weather
        const sunLight = this.scene.children.find(c => c.type === 'DirectionalLight' && (c.color.getHex() === 0xffedd5 || c.color.getHex() === 0x818cf8));
        if (sunLight) {
            const gameTime = window.gameState && window.gameState.hubState ? window.gameState.hubState.gameTimeHours : 12;
            const isNight = gameTime < 6.0 || gameTime > 18.0;

            let targetIntensity = 1.6; // Day default
            if (isNight) targetIntensity = 0.4; // Night minimal moonlight
            else if (this.weatherType === 'RAIN') targetIntensity = 0.5;

            sunLight.intensity = targetIntensity;

            if (isNight) {
                sunLight.color.setHex(0x818cf8); // Blueish moon color
            } else {
                sunLight.color.setHex(0xffedd5); // Warm sun color
            }

            // Fireflies Logic
            if (this.fireflies) {
                if (isNight) {
                    this.fireflies.visible = true;
                    this.fireflies.material.opacity = THREE.MathUtils.lerp(this.fireflies.material.opacity, 0.8, delta);
                    this.fireflies.position.x = targetPos.x;
                    this.fireflies.position.z = targetPos.z;

                    const posAttr = this.fireflies.geometry.attributes.position;
                    const phaseAttr = this.fireflies.geometry.attributes.phase;
                    const speedAttr = this.fireflies.geometry.attributes.speed;
                    for(let i=0; i<posAttr.count; i++) {
                        let y = posAttr.getY(i);
                        y += Math.sin(time * speedAttr.getX(i) + phaseAttr.getX(i)) * delta * 0.5;
                        if (y < 0.2) y = 0.2;
                        posAttr.setY(i, y);
                    }
                    posAttr.needsUpdate = true;
                } else {
                    this.fireflies.material.opacity = THREE.MathUtils.lerp(this.fireflies.material.opacity, 0.0, delta * 2);
                    if (this.fireflies.material.opacity < 0.05) this.fireflies.visible = false;
                }
            }
        }

        if (this.weatherParticles) {
            this.weatherParticles.position.x = targetPos.x;
            this.weatherParticles.position.z = targetPos.z;
            const posAttr = this.weatherParticles.geometry.attributes.position;
            const vel = this.weatherParticles.userData.velocities;
            for (let i = 0; i < posAttr.count; i++) {
                let y = posAttr.getY(i) + vel[i*3+1] * delta;
                if (y < 0) y = 20;
                posAttr.setY(i, y);
            }
            posAttr.needsUpdate = true;

            // Lightning flash
            this.lightningTimer -= delta;
            if (this.lightningTimer <= 0) {
                if (Math.random() < 0.1) {
                    const lightningLight = this.scene.children.find(c => c.type === 'DirectionalLight' && c.color.getHex() === 0xe0f2fe);
                    if (lightningLight) {
                        lightningLight.intensity = 2.0;
                        setTimeout(() => { if (lightningLight) lightningLight.intensity = 0; }, 100);
                    }
                }
                this.lightningTimer = Math.random() * 5 + 2;
            }
        }

        this.grassUniforms.uPlayerPos.value.copy(targetPos);
        this.waterUniforms.uTime.value = time;
        this.waterUniforms.uPlayerPos.value.copy(targetPos);

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
            if (this.exitPortal.children.length > 0) {
                this.exitPortal.children[0].rotation.z += delta * 2;
                this.exitPortal.children[1].rotation.y -= delta;
            }

            if (this.portalActive && this.portalInteractable && targetPos.distanceTo(this.exitPortal.position) < 1.5) {
                this.portalActive = false;

                window.gameState.portalCount++;
                window.gameState.save();

                if (window.gameState.portalCount >= 10) {
                    if (this.currentIslandData) {
                        const nodeId = `${this.currentIslandData.gridX},${this.currentIslandData.gridZ}`;
                        if (!window.gameState.completedNodes.includes(nodeId)) {
                            window.gameState.completedNodes.push(nodeId);
                            window.gameState.pendingUnlocks = this.currentIslandData;
                        }
                    }

                    window.gameState.portalCount = 0; // Reset for next map node
                    window.gameState.save();
                    window.changeGameState('WORLD_MAP');
                } else {
                    // Load next rogue-like room
                    window.changeGameState('ROGUELIKE', { biome: this.currentBiomeId, islandData: this.currentIslandData });
                }
            }
        }
    }

    getFloorY(pos) {
        if (!pos || pos.x === undefined || pos.z === undefined || isNaN(pos.x) || isNaN(pos.z)) {
            return 0;
        }

        if (!this.grid || !this.grid.length || this.gridSize <= 0) {
            return 0;
        }

        // Bilinear interpolation for smooth elevation
        const gridX = pos.x + this.gridSize / 2;
        const gridZ = pos.z + this.gridSize / 2;

        const x0 = Math.floor(gridX);
        const x1 = x0 + 1;
        const z0 = Math.floor(gridZ);
        const z1 = z0 + 1;

        if (x0 < 0 || x1 >= this.gridSize || z0 < 0 || z1 >= this.gridSize) return -50;

        if (!this.grid[x0] || !this.grid[x1]) return -50;
        if (!this.grid[x0][z0] || !this.grid[x1][z0] || !this.grid[x0][z1] || !this.grid[x1][z1]) return -50;

        const centerCell = this.grid[Math.round(gridX)]?.[Math.round(gridZ)];
        if (centerCell && centerCell.type === this.TILE_EMPTY) return -50;

        const elev00 = (this.grid[x0][z0].elev !== undefined ? this.grid[x0][z0].elev : 0) * this.STEP_HEIGHT;
        const elev10 = (this.grid[x1][z0].elev !== undefined ? this.grid[x1][z0].elev : 0) * this.STEP_HEIGHT;
        const elev01 = (this.grid[x0][z1].elev !== undefined ? this.grid[x0][z1].elev : 0) * this.STEP_HEIGHT;
        const elev11 = (this.grid[x1][z1].elev !== undefined ? this.grid[x1][z1].elev : 0) * this.STEP_HEIGHT;

        const wx = gridX - x0;
        const wz = gridZ - z0;

        const y0 = elev00 * (1 - wx) + elev10 * wx;
        const y1 = elev01 * (1 - wx) + elev11 * wx;

        let interpolatedY = y0 * (1 - wz) + y1 * wz;

        if (centerCell && centerCell.type === this.TILE_WATER) {
            interpolatedY += 0.1;
        }

        return interpolatedY;
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
                        // Spatial partitioning: check actual distance before considering it a collision
                        // Grid coordinates are centered at (0,0) and scaled by 1
                        const cellWorldX = gx - this.gridSize / 2;
                        const cellWorldZ = gz - this.gridSize / 2;

                        const dx = pos.x - cellWorldX;
                        const dz = pos.z - cellWorldZ;
                        const distSq = dx * dx + dz * dz;

                        // Roughly cell radius (0.5 * sqrt(2)) + player radius (0.4) = ~1.1
                        // Squared: 1.1 * 1.1 = 1.21. We use a slightly generous distance for safety
                        if (distSq < 1.44) {
                            return true;
                        }
                    }
                } else {
                    return true;
                }
            }
        }
        return false;
    }
}
