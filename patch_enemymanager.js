const fs = require('fs');

const path = 'src/systems/EnemyManager.js';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
    /if \(dot > 0\.0\) \{/g,
    'if (dot > 0.707) {'
);

// We need to implement knockback via Enemy class takeDamage so we don't need to do it here, but maybe we can update it in checkMeleeHit to pass playerPos so takeDamage knows where the hit came from.
// Actually, checkMeleeHit passes damage. Let's pass playerPos as well to takeDamage.
content = content.replace(
    /enemy\.takeDamage\(damage\);/g,
    'enemy.takeDamage(damage, playerPos);'
);

content = content.replace(
    /\/\/ Knockback logic can be added here or inside enemy\.takeDamage\s+if \(enemy\.knockback && enemy\.group\) \{\s+this\._knockDir\.set\(this\._dirToEnemy2D\.x, 0, this\._dirToEnemy2D\.y\)\.normalize\(\);\s+enemy\.knockback\.copy\(this\._knockDir\.multiplyScalar\(5\.0\)\);\s+enemy\.velocityY = 4\.0;\s+\}/g,
    '' // Delete old knockback logic from here to keep it strictly in Enemy
);

fs.writeFileSync(path, content);
console.log("EnemyManager patched.");
