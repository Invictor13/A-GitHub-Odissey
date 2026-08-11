const fs = require('fs');

const file = 'src/world_builder/ProceduralMap.js';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('sunLight')) {
    // Modify update loop to alter sunlight intensity or color slightly if raining
    content = content.replace('// Update Weather',
        `// Update Weather\n        const sunLight = this.scene.children.find(c => c.type === 'DirectionalLight' && c.color.getHex() === 0xffedd5);\n        if (sunLight && this.weatherType === 'RAIN') {\n            sunLight.intensity = 0.5;\n        } else if (sunLight) {\n            sunLight.intensity = 1.6;\n        }`);

    fs.writeFileSync(file, content);
}
