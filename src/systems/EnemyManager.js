import { LootManager } from "./LootManager.js";
import * as THREE from 'three';

const AI_CULLING_DISTANCE = 45;

export class EnemyManager {
    constructor(scene) {
        this.scene = scene;
        this.enemies = [];
        this.lootManager = new LootManager(scene);
        this.decalsGroup = new THREE.Group();
        this.scene.add(this.decalsGroup);

        // Simple procedural blood spot material
        const canvas = document.createElement('canvas'); canvas.width = 64; canvas.height = 64;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'rgba(0,0,0,0)'; ctx.fillRect(0,0,64,64);
        ctx.fillStyle = '#6e0000';
        ctx.beginPath(); ctx.arc(32,32, 28, 0, Math.PI*2); ctx.fill();
        for(let i=0; i<5; i++) {
            ctx.beginPath(); ctx.arc(32 + (Math.random()-0.5)*30, 32 + (Math.random()-0.5)*30, Math.random()*12, 0, Math.PI*2); ctx.fill();
        }
        const tex = new THREE.CanvasTexture(canvas);

        this.bloodMat = new THREE.MeshBasicMaterial({
            map: tex, transparent: true, opacity: 0.8,
            depthWrite: false, side: THREE.DoubleSide
        });

        this.bloodGeo = new THREE.PlaneGeometry(1.5, 1.5);
        this.bloodGeo.rotateX(-Math.PI / 2);
    }

    addEnemy(enemy) {
        enemy.manager = this;
        this.enemies.push(enemy);
    }

    onEnemyKilled(enemy) {
        // Handle logic when an enemy dies (e.g. spawn loot, notify map)
        console.log(`Enemy killed at ${enemy.group.position.x.toFixed(1)}, ${enemy.group.position.z.toFixed(1)}`);

        // Spawn permanent decal on the ground
        const decal = new THREE.Mesh(this.bloodGeo, this.bloodMat);
        decal.position.copy(enemy.group.position);
        decal.position.y += 0.02; // slightly above ground to prevent z-fighting
        decal.rotation.y = Math.random() * Math.PI * 2;
        decal.scale.setScalar(0.7 + Math.random() * 0.8);
        this.decalsGroup.add(decal);

        let enemyType = enemy.constructor.name;
        this.lootManager.spawnLoot(enemyType, enemy.group.position);
    }

    update(delta, playerGroup, inventoryUI, showToastFunc, getFloorFunc, checkCollisionFunc) {
        if (!playerGroup) return;
        const playerPos = playerGroup.position;

        // Define context object required by enemies
        const playerContext = {
            pos: playerPos,
            takeDamage: (amount) => {
                if (window.gameState) {
                    window.gameState.vitals.hp = Math.max(0, window.gameState.vitals.hp - amount);
                    // Survival feature: getting hit increases hunger
                    window.gameState.vitals.food = Math.max(0, window.gameState.vitals.food - 2);

                    const hpBar = document.getElementById('vital-hp');
                    const hpTxt = document.getElementById('txt-hp');
                    if (hpBar) hpBar.style.width = `${window.gameState.vitals.hp}%`;
                    if (hpTxt) hpTxt.innerText = `${Math.round(window.gameState.vitals.hp)}%`;

                    const foodBar = document.getElementById('vital-food');
                    const foodTxt = document.getElementById('txt-food');
                    if (foodBar) foodBar.style.width = `${window.gameState.vitals.food}%`;
                    if (foodTxt) foodTxt.innerText = `${Math.round(window.gameState.vitals.food)}%`;

                    window.gameState.save();
                }
            }
        };

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
                enemy.update(delta, playerContext, getFloorFunc, checkCollisionFunc);
            }
        }
    }

    checkMeleeHit(playerPos, forwardVector, damage, hitDist) {
        const hitEnemies = [];
        const pPos2D = new THREE.Vector2(playerPos.x, playerPos.z);
        const fwd2D = new THREE.Vector2(forwardVector.x, forwardVector.z).normalize();

        for (const enemy of this.enemies) {
            if (enemy.isDead) continue;

            const ePos2D = new THREE.Vector2(enemy.group.position.x, enemy.group.position.z);
            const dirToEnemy2D = new THREE.Vector2().subVectors(ePos2D, pPos2D);
            const dist = dirToEnemy2D.length();

            if (dist < hitDist) {
                dirToEnemy2D.normalize();
                const dot = fwd2D.dot(dirToEnemy2D);

                // Cone of about 120 degrees (-0.5 to 1.0 on dot product, or more strict like > 0)
                if (dot > 0.0) {
                    enemy.takeDamage(damage);
                    hitEnemies.push(enemy);

                    // Knockback logic can be added here or inside enemy.takeDamage
                    if (enemy.knockback && enemy.group) {
                         const knockDir = new THREE.Vector3(dirToEnemy2D.x, 0, dirToEnemy2D.y).normalize();
                         enemy.knockback.copy(knockDir.multiplyScalar(5.0));
                         enemy.velocityY = 4.0;
                    }
                }
            }
        }
        return hitEnemies;
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

        if (this.decalsGroup) {
            this.decalsGroup.traverse(child => {
                if (child.isMesh) {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) {
                        if (child.material.map) child.material.map.dispose();
                        child.material.dispose();
                    }
                }
            });
            this.scene.remove(this.decalsGroup);
            this.decalsGroup = null;
        }
    }
}
