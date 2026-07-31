
import { SurvivalSystem } from './src/systems/SurvivalSystem.js';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Penitent } from './src/characters/Penitent.js';
import { HubEnvironment } from './src/world_builder/HubEnvironment.js';
import { ProceduralMap } from './src/world_builder/ProceduralMap.js';
import { WorldMap } from './src/world_builder/WorldMap.js';

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
const hemiLight = new THREE.HemisphereLight(0xe0f2fe, 0x0f172a, 0.4);
scene.add(hemiLight);

const ambientLight = new THREE.AmbientLight(0xf0fdf4, 0.2);
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight(0xffedd5, 1.8);
sunLight.castShadow = true;
sunLight.shadow.mapSize.width = 2048;
sunLight.shadow.mapSize.height = 2048;
const shadowDist = 80;
sunLight.shadow.camera.left = -shadowDist;
sunLight.shadow.camera.right = shadowDist;
sunLight.shadow.camera.top = shadowDist;
sunLight.shadow.camera.bottom = -shadowDist;
sunLight.shadow.camera.near = 0.5;
sunLight.shadow.camera.far = 250;
sunLight.shadow.bias = -0.0003;
scene.add(sunLight);
scene.add(sunLight.target);

// Temporary Instructions update
const instructions = document.getElementById('instructions');
if(instructions) {
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

// Game State Management
let GAME_STATE = 'MENU'; // 'MENU', 'HUB', 'WORLD_MAP', 'ROGUELIKE'
let currentEnvironment = null;
let penitent = null;

// UI Elements
const mainMenu = document.getElementById('main-menu');
const btnPlay = document.getElementById('btn-play');

if(btnPlay) {
    btnPlay.addEventListener('click', () => {
        mainMenu.style.display = 'none';
        if(instructions) instructions.style.display = 'block';
        window.changeGameState('HUB');
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
    if(GAME_STATE === 'HUB' && currentEnvironment && currentEnvironment.isNearDog) {
        if(e.key.toLowerCase() === 'e' && !currentEnvironment.isModalOpen) {
            currentEnvironment.isModalOpen = true;
            if(buildModal) buildModal.style.display = 'flex';
            const prompt = document.getElementById('interaction-prompt');
            if(prompt) prompt.style.opacity = '0';
        }
    }
});

if(btnCloseModal) {
    btnCloseModal.addEventListener('click', () => {
        buildModal.style.display = 'none';
        if(currentEnvironment) {
            setTimeout(() => { currentEnvironment.isModalOpen = false; }, 100);
        }
    });
}

if(btnEmbarkModal) {
    btnEmbarkModal.addEventListener('click', () => {
        buildModal.style.display = 'none';
        if(currentEnvironment) currentEnvironment.isModalOpen = false;
        window.changeGameState('WORLD_MAP');
    });
}

// Initialize Background Scene for Menu
currentEnvironment = new HubEnvironment(scene);

const survivalSystem = new SurvivalSystem();



window.changeGameState = function(newState, params) {
    GAME_STATE = newState;

    // Cleanup previous environment
    if (currentEnvironment && typeof currentEnvironment.cleanup === 'function') {
        currentEnvironment.cleanup();
    }

    if (GAME_STATE === 'HUB') {
        currentEnvironment = new HubEnvironment(scene);
        if (!penitent) {
            penitent = new Penitent(scene);
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
        currentEnvironment.generateGrid(14, params?.islandData);
        const biome = params?.biome || 'campos_pastos';
        currentEnvironment.build3DGeometry(biome);
        if (penitent) {
            if (penitent.group) penitent.group.visible = true;
            penitent.group.position.set(0, 10, 0);
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
        const getFloorFunc = (pos) => (currentEnvironment && currentEnvironment.getFloorY) ? currentEnvironment.getFloorY(pos) : 0;
        penitent.update(window.gameState.delta, camera, getFloorFunc);

        if (penitent.group && penitent.group.visible) {
            const prevTarget = controls.target.clone();
            controls.target.lerp(penitent.playerGroup.position, 8 * window.gameState.delta);
            const camShift = new THREE.Vector3().subVectors(controls.target, prevTarget);
            camera.position.add(camShift);
            controls.update();
        }
    }

    if (currentEnvironment && currentEnvironment.update) {
        currentEnvironment.update(window.gameState.delta, window.gameState.time, camera, penitent ? penitent.playerGroup.position : new THREE.Vector3());
    }

    if (GAME_STATE !== 'MENU') {
        survivalSystem.update(window.gameState.delta);
    }

    renderer.render(scene, camera);
}

// Start loop
animate();
