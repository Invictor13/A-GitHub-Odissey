const fs = require('fs');
let content = fs.readFileSync('src/world_builder/HubEnvironment.js', 'utf8');
content = content.replace(/this\.updateDayNightLighting\(delta\);\n        this\.updateWeatherSimulation\(delta, time\);/, 'this.updateDayNightLighting(delta);\n        this.updateWeatherSimulation(delta, time);\n        if (this.terrain) this.terrain.update(time);');

fs.writeFileSync('src/world_builder/HubEnvironment.js', content);
