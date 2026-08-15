const fs = require('fs');

const path = 'main.js';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
    /            penitent = new Penitent\(scene\);\n            window\.penitentGroup = penitent\.group;/g,
    `            penitent = new Penitent(scene);
            window.penitent = penitent;
            window.penitentGroup = penitent.group;`
);

fs.writeFileSync(path, content);
console.log("Main penitent patched.");
