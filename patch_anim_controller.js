const fs = require('fs');

const path = 'src/animations/AnimationController.js';
let content = fs.readFileSync(path, 'utf8');

// We also need to add body projecting forward on p2
// The request was: Impact/Thrust: Tronco se projeta para frente (body.position.z += 0.15 no espaço local)
// AnimationController already has an `attackImpact` logic.
// Let's modify it slightly if currentWeaponModel is 'unarmed'.

content = content.replace(
    /char\.bodyGroup\.position\.y -= attackImpact \* 0\.05; char\.torso\.rotation\.x \+= attackImpact \* 0\.15;/g,
    `char.bodyGroup.position.y -= attackImpact * 0.05;
                char.torso.rotation.x += attackImpact * 0.15;
                if (char.currentWeaponModel === 'unarmed') {
                    char.bodyGroup.position.z += attackImpact * 0.15; // Projeta pra frente
                    char.headPivot.rotation.x += attackImpact * 0.1; // Cabeça inclina levemente
                }`
);

fs.writeFileSync(path, content);
console.log("AnimationController patched.");
