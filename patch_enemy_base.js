const fs = require('fs');

const path = 'src/characters/enemies/Enemy.js';
let content = fs.readFileSync(path, 'utf8');

// The review stated: "The agent injected knockback processing into the base Enemy.js's update method, but in the child classes (e.g., Goblin.js), it only calls super.update() *during* the hitstop phase (if (this.hitstopTimer > 0))."
// This is fixed by calling super.update() unconditionally.
// But wait, in Enemy.js:
/*
        if (this.hitstopTimer > 0) {
            this.hitstopTimer -= delta;
            return; // Pause animation/updates
        }
*/
// If it returns, the knockback code won't run while in hitstop!
// We want knockback AND hitstop to run. Hitstop pauses the ANIMATION and AI logic, but maybe knockback shouldn't happen during hitstop?
// "Ao registrar o acerto, aplicar um leve recuo (knockback) no monstro na direção oposta ao golpe por 0.15s."
// Hitstop is 0.05s. Knockback is 0.15s. They can overlap or happen concurrently.
// Let's modify Enemy.js so hitstop does not return, it just sets a flag or we move knockback before hitstop and we don't return from the method itself, but let the child class return.

content = content.replace(
    /        if \(this\.hitstopTimer > 0\) \{\n            this\.hitstopTimer -= delta;\n            return; \/\/ Pause animation\/updates\n        \}/g,
    `        if (this.hitstopTimer > 0) {
            this.hitstopTimer -= delta;
        }`
);

fs.writeFileSync(path, content);
console.log("Enemy base patched again.");
