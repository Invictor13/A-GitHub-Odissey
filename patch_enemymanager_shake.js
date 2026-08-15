const fs = require('fs');

const path = 'src/systems/EnemyManager.js';
let content = fs.readFileSync(path, 'utf8');

// Also call screen shake when hit is detected
content = content.replace(
    /                    enemy\.takeDamage\(damage, playerPos\);\n                    hitEnemies\.push\(enemy\);/g,
    `                    enemy.takeDamage(damage, playerPos);
                    hitEnemies.push(enemy);
                    if (window.triggerScreenShake) {
                        window.triggerScreenShake(0.05, 0.08); // amplitude 0.05, duration 0.08s
                    }`
);

fs.writeFileSync(path, content);
console.log("EnemyManager patched with screen shake call.");
