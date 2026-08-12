const fs = require('fs');

const biomeBaseFile = 'src/world_builder/biomes/BiomeBase.js';
let content = fs.readFileSync(biomeBaseFile, 'utf8');

// Add water uniforms and helper method to BiomeBase
if (!content.includes('getWaterMaterial')) {
    content = content.replace('setupMaterials() {}',
        `setupMaterials() {}\n\n    getWaterMaterial(baseColorHex) {\n        const mat = new THREE.MeshStandardMaterial({ color: baseColorHex, transparent: true, opacity: 0.85, roughness: 0.1, metalness: 0.1, flatShading: true, depthWrite: false });\n        mat.onBeforeCompile = (shader) => {\n            shader.uniforms.uTime = this.map.waterUniforms ? this.map.waterUniforms.uTime : { value: 0 };\n            shader.uniforms.uPlayerPos = this.map.waterUniforms ? this.map.waterUniforms.uPlayerPos : { value: new THREE.Vector3() };\n            shader.vertexShader = \`\n                uniform float uTime;\n                uniform vec3 uPlayerPos;\n                \${shader.vertexShader}\n            \`;\n            shader.vertexShader = shader.vertexShader.replace(\n                '#include <begin_vertex>',\n                \`\n                #include <begin_vertex>\n                vec4 worldPosition = modelMatrix * vec4(position, 1.0);\n                float wave = sin(worldPosition.x * 2.0 + uTime * 2.0) * 0.05 + cos(worldPosition.z * 2.0 + uTime * 1.5) * 0.05;\n                float dist = distance(worldPosition.xyz, uPlayerPos);\n                float ripple = 0.0;\n                if (dist < 3.0) {\n                    ripple = sin(dist * 10.0 - uTime * 5.0) * 0.1 * (1.0 - dist / 3.0);\n                }\n                transformed.y += wave + ripple;\n                \`\n            );\n        };\n        return mat;\n    }`);
    fs.writeFileSync(biomeBaseFile, content);
}
