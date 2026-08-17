const fs = require('fs');

let content = fs.readFileSync('src/world_builder/HubEnvironment.js', 'utf8');

// There are a lot of methods remaining at the end (like setupGridSystem, triggerIslandExpansion, instantiatePlacedStructure, startGridPlacement, etc.)
// Let's remove them to clean up the code.

content = content.replace(/setupGridSystem\(\) \{[\s\S]*?triggerIslandExpansion\(/, `setupGridSystem() {} \n\n    triggerIslandExpansion(`);
content = content.replace(/triggerIslandExpansion\(level, animate = true\) \{[\s\S]*?animateCampfireAndVegetation/, `animateCampfireAndVegetation`);

fs.writeFileSync('src/world_builder/HubEnvironment.js', content);
