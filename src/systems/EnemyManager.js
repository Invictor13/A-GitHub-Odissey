import { LootManager } from "./LootManager.js";
import * as THREE from 'three';

const AI_CULLING_DISTANCE = 45;

export class EnemyManager {
    constructor(scene) {
        this.scene = scene;
        this.enemies = [];
        this.lootManager = new LootManager(scene);
    }

    addEnemy(enemy) {
        enemy.manager = this;
        this.enemies.push(enemy);
    }

    onEnemyKilled(enemy) {
        // Handle logic when an enemy dies (e.g. spawn loot, notify map)
        console.log(`Enemy killed at ${enemy.group.position.x.toFixed(1)}, ${enemy.group.position.z.toFixed(1)}`);

        let enemyType = enemy.constructor.name;
        this.lootManager.spawnLoot(enemyType, enemy.group.position);
    }

    update(delta, playerGroup, inventoryUI, showToastFunc) {
        if (!playerGroup) return;
        const playerPos = playerGroup.position;

        this.lootManager.update(delta, playerGroup, inventoryUI, showToastFunc);

        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];

            if (enemy.isDead) {
                // If the enemy is marked as dead, we can clean it up and remove it from the list
                enemy.destroy();
                this.enemies.splice(i, 1);
                continue;
            }

            // Spatial Culling: only update AI if within distance
            const dx = enemy.group.position.x - playerPos.x;
            const dz = enemy.group.position.z - playerPos.z;
            const distSq = dx * dx + dz * dz;

            if (distSq <= AI_CULLING_DISTANCE * AI_CULLING_DISTANCE) {
                enemy.update(delta, playerPos);
            }
        }
    }

    areAllEnemiesDead() {
        return this.enemies.length === 0;
    }

    cleanup() {
        for (const enemy of this.enemies) {
            enemy.destroy();
        }
        this.enemies = [];
        this.lootManager.cleanup();
    }
}
