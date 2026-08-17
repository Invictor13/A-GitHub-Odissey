const fs = require('fs');

let content = fs.readFileSync('src/world_builder/hub_terrain.js', 'utf8');

content = content.replace(/this\.heightMap = \[\];/, 'this.heightMap = {};');

content = content.replace(/getHeightAt\(x, z\) \{[\s\S]*?return -50; \/\/ Abyss\n    \}/, `getHeightAt(x, z) {
        const gridX = Math.floor(x);
        const gridZ = Math.floor(z);

        if (gridX >= -10 && gridX < 10 && gridZ >= -10 && gridZ < 10) {
            if(this.heightMap[gridX] && typeof this.heightMap[gridX][gridZ] !== 'undefined') {
                 return this.heightMap[gridX][gridZ];
            }
        }
        return -50; // Abyss
    }`);

fs.writeFileSync('src/world_builder/hub_terrain.js', content);
