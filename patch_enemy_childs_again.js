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

    // The review pointed out:
    // "in the child classes (e.g., Goblin.js), it only calls super.update() *during* the hitstop phase (if (this.hitstopTimer > 0)). Once hitstop ends, the child classes stop calling super.update(), meaning the knockback timer is never evaluated and the enemy is never pushed back."
    // Let's remove the condition and just let super.update handle returning if hitstop is active. Wait, super.update returns but in JS returning from super does not return from the child.
    // Instead, we can check hitstopTimer in the child and return.

    // Actually, super.update needs to process knockback even if NOT in hitstop.
    // What I did:
    /*
        if (this.hitstopTimer > 0) {
            super.update(delta, playerContext, getFloorFunc, checkCollisionFunc);
            return;
        }
    */
    // Instead we can just do:
    /*
        super.update(delta, playerContext, getFloorFunc, checkCollisionFunc);
        if (this.hitstopTimer > 0) return;
    */

    // First, let's remove the bad block
    content = content.replace(
        /        if \(this\.hitstopTimer > 0\) \{\n            super\.update\(delta, playerContext, getFloorFunc, checkCollisionFunc\);\n            return;\n        \}\n/g,
        ''
    );

    // Second, add the check AFTER the normal super.update
    // Wait, super.update(delta, targetPos) is what's called in these classes originally.
    content = content.replace(
        /        super\.update\(delta, targetPos\);/g,
        '        super.update(delta, playerContext, getFloorFunc, checkCollisionFunc);\n        if (this.hitstopTimer > 0) return;'
    );
    // For Slime.js it uses playerPos instead of targetPos:
    content = content.replace(
        /        super\.update\(delta, playerPos\);/g,
        '        super.update(delta, playerContext, getFloorFunc, checkCollisionFunc);\n        if (this.hitstopTimer > 0) return;'
    );

    fs.writeFileSync(path, content);
}
console.log("Enemy children patched again.");
