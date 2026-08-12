import * as THREE from 'three';

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
