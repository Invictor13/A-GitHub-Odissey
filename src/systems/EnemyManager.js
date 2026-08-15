import { LootManager } from "./LootManager.js";
import * as THREE from 'three';
import { disposeHierarchy } from '../core/GraphicsUtils.js';

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

        // Pre-allocate vectors for melee checks to avoid GC thrashing
        this._pPos2D = new THREE.Vector2();
        this._fwd2D = new THREE.Vector2();
        this._ePos2D = new THREE.Vector2();
        this._dirToEnemy2D = new THREE.Vector2();
        this._knockDir = new THREE.Vector3();
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
            takeDamage: (amount, sourcePos) => {
                try {
                    if (window.gameState && window.gameState.vitals) {
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

                        if (typeof window.gameState.save === 'function') {
                            window.gameState.save();
                        }

                        // GAME OVER LOOP
                        if (window.gameState.vitals.hp <= 0 && window.penitent && !window.penitent.isDead) {
                            window.penitent.isDead = true; // 1. Travar inputs

                            // 2. Fade to black
                            const fadeDiv = document.createElement('div');
                            fadeDiv.style.position = 'absolute';
                            fadeDiv.style.top = '0';
                            fadeDiv.style.left = '0';
                            fadeDiv.style.width = '100%';
                            fadeDiv.style.height = '100%';
                            fadeDiv.style.backgroundColor = 'black';
                            fadeDiv.style.opacity = '0';
                            fadeDiv.style.transition = 'opacity 1.5s ease-in-out';
                            fadeDiv.style.zIndex = '9999';
                            fadeDiv.style.pointerEvents = 'none';
                            document.body.appendChild(fadeDiv);

                            setTimeout(() => { fadeDiv.style.opacity = '1'; }, 50);

                            setTimeout(() => {
                                // 3. Resetar maestrias temporárias
                                if (window.gameState && window.gameState.masteries) {
                                    for (let key in window.gameState.masteries) {
                                        window.gameState.masteries[key].level = 1;
                                        window.gameState.masteries[key].xp = 0;
                                    }
                                }

                                // 4. Teleportar penitente pra base (Santuário Celeste)
                                const barracaData = window.gameState && window.gameState.hubState && window.gameState.hubState.structures
                                    ? window.gameState.hubState.structures.find(s => s.type === 'barraca')
                                    : null;

                                if (barracaData) {
                                    window.penitent.group.position.set(barracaData.x, barracaData.y + 0.1, barracaData.z + 3.2);
                                } else {
                                    window.penitent.group.position.set(0, 0.2, 3.5);
                                }

                                // 5. Restaurar HP
                                window.gameState.vitals.hp = window.gameState.vitals.maxHp || 100;
                                const bar = document.getElementById('vital-hp');
                                const txt = document.getElementById('txt-hp');
                                if (bar) bar.style.width = `100%`;
                                if (txt) txt.innerText = `100%`;

                                // 6. Atualizar estado para HUB e destravar
                                if (window.changeGameState) {
                                    window.changeGameState('HUB');
                                } else {
                                    window.GAME_STATE = 'HUB';
                                }
                                window.hubBuildingState = 'EXPLORING';
                                window.penitent.isDead = false;

                                fadeDiv.style.opacity = '0';
                                setTimeout(() => { document.body.removeChild(fadeDiv); }, 1500);
                            }, 2000);
                        }
                    }

                    if (window.showFloatingText && playerPos) {
                        window.showFloatingText(`-${amount}`, playerPos, '#ff4444');
                    }
                } catch (e) {
                    console.error("Error in playerContext.takeDamage:", e);
                }
            },
            // Give enemies the ability to find targets (player or NPCs)
            findClosestTarget: (enemyPos, maxDist = 20) => {
                let closest = playerContext;
                let minDist = enemyPos.distanceTo(playerPos);

                if (minDist > maxDist) {
                    closest = null;
                    minDist = maxDist;
                }

                // Check against NPCs if any are in the enemies array
                for (const entity of this.enemies) {
                    if (entity.isDead || entity === playerContext) continue;
                    // Check if it's an NPC (friendly/neutral)
                    if (entity.constructor.name === 'Merchant' || entity.constructor.name === 'Guard' || entity.constructor.name === 'Alchemist' || entity.constructor.name === 'Explorer') {
                        const dist = enemyPos.distanceTo(entity.group.position);
                        if (dist < minDist) {
                            minDist = dist;
                            closest = {
                                pos: entity.group.position,
                                takeDamage: (amount, sourcePos) => entity.takeDamage(amount, sourcePos),
                                isNPC: true,
                                entity: entity
                            };
                        }
                    }
                }

                return closest;
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

            // Spatial Culling: Only update enemies within a certain radius of the player
            // Use squared distance for fast check (e.g., 60 units radius -> 3600 sq)
            const distSq = enemy.group.position.distanceToSquared(playerPos);
            if (distSq < 3600) {
                enemy.update(delta, playerContext, getFloorFunc, checkCollisionFunc, this);
            }
        }
    }

    checkMeleeHit(playerPos, forwardVector, damage, hitDist) {
        const hitEnemies = [];
        this._pPos2D.set(playerPos.x, playerPos.z);
        this._fwd2D.set(forwardVector.x, forwardVector.z).normalize();

        const hitDistSq = hitDist * hitDist;

        // Elevar a origem/centro geométrico da caixa delimitadora do ataque no eixo Y
        const attackOrigin = new THREE.Vector3(playerPos.x, playerPos.y + 1.0, playerPos.z);

        for (const enemy of this.enemies) {
            if (enemy.isDead) continue;

            this._ePos2D.set(enemy.group.position.x, enemy.group.position.z);
            this._dirToEnemy2D.subVectors(this._ePos2D, this._pPos2D);

            // Sincronizar a detecção da hitbox do ataque com a meia-altura dos modelos inimigos (plano XZ horizontal ignora Y)
            // Fast culling using lengthSq
            if (this._dirToEnemy2D.lengthSq() < hitDistSq) {
                this._dirToEnemy2D.normalize();
                const dot = this._fwd2D.dot(this._dirToEnemy2D);

                // Cone of about 120 degrees (-0.5 to 1.0 on dot product, or more strict like > 0)
                if (dot > 0.707) {
                    enemy.takeDamage(damage, attackOrigin);
                    hitEnemies.push(enemy);
                    if (window.triggerScreenShake) {
                        window.triggerScreenShake(0.05, 0.08); // amplitude 0.05, duration 0.08s
                    }
                    if (window.penitent && typeof window.penitent.spawnVFX === 'function') {
                        // Impact position is somewhere between player and enemy
                        const impactPos = new THREE.Vector3().lerpVectors(playerPos, enemy.group.position, 0.5);
                        impactPos.y += 1.0; // Approx chest height
                        window.penitent.spawnVFX(impactPos, 'slash', 6);
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
            disposeHierarchy(this.decalsGroup);
            this.scene.remove(this.decalsGroup);
            this.decalsGroup = null;
        }
    }
}
