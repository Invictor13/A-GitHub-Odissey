const fs = require('fs');
let content = fs.readFileSync('src/world_builder/HubEnvironment.js', 'utf8');

// There are two 'if (this.terrain) this.terrain.update(time);', remove the second one.
content = content.replace(/this\.animateCampfireAndVegetation\(delta, time\);\n        if \(this\.terrain\) this\.terrain\.update\(time\);/, 'this.animateCampfireAndVegetation(delta, time);');

fs.writeFileSync('src/world_builder/HubEnvironment.js', content);
