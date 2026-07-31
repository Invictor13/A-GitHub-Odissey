import * as THREE from 'three';
import { Skeleton } from '../characters/enemies/Skeleton.js';
import { Goblin } from '../characters/enemies/Goblin.js';
import { Slime } from '../characters/enemies/Slime.js';


export class ProceduralMap {
    constructor(scene) {
        this.scene = scene;
        this.mapGroup = new THREE.Group();
        this.scene.add(this.mapGroup);
        this.grid = [];
        this.enemies = [];
    }

    generateGrid(size) {
        console.log(`Generating procedural grid of size ${size}`);
        this.gridSize = size;
        this.grid = new Array(size).fill(0).map(() => new Array(size).fill(0));
    }

    build3DGeometry(biome) {
        console.log(`Building 3D geometry for biome: ${biome}`);
        // Simple ground for procedural map
        const groundGeo = new THREE.PlaneGeometry(100, 100);
        const groundMat = new THREE.MeshLambertMaterial({ color: 0x556b2f });
        this.ground = new THREE.Mesh(groundGeo, groundMat);
        this.ground.rotation.x = -Math.PI / 2;
        this.mapGroup.add(this.ground);
        this.spawnEnemies();
    }


    spawnEnemies() {
        const numEnemies = Math.floor(Math.random() * 4) + 5; // 5 to 8 enemies
        for (let i = 0; i < numEnemies; i++) {
            // Randomly select a tile
            // A basic placeholder for walkable tile selection:
            const tileX = (Math.random() - 0.5) * 80;
            const tileZ = (Math.random() - 0.5) * 80;

            // Keep minimum distance from spawn (0,0)
            if (Math.abs(tileX) < 15 && Math.abs(tileZ) < 15) {
                i--;
                continue;
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
        }
    }

    cleanup() {
        this.scene.remove(this.mapGroup);
        for (const enemy of this.enemies) {
            enemy.destroy();
        }
        this.enemies = [];
    }

    update(delta, time, camera, playerPos) {
        // Environment update logic
        for (const enemy of this.enemies) {
            enemy.update(delta, playerPos);
        }
    }

    getFloorY(pos) {
        return 0; // Flat floor for now
    }
}
