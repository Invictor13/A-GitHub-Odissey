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
        this.CHUNK_SIZE = mapInstance.CHUNK_SIZE;

        this.matBase = { roughness: 0.9, flatShading: true };
    }

    // Abstract methods to be implemented by child biomes
    setupMaterials() {}
    build3DGeometry(terrainGroup, chunksList) {}
    spawnEnemies(enemiesArray) {}
}
