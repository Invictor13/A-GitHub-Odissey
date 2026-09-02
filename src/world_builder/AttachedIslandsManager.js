import * as THREE from 'three';
import { BridgePrefab } from './BridgePrefab.js';
import { ProceduralMap } from './ProceduralMap.js';
import gameState from '../core/GameState.js';

export const SOCKET_OFFSETS = {
    dock_north: { socketPos: new THREE.Vector3(0, 1.2, -26), entryOffset: new THREE.Vector3(0, 1.2, 42), islandOffset: new THREE.Vector3(0, 0, -134), dockSide: 'north' },
    dock_south: { socketPos: new THREE.Vector3(0, 1.2, 26), entryOffset: new THREE.Vector3(0, 1.2, -42), islandOffset: new THREE.Vector3(0, 0, 134), dockSide: 'south' },
    dock_east: { socketPos: new THREE.Vector3(26, 1.2, 0), entryOffset: new THREE.Vector3(-42, 1.2, 0), islandOffset: new THREE.Vector3(134, 0, 0), dockSide: 'east' },
    dock_west: { socketPos: new THREE.Vector3(-26, 1.2, 0), entryOffset: new THREE.Vector3(42, 1.2, 0), islandOffset: new THREE.Vector3(-134, 0, 0), dockSide: 'west' }
};

export class AttachedIslandsManager {
    constructor(scene) {
        this.scene = scene;
        this.attachedIslands = new Map(); // id -> { id, dockSide, islandData, proceduralMap, bridge, state, center, radius }
    }

    getAvailableSocket(preferredSide = null) {
        const usedSides = new Set();
        this.attachedIslands.forEach(item => usedSides.add(item.dockSide));

        if (preferredSide && SOCKET_OFFSETS[`dock_${preferredSide}`] && !usedSides.has(preferredSide)) {
            return `dock_${preferredSide}`;
        }

        const sides = ['north', 'east', 'south', 'west'];
        for (const side of sides) {
            if (!usedSides.has(side)) {
                return `dock_${side}`;
            }
        }
        return null;
    }

    attachIsland(islandData, dockSide = null) {
        if (!islandData || !islandData.id) return null;

        if (this.attachedIslands.has(islandData.id)) {
            return this.attachedIslands.get(islandData.id);
        }

        const socketKey = dockSide ? (dockSide.startsWith('dock_') ? dockSide : `dock_${dockSide}`) : this.getAvailableSocket();
        if (!socketKey || !SOCKET_OFFSETS[socketKey]) {
            console.warn(`AttachedIslandsManager: No available socket for island ${islandData.id}`);
            return null;
        }

        const socketConfig = SOCKET_OFFSETS[socketKey];
        const sideName = socketConfig.dockSide;

        // Bridge positions: from hub socket edge to satellite island entry edge
        const bridgeStart = socketConfig.socketPos.clone();
        const bridgeEnd = socketConfig.islandOffset.clone().add(socketConfig.entryOffset);

        const bridge = new BridgePrefab(this.scene, bridgeStart, bridgeEnd, sideName);

        // Instantiate procedural map for satellite island
        islandData.dockSide = sideName;
        const proceduralMap = new ProceduralMap(this.scene);
        proceduralMap.generateGrid(100, islandData);
        proceduralMap.build3DGeometry(islandData.biomeId || 'floresta');

        // Position procedural map group at islandOffset
        proceduralMap.mapGroup.position.copy(socketConfig.islandOffset);

        // Satellite islands start in 'Sleeping' mode until avatar crosses the bridge threshold as per req 3.2
        proceduralMap.mapGroup.visible = false;

        const record = {
            id: islandData.id,
            dockSide: sideName,
            seed: islandData.seed || 1042,
            cleared: islandData.cleared || false,
            biomeId: islandData.biomeId || 'floresta',
            islandData,
            proceduralMap,
            bridge,
            center: socketConfig.islandOffset.clone(),
            radius: 50,
            state: 'Sleeping'
        };

        this.attachedIslands.set(islandData.id, record);

        // Sync with GameState playerWorld
        this.syncToGameState(record);

        return record;
    }

    syncToGameState(record) {
        if (!gameState.playerWorld) {
            gameState.playerWorld = {
                initialIsland: { id: "hub_sandbox", type: "sandbox" },
                attachedIslands: []
            };
        }
        if (!Array.isArray(gameState.playerWorld.attachedIslands)) {
            gameState.playerWorld.attachedIslands = [];
        }

        const existingIdx = gameState.playerWorld.attachedIslands.findIndex(item => item.id === record.id);
        const itemData = {
            id: record.id,
            dockSide: record.dockSide,
            seed: record.seed,
            cleared: record.cleared,
            biomeId: record.biomeId
        };

        if (existingIdx >= 0) {
            gameState.playerWorld.attachedIslands[existingIdx] = itemData;
        } else {
            gameState.playerWorld.attachedIslands.push(itemData);
        }

        gameState.save();
    }

    restoreFromSave() {
        if (!gameState.playerWorld || !Array.isArray(gameState.playerWorld.attachedIslands)) {
            return;
        }

        gameState.playerWorld.attachedIslands.forEach(savedItem => {
            if (!this.attachedIslands.has(savedItem.id)) {
                this.attachIsland(savedItem, savedItem.dockSide);
            }
        });
    }

    update(delta, playerPos) {
        this.attachedIslands.forEach(record => {
            if (record.bridge) {
                record.bridge.update(delta);

                // Requirement 3.2: Crossing the bridge trigger threshold wakes up the satellite island systems
                if (playerPos && record.bridge.checkTrigger(playerPos) && record.state === 'Sleeping') {
                    this.wakeIsland(record);
                }
            }

            if (record.proceduralMap && record.state === 'Active') {
                const localPlayerPos = playerPos ? playerPos.clone().sub(record.center) : new THREE.Vector3();
                record.proceduralMap.update(delta, gameState.time, window.camera, localPlayerPos);
            }
        });
    }

    getFloorY(pos) {
        if (!pos) return null;

        for (const record of this.attachedIslands.values()) {
            if (record.bridge && record.bridge.isPointOnBridge(pos)) {
                return record.bridge.getFloorY(pos);
            }

            if (record.proceduralMap && pos.distanceTo(record.center) < 55) {
                const localPos = pos.clone().sub(record.center);
                const y = record.proceduralMap.getFloorY(localPos);
                if (y !== undefined && !isNaN(y) && y > -40) {
                    return y;
                }
            }
        }
        return null;
    }

    checkCollision(pos, radius = 0.4) {
        if (!pos) return false;

        for (const record of this.attachedIslands.values()) {
            if (record.state === 'Active' && record.proceduralMap && pos.distanceTo(record.center) < 55) {
                const localPos = pos.clone().sub(record.center);
                if (record.proceduralMap.checkCollision(localPos, radius)) {
                    return true;
                }
            }
        }
        return false;
    }

    wakeIsland(record) {
        if (!record || record.state === 'Active') return;
        record.state = 'Active';
        if (record.proceduralMap && record.proceduralMap.mapGroup) {
            record.proceduralMap.mapGroup.visible = true;
        }
        console.log(`[AttachedIslandsManager] Woke satellite island ${record.id}`);
    }

    sleepIsland(record) {
        if (!record || record.state === 'Sleeping') return;
        record.state = 'Sleeping';
        if (record.proceduralMap && record.proceduralMap.mapGroup) {
            record.proceduralMap.mapGroup.visible = false;
        }
        console.log(`[AttachedIslandsManager] Put satellite island ${record.id} to sleep`);
    }

    getColliders() {
        let colliders = [];
        this.attachedIslands.forEach(record => {
            if (record.bridge) {
                colliders = colliders.concat(record.bridge.getColliders());
            }
        });
        return colliders;
    }

    cleanup() {
        this.attachedIslands.forEach(record => {
            if (record.bridge) record.bridge.destroy();
            if (record.proceduralMap) record.proceduralMap.cleanup();
        });
        this.attachedIslands.clear();
    }
}
