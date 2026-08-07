import * as THREE from 'three';
import gameState from '../core/GameState.js';
import { Eros } from '../characters/Eros.js';

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

        this.groundMeshes = [];
        this.interactiveObjects = [];
        this.placedSkyIslands = [];

        this.ISLAND_SIZE = 60.0;

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

        this.raycaster = new THREE.Raycaster();
        this.mouseVec = new THREE.Vector2();
        this.gridSnapPos = new THREE.Vector3();

        this.expansionSlots = [
            { x: this.ISLAND_SIZE, z: 0 },
            { x: -this.ISLAND_SIZE, z: 0 },
            { x: 0, z: this.ISLAND_SIZE },
            { x: 0, z: -this.ISLAND_SIZE }
        ];

        this.setupMaterials();
        this.setupLightingAndSky();
        this.setupEnvironment();
        this.setupEros();
        this.buildInteractiveTentInterior();
        this.setupGridSystem();
        this.setupWeatherParticles();

        // Spawn based on gameState
        this.restoreState();
        this.updateTimeAndWeatherHUD();

        this.bindEvents();
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

        // Grass Shader
        this.grassGeo = new THREE.BufferGeometry();
        this.grassGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-0.15, 0, 0, 0.15, 0, 0, 0.0, 0.8, 0]), 3));
        this.grassGeo.computeVertexNormals();

        this.grassUniforms = { uTime: { value: 0 }, uPlayerPos: { value: new THREE.Vector3(999,999,999) } };
        this.matGrassShader = new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.9, flatShading: true });
        this.matGrassShader.onBeforeCompile = (shader) => {
            shader.uniforms.uTime = this.grassUniforms.uTime; shader.uniforms.uPlayerPos = this.grassUniforms.uPlayerPos;
            shader.vertexShader = shader.vertexShader.replace('#include <common>', `#include <common>\nuniform float uTime;\nuniform vec3 uPlayerPos;\nvarying vec3 vGrassTint;`);
            shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `
                #include <begin_vertex>
                vec4 worldPos = instanceMatrix * vec4(position, 1.0);
                if (position.y > 0.1) {
                    float wind = sin(uTime * 2.5 + worldPos.x * 0.8 + worldPos.z * 0.8) * 0.22;
                    transformed.x += wind; transformed.z += wind * 0.6;
                    float dist = distance(worldPos.xz, uPlayerPos.xz);
                    if (dist < 1.5) { vec2 push = normalize(worldPos.xz - uPlayerPos.xz) * (1.5 - dist) * 0.6; transformed.x += push.x; transformed.z += push.y; }
                }
                vGrassTint = mix(vec3(0.5), vec3(1.2), clamp(position.y * 1.8, 0.0, 1.0));
            `);
            shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>\nvarying vec3 vGrassTint;`);
            shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>\ndiffuseColor.rgb *= vGrassTint;`);
        };
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
            cloud.position.set(Math.cos(angle) * r, -7.5 - Math.random() * 3, Math.sin(angle) * r);
            cloud.userData = { speed: Math.random() * 0.8 + 0.2 };
            this.hubGroup.add(cloud);
            this.islandBottomClouds.push(cloud);
        }

        // Central Island
        this.centralIsland = this.createIslandMesh(0, 0, true);
        this.hubGroup.add(this.centralIsland);

        // Portal Island
        this.createPortalIsland(0, 0, -35);

        // Expansion Group
        this.expansionGroup = new THREE.Group();
        this.hubGroup.add(this.expansionGroup);

        // Static Grass Optimization (InstancedMesh)
        const bladeGeo = new THREE.ConeGeometry(0.12, 0.7, 3);
        bladeGeo.translate(0, 0.35, 0);

        const baseMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8, flatShading: true });

        const colors = [
            new THREE.Color(0x4ad66d),
            new THREE.Color(0x10b981),
            new THREE.Color(0x84cc16)
        ];

        const grassCount = 6000;
        const instancedGrass = new THREE.InstancedMesh(bladeGeo, baseMaterial, grassCount);
        const dummy = new THREE.Object3D();

        for (let i = 0; i < grassCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.sqrt(Math.random()) * ((this.ISLAND_SIZE / 2.0) - 1.0);
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;

            if (Math.hypot(x, z) < 4.0) {
                // To keep count exact without a while loop that might block, we can just place it far away or scale 0
                dummy.scale.setScalar(0);
                dummy.updateMatrix();
                instancedGrass.setMatrixAt(i, dummy.matrix);
                continue;
            }

            const groundY = 0.4;
            dummy.position.set(x, groundY, z);
            dummy.rotation.y = Math.random() * Math.PI * 2;
            dummy.rotation.x = (Math.random() - 0.5) * 0.4;
            dummy.rotation.z = (Math.random() - 0.5) * 0.4;
            dummy.scale.setScalar(0.7 + Math.random() * 0.6);

            dummy.updateMatrix();
            instancedGrass.setMatrixAt(i, dummy.matrix);

            instancedGrass.setColorAt(i, colors[Math.floor(Math.random() * colors.length)]);
        }

        instancedGrass.instanceMatrix.needsUpdate = true;
        instancedGrass.instanceColor.needsUpdate = true;
        this.centralIsland.add(instancedGrass);
    }

    addGrassToCircle(group, radius, yLevel) {
        const area = Math.PI * radius * radius;
        const count = Math.floor(area * 4.5);
        const iGrass = new THREE.InstancedMesh(this.grassGeo, this.matGrassShader, count);
        const dummy = new THREE.Object3D();
        const grassColor = new THREE.Color(0x22c55e);
        for(let i = 0; i < count; i++) {
            const r = Math.sqrt(Math.random()) * (radius - 0.5);
            const theta = Math.random() * 2 * Math.PI;
            dummy.position.set(r * Math.cos(theta), yLevel, r * Math.sin(theta));
            dummy.rotation.y = Math.random() * Math.PI;
            dummy.scale.setScalar(0.7 + Math.random() * 1.0);
            dummy.updateMatrix();
            iGrass.setMatrixAt(i, dummy.matrix);
            iGrass.setColorAt(i, grassColor);
        }
        group.add(iGrass);
    }


    createPortalIsland(x, y, z) {
        const portalGroup = new THREE.Group();
        portalGroup.position.set(x, y, z);

        // --- 1. Island Base ---
        const islandMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.9, flatShading: true });
        const grassMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.8, flatShading: true });
        const dirtMat = new THREE.MeshStandardMaterial({ color: 0x291d16, roughness: 0.85, flatShading: true });

        const topGeo = new THREE.CylinderGeometry(6.0, 5.5, 0.6, 16);
        const topMesh = new THREE.Mesh(topGeo, grassMat);
        topMesh.position.y = 0.3;
        topMesh.receiveShadow = true; topMesh.castShadow = true;
        portalGroup.add(topMesh);

        const dirtGeo = new THREE.CylinderGeometry(5.5, 4.5, 1.5, 16);
        const dirtMesh = new THREE.Mesh(dirtGeo, dirtMat);
        dirtMesh.position.y = -0.75;
        dirtMesh.receiveShadow = true; dirtMesh.castShadow = true;
        portalGroup.add(dirtMesh);

        const botGeo = new THREE.ConeGeometry(4.5, 8.0, 12);
        const botMesh = new THREE.Mesh(botGeo, islandMat);
        botMesh.position.y = -5.5;
        botMesh.rotation.x = Math.PI;
        botMesh.receiveShadow = true; botMesh.castShadow = true;
        portalGroup.add(botMesh);

        // --- 2. Ancient Portal Structure ---
        const stoneMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.8, flatShading: true });

        // Base platform for portal
        const platformMesh = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.2, 1.5), stoneMat);
        platformMesh.position.y = 0.7;
        platformMesh.receiveShadow = true; platformMesh.castShadow = true;
        portalGroup.add(platformMesh);

        // Pillars
        const pillarGeo = new THREE.BoxGeometry(0.8, 3.5, 0.8);
        const leftPillar = new THREE.Mesh(pillarGeo, stoneMat);
        leftPillar.position.set(-1.5, 2.5, 0);
        leftPillar.receiveShadow = true; leftPillar.castShadow = true;
        portalGroup.add(leftPillar);

        const rightPillar = new THREE.Mesh(pillarGeo, stoneMat);
        rightPillar.position.set(1.5, 2.5, 0);
        rightPillar.receiveShadow = true; rightPillar.castShadow = true;
        portalGroup.add(rightPillar);

        // Arch (Top)
        const archGeo = new THREE.BoxGeometry(3.8, 0.8, 0.8);
        const arch = new THREE.Mesh(archGeo, stoneMat);
        arch.position.set(0, 4.5, 0);
        arch.receiveShadow = true; arch.castShadow = true;
        portalGroup.add(arch);

        // --- 3. Magic Energy Center ---
        const magicMat = new THREE.MeshStandardMaterial({
            color: 0x0ea5e9, emissive: 0x0ea5e9, emissiveIntensity: 0.8,
            transparent: true, opacity: 0.7, side: THREE.DoubleSide
        });
        const energyGeo = new THREE.PlaneGeometry(2.2, 3.4);
        const energyMesh = new THREE.Mesh(energyGeo, magicMat);
        energyMesh.position.set(0, 2.5, 0);
        portalGroup.add(energyMesh);

        // Light source
        const portalLight = new THREE.PointLight(0x0ea5e9, 2.0, 15);
        portalLight.position.set(0, 2.5, 0.5);
        portalGroup.add(portalLight);

        this.hubGroup.add(portalGroup);

        // --- 4. Stepping Stones Path ---
        // Add Stepping Stones directly to hubGroup
        for (let i = 1; i <= 4; i++) {
            const zPos = -16 - (i * 3.0); // Z from -19 to -28
            const stoneSize = 1.2 + Math.random() * 0.4;
            const sGeo = new THREE.CylinderGeometry(stoneSize, stoneSize - 0.2, 0.8, 8);
            const sMesh = new THREE.Mesh(sGeo, stoneMat);

            // Add a grass patch on top
            const sGrass = new THREE.Mesh(new THREE.CylinderGeometry(stoneSize, stoneSize, 0.2, 8), grassMat);
            sGrass.position.y = 0.5;
            sMesh.add(sGrass);

            // Give it some hover variance
            sMesh.position.set((Math.random() - 0.5) * 1.5, 0.2 + (Math.random() * 0.3), zPos);
            sMesh.rotation.y = Math.random() * Math.PI;

            this.hubGroup.add(sMesh);

            // Track stepping stones for walkability
            if (!this.portalSteppingStones) this.portalSteppingStones = [];
            this.portalSteppingStones.push({
                x: sMesh.position.x,
                y: sMesh.position.y + 0.5, // Walkable height
                z: sMesh.position.z,
                radius: stoneSize
            });
        }

        // --- 5. Registration ---
        this.portalIslandData = { x, y: 0.6, z, radius: 6.0 }; // Walkable radius

        this.interactiveObjects.push({
            name: 'PortalExpedicao',
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
        }
    }

    closeExpeditionUI() {
        const expeditionUI = document.getElementById('expedition-ui');
        if (expeditionUI) {
            expeditionUI.classList.add('hidden');
            window.hubBuildingState = 'EXPLORING';
        }
    }


    createIslandMesh(x, z, isCentral = false) {
        const group = new THREE.Group();
        const terrainGroup = new THREE.Group();
        const radius = this.ISLAND_SIZE / 2.0;

        const basePlat = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 0.4, 32), this.matGrass);
        basePlat.position.y = 0.2; basePlat.receiveShadow = true; basePlat.castShadow = true;
        terrainGroup.add(basePlat); this.groundMeshes.push(basePlat);

        const baseDirt = new THREE.Mesh(new THREE.CylinderGeometry(radius - 0.1, radius - 1.0, 8.0, 32), this.matDirt);
        baseDirt.position.y = -4.0;
        baseDirt.receiveShadow = true; baseDirt.castShadow = true;
        terrainGroup.add(baseDirt);

        const baseRock = new THREE.Mesh(new THREE.CylinderGeometry(radius - 1.0, radius * 0.3, 20.0, 9), this.matRock);
        baseRock.position.y = -18.0;
        baseRock.castShadow = true; baseRock.receiveShadow = true;
        terrainGroup.add(baseRock);

        for (let i = 0; i < 5; i++) {
            const stalactite = new THREE.Mesh(new THREE.ConeGeometry(1 + Math.random()*2, 4 + Math.random()*6, 5), this.matDirt);
            const sr = Math.sqrt(Math.random()) * (radius - 2);
            const stheta = Math.random() * 2 * Math.PI;
            stalactite.position.set(sr * Math.cos(stheta), -8.0 - Math.random()*2, sr * Math.sin(stheta));
            stalactite.rotation.x = Math.PI;
            stalactite.castShadow = true;
            terrainGroup.add(stalactite);
        }

        this.addGrassToCircle(terrainGroup, radius, 0.4);

        if (!isCentral) {
            const stoneGeo = new THREE.BoxGeometry(1.2, 0.2, 1.2);
            for (let i = 0; i < 9; i++) {
                const s = new THREE.Mesh(stoneGeo, this.matRock);
                let lx = 0, lz = 0;
                if (x !== 0) lx = -Math.sign(x) * (i * 1.5 + 2.0);
                if (z !== 0) lz = -Math.sign(z) * (i * 1.5 + 2.0);
                s.position.set(lx + (Math.random()-0.5)*0.5, 0.4, lz + (Math.random()-0.5)*0.5);
                s.rotation.y = Math.random() * Math.PI;
                s.castShadow = true; s.receiveShadow = true;
                terrainGroup.add(s); this.groundMeshes.push(s);
            }
        }

        group.add(terrainGroup); group.position.set(x, 0, z);
        terrainGroup.updateMatrixWorld(true);
        return group;
    }

    setupEros() {
        this.eros = new Eros(this.scene, new THREE.Vector3(4.0, 0.4, 4.0));
        this.eros.group.scale.setScalar(0.82);
        this.hubGroup.add(this.eros.group);

        this.erosSpot = new THREE.SpotLight(0xfff5b6, 12.0, 25, Math.PI/6, 0.6, 1.0);
        this.erosSpot.position.set(4.0, 10, 4.0); this.erosSpot.castShadow = true;
        this.scene.add(this.erosSpot); this.scene.add(this.erosSpot.target);
    }

    buildInteractiveTentInterior() {
        this.tentInteriorGroup = new THREE.Group();
        this.tentInteriorGroup.position.set(200, 0, 200);

        const floorGeo = new THREE.CylinderGeometry(5.2, 5.4, 0.3, 24);
        const floorMat = new THREE.MeshStandardMaterial({ color: 0x3d230d, roughness: 0.85 });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.position.y = -0.15; floor.receiveShadow = true;
        this.tentInteriorGroup.add(floor);

        const roomGeo = new THREE.CylinderGeometry(5.0, 5.3, 4.2, 24, 1, true);
        const roomMat = new THREE.MeshStandardMaterial({ color: 0x9a3412, roughness: 0.8, side: THREE.BackSide });
        const roomShell = new THREE.Mesh(roomGeo, roomMat);
        roomShell.position.y = 2.1;
        this.tentInteriorGroup.add(roomShell);

        const roofInnerGeo = new THREE.ConeGeometry(5.2, 2.5, 24, 1, true);
        const roofInner = new THREE.Mesh(roofInnerGeo, roomMat);
        roofInner.position.y = 5.35;
        this.tentInteriorGroup.add(roofInner);

        const warmLight1 = new THREE.PointLight(0xff9900, 3.8, 12);
        warmLight1.position.set(0, 3.2, 0); warmLight1.castShadow = true;
        this.tentInteriorGroup.add(warmLight1);

        // Exit Rug
        const rugGeo = new THREE.BoxGeometry(2.2, 0.04, 1.4);
        const rugMat = new THREE.MeshStandardMaterial({ color: 0x0f766e, roughness: 0.7 });
        const exitRug = new THREE.Mesh(rugGeo, rugMat);
        exitRug.position.set(0, 0.02, 3.8); exitRug.receiveShadow = true;
        this.tentInteriorGroup.add(exitRug);

        const rugBorder = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.03, 1.6), new THREE.MeshStandardMaterial({ color: 0xfacc15 }));
        rugBorder.position.set(0, 0.01, 3.8);
        this.tentInteriorGroup.add(rugBorder);

        // Small Table with Journal & Candle
        const tableGroup = new THREE.Group();
        tableGroup.position.set(-3.2, 0, -2.2);

        const smallDesk = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.85, 0.9, 12), new THREE.MeshStandardMaterial({ color: 0x4a2e16, roughness: 0.8 }));
        smallDesk.position.y = 0.45; smallDesk.castShadow = true; tableGroup.add(smallDesk);

        const journalCover = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.08, 0.35), new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.5 }));
        journalCover.position.set(-0.1, 0.94, 0.05); journalCover.rotation.y = 0.25; tableGroup.add(journalCover);

        const candle = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.3), new THREE.MeshStandardMaterial({ color: 0xffffff }));
        candle.position.set(0.25, 1.05, -0.1); tableGroup.add(candle);

        const candleFlame = new THREE.PointLight(0xffaa00, 1.2, 3);
        candleFlame.position.set(0.25, 1.25, -0.1); tableGroup.add(candleFlame);

        this.tentInteriorGroup.add(tableGroup);

        // Sleeping Bag
        const bedGroup = new THREE.Group();
        bedGroup.position.set(2.8, 0, -1.0); bedGroup.rotation.y = -Math.PI / 6;

        const matress = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.15, 2.6), new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.85 }));
        matress.position.y = 0.075; matress.castShadow = true; bedGroup.add(matress);

        const pillow = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.22, 0.6), new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.6 }));
        pillow.position.set(0, 0.18, -0.9); bedGroup.add(pillow);

        const blanket = new THREE.Mesh(new THREE.BoxGeometry(1.62, 0.18, 1.7), new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.8 }));
        blanket.position.set(0, 0.1, 0.35); bedGroup.add(blanket);

        this.tentInteriorGroup.add(bedGroup);

        // Tactical Map Desk
        const desk = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.18, 1.5), new THREE.MeshStandardMaterial({ color: 0x3d230d, roughness: 0.8 }));
        desk.position.set(0, 0.9, -2.5); desk.castShadow = true;
        this.tentInteriorGroup.add(desk);

        const mapMesh = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 1.2), new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.9, side: THREE.DoubleSide }));
        mapMesh.rotation.x = -Math.PI / 2; mapMesh.position.set(0, 0.99, -2.5);
        this.tentInteriorGroup.add(mapMesh);

        this.scene.add(this.tentInteriorGroup);

        // Register Interactions Inside Tent
        this.interactiveObjects.push({
            name: 'TapeteSaida',
            position: new THREE.Vector3(200, 0, 203.5),
            radius: 2.0,
            action: () => this.exitTent(),
            prompt: 'Sair para o Acampamento (Saída)'
        });

        this.interactiveObjects.push({
            name: 'Diario',
            position: new THREE.Vector3(196.8, 0, 197.8),
            radius: 2.5,
            action: () => this.handleJournalInteraction(),
            prompt: 'Ler e Salvar Progresso no Diário'
        });

        this.interactiveObjects.push({
            name: 'SacoDormir',
            position: new THREE.Vector3(202.8, 0, 199.0),
            radius: 2.5,
            action: () => this.sleepInTent(),
            prompt: 'Dormir por 8 Horas (Avançar Tempo)'
        });

        this.interactiveObjects.push({
            name: 'MesaTatica',
            position: new THREE.Vector3(200, 0, 197.5),
            radius: 2.5,
            action: () => window.changeGameState('WORLD_MAP'),
            prompt: 'Examinar Mapa Tático (Incursão)'
        });
    }

    setupGridSystem() {
        this.gridHelper = new THREE.GridHelper(40, 26, 0xfacc15, 0x475569);
        this.gridHelper.position.y = 0.12;
        this.gridHelper.visible = false;
        this.hubGroup.add(this.gridHelper);

        this.gridPlane = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshBasicMaterial({ visible: false }));
        this.gridPlane.rotation.x = -Math.PI / 2;
        this.hubGroup.add(this.gridPlane);
    }

    setupWeatherParticles() {
        this.weatherParticleGroup = new THREE.Group();
        const pCount = 450;
        const pGeo = new THREE.BufferGeometry();
        const positions = new Float32Array(pCount * 3);

        for (let i = 0; i < pCount; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 80;
            positions[i * 3 + 1] = Math.random() * 30;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 80;
        }

        pGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const pMat = new THREE.PointsMaterial({
            color: 0xffffff, size: 0.25, transparent: true, opacity: 0, depthWrite: false
        });

        const particles = new THREE.Points(pGeo, pMat);
        this.weatherParticleGroup.add(particles);
        this.scene.add(this.weatherParticleGroup);

        this.lightningTimer = 0;
    }

    triggerIslandExpansion(level, animate = true) {
        if (level <= this.expansionSlots.length) {
            const slot = this.expansionSlots[level - 1];
            const newIsland = this.createIslandMesh(slot.x, slot.z, false);

            if(animate) {
                newIsland.position.y = -35; newIsland.scale.set(0.1, 0.1, 0.1);
                this.expansionGroup.add(newIsland);

                let animProgress = 0;
                const animInterval = setInterval(() => {
                    animProgress += 0.02;
                    newIsland.position.y = -35 + (35 * animProgress);
                    newIsland.scale.setScalar(animProgress);
                    if (animProgress >= 1.0) {
                        newIsland.position.y = 0; newIsland.scale.set(1, 1, 1);
                        clearInterval(animInterval);
                    }
                }, 16);
            } else {
                newIsland.position.y = 0; newIsland.scale.set(1, 1, 1);
                this.expansionGroup.add(newIsland);
            }
        }
    }

    create3DObject(type, isPreview = false) {
        const group = new THREE.Group();
        const opacity = isPreview ? 0.65 : 1.0;
        const transparent = isPreview;

        // 1. CONSTRUÇÕES (A Barraca Remodelada Radicalmente)
        if (type === 'barraca') {
            const woodMat = new THREE.MeshStandardMaterial({ color: isPreview ? 0xfacc15 : 0x4a2e16, roughness: 0.8, transparent, opacity });
            const canvasMat = new THREE.MeshStandardMaterial({ color: isPreview ? 0xfacc15 : 0xddc088, roughness: 0.7, transparent, opacity, side: THREE.DoubleSide });
            const trimMat = new THREE.MeshStandardMaterial({ color: isPreview ? 0xfacc15 : 0x854d0e, roughness: 0.6, transparent, opacity });
            const rugMat = new THREE.MeshStandardMaterial({ color: isPreview ? 0xfacc15 : 0x0f766e, roughness: 0.7, transparent, opacity });

            // Elevated Hexagonal Timber Platform
            const platform = new THREE.Mesh(new THREE.CylinderGeometry(3.6, 3.8, 0.25, 8), woodMat);
            platform.position.y = 0.125;
            group.add(platform);

            // Entrance Steps
            const step = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.12, 0.8), woodMat);
            step.position.set(0, 0.06, 3.6);
            group.add(step);

            // Entrance Welcome Rug
            const rug = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.03, 1.2), rugMat);
            rug.position.set(0, 0.26, 2.5);
            group.add(rug);

            // Timber A-Frame Pillars
            const p1 = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.1, 3.8), woodMat);
            p1.position.set(-1.8, 1.8, 2.2); p1.rotation.z = -0.32; group.add(p1);

            const p2 = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.1, 3.8), woodMat);
            p2.position.set(1.8, 1.8, 2.2); p2.rotation.z = 0.32; group.add(p2);

            const p3 = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.1, 3.8), woodMat);
            p3.position.set(-1.8, 1.8, -2.2); p3.rotation.z = -0.32; group.add(p3);

            const p4 = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.1, 3.8), woodMat);
            p4.position.set(1.8, 1.8, -2.2); p4.rotation.z = 0.32; group.add(p4);

            // Ridge Beam
            const ridge = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 5.2), woodMat);
            ridge.position.set(0, 3.3, 0); ridge.rotation.x = Math.PI / 2; group.add(ridge);

            // Main Double-Layer Canopy Roof
            const roofGeo = new THREE.ConeGeometry(3.5, 3.2, 4, 1, true, 0, Math.PI * 1.6);
            roofGeo.rotateY(Math.PI * 0.7);
            const roof = new THREE.Mesh(roofGeo, canvasMat);
            roof.position.set(0, 1.9, 0);
            group.add(roof);

            // Overhanging Crest Canopy
            const topCap = new THREE.Mesh(new THREE.ConeGeometry(2.0, 1.2, 4), trimMat);
            topCap.position.set(0, 3.1, 0); topCap.rotation.y = Math.PI / 4;
            group.add(topCap);

            // Open Front Drape Curtains
            const curtainGeo = new THREE.PlaneGeometry(1.2, 2.8, 4, 4);
            const curtainL = new THREE.Mesh(curtainGeo, trimMat);
            curtainL.position.set(-1.2, 1.5, 2.1); curtainL.rotation.set(0.15, Math.PI / 4, -0.2); group.add(curtainL);
            const curtainR = new THREE.Mesh(curtainGeo, trimMat);
            curtainR.position.set(1.2, 1.5, 2.1); curtainR.rotation.set(0.15, -Math.PI / 4, 0.2); group.add(curtainR);

            // Entrance Brass Hanging Lantern
            const lanternFrame = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.4, 0.25), new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.3 }));
            lanternFrame.position.set(0, 2.6, 2.3); group.add(lanternFrame);
            if (!isPreview) {
                const lanternLight = new THREE.PointLight(0xff9900, 2.5, 8);
                lanternLight.position.set(0, 2.5, 2.3); group.add(lanternLight);
            }

        // 2. ENFEITES
        } else if (type === 'fogueira') {
            const rockMat = new THREE.MeshStandardMaterial({ color: isPreview ? 0xfacc15 : 0x4b5563, transparent, opacity });
            for(let i = 0; i < 8; i++) {
                const a = (i / 8) * Math.PI * 2;
                const s = new THREE.Mesh(new THREE.DodecahedronGeometry(0.28), rockMat);
                s.position.set(Math.cos(a) * 0.9, 0.1, Math.sin(a) * 0.9); group.add(s);
            }
            const logMat = new THREE.MeshStandardMaterial({ color: isPreview ? 0xfacc15 : 0x27170c, transparent, opacity });
            for(let i = 0; i < 4; i++) {
                const log = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.2), logMat);
                log.rotation.z = Math.PI / 3; log.rotation.y = (i * Math.PI) / 2; log.position.y = 0.18; group.add(log);
            }
            if (!isPreview) {
                const fLight = new THREE.PointLight(0xff5500, 2.8, 12);
                fLight.position.y = 0.7; group.add(fLight);
                group.userData = { isCampfire: true, light: fLight };
            }
        } else if (type === 'fence') {
            const mat = new THREE.MeshStandardMaterial({ color: isPreview ? 0xfacc15 : 0x78350f, transparent, opacity, roughness: 0.8 });
            const post1 = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 1.2), mat); post1.position.set(-0.7, 0.6, 0); group.add(post1);
            const post2 = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 1.2), mat); post2.position.set(0.7, 0.6, 0); group.add(post2);
            const rail1 = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.12, 0.08), mat); rail1.position.set(0, 0.8, 0); group.add(rail1);
            const rail2 = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.12, 0.08), mat); rail2.position.set(0, 0.4, 0); group.add(rail2);
        } else if (type === 'bench') {
            const mat = new THREE.MeshStandardMaterial({ color: isPreview ? 0xfacc15 : 0x92400e, transparent, opacity, roughness: 0.9 });
            const seat = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.18, 0.6), mat); seat.position.y = 0.45; group.add(seat);
            const leg1 = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.36, 0.5), mat); leg1.position.set(-0.6, 0.18, 0); group.add(leg1);
            const leg2 = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.36, 0.5), mat); leg2.position.set(0.6, 0.18, 0); group.add(leg2);
        } else if (type === 'lantern') {
            const mat = new THREE.MeshStandardMaterial({ color: isPreview ? 0xfacc15 : 0x334155, transparent, opacity, roughness: 0.4 });
            const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 1.6), mat); post.position.y = 0.8; group.add(post);
            const box = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.45, 0.35), new THREE.MeshStandardMaterial({ color: 0xfacc15, emissive: 0xfacc15, emissiveIntensity: 0.9 }));
            box.position.y = 1.6; group.add(box);
            if (!isPreview) {
                const l = new THREE.PointLight(0xfacc15, 2.0, 8); l.position.y = 1.6; group.add(l);
            }
        } else if (type === 'target') {
            const matWood = new THREE.MeshStandardMaterial({ color: isPreview ? 0xfacc15 : 0x78350f, transparent, opacity });
            const matRing = new THREE.MeshStandardMaterial({ color: isPreview ? 0xfacc15 : 0xef4444, transparent, opacity });
            const leg1 = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.0), matWood); leg1.position.set(-0.3, 0.9, -0.2); leg1.rotation.z = -0.2; group.add(leg1);
            const leg2 = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.0), matWood); leg2.position.set(0.3, 0.9, -0.2); leg2.rotation.z = 0.2; group.add(leg2);
            const leg3 = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.0), matWood); leg3.position.set(0, 0.9, 0.3); leg3.rotation.x = -0.3; group.add(leg3);
            const board = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 0.1, 16), matRing); board.rotation.x = Math.PI/2; board.position.set(0, 1.2, 0.1); group.add(board);
        } else if (type === 'tree') {
            const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 1.0), new THREE.MeshStandardMaterial({ color: isPreview ? 0xfacc15 : 0x451a03, transparent, opacity })); trunk.position.y = 0.5; group.add(trunk);
            const foliageMat = new THREE.MeshStandardMaterial({ color: isPreview ? 0xfacc15 : 0x047857, transparent, opacity, flatShading: true });
            const c1 = new THREE.Mesh(new THREE.ConeGeometry(1.2, 1.6, 6), foliageMat); c1.position.y = 1.4; group.add(c1);
            const c2 = new THREE.Mesh(new THREE.ConeGeometry(0.9, 1.4, 6), foliageMat); c2.position.y = 2.1; group.add(c2);
            const c3 = new THREE.Mesh(new THREE.ConeGeometry(0.6, 1.1, 6), foliageMat); c3.position.y = 2.7; group.add(c3);
        } else if (type === 'pot') {
            const potMat = new THREE.MeshStandardMaterial({ color: isPreview ? 0xfacc15 : 0x9a3412, roughness: 0.8, transparent, opacity });
            const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.25, 0.6, 12), potMat); pot.position.y = 0.3; group.add(pot);
            const flowerMat = new THREE.MeshStandardMaterial({ color: isPreview ? 0xfacc15 : 0xf43f5e, transparent, opacity });
            const flower = new THREE.Mesh(new THREE.DodecahedronGeometry(0.25), flowerMat); flower.position.y = 0.7; group.add(flower);
        } else if (type === 'chest') {
            const chestMat = new THREE.MeshStandardMaterial({ color: isPreview ? 0xfacc15 : 0x713f12, roughness: 0.7, transparent, opacity });
            const body = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.5, 0.6), chestMat); body.position.y = 0.25; group.add(body);
            const metalMat = new THREE.MeshStandardMaterial({ color: isPreview ? 0xfacc15 : 0xfacc15, metalness: 0.8, transparent, opacity });
            const lock = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.15, 0.08), metalMat); lock.position.set(0, 0.25, 0.31); group.add(lock);

        // 3. SOLOS (Pisos / Tiles de Terreno)
        } else if (type === 'mud_tile') {
            const mat = new THREE.MeshStandardMaterial({ color: isPreview ? 0xfacc15 : 0x54381e, roughness: 0.95, transparent, opacity });
            const tile = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.04, 1.5), mat); tile.position.y = 0.02; group.add(tile);
        } else if (type === 'stone_tile') {
            const mat = new THREE.MeshStandardMaterial({ color: isPreview ? 0xfacc15 : 0x64748b, roughness: 0.8, transparent, opacity });
            const tile = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.05, 1.5), mat); tile.position.y = 0.025; group.add(tile);
        } else if (type === 'wood_tile') {
            const mat = new THREE.MeshStandardMaterial({ color: isPreview ? 0xfacc15 : 0x78350f, roughness: 0.85, transparent, opacity });
            const tile = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.05, 1.5), mat); tile.position.y = 0.025; group.add(tile);
        } else if (type === 'granite_tile') {
            const mat = new THREE.MeshStandardMaterial({ color: isPreview ? 0xfacc15 : 0x334155, roughness: 0.4, metalness: 0.2, transparent, opacity });
            const tile = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.06, 1.5), mat); tile.position.y = 0.03; group.add(tile);
        }

        // 5. ILHAS FLUTUANTES
        else if (type === 'ilha_satelite') {
            const islandMat = new THREE.MeshStandardMaterial({ color: isPreview ? 0xfacc15 : 0x334155, roughness: 0.9, flatShading: true, transparent, opacity });
            const grassMat = new THREE.MeshStandardMaterial({ color: isPreview ? 0xfacc15 : 0x15803d, roughness: 0.8, flatShading: true, transparent, opacity });
            const dirtMat = new THREE.MeshStandardMaterial({ color: isPreview ? 0xfacc15 : 0x291d16, roughness: 0.85, flatShading: true, transparent, opacity });

            const topGeo = new THREE.CylinderGeometry(4.0, 3.8, 0.5, 12);
            const topMesh = new THREE.Mesh(topGeo, grassMat);
            topMesh.position.y = 0.25;
            group.add(topMesh);

            const dirtGeo = new THREE.CylinderGeometry(3.8, 3.5, 1.0, 12);
            const dirtMesh = new THREE.Mesh(dirtGeo, dirtMat);
            dirtMesh.position.y = -0.5;
            group.add(dirtMesh);

            const botGeo = new THREE.ConeGeometry(3.5, 6.0, 10);
            const botMesh = new THREE.Mesh(botGeo, islandMat);
            botMesh.position.y = -4.0;
            botMesh.rotation.x = Math.PI;
            group.add(botMesh);
        } else if (type === 'ponte_magica') {
            const woodMat = new THREE.MeshStandardMaterial({ color: isPreview ? 0xfacc15 : 0x4a2e16, roughness: 0.8, transparent, opacity });
            const magicMat = new THREE.MeshStandardMaterial({ color: 0x00ffff, emissive: 0x00ffff, emissiveIntensity: 0.8, transparent: true, opacity: isPreview ? 0.4 : 0.8 });

            // Planks
            for (let i = -1; i <= 1; i++) {
                const plank = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.15, 0.4), woodMat);
                plank.position.set(0, 0, i * 0.5);
                group.add(plank);
            }

            // Magic Beams
            const beam1 = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.5, 8), magicMat);
            beam1.position.set(-0.6, 0, 0);
            beam1.rotation.x = Math.PI / 2;
            group.add(beam1);

            const beam2 = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.5, 8), magicMat);
            beam2.position.set(0.6, 0, 0);
            beam2.rotation.x = Math.PI / 2;
            group.add(beam2);
        }

        return group;
    }

    instantiatePlacedStructure(type, x, y, z, ry, isNew = true) {
        const finalMesh = this.create3DObject(type, false);
        finalMesh.position.set(x, y, z);
        finalMesh.rotation.y = ry || 0;

        finalMesh.traverse(child => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });

        this.hubGroup.add(finalMesh);

        // Bind interactive triggers if needed
        if (type === 'barraca') {
            this.interactiveObjects.push({
                name: 'Barraca',
                position: new THREE.Vector3(x, y, z),
                radius: 3.8,
                action: () => this.enterTent(),
                prompt: 'Entrar na Barraca (Acomodações)'
            });
        } else if (type === 'fogueira') {
            this.interactiveObjects.push({
                name: 'Fogueira',
                position: new THREE.Vector3(x, y, z),
                radius: 3.2,
                action: () => window.showToast("🔥 Você se aquece ao lado da fogueira do Santuário.", "fa-fire", "fa-fire"),
                prompt: 'Aquecer-se na Fogueira'
            });
        }

        // Track sky structures for collision and walkability
        if (type === 'ilha_satelite' || type === 'ponte_magica') {
            this.placedSkyIslands.push({ type, x, y, z, ry });
        }

        if (isNew) {
            gameState.hubState.structures.push({ type, x, y, z, ry });
            gameState.save();
        }
    }

    startGridPlacement(type) {
        this.selectedBuildType = type;
        this.previewRotationY = 0;

        const buildUI = document.getElementById('build-ui');
        if(buildUI) buildUI.classList.add('hidden');

        this.gridHelper.visible = true;
        const gridModeUI = document.getElementById('grid-mode-ui');
        if(gridModeUI) gridModeUI.classList.remove('hidden');

        if(this.previewMesh) { this.scene.remove(this.previewMesh); this.previewMesh = null; }
        this.previewMesh = this.create3DObject(type, true);
        this.scene.add(this.previewMesh);

        this.canPlaceInGrid = false;
        setTimeout(() => { this.canPlaceInGrid = true; }, 250);

        window.hubBuildingState = 'BUILDING_GRID';
    }

    cancelGridPlacement() {
        window.hubBuildingState = 'EXPLORING';
        this.gridHelper.visible = false;
        const gridModeUI = document.getElementById('grid-mode-ui');
        if(gridModeUI) gridModeUI.classList.add('hidden');

        if(this.previewMesh) { this.scene.remove(this.previewMesh); this.previewMesh = null; }

        const hubStatusUI = document.getElementById('hub-status-ui');
        if(hubStatusUI) {
            hubStatusUI.classList.remove('opacity-0');
            hubStatusUI.classList.remove('hidden');
        }
    }

    placeDecorStructure() {
        if(window.hubBuildingState !== 'BUILDING_GRID' || !this.previewMesh || !this.canPlaceInGrid) return;

        const isSkyStructure = (this.selectedBuildType === 'ilha_satelite' || this.selectedBuildType === 'ponte_magica');
        const dist = Math.hypot(this.previewMesh.position.x, this.previewMesh.position.z);
        const MAX_SKY_DISTANCE = 90.0;

        let canPlace = false;
        if (isSkyStructure) {
            const safeDistance = (this.selectedBuildType === 'ilha_satelite') ? 4.0 : 1.5;
            const isOutsideIslands = this.checkCollision(this.previewMesh.position, safeDistance);
            canPlace = isOutsideIslands && dist < MAX_SKY_DISTANCE;
            if (!canPlace) {
                if (!isOutsideIslands) {
                    window.showToast("❌ Espaço insuficiente! As ilhas não podem se sobrepor.", "text-red-400", "fa-circle-xmark");
                } else {
                    window.showToast("❌ Escolha um local vazio no céu (abismo) próximo à ilha central!", "text-red-400", "fa-circle-xmark");
                }
                return;
            }
        } else {
            const isInsideSafeGround = !this.checkCollision(this.previewMesh.position, 0.5);
            canPlace = isInsideSafeGround;
            if (!canPlace) {
                window.showToast("❌ Escolha um local seguro no solo da ilha!", "text-red-400", "fa-circle-xmark");
                return;
            }
        }

        this.instantiatePlacedStructure(
            this.selectedBuildType,
            this.previewMesh.position.x,
            this.previewMesh.position.y,
            this.previewMesh.position.z,
            this.previewRotationY,
            true
        );

        this.cancelGridPlacement();
        window.showToast("✔ Elemento construído com sucesso!", "text-green-400", "fa-circle-check");
    }

    handleGridMouseMove(e, camera) {
        if(window.hubBuildingState !== 'BUILDING_GRID' || !this.previewMesh) return;

        this.mouseVec.x = (e.clientX / window.innerWidth) * 2 - 1;
        this.mouseVec.y = -(e.clientY / window.innerHeight) * 2 + 1;

        this.raycaster.setFromCamera(this.mouseVec, camera);
        const intersects = this.raycaster.intersectObject(this.gridPlane);

        if(intersects.length > 0) {
            const pt = intersects[0].point;
            const step = 1.5;
            this.gridSnapPos.x = Math.floor(pt.x / step) * step + step / 2;
            this.gridSnapPos.z = Math.floor(pt.z / step) * step + step / 2;
            this.gridSnapPos.y = Math.sin(this.gridSnapPos.x * 0.3) * Math.cos(this.gridSnapPos.z * 0.3) * 0.5 + 0.05;

            const isSkyStructure = (this.selectedBuildType === 'ilha_satelite' || this.selectedBuildType === 'ponte_magica');
            const dist = Math.hypot(this.gridSnapPos.x, this.gridSnapPos.z);
            const MAX_SKY_DISTANCE = 90.0;

            let canPlace = false;
            if (isSkyStructure) {
                const safeDistance = (this.selectedBuildType === 'ilha_satelite') ? 4.0 : 1.5;
                const isOutsideIslands = this.checkCollision(this.gridSnapPos, safeDistance);
                canPlace = isOutsideIslands && dist < MAX_SKY_DISTANCE;
            } else {
                const isInsideSafeGround = !this.checkCollision(this.gridSnapPos, 0.5);
                canPlace = isInsideSafeGround;
            }

            if (canPlace) {
                this.previewMesh.position.copy(this.gridSnapPos);
                this.previewMesh.rotation.y = this.previewRotationY;
                this.previewMesh.visible = true;
            } else {
                this.previewMesh.visible = false;
            }
        }
    }

    handleGridMouseWheel(e) {
        if (window.hubBuildingState === 'BUILDING_GRID' && this.previewMesh) {
            e.preventDefault();
            this.previewRotationY += Math.sign(e.deltaY) * (Math.PI / 8);
            this.previewMesh.rotation.y = this.previewRotationY;
        }
    }

    triggerIslandExpansion(level, animate = true) {
        if (level <= this.expansionSlots.length) {
            const slot = this.expansionSlots[level - 1];
            const newIsland = this.createIslandMesh(slot.x, slot.z, false);

            if(animate) {
                newIsland.position.y = -35; newIsland.scale.set(0.1, 0.1, 0.1);
                this.expansionGroup.add(newIsland);

                let animProgress = 0;
                const animInterval = setInterval(() => {
                    animProgress += 0.02;
                    newIsland.position.y = -35 + (35 * animProgress);
                    newIsland.scale.setScalar(animProgress);
                    if (animProgress >= 1.0) {
                        newIsland.position.y = 0; newIsland.scale.set(1, 1, 1);
                        clearInterval(animInterval);
                    }
                }, 16);
            } else {
                newIsland.position.y = 0; newIsland.scale.set(1, 1, 1);
                this.expansionGroup.add(newIsland);
            }
        }
    }

    restoreState() {
        const built = gameState.buildingsBuilt;
        for(let i = 1; i <= built.island; i++) {
            this.triggerIslandExpansion(i, false);
        }

        if (Array.isArray(gameState.hubState.structures)) {
            gameState.hubState.structures.forEach(st => {
                if (st && typeof st.x === 'number' && typeof st.z === 'number') {
                    this.instantiatePlacedStructure(st.type, st.x, st.y, st.z, st.ry, false);
                }
            });
        }
    }

    formatGameTime(hours) {
        const h = Math.floor(hours);
        const m = Math.floor((hours % 1) * 60);
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    }

    updateTimeAndWeatherHUD() {
        const timeStr = this.formatGameTime(gameState.hubState.gameTimeHours);
        const locationSubtitle = document.getElementById('location-subtitle');
        const weatherBadgeIcon = document.getElementById('weather-badge-icon');
        const weatherBadgeText = document.getElementById('weather-badge-text');

        if(locationSubtitle) {
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

    enterTent() {
        window.hubBuildingState = 'INSIDE_TENT';
        const eyelidTop = document.getElementById('eyelid-top');
        const eyelidBottom = document.getElementById('eyelid-bottom');
        if(eyelidTop) eyelidTop.style.height = '50%';
        if(eyelidBottom) eyelidBottom.style.height = '50%';

        setTimeout(() => {
            if(window.penitentGroup) {
                window.penitentGroup.position.set(200, 0.2, 202.5);
                window.penitentGroup.rotation.set(0, Math.PI, 0);
            }

            const locationTitle = document.getElementById('location-title');
            const locationIcon = document.getElementById('location-icon');
            if(locationTitle) locationTitle.textContent = "Interior da Barraca";
            if(locationIcon) locationIcon.className = "fa-solid fa-person-shelter text-xl";

            if(eyelidTop) eyelidTop.style.height = '0%';
            if(eyelidBottom) eyelidBottom.style.height = '0%';
            window.showToast("🏠 Você entrou no aconchego da barraca.", "text-yellow-400", "fa-person-shelter");
        }, 500);
    }

    exitTent() {
        const eyelidTop = document.getElementById('eyelid-top');
        const eyelidBottom = document.getElementById('eyelid-bottom');
        if(eyelidTop) eyelidTop.style.height = '50%';
        if(eyelidBottom) eyelidBottom.style.height = '50%';

        setTimeout(() => {
            window.hubBuildingState = 'EXPLORING';

            const barracaData = gameState.hubState.structures.find(s => s.type === 'barraca');
            if (window.penitentGroup) {
                if (barracaData) {
                    window.penitentGroup.position.set(barracaData.x, barracaData.y + 0.1, barracaData.z + 3.2);
                } else {
                    window.penitentGroup.position.set(0, 0.2, 3.5);
                }
                window.penitentGroup.rotation.set(0, 0, 0);
            }

            const locationTitle = document.getElementById('location-title');
            const locationIcon = document.getElementById('location-icon');
            if(locationTitle) locationTitle.textContent = "Santuário Celeste";
            if(locationIcon) locationIcon.className = "fa-solid fa-cloud text-xl";

            this.updateTimeAndWeatherHUD();

            if(eyelidTop) eyelidTop.style.height = '0%';
            if(eyelidBottom) eyelidBottom.style.height = '0%';
            window.showToast("🌿 Você saiu para o acampamento.", "text-green-400", "fa-campground");
        }, 500);
    }

    sleepInTent() {
        const eyelidTop = document.getElementById('eyelid-top');
        const eyelidBottom = document.getElementById('eyelid-bottom');
        if(eyelidTop) eyelidTop.style.height = '50%';
        if(eyelidBottom) eyelidBottom.style.height = '50%';

        setTimeout(() => {
            gameState.hubState.gameTimeHours = (gameState.hubState.gameTimeHours + 8.0) % 24.0;
            if (gameState.hubState.gameTimeHours < 8.0) gameState.hubState.dayCount++;

            if (Math.random() < 0.6) {
                const keys = Object.keys(WEATHER_TYPES);
                gameState.hubState.currentWeatherKey = keys[Math.floor(Math.random() * keys.length)];
            }

            gameState.save();
            this.updateTimeAndWeatherHUD();

            if(eyelidTop) eyelidTop.style.height = '0%';
            if(eyelidBottom) eyelidBottom.style.height = '0%';

            const timeStr = this.formatGameTime(gameState.hubState.gameTimeHours);
            window.showToast(`💤 Você dormiu 8 horas. Horário: ${timeStr} (Dia ${gameState.hubState.dayCount})`, "text-blue-300", "fa-moon");
        }, 700);
    }

    handleJournalInteraction() {
        const journalUI = document.getElementById('journal-ui');
        if(journalUI) journalUI.classList.remove('hidden');
        gameState.save();
        window.showToast("💾 Progresso e acampamento salvos com sucesso!", "text-green-400", "fa-floppy-disk");
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

    bindEvents() {
        this.mouseMoveHandler = (e) => this.handleGridMouseMove(e, this.camera);
        this.mouseWheelHandler = (e) => this.handleGridMouseWheel(e);
        this.clickHandler = (e) => {
            if(window.hubBuildingState === 'BUILDING_GRID') {
                if (e.target.closest('#grid-mode-ui')) return;
                this.placeDecorStructure();
            }
        };

        window.addEventListener('mousemove', this.mouseMoveHandler);
        window.addEventListener('wheel', this.mouseWheelHandler, { passive: false });
        window.addEventListener('click', this.clickHandler);
    }

    cleanup() {
        const disposeGroup = (group) => {
            if (!group) return;
            group.traverse(child => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(m => m.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
            });
            this.scene.remove(group);
        };

        disposeGroup(this.hubGroup);
        disposeGroup(this.skyGroup);
        disposeGroup(this.cloudsGroup);

        if (this.erosSpot) {
            this.scene.remove(this.erosSpot);
            if(this.erosSpot.target) this.scene.remove(this.erosSpot.target);
            this.erosSpot.dispose();
        }

        this.groundMeshes = [];
        this.npcs = [];
    }

    cleanup() {
        const disposeGroup = (group) => {
            if (!group) return;
            group.traverse(child => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(m => m.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
            });
            this.scene.remove(group);
        };

        disposeGroup(this.hubGroup);
        disposeGroup(this.skyGroup);
        if(this.tentInteriorGroup) disposeGroup(this.tentInteriorGroup);
        if(this.weatherParticleGroup) disposeGroup(this.weatherParticleGroup);

        if (this.erosSpot) {
            this.scene.remove(this.erosSpot);
            if(this.erosSpot.target) this.scene.remove(this.erosSpot.target);
            this.erosSpot.dispose();
        }

        this.groundMeshes = [];
        this.interactiveObjects = [];

        window.removeEventListener('mousemove', this.mouseMoveHandler);
        window.removeEventListener('wheel', this.mouseWheelHandler);
        window.removeEventListener('click', this.clickHandler);
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
        const pGeo = this.weatherParticleGroup.children[0].geometry;
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

        this.grassUniforms.uTime.value = time;
        this.grassUniforms.uPlayerPos.value.copy(safePos);

        this.updateDayNightLighting(delta);
        this.updateWeatherSimulation(delta, time);
        this.animateCampfireAndVegetation(delta, time);

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
                if(this.isNearEros) {
                    if (window.currentNearbyObject && window.currentNearbyObject.name === 'Eros') {
                        window.currentNearbyObject = null;
                        const prompt = document.getElementById('interaction-prompt');
                        if(prompt) prompt.style.opacity = '0';
                    }
                }
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
        if (window.hubBuildingState === 'INSIDE_TENT') {
            return 0; // Flat floor inside tent
        }

        // Check if on any active island (Central + Expansion slots up to built island count)
        const built = gameState.buildingsBuilt ? gameState.buildingsBuilt.island : 0;
        const radius = this.ISLAND_SIZE / 2.0;
        const safeRadius = radius + 1.5;

        // Check central island
        if (Math.hypot(pos.x, pos.z) <= safeRadius) return 0.4;

        // Check active expansions
        for (let i = 0; i < built && i < this.expansionSlots.length; i++) {
            const slot = this.expansionSlots[i];
            if (Math.hypot(pos.x - slot.x, pos.z - slot.z) <= safeRadius) return 0.4;
        }

        // Check Portal Island
        if (this.portalIslandData && Math.hypot(pos.x - this.portalIslandData.x, pos.z - this.portalIslandData.z) <= this.portalIslandData.radius) {
            return this.portalIslandData.y;
        }

        // Check Portal Stepping Stones
        if (this.portalSteppingStones) {
            for (let stone of this.portalSteppingStones) {
                if (Math.hypot(pos.x - stone.x, pos.z - stone.z) <= stone.radius + 0.5) {
                    return stone.y;
                }
            }
        }

        // Check dynamically placed sky islands and magic bridges
        for (let island of this.placedSkyIslands) {
            if (!island || typeof island.x !== 'number' || typeof island.z !== 'number') continue;

            if (island.type === 'ilha_satelite') {
                if (Math.hypot(pos.x - island.x, pos.z - island.z) <= 4.0) {
                    return 0.25; // Grass level of satellite island
                }
            } else if (island.type === 'ponte_magica') {
                // Simplified AABB logic: Unrotate player relative to bridge center
                const ry = island.ry || 0;
                const dx = pos.x - island.x;
                const dz = pos.z - island.z;
                const cosA = Math.cos(-ry);
                const sinA = Math.sin(-ry);
                const localX = dx * cosA - dz * sinA;
                const localZ = dx * sinA + dz * cosA;

                // Magic bridge dimensions approx: width X = 1.4, length Z = 1.5 (span from -0.75 to 0.75 roughly)
                if (Math.abs(localX) <= 0.7 && Math.abs(localZ) <= 0.9) {
                    return 0.15; // Plank level
                }
            }
        }

        // If not over any ground, trigger abyss
        return -50;
    }

    checkCollision(pos, radius) {
        if (window.hubBuildingState === 'INSIDE_TENT') {
            const distFromTentCenter = Math.hypot(pos.x - 200, pos.z - 200);
            return distFromTentCenter > 4.5;
        }

        // Use collision radius based on the circular island shape
        const islandRadius = this.ISLAND_SIZE / 2.0;
        const safeRadius = islandRadius + 1.5 + (radius || 0);

        // Check if player is on central island
        if (Math.hypot(pos.x, pos.z) <= safeRadius) return false;

        const built = gameState.buildingsBuilt ? gameState.buildingsBuilt.island : 0;
        for (let i = 0; i < built && i < this.expansionSlots.length; i++) {
            const slot = this.expansionSlots[i];
            if (Math.hypot(pos.x - slot.x, pos.z - slot.z) <= safeRadius) return false; // Inside an expansion
        }

        // Check Portal Island
        if (this.portalIslandData && Math.hypot(pos.x - this.portalIslandData.x, pos.z - this.portalIslandData.z) <= this.portalIslandData.radius) {
            return false;
        }

        // Check Portal Stepping Stones
        if (this.portalSteppingStones) {
            for (let stone of this.portalSteppingStones) {
                if (Math.hypot(pos.x - stone.x, pos.z - stone.z) <= stone.radius + 0.5) {
                    return false;
                }
            }
        }

        // Check dynamically placed sky structures
        for (let island of this.placedSkyIslands) {
            if (!island || typeof island.x !== 'number' || typeof island.z !== 'number') continue;

            if (island.type === 'ilha_satelite') {
                if (Math.hypot(pos.x - island.x, pos.z - island.z) <= (4.0 + (radius || 0))) return false;
            } else if (island.type === 'ponte_magica') {
                const ry = island.ry || 0;
                const dx = pos.x - island.x;
                const dz = pos.z - island.z;
                const cosA = Math.cos(-ry);
                const sinA = Math.sin(-ry);
                const localX = dx * cosA - dz * sinA;
                const localZ = dx * sinA + dz * cosA;

                const checkX = 0.7 + (radius || 0);
                const checkZ = 0.9 + (radius || 0);

                if (Math.abs(localX) <= checkX && Math.abs(localZ) <= checkZ) return false;
            }
        }

        return true; // Outside all islands bounds
    }
}