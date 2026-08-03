import * as THREE from 'three';
import gameState from '../core/GameState.js';
import { Eros } from '../characters/Eros.js';

export class HubEnvironment {
    constructor(scene) {
        this.scene = scene;
        this.hubGroup = new THREE.Group();
        this.scene.add(this.hubGroup);

        this.groundMeshes = [];
        this.npcs = [];
        this.ISLAND_SIZE = 22.0;

        this.isNearEros = false;
        this.isModalOpen = false;
        this.erosWaitTimer = 3.0;
        this.erosTargetPos = new THREE.Vector3(4.0, 0.4, 4.0);

        this.expansionSlots = [
            { x: this.ISLAND_SIZE, z: 0 },
            { x: -this.ISLAND_SIZE, z: 0 },
            { x: 0, z: this.ISLAND_SIZE },
            { x: 0, z: -this.ISLAND_SIZE }
        ];

        this.setupMaterials();
        this.setupEnvironment();
        this.setupEros();

        // Spawn based on gameState
        this.restoreState();

        this.bindEvents();
        this.updateResUI();
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

    setupEnvironment() {
        // Stars
        this.skyGroup = new THREE.Group();
        this.scene.add(this.skyGroup);
        const starGeo = new THREE.BufferGeometry();
        const starPos = new Float32Array(1500 * 3);
        for(let i=0; i<1500*3; i+=3) {
            starPos[i] = (Math.random() - 0.5) * 400; starPos[i+1] = 60 + Math.random() * 120; starPos[i+2] = (Math.random() - 0.5) * 400;
        }
        starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
        const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.6, transparent: true, opacity: 0.9, fog: false });
        this.starsMesh = new THREE.Points(starGeo, starMat);
        this.skyGroup.add(this.starsMesh);

        // Volumetric Clouds (below island)
        this.cloudsGroup = new THREE.Group();
        this.scene.add(this.cloudsGroup);
        const cloudGeo = new THREE.DodecahedronGeometry(5.0, 0);
        const cloudMat = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, flatShading: true });
        for (let i = 0; i < 40; i++) {
            const cGroup = new THREE.Group();
            for (let j = 0; j < (Math.random()*5+3); j++) {
                const mesh = new THREE.Mesh(cloudGeo, cloudMat);
                mesh.position.set((Math.random()-0.5)*20, (Math.random()-0.5)*6, (Math.random()-0.5)*20);
                mesh.scale.setScalar(1.5 + Math.random()*4.5);
                cGroup.add(mesh);
            }
            cGroup.position.set((Math.random() - 0.5) * 400, -35 - Math.random() * 30, (Math.random() - 0.5) * 400);
            this.cloudsGroup.add(cGroup);
        }

        // Central Island
        this.centralIsland = this.createIslandMesh(0, 0, true);
        this.hubGroup.add(this.centralIsland);

        // Expansion Group
        this.expansionGroup = new THREE.Group();
        this.hubGroup.add(this.expansionGroup);

        // Campfire
        const campfireGroup = new THREE.Group(); campfireGroup.position.set(0, 0.4, 0); this.hubGroup.add(campfireGroup);
        for(let i=0; i<6; i++) {
            const log = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 1.2, 6), this.matWood);
            log.rotation.z = Math.PI/2; log.rotation.y = (i / 6) * Math.PI * 2; log.position.y = 0.06;
            campfireGroup.add(log);
        }
        const fireLight = new THREE.PointLight(0xf97316, 5.0, 20); fireLight.position.set(0, 0.8, 0); campfireGroup.add(fireLight);
        const fireMesh = new THREE.Mesh(new THREE.ConeGeometry(0.4, 1.2, 6), new THREE.MeshBasicMaterial({ color: 0xf97316 }));
        fireMesh.position.y = 0.6; campfireGroup.add(fireMesh);
    }

    addGrassToBlock(group, width, depth, yLevel) {
        const count = Math.floor((width * depth) * 4.5);
        const iGrass = new THREE.InstancedMesh(this.grassGeo, this.matGrassShader, count);
        const dummy = new THREE.Object3D();
        const grassColor = new THREE.Color(0x22c55e);
        for(let i=0; i<count; i++) {
            dummy.position.set((Math.random()-0.5)*(width-0.5), yLevel, (Math.random()-0.5)*(depth-0.5));
            dummy.rotation.y = Math.random() * Math.PI;
            dummy.scale.setScalar(0.7 + Math.random()*1.0);
            dummy.updateMatrix();
            iGrass.setMatrixAt(i, dummy.matrix);
            iGrass.setColorAt(i, grassColor);
        }
        group.add(iGrass);
    }

    createIslandMesh(x, z, isCentral = false) {
        const group = new THREE.Group();
        const terrainGroup = new THREE.Group();

        const basePlat = new THREE.Mesh(new THREE.BoxGeometry(this.ISLAND_SIZE, 0.4, this.ISLAND_SIZE), this.matGrass);
        basePlat.position.y = 0.2; basePlat.receiveShadow = true; basePlat.castShadow = true;
        terrainGroup.add(basePlat); this.groundMeshes.push(basePlat);

        const baseDirt = new THREE.Mesh(new THREE.BoxGeometry(this.ISLAND_SIZE - 0.2, 8.0, this.ISLAND_SIZE - 0.2), this.matDirt);
        baseDirt.position.y = -4.0;
        baseDirt.receiveShadow = true; baseDirt.castShadow = true;
        terrainGroup.add(baseDirt);

        const baseRock = new THREE.Mesh(new THREE.CylinderGeometry(this.ISLAND_SIZE * 0.45, this.ISLAND_SIZE * 0.15, 20.0, 9), this.matRock);
        baseRock.position.y = -18.0;
        baseRock.castShadow = true; baseRock.receiveShadow = true;
        terrainGroup.add(baseRock);

        for (let i = 0; i < 5; i++) {
            const stalactite = new THREE.Mesh(new THREE.ConeGeometry(1 + Math.random()*2, 4 + Math.random()*6, 5), this.matDirt);
            stalactite.position.set((Math.random()-0.5)*(this.ISLAND_SIZE-3), -8.0 - Math.random()*2, (Math.random()-0.5)*(this.ISLAND_SIZE-3));
            stalactite.rotation.x = Math.PI;
            stalactite.castShadow = true;
            terrainGroup.add(stalactite);
        }

        this.addGrassToBlock(terrainGroup, this.ISLAND_SIZE, this.ISLAND_SIZE, 0.4);

        const numElevations = isCentral ? 1 : Math.floor(Math.random() * 3) + 2;
        for(let i=0; i<numElevations; i++) {
            const w = 6 + Math.random() * 6; const d = 6 + Math.random() * 6; const h = 0.4 + Math.random() * 1.5;
            let px = (Math.random() - 0.5) * (this.ISLAND_SIZE - w - 2); let pz = (Math.random() - 0.5) * (this.ISLAND_SIZE - d - 2);

            if (isCentral && Math.abs(px) < 6 && Math.abs(pz) < 6) { px = 7; pz = -7; }

            const elevGrass = new THREE.Mesh(new THREE.BoxGeometry(w, 0.4, d), this.matGrass);
            elevGrass.position.set(px, 0.4 + h - 0.2, pz);
            elevGrass.receiveShadow = true; elevGrass.castShadow = true;
            terrainGroup.add(elevGrass); this.groundMeshes.push(elevGrass);

            const elevDirt = new THREE.Mesh(new THREE.BoxGeometry(w - 0.2, h - 0.4, d - 0.2), this.matDirt);
            elevDirt.position.set(px, 0.4 + (h - 0.4)/2, pz);
            elevDirt.receiveShadow = true; elevDirt.castShadow = true;
            terrainGroup.add(elevDirt);

            const localGroup = new THREE.Group(); localGroup.position.set(px, 0, pz);
            this.addGrassToBlock(localGroup, w, d, 0.4 + h);
            terrainGroup.add(localGroup);
        }

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
        this.eros.group.scale.setScalar(1.5);
        this.hubGroup.add(this.eros.group);

        this.erosSpot = new THREE.SpotLight(0xfff5b6, 12.0, 25, Math.PI/6, 0.6, 1.0);
        this.erosSpot.position.set(4.0, 10, 4.0); this.erosSpot.castShadow = true;
        this.scene.add(this.erosSpot); this.scene.add(this.erosSpot.target);
    }

    createNPC(type, x, z) {
        const npcGroup = new THREE.Group();

        const shirtColor = type === 'forge' ? 0x883333 : (type === 'farm' ? 0x338833 : 0x555555);
        const matNPCSkin = new THREE.MeshStandardMaterial({ color: 0xeebbaa, roughness: 0.8, bumpMap: this.texLeatherBump, bumpScale: 0.02 });
        const matNPCShirt = new THREE.MeshStandardMaterial({ color: shirtColor, roughness: 0.9, bumpMap: this.texClothBump, bumpScale: 0.05 });
        const matNPCPants = new THREE.MeshStandardMaterial({ color: 0x332211, roughness: 0.9, bumpMap: this.texClothBump, bumpScale: 0.05 });

        const torso = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.2, 0.5), matNPCShirt); torso.position.y = 1.3; npcGroup.add(torso);
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.6), matNPCSkin); head.position.y = 2.2; npcGroup.add(head);
        const armL = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.8, 0.25), matNPCShirt); armL.position.set(-0.55, 1.5, 0); npcGroup.add(armL);
        const armR = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.8, 0.25), matNPCShirt); armR.position.set(0.55, 1.5, 0); npcGroup.add(armR);
        const legL = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.8, 0.35), matNPCPants); legL.position.set(-0.2, 0.4, 0); npcGroup.add(legL);
        const legR = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.8, 0.35), matNPCPants); legR.position.set(0.2, 0.4, 0); npcGroup.add(legR);

        if(type === 'forge') {
            const hammer = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.8, 0.2), new THREE.MeshStandardMaterial({color:0x444444}));
            hammer.position.set(0.6, 1.2, 0.4); hammer.rotation.x = Math.PI/4; npcGroup.add(hammer);
        } else if(type === 'farm') {
            const hat = new THREE.Mesh(new THREE.ConeGeometry(0.6, 0.3, 8), new THREE.MeshStandardMaterial({color: 0xddaa55}));
            hat.position.y = 2.6; npcGroup.add(hat);
        }

        npcGroup.position.set(x, 0.4, z);
        this.hubGroup.add(npcGroup);
        this.npcs.push({ group: npcGroup, torso: torso, head: head, armL: armL, armR: armR, type: type, animTime: Math.random()*10 });
    }

    spawnBuildingModel(type, x, y, z) {
        const bGroup = new THREE.Group();
        if (type === 'forge') {
            const anvil = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.6, 0.8), new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8 }));
            anvil.position.set(0, 0.3, 1.5); bGroup.add(anvil);
            const furnace = new THREE.Mesh(new THREE.BoxGeometry(2.5, 2.5, 1.5), this.matRock);
            furnace.position.set(0, 1.25, -1.0); bGroup.add(furnace);
            const fFire = new THREE.PointLight(0xffaa00, 3, 12); fFire.position.set(0, 1, -0.2); bGroup.add(fFire);

            this.createNPC('forge', x - 1.5, z + 1.0);

        } else if (type === 'farm') {
            for(let r=0; r<3; r++) {
                const dirt = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.2, 1.0), this.matDirt);
                dirt.position.set(0, 0.1, r * 1.8 - 1.8); bGroup.add(dirt);
                for(let c=0; c<4; c++) {
                    const crop = new THREE.Mesh(new THREE.SphereGeometry(0.3, 5, 5), new THREE.MeshStandardMaterial({color: 0x22c55e}));
                    crop.position.set(c * 1.0 - 1.5, 0.3, r * 1.8 - 1.8); bGroup.add(crop);
                }
            }
            this.createNPC('farm', x + 2.5, z);

        } else if (type === 'animal') {
            const coop = new THREE.Mesh(new THREE.BoxGeometry(3.0, 2.0, 3.0), this.matWood);
            coop.position.set(0, 1.0, -1.5); bGroup.add(coop);
            const roof = new THREE.Mesh(new THREE.ConeGeometry(2.8, 1.8, 4), new THREE.MeshStandardMaterial({color: 0xb91c1c}));
            roof.position.set(0, 2.9, -1.5); roof.rotation.y = Math.PI/4; bGroup.add(roof);
            const fence1 = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.6, 0.1), this.matWood); fence1.position.set(0, 0.4, 2.0); bGroup.add(fence1);
        }

        bGroup.position.set(x, 0.4, z);
        this.hubGroup.add(bGroup);
        bGroup.children.forEach(c => { if(c.geometry) this.groundMeshes.push(c); });
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

        if(built.forge) {
            this.spawnBuildingModel('forge', 14, 0, 0);
            const btn = document.getElementById('btnBuildForge');
            if(btn) { btn.innerText = "Construído"; btn.disabled = true; }
        }
        if(built.farm) {
            this.spawnBuildingModel('farm', -14, 0, 0);
            const btn = document.getElementById('btnBuildFarm');
            if(btn) { btn.innerText = "Construído"; btn.disabled = true; }
        }
        if(built.animal) {
            this.spawnBuildingModel('animal', 0, 0, -14);
            const btn = document.getElementById('btnBuildAnimal');
            if(btn) { btn.innerText = "Construído"; btn.disabled = true; }
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

    updateResUI() {
        // We do not have res-gold in main.js based index.html.
        // But if user expands it later, we'll keep this ready or rely on inventory UI
    }

    bindEvents() {
        window.constructItem = (type) => {
            if (type === 'island') {
                if (gameState.resources.wood >= 30 && gameState.resources.ore >= 15) {
                    gameState.resources.wood -= 30; gameState.resources.ore -= 15;
                    gameState.buildingsBuilt.island++;
                    gameState.save();
                    this.updateResUI();
                    this.triggerIslandExpansion(gameState.buildingsBuilt.island);
                    this.triggerErosBark("Buf! Mais terra firme abaixo das nossas patas. Trabalho sólido!");
                }
            } else if (type === 'forge') {
                if (!gameState.buildingsBuilt.forge && gameState.resources.wood >= 50 && gameState.resources.ore >= 30) {
                    gameState.resources.wood -= 50; gameState.resources.ore -= 30;
                    gameState.buildingsBuilt.forge = true;
                    gameState.save();
                    this.updateResUI();
                    const btn = document.getElementById('btnBuildForge');
                    if(btn) { btn.innerText = "Construído"; btn.disabled = true; }
                    this.spawnBuildingModel('forge', 14, 0, 0);
                    this.triggerErosBark("A fornalha arde! E o nosso Ferreiro de confiança chegou.");
                }
            } else if (type === 'farm') {
                if (!gameState.buildingsBuilt.farm && gameState.resources.wood >= 25 && gameState.resources.straw >= 20) {
                    gameState.resources.wood -= 25; gameState.resources.straw -= 20;
                    gameState.buildingsBuilt.farm = true;
                    gameState.save();
                    this.updateResUI();
                    const btn = document.getElementById('btnBuildFarm');
                    if(btn) { btn.innerText = "Construído"; btn.disabled = true; }
                    this.spawnBuildingModel('farm', -14, 0, 0);
                    this.triggerErosBark("Terra arada. O agricultor vai garantir a nossa ração.");
                }
            } else if (type === 'animal') {
                if (!gameState.buildingsBuilt.animal && gameState.resources.wood >= 40 && gameState.resources.straw >= 30) {
                    gameState.resources.wood -= 40; gameState.resources.straw -= 30;
                    gameState.buildingsBuilt.animal = true;
                    gameState.save();
                    this.updateResUI();
                    const btn = document.getElementById('btnBuildAnimal');
                    if(btn) { btn.innerText = "Construído"; btn.disabled = true; }
                    this.spawnBuildingModel('animal', 0, 0, -14);
                    this.triggerErosBark("Cercado erguido! Espaço seguro para os bichos.");
                }
            }
        };

        const btnBuildIsland = document.getElementById('btnBuildIsland');
        if(btnBuildIsland) btnBuildIsland.onclick = () => window.constructItem('island');

        const btnBuildForge = document.getElementById('btnBuildForge');
        if(btnBuildForge) btnBuildForge.onclick = () => window.constructItem('forge');

        const btnBuildFarm = document.getElementById('btnBuildFarm');
        if(btnBuildFarm) btnBuildFarm.onclick = () => window.constructItem('farm');

        const btnBuildAnimal = document.getElementById('btnBuildAnimal');
        if(btnBuildAnimal) btnBuildAnimal.onclick = () => window.constructItem('animal');
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

    update(delta, time, camera, playerPos) {
        // Trava de segurança para a posição do jogador
        const safePos = (playerPos && typeof playerPos.x === 'number') ? playerPos : new THREE.Vector3(0, 0, 0);

        this.grassUniforms.uTime.value = time;
        this.grassUniforms.uPlayerPos.value.copy(safePos);

        if(this.cloudsGroup) {
            this.cloudsGroup.rotation.y += delta * 0.01;
        }

        // Eros Logic
        if(this.eros) {
            const distToEros = safePos.distanceTo(this.eros.group.position);
            const prompt = document.getElementById('interaction-prompt');

            let isMoving = false;

            if (distToEros < 5.0 && !this.isModalOpen) {
                if(!this.isNearEros && prompt) prompt.style.opacity = '1';
                this.isNearEros = true;

                const targetAngle = Math.atan2(safePos.x - this.eros.group.position.x, safePos.z - this.eros.group.position.z);
                let diff = targetAngle - this.eros.group.rotation.y;
                while (diff < -Math.PI) diff += Math.PI * 2; while (diff > Math.PI) diff -= Math.PI * 2;
                this.eros.group.rotation.y += diff * 6 * delta;

            } else {
                if(this.isNearEros && prompt) prompt.style.opacity = '0';
                this.isNearEros = false;

                if (this.erosWaitTimer > 0) {
                    this.erosWaitTimer -= delta;
                } else {
                    const distToTarget = this.eros.group.position.distanceTo(this.erosTargetPos);
                    if (distToTarget < 0.5) {
                        this.erosWaitTimer = 2 + Math.random() * 5;
                        this.erosTargetPos.set((Math.random() - 0.5) * 12, 0.4, (Math.random() - 0.5) * 12);
                    } else {
                        isMoving = true;
                        const erosMoveDir = new THREE.Vector3().subVectors(this.erosTargetPos, this.eros.group.position);
                        erosMoveDir.y = 0; erosMoveDir.normalize();
                        this.eros.group.position.addScaledVector(erosMoveDir, 2.5 * delta);

                        const targetAngle = Math.atan2(erosMoveDir.x, erosMoveDir.z);
                        let diff = targetAngle - this.eros.group.rotation.y;
                        while (diff < -Math.PI) diff += Math.PI * 2; while (diff > Math.PI) diff -= Math.PI * 2;
                        this.eros.group.rotation.y += diff * 8 * delta;
                    }
                }
            }

            const erosFloorY = this.getFloorY(this.eros.group.position);
            this.eros.group.position.y += (erosFloorY - this.eros.group.position.y) * 10 * delta;

            if(this.erosSpot) {
                this.erosSpot.position.set(this.eros.group.position.x, 10, this.eros.group.position.z);
                this.erosSpot.target.position.copy(this.eros.group.position);
                this.erosSpot.target.updateMatrixWorld();
            }

            this.eros.update(delta, isMoving, false);
        }

        // NPC Animations
        this.npcs.forEach(npc => {
            npc.animTime += delta;
            npc.torso.scale.y = 1.0 + Math.sin(npc.animTime * 2) * 0.03;
            npc.head.rotation.y = Math.sin(npc.animTime * 0.5) * 0.2;
            npc.armL.rotation.x = Math.sin(npc.animTime * 1) * 0.1;
            npc.armR.rotation.x = Math.cos(npc.animTime * 1) * 0.1;
            const nFloorY = this.getFloorY(npc.group.position);
            npc.group.position.y = nFloorY;
        });
    }

    getFloorY(pos) {
        if (!this.groundMeshes || this.groundMeshes.length === 0) return 0;

        // Simple raycaster setup
        if(!this.raycaster) {
            this.raycaster = new THREE.Raycaster();
        }

        const origin = pos.clone();
        origin.y += 10.0;
        this.raycaster.set(origin, new THREE.Vector3(0, -1, 0));

        const intersects = this.raycaster.intersectObjects(this.groundMeshes, false);
        if (intersects.length > 0) {
            return intersects[0].point.y;
        }
        return -50;
    }
}