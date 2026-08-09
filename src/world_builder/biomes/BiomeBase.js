import * as THREE from 'three';
import { CampProp } from '../../characters/npcs/CampProp.js';
import { Merchant } from '../../characters/npcs/Merchant.js';
import { Guard } from '../../characters/npcs/Guard.js';
import { Explorer } from '../../characters/npcs/Explorer.js';
import { Alchemist } from '../../characters/npcs/Alchemist.js';


// Simple 2D Noise Implementation (Value Noise)
function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
function lerp(t, a, b) { return a + t * (b - a); }
function grad(hash, x, y) {
    const h = hash & 3;
    let u = h < 2 ? x : y;
    let v = h < 2 ? y : x;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
}

class SimpleNoise2D {
    constructor(seed = 12345) {
        this.p = new Uint8Array(512);
        const permutation = new Uint8Array(256);
        for (let i = 0; i < 256; i++) {
            permutation[i] = Math.floor(Math.abs(Math.sin(seed + i) * 256)) % 256;
        }
        for (let i = 0; i < 256; i++) {
            this.p[i] = permutation[i];
            this.p[i + 256] = permutation[i];
        }
    }

    noise(x, y) {
        const X = Math.floor(x) & 255;
        const Y = Math.floor(y) & 255;
        x -= Math.floor(x);
        y -= Math.floor(y);
        const u = fade(x);
        const v = fade(y);
        const A = this.p[X] + Y;
        const B = this.p[X + 1] + Y;

        return lerp(v, lerp(u, grad(this.p[A], x, y), grad(this.p[B], x - 1, y)),
                       lerp(u, grad(this.p[A + 1], x, y - 1), grad(this.p[B + 1], x - 1, y - 1)));
    }
}

export class BiomeBase {
    constructor(scene, mapInstance) {
        this.noiseGen = new SimpleNoise2D(Math.random() * 10000);
        this.scene = scene;
        this.map = mapInstance;

        // References to map grid and configurations
        this.grid = mapInstance.grid;
        this.gridSize = mapInstance.gridSize;
        this.TILE_EMPTY = mapInstance.TILE_EMPTY;
        this.TILE_SOLID = mapInstance.TILE_SOLID;
        this.TILE_FLOOR = mapInstance.TILE_FLOOR;
        this.TILE_WATER = mapInstance.TILE_WATER;
        this.TILE_BRIDGE = mapInstance.TILE_BRIDGE;
        this.TILE_TRAIL = mapInstance.TILE_TRAIL;
        this.CHUNK_SIZE = mapInstance.CHUNK_SIZE;
        this.STEP_HEIGHT = mapInstance.STEP_HEIGHT;

        this.matBase = { roughness: 0.9, flatShading: true };
        this.interactiveProps = [];
    }

    // Abstract methods to be implemented by child biomes
    setupMaterials() {}
    build3DGeometry(terrainGroup, chunksList) {}
    spawnEnemies(enemiesArray) {}



    spawnNPCs(terrainGroup, enemiesArray, interactablesArray) {
        // Decide whether to spawn a POI in this level (e.g., 60% chance)
        if (Math.random() > 0.6) return;

        let placed = false;
        let attempts = 0;

        while (!placed && attempts < 100) {
            // Find a valid spot (like chest spawning)
            const tx = Math.floor(Math.random() * this.gridSize);
            const tz = Math.floor(Math.random() * this.gridSize);

            if (this.grid[tx] && this.grid[tx][tz] && this.grid[tx][tz].type === this.TILE_FLOOR) {
                const elev = this.grid[tx][tz].elev * this.STEP_HEIGHT;
                // Exclude water or extreme edges
                if (elev <= 0 || tx < 10 || tx > this.gridSize - 10 || tz < 10 || tz > this.gridSize - 10) {
                    attempts++;
                    continue;
                }

                const wx = (tx - this.gridSize/2) * 2.0;
                const wz = (tz - this.gridSize/2) * 2.0;
                const pos = new THREE.Vector3(wx, elev, wz);

                this.createNPCCamp(pos, terrainGroup, enemiesArray, interactablesArray);
                placed = true;
            }
            attempts++;
        }
    }

    createNPCCamp(position, terrainGroup, enemiesArray, interactablesArray) {
        const campTypes = ['merchant', 'guard', 'alchemist', 'explorer'];
        const type = campTypes[Math.floor(Math.random() * campTypes.length)];

        let campGroup;
        let npcs = [];

        if (type === 'merchant') {
            campGroup = CampProp.createTent(this.scene, position);
            const npc = new Merchant(this.scene, new THREE.Vector3(position.x + 1.5, position.y, position.z + 1.5));
            npcs.push(npc);

            // Add interactable for NPC
            if (interactablesArray) interactablesArray.push({ mesh: npc.group, action: () => npc.interact(window.penitentGroup) });

        } else if (type === 'guard') {
            campGroup = CampProp.createCampfire(this.scene, position);
            // Spawn 2 guards around campfire
            const g1 = new Guard(this.scene, new THREE.Vector3(position.x + 1.5, position.y, position.z + 1.0));
            const g2 = new Guard(this.scene, new THREE.Vector3(position.x - 1.5, position.y, position.z - 1.0));
            npcs.push(g1, g2);

            if (interactablesArray) {
                interactablesArray.push({ mesh: g1.group, action: () => g1.interact(window.penitentGroup) });
                interactablesArray.push({ mesh: g2.group, action: () => g2.interact(window.penitentGroup) });
            }

            // Add campfire to interactables/update list if we want it animated, but skip for now

        } else if (type === 'alchemist') {
            campGroup = CampProp.createCauldron(this.scene, position);
            const npc = new Alchemist(this.scene, new THREE.Vector3(position.x - 1.2, position.y, position.z + 1.2));
            npcs.push(npc);

            if (interactablesArray) interactablesArray.push({ mesh: npc.group, action: () => npc.interact(window.penitentGroup) });

        } else if (type === 'explorer') {
            // Explorer might just sit near a campfire
            campGroup = CampProp.createCampfire(this.scene, position);
            const npc = new Explorer(this.scene, new THREE.Vector3(position.x + 1.0, position.y, position.z));
            npcs.push(npc);

            if (interactablesArray) interactablesArray.push({ mesh: npc.group, action: () => npc.interact(window.penitentGroup) });
        }

        terrainGroup.add(campGroup);

        // Add NPCs to enemiesArray so they get updated by EnemyManager
        for (const npc of npcs) {
            if (enemiesArray) enemiesArray.push(npc);
        }
    }

    spawnChests(terrainGroup, interactablesArray) {
        let chestCount = 3 + Math.floor(Math.random() * 3);

        for (let i = 0; i < chestCount; i++) {
            let placed = false;
            let attempts = 0;
            while (!placed && attempts < 50) {
                const tx = Math.floor(Math.random() * this.gridSize);
                const tz = Math.floor(Math.random() * this.gridSize);

                if (this.grid[tx] && this.grid[tx][tz] && this.grid[tx][tz].type === this.TILE_FLOOR) {
                    const elev = this.grid[tx][tz].elev * this.STEP_HEIGHT;
                    const wx = (tx - this.gridSize/2) * 2.0;
                    const wz = (tz - this.gridSize/2) * 2.0;

                    this.createChest(wx, elev, wz, terrainGroup, interactablesArray);
                    placed = true;
                }
                attempts++;
            }
        }
    }

    createChest(x, y, z, terrainGroup, interactablesArray) {
        const chestGroup = new THREE.Group();
        chestGroup.position.set(x, y, z);
        chestGroup.rotation.y = Math.random() * Math.PI * 2;

        const matWood = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.9 });
        const matMetal = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 0.8, roughness: 0.4 });

        const base = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.8, 0.8), matWood);
        base.position.y = 0.4;
        base.castShadow = true;
        chestGroup.add(base);

        const lock = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.1), matMetal);
        lock.position.set(0, 0.5, 0.45);
        chestGroup.add(lock);

        terrainGroup.add(chestGroup);

        const types = ['Chest_Wood', 'Chest_Iron'];
        if (Math.random() < 0.1) types.push('Chest_Divine');
        const type = types[Math.floor(Math.random() * types.length)];

        chestGroup.userData = {
            interactable: true,
            name: "Baú de Tesouro",
            type: type
        };

        if (interactablesArray) {
            interactablesArray.push({
                mesh: chestGroup,
                action: () => {
                    if (!chestGroup.userData.opened) {
                        chestGroup.userData.opened = true;
                        if (window.lootManager) {
                            window.lootManager.spawnLoot(chestGroup.userData.type, chestGroup.position);
                        }
                        const top = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.2, 0.8), matWood);
                        top.position.set(0, 0.9, -0.4);
                        top.rotation.x = -Math.PI / 4;
                        chestGroup.add(top);

                        lock.visible = false;
                        base.scale.y = 0.8;
                    }
                }
            });
        }
    }

}
