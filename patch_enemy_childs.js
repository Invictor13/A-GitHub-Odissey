const fs = require('fs');

const files = [
    'src/characters/enemies/Goblin.js',
    'src/characters/enemies/Skeleton.js',
    'src/characters/enemies/Slime.js',
    'src/characters/enemies/Lizardman.js',
    'src/characters/enemies/Kobold.js'
];

for (const path of files) {
    let content = fs.readFileSync(path, 'utf8');

    // Make sure we stop update if in hitstop (checked in base update)
    // The trick is that if base class update returns an indicator (e.g., hitstop), we should return.
    // However, JS doesn't return from the caller. We can just check hitstopTimer ourselves.

    // Add hitstop check right at the beginning of update, after isDead.
    content = content.replace(
        /update\(delta, playerContext, getFloorFunc, checkCollisionFunc\) \{\n        if \(this\.isDead\) return;/g,
        'update(delta, playerContext, getFloorFunc, checkCollisionFunc) {\n        if (this.isDead) return;\n        if (this.hitstopTimer > 0) {\n            super.update(delta, playerContext, getFloorFunc, checkCollisionFunc);\n            return;\n        }'
    );

    // Also adjust attack radius where applicable (dist < x.x)
    content = content.replace(/dist < 2\.0/g, 'dist < 1.2');
    content = content.replace(/dist < 2\.5/g, 'dist < 1.5');
    content = content.replace(/dist < 2\.2/g, 'dist < 1.3');

    // And also distToPlayer < 2.0 (for slime)
    content = content.replace(/distToPlayer < 2\.0/g, 'distToPlayer < 1.2');

    fs.writeFileSync(path, content);
}
console.log("Enemy children patched.");
