const fs = require('fs');
const file = 'src/world_builder/ProceduralMap.js';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('waterUniforms = { uTime')) {
    content = content.replace('this.grassUniforms = { uTime: { value: 0 }, uPlayerPos: { value: new THREE.Vector3(999,999,999) } };',
        'this.grassUniforms = { uTime: { value: 0 }, uPlayerPos: { value: new THREE.Vector3(999,999,999) } };\n        this.waterUniforms = { uTime: { value: 0 }, uPlayerPos: { value: new THREE.Vector3(999,999,999) } };');
    content = content.replace('this.grassUniforms.uPlayerPos.value.copy(targetPos);',
        'this.grassUniforms.uPlayerPos.value.copy(targetPos);\n        this.waterUniforms.uTime.value = time;\n        this.waterUniforms.uPlayerPos.value.copy(targetPos);');
    fs.writeFileSync(file, content);
}
