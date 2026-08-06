const fs = require('fs');
let code = fs.readFileSync('main.js', 'utf8');

const search = `                controls.target.lerp(playerPos, 8 * window.gameState.delta);

                // Avoid creating a new Vector3 every frame
                if (!window.cameraOffset) window.cameraOffset = new THREE.Vector3(14, 18, 14);
                camera.position.copy(playerPos).add(window.cameraOffset);

                controls.update();`;

const replace = `                const offset = new THREE.Vector3().subVectors(camera.position, controls.target);
                controls.target.lerp(playerPos, 8 * window.gameState.delta);
                camera.position.copy(controls.target).add(offset);
                controls.update();`;

if (code.includes(search)) {
    code = code.replace(search, replace);
    fs.writeFileSync('main.js', code);
    console.log("Patched successfully!");
} else {
    console.log("Search string not found.");
}
