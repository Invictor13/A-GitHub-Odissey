export class CombatAnimations {
    static getComboAnimation(weaponModelType, comboStep, progress) {
        let shoulderR = { x: 0, y: 0, z: 0 };
        let elbowR = { x: 0, y: 0, z: 0 };
        let torso = { x: 0, y: 0, z: 0 };
        let shoulderL = { x: 0, y: 0, z: 0 };
        let elbowL = { x: 0, y: 0, z: 0 };

        const p1 = Math.min(1, progress / 0.35); // windup
        const p2 = Math.max(0, (progress - 0.35) / 0.65); // swing

        switch (weaponModelType) {
            case 'sword2h':
                // Heavy horizontal and vertical swings, using both hands
                if (comboStep === 1) { // Horizontal swing right to left
                    torso.y = Math.sin(progress * Math.PI) * 0.8;
                    shoulderL.x = -Math.PI / 2; elbowL.x = -0.5;
                    if (progress < 0.35) {
                        shoulderR.x = -Math.PI * 0.5 * p1; shoulderR.y = -0.5 * p1; shoulderR.z = 0.5 * p1;
                        elbowR.x = -1.0 * p1;
                    } else {
                        shoulderR.x = -Math.PI * 0.5 + (Math.PI * 0.8 * p2); shoulderR.y = -0.5 + (1.2 * p2); shoulderR.z = 0.5 - (0.4 * p2);
                        elbowR.x = -1.0 + (0.5 * p2);
                    }
                } else if (comboStep === 2) { // Overhead smash
                    torso.y = -Math.sin(progress * Math.PI) * 0.4;
                    shoulderL.x = -Math.PI / 2; elbowL.x = -1.0;
                    if (progress < 0.35) {
                        shoulderR.x = -Math.PI * 1.2 * p1; elbowR.x = -1.5 * p1;
                    } else {
                        shoulderR.x = -Math.PI * 1.2 + (Math.PI * 1.5 * p2); elbowR.x = -1.5 + (1.2 * p2);
                    }
                }
                break;

            case 'spear':
                // Thrusting attacks, using both hands
                if (comboStep === 1 || comboStep === 2) {
                    torso.y = Math.sin(progress * Math.PI) * 0.5;
                    shoulderL.x = -Math.PI / 2; elbowL.x = -0.5;
                    if (progress < 0.35) {
                        shoulderR.x = -Math.PI * 0.3 * p1; shoulderR.y = -0.5 * p1; shoulderR.z = 0.2 * p1;
                        elbowR.x = -1.5 * p1;
                    } else {
                        shoulderR.x = -Math.PI * 0.3 - (Math.PI * 0.5 * p2); shoulderR.y = -0.5 + (0.5 * p2);
                        elbowR.x = -1.5 + (1.5 * p2);
                    }
                }
                break;

            case 'knife':
                // Fast alternating slashes/stabs
                if (comboStep === 1) { // Slash
                    torso.y = Math.sin(progress * Math.PI) * 0.3;
                    if (progress < 0.35) {
                        shoulderR.x = -Math.PI * 0.5 * p1; shoulderR.y = 0.5 * p1; elbowR.x = -1.0 * p1;
                    } else {
                        shoulderR.x = -Math.PI * 0.5 + (Math.PI * 0.8 * p2); shoulderR.y = 0.5 - (1.0 * p2); elbowR.x = -1.0 + (0.8 * p2);
                    }
                } else if (comboStep === 2) { // Stab
                    torso.y = Math.sin(progress * Math.PI) * 0.2;
                    if (progress < 0.35) {
                        shoulderR.x = -Math.PI * 0.3 * p1; elbowR.x = -1.5 * p1;
                    } else {
                        shoulderR.x = -Math.PI * 0.3 - (Math.PI * 0.4 * p2); elbowR.x = -1.5 + (1.2 * p2);
                    }
                }
                break;

            case 'unarmed':
                // Punches
                if (comboStep === 1) { // Right hook
                    torso.y = Math.sin(progress * Math.PI) * 0.5;
                    if (progress < 0.35) {
                        shoulderR.x = -Math.PI * 0.2 * p1; shoulderR.y = -0.5 * p1; shoulderR.z = 0.5 * p1; elbowR.x = -1.2 * p1;
                    } else {
                        shoulderR.x = -Math.PI * 0.2 - (Math.PI * 0.4 * p2); shoulderR.y = -0.5 + (1.0 * p2); shoulderR.z = 0.5 - (0.5 * p2); elbowR.x = -1.2 + (1.0 * p2);
                    }
                } else if (comboStep === 2) { // Left hook
                    torso.y = -Math.sin(progress * Math.PI) * 0.5;
                    if (progress < 0.35) {
                        shoulderL.x = -Math.PI * 0.2 * p1; shoulderL.y = 0.5 * p1; shoulderL.z = -0.5 * p1; elbowL.x = -1.2 * p1;
                    } else {
                        shoulderL.x = -Math.PI * 0.2 - (Math.PI * 0.4 * p2); shoulderL.y = 0.5 - (1.0 * p2); shoulderL.z = -0.5 + (0.5 * p2); elbowL.x = -1.2 + (1.0 * p2);
                    }
                }
                break;

            default: // club, sword1h
                // Standard 1H swings
                if (comboStep === 1) {
                    torso.y = Math.sin(progress * Math.PI) * 0.4;
                    if (progress < 0.35) {
                        shoulderR.x = -Math.PI * 0.8 * p1; shoulderR.y = -0.2 * p1; shoulderR.z = 0.4 * p1; elbowR.x = -1.5 * p1;
                    } else {
                        shoulderR.x = -Math.PI * 0.8 + (Math.PI * 1.1 * p2); shoulderR.y = -0.2 + (0.7 * p2); shoulderR.z = 0.4 - (0.2 * p2);
                        elbowR.x = -1.5 + (1.2 * p2);
                    }
                } else if (comboStep === 2) {
                    torso.y = -Math.sin(progress * Math.PI) * 0.4;
                    if (progress < 0.35) {
                        shoulderR.x = -Math.PI * 0.5 * p1; shoulderR.y = 0.5 * p1; elbowR.x = -1.5 * p1;
                    } else {
                        shoulderR.x = -Math.PI * 0.5 + (Math.PI * 0.8 * p2); shoulderR.y = 0.5 - (1.0 * p2); elbowR.x = -1.5 + (1.2 * p2);
                    }
                }
                break;
        }

        return { shoulderR, elbowR, torso, shoulderL, elbowL, p2 };
    }
}
