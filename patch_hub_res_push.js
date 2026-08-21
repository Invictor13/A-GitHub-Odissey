const fs = require('fs');
let code = fs.readFileSync('src/world_builder/hub_resources.js', 'utf8');
code = code.replace(/this\.items\.push\(\{/g, 'if(!this.items) this.items = [];\n                this.items.push({');
fs.writeFileSync('src/world_builder/hub_resources.js', code);
