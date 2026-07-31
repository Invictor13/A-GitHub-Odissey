import * as THREE from 'three';

export class BiomeBase {
    constructor(scene, mapInstance) {
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
