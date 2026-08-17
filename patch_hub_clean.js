const fs = require('fs');

let content = fs.readFileSync('src/world_builder/HubEnvironment.js', 'utf8');

// 1. Remove BUILD_SLOTS
content = content.replace(/export const BUILD_SLOTS = \[[\s\S]*?\];/, '');

// 2. Add Import for HubTerrain
content = content.replace(/import \{ StructureBuilder \} from '\.\/structures\/StructureBuilder\.js';/, "import { StructureBuilder } from './structures/StructureBuilder.js';\nimport { HubTerrain } from './hub_terrain.js';");

// 3. Update constructor
content = content.replace(/this\.groundMeshes = \[\];[\s\S]*?this\.placedSkyIslands = \[\];/, 'this.interactiveObjects = [];');
content = content.replace(/this\.ISLAND_SIZE = 60\.0;/, '');
content = content.replace(/this\.expansionSlots = \[[\s\S]*?\];/, '');

content = content.replace(/this\.setupMaterials\(\);[\s\S]*?this\.bindEvents\(\);/, `this.setupMaterials();
        this.setupLightingAndSky();

        // Initialize Voxel Terrain
        this.terrain = new HubTerrain(this.scene);
        this.hubGroup.add(this.terrain.group);

        this.setupEnvironment();
        this.setupEros();
        this.setupPortal();

        this.setupWeatherParticles();

        this.updateTimeAndWeatherHUD();`);

// 4. In setupEnvironment, clear out all old terrain and grass spawning, but keep skyClouds and islandBottomClouds
content = content.replace(/setupEnvironment\(\) \{[\s\S]*?createPortalIsland\(x, y, z\) \{/, `setupEnvironment() {
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

    setupPortal() {`);

// Remove createIslandMesh, setupEros (old)
content = content.replace(/createIslandMesh\(x, z, isCentral = false\) \{[\s\S]*?setupEros\(\) \{/, `setupEros() {`);

// Update setupEros
content = content.replace(/this\.eros = new Eros\(this\.scene, new THREE\.Vector3\(4\.0, 0\.4, 4\.0\)\);/, 'this.eros = new Eros(this.scene, new THREE.Vector3(2.0, 2.0, 0.5));\n        this.eros.group.lookAt(0, 2, 0);');
content = content.replace(/this\.erosSpot\.position\.set\(4\.0, 10, 4\.0\);/, 'this.erosSpot.position.set(2.0, 10, 0.5);');

// Replace setupPortal inner code
content = content.replace(/setupPortal\(\) \{[\s\S]*?openExpeditionUI\(\) \{/, `setupPortal() {
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

    openExpeditionUI() {`);

// Remove old setupGridSystem and stuff
content = content.replace(/setupGridSystem\(\) \{[\s\S]*?setupWeatherParticles\(\) \{/, `setupWeatherParticles() {`);

// Remove buildInteractiveTentInterior
content = content.replace(/buildInteractiveTentInterior\(\) \{[\s\S]*?triggerIslandExpansion\(/, `triggerIslandExpansion(`);
content = content.replace(/this\.buildInteractiveTentInterior\(\);/, '');

// Remove all building-related functions up to updateDayNightLighting
content = content.replace(/triggerIslandExpansion\(level, animate = true\) \{[\s\S]*?updateDayNightLighting\(delta\) \{/, `updateDayNightLighting(delta) {`);

// Update the loop
content = content.replace(/update\(delta, time, camera, playerPos\) \{[\s\S]*?if\(window\.hubBuildingState !== 'INSIDE_TENT'\) \{/, `update(delta, time, camera, playerPos) {
        // Trava de segurança para a posição do jogador
        const safePos = (playerPos && typeof playerPos.x === 'number') ? playerPos : new THREE.Vector3(0, 0, 0);

        this.updateDayNightLighting(delta);
        this.updateWeatherSimulation(delta, time);
        this.animateCampfireAndVegetation(delta, time);
        if (this.terrain) this.terrain.update(time);

        if(window.hubBuildingState !== 'INSIDE_TENT') {`);

// Update physics
content = content.replace(/getFloorY\(pos\) \{[\s\S]*?return -50;\n    \}/, `getFloorY(pos) {
        if (!this.terrain) return 0;
        return this.terrain.getHeightAt(pos.x, pos.z);
    }`);

content = content.replace(/checkCollision\(pos, radius\) \{[\s\S]*?return true; \/\/ Outside all islands bounds\n    \}/, `checkCollision(pos, radius) {
        if (!this.terrain) return false;

        // Define player bounding box
        const playerBox = new THREE.Box3();
        const r = radius || 0.3; // Default player radius
        const h = 1.8; // Default player height
        playerBox.min.set(pos.x - r, pos.y, pos.z - r);
        playerBox.max.set(pos.x + r, pos.y + h, pos.z + r);

        const colliders = this.terrain.getColliders();
        for (let i = 0; i < colliders.length; i++) {
            if (playerBox.intersectsBox(colliders[i])) {
                return true; // Collision detected
            }
        }
        return false;
    }`);


fs.writeFileSync('src/world_builder/HubEnvironment.js', content);
