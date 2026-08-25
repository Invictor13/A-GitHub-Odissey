import * as THREE from 'three';

export const globalUniforms = {
    uTime: { value: 0 },
    uPlayerPos: { value: new THREE.Vector3(0, 0, 0) }
};

export function applyWorldCurvature(material, isVegetation = false, isWater = false) {
    material.onBeforeCompile = (shader) => {
        shader.uniforms.uTime = globalUniforms.uTime;
        shader.uniforms.uPlayerPos = globalUniforms.uPlayerPos;
        shader.vertexShader = `
            uniform float uTime;
            uniform vec3 uPlayerPos;
            varying vec3 vWorldPos;
            ${shader.vertexShader}
        `.replace(
            '#include <project_vertex>',
            `
            vec4 mvPosition = vec4( transformed, 1.0 );
            #ifdef USE_INSTANCING
                mvPosition = instanceMatrix * mvPosition;
            #endif

            vec4 acWorldPos = modelMatrix * mvPosition;
            vWorldPos = acWorldPos.xyz;

            ${isVegetation ? `
                // WIND AND PLAYER INTERACTION (BENDS AWAY)
                float swayHeight = max(0.0, transformed.y);
                float wind = sin(uTime * 3.0 + acWorldPos.x * 0.5 + acWorldPos.z * 0.5) * 0.12 * swayHeight;
                acWorldPos.x += wind;
                acWorldPos.z += wind;

                float pDist = distance(acWorldPos.xz, uPlayerPos.xz);
                if(pDist < 1.5 && swayHeight > 0.0) {
                    vec2 push = normalize(acWorldPos.xz - uPlayerPos.xz) * (1.5 - pDist) * 0.6 * swayHeight;
                    acWorldPos.x += push.x;
                    acWorldPos.z += push.y;
                }
            ` : ''}

            ${isWater ? `
                // WATER WAVES
                float wave = sin(uTime * 2.0 + acWorldPos.x * 1.5 + acWorldPos.z * 1.5) * 0.06;
                acWorldPos.y += wave;
            ` : ''}

            // ANIMAL CROSSING HORIZON CURVATURE
            float distX = acWorldPos.x - cameraPosition.x;
            float distZ = acWorldPos.z - cameraPosition.z;
            float distSq = (distX * distX) + (distZ * distZ);
            acWorldPos.y -= distSq * 0.0015; // Curve downwards away from camera

            mvPosition = viewMatrix * acWorldPos;
            gl_Position = projectionMatrix * mvPosition;
            `
        );

        // Override world position to avoid shadow mapping conflicts
        shader.vertexShader = shader.vertexShader.replace(
            '#include <worldpos_vertex>',
            `
            #if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP )
                vec4 worldPosition = acWorldPos;
            #endif
            `
        );
    };
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
