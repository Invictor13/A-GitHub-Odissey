import * as THREE from 'three';
import CurvatureEffect from '../shaders/CurvatureEffect.js';

export class BridgePrefab {
    constructor(scene, startPos, endPos, dockSide = 'north') {
        this.scene = scene;
        this.startPos = startPos.clone();
        this.endPos = endPos.clone();
        this.dockSide = dockSide;

        this.group = new THREE.Group();
        this.scene.add(this.group);

        this.assemblyProgress = 0;
        this.isBuilt = false;
        this.buildDuration = 1.5; // seconds
        this.buildTimer = 0;

        this.planks = [];
        this.triggerBox = new THREE.Box3();

        this.initBridgeMesh();
        CurvatureEffect.applyCurvature(this.group);
    }

    initBridgeMesh() {
        const distance = this.startPos.distanceTo(this.endPos);
        const direction = new THREE.Vector3().subVectors(this.endPos, this.startPos).normalize();

        const bridgeWidth = 4.0;
        const plankCount = Math.floor(distance / 1.2);
        const plankGeo = new THREE.BoxGeometry(bridgeWidth, 0.4, 1.0);
        const plankMat = new THREE.MeshStandardMaterial({
            color: 0x78350f,
            roughness: 0.85,
            flatShading: true
        });

        // Calculate rotation angle around Y axis
        const angle = Math.atan2(direction.x, direction.z);

        for (let i = 0; i < plankCount; i++) {
            const t = (i + 0.5) / plankCount;
            const pos = new THREE.Vector3().lerpVectors(this.startPos, this.endPos, t);

            const plankMesh = new THREE.Mesh(plankGeo, plankMat);
            plankMesh.position.copy(pos);
            plankMesh.rotation.y = angle;
            plankMesh.castShadow = true;
            plankMesh.receiveShadow = true;

            // Target Y and scale for animation
            plankMesh.userData = {
                targetY: pos.y,
                initialY: pos.y - 10,
                delay: t * 0.8
            };

            plankMesh.position.y = plankMesh.userData.initialY;
            plankMesh.scale.set(0.001, 0.001, 0.001);

            this.group.add(plankMesh);
            this.planks.push(plankMesh);
        }

        // Side Ropes / Posts
        const postGeo = new THREE.CylinderGeometry(0.1, 0.1, 1.2, 6);
        const postMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.9 });

        const postLeft = new THREE.Mesh(postGeo, postMat);
        const postRight = new THREE.Mesh(postGeo, postMat);
        postLeft.position.copy(this.startPos).add(new THREE.Vector3(-1.8 * Math.cos(angle), 0.6, 1.8 * Math.sin(angle)));
        postRight.position.copy(this.startPos).add(new THREE.Vector3(1.8 * Math.cos(angle), 0.6, -1.8 * Math.sin(angle)));
        this.group.add(postLeft);
        this.group.add(postRight);

        // Setup bridge area box (for floor height check, NOT obstacle collision)
        const minX = Math.min(this.startPos.x, this.endPos.x) - bridgeWidth / 2;
        const maxX = Math.max(this.startPos.x, this.endPos.x) + bridgeWidth / 2;
        const minZ = Math.min(this.startPos.z, this.endPos.z) - bridgeWidth / 2;
        const maxZ = Math.max(this.startPos.z, this.endPos.z) + bridgeWidth / 2;

        this.bridgeBounds = new THREE.Box3(
            new THREE.Vector3(minX, Math.min(this.startPos.y, this.endPos.y) - 2.0, minZ),
            new THREE.Vector3(maxX, Math.max(this.startPos.y, this.endPos.y) + 3.0, maxZ)
        );

        // Setup wake trigger threshold box near satellite end of bridge
        const triggerCenter = new THREE.Vector3().lerpVectors(this.startPos, this.endPos, 0.7);
        this.triggerBox = new THREE.Box3(
            new THREE.Vector3(triggerCenter.x - 6, triggerCenter.y - 2, triggerCenter.z - 6),
            new THREE.Vector3(triggerCenter.x + 6, triggerCenter.y + 4, triggerCenter.z + 6)
        );
    }

    update(delta) {
        if (!this.isBuilt) {
            this.buildTimer += delta;
            this.assemblyProgress = Math.min(1.0, this.buildTimer / this.buildDuration);

            this.planks.forEach(plank => {
                const p = Math.max(0, Math.min(1, (this.assemblyProgress - plank.userData.delay) / 0.2));
                const ease = 1 - Math.pow(1 - p, 3);
                plank.position.y = THREE.MathUtils.lerp(plank.userData.initialY, plank.userData.targetY, ease);
                plank.scale.set(ease, ease, ease);
            });

            if (this.assemblyProgress >= 1.0) {
                this.isBuilt = true;
            }
        }
    }

    isPointOnBridge(pos) {
        if (!pos || !this.isBuilt) return false;
        return this.bridgeBounds.containsPoint(pos);
    }

    getFloorY(pos) {
        return this.startPos.y + 0.2;
    }

    getColliders() {
        // Walkway is clear so player can walk across. Return empty array for obstacle colliders.
        return [];
    }

    checkTrigger(playerPos) {
        if (!playerPos || !this.isBuilt) return false;
        return this.triggerBox.containsPoint(playerPos);
    }

    destroy() {
        if (this.group) {
            this.scene.remove(this.group);
            this.group.traverse(child => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
                    else child.material.dispose();
                }
            });
        }
    }
}
