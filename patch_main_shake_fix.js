const fs = require('fs');

const path = 'main.js';
let content = fs.readFileSync(path, 'utf8');

// Fix screen shake drift
// Remove the bad camera.position += dx logic
content = content.replace(
    /    \/\/ Apply screen shake\n    if \(window\.screenShake\.timer > 0\) \{\n        window\.screenShake\.timer -= window\.gameState\.delta;\n        if \(window\.screenShake\.timer <= 0\) \{\n            window\.screenShake\.intensity = 0;\n            window\.screenShake\.timer = 0;\n        \} else \{\n            \/\/ we decrease intensity linearly\n            window\.screenShake\.intensity -= window\.screenShake\.decay \* window\.gameState\.delta;\n            if\(window\.screenShake\.intensity < 0\) window\.screenShake\.intensity = 0;\n            \n            const dx = \(Math\.random\(\) - 0\.5\) \* window\.screenShake\.intensity \* 2\.0;\n            const dy = \(Math\.random\(\) - 0\.5\) \* window\.screenShake\.intensity \* 2\.0;\n            const dz = \(Math\.random\(\) - 0\.5\) \* window\.screenShake\.intensity \* 2\.0;\n            \n            camera\.position\.x \+= dx;\n            camera\.position\.y \+= dy;\n            camera\.position\.z \+= dz;\n            camera\.updateMatrixWorld\(\);\n        \}\n    \}\n/g,
    ''
);

// We need to apply the shake right before rendering, but we must restore the original camera position right after!
// Or we can just calculate dx, dy, dz and temporarily offset the camera.
const newShakeLogic = `    // Apply screen shake
    let shakeDx = 0, shakeDy = 0, shakeDz = 0;
    if (window.screenShake.timer > 0) {
        window.screenShake.timer -= window.gameState.delta;
        if (window.screenShake.timer <= 0) {
            window.screenShake.intensity = 0;
            window.screenShake.timer = 0;
        } else {
            window.screenShake.intensity -= window.screenShake.decay * window.gameState.delta;
            if(window.screenShake.intensity < 0) window.screenShake.intensity = 0;

            shakeDx = (Math.random() - 0.5) * window.screenShake.intensity * 2.0;
            shakeDy = (Math.random() - 0.5) * window.screenShake.intensity * 2.0;
            shakeDz = (Math.random() - 0.5) * window.screenShake.intensity * 2.0;

            camera.position.x += shakeDx;
            camera.position.y += shakeDy;
            camera.position.z += shakeDz;
            camera.updateMatrixWorld();
        }
    }

    renderer.render(scene, camera);

    if (shakeDx !== 0 || shakeDy !== 0 || shakeDz !== 0) {
        camera.position.x -= shakeDx;
        camera.position.y -= shakeDy;
        camera.position.z -= shakeDz;
        camera.updateMatrixWorld();
    }
`;

content = content.replace(
    /    renderer\.render\(scene, camera\);/g,
    newShakeLogic
);

fs.writeFileSync(path, content);
console.log("Main shake drift fixed.");
