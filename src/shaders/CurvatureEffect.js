import * as THREE from 'three';

export const CurvatureEffect = {
    uniforms: {
        uCurvature: { value: 0.0015 },
        uPlayerPos: { value: new THREE.Vector3(0, 0, 0) }
    },

    /**
     * Applies curvature vertex shader modifications to a given material, mesh, or group.
     * Compatible with MeshStandardMaterial, MeshLambertMaterial, and InstancedMesh.
     * @param {THREE.Material|THREE.Object3D|Array} target
     */
    applyCurvature(target) {
        if (!target) return;

        if (target.isObject3D || target.isMesh || target.isGroup) {
            target.traverse((child) => {
                if (child.isMesh && child.material) {
                    const materials = Array.isArray(child.material) ? child.material : [child.material];
                    materials.forEach((mat) => this._applyToMaterial(mat));
                }
            });
            return;
        }

        if (Array.isArray(target)) {
            target.forEach((mat) => this._applyToMaterial(mat));
            return;
        }

        this._applyToMaterial(target);
    },

    _applyToMaterial(material) {
        if (!material || typeof material !== 'object') return;

        // Prevent double applying to the same material instance
        if (material.userData && material.userData.hasCurvatureEffect) return;
        if (!material.userData) material.userData = {};
        material.userData.hasCurvatureEffect = true;

        const previousOnBeforeCompile = material.onBeforeCompile;

        material.onBeforeCompile = (shader, renderer) => {
            if (typeof previousOnBeforeCompile === 'function') {
                previousOnBeforeCompile(shader, renderer);
            }

            shader.uniforms.uCurvature = CurvatureEffect.uniforms.uCurvature;
            shader.uniforms.uPlayerPos = CurvatureEffect.uniforms.uPlayerPos;

            if (!shader.vertexShader.includes('uCurvature')) {
                shader.vertexShader = `
uniform float uCurvature;
uniform vec3 uPlayerPos;
` + shader.vertexShader;

                shader.vertexShader = shader.vertexShader.replace(
                    '#include <begin_vertex>',
                    `
                    #include <begin_vertex>
                    {
                        #ifdef USE_INSTANCING
                            vec4 worldPosition = modelMatrix * instanceMatrix * vec4( position, 1.0 );
                        #else
                            vec4 worldPosition = modelMatrix * vec4( position, 1.0 );
                        #endif
                        float dist = length(worldPosition.xz - uPlayerPos.xz);
                        transformed.y -= dist * dist * uCurvature;
                    }
                    `
                );
            }
        };

        material.needsUpdate = true;
    },

    /**
     * Updates curvature uniforms per frame.
     * @param {THREE.Object3D|THREE.Scene} scene - The root scene or object (optional traversal)
     * @param {THREE.Vector3|Object} playerPosition - Player position vector
     * @param {number} [curvatureFactor] - Curvature factor
     */
    updateCurvatureUniforms(scene, playerPosition, curvatureFactor) {
        if (curvatureFactor !== undefined && curvatureFactor !== null) {
            CurvatureEffect.uniforms.uCurvature.value = curvatureFactor;
        }

        if (playerPosition) {
            if (typeof playerPosition.copy === 'function') {
                CurvatureEffect.uniforms.uPlayerPos.value.copy(playerPosition);
            } else if (typeof playerPosition.x === 'number') {
                CurvatureEffect.uniforms.uPlayerPos.value.set(
                    playerPosition.x,
                    playerPosition.y || 0,
                    playerPosition.z || 0
                );
            }
        }

        if (scene && typeof scene.traverse === 'function') {
            scene.traverse((child) => {
                if (child.isMesh && child.material) {
                    const materials = Array.isArray(child.material) ? child.material : [child.material];
                    materials.forEach((mat) => {
                        if (mat && mat.userData && !mat.userData.hasCurvatureEffect) {
                            CurvatureEffect._applyToMaterial(mat);
                        }
                    });
                }
            });
        }
    }
};

export default CurvatureEffect;
