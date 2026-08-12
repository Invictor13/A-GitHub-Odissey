const fs = require('fs');
let content = fs.readFileSync('src/world_builder/ProceduralMap.js', 'utf8');
content = content.replace('this.setupWeather(); // Dark blue sky, earthy green ground\n        this.scene.add(this.hemisphereLight);', 'this.scene.add(this.hemisphereLight);\n        this.setupWeather();');
fs.writeFileSync('src/world_builder/ProceduralMap.js', content);
