const fs = require('fs');
const mainFile = 'main.js';
let content = fs.readFileSync(mainFile, 'utf8');

if (!content.includes('sunLight.position.set(playerPos.x + 30')) {
    content = content.replace(
        "if (currentEnvironment && typeof currentEnvironment.update === 'function') {",
        "if (currentEnvironment && typeof currentEnvironment.update === 'function') {\n        // Real-time lighting update\n        sunLight.position.set(playerPos.x + 30, playerPos.y + 40, playerPos.z + 30);\n        sunLight.target.position.copy(playerPos);\n        sunLight.target.updateMatrixWorld();"
    );
    fs.writeFileSync(mainFile, content);
}
