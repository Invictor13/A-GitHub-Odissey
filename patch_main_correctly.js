const fs = require('fs');
let code = fs.readFileSync('main.js', 'utf8');

const changeGameStateCode = `window.changeGameState = function(newState, params) {
    GAME_STATE = newState;

    // Cleanup previous environment
    if (currentEnvironment && typeof currentEnvironment.cleanup === 'function') {
        currentEnvironment.cleanup();

    }

    if (GAME_STATE === 'MENU') {
        if (window.mobileControls) window.mobileControls.hide();
    } else {
        if (window.mobileControls) window.mobileControls.show();
    }

    if (GAME_STATE === 'HUB') {
        currentEnvironment = new HubEnvironment(scene, camera);


        const hubUI = document.getElementById('hub-status-ui');
        if(hubUI) {
            hubUI.classList.remove('hidden');
            setTimeout(() => { hubUI.classList.remove('opacity-0'); }, 100);
        }

        if (!penitent) {
            penitent = new Penitent(scene);
            window.penitent = penitent;
            window.penitentGroup = penitent.group;
            penitent.isGrounded = true;
        } else {
            if (penitent.group) penitent.group.visible = true;

            // Check if there is a barraca to spawn at
            const barracaData = window.gameState && window.gameState.hubState && window.gameState.hubState.structures ? window.gameState.hubState.structures.find(s => s.type === 'barraca') : null;
            if (barracaData) {
                penitent.group.position.set(barracaData.x, barracaData.y + 0.1, barracaData.z + 3.2);
            } else {
                penitent.group.position.set(0, 5, 0);
            }
        }
        if (penitent.group) {
            camera.position.copy(penitent.group.position).add(new THREE.Vector3(14, 18, 14));
            controls.target.copy(penitent.group.position);

            // Connect attack callbacks for HUB to gather resources
            if (currentEnvironment && typeof currentEnvironment.checkMeleeHit === 'function') {
                penitent.setMeleeHitCallback((pos, fwd, dmg, dist) => {
                    currentEnvironment.checkMeleeHit(pos, fwd, dmg, dist);
                });
            } else {
                penitent.setMeleeHitCallback(null);
            }
        }
    } else if (GAME_STATE === 'WORLD_MAP') {
        const hubUI = document.getElementById('hub-status-ui');
        if(hubUI) {
            hubUI.classList.add('opacity-0');
            setTimeout(() => { hubUI.classList.add('hidden'); }, 500);
        }

        currentEnvironment = new WorldMap(scene);


        if (penitent && penitent.group) penitent.group.visible = false;

        camera.position.set(60, 70, 80);
        controls.target.set(0, 5, 0);

        console.log("Transição para o WORLD MAP em progresso...");
    } else if (GAME_STATE === 'ROGUELIKE') {
        const hubUI = document.getElementById('hub-status-ui');
        if(hubUI) {
            hubUI.classList.remove('hidden');
            setTimeout(() => { hubUI.classList.remove('opacity-0'); }, 100);
        }

        currentEnvironment = new ProceduralMap(scene);

        currentEnvironment.generateGrid(100, params?.islandData);
        const biome = params?.biome || 'campos_pastos';
        currentEnvironment.build3DGeometry(biome);
        if (penitent) {
            window.penitentGroup = penitent.group;
            if (penitent.group) penitent.group.visible = true;

            // Connect attack callbacks if in a procedurally generated map
            if (currentEnvironment instanceof ProceduralMap) {
                penitent.setMeleeHitCallback((pos, fwd, dmg, dist) => {
                    if (currentEnvironment.enemyManager) {
                        currentEnvironment.enemyManager.checkMeleeHit(pos, fwd, dmg, dist);
                    }
                });
            } else {
                penitent.setMeleeHitCallback(null);
            }

            const spawnPos = currentEnvironment.getPlayerSpawnPosition();
            penitent.group.position.copy(spawnPos);

            camera.position.copy(penitent.group.position).add(new THREE.Vector3(14, 18, 14));
            controls.target.copy(penitent.group.position);
        }
    }
};
`;

// Remove original definition
code = code.replace(changeGameStateCode, '');

// Insert just after controls instantiation so that `scene` and `camera` and `controls` exist
const insertPoint = code.indexOf('\nconst sunLight = new THREE.DirectionalLight(0xfff5b6, 1.2);');
code = code.slice(0, insertPoint) + '\n' + changeGameStateCode + '\n' + code.slice(insertPoint);

fs.writeFileSync('main.js', code);
console.log('Patched main.js');
