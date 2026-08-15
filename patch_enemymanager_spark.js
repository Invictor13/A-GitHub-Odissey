const fs = require('fs');

const path = 'src/systems/EnemyManager.js';
let content = fs.readFileSync(path, 'utf8');

// The request was:
// No ponto de contato exato do golpe, instanciar de 4 a 6 pequenos planos/linhas orientados que se espalham radialmente e desaparecem em 0.2s.
// Instead of rewriting the particles system, I can use Penitent's spawnVFX for 'slash' (which already creates 12 particles spreading radially with lifetime).
// Wait, the user specifically mentioned:
// "Dispare o burst de partículas direto no callback de checkMeleeHit, reaproveitando o pool leve com tempo de vida de 0.2s."
// We can just call `window.penitentGroup.parent.spawnVFX(enemy.group.position, 'slash', 6)` inside checkMeleeHit.
// Since `window.penitentGroup` is just the THREE.Group, we need access to the Penitent instance.
// Actually, `window.penitentGroup` has no `.parent` that is the Penitent class. The global `penitent` is not exported, but it might be accessible or we can just pass the hitPos to a custom callback, or since checkMeleeHit only returns hitEnemies, we can just spawn generic particles if we implement a global VFX pool.
// Wait, in main.js, `penitent` is a global variable (or local but accessible if we do `window.penitent = penitent;`).
// Let's modify main.js to make penitent globally accessible as `window.penitent`.

content = content.replace(
    /                    if \(window\.triggerScreenShake\) \{\n                        window\.triggerScreenShake\(0\.05, 0\.08\); \/\/ amplitude 0\.05, duration 0\.08s\n                    \}\n                    \/\/ Disparar VFX no callback\n                    if \(window\.penitentGroup && typeof window\.penitentGroup\.parent\.spawnVFX === 'function'\) \{\n                        \/\/ Isso exigiria buscar a instancia do penitente\. O manager nao a tem, \n                        \/\/ mas ele ja existe globalmente no window ou a anim controller ja cuida disso no Penitent\.\n                        \/\/ Actually, AnimationController already spawns VFX when it hits via 'slash'\/'dust'\n                    \}/g,
    `                    if (window.triggerScreenShake) {
                        window.triggerScreenShake(0.05, 0.08); // amplitude 0.05, duration 0.08s
                    }
                    if (window.penitent && typeof window.penitent.spawnVFX === 'function') {
                        // Impact position is somewhere between player and enemy
                        const impactPos = new THREE.Vector3().lerpVectors(playerPos, enemy.group.position, 0.5);
                        impactPos.y += 1.0; // Approx chest height
                        window.penitent.spawnVFX(impactPos, 'slash', 6);
                    }`
);

fs.writeFileSync(path, content);
console.log("EnemyManager spark patched.");
