import * as THREE from 'three';
import { inventoryManager } from '../systems/InventoryManager.js';
import { applyWorldCurvature } from '../core/GraphicsUtils.js';

export class HubResources {
    constructor(scene, terrain) {
        this.scene = scene;
        this.terrain = terrain;

        this.group = new THREE.Group();
        this.scene.add(this.group);

        this.nodes = [];
        this.colliders = [];
        this.activeColliders = [];

        this.dummy = new THREE.Object3D();

        // Standard Geometry and Materials
        this.pineGeo = new THREE.ConeGeometry(1.2, 2.5, 6); this.pineGeo.translate(0, 1.25, 0);
        this.oakGeo = new THREE.DodecahedronGeometry(1.5, 0); this.oakGeo.translate(0, 1.5, 0);
        this.trunkGeo = new THREE.CylinderGeometry(0.2, 0.3, 1, 5); this.trunkGeo.translate(0, 0.5, 0);

        this.mWood = new THREE.MeshLambertMaterial({ color: 0x78350f, roughness: 0.9, flatShading: true });
        this.mLeavesPine = new THREE.MeshLambertMaterial({ color: 0x064e3b, roughness: 0.9, flatShading: true });
        this.mLeavesOak = new THREE.MeshLambertMaterial({ color: 0x15803d, roughness: 0.9, flatShading: true });

        applyWorldCurvature(this.mWood, false, false);
        applyWorldCurvature(this.mLeavesPine, true, false);
        applyWorldCurvature(this.mLeavesOak, true, false);

        this.rockGeo = new THREE.DodecahedronGeometry(0.7, 1);
        this.mRock = new THREE.MeshLambertMaterial({ color: 0x475569, roughness: 0.9, flatShading: true });
        applyWorldCurvature(this.mRock, false, false);

        this.grassTuftGeo = new THREE.ConeGeometry(0.15, 0.45, 3); this.grassTuftGeo.translate(0, 0.225, 0);
        this.mGrassTuft = new THREE.MeshLambertMaterial({ color: 0x16a34a, roughness: 0.9, flatShading: true, side: THREE.DoubleSide });
        applyWorldCurvature(this.mGrassTuft, true, false);

        this.buildParticleSystem();
        this.spawnResources();
    }

    buildParticleSystem() {
        const pGeo = new THREE.BoxGeometry(0.1, 0.1, 0.1);
        const pMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
        applyWorldCurvature(pMat, false, false);

        this.particleMesh = new THREE.InstancedMesh(pGeo, pMat, 200);
        this.particleMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        this.group.add(this.particleMesh);

        this.particles = [];
        this.nextParticleIdx = 0;

        for (let i = 0; i < 200; i++) {
            this.particles.push({ active: false, pos: new THREE.Vector3(), vel: new THREE.Vector3(), life: 0, maxLife: 1, color: new THREE.Color() });
            this.dummy.scale.set(0, 0, 0);
            this.dummy.updateMatrix();
            this.particleMesh.setMatrixAt(i, this.dummy.matrix);
            this.particleMesh.setColorAt(i, new THREE.Color(0xffffff));
        }
        this.particleMesh.instanceMatrix.needsUpdate = true;
        if (this.particleMesh.instanceColor) this.particleMesh.instanceColor.needsUpdate = true;
    }

    spawnResources() {
        this.floraPools = {
            'grass': { mesh: null, count: 0, capacity: 6000, idToKey: [], geo: this.grassTuftGeo, mat: this.mGrassTuft }
        };

        Object.keys(this.floraPools).forEach(type => {
            const pool = this.floraPools[type];
            pool.mesh = new THREE.InstancedMesh(pool.geo, pool.mat, pool.capacity);
            pool.mesh.castShadow = true; pool.mesh.receiveShadow = false;
            const zeroMat = new THREE.Matrix4().makeScale(0,0,0);
            for(let i=0; i<pool.capacity; i++) pool.mesh.setMatrixAt(i, zeroMat);
            this.group.add(pool.mesh);
        });

        let treeCount = 0;
        let rockCount = 0;

        if (!this.terrain || !this.terrain.worldGrid) return;

        this.terrain.worldGrid.forEach((val, key) => {
            const [x, y, z] = key.split(',').map(Number);

            // Safety: Only spawn flora on the absolute surface
            if (this.terrain.worldGrid.has(`${x},${y + 1},${z}`)) return;
            if (val.type !== 'grass' && val.type !== 'rock') return;
            if (Math.hypot(x, z) < 6) return; // Keep center clear for player spawn

            const r = Math.random();
            if (r < 0.05) { // Trees
                const tree = new THREE.Group(); tree.position.set(x, y + 1, z);
                const trunk = new THREE.Mesh(this.trunkGeo, this.mWood); trunk.castShadow = true; tree.add(trunk);

                const isPine = Math.random() > 0.5;
                const leaves = new THREE.Mesh(isPine ? this.pineGeo : this.oakGeo, isPine ? this.mLeavesPine : this.mLeavesOak);
                leaves.position.y = 0.8; leaves.castShadow = true;
                if(isPine) {
                    const l2 = new THREE.Mesh(this.pineGeo, this.mLeavesPine); l2.position.y = 1.6; l2.scale.setScalar(0.8); l2.castShadow = true; tree.add(l2);
                }
                tree.add(leaves); tree.rotation.y = Math.random() * Math.PI;

                // Invisible Hitbox for Raycasting
                const hitBox = new THREE.Mesh(new THREE.BoxGeometry(1.5, 3, 1.5), new THREE.MeshBasicMaterial({visible:false}));
                hitBox.position.y = 1.5; hitBox.userData.isHitBox = true; tree.add(hitBox);

                tree.userData = { isTree: true, hp: 3 };
                this.group.add(tree);

                const node = {
                    type: 'tree',
                    index: treeCount++,
                    position: tree.position.clone(),
                    hp: 3,
                    maxHp: 3,
                    scale: 1,
                    rotY: tree.rotation.y,
                    mesh: tree
                };
                this.nodes.push(node);
                const collider = new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(x, y + 1.5, z), new THREE.Vector3(0.8, 4, 0.8));
                node.collider = collider; this.activeColliders.push(collider);

            } else if (r > 0.05 && r < 0.08 && val.type === 'grass') { // Rocks
                const boulder = new THREE.Group(); boulder.position.set(x, y + 1, z);
                const rockMesh = new THREE.Mesh(this.rockGeo, this.mRock);
                rockMesh.position.y = 0.4; rockMesh.castShadow = true; boulder.add(rockMesh);

                const hitBox = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.5, 1.5), new THREE.MeshBasicMaterial({visible:false}));
                hitBox.position.y = 0.7; hitBox.userData.isHitBox = true; boulder.add(hitBox);

                boulder.userData = { isBoulder: true, hp: 3 };
                this.group.add(boulder);

                const node = {
                    type: 'rock',
                    index: rockCount++,
                    position: boulder.position.clone(),
                    hp: 3,
                    maxHp: 3,
                    scale: 1,
                    rotY: boulder.rotation.y,
                    mesh: boulder
                };
                this.nodes.push(node);
                const collider = new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(x, y + 1.4, z), new THREE.Vector3(1.2, 0.8, 1.2));
                node.collider = collider; this.activeColliders.push(collider);

            } else if (r > 0.1 && r < 0.4 && val.type === 'grass') { // Triangular 3D Grass
                const pool = this.floraPools['grass'];
                if(pool.count < pool.capacity) {
                    const mat = new THREE.Matrix4();
                    mat.makeTranslation(x + (Math.random()-0.5)*0.7, y + 1, z + (Math.random()-0.5)*0.7);
                    mat.multiply(new THREE.Matrix4().makeRotationY(Math.random() * Math.PI));
                    mat.scale(new THREE.Vector3(1, 0.6 + Math.random()*0.8, 1));
                    pool.mesh.setMatrixAt(pool.count, mat);
                    pool.count++;
                }
            }
        });

        Object.keys(this.floraPools).forEach(type => {
            const pool = this.floraPools[type];
            pool.mesh.count = pool.count;
            pool.mesh.instanceMatrix.needsUpdate = true;
        });

        // Spawn Herbs
        let herbCount = 0;
        for (let i = 0; i < 15; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = 5 + Math.random() * 12;
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

                if (posY <= 0) continue;

                // Herb Geometry
                const herbGeo = new THREE.CylinderGeometry(0, 0.1, 0.4, 4);
                const herbMat = new THREE.MeshLambertMaterial({ color: 0x22c55e }); // Green
                applyWorldCurvature(herbMat, true, false);

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

            this.dummy.position.copy(closestNode.position);
            this.dummy.rotation.set(0, closestNode.rotY, 0);

            if (closestNode.hp > 0) {
                // Just hit feedback
                closestNode.mesh.scale.setScalar(closestNode.scale * 0.85);

                // Small particles
                this.emitParticles(closestNode, 6, 10, position);
            } else {
                // Destroyed

                // Big explosion of particles (dust/leaves)
                this.emitParticles(closestNode, 20, 30, closestNode.position);

                // Full removal
                this.destroyNode(closestNode);

                // Grant resources and XP
                this.distributeLoot(closestNode);
            }
        }
    }

    destroyNode(node) {
        if (node.mesh) {
            // Remove from scene/group
            if (node.mesh.parent) {
                node.mesh.parent.remove(node.mesh);
            }

            // Dispose geometry and materials
            node.mesh.traverse((child) => {
                if (child.isMesh) {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) {
                        if (Array.isArray(child.material)) {
                            child.material.forEach(mat => mat.dispose());
                        } else {
                            child.material.dispose();
                        }
                    }
                }
            });
        }

        // Remove collider
        const colIdx = this.activeColliders.indexOf(node.collider);
        if (colIdx > -1) {
            this.activeColliders.splice(colIdx, 1);
        }

        // Remove from nodes array
        const nodeIdx = this.nodes.indexOf(node);
        if (nodeIdx > -1) {
            this.nodes.splice(nodeIdx, 1);
        }

        // Remove from global interactive items if it's an herb/interactable
        if (this.items) {
             const itemIdx = this.items.findIndex(item => item.node === node);
             if (itemIdx > -1) {
                 this.items.splice(itemIdx, 1);
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
            if (node.hp <= 0) continue;

            if (node.wobbleTimer > 0) {
                node.wobbleTimer -= delta;
                let currentScale = node.scale;
                if (node.wobbleTimer > 0) {
                    currentScale = node.scale * 0.85;
                } else {
                    node.wobbleTimer = 0;
                }
                if (node.mesh) {
                    node.mesh.scale.setScalar(currentScale);
                }
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
