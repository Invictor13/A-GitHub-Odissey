import { SurvivalSystem } from './src/systems/SurvivalSystem.js';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Penitent } from './src/characters/Penitent.js';
import { HubEnvironment } from './src/world_builder/HubEnvironment.js';
import { ProceduralMap } from './src/world_builder/ProceduralMap.js';
import { WorldMap } from './src/world_builder/WorldMap.js';
import { MobileControls } from './src/ui/MobileControls.js';

window.addEventListener('error', (e) => {
    const errBox = document.getElementById('error-console');
    if (errBox) {
        errBox.style.display = 'block';
        errBox.innerText = '⚠️ ERRO:\n' + e.message + '\nLinha: ' + e.lineno;
    }

});

// --- CORE SYSTEM SETUP ---
const scene = new THREE.Scene();
scene.background = new THREE.Color('#0f172a');
scene.fog = new THREE.FogExp2('#0f172a', 0.007);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 500);
window.camera = camera;
camera.position.set(0, 20, 26);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.minDistance = 5;
controls.maxDistance = 100;
controls.dampingFactor = 0.05;

// Isometric angle based on Vector3(14, 18, 14) offset
const ISOMETRIC_PITCH = Math.atan2(Math.sqrt(14*14 + 14*14), 18);
controls.minPolarAngle = ISOMETRIC_PITCH;
controls.maxPolarAngle = ISOMETRIC_PITCH;
window.ISOMETRIC_PITCH = ISOMETRIC_PITCH; // Store globally for state switching

controls.mouseButtons = { LEFT: THREE.MOUSE.NONE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE };

// Global Lighting
// AmbientLight has been removed to favor specific HemisphereLight in environment scenes (ProceduralMap / WorldMap).

const shadowDist = 80;
const sunLight = new THREE.DirectionalLight(0xffedd5, 1.6);
sunLight.castShadow = true;
sunLight.shadow.mapSize.width = 1024;
sunLight.shadow.mapSize.height = 1024;
sunLight.shadow.camera.left = -shadowDist;
sunLight.shadow.camera.right = shadowDist;
sunLight.shadow.camera.top = shadowDist;
sunLight.shadow.camera.bottom = -shadowDist;
sunLight.shadow.camera.near = 0.5;
sunLight.shadow.camera.far = 200;
sunLight.shadow.bias = -0.0005;
scene.add(sunLight);
scene.add(sunLight.target);

const lightningLight = new THREE.DirectionalLight(0xe0f2fe, 0);
lightningLight.position.set(0, 50, 0);
scene.add(lightningLight);

// Global state
window.gameState = {
    clock: new THREE.Clock(),
    delta: 0,
    time: 0
};

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

window.showToast = function(msg, colorClass, iconClass) {
    const tc = document.getElementById("toast-container");
    if(!tc) return;
    const div = document.createElement("div");
    div.className = `glass-panel px-4 py-2 rounded-lg border border-amber-800/60 shadow-lg text-xs font-bold uppercase tracking-wide flex items-center gap-2 ${colorClass} fade-in animate-slide-up`;
    div.innerHTML = `<i class="fa-solid ${iconClass}"></i><span>${msg}</span>`;
    tc.appendChild(div);
    setTimeout(() => { div.style.opacity = "0"; setTimeout(() => div.remove(), 300); }, 3000);
};

// Game State Management
let GAME_STATE = 'MENU'; // 'MENU', 'HUB', 'WORLD_MAP', 'ROGUELIKE'
let currentEnvironment = null;
let penitent = null;

// UI Elements
// Captura dos novos elementos da Intro e Menu
const introContainer = document.getElementById('intro-container');
const introVideo = document.getElementById('intro-video');
const menuContainer = document.getElementById('main-menu-container');
const menuBgVideo = document.getElementById('menu-bg-video');
const btnPlayNew = document.getElementById('btn-play-new');

function transitionToMainMenu() {
    if (introContainer && introContainer.style.display === 'none') return;

    // Primeiro preparamos o Menu em Loop por trás (visível, mas sob a Intro)
    if (menuContainer) {
        menuContainer.style.display = 'block';
        menuContainer.style.opacity = '1';
    }
    if (menuBgVideo) {
        menuBgVideo.play().catch(err => console.log("Autoplay interceptado pelo navegador:", err));
    }

    // Fade-out da Intro cinematográfica (agora com o menu preparado por baixo)
    if (introContainer) {
        introContainer.style.opacity = '0';
    }


    setTimeout(() => {
        if (introContainer) {
            introContainer.style.display = 'none';
        }
        if (introVideo) {
            introVideo.pause();
        }
    }, 1000); // Duração sincronizada com o CSS transition
}

// Ouvintes de evento para transição da intro
if (introVideo) {
    introVideo.addEventListener('ended', transitionToMainMenu);
}
if (introContainer) {
    introContainer.addEventListener('click', transitionToMainMenu);
}
window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        if (introContainer && introContainer.style.display !== 'none') {
            e.preventDefault();
            transitionToMainMenu();
        }
    }
});

// Ação de iniciar o jogo a partir do novo menu principal
if (btnPlayNew) {
    btnPlayNew.addEventListener('click', () => {
        if (menuContainer) {
            menuContainer.style.opacity = '0';
        }
        setTimeout(() => {
            if (menuContainer) {
                menuContainer.style.display = 'none';
            }
            if (menuBgVideo) {
                menuBgVideo.pause();
            }

            const uiOverlay = document.getElementById('ui-overlay');
            if (uiOverlay) uiOverlay.style.display = 'flex';

            window.changeGameState('HUB');
        }, 1200);
    });
}

const buildModal = document.getElementById('build-modal');
const btnCloseModal = document.getElementById('btnCloseModal');
const btnEmbarkModal = document.getElementById('btnEmbarkModal');

// Initialize Inventory UI
let inventoryUI = null;
try {
    import('./src/ui/InventoryUI.js').then(module => {
        inventoryUI = new module.InventoryUI();
        window.inventoryUI = inventoryUI;
    }).catch(err => {
        console.warn("Could not load InventoryUI, playing without it.", err);
    });
} catch (e) {
    console.warn("Could not dynamically import InventoryUI", e);
}

// Inventory Toggle Event
window.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 'i' || e.key === 'Tab') {
        e.preventDefault();
        if (inventoryUI) {
            inventoryUI.toggle();
            controls.enabled = !inventoryUI.isOpen;
        }
    }
});

// Hub Interactions
window.addEventListener('keydown', (e) => {
    if (GAME_STATE === 'HUB') {
        if (e.key.toLowerCase() === 'e' && window.currentNearbyObject && window.hubBuildingState !== 'BUILDING_GRID') {
            window.currentNearbyObject.action();
        }
        if (e.key === 'Escape') {
            if (window.hubBuildingState === 'BUILDING_GRID' && currentEnvironment) {
                currentEnvironment.cancelGridPlacement();
            } else if (window.hubBuildingState === 'BUILDING') {
                document.getElementById('btn-close-build').click();
            } else if (!document.getElementById('journal-ui').classList.contains('hidden')) {
                document.getElementById('btn-close-journal').click();
            }
        }
        if (e.key.toLowerCase() === 'r' && window.hubBuildingState === 'BUILDING_GRID' && currentEnvironment && currentEnvironment.previewMesh) {
            currentEnvironment.previewRotationY += Math.PI / 8;
            currentEnvironment.previewMesh.rotation.y = currentEnvironment.previewRotationY;
        }
    }
});

// Setup Hub UI Event Listeners
const btnInteract = document.getElementById('interaction-prompt');
if(btnInteract) {
    btnInteract.addEventListener('click', () => {
        if (window.currentNearbyObject && GAME_STATE === 'HUB') {
            window.currentNearbyObject.action();
        }
    });
}

const btnCloseBuild = document.getElementById('btn-close-build');
if (btnCloseBuild) {
    btnCloseBuild.addEventListener('click', () => {
        window.hubBuildingState = 'EXPLORING';
        document.getElementById('build-ui').classList.add('hidden');
        document.getElementById('hub-status-ui').classList.remove('opacity-0');
    });
}

const btnCloseJournal = document.getElementById('btn-close-journal');
if (btnCloseJournal) {
    btnCloseJournal.addEventListener('click', () => {
        document.getElementById('journal-ui').classList.add('hidden');
    });
}

const btnCancelGrid = document.getElementById('btn-cancel-grid');
if (btnCancelGrid) {
    btnCancelGrid.addEventListener('click', () => {
        if(currentEnvironment) currentEnvironment.cancelGridPlacement();
    });
}

// Tab Switching in Eros Menu
const tabConstructionsBtn = document.getElementById('tab-btn-constructions');
const tabDecorationsBtn = document.getElementById('tab-btn-decorations');
const tabFloorsBtn = document.getElementById('tab-btn-floors');
const tabIslandsBtn = document.getElementById('tab-btn-islands');

const contentConstructions = document.getElementById('tab-content-constructions');
const contentDecorations = document.getElementById('tab-content-decorations');
const contentFloors = document.getElementById('tab-content-floors');
const contentIslands = document.getElementById('tab-content-islands');

function switchTab(activeBtn, showContent) {
    [tabConstructionsBtn, tabDecorationsBtn, tabFloorsBtn, tabIslandsBtn].forEach(b => { if(b) b.classList.remove('active'); });
    [contentConstructions, contentDecorations, contentFloors, contentIslands].forEach(c => { if(c) c.classList.add('hidden'); });

    if(activeBtn) activeBtn.classList.add('active');
    if(showContent) showContent.classList.remove('hidden');
}

if(tabConstructionsBtn) tabConstructionsBtn.addEventListener('click', () => switchTab(tabConstructionsBtn, contentConstructions));
if(tabDecorationsBtn) tabDecorationsBtn.addEventListener('click', () => switchTab(tabDecorationsBtn, contentDecorations));
if(tabFloorsBtn) tabFloorsBtn.addEventListener('click', () => switchTab(tabFloorsBtn, contentFloors));
if(tabIslandsBtn) tabIslandsBtn.addEventListener('click', () => switchTab(tabIslandsBtn, contentIslands));

// Card Click Event Bindings
const bindCard = (id, type) => {
    const el = document.getElementById(id);
    if(el) el.addEventListener('click', (e) => {
        e.stopPropagation();
        if(currentEnvironment) currentEnvironment.startGridPlacement(type);
    });
};

bindCard('card-build-tent', 'barraca');
bindCard('card-build-campfire', 'fogueira');
bindCard('card-build-fence', 'fence');
bindCard('card-build-bench', 'bench');
bindCard('card-build-lantern', 'lantern');
bindCard('card-build-target', 'target');
bindCard('card-build-tree', 'tree');
bindCard('card-build-pot', 'pot');
bindCard('card-build-chest', 'chest');
bindCard('card-build-mud-tile', 'mud_tile');
bindCard('card-build-stone-tile', 'stone_tile');
bindCard('card-build-wood-tile', 'wood_tile');
bindCard('card-build-granite-tile', 'granite_tile');
bindCard('card-build-satellite-island', 'ilha_satelite');
bindCard('card-build-magic-bridge', 'ponte_magica');

const cardEmbark = document.getElementById('card-embark');
if(cardEmbark) {
    cardEmbark.addEventListener('click', (e) => {
        e.stopPropagation();
        if (btnCloseBuild) btnCloseBuild.click();
        window.changeGameState('WORLD_MAP');
    });
}

window.hubBuildingState = 'EXPLORING';

// Initialize Background Scene for Menu
currentEnvironment = new HubEnvironment(scene);

const survivalSystem = new SurvivalSystem();
window.mobileControls = new MobileControls();

window.changeGameState = function(newState, params) {
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

// Main Animation Loop
function animate() {
    requestAnimationFrame(animate);

    window.gameState.delta = Math.min(window.gameState.clock.getDelta(), 0.1);
    window.gameState.time = window.gameState.clock.getElapsedTime();

    if (GAME_STATE === 'MENU' && currentEnvironment && currentEnvironment.hubGroup) {
        currentEnvironment.hubGroup.rotation.y += window.gameState.delta * 0.05;
        camera.position.set(0, 15, 30);
        controls.target.set(0, 0, 0);
        controls.update();
    } else if (GAME_STATE === 'WORLD_MAP') {
        controls.update();
    } else if (penitent) {
        const getFloorFunc = (pos) => (currentEnvironment && typeof currentEnvironment.getFloorY === 'function') ? currentEnvironment.getFloorY(pos) : 0;
        const checkCollisionFunc = (pos, radius) => (currentEnvironment && typeof currentEnvironment.checkCollision === 'function') ? currentEnvironment.checkCollision(pos, radius) : false;

        let mapBounds = null;
        if (currentEnvironment && currentEnvironment.gridSize) {
            const halfSize = currentEnvironment.gridSize / 2;
            mapBounds = {
                minX: -halfSize + 2,
                maxX: halfSize - 2,
                minZ: -halfSize + 2,
                maxZ: halfSize - 2
            };
        }

        const getMapBoundsFunc = () => mapBounds;

        penitent.update(window.gameState.delta, camera, getFloorFunc, getMapBoundsFunc, checkCollisionFunc);

        if (penitent.group && penitent.group.visible) {
            const playerPos = penitent.group.position;

            let targetCamPos, targetLookAt;

            if (GAME_STATE === 'HUB' && window.hubBuildingState && window.hubBuildingState !== 'EXPLORING') {
                // Free pitch during specific building/tent states
                controls.minPolarAngle = 0;
                controls.maxPolarAngle = Math.PI;

                if (window.hubBuildingState === 'INSIDE_TENT') {
                    targetCamPos = playerPos.clone().add(new THREE.Vector3(0, 4.5, 6.2));
                    targetLookAt = playerPos.clone().add(new THREE.Vector3(0, 1.2, -0.5));
                } else if (window.hubBuildingState === 'BUILDING') {
                    targetCamPos = new THREE.Vector3(2.5, 7.0, 7.0);
                    targetLookAt = new THREE.Vector3(2.5, 0.5, 0.5);
                } else if (window.hubBuildingState === 'BUILDING_GRID') {
                    targetCamPos = playerPos.clone().add(new THREE.Vector3(0, 22, 12));
                    targetLookAt = playerPos.clone();
                }

                camera.position.lerp(targetCamPos, 5 * window.gameState.delta);
                controls.target.lerp(targetLookAt, 8 * window.gameState.delta);
                controls.update();
            } else {
                // Lock isometric pitch for exploring
                if (window.ISOMETRIC_PITCH) {
                    controls.minPolarAngle = window.ISOMETRIC_PITCH;
                    controls.maxPolarAngle = window.ISOMETRIC_PITCH;
                }
                if (!window.dynamicCameraOffset) {
                    window.dynamicCameraOffset = new THREE.Vector3(14, 18, 14);
                }

                // Atualiza o offset dinâmico com base na posição da câmera e no target
                window.dynamicCameraOffset.subVectors(camera.position, controls.target);

                // Interpola suavemente o target (ponto de foco) para o player
                controls.target.lerp(playerPos, 8 * window.gameState.delta);

                // Move a câmera junto com o player mantendo o offset (distância e rotação azimutal definida pelo player)
                camera.position.copy(controls.target).add(window.dynamicCameraOffset);

                controls.update();
            }
        }
    }
    // Trava de segurança para a posição do jogador
    const playerPos = (penitent && penitent.group && penitent.group.position && typeof penitent.group.position.x === 'number')
        ? penitent.group.position
        : new THREE.Vector3(0, 0, 0);

    if (currentEnvironment && typeof currentEnvironment.update === 'function') {
        currentEnvironment.update(window.gameState.delta, window.gameState.time, camera, playerPos);

    }

    if (GAME_STATE !== 'MENU') {
        survivalSystem.update(window.gameState.delta);

    }

    renderer.render(scene, camera);
}

// Start loop
animate();