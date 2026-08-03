import * as THREE from 'three';
import { ObjectPool } from '../core/ObjectPoolManager.js';
import { ITEM_DATABASE } from '../data/ItemData.js';
import gameState from '../core/GameState.js';
import { inventoryManager } from './InventoryManager.js';

export const LOOT_TABLES = {
    Slime: [
        { itemId: 'potion_hp_small', chance: 0.3 },
        { itemId: 'herb_astral', chance: 0.4 },
        { itemId: 'gold_coin', chance: 0.5, amount: [1, 3] }
    ],
    Goblin: [
        { itemId: 'rusty_dagger', chance: 0.15 },
        { itemId: 'gold_coin', chance: 0.7, amount: [2, 5] },
        { itemId: 'ration_purgatory', chance: 0.2 }
    ],
    Kobold: [
        { itemId: 'wood_ancient', chance: 0.3 },
        { itemId: 'gold_coin', chance: 0.6, amount: [1, 4] },
        { itemId: 'rusty_dagger', chance: 0.1 }
    ],
    Skeleton: [
        { itemId: 'iron_sword', chance: 0.1 },
        { itemId: 'wooden_shield', chance: 0.1 },
        { itemId: 'ore_purgatory', chance: 0.4 },
        { itemId: 'gold_coin', chance: 0.8, amount: [3, 8] }
    ],
    Lizardman: [
        { itemId: 'leather_armor', chance: 0.1 },
        { itemId: 'potion_hp_medium', chance: 0.25 },
        { itemId: 'gold_coin', chance: 0.9, amount: [5, 12] }
    ]
};

// Colors for drops based on rarity or type
const MAT_GOLD = new THREE.MeshStandardMaterial({ color: 0xffd700, emissive: 0xaa8800, emissiveIntensity: 0.5 });
const MAT_POTION = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xaa0000, emissiveIntensity: 0.5 });
const MAT_GEAR = new THREE.MeshStandardMaterial({ color: 0x4444ff, emissive: 0x2222aa, emissiveIntensity: 0.5 });
const MAT_MATERIAL = new THREE.MeshStandardMaterial({ color: 0x22aa22, emissive: 0x116611, emissiveIntensity: 0.5 });

function createPickupMesh() {
    const group = new THREE.Group();
    // Default shape is a small cube, will be updated per item
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), MAT_MATERIAL);
    mesh.castShadow = true;
    group.add(mesh);
    group.mesh = mesh; // reference

    const light = new THREE.PointLight(0xffffff, 1, 2);
    light.position.y = 0.5;
    group.add(light);
    group.light = light;

    return group;
}

ObjectPool.createPool('pickup_objects', createPickupMesh, 20);

export class LootManager {
    constructor(scene) {
        this.scene = scene;
        this.pickups = [];
    }

    spawnLoot(enemyType, position) {
        const table = LOOT_TABLES[enemyType];
        if (!table) return;

        for (const drop of table) {
            if (Math.random() < drop.chance) {
                const itemData = ITEM_DATABASE[drop.itemId];
                if (!itemData) continue;

                let amount = 1;
                if (drop.amount) {
                    amount = Math.floor(Math.random() * (drop.amount[1] - drop.amount[0] + 1)) + drop.amount[0];
                }

                // Spawn the actual item
                this.createPickup(drop.itemId, amount, position);
            }
        }
    }

    createPickup(itemId, amount, startPos) {
        const itemData = ITEM_DATABASE[itemId];
        const pickupGroup = ObjectPool.get('pickup_objects');
        if (!pickupGroup) return;

        pickupGroup.position.copy(startPos);
        pickupGroup.position.y += 0.5; // Start a bit above ground

        // Random toss out
        const angle = Math.random() * Math.PI * 2;
        const dist = 0.5 + Math.random() * 1.5;
        pickupGroup.userData = {
            itemId: itemId,
            amount: amount,
            type: itemData.type,
            active: true,
            t: 0,
            startX: startPos.x,
            startZ: startPos.z,
            targetX: startPos.x + Math.cos(angle) * dist,
            targetZ: startPos.z + Math.sin(angle) * dist,
            startY: pickupGroup.position.y,
            magnetized: false
        };

        // Adjust mesh based on type
        if (itemData.type === 'currency') {
            pickupGroup.mesh.geometry = new THREE.CylinderGeometry(0.2, 0.2, 0.05, 16);
            pickupGroup.mesh.geometry.rotateX(Math.PI / 2); // coin stands up
            pickupGroup.mesh.material = MAT_GOLD;
            pickupGroup.light.color.setHex(0xffd700);
        } else if (itemData.type === 'consumable') {
            pickupGroup.mesh.geometry = new THREE.CylinderGeometry(0.1, 0.15, 0.4, 8);
            pickupGroup.mesh.material = MAT_POTION;
            pickupGroup.light.color.setHex(0xff0000);
        } else if (itemData.type.startsWith('armor') || itemData.type === 'weapon') {
            pickupGroup.mesh.geometry = new THREE.OctahedronGeometry(0.25);
            pickupGroup.mesh.material = MAT_GEAR;
            pickupGroup.light.color.setHex(0x4444ff);
        } else {
            pickupGroup.mesh.geometry = new THREE.BoxGeometry(0.3, 0.3, 0.3);
            pickupGroup.mesh.material = MAT_MATERIAL;
            pickupGroup.light.color.setHex(0x22aa22);
        }

        pickupGroup.visible = true;
        this.scene.add(pickupGroup);
        this.pickups.push(pickupGroup);
    }

    update(delta, playerGroup, inventoryUI, showToastFunc) {
        if (!playerGroup) return;
        const playerPos = playerGroup.position;

        for (let i = this.pickups.length - 1; i >= 0; i--) {
            const pickup = this.pickups[i];
            if (!pickup.userData.active) {
                this.scene.remove(pickup);
                ObjectPool.release('pickup_objects', pickup);
                this.pickups.splice(i, 1);
                continue;
            }

            const ud = pickup.userData;

            // Spawn animation (toss and bounce)
            if (ud.t < 1.0) {
                ud.t += delta * 2.0;
                if (ud.t > 1.0) ud.t = 1.0;

                // Ease out quad for x/z
                const easeOut = 1 - Math.pow(1 - ud.t, 2);
                pickup.position.x = ud.startX + (ud.targetX - ud.startX) * easeOut;
                pickup.position.z = ud.startZ + (ud.targetZ - ud.startZ) * easeOut;

                // Parabola for Y
                const jump = Math.sin(ud.t * Math.PI) * 1.5;
                pickup.position.y = ud.startY + jump;
            } else {
                // Bobbing and spinning
                pickup.position.y = ud.startY + Math.sin(Date.now() * 0.003) * 0.15;
                pickup.rotation.y += delta * 2;

                const distSq = pickup.position.distanceToSquared(playerPos);

                // Magnet logic for gold
                if (ud.type === 'currency' && distSq < 16.0) { // Radius 4 (4*4=16)
                    ud.magnetized = true;
                }

                if (ud.magnetized) {
                    const dir = new THREE.Vector3().subVectors(playerPos, pickup.position).normalize();
                    pickup.position.addScaledVector(dir, 15 * delta); // fast magnet speed

                    if (pickup.position.distanceToSquared(playerPos) < 1.0) {
                        this.collectItem(pickup, showToastFunc);
                    }
                } else if (distSq < 4.0) { // Radius 2 (2*2=4) for interaction/proximity
                    // Auto-pickup items if close enough and not gold (since gold is magnetic)
                    if (ud.type !== 'currency') {
                        // TODO: Check if inventory has space, maybe require 'E' press
                        // For now, auto-pickup on proximity
                        this.collectItem(pickup, showToastFunc);
                    }
                }
            }
        }
    }

    collectItem(pickup, showToastFunc) {
        const ud = pickup.userData;
        const itemData = ITEM_DATABASE[ud.itemId];

        if (ud.type === 'currency') {
            gameState.resources.gold += ud.amount;
            if (showToastFunc) showToastFunc(`+${ud.amount} Ouro`, 'text-yellow-400', 'fa-coins');

            // Dispatch event for UI update
            window.dispatchEvent(new Event('gold-updated'));
            ud.active = false;
            return;
        }

        // Handle non-currency items (inventory)
        let added = inventoryManager.addItem(ud.itemId, ud.amount);

        if (added) {
            if (showToastFunc) showToastFunc(`+${ud.amount} ${itemData.name}`, 'text-amber-400', itemData.icon);
            ud.active = false;
            if (window.inventoryUI) {
                window.inventoryUI.render();
            }
        } else {
            if (showToastFunc) showToastFunc(`Mochila Cheia!`, 'text-red-500', 'fa-suitcase-rolling');
            // If full, it stays on the ground, so we don't deactivate it.
        }
    }

    cleanup() {
        for (const pickup of this.pickups) {
            if (pickup.mesh) {
                if (pickup.mesh.geometry) pickup.mesh.geometry.dispose();
                // Material disposal isn't necessary here since we reuse global materials (MAT_GOLD, etc.)
            }
            this.scene.remove(pickup);
            ObjectPool.release('pickup_objects', pickup);
        }
        this.pickups = [];
    }
}
