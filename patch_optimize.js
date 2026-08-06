const fs = require('fs');
let code = fs.readFileSync('main.js', 'utf8');

const search = `            } else {
                const offset = new THREE.Vector3().subVectors(camera.position, controls.target);
                controls.target.lerp(playerPos, 8 * window.gameState.delta);
                camera.position.copy(controls.target).add(offset);
                controls.update();
            }`;

const replace = `            } else {
                if (!window.dynamicCameraOffset) window.dynamicCameraOffset = new THREE.Vector3();
                window.dynamicCameraOffset.subVectors(camera.position, controls.target);
                controls.target.lerp(playerPos, 8 * window.gameState.delta);
                camera.position.copy(controls.target).add(window.dynamicCameraOffset);
                controls.update();
            }`;

if (code.includes(search)) {
    code = code.replace(search, replace);
    fs.writeFileSync('main.js', code);
    console.log("Optimization patched successfully!");
} else {
    console.log("Search string not found.");
}
