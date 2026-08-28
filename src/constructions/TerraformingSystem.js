import * as THREE from 'three';
import gameState from '../core/GameState.js';
import { inventoryManager } from '../systems/InventoryManager.js';
import { applyWorldCurvature } from '../core/GraphicsUtils.js';

/**
 * Pre-defined connection slots around the central Hub island.
 */
export const EXPANSION_SLOTS = [
    {
        id: 'slot_north',
        name: 'Expansão Norte',
        position: new THREE.Vector3(0, 0, -34),
        bridgePosition: new THREE.Vector3(0, 0, -27),
        bridgeRotationY: 0,
        cost: { wood: 10, ore: 10, gold: 0 }
    },
    {
        id: 'slot_south',
        name: 'Expansão Sul',
        position: new THREE.Vector3(0, 0, 34),
        bridgePosition: new THREE.Vector3(0, 0, 27),
        bridgeRotationY: 0,
        cost: { wood: 10, ore: 10, gold: 0 }
    },
    {
        id: 'slot_east',
        name: 'Expansão Leste',
        position: new THREE.Vector3(34, 0, 0),
        bridgePosition: new THREE.Vector3(27, 0, 0),
        bridgeRotationY: Math.PI / 2,
        cost: { wood: 15, ore: 15, gold: 5 }
    },
    {
        id: 'slot_west',
        name: 'Expansão Oeste',
        position: new THREE.Vector3(-34, 0, 0),
        bridgePosition: new THREE.Vector3(-27, 0, 0),
        bridgeRotationY: Math.PI / 2,
        cost: { wood: 15, ore: 15, gold: 5 }
    }
];

export class TerraformingSystem {
    constructor(scene, hubTerrain = null) {
        this.scene = scene;
        this.hubTerrain = hubTerrain;
        this.group = new THREE.Group();
        this.scene.add(this.group);

        this.holograms = new Map();
        this.unlockedIslands = new Set();
        this.builtIslands = new Map();
        this.animatingIslands = [];

        // Cyan holographic wireframe material
        this.hologramMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            wireframe: true,
            transparent: true,
            opacity: 0.6
        });

        this.loadUnlockedState();
        this.initSlots();
    }

    /**
     * Load unlocked island slots from GameState and LocalStorage.
     */
    loadUnlockedState() {
        this.unlockedIslands.clear();
        if (gameState.hubState && Array.isArray(gameState.hubState.unlockedIslands)) {
            gameState.hubState.unlockedIslands.forEach(slotId => this.unlockedIslands.add(slotId));
        } else if (gameState.buildingsBuilt && Array.isArray(gameState.buildingsBuilt.unlockedIslands)) {
            gameState.buildingsBuilt.unlockedIslands.forEach(slotId => this.unlockedIslands.add(slotId));
        } else {
            try {
                const raw = localStorage.getItem('A_GITHUB_ODYSSEY_SAVE');
                if (raw) {
                    const data = JSON.parse(raw);
                    const list = data?.hubState?.unlockedIslands || data?.buildingsBuilt?.unlockedIslands;
                    if (Array.isArray(list)) {
                        list.forEach(slotId => this.unlockedIslands.add(slotId));
                    }
                }
            } catch (e) {
                console.warn('TerraformingSystem: Failed reading unlocked islands from localStorage', e);
            }
        }
    }

    /**
     * Persist unlocked island slots into GameState and LocalStorage.
     */
    saveUnlockedState() {
        const list = Array.from(this.unlockedIslands);
        if (!gameState.hubState) gameState.hubState = {};
        gameState.hubState.unlockedIslands = list;

        if (!gameState.buildingsBuilt) gameState.buildingsBuilt = {};
        gameState.buildingsBuilt.unlockedIslands = list;

        gameState.save();
    }

    /**
     * Initialize expansion slots (holograms for locked, real islands for unlocked).
     */
    initSlots() {
        EXPANSION_SLOTS.forEach(slot => {
            if (this.unlockedIslands.has(slot.id)) {
                this.spawnRealIsland(slot, false);
            } else {
                this.spawnHologram(slot);
            }
        });
    }

    /**
     * Create holographic wireframe preview for a locked slot.
     */
    spawnHologram(slot) {
        if (this.holograms.has(slot.id)) return;

        const holoGroup = new THREE.Group();
        holoGroup.position.copy(slot.position);

        // Holographic Island Blueprint
        const islandGeo = new THREE.CylinderGeometry(8, 6, 2, 12);
        const islandMesh = new THREE.Mesh(islandGeo, this.hologramMaterial);
        islandMesh.position.y = 0;
        holoGroup.add(islandMesh);

        // Holographic Bottom Cone Blueprint
        const botGeo = new THREE.ConeGeometry(6, 8, 12);
        const botMesh = new THREE.Mesh(botGeo, this.hologramMaterial);
        botMesh.rotation.x = Math.PI;
        botMesh.position.y = -5;
        holoGroup.add(botMesh);

        // Holographic Bridge Blueprint
        const bridgeGeo = new THREE.BoxGeometry(4, 0.4, 10);
        const bridgeMesh = new THREE.Mesh(bridgeGeo, this.hologramMaterial);
        bridgeMesh.position.copy(slot.bridgePosition).sub(slot.position);
        bridgeMesh.rotation.y = slot.bridgeRotationY;
        holoGroup.add(bridgeMesh);

        holoGroup.userData = { slotId: slot.id, name: slot.name, isHologram: true };
        this.group.add(holoGroup);
        this.holograms.set(slot.id, holoGroup);
    }

    /**
     * Remove holographic wireframe preview.
     */
    removeHologram(slotId) {
        const holoGroup = this.holograms.get(slotId);
        if (holoGroup) {
            this.group.remove(holoGroup);
            holoGroup.traverse(child => {
                if (child.geometry) child.geometry.dispose();
            });
            this.holograms.delete(slotId);
        }
    }

    /**
     * Create real physical expansion island.
     */
    spawnRealIsland(slot, animate = true) {
        if (this.builtIslands.has(slot.id)) return this.builtIslands.get(slot.id);

        const islandGroup = new THREE.Group();
        islandGroup.position.copy(slot.position);

        const matBase = { roughness: 0.85, flatShading: true };
        const matGrass = new THREE.MeshLambertMaterial({ color: 0x4ade80, ...matBase });
        const matRock = new THREE.MeshLambertMaterial({ color: 0x475569, ...matBase });
        const matWood = new THREE.MeshLambertMaterial({ color: 0x78350f, ...matBase });

        applyWorldCurvature(matGrass);
        applyWorldCurvature(matRock);
        applyWorldCurvature(matWood);

        // Top Grass Surface
        const topGeo = new THREE.CylinderGeometry(8, 7, 2, 16);
        const topMesh = new THREE.Mesh(topGeo, matGrass);
        topMesh.position.y = 0;
        topMesh.receiveShadow = true;
        topMesh.castShadow = false;
        islandGroup.add(topMesh);

        // Bottom Mountain Rock
        const botGeo = new THREE.ConeGeometry(7, 10, 12);
        const botMesh = new THREE.Mesh(botGeo, matRock);
        botMesh.rotation.x = Math.PI;
        botMesh.position.y = -6;
        botMesh.receiveShadow = true;
        islandGroup.add(botMesh);

        // Connecting Bridge
        const bridgeGroup = new THREE.Group();
        bridgeGroup.position.copy(slot.bridgePosition);

        const bridgeGeo = new THREE.BoxGeometry(4, 0.4, 10);
        const bridgeMesh = new THREE.Mesh(bridgeGeo, matWood);
        bridgeMesh.rotation.y = slot.bridgeRotationY;
        bridgeMesh.receiveShadow = true;
        bridgeMesh.castShadow = true;
        bridgeGroup.add(bridgeMesh);

        // Decorative lanterns or fences on bridge
        const postGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.2);
        const p1 = new THREE.Mesh(postGeo, matWood);
        p1.position.set(-1.8, 0.6, Math.sign(slot.bridgePosition.z || 1) * -3);
        bridgeMesh.add(p1);

        this.group.add(islandGroup);
        this.group.add(bridgeGroup);

        this.builtIslands.set(slot.id, { islandGroup, bridgeGroup });

        if (animate) {
            islandGroup.position.y = -18;
            bridgeGroup.position.y = -18;
            this.animatingIslands.push({
                islandGroup,
                bridgeGroup,
                targetY: 0,
                slotId: slot.id
            });
        }

        return islandGroup;
    }

    /**
     * Check if the player possesses the required resources in GameState or Inventory.
     */
    canAfford(cost) {
        if (!cost) return true;

        const res = gameState.resources || {};

        for (const [key, amount] of Object.entries(cost)) {
            if (amount <= 0) continue;

            let currentAvailable = res[key] || 0;

            // Also check inventory items as resource backups
            if (currentAvailable < amount) {
                let itemIdMap = { wood: 'wood_ancient', ore: 'ore_purgatory', gold: 'gold' };
                let targetItemId = itemIdMap[key] || key;
                let invCount = 0;

                if (gameState.backpackState) {
                    gameState.backpackState.forEach(slot => {
                        if (slot && (slot.itemId === targetItemId || slot.itemId === key)) {
                            invCount += slot.count;
                        }
                    });
                }
                currentAvailable += invCount;
            }

            if (currentAvailable < amount) {
                return false;
            }
        }
        return true;
    }

    /**
     * Deduct required resources from GameState and/or Inventory.
     */
    consumeResources(cost) {
        if (!cost) return;

        if (!gameState.resources) {
            gameState.resources = { wood: 0, ore: 0, gold: 0, straw: 0 };
        }

        for (const [key, amount] of Object.entries(cost)) {
            if (amount <= 0) continue;

            let needed = amount;

            if (gameState.resources[key] !== undefined && gameState.resources[key] > 0) {
                const available = gameState.resources[key];
                if (available >= needed) {
                    gameState.resources[key] -= needed;
                    needed = 0;
                } else {
                    needed -= available;
                    gameState.resources[key] = 0;
                }
            }

            if (needed > 0) {
                let itemIdMap = { wood: 'wood_ancient', ore: 'ore_purgatory', gold: 'gold' };
                let targetItemId = itemIdMap[key] || key;
                inventoryManager.removeItemById(targetItemId, needed);
            }
        }

        gameState.save();
    }

    /**
     * Attempt to build expansion at slotId.
     * @param {string} slotId - Slot ID or direction (e.g. 'slot_south', 'south')
     * @param {object} [cost] - Custom cost override
     * @returns {boolean} Success
     */
    buildExpansion(slotId, cost = null) {
        // Normalize slotId if user passes short direction like 'south'
        let normalizedId = slotId;
        if (!normalizedId.startsWith('slot_')) {
            normalizedId = `slot_${normalizedId}`;
        }

        const slot = EXPANSION_SLOTS.find(s => s.id === normalizedId);
        if (!slot) {
            console.warn(`TerraformingSystem: Invalid slotId '${slotId}'`);
            return false;
        }

        if (this.unlockedIslands.has(slot.id)) {
            if (window.showFloatingText && window.penitent) {
                window.showFloatingText('Ilha já construída!', window.penitent.group.position, '#facc15');
            }
            return false;
        }

        const reqCost = cost || slot.cost;
        if (!this.canAfford(reqCost)) {
            if (window.showFloatingText && window.penitent) {
                window.showFloatingText('Recursos insuficientes!', window.penitent.group.position, '#ef4444');
            }
            if (window.showToast) {
                window.showToast('Recursos insuficientes para expandir ilha!', 'text-red-400', 'fa-triangle-exclamation');
            }
            return false;
        }

        // Consume cost and save
        this.consumeResources(reqCost);

        // Mark unlocked and persist
        this.unlockedIslands.add(slot.id);
        this.saveUnlockedState();

        // Remove holographic blueprint preview
        this.removeHologram(slot.id);

        // Spawn real island with vertical interpolation (Y) animation
        const realIsland = this.spawnRealIsland(slot, true);

        // Feedback
        if (window.triggerScreenShake) {
            window.triggerScreenShake(0.3, 0.4);
        }
        if (window.showFloatingText && window.penitent) {
            window.showFloatingText(`▲ ${slot.name} Desbloqueada!`, slot.position.clone().add(new THREE.Vector3(0, 3, 0)), '#00ffff');
        }
        if (window.showToast) {
            window.showToast(`${slot.name} conectada ao Hub!`, 'text-cyan-400', 'fa-earth-americas');
        }

        return true;
    }

    /**
     * Update animations for holograms and vertical interpolation (Y) rising islands.
     */
    update(delta) {
        // Subtle pulse for holographic previews
        const pulse = 0.5 + Math.sin(gameState.time * 3.0) * 0.2;
        this.hologramMaterial.opacity = pulse;

        this.holograms.forEach(holo => {
            holo.rotation.y += delta * 0.2;
        });

        // Vertical Interpolation (Y) Animation for rising islands
        for (let i = this.animatingIslands.length - 1; i >= 0; i--) {
            const item = this.animatingIslands[i];
            const currentY = item.islandGroup.position.y;
            const diff = item.targetY - currentY;

            if (Math.abs(diff) < 0.05) {
                item.islandGroup.position.y = item.targetY;
                item.bridgeGroup.position.y = item.targetY;
                this.animatingIslands.splice(i, 1);
            } else {
                const step = diff * Math.min(1.0, delta * 4.5);
                item.islandGroup.position.y += step;
                item.bridgeGroup.position.y += step;
            }
        }
    }

    /**
     * Clean up materials and groups.
     */
    cleanup() {
        if (this.hologramMaterial) this.hologramMaterial.dispose();
        if (this.group) {
            this.scene.remove(this.group);
            this.group.traverse(child => {
                if (child.geometry) child.geometry.dispose();
            });
        }
        this.holograms.clear();
        this.builtIslands.clear();
        this.animatingIslands = [];
    }
}
