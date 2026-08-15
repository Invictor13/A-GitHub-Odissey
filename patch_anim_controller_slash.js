const fs = require('fs');

const path = 'src/animations/AnimationController.js';
let content = fs.readFileSync(path, 'utf8');

// Also show slashArcUnarmedMesh for unarmed
content = content.replace(
    /                if \(char\.slashArcMesh && char\.currentWeaponModel !== 'unarmed' && char\.currentWeaponModel !== 'spear'\) \{\n                    char\.slashArcMesh\.visible = true;\n                \}/g,
    `                if (char.slashArcMesh && char.currentWeaponModel !== 'unarmed' && char.currentWeaponModel !== 'spear') {
                    char.slashArcMesh.visible = true;
                }
                if (char.slashArcUnarmedMesh && char.currentWeaponModel === 'unarmed') {
                    char.slashArcUnarmedMesh.visible = true;
                    // Switch sides based on combo
                    if (char.comboStep === 1) {
                        char.slashArcUnarmedMesh.rotation.y = 0.2;
                    } else {
                        char.slashArcUnarmedMesh.rotation.y = -0.2;
                    }
                }`
);

// Hide both
content = content.replace(
    /                if \(char\.slashArcMesh\) char\.slashArcMesh\.visible = false;/g,
    `                if (char.slashArcMesh) char.slashArcMesh.visible = false;
                if (char.slashArcUnarmedMesh) char.slashArcUnarmedMesh.visible = false;`
);

// Update opacity/scale for both
content = content.replace(
    /            \} else if \(char\.slashArcMesh && char\.slashArcMesh\.visible\) \{\n                const t = 1 - \(char\.attackTimer \/ char\.ATTACK_DURATION\);\n                const scale = 0\.5 \+ t \* 0\.6;\n                char\.slashArcMesh\.scale\.set\(scale, scale, scale\);\n                char\.matSlashArc\.opacity = 0\.8 \* \(1\.0 - t\);\n            \}/g,
    `            } else {
                const t = 1 - (char.attackTimer / char.ATTACK_DURATION);
                const scale = 0.5 + t * 0.6;
                char.matSlashArc.opacity = 0.8 * (1.0 - t);

                if (char.slashArcMesh && char.slashArcMesh.visible) {
                    char.slashArcMesh.scale.set(scale, scale, scale);
                }
                if (char.slashArcUnarmedMesh && char.slashArcUnarmedMesh.visible) {
                    char.slashArcUnarmedMesh.scale.set(scale, scale, scale);
                }
            }`
);

fs.writeFileSync(path, content);
console.log("AnimationController slash patched.");
