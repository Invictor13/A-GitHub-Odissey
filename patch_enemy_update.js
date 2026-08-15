const fs = require('fs');

const path = 'src/characters/enemies/Enemy.js';
let content = fs.readFileSync(path, 'utf8');

// Modify the update function to handle hitstop and knockback
content = content.replace(
    /    update\(delta, playerContext, getFloorFunc, checkCollisionFunc\) \{\n        if \(this\.isDead\) return;\n        this\.animTime \+= delta \* 15;\n        \/\/ Derived classes should override this for specific movement\/animations\n    \}/g,
    `    update(delta, playerContext, getFloorFunc, checkCollisionFunc) {
        if (this.isDead) return;

        if (this.hitstopTimer > 0) {
            this.hitstopTimer -= delta;
            return; // Pause animation/updates
        }

        if (this.knockbackTimer > 0) {
            this.knockbackTimer -= delta;

            // Move backwards
            this._testPosX.copy(this.group.position);
            this._testPosX.x += this.knockbackVelocity.x * delta;
            if (!checkCollisionFunc || !checkCollisionFunc(this._testPosX, 0.5)) {
                this.group.position.x = this._testPosX.x;
            }

            this._testPosZ.copy(this.group.position);
            this._testPosZ.z += this.knockbackVelocity.z * delta;
            if (!checkCollisionFunc || !checkCollisionFunc(this._testPosZ, 0.5)) {
                this.group.position.z = this._testPosZ.z;
            }
        }

        this.animTime += delta * 15;
        // Derived classes should override this for specific movement/animations, but MUST call super.update first!
    }`
);

fs.writeFileSync(path, content);
console.log("Enemy update patched.");
