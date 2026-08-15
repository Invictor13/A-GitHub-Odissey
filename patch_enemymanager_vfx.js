const fs = require('fs');

const path = 'src/systems/EnemyManager.js';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
    /                    hitEnemies\.push\(enemy\);\n                    if \(window\.triggerScreenShake\) \{\n                        window\.triggerScreenShake\(0\.05, 0\.08\); \/\/ amplitude 0\.05, duration 0\.08s\n                    \}/g,
    `                    hitEnemies.push(enemy);
                    if (window.triggerScreenShake) {
                        window.triggerScreenShake(0.05, 0.08); // amplitude 0.05, duration 0.08s
                    }
                    // Disparar VFX no callback
                    if (window.penitentGroup && typeof window.penitentGroup.parent.spawnVFX === 'function') {
                        // Isso exigiria buscar a instancia do penitente. O manager nao a tem,
                        // mas ele ja existe globalmente no window ou a anim controller ja cuida disso no Penitent.
                        // Actually, AnimationController already spawns VFX when it hits via 'slash'/'dust'
                    }`
);

fs.writeFileSync(path, content);
console.log("EnemyManager VFX patched.");
