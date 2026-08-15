const fs = require('fs');

const path = 'src/animations/CombatAnimations.js';
let content = fs.readFileSync(path, 'utf8');

const newUnarmedAnim = `            case 'unarmed':
                // Dynamic Thrust Punches
                if (comboStep === 1) { // Right thrust
                    // Anticipation (p1): torso.y = -0.25
                    // Impact/Thrust (p2): torso.y = 0.4
                    if (progress < 0.35) {
                        torso.y = -0.25 * p1;
                        shoulderR.x = -Math.PI * 0.1 * p1; // Arm slightly back/up
                        shoulderR.y = -0.3 * p1;
                        elbowR.x = -1.5 * p1; // Bend elbow
                    } else {
                        torso.y = -0.25 + (0.65 * p2); // Torso twists forward (up to 0.4)
                        shoulderR.x = -Math.PI * 0.1 - (Math.PI * 0.4 * p2); // Punch forward
                        shoulderR.y = -0.3 + (0.5 * p2); // Inward rotation
                        elbowR.x = -1.5 + (1.4 * p2); // Extend arm
                    }
                } else if (comboStep === 2) { // Left thrust
                    // Anticipation (p1): torso.y = 0.25
                    // Impact/Thrust (p2): torso.y = -0.4
                    if (progress < 0.35) {
                        torso.y = 0.25 * p1;
                        shoulderL.x = -Math.PI * 0.1 * p1;
                        shoulderL.y = 0.3 * p1;
                        elbowL.x = -1.5 * p1;
                    } else {
                        torso.y = 0.25 - (0.65 * p2); // Torso twists forward (up to -0.4)
                        shoulderL.x = -Math.PI * 0.1 - (Math.PI * 0.4 * p2); // Punch forward
                        shoulderL.y = 0.3 - (0.5 * p2); // Inward rotation
                        elbowL.x = -1.5 + (1.4 * p2); // Extend arm
                    }
                }
                break;`;

// Replace the existing unarmed block with the new one
content = content.replace(
    /            case 'unarmed':[\s\S]*?break;/,
    newUnarmedAnim
);

fs.writeFileSync(path, content);
console.log("CombatAnimations patched.");
