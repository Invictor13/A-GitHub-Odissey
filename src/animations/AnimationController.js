import * as THREE from 'three';
import { CombatAnimations } from './CombatAnimations.js';

export class AnimationController {
    constructor(character) {
        this.char = character;
    }

    update(delta, isMoving, moveSpeed) {
        this.char.animTime += delta;
        this.char.headPivot.rotation.set(0, 0, 0);
        this.char.torso.rotation.set(0, 0, 0);
        this.char.bodyGroup.position.set(0, 0, 0);
        this.char.torso.scale.set(1.2, 1, 0.95);

        const rawDeltaY = this.char.penitente.position.y - this.char.prevPosY;
        this.char.prevPosY = this.char.penitente.position.y;
        this.char.smoothedDeltaY += (rawDeltaY - this.char.smoothedDeltaY) * 15.0 * delta;

        let gravityImpact = -this.char.smoothedDeltaY * 6.0;
        if (this.char.isSwimming) gravityImpact = 0.5;

        const windDrag = isMoving ? (moveSpeed > 10 ? -0.7 : -0.3) : 0;
        const runBounce = isMoving && this.char.isGrounded && !this.char.isSwimming
            ? Math.abs(Math.sin(this.char.animTime * (this.char.keys.shift ? 18 : 10))) * 0.3
            : 0;

        let attackImpact = 0;
        const isResting = this.char.actionState === 'sit' || this.char.actionState === 'sleep' ||
                          this.char.actionState === 'inventory' || this.char.actionState === 'damage';

        this.applyBaseActionStates(isMoving, isResting, delta);
        attackImpact = this.applyCombatStates(delta, isResting);
        this.applyEmotionsAndFacial(delta);
        this.applyPhysicsReactions(delta, gravityImpact, windDrag, runBounce, attackImpact);
    }

    applyBaseActionStates(isMoving, isResting, delta) {
        const char = this.char;
        if (char.actionState === 'damage') {
            char.bodyGroup.rotation.x = -0.3;
            char.headPivot.rotation.x = -0.4;
            char.shoulderL.rotation.set(-0.5, 0, 1.2);
            char.shoulderR.rotation.set(-0.5, 0, -1.2);
        } else if (char.actionState === 'sit') {
            char.bodyGroup.position.y = -1.1;
            char.hipL.rotation.set(-1.5, 0.2, 0); char.hipR.rotation.set(-1.5, -0.2, 0);
            char.kneeL.rotation.set(0.1, 0, 0); char.kneeR.rotation.set(0.1, 0, 0);
            char.shoulderL.rotation.set(0.2, 0, -0.2); char.shoulderR.rotation.set(0.2, 0, 0.2);
            char.elbowL.rotation.set(-0.2, 0, 0); char.elbowR.rotation.set(-0.2, 0, 0);
            char.torso.rotation.x = 0.1; char.headPivot.rotation.x = 0.2;
        } else if (char.actionState === 'sleep') {
            char.bodyGroup.position.y = 0.85;
            char.bodyGroup.position.z = 0;
            char.bodyGroup.rotation.x = -Math.PI / 2;
            char.torso.scale.z = 0.95 + Math.sin(char.animTime * 2.5) * 0.08;
            char.torso.scale.y = 1.0 + Math.sin(char.animTime * 2.5) * 0.05;
            char.shoulderL.rotation.set(-0.2, 0, -1.2); char.shoulderR.rotation.set(-0.2, 0, 1.2);
            char.elbowL.rotation.set(0, 0, 0); char.elbowR.rotation.set(0, 0, 0);
            char.hipL.rotation.set(0, 0, 0); char.hipR.rotation.set(0, 0, 0); char.kneeL.rotation.set(0, 0, 0); char.kneeR.rotation.set(0, 0, 0);
        } else if (char.actionState === 'inventory') {
            char.bodyGroup.position.y = Math.sin(char.animTime * 2) * 0.02;
            char.torso.rotation.x = 0.3; char.headPivot.rotation.x = 0.4;
            char.shoulderL.rotation.set(0.4, 0, -0.2); char.elbowL.rotation.set(-1.2, 0, 0);
            char.shoulderR.rotation.set(0.2, 0, 0.2); char.elbowR.rotation.set(-0.2, 0, 0);
            char.hipL.rotation.set(0, 0, 0); char.hipR.rotation.set(0, 0, 0); char.kneeL.rotation.set(0, 0, 0); char.kneeR.rotation.set(0, 0, 0);
        } else if (char.isSwimming) {
            char.bodyGroup.position.y = Math.sin(char.animTime * 3) * 0.1;
            char.bodyGroup.rotation.x = isMoving ? 0.6 : 0.1; char.headPivot.rotation.x = isMoving ? -0.5 : 0;
            if (isMoving) {
                const swimCycle = char.animTime * 8;
                char.shoulderL.rotation.set(-1.0 + Math.sin(swimCycle) * 0.8, 0, -0.4);
                char.shoulderR.rotation.set(-1.0 + Math.sin(swimCycle + Math.PI) * 0.8, 0, 0.4);
                char.elbowL.rotation.set(-0.2, 0, 0); char.elbowR.rotation.set(-0.2, 0, 0);
                char.hipL.rotation.set(Math.sin(swimCycle*2) * 0.4, 0, 0); char.hipR.rotation.set(-Math.sin(swimCycle*2) * 0.4, 0, 0);
                char.kneeL.rotation.set(0.2, 0, 0); char.kneeR.rotation.set(0.2, 0, 0);
            } else {
                char.shoulderL.rotation.set(-0.2, 0, -0.5); char.shoulderR.rotation.set(-0.2, 0, 0.5);
                char.elbowL.rotation.set(-0.5, 0, 0); char.elbowR.rotation.set(-0.5, 0, 0);
                char.hipL.rotation.set(0,0,0); char.hipR.rotation.set(0,0,0); char.kneeL.rotation.set(0,0,0); char.kneeR.rotation.set(0,0,0);
            }
        } else {
            char.bodyGroup.rotation.set(0, 0, 0);
            if (!char.isGrounded) {
                if (char.velocityY > 0) {
                    if(!char.isAttacking && !char.isDefending) { char.shoulderL.rotation.set(-2.5, 0, -0.3); char.shoulderR.rotation.set(-2.5, 0, 0.3); char.elbowR.rotation.set(0,0,0); }
                    char.hipL.rotation.set(-0.5, 0, 0); char.hipR.rotation.set(0.2, 0, 0); char.kneeL.rotation.set(0.5, 0, 0); char.kneeR.rotation.set(0.1, 0, 0);
                } else {
                    if(!char.isAttacking && !char.isDefending) { char.shoulderL.rotation.set(-1.0, 0, -0.5); char.shoulderR.rotation.set(-1.0, 0, 0.5); }
                    char.hipL.rotation.set(-0.2, 0, 0); char.hipR.rotation.set(-0.2, 0, 0);
                }
            } else {
                if (!isMoving) {
                    char.bodyGroup.position.y = Math.sin(char.animTime * 2) * 0.05;
                    if(!char.isAttacking && !char.isDefending && char.actionState === 'none') {
                        char.shoulderL.rotation.set(0.1, 0, -0.2); char.shoulderR.rotation.set(0.1, 0, 0.2); char.elbowR.rotation.set(-0.2, 0, 0);
                    }
                    if (char.actionState === 'none') char.elbowL.rotation.set(-0.1, 0, 0);
                    char.hipL.rotation.set(0, 0, 0); char.hipR.rotation.set(0, 0, 0); char.kneeL.rotation.set(0, 0, 0); char.kneeR.rotation.set(0, 0, 0);
                } else {
                    const speedMult = char.keys.shift ? 18 : 10; const moveSin = Math.sin(char.animTime * speedMult);
                    char.bodyGroup.position.y = Math.abs(moveSin) * (char.keys.shift ? 0.35 : 0.2); char.bodyGroup.rotation.x = char.keys.shift ? 0.2 : 0.05;
                    if(!char.isAttacking && !char.isDefending) {
                        char.shoulderL.rotation.set(-moveSin * (char.keys.shift ? 1.2 : 0.6), 0, -0.2); char.shoulderR.rotation.set(moveSin * (char.keys.shift ? 1.2 : 0.6), 0, 0.2); char.elbowR.rotation.set(char.keys.shift ? -0.5 : -0.2, 0, 0);
                    }
                    char.elbowL.rotation.set(char.keys.shift ? -0.5 : -0.2, 0, 0);
                    char.hipL.rotation.set(moveSin * (char.keys.shift ? 1.0 : 0.6), 0, 0); char.hipR.rotation.set(-moveSin * (char.keys.shift ? 1.0 : 0.6), 0, 0);
                    char.kneeL.rotation.set(moveSin > 0 ? moveSin * 0.8 : 0, 0, 0); char.kneeR.rotation.set(moveSin < 0 ? -moveSin * 0.8 : 0, 0, 0);
                }
            }
        }
    }

    applyCombatStates(delta, isResting) {
        const char = this.char;
        let attackImpact = 0;

        if (char.isDefending && !char.isAttacking) {
            if (char.currentWeaponType === 'weapon_2h' || char.currentWeaponType === 'spear') {
                char.shoulderL.rotation.set(-1.0, 0.4, -0.6); char.elbowL.rotation.set(-2.0, -1.0, 0);
                char.shoulderR.rotation.set(-1.0, -0.4, 0.6); char.elbowR.rotation.set(-2.0, 1.0, 0);
            } else if (!char.currentShieldType) {
                // block with weapon or arm
                char.shoulderR.rotation.set(-0.8, -0.5, 0.8); char.elbowR.rotation.set(-2.5, 0, 0);
            } else {
                // standard shield block
                char.shoulderL.rotation.set(-0.6, 0.4, -0.6); char.elbowL.rotation.set(-2.0, -1.4, 0);
            }
            char.torso.rotation.y = -0.7; char.headPivot.rotation.y = 0.7;
            char.bodyGroup.position.y -= 0.2;
            char.hipL.rotation.set(-0.5, 0.2, 0); char.kneeL.rotation.set(0.6, 0, 0); char.hipR.rotation.set(0.2, -0.2, 0); char.kneeR.rotation.set(0.4, 0, 0);
            char.torso.rotation.x += 0.2;
        }

        if (char.isAttacking) {
            char.attackTimer -= delta;
            const progress = 1 - (char.attackTimer / char.ATTACK_DURATION);

            const anim = CombatAnimations.getComboAnimation(char.currentWeaponModel, char.comboStep, progress);

            char.torso.rotation.y = anim.torso.y;
            char.torso.rotation.x = anim.torso.x;

            if (anim.shoulderR.x !== undefined) char.shoulderR.rotation.set(anim.shoulderR.x, anim.shoulderR.y, anim.shoulderR.z);
            if (anim.elbowR.x !== undefined) char.elbowR.rotation.set(anim.elbowR.x, 0, 0);

            if (anim.shoulderL.x !== undefined) char.shoulderL.rotation.set(anim.shoulderL.x, anim.shoulderL.y, anim.shoulderL.z);
            if (anim.elbowL.x !== undefined) char.elbowL.rotation.set(anim.elbowL.x, 0, 0);

            if (anim.p2 > 0.5) {
                if (char.slashArcMesh && char.currentWeaponModel !== 'unarmed' && char.currentWeaponModel !== 'spear') {
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
                }
                if (!char.hasHit) {
                    char.hasHit = true; const tipPos = new THREE.Vector3();
                    if(char.weaponTip) char.weaponTip.getWorldPosition(tipPos); else char.slotWeapon.getWorldPosition(tipPos);

                    if (char.currentWeaponModel !== 'unarmed') {
                        char.spawnVFX(tipPos, 'slash', 12);
                    } else {
                        char.spawnVFX(tipPos, 'dust', 6);
                    }

                    if (char.onMeleeHit) {
                        const forward = new THREE.Vector3();
                        char.group.getWorldDirection(forward);
                        char.onMeleeHit(char.group.position, forward, char.currentDamage, char.currentReach);
                    }
                }
                attackImpact = Math.sin(((anim.p2 - 0.5) / 0.5) * Math.PI) * 2.0;
                char.bodyGroup.position.y -= attackImpact * 0.05;
                char.torso.rotation.x += attackImpact * 0.15;
                if (char.currentWeaponModel === 'unarmed') {
                    char.bodyGroup.position.z += attackImpact * 0.15; // Projeta pra frente
                    char.headPivot.rotation.x += attackImpact * 0.1; // Cabeça inclina levemente
                }
            }

            if (char.attackTimer <= 0) {
                char.isAttacking = false; char.hasHit = false; char.torso.rotation.y = 0;
                if (char.slashArcMesh) char.slashArcMesh.visible = false;
                if (char.slashArcUnarmedMesh) char.slashArcUnarmedMesh.visible = false;
                char.comboResetTimer = 1.0; // 1 second to continue combo
            } else {
                const t = 1 - (char.attackTimer / char.ATTACK_DURATION);
                const scale = 0.5 + t * 0.6;
                char.matSlashArc.opacity = 0.8 * (1.0 - t);

                if (char.slashArcMesh && char.slashArcMesh.visible) {
                    char.slashArcMesh.scale.set(scale, scale, scale);
                }
                if (char.slashArcUnarmedMesh && char.slashArcUnarmedMesh.visible) {
                    char.slashArcUnarmedMesh.scale.set(scale, scale, scale);
                }
            }
        } else if (!char.isDefending && !isResting) {
            char.hasHit = false; char.torso.rotation.y += (0 - char.torso.rotation.y) * 10 * delta;
            if (char.comboResetTimer > 0) {
                char.comboResetTimer -= delta;
                if (char.comboResetTimer <= 0) {
                    char.comboStep = 1;
                }
            }
        }

        return attackImpact;
    }

    applyEmotionsAndFacial(delta) {
        const char = this.char;
        if (char.actionState === 'eat') {
            const chewCycle = Math.sin(char.animTime * 15);
            char.shoulderL.rotation.set(-1.0, 0.6, -0.2);
            char.elbowL.rotation.set(-2.0, 0, 0);
            char.headPivot.rotation.x = chewCycle * 0.05;
        } else if (char.actionState === 'drink') {
            const gulpCycle = Math.sin(char.animTime * 8);
            char.shoulderL.rotation.set(-1.2, 0.6, -0.2);
            char.elbowL.rotation.set(-2.2, 0, 0);
            char.headPivot.rotation.x = -0.4 + gulpCycle * 0.08;
        }

        let emotion = 'neutral';
        if (char.actionState === 'sleep') emotion = 'sleep';
        else if (char.actionState === 'inventory') emotion = 'focus';
        else if (char.actionState === 'damage') emotion = 'hurt';
        else if (char.isAttacking) emotion = 'angry';
        else if (char.isDefending) emotion = 'guard';
        else if (!char.isGrounded && char.velocityY > 5) emotion = 'jump';
        else if (!char.isGrounded && char.velocityY < -5) emotion = 'fall';

        let targetBrowZ = -0.25, targetMouthX = 1.0, targetMouthY = 1.0;
        if (emotion === 'angry') { targetBrowZ = -0.6; targetMouthX = 0.6; targetMouthY = 0.6; }
        else if (emotion === 'guard') { targetBrowZ = -0.5; targetMouthX = 0.5; targetMouthY = 0.3; }
        else if (emotion === 'jump') { targetBrowZ = 0.1; targetMouthX = 0.6; targetMouthY = 1.5; }
        else if (emotion === 'fall') { targetBrowZ = 0.4; targetMouthX = 1.4; targetMouthY = 0.5; }
        else if (emotion === 'sleep') { targetBrowZ = 0; targetMouthX = 0.5; targetMouthY = 0.5; }
        else if (emotion === 'focus') { targetBrowZ = -0.4; targetMouthX = 0.8; targetMouthY = 0.8; }
        else if (emotion === 'hurt') { targetBrowZ = 0.6; targetMouthX = 1.2; targetMouthY = 1.5; }

        if (char.actionState === 'eat') targetMouthY = 1.0 + Math.abs(Math.sin(char.animTime * 15)) * 1.5;
        else if (char.actionState === 'drink') { targetMouthY = 2.0; targetMouthX = 0.5; }

        char.browL.rotation.z += (targetBrowZ - char.browL.rotation.z) * 15 * delta; char.browR.rotation.z += (-targetBrowZ - char.browR.rotation.z) * 15 * delta;
        char.mouth.scale.x += (targetMouthX - char.mouth.scale.x) * 15 * delta; char.mouth.scale.y += (targetMouthY - char.mouth.scale.y) * 15 * delta;

        char.blinkTimer -= delta;
        if (char.blinkTimer <= 0) { char.isBlinking = true; char.blinkTimer = 2.0 + Math.random() * 4.0; char.blinkDuration = 0.15; }
        if (char.isBlinking || emotion === 'hurt') {
            char.blinkDuration -= delta; char.eyeL.scale.y = 0.1; char.eyeR.scale.y = 0.1;
            if (char.blinkDuration <= 0) char.isBlinking = false;
        } else {
            let targetEyeScale = (emotion === 'fall' || emotion === 'jump') ? 1.3 : 1.0;
            if (emotion === 'angry' || emotion === 'guard' || emotion === 'focus') targetEyeScale = 0.7;
            if (emotion === 'sleep') targetEyeScale = 0.05;
            char.eyeL.scale.y += (targetEyeScale - char.eyeL.scale.y) * 20 * delta; char.eyeR.scale.y += (targetEyeScale - char.eyeR.scale.y) * 20 * delta;
        }
    }

    applyPhysicsReactions(delta, gravityImpact, windDrag, runBounce, attackImpact) {
        const char = this.char;
        char.animatedHair.forEach(hair => {
            if(char.currHead !== 0) return;
            const wind = Math.sin(char.animTime * 3 + hair.offset) * 0.05;
            let targetRx = hair.baseRx + wind; let targetRz = hair.baseRz + Math.cos(char.animTime * 2 + hair.offset) * 0.03;

            if (hair.isBangs) {
                targetRx -= gravityImpact * hair.reactionStrength; targetRx -= windDrag * hair.reactionStrength * 0.15; targetRx -= runBounce * hair.reactionStrength;
                if (Math.abs(windDrag) > 0.1) targetRz += Math.abs(windDrag) * (hair.baseRz > 0 ? 1 : -1) * 1.5;
            } else {
                targetRx += gravityImpact * hair.reactionStrength; targetRx += windDrag * hair.reactionStrength; targetRx += runBounce * hair.reactionStrength;
            }

            if (attackImpact > 0) {
                if (hair.isBangs) targetRx += attackImpact * hair.reactionStrength * 0.4; else targetRx -= attackImpact * hair.reactionStrength * 0.4;
            }
            if (char.actionState === 'inventory') targetRx += 0.3;
            if (char.actionState === 'damage') targetRx += 0.5;

            hair.mesh.rotation.x += (targetRx - hair.mesh.rotation.x) * 18 * delta; hair.mesh.rotation.z += (targetRz - hair.mesh.rotation.z) * 18 * delta;
        });

        char.animatedCoat.forEach(flap => {
            if(char.currArmor !== 0) return;
            const wind = Math.sin(char.animTime * 4 + flap.offset) * 0.05; let targetRx = flap.baseRx + wind;
            targetRx += gravityImpact * 0.5; targetRx -= windDrag * 1.8; targetRx += runBounce * 0.6;
            if (attackImpact > 0) targetRx += attackImpact * 0.5;
            if (char.isDefending || char.actionState === 'sit') targetRx += 0.3;
            if (char.actionState === 'damage') targetRx -= 0.5;
            flap.mesh.rotation.x += (targetRx - flap.mesh.rotation.x) * 12 * delta;
        });
    }
}
