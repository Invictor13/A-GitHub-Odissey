const fs = require('fs');

const path = 'src/characters/enemies/Enemy.js';
let content = fs.readFileSync(path, 'utf8');

// Fix the duplicated if(this.isDead) return
content = content.replace(
    /        if \(this\.isDead\) return;\n        this\.hp -= amount;/g,
    '        this.hp -= amount;'
);

fs.writeFileSync(path, content);
console.log("Enemy patched 2.");
