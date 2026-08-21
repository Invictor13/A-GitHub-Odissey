const fs = require('fs');
let code = fs.readFileSync('src/world_builder/hub_resources.js', 'utf8');
code = code.replace(/this\.hubGroup\.add\(herbGroup\);/g, 'this.group.add(herbGroup);');
fs.writeFileSync('src/world_builder/hub_resources.js', code);
