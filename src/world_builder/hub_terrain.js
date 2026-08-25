import * as THREE from 'three';
import { applyWorldCurvature } from '../core/GraphicsUtils.js';

export class HubTerrain {
    constructor(scene) {
        this.scene = scene;
        this.gridSize = 64;
        this.blockSize = 1;

        this.worldGrid = new Map();

        this.typeKeys = ['dirt', 'grass', 'rock', 'sand', 'wood', 'water', 'mud_tile', 'stone_tile', 'wood_tile', 'granite_tile'];
        this.blockPools = {};

        this.colliders = [];
        this.group = new THREE.Group();

        this.initMaterials();
        this.initPools();
        this.buildTerrain();

        this.scene.add(this.group);
    }

    initMaterials() {
        const matBase = { roughness: 0.9, flatShading: true };

        // Voxel Block (scaled slightly larger (1.002) to seal gaps and completely prevent grid shadow acne)
        this.boxGeo = new THREE.BoxGeometry(1.002, 1.002, 1.002);
        this.boxGeo.translate(0, 0.5, 0);

        this.mGrass = new THREE.MeshLambertMaterial({ color: 0x4ade80, ...matBase });
        this.mDirt = new THREE.MeshLambertMaterial({ color: 0x5a3825, ...matBase });
        this.mSand = new THREE.MeshLambertMaterial({ color: 0xfde047, ...matBase });
        this.mRock = new THREE.MeshLambertMaterial({ color: 0x475569, ...matBase });
        this.mWood = new THREE.MeshLambertMaterial({ color: 0x78350f, ...matBase });

        // Floor tiles materials
        this.mMudTile = new THREE.MeshLambertMaterial({ color: 0x54381e, ...matBase });
        this.mStoneTile = new THREE.MeshLambertMaterial({ color: 0x64748b, ...matBase });
        this.mWoodTile = new THREE.MeshLambertMaterial({ color: 0x78350f, ...matBase });
        this.mGraniteTile = new THREE.MeshLambertMaterial({ color: 0x334155, ...matBase });

        this.mWater = new THREE.MeshLambertMaterial({
            color: 0x0ea5e9,
            transparent: true,
            opacity: 0.8,
            depthWrite: false,
            side: THREE.DoubleSide
        });

        const mats = [this.mGrass, this.mDirt, this.mSand, this.mRock, this.mWood, this.mMudTile, this.mStoneTile, this.mWoodTile, this.mGraniteTile];
        mats.forEach(m => applyWorldCurvature(m));

        // Special parameters for water
        applyWorldCurvature(this.mWater, false, true);

        this.matDict = {
            'dirt': this.mDirt, 'grass': this.mGrass, 'rock': this.mRock,
            'sand': this.mSand, 'wood': this.mWood, 'water': this.mWater,
            'mud_tile': this.mMudTile, 'stone_tile': this.mStoneTile,
            'wood_tile': this.mWoodTile, 'granite_tile': this.mGraniteTile
        };
    }

    initPools() {
        this.typeKeys.forEach(type => {
            this.blockPools[type] = { mesh: null, count: 0, capacity: 0, idToKey: [] };
        });
    }

    noise(nx, nz) { return (Math.sin(nx*0.15) + Math.sin(nz*0.15) + Math.sin((nx+nz)*0.2)) / 3; }

    buildTerrain() {
        const MAP_SIZE = this.gridSize;
        const HALF_MAP = MAP_SIZE / 2;
        const EXTRA_CAPACITY = 2500;

        const initialMats = { 'dirt':[], 'grass':[], 'rock':[], 'sand':[], 'wood':[], 'water':[], 'mud_tile':[], 'stone_tile':[], 'wood_tile':[], 'granite_tile':[] };
        const dummy = new THREE.Object3D();

        for (let x = 0; x < MAP_SIZE; x++) {
            for (let z = 0; z < MAP_SIZE; z++) {
                const wX = x - HALF_MAP; const wZ = z - HALF_MAP;
                const distFromCenter = Math.hypot(wX, wZ);
                if (distFromCenter > 28) continue; // Circular island bounds

                let n = this.noise(x, z);
                let h = Math.floor(n * 2.5) + 1;

                const riverPath = Math.sin(wX * 0.15) * 8;
                const isRiver = Math.abs(wZ - riverPath) < 3.5;
                const isMountain = (wX > 5 && wZ < -5 && distFromCenter < 22);
                const isBeach = (wZ > 15 && distFromCenter < 25);

                let topType = 'grass';
                if (isRiver) topType = 'water';
                else if (isMountain) { h += Math.floor(Math.random()*2) + 3; topType = 'rock'; }
                else if (isBeach) topType = 'sand';

                if (topType === 'water') {
                    dummy.position.set(wX, -0.2, wZ); dummy.updateMatrix();
                    initialMats.water.push({ mat: dummy.matrix.clone(), pos: [wX, -0.2, wZ] });
                    dummy.position.set(wX, -1, wZ); dummy.updateMatrix();
                    initialMats.sand.push({ mat: dummy.matrix.clone(), pos: [wX, -1, wZ] });
                } else {
                    // Top Surface
                    dummy.position.set(wX, h, wZ); dummy.updateMatrix();
                    initialMats[topType].push({ mat: dummy.matrix.clone(), pos: [wX, h, wZ] });

                    // Sub Layers
                    const dirtDepth = (topType === 'sand') ? 1 : Math.floor(Math.random() * 2) + 2;
                    for (let y = h - 1; y >= -6; y--) {
                        dummy.position.set(wX, y, wZ); dummy.updateMatrix();
                        let uType = 'dirt';
                        if (topType === 'rock' || y < h - dirtDepth) uType = 'rock';
                        else if (topType === 'sand') uType = 'sand';
                        initialMats[uType].push({ mat: dummy.matrix.clone(), pos: [wX, y, wZ] });
                    }
                }
            }
        }

        // Bind to GPU
        this.typeKeys.forEach(type => {
            const initData = initialMats[type];
            const pool = this.blockPools[type];

            pool.capacity = initData.length + EXTRA_CAPACITY;
            pool.mesh = new THREE.InstancedMesh(this.boxGeo, this.matDict[type], pool.capacity);

            if (type !== 'water') {
                pool.mesh.receiveShadow = true;
                pool.mesh.castShadow = false; // Terrain optimization
            } else {
                pool.mesh.receiveShadow = true;
                pool.mesh.castShadow = false;
                pool.mesh.renderOrder = 10;
            }

            const zeroMat = new THREE.Matrix4().makeScale(0,0,0);
            for(let i=0; i<pool.capacity; i++) pool.mesh.setMatrixAt(i, zeroMat);

            initData.forEach((data, i) => {
                pool.mesh.setMatrixAt(i, data.mat);
                const key = `${Math.round(data.pos[0])},${Math.round(data.pos[1])},${Math.round(data.pos[2])}`;
                this.worldGrid.set(key, { type: type, id: i });
                pool.idToKey[i] = key;
                pool.count++;

                // Add Collider if it's top surface (roughly Y >= 0 and not water, optimization for collision checks)
                // In game, we check `getHeightAt` so we don't strictly need boxes for everything,
                // but if HubEnvironment.checkCollision relies on boxes:
                if (type !== 'water' && data.pos[1] >= -2) {
                    const box = new THREE.Box3();
                    // Voxel is 1x1x1 centered at y+0.5
                    const min = new THREE.Vector3(data.pos[0] - 0.5, data.pos[1], data.pos[2] - 0.5);
                    const max = new THREE.Vector3(data.pos[0] + 0.5, data.pos[1] + 1, data.pos[2] + 0.5);
                    box.set(min, max);
                    this.colliders.push(box);
                }
            });
            pool.mesh.count = pool.count;
            this.group.add(pool.mesh);
        });
    }

    removeBlock(x, y, z) {
        const key = `${x},${y},${z}`;
        if (!this.worldGrid.has(key)) return false;

        const { type, id } = this.worldGrid.get(key);
        const pool = this.blockPools[type];
        const lastId = pool.count - 1;

        // Swap with last instance to keep array packed
        if (id !== lastId) {
            const mat = new THREE.Matrix4();
            pool.mesh.getMatrixAt(lastId, mat);
            pool.mesh.setMatrixAt(id, mat);

            const lastKey = pool.idToKey[lastId];
            this.worldGrid.get(lastKey).id = id;
            pool.idToKey[id] = lastKey;
        }

        const zeroMat = new THREE.Matrix4().makeScale(0,0,0);
        pool.mesh.setMatrixAt(lastId, zeroMat);

        this.worldGrid.delete(key);
        pool.idToKey.pop();
        pool.count--;
        pool.mesh.count = pool.count;
        pool.mesh.instanceMatrix.needsUpdate = true;

        // Remove from colliders roughly (exact match check)
        const blockMin = new THREE.Vector3(x - 0.5, y, z - 0.5);
        const blockMax = new THREE.Vector3(x + 0.5, y + 1, z + 0.5);
        for(let i=0; i<this.colliders.length; i++) {
            const box = this.colliders[i];
            if(box.min.equals(blockMin) && box.max.equals(blockMax)) {
                this.colliders.splice(i, 1);
                break;
            }
        }

        // Bind to GPU
        this.typeKeys.forEach(type => {
            const initData = initialMats[type];
            const pool = this.blockPools[type];

            pool.capacity = initData.length + EXTRA_CAPACITY;
            pool.mesh = new THREE.InstancedMesh(this.boxGeo, this.matDict[type], pool.capacity);

            if (type !== 'water') {
                pool.mesh.receiveShadow = true;
                pool.mesh.castShadow = false; // Terrain optimization
            } else {
                pool.mesh.receiveShadow = true;
                pool.mesh.castShadow = false;
                pool.mesh.renderOrder = 10;
            }

            const zeroMat = new THREE.Matrix4().makeScale(0,0,0);
            for(let i=0; i<pool.capacity; i++) pool.mesh.setMatrixAt(i, zeroMat);

            initData.forEach((data, i) => {
                pool.mesh.setMatrixAt(i, data.mat);
                const key = `${Math.round(data.pos[0])},${Math.round(data.pos[1])},${Math.round(data.pos[2])}`;
                this.worldGrid.set(key, { type: type, id: i });
                pool.idToKey[i] = key;
                pool.count++;

                // Add Collider if it's top surface (roughly Y >= 0 and not water, optimization for collision checks)
                // In game, we check `getHeightAt` so we don't strictly need boxes for everything,
                // but if HubEnvironment.checkCollision relies on boxes:
                if (type !== 'water' && data.pos[1] >= -2) {
                    const box = new THREE.Box3();
                    // Voxel is 1x1x1 centered at y+0.5
                    const min = new THREE.Vector3(data.pos[0] - 0.5, data.pos[1], data.pos[2] - 0.5);
                    const max = new THREE.Vector3(data.pos[0] + 0.5, data.pos[1] + 1, data.pos[2] + 0.5);
                    box.set(min, max);
                    this.colliders.push(box);
                }
            });
            pool.mesh.count = pool.count;
            this.group.add(pool.mesh);
        });
    }

    removeBlock(x, y, z) {
        const key = `${x},${y},${z}`;
        if (!this.worldGrid.has(key)) return false;

        const { type, id } = this.worldGrid.get(key);
        const pool = this.blockPools[type];
        const lastId = pool.count - 1;

        // Swap with last instance to keep array packed
        if (id !== lastId) {
            const mat = new THREE.Matrix4();
            pool.mesh.getMatrixAt(lastId, mat);
            pool.mesh.setMatrixAt(id, mat);

            const lastKey = pool.idToKey[lastId];
            this.worldGrid.get(lastKey).id = id;
            pool.idToKey[id] = lastKey;
        }

        const zeroMat = new THREE.Matrix4().makeScale(0,0,0);
        pool.mesh.setMatrixAt(lastId, zeroMat);

        this.worldGrid.delete(key);
        pool.idToKey.pop();
        pool.count--;
        pool.mesh.count = pool.count;
        pool.mesh.instanceMatrix.needsUpdate = true;

        // Remove from colliders roughly (exact match check)
        const blockMin = new THREE.Vector3(x - 0.5, y, z - 0.5);
        const blockMax = new THREE.Vector3(x + 0.5, y + 1, z + 0.5);
        for(let i=0; i<this.colliders.length; i++) {
            const box = this.colliders[i];
            if(box.min.equals(blockMin) && box.max.equals(blockMax)) {
                this.colliders.splice(i, 1);
                break;
            }
        }

        return true;
    }

    addBlock(x, y, z, type) {
        const key = `${x},${y},${z}`;
        if (this.worldGrid.has(key)) return false;

        // Floor tiles logic
        let yOffset = 0.5;
        let scale = new THREE.Vector3(1, 1, 1);

        if(type.includes('tile')) {
             yOffset = 0.05; // flat
             scale.set(1.5, 0.05, 1.5);
        }

        const pool = this.blockPools[type];
        if (!pool) return false;
        if (pool.count >= pool.capacity) return false;

        const id = pool.count;
        const mat = new THREE.Matrix4();
        mat.makeTranslation(x, y + (yOffset === 0.5 ? 0 : yOffset), z);
        mat.scale(scale);

        pool.mesh.setMatrixAt(id, mat);

        this.worldGrid.set(key, { type, id });
        pool.idToKey[id] = key;

        pool.count++;
        pool.mesh.count = pool.count;
        pool.mesh.instanceMatrix.needsUpdate = true;

        if (type !== 'water') {
            const min = new THREE.Vector3(x - 0.5, y, z - 0.5);
            const max = new THREE.Vector3(x + 0.5, y + (type.includes('tile') ? 0.1 : 1), z + 0.5);
            this.colliders.push(new THREE.Box3(min, max));
        }

        return true;
    }

    getColliders() {
        return this.colliders;
    }

    getHeightAt(px, pz) {
        let gx = Math.round(px);
        let gz = Math.round(pz);

        // Check top down from high y
        for(let y = 15; y >= -10; y--) {
            const key = `${gx},${y},${gz}`;
            if (this.worldGrid.has(key)) {
                const type = this.worldGrid.get(key).type;
                if(type === 'water') return y - 0.2;
                if(type.includes('tile')) return y + 0.1;
                return y + 1.0;
            }
        }
        return -50;
    }

    update(time) {
        // Water is handled by shader now, but we can leave this stub
    }
}
