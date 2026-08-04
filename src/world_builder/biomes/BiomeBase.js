import * as THREE from 'three';

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
    }

    // Abstract methods to be implemented by child biomes
    setupMaterials() {}
    build3DGeometry(terrainGroup, chunksList) {}
    spawnEnemies(enemiesArray) {}
}
