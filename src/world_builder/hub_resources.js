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
        // Use normal groups instead of InstancedMesh to satisfy disposal requirement
        this.treeGroup = new THREE.Group();
        this.rockGroup = new THREE.Group();
        this.group.add(this.treeGroup);
        this.group.add(this.rockGroup);

        // Geometries
        this.trunkGeo = new THREE.CylinderGeometry(0.2, 0.3, 2, 6);
        this.trunkGeo.translate(0, 1, 0);
        this.leavesGeo = new THREE.ConeGeometry(1.2, 3, 7);
        this.leavesGeo.translate(0, 2.5, 0);
        this.rockGeo = new THREE.DodecahedronGeometry(0.8, 0);
        this.rockGeo.scale(1, 0.8, 1);
        this.rockGeo.translate(0, 0.5, 0);

        this.trunkMat = new THREE.MeshLambertMaterial({ color: 0x4a2e18, flatShading: true });
        this.leavesMat = new THREE.MeshLambertMaterial({ color: 0x1e4d2b, flatShading: true });
        this.rockMat = new THREE.MeshLambertMaterial({ color: 0x5a6269, flatShading: true });

        // Particle System (Keep as instanced for performance)
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
            const x = -13 + Math.random() * 26;
            const z = -13 + Math.random() * 26;

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

                    const treeRoot = new THREE.Group();
                    const trunk = new THREE.Mesh(this.trunkGeo.clone(), this.trunkMat.clone());
                    const leaves = new THREE.Mesh(this.leavesGeo.clone(), this.leavesMat.clone());
                    trunk.castShadow = true; trunk.receiveShadow = true;
                    leaves.castShadow = true; leaves.receiveShadow = true;
                    treeRoot.add(trunk);
                    treeRoot.add(leaves);

                    treeRoot.position.copy(pos);
                    treeRoot.rotation.set(0, rotY, 0);
                    treeRoot.scale.set(scale, scale, scale);
                    this.treeGroup.add(treeRoot);

                    const node = {
                        type: 'tree',
                        index: treeCount,
                        position: pos.clone(),
                        hp: 3,
                        maxHp: 3,
                        scale: scale,
                        rotY: rotY,
                        mesh: treeRoot
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

                    const rockRoot = new THREE.Mesh(this.rockGeo.clone(), this.rockMat.clone());
                    rockRoot.castShadow = true; rockRoot.receiveShadow = true;

                    rockRoot.position.copy(pos);
                    rockRoot.rotation.set(0, rotY, 0);
                    rockRoot.scale.set(scale, scale, scale);
                    this.rockGroup.add(rockRoot);

                    const node = {
                        type: 'rock',
                        index: rockCount,
                        position: pos.clone(),
                        hp: 3,
                        maxHp: 3,
                        scale: scale,
                        rotY: rotY,
                        mesh: rockRoot
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

        // Spawn Herbs
        let herbCount = 0;
        for (let i = 0; i < 15; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = 5 + Math.random() * 20;
            const x = Math.cos(angle) * dist;
            const z = Math.sin(angle) * dist;

            // Check boundaries and avoid center spawn area
            if (Math.abs(x) < 28 && Math.abs(z) < 28 && (Math.abs(x) > 5 || Math.abs(z) > 5)) {
                let posY = 0;
                if (this.terrain && typeof this.terrain.getHeightAt === 'function') {
                    posY = this.terrain.getHeightAt(x, z);
                } else if (this.terrain && this.terrain.position) {
                    posY = this.terrain.position.y;
                }

                // Herb Geometry
                const herbGeo = new THREE.CylinderGeometry(0, 0.1, 0.4, 4);
                const herbMat = new THREE.MeshLambertMaterial({ color: 0x22c55e }); // Green
                const herbMesh = new THREE.Mesh(herbGeo, herbMat);
                herbMesh.position.set(x, posY + 0.2, z);
                herbMesh.castShadow = false;

                // Create a container group so it can act like a node
                const herbGroup = new THREE.Group();
                herbGroup.add(herbMesh);
                this.group.add(herbGroup);

                // Create a basic collider
                const collider = new THREE.Box3();
                collider.setFromCenterAndSize(new THREE.Vector3(x, posY + 0.2, z), new THREE.Vector3(0.5, 0.5, 0.5));
                this.activeColliders.push(collider);

                const node = {
                    type: 'herb',
                    harvestType: 'gather',
                    index: herbCount,
                    position: new THREE.Vector3(x, posY, z),
                    hp: 1,
                    maxHp: 1,
                    scale: 1,
                    rotY: Math.random() * Math.PI * 2,
                    collider: collider,
                    wobbleTimer: 0,
                    mesh: herbGroup
                };

                this.nodes.push(node);
                if(!this.items) this.items = [];
                this.items.push({
                     position: node.position.clone(),
                     radius: 2.5,
                     node: node,
                     prompt: 'Coletar Erva [R]',
                     actionKey: 'r',
                     action: () => {
                         if (window.penitent && typeof window.penitent.startHarvesting === 'function') {
                             window.penitent.startHarvesting(node);
                         }
                     }
                });
                herbCount++;
            }
        }


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

            if (closestNode.hp > 0) {
                // Just hit feedback
                if (closestNode.mesh) {
                    closestNode.mesh.scale.set(closestNode.scale * 0.85, closestNode.scale * 0.85, closestNode.scale * 0.85);
                }

                // Small particles
                this.emitParticles(closestNode, 6, 10, position);
            } else {
                // Destroyed - Explicitly remove from scene and dispose geometry/materials
                if (closestNode.mesh) {
                    if (closestNode.mesh.parent) {
                        closestNode.mesh.parent.remove(closestNode.mesh);
                    }
                    this.scene.remove(closestNode.mesh); // Safety

                    // Dispose materials and geometries safely
                    closestNode.mesh.traverse((child) => {
                        if (child.isMesh) {
                            if (child.geometry) child.geometry.dispose();
                            if (child.material) {
                                if (Array.isArray(child.material)) {
                                    child.material.forEach(m => m.dispose());
                                } else {
                                    child.material.dispose();
                                }
                            }
                        }
                    });
                }

                // Big explosion of particles (dust/leaves)
                this.emitParticles(closestNode, 20, 30, closestNode.position);

                // Remove collider to release Raycaster
                const colIdx = this.activeColliders.indexOf(closestNode.collider);
                if (colIdx > -1) {
                    this.activeColliders.splice(colIdx, 1);
                }

                // Remove from interactive arrays if present
                if (window.interactionManager && window.interactionManager.interactiveObjects) {
                     const idx = window.interactionManager.interactiveObjects.findIndex(o => o.mesh === closestNode.mesh);
                     if (idx > -1) window.interactionManager.interactiveObjects.splice(idx, 1);
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
        for (const node of this.nodes) {
            if (node.hp <= 0 || !node.mesh) continue;

            if (node.wobbleTimer > 0) {
                node.wobbleTimer -= delta;
                let currentScale = node.scale;
                if (node.wobbleTimer > 0) {
                    currentScale = node.scale * 0.85;
                } else {
                    node.wobbleTimer = 0;
                }
                node.mesh.scale.set(currentScale, currentScale, currentScale);
            }
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
