import * as THREE from 'three';
import gameState from '../core/GameState.js';
import { Eros } from '../characters/Eros.js';
import { StructureBuilder } from './structures/StructureBuilder.js';
import { HubTerrain } from './hub_terrain.js';
import { HubResources } from './hub_resources.js';
import { disposeHierarchy } from '../core/GraphicsUtils.js';



const WEATHER_TYPES = {
    SUNNY: { name: 'Ensolarado', icon: 'fa-sun', color: '#facc15' },
    LIGHT_RAIN: { name: 'Chuva Leve', icon: 'fa-cloud-rain', color: '#38bdf8' },
    STORM: { name: 'Tempestade', icon: 'fa-bolt', color: '#a855f7' },
    WINDY: { name: 'Ventania', icon: 'fa-wind', color: '#94a3b8' },
    SNOW: { name: 'Neve', icon: 'fa-snowflake', color: '#e2e8f0' }
};

export class HubEnvironment {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;
        this.hubGroup = new THREE.Group();
        this.scene.add(this.hubGroup);

        this.skyGroup = new THREE.Group();
        this.scene.add(this.skyGroup);

        this.interactiveObjects = [];



        this.isNearEros = false;
        this.isModalOpen = false;
        this.erosWaitTimer = 3.0;
        this.erosTargetPos = new THREE.Vector3(4.0, 0.4, 4.0);

        // Grid System
        this.gridHelper = null;
        this.gridPlane = null;
        this.previewMesh = null;
        this.selectedBuildType = null;
        this.previewRotationY = 0;
        this.canPlaceInGrid = false;

        // Drag Build System for Floors
        this.isDraggingBuild = false;
        this.lastBuiltPos = new THREE.Vector3();

        // Build Pivot for Free Camera
        this.buildPivot = new THREE.Object3D();
        this.scene.add(this.buildPivot);

        this.raycaster = new THREE.Raycaster();
        this.mouseVec = new THREE.Vector2();
        this.gridSnapPos = new THREE.Vector3();



        this.setupMaterials();
        this.setupLightingAndSky();

        // Initialize Voxel Terrain
        this.terrain = new HubTerrain(this.scene);
        this.hubGroup.add(this.terrain.group);

        // Initialize Native Resources (Trees, Rocks)
        this.resources = new HubResources(this.scene, this.terrain);

        this.setupEnvironment();
        this.setupEros();
        this.setupPortal();

        this.setupWeatherParticles();

        this.updateTimeAndWeatherHUD();
    }

    setupMaterials() {
        // Procedural Textures
        const createBumpTexture = (type, size = 256) => {
            const canvas = document.createElement('canvas'); canvas.width = size; canvas.height = size;
            const ctx = canvas.getContext('2d'); const imgData = ctx.createImageData(size, size);
            for (let i = 0; i < imgData.data.length; i += 4) {
                let val = 128;
                if (type === 'leather') val += (Math.random() * 80) - 40;
                else if (type === 'hair') val += (Math.sin(Math.floor((i / 4) / size) * 0.5) * 40) + (Math.random() * 30) - 15;
                else if (type === 'cloth') val += (Math.sin((i / 4) % size) * 20) + (Math.cos(Math.floor((i / 4) / size)) * 20);
                else if (type === 'noise') val += (Math.random() * 120) - 60;
                imgData.data[i] = imgData.data[i+1] = imgData.data[i+2] = val; imgData.data[i+3] = 255;
            }
            ctx.putImageData(imgData, 0, 0); const tex = new THREE.CanvasTexture(canvas);
            tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.RepeatWrapping; return tex;
        };

        this.texLeatherBump = createBumpTexture('leather');
        this.texClothBump = createBumpTexture('cloth', 128);
        this.texNoiseBump = createBumpTexture('noise', 256);

        const matBase = { roughness: 0.85, flatShading: true };
        this.matRock = new THREE.MeshStandardMaterial({ color: 0x64748b, bumpMap: this.texNoiseBump, bumpScale: 0.05, ...matBase });
        this.matDirt = new THREE.MeshStandardMaterial({ color: 0x291d16, bumpMap: this.texNoiseBump, bumpScale: 0.08, ...matBase });
        this.matWood = new THREE.MeshStandardMaterial({ color: 0x5c2b0c, bumpMap: this.texLeatherBump, bumpScale: 0.05, ...matBase });
        this.matGrass = new THREE.MeshStandardMaterial({ color: 0x15803d, bumpMap: this.texNoiseBump, bumpScale: 0.03, roughness: 0.8, flatShading: true });

    }

    setupLightingAndSky() {
        this.hemiLight = new THREE.HemisphereLight(0xffffff, 0x1e293b, 0.7);
        this.skyGroup.add(this.hemiLight);

        this.ambientLight = new THREE.AmbientLight(0xffffff, 0.25);
        this.skyGroup.add(this.ambientLight);

        // Sun Directional Light
        this.sunLight = new THREE.DirectionalLight(0xfff7e6, 1.35);
        this.sunLight.position.set(40, 60, 20);
        this.sunLight.castShadow = true;
        this.sunLight.shadow.mapSize.width = 2048;
        this.sunLight.shadow.mapSize.height = 2048;
        this.sunLight.shadow.camera.near = 0.5;
        this.sunLight.shadow.camera.far = 160;
        const d = 35;
        this.sunLight.shadow.camera.left = -d; this.sunLight.shadow.camera.right = d;
        this.sunLight.shadow.camera.top = d; this.sunLight.shadow.camera.bottom = -d;
        this.sunLight.shadow.bias = -0.0003;
        this.skyGroup.add(this.sunLight);

        // Moon Light
        this.moonLight = new THREE.DirectionalLight(0x818cf8, 0.0);
        this.moonLight.position.set(-40, -60, -20);
        this.skyGroup.add(this.moonLight);

        // Sun 3D Orb
        const sunGeo = new THREE.SphereGeometry(3.5, 32, 32);
        const sunMat = new THREE.MeshBasicMaterial({ color: 0xfff099 });
        this.sunMesh = new THREE.Mesh(sunGeo, sunMat);
        this.skyGroup.add(this.sunMesh);

        // Moon 3D Orb
        const moonGeo = new THREE.SphereGeometry(2.8, 32, 32);
        const moonMat = new THREE.MeshStandardMaterial({ color: 0xe0e7ff, roughness: 0.9, emissive: 0x312e81, emissiveIntensity: 0.3 });
        this.moonMesh = new THREE.Mesh(moonGeo, moonMat);
        this.skyGroup.add(this.moonMesh);

        // Starfield
        const starCount = 600;
        const starGeo = new THREE.BufferGeometry();
        const starPositions = new Float32Array(starCount * 3);
        for(let i = 0; i < starCount; i++) {
            const u = Math.random();
            const v = Math.random();
            const theta = u * Math.PI * 2;
            const phi = Math.acos(2 * v - 1);
            const r = 280 + Math.random() * 40;
            starPositions[i*3] = r * Math.sin(phi) * Math.cos(theta);
            starPositions[i*3+1] = Math.abs(r * Math.cos(phi));
            starPositions[i*3+2] = r * Math.sin(phi) * Math.sin(theta);
        }
        starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
        this.starMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 1.5, transparent: true, opacity: 0 });
        this.starSystem = new THREE.Points(starGeo, this.starMaterial);
        this.skyGroup.add(this.starSystem);

        // Distant Floating Islands
        this.distantIslands = [];
        const islandMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.9, flatShading: true });
        const grassMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.8, flatShading: true });

        for(let i = 0; i < 5; i++) {
            const distGroup = new THREE.Group();
            const angle = (i / 5) * Math.PI * 2 + 0.4;
            const dist = 90 + Math.random() * 30;

            const topGeo = new THREE.CylinderGeometry(8 + Math.random() * 4, 6, 2, 8);
            const topMesh = new THREE.Mesh(topGeo, grassMat);
            distGroup.add(topMesh);

            const botGeo = new THREE.ConeGeometry(6, 12, 8);
            const botMesh = new THREE.Mesh(botGeo, islandMat);
            botMesh.position.y = -6;
            botMesh.rotation.x = Math.PI;
            distGroup.add(botMesh);

            distGroup.position.set(Math.cos(angle) * dist, 5 + (Math.random() - 0.5) * 15, Math.sin(angle) * dist);
            this.skyGroup.add(distGroup);
            this.distantIslands.push(distGroup);
        }

    }

    setupEnvironment() {
        // Volumetric Clouds (sky clouds)
        this.skyClouds = [];
        const matCloud = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1.0, flatShading: true });
        for(let i=0; i<10; i++) {
            const cloud = new THREE.Group();
            for(let j=0; j<5; j++) {
                const puff = new THREE.Mesh(new THREE.IcosahedronGeometry(Math.random() * 2 + 2, 0), matCloud);
                puff.position.set((Math.random()-0.5)*5, (Math.random()-0.5)*2, (Math.random()-0.5)*5);
                cloud.add(puff);
            }
            cloud.position.set((Math.random()-0.5)*140, 22 + Math.random()*12, (Math.random()-0.5)*120);
            cloud.userData = { speed: Math.random() * 1.0 + 0.3 };
            this.skyClouds.push(cloud); this.skyGroup.add(cloud);
        }

        // Island bottom clouds
        this.islandBottomClouds = [];
        const matBotCloud = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.9, transparent: true, opacity: 0.85 });
        for(let i=0; i<8; i++) {
            const cloud = new THREE.Group();
            for(let j=0; j<4; j++) {
                const puff = new THREE.Mesh(new THREE.DodecahedronGeometry(Math.random() * 2.8 + 2, 0), matBotCloud);
                puff.position.set((Math.random()-0.5)*4, (Math.random()-0.5)*1.5, (Math.random()-0.5)*4);
                cloud.add(puff);
            }
            const angle = (i / 8) * Math.PI * 2;
            const r = 12 + Math.random() * 5;
            cloud.position.set(Math.cos(angle) * r, -2.5 - Math.random() * 3, Math.sin(angle) * r);
            cloud.userData = { speed: Math.random() * 0.8 + 0.2 };
            this.hubGroup.add(cloud);
            this.islandBottomClouds.push(cloud);
        }
    }

    setupPortal() {
        const portalGroup = new THREE.Group();
        const x = 0, y = 2.0, z = -8.0;
        portalGroup.position.set(x, y, z);

        const stoneMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.8, flatShading: true });

        // Base platform for portal
        const platformMesh = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.2, 1.5), stoneMat);
        platformMesh.position.y = 0.1;
        platformMesh.receiveShadow = true; platformMesh.castShadow = true;
        portalGroup.add(platformMesh);

        // Pillars
        const pillarGeo = new THREE.BoxGeometry(0.8, 3.5, 0.8);
        const leftPillar = new THREE.Mesh(pillarGeo, stoneMat);
        leftPillar.position.set(-1.5, 1.9, 0);
        leftPillar.receiveShadow = true; leftPillar.castShadow = true;
        portalGroup.add(leftPillar);

        const rightPillar = new THREE.Mesh(pillarGeo, stoneMat);
        rightPillar.position.set(1.5, 1.9, 0);
        rightPillar.receiveShadow = true; rightPillar.castShadow = true;
        portalGroup.add(rightPillar);

        // Arch (Top)
        const archGeo = new THREE.BoxGeometry(3.8, 0.8, 0.8);
        const arch = new THREE.Mesh(archGeo, stoneMat);
        arch.position.set(0, 3.9, 0);
        arch.receiveShadow = true; arch.castShadow = true;
        portalGroup.add(arch);

        // Magic Energy Center
        const magicMat = new THREE.MeshStandardMaterial({
            color: 0x0ea5e9, emissive: 0x0ea5e9, emissiveIntensity: 0.8,
            transparent: true, opacity: 0.7, side: THREE.DoubleSide
        });
        const energyGeo = new THREE.PlaneGeometry(2.2, 3.4);
        const energyMesh = new THREE.Mesh(energyGeo, magicMat);
        energyMesh.position.set(0, 1.9, 0);
        portalGroup.add(energyMesh);

        const portalLight = new THREE.PointLight(0x0ea5e9, 2.0, 15);
        portalLight.position.set(0, 1.9, 0.5);
        portalGroup.add(portalLight);

        this.hubGroup.add(portalGroup);

        this.portalIslandData = { x, y: y + 0.1, z, radius: 2.0 };

        portalGroup.userData.interactable = true;
        portalGroup.userData.name = 'PortalExpedicao';

        this.interactiveObjects.push({
            name: 'PortalExpedicao',
            mesh: portalGroup,
            position: new THREE.Vector3(x, y + 0.6, z),
            radius: 4.5,
            action: () => this.openExpeditionUI(),
            prompt: 'Pressione E para Ativar o Portal de Expedição'
        });
    }

    openExpeditionUI() {
        const expeditionUI = document.getElementById('expedition-ui');
        if (expeditionUI) {
            expeditionUI.classList.remove('hidden');
            window.hubBuildingState = 'UI_OPEN'; // Pause interactions

            if (this.portalIslandData) {
                window.targetPortalPosition = new THREE.Vector3(this.portalIslandData.x, this.portalIslandData.y, this.portalIslandData.z);
                window.isTransitioning = true;
            }
        }
    }

    closeExpeditionUI() {
        const expeditionUI = document.getElementById('expedition-ui');
        if (expeditionUI) {
            expeditionUI.classList.add('hidden');
            window.hubBuildingState = 'EXPLORING';

            window.isTransitioning = false;
            window.targetPortalPosition = null;
        }
    }

    setupWeatherParticles() {
        if (!this.weatherGroup) {
            this.weatherGroup = new THREE.Group();
            this.scene.add(this.weatherGroup);
        }
        if (!this.weatherParticleGroup) {
            this.weatherParticleGroup = new THREE.Group();
            this.scene.add(this.weatherParticleGroup);
        }
    }

    setupEros() {
        this.eros = new Eros(this.scene, new THREE.Vector3(2.0, 2.0, 0.5));
        this.eros.group.lookAt(0, 2, 0);
        this.eros.group.scale.setScalar(0.82);
        this.hubGroup.add(this.eros.group);

        this.erosSpot = new THREE.SpotLight(0xfff5b6, 12.0, 25, Math.PI/6, 0.6, 1.0);
        this.erosSpot.position.set(2.0, 10, 0.5); this.erosSpot.castShadow = true;
        this.scene.add(this.erosSpot); this.scene.add(this.erosSpot.target);

        this.eros.group.userData.interactable = true;
        this.eros.group.userData.name = 'Eros';

        this.interactiveObjects.push({
            name: 'Eros',
            mesh: this.eros.group,
            position: this.eros.group.position,
            radius: 5.0,
            action: () => {
                if (window.hubBuildingState !== 'EXPLORING' && window.hubBuildingState !== 'INSIDE_TENT') return;
                window.hubBuildingState = 'BUILDING';
                const hubUI = document.getElementById('hub-status-ui');
                const buildUI = document.getElementById('build-ui');
                if (hubUI) hubUI.classList.add('opacity-0');
                if (buildUI) buildUI.classList.remove('hidden');
            },
            prompt: 'Falar com Eros (Construir)'
        });
    }


    formatGameTime(hours) {
        const h = Math.floor(hours);
        const m = Math.floor((hours % 1) * 60);
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    }

    updateTimeAndWeatherHUD() {
        if (!gameState.hubState) return;
        const timeStr = this.formatGameTime(gameState.hubState.gameTimeHours);
        const locationSubtitle = document.getElementById('location-subtitle');
        const weatherBadgeIcon = document.getElementById('weather-badge-icon');
        const weatherBadgeText = document.getElementById('weather-badge-text');

        if(locationSubtitle) {
            const WEATHER_TYPES = {
                SUNNY: { name: 'Ensolarado', icon: 'fa-sun', color: '#facc15' },
                LIGHT_RAIN: { name: 'Chuva Leve', icon: 'fa-cloud-rain', color: '#38bdf8' },
                STORM: { name: 'Tempestade', icon: 'fa-bolt', color: '#a855f7' },
                WINDY: { name: 'Ventania', icon: 'fa-wind', color: '#94a3b8' },
                SNOW: { name: 'Neve', icon: 'fa-snowflake', color: '#e2e8f0' }
            };
            const wType = WEATHER_TYPES[gameState.hubState.currentWeatherKey] || WEATHER_TYPES.SUNNY;
            locationSubtitle.textContent = `Dia ${gameState.hubState.dayCount} • ${timeStr} • ${wType.name}`;

            if(weatherBadgeIcon) {
                weatherBadgeIcon.className = `fa-solid ${wType.icon}`;
                weatherBadgeIcon.style.color = wType.color;
            }
            if(weatherBadgeText) {
                weatherBadgeText.textContent = wType.name;
            }
        }
    }

    triggerErosBark(text) {
        const diagBox = document.getElementById('dialogue-box');
        const erosText = document.getElementById('eros-text');
        if(!diagBox || !erosText) return;

        erosText.innerText = `"${text}"`;
        diagBox.style.opacity = '1';

        if (this.eros) this.eros.bark();

        clearTimeout(this.barkTimeout);
        this.barkTimeout = setTimeout(() => { diagBox.style.opacity = '0'; }, 4000);
    }

    cleanup() {
        const disposeGroup = (group) => {
            if (!group) return;
            import('../core/GraphicsUtils.js').then(({ disposeHierarchy }) => {
                disposeHierarchy(group);
                this.scene.remove(group);
            });
        };

        disposeGroup(this.hubGroup);
        disposeGroup(this.skyGroup);
        if(this.weatherParticleGroup) disposeGroup(this.weatherParticleGroup);

        if (this.erosSpot) {
            import('../core/GraphicsUtils.js').then(({ disposeHierarchy }) => {
                disposeHierarchy(this.erosSpot);
                this.scene.remove(this.erosSpot);
                if(this.erosSpot.target) {
                    disposeHierarchy(this.erosSpot.target);
                    this.scene.remove(this.erosSpot.target);
                }
                this.erosSpot.dispose();
            });
        }

        this.interactiveObjects = [];
    }

    updateDayNightLighting(delta) {
        gameState.hubState.gameTimeHours = (gameState.hubState.gameTimeHours + (delta * (4.0 / 60.0))) % 24.0;

        // Only update UI periodically to avoid spam
        if (Math.random() < 0.05) this.updateTimeAndWeatherHUD();

        // Orbit calculation for Sun & Moon
        const sunAngle = ((gameState.hubState.gameTimeHours - 6.0) / 24.0) * Math.PI * 2;
        const sunRadius = 210;

        this.sunMesh.position.x = Math.cos(sunAngle) * sunRadius;
        this.sunMesh.position.y = Math.sin(sunAngle) * sunRadius;
        this.sunMesh.position.z = 60;

        this.sunLight.position.copy(this.sunMesh.position);

        this.moonMesh.position.x = -this.sunMesh.position.x;
        this.moonMesh.position.y = -this.sunMesh.position.y;
        this.moonMesh.position.z = -60;

        this.moonLight.position.copy(this.moonMesh.position);

        // Day/Night Sky transitions
        let skyColor, fogColor, sunIntensity, moonIntensity, starOpacity;

        if (gameState.hubState.gameTimeHours >= 6.0 && gameState.hubState.gameTimeHours < 8.0) {
            // Sunrise
            const t = (gameState.hubState.gameTimeHours - 6.0) / 2.0;
            skyColor = new THREE.Color(0xfdba74).lerp(new THREE.Color(0x7ac1eb), t);
            fogColor = skyColor;
            sunIntensity = 0.4 + t * 0.95;
            moonIntensity = 0.0;
            starOpacity = (1.0 - t) * 0.8;
        } else if (gameState.hubState.gameTimeHours >= 8.0 && gameState.hubState.gameTimeHours <= 17.0) {
            // Daytime
            skyColor = new THREE.Color(0x7ac1eb);
            fogColor = skyColor;
            sunIntensity = 1.35;
            moonIntensity = 0.0;
            starOpacity = 0.0;
        } else if (gameState.hubState.gameTimeHours > 17.0 && gameState.hubState.gameTimeHours <= 19.0) {
            // Sunset
            const t = (gameState.hubState.gameTimeHours - 17.0) / 2.0;
            skyColor = new THREE.Color(0x7ac1eb).lerp(new THREE.Color(0x9a3412), t);
            fogColor = skyColor;
            sunIntensity = 1.35 * (1.0 - t * 0.8);
            moonIntensity = t * 0.4;
            starOpacity = t * 0.8;
        } else {
            // Nighttime
            skyColor = new THREE.Color(0x030712);
            fogColor = skyColor;
            sunIntensity = 0.05;
            moonIntensity = 0.55;
            starOpacity = 0.95;
        }

        const currentWeather = WEATHER_TYPES[gameState.hubState.currentWeatherKey] || WEATHER_TYPES.SUNNY;

        if (currentWeather === WEATHER_TYPES.STORM) {
            skyColor.lerp(new THREE.Color(0x1e1b4b), 0.7);
            fogColor.lerp(new THREE.Color(0x1e1b4b), 0.7);
            sunIntensity *= 0.2;
        }

        this.scene.background.lerp(skyColor, 0.05);
        this.scene.fog.color.lerp(fogColor, 0.05);
        this.sunLight.intensity = THREE.MathUtils.lerp(this.sunLight.intensity, Math.max(0.05, sunIntensity), 0.05);
        this.moonLight.intensity = THREE.MathUtils.lerp(this.moonLight.intensity, moonIntensity, 0.05);
        this.starMaterial.opacity = THREE.MathUtils.lerp(this.starMaterial.opacity, starOpacity, 0.05);
    }

    updateWeatherSimulation(delta, time) {
        if (!this.weatherParticleGroup || !this.weatherParticleGroup.children || this.weatherParticleGroup.children.length === 0) return;
        const pGeo = this.weatherParticleGroup.children[0].geometry;
        if (!pGeo) return;
        const pos = pGeo.attributes.position.array;
        const pMat = this.weatherParticleGroup.children[0].material;

        const currentWeather = WEATHER_TYPES[gameState.hubState.currentWeatherKey] || WEATHER_TYPES.SUNNY;

        if (currentWeather === WEATHER_TYPES.LIGHT_RAIN || currentWeather === WEATHER_TYPES.STORM) {
            pMat.opacity = currentWeather === WEATHER_TYPES.STORM ? 0.85 : 0.45;
            pMat.color.setHex(0x38bdf8); pMat.size = 0.2;

            const speed = currentWeather === WEATHER_TYPES.STORM ? 28 : 15;
            for (let i = 0; i < pos.length / 3; i++) {
                pos[i * 3 + 1] -= speed * delta;
                pos[i * 3] += (currentWeather === WEATHER_TYPES.STORM ? 3.0 : 1.0) * delta;
                if (pos[i * 3 + 1] < 0) {
                    pos[i * 3 + 1] = 25;
                    pos[i * 3] = (Math.random() - 0.5) * 80;
                }
            }
            pGeo.attributes.position.needsUpdate = true;

            if (currentWeather === WEATHER_TYPES.STORM) {
                this.lightningTimer -= delta;
                if (this.lightningTimer <= 0) {
                    this.lightningTimer = 3.0 + Math.random() * 6.0;
                    const flashEl = document.getElementById('lightning-flash');
                    if(flashEl) {
                        flashEl.style.opacity = '0.9';
                        setTimeout(() => { flashEl.style.opacity = '0'; }, 80);
                    }
                }
            }
        } else if (currentWeather === WEATHER_TYPES.SNOW) {
            pMat.opacity = 0.8; pMat.color.setHex(0xffffff); pMat.size = 0.35;
            for (let i = 0; i < pos.length / 3; i++) {
                pos[i * 3 + 1] -= 3.5 * delta;
                pos[i * 3] += Math.sin(time + i) * 0.5 * delta;
                if (pos[i * 3 + 1] < 0) {
                    pos[i * 3 + 1] = 25;
                    pos[i * 3] = (Math.random() - 0.5) * 80;
                }
            }
            pGeo.attributes.position.needsUpdate = true;
        } else {
            pMat.opacity = THREE.MathUtils.lerp(pMat.opacity, 0, 0.1);
        }
    }

    animateCampfireAndVegetation(delta, time) {
        // Vento estático - A animação de grama via GPU (Custom Shader)
        // será implementada futuramente.
    }

    update(delta, time, camera, playerPos) {
        // Trava de segurança para a posição do jogador
        const safePos = (playerPos && typeof playerPos.x === 'number') ? playerPos : new THREE.Vector3(0, 0, 0);

        this.updateDayNightLighting(delta);
        this.updateWeatherSimulation(delta, time);
        this.animateCampfireAndVegetation(delta, time);
        if (this.terrain) this.terrain.update(time);

        if(window.hubBuildingState !== 'INSIDE_TENT') {
            this.skyClouds.forEach(c => { c.position.x -= c.userData.speed * delta * 2; if(c.position.x < -140) c.position.x = 140; });
            this.islandBottomClouds.forEach(c => { c.position.x -= c.userData.speed * delta * 1.5; if(c.position.x < -80) c.position.x = 80; });

            this.distantIslands.forEach((isl, idx) => {
                isl.position.y += Math.sin(time * 0.8 + idx) * 0.008;
            });
        }

        // Eros Logic
        if(this.eros && window.hubBuildingState !== 'INSIDE_TENT') {
            const distToEros = safePos.distanceTo(this.eros.group.position);

            if (distToEros < 5.0 && !this.isModalOpen && window.hubBuildingState === 'EXPLORING') {
                if(!this.isNearEros) {
                    window.currentNearbyObject = {
                        name: 'Eros', // Ensure the name matches the Raycaster tag for clearing logic
                        action: () => {
                            window.hubBuildingState = 'BUILDING';
                            const hubUI = document.getElementById('hub-status-ui');
                            const buildUI = document.getElementById('build-ui');
                            if(hubUI) hubUI.classList.add('opacity-0');
                            if(buildUI) buildUI.classList.remove('hidden');
                        }
                    };
                    const prompt = document.getElementById('interaction-prompt');
                    if(prompt) {
                        prompt.style.opacity = '1';
                        document.getElementById('prompt-text').textContent = 'Falar com Eros (Construir)';
                    }
                }
                this.isNearEros = true;
            } else {
                this.isNearEros = false;
            }

            if(this.erosSpot) {
                this.erosSpot.position.set(this.eros.group.position.x, 10, this.eros.group.position.z);
                this.erosSpot.target.position.copy(this.eros.group.position);
                this.erosSpot.target.updateMatrixWorld();
            }

            this.eros.update(delta);
        }

        // Check interactive objects
        let found = null;
        if(window.hubBuildingState === 'EXPLORING' || window.hubBuildingState === 'INSIDE_TENT') {
            for (let obj of this.interactiveObjects) {
                if (safePos.distanceTo(obj.position) < obj.radius) { found = obj; break; }
            }
        }

        const prompt = document.getElementById('interaction-prompt');
        if (found) {
            window.currentNearbyObject = found;
            if(prompt) {
                document.getElementById('prompt-text').textContent = found.prompt;
                prompt.style.opacity = '1';
            }
        } else if (!this.isNearEros && prompt) {
            window.currentNearbyObject = null;
            prompt.style.opacity = '0';
        }
    }

    getFloorY(pos) {
        if (!this.terrain) return 0;
        return this.terrain.getHeightAt(pos.x, pos.z);
    }


    checkMeleeHit(pos, fwd, dmg, dist) {
        if (this.resources) {
            // Repass hit to resources to handle tree/rock gathering
            this.resources.hitNode(pos, dmg);
        }
    }

    checkCollision(pos, radius) {
        if (!this.terrain) return false;

        // Prevent falling out of bounds
        if (Math.abs(pos.x) >= 9.5 || Math.abs(pos.z) >= 9.5) {
            return true;
        }

        // Define player bounding box
        const playerBox = new THREE.Box3();
        const r = radius || 0.3; // Default player radius
        const h = 1.8; // Default player height

        // Add a small epsilon to min Y to ignore the floor directly beneath the player's feet
        playerBox.min.set(pos.x - r, pos.y + 0.1, pos.z - r);
        playerBox.max.set(pos.x + r, pos.y + h, pos.z + r);

        let colliders = this.terrain.getColliders();
        if (this.resources) {
            colliders = colliders.concat(this.resources.getColliders());
        }
        for (let i = 0; i < colliders.length; i++) {
            if (playerBox.intersectsBox(colliders[i])) {
                return true; // Collision detected
            }
        }
        return false;
    }
}