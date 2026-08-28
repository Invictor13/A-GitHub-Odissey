import * as THREE from 'three';
import { applyWorldCurvature } from '../core/GraphicsUtils.js';

/**
 * Removes debug wireframe objects and orphan helpers, and ensures the bottom portion
 * of the island base uses a solid dark brown rocky cone with flat shading.
 *
 * @param {THREE.Scene} scene - The main Three.js scene
 * @param {THREE.Group|THREE.Object3D} [islandGroup] - The root island group (optional)
 */
export function cleanupAndSealBase(scene, islandGroup = null) {
    if (!scene) return;

    const rootToScan = scene;
    const objectsToRemove = [];

    // 1. Traverse scene to collect debug wireframes, LineSegments, WireframeGeometries, and helpers
    rootToScan.traverse((child) => {
        if (child === scene || child === islandGroup) return;

        let isDebugOrWireframe = false;

        // Check for LineSegments or Line debug geometries
        if (child.isLineSegments || child instanceof THREE.LineSegments || child.isLine || child instanceof THREE.Line) {
            isDebugOrWireframe = true;
        }

        // Check for WireframeGeometry
        if (child.geometry && (child.geometry instanceof THREE.WireframeGeometry || child.geometry.type === 'WireframeGeometry')) {
            isDebugOrWireframe = true;
        }

        // Check for debug helpers (GridHelper, AxesHelper, BoxHelper, etc.)
        if (child.isHelper || (child.type && child.type.endsWith('Helper'))) {
            isDebugOrWireframe = true;
        }

        // Check for material with wireframe enabled
        if (child.material) {
            if (Array.isArray(child.material)) {
                if (child.material.some(m => m && m.wireframe === true)) {
                    isDebugOrWireframe = true;
                }
            } else if (child.material.wireframe === true) {
                isDebugOrWireframe = true;
            }
        }

        // Check userData flags or debug names
        if (child.userData && (child.userData.isDebug || child.userData.isHelper || child.userData.isWireframe)) {
            isDebugOrWireframe = true;
        }

        if (isDebugOrWireframe) {
            // Protect preview cursors if active during build mode, unless explicitly orphan
            if (child.name === 'buildCursor' || child.userData?.isCursor) {
                return;
            }
            objectsToRemove.push(child);
        }
    });

    // Remove collected debug/wireframe objects and free resources
    objectsToRemove.forEach((obj) => {
        if (obj.geometry) {
            obj.geometry.dispose();
        }
        if (obj.material) {
            if (Array.isArray(obj.material)) {
                obj.material.forEach(m => m && m.dispose());
            } else {
                obj.material.dispose();
            }
        }
        if (obj.parent) {
            obj.parent.remove(obj);
        }
    });

    // 2. Ensure solid dark brown base cone (#3e2723 / #2b1d0c) with flatShading
    const targetParent = islandGroup || scene;
    const darkBrownColor = 0x3e2723; // Dark brown (#3e2723)

    let bottomCone = null;

    // Search for existing bottom cone inside targetParent
    targetParent.traverse((child) => {
        if (child.userData && child.userData.isBottomCone) {
            bottomCone = child;
        } else if (child.name === 'bottomCone' || child.name === 'islandBaseCone') {
            bottomCone = child;
        }
    });

    if (bottomCone) {
        // Ensure existing bottom cone material uses solid dark brown with flatShading
        if (bottomCone.material) {
            const matList = Array.isArray(bottomCone.material) ? bottomCone.material : [bottomCone.material];
            matList.forEach(mat => {
                mat.wireframe = false;
                mat.color.setHex(darkBrownColor);
                mat.flatShading = true;
                mat.needsUpdate = true;
            });
        }
    } else {
        // Create solid dark brown bottom cone
        const darkBrownMat = new THREE.MeshStandardMaterial({
            color: darkBrownColor,
            roughness: 0.9,
            metalness: 0.1,
            flatShading: true,
            wireframe: false
        });

        try {
            applyWorldCurvature(darkBrownMat);
        } catch (e) {
            // GraphicsUtils curvature fallback if needed
        }

        const coneRadius = 16.0;
        const coneHeight = 18.0;
        const coneGeo = new THREE.ConeGeometry(coneRadius, coneHeight, 20);

        const newBottomCone = new THREE.Mesh(coneGeo, darkBrownMat);
        newBottomCone.rotation.x = Math.PI; // Taper downwards
        newBottomCone.position.set(0, -9.0, 0);
        newBottomCone.receiveShadow = true;
        newBottomCone.castShadow = false;
        newBottomCone.name = 'bottomCone';
        newBottomCone.userData = { isBottomCone: true };

        targetParent.add(newBottomCone);
    }
}

export default cleanupAndSealBase;
