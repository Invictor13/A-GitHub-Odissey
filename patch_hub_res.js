const fs = require('fs');
let code = fs.readFileSync('src/world_builder/hub_resources.js', 'utf8');
code = code.replace(/terrainRef/g, 'this.terrain');
fs.writeFileSync('src/world_builder/hub_resources.js', code);
