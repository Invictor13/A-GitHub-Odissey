import * as THREE from 'three';
import { inventoryManager } from '../systems/InventoryManager.js';

export class HubResources {
    constructor(scene, terrain) {
        this.scene = scene;
        this.terrain = terrain;

        this.group = new THREE.Group();
        this.scene.add(this.group);

        this.nodes = [];
        this.colliders = [];
        this.activeColliders = [];

        this.treeMesh = null;
        this.rockMesh = null;

        this.dummy = new THREE.Object3D();

        this.buildInstancedMeshes();
        this.spawnResources();
    }

    buildInstancedMeshes() {
        const MAX_TREES = 8;
        const MAX_ROCKS = 6;

        // Tree geometries
        const trunkGeo = new THREE.CylinderGeometry(0.2, 0.3, 2, 6);
        trunkGeo.translate(0, 1, 0); // Origin at bottom

        const leavesGeo = new THREE.ConeGeometry(1.2, 3, 7);
        leavesGeo.translate(0, 2.5, 0); // Above trunk

        // Merge tree geometry using an Object3D to hold them conceptually, but InstancedMesh needs a single geometry, or we use two InstancedMeshes and keep them synced.
        // For simplicity and to have different materials without BufferGeometryUtils, we use two InstancedMeshes for the tree.
        const trunkMat = new THREE.MeshLambertMaterial({ color: 0x4a2e18, flatShading: true });
        const leavesMat = new THREE.MeshLambertMaterial({ color: 0x1e4d2b, flatShading: true });

        this.treeTrunkMesh = new THREE.InstancedMesh(trunkGeo, trunkMat, MAX_TREES);
        this.treeTrunkMesh.castShadow = true;
        this.treeTrunkMesh.receiveShadow = true;

        this.treeLeavesMesh = new THREE.InstancedMesh(leavesGeo, leavesMat, MAX_TREES);
        this.treeLeavesMesh.castShadow = true;
        this.treeLeavesMesh.receiveShadow = true;

        this.group.add(this.treeTrunkMesh);
        this.group.add(this.treeLeavesMesh);

        // Rock geometry
        const rockGeo = new THREE.DodecahedronGeometry(0.8, 0);
        // Slightly flatten the rock
        rockGeo.scale(1, 0.8, 1);
        rockGeo.translate(0, 0.5, 0);

        const rockMat = new THREE.MeshLambertMaterial({ color: 0x5a6269, flatShading: true });
        this.rockMesh = new THREE.InstancedMesh(rockGeo, rockMat, MAX_ROCKS);
        this.rockMesh.castShadow = true;
        this.rockMesh.receiveShadow = true;

        this.group.add(this.rockMesh);

        // Particle System
        const pGeo = new THREE.BoxGeometry(0.1, 0.1, 0.1);
        const pMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
        this.particleMesh = new THREE.InstancedMesh(pGeo, pMat, 200);
        this.particleMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        this.group.add(this.particleMesh);

        this.particles = [];
        this.nextParticleIdx = 0;

        for(let i=0; i<200; i++) {
            this.particles.push({ active: false, pos: new THREE.Vector3(), vel: new THREE.Vector3(), life: 0, maxLife: 1, color: new THREE.Color() });
            this.dummy.scale.set(0,0,0);
            this.dummy.updateMatrix();
            this.particleMesh.setMatrixAt(i, this.dummy.matrix);
            this.particleMesh.setColorAt(i, new THREE.Color(0xffffff));
        }
        this.particleMesh.instanceMatrix.needsUpdate = true;
        if(this.particleMesh.instanceColor) this.particleMesh.instanceColor.needsUpdate = true;
    }

    spawnResources() {
        // Spawn 6 to 8 trees
        const numTrees = 6 + Math.floor(Math.random() * 3);
        let treeCount = 0;

        // Spawn 4 to 6 rocks
        const numRocks = 4 + Math.floor(Math.random() * 3);
        let rockCount = 0;

        const maxAttempts = 100;
        let attempts = 0;

        while ((treeCount < numTrees || rockCount < numRocks) && attempts < maxAttempts) {
            attempts++;
            const x = -10 + Math.random() * 20;
            const z = -10 + Math.random() * 20;

            const gridX = Math.floor(x);
            const gridZ = Math.floor(z);

            // Avoid center spawn point
            if (Math.abs(gridX) <= 2 && Math.abs(gridZ) <= 2) continue;
            // Avoid portal area (0, 2, -8) roughly x between -2 and 2, z between -9 and -7
            if (gridX >= -3 && gridX <= 3 && gridZ >= -10 && gridZ <= -6) continue;

            const y = this.terrain.getHeightAt(x, z);

            if (y >= 1 && y < 3) {
                // Check distance to existing nodes to prevent clustering
                const pos = new THREE.Vector3(x, y, z);
                let tooClose = false;
                for (const node of this.nodes) {
                    if (node.position.distanceToSquared(pos) < 2.5 * 2.5) {
                        tooClose = true;
                        break;
                    }
                }

                if (tooClose) continue;

                if (treeCount < numTrees) {
                    // Add tree
                    const rotY = Math.random() * Math.PI * 2;
                    const scale = 0.8 + Math.random() * 0.4;
                    this.dummy.position.copy(pos);
                    this.dummy.rotation.set(0, rotY, 0);
                    this.dummy.scale.set(scale, scale, scale);
                    this.dummy.updateMatrix();

                    this.treeTrunkMesh.setMatrixAt(treeCount, this.dummy.matrix);
                    this.treeLeavesMesh.setMatrixAt(treeCount, this.dummy.matrix);

                    const node = {
                        type: 'tree',
                        index: treeCount,
                        position: pos.clone(),
                        hp: 3,
                        maxHp: 3,
                        scale: scale,
                        rotY: rotY
                    };
                    this.nodes.push(node);

                    // Add collider
                    const collider = new THREE.Box3().setFromCenterAndSize(
                        new THREE.Vector3(pos.x, pos.y + 1, pos.z),
                        new THREE.Vector3(0.8, 4, 0.8)
                    );
                    node.collider = collider;
                    this.activeColliders.push(collider);

                    treeCount++;
                } else if (rockCount < numRocks) {
                    // Add rock
                    const rotY = Math.random() * Math.PI * 2;
                    const scale = 0.7 + Math.random() * 0.6;
                    this.dummy.position.copy(pos);
                    this.dummy.rotation.set(0, rotY, 0);
                    this.dummy.scale.set(scale, scale, scale);
                    this.dummy.updateMatrix();

                    this.rockMesh.setMatrixAt(rockCount, this.dummy.matrix);

                    const node = {
                        type: 'rock',
                        index: rockCount,
                        position: pos.clone(),
                        hp: 3,
                        maxHp: 3,
                        scale: scale,
                        rotY: rotY
                    };
                    this.nodes.push(node);

                    const collider = new THREE.Box3().setFromCenterAndSize(
                        new THREE.Vector3(pos.x, pos.y + 0.4, pos.z),
                        new THREE.Vector3(1.2, 0.8, 1.2)
                    );
                    node.collider = collider;
                    this.activeColliders.push(collider);

                    rockCount++;
                }
            }
        }

        // Hide unused instances
        this.dummy.scale.set(0, 0, 0);
        this.dummy.updateMatrix();
        for (let i = treeCount; i < this.treeTrunkMesh.count; i++) {
            this.treeTrunkMesh.setMatrixAt(i, this.dummy.matrix);
            this.treeLeavesMesh.setMatrixAt(i, this.dummy.matrix);
        }
        for (let i = rockCount; i < this.rockMesh.count; i++) {
            this.rockMesh.setMatrixAt(i, this.dummy.matrix);
        }

        this.treeTrunkMesh.instanceMatrix.needsUpdate = true;
        this.treeLeavesMesh.instanceMatrix.needsUpdate = true;
        this.rockMesh.instanceMatrix.needsUpdate = true;
    }

    getColliders() {
        return this.activeColliders;
    }

    hitNode(position, damage) {
        if (!position || typeof position.x !== 'number') return;

        const hitDistSq = 1.5 * 1.5;
        let closestNode = null;
        let minSq = Infinity;

        // Find the closest active node
        for (const node of this.nodes) {
            if (node.hp <= 0) continue;
            // Ignore Y for distance check
            const dx = node.position.x - position.x;
            const dz = node.position.z - position.z;
            const distSq = dx * dx + dz * dz;

            if (distSq < hitDistSq && distSq < minSq) {
                minSq = distSq;
                closestNode = node;
            }
        }

        if (closestNode) {
            closestNode.hp -= damage;

            // Set wobble
            closestNode.wobbleTimer = 0.2;

            this.dummy.position.copy(closestNode.position);
            this.dummy.rotation.set(0, closestNode.rotY, 0);

            if (closestNode.hp > 0) {
                // Just hit feedback
                this.dummy.scale.set(closestNode.scale * 0.85, closestNode.scale * 0.85, closestNode.scale * 0.85);
                this.updateNodeMatrix(closestNode, this.dummy.matrix);

                // Small particles
                this.emitParticles(closestNode, 6, 10, position);
            } else {
                // Destroyed
                this.dummy.scale.set(0, 0, 0);
                this.updateNodeMatrix(closestNode, this.dummy.matrix);

                // Big explosion of particles
                this.emitParticles(closestNode, 20, 30, closestNode.position);

                // Remove collider
                const colIdx = this.activeColliders.indexOf(closestNode.collider);
                if (colIdx > -1) {
                    this.activeColliders.splice(colIdx, 1);
                }

                // Grant resources and XP
                this.distributeLoot(closestNode);
            }
        }
    }

    emitParticles(node, minAmount, maxAmount, origin) {
        const amount = minAmount + Math.floor(Math.random() * (maxAmount - minAmount));
        const color = node.type === 'tree' ? (Math.random() > 0.5 ? 0x451a03 : 0x047857) : 0x5a6269;
        const colObj = new THREE.Color(color);

        for(let i=0; i<amount; i++) {
            const p = this.particles[this.nextParticleIdx];
            p.active = true;
            p.life = 0.5 + Math.random() * 0.5;
            p.maxLife = p.life;
            p.pos.copy(origin);
            p.pos.y += 0.5 + Math.random() * 1.0;

            // Blast outwards
            p.vel.set((Math.random() - 0.5) * 5, 2 + Math.random() * 3, (Math.random() - 0.5) * 5);
            p.color.copy(colObj);

            this.nextParticleIdx = (this.nextParticleIdx + 1) % 200;
        }
    }

    update(delta) {
        // Update nodes wobble
        let matrixNeedsUpdate = false;
        let treeNeedsUpdate = false;
        let rockNeedsUpdate = false;

        for (const node of this.nodes) {
            if (node.hp <= 0) continue;

            if (node.wobbleTimer > 0) {
                node.wobbleTimer -= delta;
                let currentScale = node.scale;
                if (node.wobbleTimer > 0) {
                    currentScale = node.scale * 0.85;
                } else {
                    node.wobbleTimer = 0;
                }

                this.dummy.position.copy(node.position);
                this.dummy.rotation.set(0, node.rotY, 0);
                this.dummy.scale.set(currentScale, currentScale, currentScale);
                this.dummy.updateMatrix();

                if (node.type === 'tree') {
                    this.treeTrunkMesh.setMatrixAt(node.index, this.dummy.matrix);
                    this.treeLeavesMesh.setMatrixAt(node.index, this.dummy.matrix);
                    treeNeedsUpdate = true;
                } else {
                    this.rockMesh.setMatrixAt(node.index, this.dummy.matrix);
                    rockNeedsUpdate = true;
                }
            }
        }

        if (treeNeedsUpdate) {
            this.treeTrunkMesh.instanceMatrix.needsUpdate = true;
            this.treeLeavesMesh.instanceMatrix.needsUpdate = true;
        }
        if (rockNeedsUpdate) {
            this.rockMesh.instanceMatrix.needsUpdate = true;
        }

        // Update particles
        let pNeedsUpdate = false;
        for (let i = 0; i < 200; i++) {
            const p = this.particles[i];
            if (p.active) {
                p.life -= delta;
                if (p.life <= 0) {
                    p.active = false;
                    this.dummy.scale.set(0,0,0);
                    this.dummy.updateMatrix();
                    this.particleMesh.setMatrixAt(i, this.dummy.matrix);
                } else {
                    p.vel.y -= 9.8 * delta; // gravity
                    p.pos.addScaledVector(p.vel, delta);

                    // Simple floor collision
                    if (p.pos.y < 0) {
                        p.pos.y = 0;
                        p.vel.y *= -0.3;
                        p.vel.x *= 0.8;
                        p.vel.z *= 0.8;
                    }

                    const s = p.life / p.maxLife; // Shrink over time
                    this.dummy.position.copy(p.pos);
                    this.dummy.scale.set(s, s, s);
                    // Add some rotation
                    this.dummy.rotation.set(p.life * 10, p.life * 10, p.life * 10);
                    this.dummy.updateMatrix();
                    this.particleMesh.setMatrixAt(i, this.dummy.matrix);
                    this.particleMesh.setColorAt(i, p.color);
                }
                pNeedsUpdate = true;
            }
        }

        if (pNeedsUpdate) {
            this.particleMesh.instanceMatrix.needsUpdate = true;
            if(this.particleMesh.instanceColor) this.particleMesh.instanceColor.needsUpdate = true;
        }
    }

    updateNodeMatrix(node, matrix) {
        if (node.type === 'tree') {
            this.treeTrunkMesh.setMatrixAt(node.index, matrix);
            this.treeLeavesMesh.setMatrixAt(node.index, matrix);
            this.treeTrunkMesh.instanceMatrix.needsUpdate = true;
            this.treeLeavesMesh.instanceMatrix.needsUpdate = true;
        } else if (node.type === 'rock') {
            this.rockMesh.setMatrixAt(node.index, matrix);
            this.rockMesh.instanceMatrix.needsUpdate = true;
        }
    }

    distributeLoot(node) {
        let addedCount = 0;
        let itemName = '';
        let xpAmount = 20;
        let skillName = '';
        let skillLabel = '';
        let iconClass = '';

        if (node.type === 'tree') {
            addedCount = 2;
            inventoryManager.addItem('wood_ancient', addedCount);
            itemName = 'Madeira Ancestral';
            skillName = 'logger';
            skillLabel = 'Lenhador';
            iconClass = '#16a34a'; // Greenish
        } else if (node.type === 'rock') {
            addedCount = 2;
            inventoryManager.addItem('stone', addedCount);
            itemName = 'Pedra Granítica';
            skillName = 'miner';
            skillLabel = 'Mineração';
            iconClass = '#94a3b8'; // Grayish
        }

        // Show floating text
        if (window.showFloatingText) {
            // Text for item
            window.showFloatingText(`+${addedCount} ${itemName}`, new THREE.Vector3(node.position.x, node.position.y + 2.0, node.position.z), '#facc15');
            // Text for XP slightly offset
            setTimeout(() => {
                window.showFloatingText(`+${xpAmount} XP ${skillLabel}`, new THREE.Vector3(node.position.x, node.position.y + 2.5, node.position.z), iconClass);
            }, 300);
        }

        // Add to inventory UI rendering if possible
        if (window.inventoryUI && typeof window.inventoryUI.renderGrid === 'function') {
            window.inventoryUI.renderGrid();
        }

        // Grant Skill XP defensively
        if (window.gainSkillXP) {
            window.gainSkillXP(skillName, xpAmount);
        }
    }
}
