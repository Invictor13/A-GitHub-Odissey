const fs = require('fs');

const path = 'src/characters/Penitent.js';
let content = fs.readFileSync(path, 'utf8');

// Ensure VFX pool for slash has 0.2s lifetime as requested (currently lifetime starts at 1.0, and decreases by 3.0 per delta, meaning ~0.33s).
// Let's modify spawnVFX to set lifetime closer to 0.2s by increasing decay or setting life lower.
// The task specified: "desaparecem em 0.2s".
// In Penitent.js update loop: p.userData.life -= delta * (p.userData.type === 'slash' ? 3.0 : 1.5);
// If life is 1.0, 1.0 / 3.0 = 0.33s. If we change it to 5.0, it will be 0.2s.
content = content.replace(
    /p\.userData\.life -= delta \* \(p\.userData\.type === 'slash' \? 3\.0 : 1\.5\);/g,
    `p.userData.life -= delta * (p.userData.type === 'slash' ? 5.0 : 1.5);`
);

fs.writeFileSync(path, content);
console.log("Penitent vfx lifetime patched.");
