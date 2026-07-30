import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Penitent } from './characters/Penitent.js';
import { HubEnvironment } from './world_builder/HubEnvironment.js';
import { ProceduralMap } from './world_builder/ProceduralMap.js';

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
export const gameState = {
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

// Initialize Environment and Character
// NOTE: Temporarily swapping HubEnvironment for ProceduralMap to test generation
// const environment = new HubEnvironment(scene);

const environment = new ProceduralMap(scene);
environment.generateGrid(14);
environment.build3DGeometry('campos_pastos');

const penitent = new Penitent(scene);
penitent.isGrounded = true; // Let gravity handle it, but hint we are starting on ground.

// Position player at the center of the first generated room
if (environment.rooms && environment.rooms.length > 0) {
    const spawn = environment.rooms[0];
    const offsetX = -environment.mapW/2;
    const offsetZ = -environment.mapH/2;
    penitent.playerGroup.position.set(spawn.cx + offsetX, 10, spawn.cy + offsetZ);
}


// Main Animation Loop
function animate() {
    requestAnimationFrame(animate);

    gameState.delta = Math.min(gameState.clock.getDelta(), 0.1);
    gameState.time = gameState.clock.getElapsedTime();

    // Update Environment (wind, chunk culling, anti-occlusion)
    environment.update(gameState.delta, gameState.time, camera, penitent.playerGroup.position);

    // Update Character Movement and Animation
    penitent.update(gameState.delta, camera, (pos) => environment.getFloorY(pos));

    // Camera follow player
    const prevTarget = controls.target.clone();
    controls.target.lerp(penitent.playerGroup.position, 8 * gameState.delta);
    const camShift = new THREE.Vector3().subVectors(controls.target, prevTarget);
    camera.position.add(camShift);

    controls.update();
    renderer.render(scene, camera);
}

// Start loop
animate();