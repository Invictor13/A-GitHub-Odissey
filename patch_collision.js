const fs = require('fs');

let content = fs.readFileSync('src/world_builder/HubEnvironment.js', 'utf8');

content = content.replace(/checkCollision\(pos, radius\) \{[\s\S]*?return false;\n    \}/, `checkCollision(pos, radius) {
        if (!this.terrain) return false;

        // Prevent falling out of bounds
        if (Math.abs(pos.x) >= 9.5 || Math.abs(pos.z) >= 9.5) {
            return true;
        }

        // Define player bounding box
        const playerBox = new THREE.Box3();
        const r = radius || 0.3; // Default player radius
        const h = 1.8; // Default player height

        // Add a small epsilon to min Y to ignore the floor directly beneath the player's feet
        playerBox.min.set(pos.x - r, pos.y + 0.1, pos.z - r);
        playerBox.max.set(pos.x + r, pos.y + h, pos.z + r);

        const colliders = this.terrain.getColliders();
        for (let i = 0; i < colliders.length; i++) {
            if (playerBox.intersectsBox(colliders[i])) {
                return true; // Collision detected
            }
        }
        return false;
    }`);

fs.writeFileSync('src/world_builder/HubEnvironment.js', content);
