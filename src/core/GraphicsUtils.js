import * as THREE from 'three';
import CurvatureEffect from '../shaders/CurvatureEffect.js';

export const globalUniforms = {
    uTime: { value: 0 },
    uPlayerPos: CurvatureEffect.uniforms.uPlayerPos
};

export function applyWorldCurvature(material, isVegetation = false, isWater = false) {
    CurvatureEffect.applyCurvature(material);

    if (isVegetation || isWater) {
        const previousOnBeforeCompile = material.onBeforeCompile;
        material.onBeforeCompile = (shader, renderer) => {
            if (typeof previousOnBeforeCompile === 'function') {
                previousOnBeforeCompile(shader, renderer);
            }
            shader.uniforms.uTime = globalUniforms.uTime;

            if ((isVegetation || isWater) && !shader.vertexShader.includes('uTime')) {
                shader.vertexShader = `uniform float uTime;\n` + shader.vertexShader;
            }

            if (isVegetation && !shader.vertexShader.includes('swayHeight')) {
                shader.vertexShader = shader.vertexShader.replace(
                    '#include <begin_vertex>',
                    `
                    #include <begin_vertex>
                    float swayHeight = max(0.0, position.y);
                    float wind = sin(uTime * 3.0 + position.x * 0.5 + position.z * 0.5) * 0.12 * swayHeight;
                    transformed.x += wind;
                    transformed.z += wind;
                    `
                );
            }

            if (isWater && !shader.vertexShader.includes('wave')) {
                shader.vertexShader = shader.vertexShader.replace(
                    '#include <begin_vertex>',
                    `
                    #include <begin_vertex>
                    {
                        #ifdef USE_INSTANCING
                            vec4 wPos = modelMatrix * instanceMatrix * vec4( position, 1.0 );
                        #else
                            vec4 wPos = modelMatrix * vec4( position, 1.0 );
                        #endif
                        float wave = sin(uTime * 2.5 + wPos.x * 0.8 + wPos.z * 0.8) * 0.08 + cos(uTime * 1.8 + wPos.x * 0.5 - wPos.z * 0.5) * 0.05;
                        transformed.y += wave;
                    }
                    `
                );
            }
        };
        material.needsUpdate = true;
    }
}

export function disposeHierarchy(node) {
    if (!node) return;

    node.traverse((child) => {
        if (child.isMesh) {
            if (child.geometry) {
                child.geometry.dispose();
            }

            if (child.material) {
                const materials = Array.isArray(child.material) ? child.material : [child.material];

                for (const material of materials) {
                    if (!material) continue;

                    // Dispose textures
                    for (const key in material) {
                        const value = material[key];
                        if (value && (key.endsWith('Map') || value instanceof THREE.Texture)) {
                            value.dispose();
                        }
                    }

                    // Dispose material
                    material.dispose();
                }
            }
        }
    });
}
