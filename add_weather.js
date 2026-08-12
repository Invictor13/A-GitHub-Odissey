const fs = require('fs');

const file = 'src/world_builder/ProceduralMap.js';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('Weather System')) {
    // 1. Add Weather variables to constructor
    content = content.replace('this.hemisphereLight = new THREE.HemisphereLight(0x0f172a, 0x1f4214, 0.6);',
        `this.hemisphereLight = new THREE.HemisphereLight(0x0f172a, 0x1f4214, 0.6);\n\n        // Weather System\n        this.weatherType = Math.random() < 0.3 ? 'RAIN' : 'CLEAR';\n        this.weatherParticles = null;\n        this.weatherTimer = 0;\n        this.lightningTimer = 0;\n        this.setupWeather();`);

    // 2. Add setupWeather method
    content = content.replace('generateGrid(size, islandData = null)',
        `setupWeather() {\n        if (this.weatherType === 'CLEAR') return;\n\n        const particleCount = 2000;\n        const geo = new THREE.BufferGeometry();\n        const pos = new Float32Array(particleCount * 3);\n        const vel = [];\n\n        for (let i = 0; i < particleCount; i++) {\n            pos[i * 3] = (Math.random() - 0.5) * 40;\n            pos[i * 3 + 1] = Math.random() * 20;\n            pos[i * 3 + 2] = (Math.random() - 0.5) * 40;\n            vel.push(0, -10 - Math.random() * 10, 0);\n        }\n\n        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));\n        const mat = new THREE.PointsMaterial({ color: 0xaaaaaa, size: 0.1, transparent: true, opacity: 0.6 });\n        this.weatherParticles = new THREE.Points(geo, mat);\n        this.weatherParticles.userData.velocities = vel;\n        this.scene.add(this.weatherParticles);\n    }\n\n    generateGrid(size, islandData = null)`);

    // 3. Add weather update logic to update()
    content = content.replace('this.grassUniforms.uTime.value = time;',
        `this.grassUniforms.uTime.value = time;\n        \n        // Update Weather\n        if (this.weatherParticles) {\n            this.weatherParticles.position.x = targetPos.x;\n            this.weatherParticles.position.z = targetPos.z;\n            const posAttr = this.weatherParticles.geometry.attributes.position;\n            const vel = this.weatherParticles.userData.velocities;\n            for (let i = 0; i < posAttr.count; i++) {\n                let y = posAttr.getY(i) + vel[i*3+1] * delta;\n                if (y < 0) y = 20;\n                posAttr.setY(i, y);\n            }\n            posAttr.needsUpdate = true;\n            \n            // Lightning flash\n            this.lightningTimer -= delta;\n            if (this.lightningTimer <= 0) {\n                if (Math.random() < 0.1) {\n                    const lightningLight = this.scene.children.find(c => c.type === 'DirectionalLight' && c.color.getHex() === 0xe0f2fe);\n                    if (lightningLight) {\n                        lightningLight.intensity = 2.0;\n                        setTimeout(() => { if (lightningLight) lightningLight.intensity = 0; }, 100);\n                    }\n                }\n                this.lightningTimer = Math.random() * 5 + 2;\n            }\n        }\n`);

    // 4. Add weather cleanup to cleanup()
    content = content.replace('this.enemyManager.cleanup();',
        `if (this.weatherParticles) {\n            this.scene.remove(this.weatherParticles);\n            this.weatherParticles.geometry.dispose();\n            this.weatherParticles.material.dispose();\n            this.weatherParticles = null;\n        }\n        this.enemyManager.cleanup();`);

    fs.writeFileSync(file, content);
}
