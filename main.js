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
controls.dampingFactor = 0.05;
controls.maxPolarAngle = Math.PI / 1.9;
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

// Temporary Instructions update
const instructions = document.getElementById('instructions');
if (instructions) {
    instructions.innerHTML = "WASD: Mover | ESPAÇO: Saltar | SHIFT: Correr | Rato: Rodar Câmara";
}

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

            const instructions = document.getElementById('instructions');
            if (instructions) instructions.style.display = 'block';

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
    if (GAME_STATE === 'HUB' && currentEnvironment && currentEnvironment.isNearEros) {
        if (e.key.toLowerCase() === 'e' && !currentEnvironment.isModalOpen) {
            currentEnvironment.isModalOpen = true;
            if (buildModal) buildModal.style.display = 'flex';
            const prompt = document.getElementById('interaction-prompt');
            if (prompt) prompt.style.opacity = '0';
        }
    }
});

if (btnCloseModal) {
    btnCloseModal.addEventListener('click', () => {
        buildModal.style.display = 'none';
        if (currentEnvironment) {
            setTimeout(() => { currentEnvironment.isModalOpen = false; }, 100);
        }
    });
}

if (btnEmbarkModal) {
    btnEmbarkModal.addEventListener('click', () => {
        buildModal.style.display = 'none';
        if (currentEnvironment) currentEnvironment.isModalOpen = false;
        window.changeGameState('WORLD_MAP');
    });
}

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
        currentEnvironment = new HubEnvironment(scene);
        if (!penitent) {
            penitent = new Penitent(scene);
            window.penitentGroup = penitent.group;
            penitent.isGrounded = true;
        } else {
            if (penitent.group) penitent.group.visible = true;
            penitent.group.position.set(0, 5, 0);
        }
    } else if (GAME_STATE === 'WORLD_MAP') {
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

            controls.target.lerp(playerPos, 8 * window.gameState.delta);

            // Avoid creating a new Vector3 every frame
            if (!window.cameraOffset) window.cameraOffset = new THREE.Vector3(14, 18, 14);
            camera.position.copy(playerPos).add(window.cameraOffset);

            controls.update();
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