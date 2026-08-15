const fs = require('fs');

const path = 'src/characters/enemies/Enemy.js';
let content = fs.readFileSync(path, 'utf8');

// Add knockback velocity and hitstop variables
content = content.replace(
    /this\._testPosZ = new THREE\.Vector3\(\);/g,
    'this._testPosZ = new THREE.Vector3();\n        this.knockbackVelocity = new THREE.Vector3();\n        this.hitstopTimer = 0;\n        this.knockbackTimer = 0;'
);

// Update takeDamage to take playerPos (sourcePos)
content = content.replace(
    /takeDamage\(amount\) \{/g,
    'takeDamage(amount, sourcePos = null) {\n        if (this.isDead) return;\n        \n        this.hitstopTimer = 0.05;\n        this.knockbackTimer = 0.15;\n        if (sourcePos && this.group) {\n            this.knockbackVelocity.subVectors(this.group.position, sourcePos);\n            this.knockbackVelocity.y = 0;\n            this.knockbackVelocity.normalize().multiplyScalar(5.0); // knockback speed\n        }'
);

// We should fix the `if (this.isDead) return;` at the beginning of takeDamage since we added a new one. Let's just remove the first one.
content = content.replace(/takeDamage\(amount, sourcePos = null\) \{\n        if \(this\.isDead\) return;\n        if \(this\.isDead\) return;/g, 'takeDamage(amount, sourcePos = null) {\n        if (this.isDead) return;');


fs.writeFileSync(path, content);
console.log("Enemy patched.");
