import { SurvivalSystem } from './src/systems/SurvivalSystem.js';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Penitent } from './src/characters/Penitent.js';
import { HubEnvironment } from './src/world_builder/HubEnvironment.js';
import { ProceduralMap } from './src/world_builder/ProceduralMap.js';
import { WorldMap } from './src/world_builder/WorldMap.js';
import { MobileControls } from './src/ui/MobileControls.js';
import { InteractionManager } from './src/systems/InteractionManager.js';
import gameState from './src/core/GameState.js';
import { FloatingDamageManager } from './src/ui/FloatingDamageManager.js';
import { inventoryManager } from './src/systems/InventoryManager.js';

window.inventoryManager = inventoryManager;

window.floatingDamageManager = new FloatingDamageManager();

window.gainSkillXP = function(skillName, xpAmount) {
    if (window.gameState && window.gameState.skills) {
        if (!window.gameState.skills[skillName]) window.gameState.skills[skillName] = 0;
        window.gameState.skills[skillName] += xpAmount;
        // Logic for leveling up could go here
    }
};

window.showFloatingText = function(text, pos3d, color) {
    if (window.floatingDamageManager) {
        window.floatingDamageManager.createFloatingText(text, pos3d, color);
    }
};

window.addEventListener('error', (e) => {
    const errBox = document.getElementById('error-console');
    if (errBox) {
        errBox.style.display = 'block';
        errBox.innerText = '⚠️ ERRO:\n' + e.message + '\nLinha: ' + e.lineno;
        if (window._errorTimeout) clearTimeout(window._errorTimeout);
        window._errorTimeout = setTimeout(() => {
            errBox.style.display = 'none';
        }, 5000);
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
renderer.domElement.id = 'game-canvas';
renderer.domElement.classList.add('menu-active');
document.body.appendChild(renderer.domElement);

window.interactionManager = new InteractionManager(camera, renderer.domElement, () => {
    return currentEnvironment && currentEnvironment.interactiveObjects ? currentEnvironment.interactiveObjects : [];
});

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

const shadowDist = 35;
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

// Global state
gameState.load();
window.gameState = gameState;
window.gameState.clock = new THREE.Clock();
window.gameState.delta = 0;
window.gameState.time = 0;

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
const btnNewGame = document.getElementById('btn-new-game');

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
        introContainer.style.pointerEvents = 'none';
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
            menuContainer.style.pointerEvents = 'none';
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

            window.gameState.isGameStarted = true;
            const canvas = document.getElementById('game-canvas');
            if (canvas) canvas.classList.remove('menu-active');

            window.changeGameState('HUB');
        }, 1200);
    });
}

// Ação de novo jogo a partir do menu principal
if (btnNewGame) {
    btnNewGame.addEventListener('click', () => {
        if (confirm("Você tem certeza que deseja começar um novo jogo? Todo o seu progresso será perdido.")) {
            // Limpa dados de save
            localStorage.removeItem('A_GITHUB_ODYSSEY_SAVE');
            localStorage.removeItem('GHO_SaveData');

            // Reseta o estado em memória
            if (window.gameState) {
                window.gameState.resetToDefaults();
            }

            if (menuContainer) {
                menuContainer.style.opacity = '0';
                menuContainer.style.pointerEvents = 'none';
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

                window.gameState.isGameStarted = true;
                const canvas = document.getElementById('game-canvas');
            if (canvas) canvas.classList.remove('menu-active');

                window.changeGameState('HUB');
            }, 1200);
        }
    });
}

const buildModal = document.getElementById('build-modal');
const btnCloseModal = document.getElementById('btnCloseModal');
const btnEmbarkModal = document.getElementById('btnEmbarkModal');

// Initialize Inventory UI
let inventoryUI = null;
try {
import('./src/ui/InventoryUI.js').then(module => {
        window.inventoryUI = new module.InventoryUI();
    }).catch(err => {
        console.warn("Could not load InventoryUI, playing without it.", err);
    });

    try {
        import('./src/ui/ShopUI.js').then(module => {
            window.shopUI = new module.ShopUI();
        });
    } catch(e) {}
} catch (e) {
    console.warn("Could not dynamically import InventoryUI", e);
}

// Initialize Codex UI
let codexUI = null;
try {
    import('./src/ui/codex_ui.js').then(module => {
        codexUI = new module.CodexUI();
        window.codexUI = codexUI;
    }).catch(err => {
        console.warn("Could not load CodexUI", err);
    });
} catch (e) {
    console.warn("Could not dynamically import CodexUI", e);
}


// Inventory Toggle Event
window.addEventListener('keydown', (e) => {
    if (!window.gameState || !window.gameState.isGameStarted) return;

    if (e.code === 'KeyI' || e.key.toLowerCase() === 'i') {
        if (window.inventoryUI) {
            window.inventoryUI.toggle();
            controls.enabled = !window.inventoryUI.isOpen;
            console.log('Inventory toggled');
        } else {
            console.log('Inventory toggled (UI not attached)');
        }
    }

    if (e.code === 'Tab' || e.key === 'Tab') {
        e.preventDefault();
        if (GAME_STATE === 'HUB') {
            const tabMenu = document.getElementById('tab-menu');
            if (tabMenu) {
                if (tabMenu.classList.contains('hidden')) {
                    tabMenu.classList.remove('hidden');
                    window.hubBuildingState = 'UI_OPEN';
                    controls.enabled = false;

                    // Wire up the build buttons just like Eros interaction does
                    if (currentEnvironment) {
                        const buildTentBtn = document.getElementById('build-tent');
                        const buildCampfireBtn = document.getElementById('build-campfire');
                        if (buildTentBtn) buildTentBtn.onclick = () => {
                            currentEnvironment.startGridPlacement('tent');
                            tabMenu.classList.add('hidden');
                            document.getElementById('build-hint').classList.remove('hidden');
                        };
                        if (buildCampfireBtn) buildCampfireBtn.onclick = () => {
                            currentEnvironment.startGridPlacement('campfire');
                            tabMenu.classList.add('hidden');
                            document.getElementById('build-hint').classList.remove('hidden');
                        };
                    }
                } else {
                    tabMenu.classList.add('hidden');
                    window.hubBuildingState = 'EXPLORING';
                    controls.enabled = (!window.inventoryUI || !window.inventoryUI.isOpen) && (!window.codexUI || !window.codexUI.isOpen);
                }
            }
        }
        window.isBuildMode = !window.isBuildMode;
        console.log('Build Mode:', window.isBuildMode);
    }

    // Manage OrbitControls state for CodexUI as well
    if ((e.key.toLowerCase() === 'c' || e.key.toLowerCase() === 'j' || e.key === 'Escape') && window.codexUI) {
        // We defer updating orbit controls slightly because CodexUI's toggle runs synchronously in its own listener
        setTimeout(() => {
            controls.enabled = !window.codexUI.isOpen && (!window.inventoryUI || !window.inventoryUI.isOpen);
        }, 10);
    }
});

// Manage key states for continuous movement
window.keyStates = { w: false, a: false, s: false, d: false, ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false };

window.addEventListener('keydown', (e) => {
    if (!window.gameState || !window.gameState.isGameStarted) return;
    if (window.keyStates.hasOwnProperty(e.key)) window.keyStates[e.key] = true;
    if (window.keyStates.hasOwnProperty(e.key.toLowerCase())) window.keyStates[e.key.toLowerCase()] = true;
});
window.addEventListener('keyup', (e) => {
    if (!window.gameState || !window.gameState.isGameStarted) return;
    if (window.keyStates.hasOwnProperty(e.key)) window.keyStates[e.key] = false;
    if (window.keyStates.hasOwnProperty(e.key.toLowerCase())) window.keyStates[e.key.toLowerCase()] = false;
});

// Hub Interactions
window.addEventListener('keydown', (e) => {
    if (GAME_STATE === 'HUB') {
        if (e.key.toLowerCase() === 'e' && window.currentNearbyObject && window.hubBuildingState !== 'BUILDING_GRID') {
            window.currentNearbyObject.action();
        }
        if (e.key === 'Escape') {
            const tabMenu = document.getElementById('tab-menu');
            if (tabMenu && !tabMenu.classList.contains('hidden')) {
                tabMenu.classList.add('hidden');
                window.hubBuildingState = 'EXPLORING';
            } else if (window.hubBuildingState === 'BUILDING_GRID' && currentEnvironment) {
                currentEnvironment.cancelGridPlacement();
            } else if (window.hubBuildingState === 'BUILDING') {
                document.getElementById('btn-close-build').click();
            } else if (!document.getElementById('journal-ui').classList.contains('hidden')) {
                document.getElementById('btn-close-journal').click();
            }
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

const btnExpandSouth = document.getElementById('btn-expand-south');
if (btnExpandSouth) {
    btnExpandSouth.addEventListener('click', (e) => {
        e.stopPropagation();
        if (currentEnvironment && currentEnvironment.expandIslandSegment) {
            currentEnvironment.expandIslandSegment('south');
        }
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

// Codex button binding
const btnJournalNew = document.getElementById('btn-journal-new');
const btnMobileJournal = document.getElementById('btn-mobile-journal');

const toggleJournal = () => {
    if (window.codexUI) {
        window.codexUI.toggle();

        // Defer orbit controls update just like the keyboard shortcut
        setTimeout(() => {
            controls.enabled = !window.codexUI.isOpen && (!window.inventoryUI || !window.inventoryUI.isOpen);
        }, 10);
    }
};

if (btnJournalNew) {
    btnJournalNew.addEventListener('click', toggleJournal);
}

// Em alguns casos o script MobileControls roda depois que o main.js inicializa e o DOM carrega,
// então uma abordagem por event delegation no botão do diário mobile é mais segura.
document.addEventListener('click', (e) => {
    const btn = e.target.closest('#btn-mobile-journal');
    if (btn) {
        toggleJournal();
    }
});
document.addEventListener('touchstart', (e) => {
    const btn = e.target.closest('#btn-mobile-inventory');
    if (btn) {
        if (window.inventoryUI) {
            window.inventoryUI.toggle();
            controls.enabled = !window.inventoryUI.isOpen;
        }
    }
});

// Tab Switching in Eros Menu
window.hubBuildingState = 'EXPLORING';

// Initialize Background Scene for Menu

const btnCancelExpedition = document.getElementById('btn-cancel-expedition');
if (btnCancelExpedition) {
    btnCancelExpedition.addEventListener('click', (e) => {
        e.stopPropagation();
        window.isTransitioning = false;
        window.targetPortalPosition = null;
        if (currentEnvironment && currentEnvironment.closeExpeditionUI) {
            currentEnvironment.closeExpeditionUI();
        }
    });
}

const btnConfirmExpedition = document.getElementById('btn-confirm-expedition');
if (btnConfirmExpedition) {
    btnConfirmExpedition.addEventListener('click', (e) => {
        e.stopPropagation();
        window.isTransitioning = false;
        window.targetPortalPosition = null;
        if (currentEnvironment && currentEnvironment.closeExpeditionUI) {
            currentEnvironment.closeExpeditionUI();
        }
        window.changeGameState('WORLD_MAP');
    });
}

currentEnvironment = new HubEnvironment(scene);


const survivalSystem = new SurvivalSystem();
window.mobileControls = new MobileControls();


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
        // Update Mobile Controls Action Button based on Interaction Proximity
        if (window.mobileControls && window.mobileControls.isTouchDevice) {
            const hasInteraction = window.currentNearbyObject !== null && window.currentNearbyObject !== undefined;
            if (window.mobileControls.lastInteractionState !== hasInteraction) {
                window.mobileControls.updateActionState(hasInteraction);
                window.mobileControls.lastInteractionState = hasInteraction;
            }
        }

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
                    if (currentEnvironment && currentEnvironment.buildPivot) {
                        const speed = 25.0;
                        const delta = window.gameState.delta;
                        const dir = new THREE.Vector3();
                        camera.getWorldDirection(dir);
                        dir.y = 0; dir.normalize();
                        const right = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize();

                        if (window.keyStates.w || window.keyStates.ArrowUp) currentEnvironment.buildPivot.position.addScaledVector(dir, speed * delta);
                        if (window.keyStates.s || window.keyStates.ArrowDown) currentEnvironment.buildPivot.position.addScaledVector(dir, -speed * delta);
                        if (window.keyStates.a || window.keyStates.ArrowLeft) currentEnvironment.buildPivot.position.addScaledVector(right, -speed * delta);
                        if (window.keyStates.d || window.keyStates.ArrowRight) currentEnvironment.buildPivot.position.addScaledVector(right, speed * delta);
                    }

                    let camDistY = 35;
                    let camDistZ = 20;
                    if (currentEnvironment && currentEnvironment.selectedBuildType && (currentEnvironment.selectedBuildType === 'ilha_satelite' || currentEnvironment.selectedBuildType === 'ponte_magica')) {
                        camDistY = 60;
                        camDistZ = 35;
                    }
                    const pivotPos = (currentEnvironment && currentEnvironment.buildPivot) ? currentEnvironment.buildPivot.position : playerPos;
                    targetCamPos = pivotPos.clone().add(new THREE.Vector3(0, camDistY, camDistZ));
                    targetLookAt = pivotPos.clone();
                }

                if (window.isTransitioning) {
                    if (window.targetPortalPosition && typeof window.targetPortalPosition.x === 'number') {
                        camera.position.lerp(window.targetPortalPosition, 0.05);
                        controls.target.lerp(window.targetPortalPosition, 0.05);
                    } else {
                        console.warn("Posição de destino do portal inválida ou não definida.");
                        window.isTransitioning = false;
                    }
                } else {
                    if (targetCamPos && typeof targetCamPos.x === 'number') {
                        camera.position.lerp(targetCamPos, 5 * window.gameState.delta);
                    }
                    if (targetLookAt && typeof targetLookAt.x === 'number') {
                        controls.target.lerp(targetLookAt, 8 * window.gameState.delta);
                    }
                }

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
        // Real-time lighting update
        sunLight.position.set(playerPos.x + 30, playerPos.y + 40, playerPos.z + 30);
        sunLight.target.position.copy(playerPos);
        sunLight.target.updateMatrixWorld();
        currentEnvironment.update(window.gameState.delta, window.gameState.time, camera, playerPos);

    }

    if (GAME_STATE !== 'MENU') {
        survivalSystem.update(window.gameState.delta);

    }



    // Apply screen shake
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


    if (window.InvisibleUI && typeof penitent !== 'undefined' && penitent !== null) {
        window.InvisibleUI.update(window.gameState, penitent, window.gameState.delta);
    }

    if (window.interactionManager) {
        window.interactionManager.update();
    }

    if (window.floatingDamageManager) {
        window.floatingDamageManager.update(window.gameState.delta, camera, window.innerWidth, window.innerHeight);
    }
}

// Start loop
animate();

// Invisible UI Manager
window.InvisibleUI = {
    update: function(gameState, player, delta) {
        if (!player) return;

        const isHub = window.GAME_STATE === 'HUB';
        const isWorldMap = window.GAME_STATE === 'WORLD_MAP';
        const isMenu = window.GAME_STATE === 'MENU';

        const vitalsContainer = document.getElementById('vitals-container');
        const bottomVitals = document.getElementById('bottom-vitals');
        const weightContainer = document.getElementById('weight-container');

        const seal = document.getElementById('hub-status-ui');
        const mainHeader = document.getElementById('main-header');
        const hpVignette = document.getElementById('hp-critical-vignette');
        const weightVignette = document.getElementById('weight-critical-vignette');

        const hpPerc = gameState?.vitals?.hp ?? player?.hp ?? 0;
        const maxHp = gameState?.vitals?.maxHp ?? player?.maxHp ?? 100;
        const foodPerc = gameState?.vitals?.food ?? player?.food ?? 0;
        const waterPerc = gameState?.vitals?.water ?? player?.water ?? 0;

        const isInventoryOpen = document.getElementById('inventory-modal') && !document.getElementById('inventory-modal').classList.contains('hidden');
        const isHPAlert = hpPerc < 30;
        const isFoodAlert = foodPerc < 30;
        const isWaterAlert = waterPerc < 30;

        // --- Weight Logic ---
        // Need to parse current weight if available in DOM
        let isWeightAlert = false;
        let isWeightLow = true;
        const weightTextEl = document.getElementById('weight-text');
        if (weightTextEl) {
            const text = weightTextEl.innerText; // e.g. 12.4 / 25.0 kg
            const parts = text.split('/');
            if (parts.length === 2) {
                const current = parseFloat(parts[0]);
                const max = parseFloat(parts[1]);
                if (max > 0) {
                    const ratio = current / max;
                    if (ratio > 0.9) isWeightAlert = true;
                    if (ratio >= 0.7) isWeightLow = false;
                }
            }
        }

        // Apply Weight Vignette
        if (weightVignette) {
            if (isWeightAlert) {
                weightVignette.classList.add('active');
            } else {
                weightVignette.classList.remove('active');
            }
        }

        // Weight element fading
        if (weightContainer) {
            if (isInventoryOpen || isWeightAlert || !isWeightLow) {
                weightContainer.classList.add('ui-element-active');
                if (weightTextEl) weightTextEl.style.opacity = '1';
            } else {
                weightContainer.classList.remove('ui-element-active');
                if (weightTextEl) weightTextEl.style.opacity = '0.3';
            }
        }

        // Apply HP Vignette
        if (hpVignette) {
            if (isHPAlert) {
                hpVignette.classList.add('active');
            } else {
                hpVignette.classList.remove('active');
            }
        }

        // Main Vitals Fading (HP)
        if (vitalsContainer) {
            if (isInventoryOpen || isHPAlert || isFoodAlert || isWaterAlert || isMenu || isWorldMap) {
                vitalsContainer.classList.add('ui-element-active');
            } else {
                vitalsContainer.classList.remove('ui-element-active');
            }
        }

        // Bottom Vitals Fading (Food/Water)
        if (bottomVitals) {
            if (isInventoryOpen || isFoodAlert || isWaterAlert) {
                bottomVitals.classList.add('ui-element-active');
            } else {
                bottomVitals.classList.remove('ui-element-active');
            }
        }

        // Seal / Header Slide-Out
        // Prompt says: "Ao entrar em combate ou em áreas seguras, o selo desliza para fora da tela"
        // So slide out when combat active OR safe area (like HUB)? Wait, "áreas seguras" implies HUB.
        // Let's assume we slide it out in HUB or Combat, and slide it in during Exploration (ROGUELIKE)?
        // Wait, the prompt says "Um selo minimalista flutuante, translúcido. Exibe o nome do Nó atual... Ao entrar em combate ou em áreas seguras, o selo desliza para fora da tela."
        // We will slide it out if there is an active enemy nearby, or if it's the Hub (unless it's just meant for Hub too? We will check if it's HUB. Actually, in HUB it shows "Santuário Celeste" so maybe it shouldn't slide out there. The user probably means it slides IN when arriving in a new node, and then slides out during combat or after settling into a safe area. Let's base it on a timer or just active combat for now.)

        let inCombat = false;
        if (window.enemyManager && window.enemyManager.enemies && window.enemyManager.enemies.length > 0) {
            // Find if any enemy is close and chasing
            const playerPos = player.group.position;
            inCombat = window.enemyManager.enemies.some(e => {
                if (e.isDead || !e.group) return false;
                const d = e.group.position.distanceTo(playerPos);
                return d < 20 && e.state === 'chase';
            });
        }

        if (seal) {
            // Se inCombat ou "áreas seguras"? No roguelike, áreas sem inimigos poderiam ser consideradas seguras?
            // Vamos esconder se inCombat = true.
            if (inCombat) {
                seal.classList.add('slide-out-up');
                if(mainHeader) mainHeader.classList.add('slide-out-up');
            } else {
                seal.classList.remove('slide-out-up');
                if(mainHeader) mainHeader.classList.remove('slide-out-up');
            }
        }
    }
};
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
