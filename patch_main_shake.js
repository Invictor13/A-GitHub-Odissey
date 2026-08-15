const fs = require('fs');

const path = 'main.js';
let content = fs.readFileSync(path, 'utf8');

// Add global screen shake variables and function
const shakeVariables = `
// Screen Shake Variables
window.screenShake = {
    intensity: 0,
    timer: 0,
    decay: 0
};

window.triggerScreenShake = function(intensity, duration) {
    window.screenShake.intensity = intensity;
    window.screenShake.timer = duration;
    window.screenShake.decay = intensity / duration;
};
`;

content = content.replace(
    /\/\/ Global state\ngameState\.load\(\);/g,
    shakeVariables + '\n// Global state\ngameState.load();'
);

// Apply screen shake logic in animate loop
// Find: controls.update();
// Wait, we can just apply screen shake right before renderer.render(scene, camera);
content = content.replace(
    /    renderer\.render\(scene, camera\);/g,
    `    // Apply screen shake
    if (window.screenShake.timer > 0) {
        window.screenShake.timer -= window.gameState.delta;
        if (window.screenShake.timer <= 0) {
            window.screenShake.intensity = 0;
            window.screenShake.timer = 0;
        } else {
            // we decrease intensity linearly
            window.screenShake.intensity -= window.screenShake.decay * window.gameState.delta;
            if(window.screenShake.intensity < 0) window.screenShake.intensity = 0;

            const dx = (Math.random() - 0.5) * window.screenShake.intensity * 2.0;
            const dy = (Math.random() - 0.5) * window.screenShake.intensity * 2.0;
            const dz = (Math.random() - 0.5) * window.screenShake.intensity * 2.0;

            camera.position.x += dx;
            camera.position.y += dy;
            camera.position.z += dz;
            camera.updateMatrixWorld();
        }
    }

    renderer.render(scene, camera);`
);

fs.writeFileSync(path, content);
console.log("Main patched with screen shake.");
