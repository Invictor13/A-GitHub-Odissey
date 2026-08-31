import * as THREE from 'three';
import { applyWorldCurvature } from '../core/GraphicsUtils.js';

/**
 * Checks if a material is earthy (brownish / dark brown / dirt / rock color).
 * @param {THREE.Material} mat
 * @returns {boolean}
 */
function isEarthyMaterial(mat) {
    if (!mat || !mat.color) return false;
    const color = mat.color;
    // Check hex or RGB components for earthy tones (brown, dirt, dark brown, reddish brown)
    const hex = color.getHex();
    // Common earthy color ranges/hexes in project: #3e2723, #2b1d0c, #5a3825, #291d16, #54381e, #78350f, #2c1d11, etc.
    const r = color.r;
    const g = color.g;
    const b = color.b;

    // Earthy tones generally have r > g, r > b, and g >= b (brownish/dirt) or overall dark tone with r >= g
    const isBrownish = (r > g && g >= b && r < 0.6) || (hex === 0x3e2723 || hex === 0x2b1d0c || hex === 0x5a3825 || hex === 0x291d16 || hex === 0x54381e || hex === 0x2c1d11 || hex === 0x78350f);
    return isBrownish;
}

/**
 * Fixes terrain geometry issues, removes defective central sealing meshes extending above Y = -3.0,
 * recalculates bounding boxes and spheres across island hierarchy to prevent popping/rescaling,
 * and ensures the bottom rocky cone is strictly contained below Y <= -4.0 with dark rock material (#2c1d11) and flatShading.
 *
 * @param {THREE.Scene} scene - The main Three.js scene
 * @param {THREE.Group|THREE.Object3D} [islandGroup] - The root island group (optional)
 */
export function fixTerrainAndBase(scene, islandGroup = null) {
    if (!scene && !islandGroup) return;

    const rootToScan = islandGroup || scene;
    const objectsToRemove = [];

    // 1. Identify and remove any sealing/closing mesh in central region (X: -15 to 15, Z: -15 to 15)
    // with earthy materials that has vertices above Y = -0.1
    rootToScan.traverse((child) => {
        if (!child.isMesh || !child.geometry) return;

        // Skip non-sealing objects or main terrain instanced meshes if needed, but check meshes marked as bottom cone or base sealing
        const isSealingCandidate = child.userData?.isBottomCone ||
            child.userData?.isSealingMesh ||
            child.name === 'bottomCone' ||
            child.name === 'islandBaseCone' ||
            child.name.toLowerCase().includes('seal') ||
            child.name.toLowerCase().includes('base');

        // Check materials
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        const hasEarthyMat = materials.some(m => isEarthyMaterial(m));

        // Evaluate mesh world position or local geometry vertices if candidate or earthy mesh in central area
        if (isSealingCandidate || hasEarthyMat) {
            const worldPos = new THREE.Vector3();
            child.getWorldPosition(worldPos);

            // Check if mesh is centered roughly in X: -15 to 15, Z: -15 to 15
            if (Math.abs(worldPos.x) <= 15 && Math.abs(worldPos.z) <= 15) {
                const posAttr = child.geometry.attributes.position;
                if (posAttr) {
                    let maxVertexY = -Infinity;
                    const v = new THREE.Vector3();

                    for (let i = 0; i < posAttr.count; i++) {
                        v.fromBufferAttribute(posAttr, i);
                        v.applyMatrix4(child.matrixWorld);
                        if (v.y > maxVertexY) maxVertexY = v.y;
                    }

                    // If sealing/base mesh has vertices protruding above Y = -3.0, mark for removal
                    if (maxVertexY > -3.0 && (isSealingCandidate || child.geometry.type === 'ConeGeometry' || child.geometry.type === 'CylinderGeometry')) {
                        objectsToRemove.push(child);
                    }
                }
            }
        }
    });

    // Remove defective meshes and dispose resources
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

    // 2. Ensure bottom rocky cone is strictly contained below Y <= -4.0, with dark rock material (#2c1d11) and flatShading
    const targetParent = islandGroup || scene;
    const darkRockColor = 0x2c1d11; // Dark rock (#2c1d11)

    let bottomCone = null;
    targetParent.traverse((child) => {
        if (child.userData && child.userData.isBottomCone) {
            bottomCone = child;
        } else if (child.name === 'bottomCone' || child.name === 'islandBaseCone') {
            bottomCone = child;
        }
    });

    const coneHeight = 18.0;
    const coneRadius = 16.0;

    if (bottomCone) {
        // Adjust existing bottom cone Y position and material to stay strictly below Y <= -4.0
        // A cone of height 18 inverted (apex pointing down, base at Y_top) placed at Y position
        // Top of inverted cone is at position.y + coneHeight/2.
        // We want top of cone Y_top <= -4.0 -> position.y <= -4.0 - coneHeight/2 = -13.0.
        if (bottomCone.position.y > -13.0) {
            bottomCone.position.y = -13.0;
        }

        if (bottomCone.material) {
            const matList = Array.isArray(bottomCone.material) ? bottomCone.material : [bottomCone.material];
            matList.forEach(mat => {
                mat.wireframe = false;
                mat.color.setHex(darkRockColor);
                mat.flatShading = true;
                mat.needsUpdate = true;
            });
        }
    } else {
        // Create new bottom cone strictly contained below Y <= -0.5
        const darkRockMat = new THREE.MeshStandardMaterial({
            color: darkRockColor,
            roughness: 0.95,
            metalness: 0.1,
            flatShading: true,
            wireframe: false
        });

        try {
            applyWorldCurvature(darkRockMat);
        } catch (e) {
            // GraphicsUtils curvature fallback if needed
        }

        const coneGeo = new THREE.ConeGeometry(coneRadius, coneHeight, 20);

        bottomCone = new THREE.Mesh(coneGeo, darkRockMat);
        bottomCone.rotation.x = Math.PI; // Taper downwards
        // Top surface of this inverted cone is at position.y + (coneHeight / 2) = -13.0 + 9.0 = -4.0
        bottomCone.position.set(0, -13.0, 0);
        bottomCone.receiveShadow = true;
        bottomCone.castShadow = false;
        bottomCone.name = 'bottomCone';
        bottomCone.userData = { isBottomCone: true };

        targetParent.add(bottomCone);
    }

    // 3. Recalculate geometry.computeBoundingBox() and geometry.computeBoundingSphere()
    // on all children of rootToScan to prevent popping / camera rescaling issues
    rootToScan.traverse((child) => {
        if (child.geometry) {
            child.geometry.computeBoundingBox();
            child.geometry.computeBoundingSphere();
        }
    });
}

/**
 * Removes debug wireframe objects and orphan helpers, and ensures base cleanup.
 *
 * @param {THREE.Scene} scene - The main Three.js scene
 * @param {THREE.Group|THREE.Object3D} [islandGroup] - The root island group (optional)
 */
export function cleanupAndSealBase(scene, islandGroup = null) {
    if (!scene) return;

    const rootToScan = scene;
    const objectsToRemove = [];

    // Traverse scene to collect debug wireframes, LineSegments, WireframeGeometries, and helpers
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

    // Run fixTerrainAndBase logic
    fixTerrainAndBase(scene, islandGroup);
}

export default {
    cleanupAndSealBase,
    fixTerrainAndBase
};
