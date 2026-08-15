const fs = require('fs');

const path = 'src/characters/Penitent.js';
let content = fs.readFileSync(path, 'utf8');

// Add a new mesh for unarmed slash arc (smaller)
const newSlashArcCode = `        this.slashArcGroup = new THREE.Group();
        this.group.add(this.slashArcGroup);
        const arcGeo = new THREE.TorusGeometry(3.5, 0.4, 2, 20, Math.PI);
        this.slashArcMesh = new THREE.Mesh(arcGeo, this.matSlashArc);
        this.slashArcMesh.rotation.x = Math.PI / 2;
        this.slashArcMesh.position.z = 2.0; // edge reaches 3.5 + 2.0 = 5.5
        this.slashArcMesh.visible = false;
        this.slashArcGroup.add(this.slashArcMesh);

        // Slash trail para soco (unarmed)
        const unarmedArcGeo = new THREE.PlaneGeometry(3.0, 1.0);
        this.slashArcUnarmedMesh = new THREE.Mesh(unarmedArcGeo, this.matSlashArc);
        this.slashArcUnarmedMesh.rotation.x = -Math.PI / 2;
        this.slashArcUnarmedMesh.position.z = 1.5;
        this.slashArcUnarmedMesh.visible = false;
        this.slashArcGroup.add(this.slashArcUnarmedMesh);`;

content = content.replace(
    /        this\.slashArcGroup = new THREE\.Group\(\);\n        this\.group\.add\(this\.slashArcGroup\);\n        const arcGeo = new THREE\.TorusGeometry\(3\.5, 0\.4, 2, 20, Math\.PI\);\n        this\.slashArcMesh = new THREE\.Mesh\(arcGeo, this\.matSlashArc\);\n        this\.slashArcMesh\.rotation\.x = Math\.PI \/ 2;\n        this\.slashArcMesh\.position\.z = 2\.0; \/\/ edge reaches 3\.5 \+ 2\.0 = 5\.5\n        this\.slashArcMesh\.visible = false;\n        this\.slashArcGroup\.add\(this\.slashArcMesh\);/g,
    newSlashArcCode
);

fs.writeFileSync(path, content);
console.log("Penitent patched with unarmed slash arc.");
