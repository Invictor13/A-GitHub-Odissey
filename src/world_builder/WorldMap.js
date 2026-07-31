import * as THREE from 'three';

export class WorldMap {
    constructor(scene) {
        this.scene = scene;
        this.worldGroup = new THREE.Group();
        this.scene.add(this.worldGroup);

        this.islandGroups = [];
        this.bridgeGroups = [];
        this.interactableObjects = [];
        this.windObjects = [];
        this.worldMap = new Set();
        this.bridgeSet = new Set();

        this.islandSpacing = 34;
        this.islandRadius = 12;
        this.dummy = new THREE.Object3D();
        this.colorObj = new THREE.Color();

        this.rpgData = {
            field: { names: ["Planície dos Ventos", "Campos Verdes", "Prados Serenos"], diff: ["★☆☆☆☆", "★★☆☆☆"], enemies: ["Slimes", "Bandidos Fracos"], animals: ["Coelhos", "Ovelhas"], fishes: ["Peixe-Dourado", "Carpa"], minerals: ["Pedra", "Cobre"] },
            forest: { names: ["Floresta Anciã", "Bosque Sombrio", "Mata Fechada"], diff: ["★★☆☆☆", "★★★☆☆"], enemies: ["Lobos Selvagens", "Ursos"], animals: ["Cervos", "Javalis"], fishes: ["Salmão", "Truta"], minerals: ["Madeira de Lei", "Ferro"] },
            desert: { names: ["Deserto Escaldante", "Dunas Esquecidas", "Areias da Morte"], diff: ["★★★☆☆", "★★★★☆"], enemies: ["Escorpiões", "Golens de Areia"], animals: ["Lagartos", "Coiotes"], fishes: ["Peixe-de-Areia"], minerals: ["Ouro", "Quartzo"] }
        };

        this.palettes = {
            stone: 0x475569, wood: 0x451a03, bridge: 0x78350f, tent: 0xef4444,
            biomes: {
                field: { id: 'field', base: 0x573410, top: [0x4ade80, 0x22c55e], leaves: [0x15803d, 0x16a34a], prob: 0.5 },
                forest: { id: 'forest', base: 0x271907, top: [0x166534, 0x14532d], leaves: [0x064e3b, 0x065f46], prob: 0.3 },
                desert: { id: 'desert', base: 0xd97706, top: [0xfbbf24, 0xfcd34d], leaves: [0x4d7c0f], prob: 0.2 }
            }
        };

        this.boxGeo = new THREE.BoxGeometry(1, 1, 1);
        this.bridgeMat = new THREE.MeshStandardMaterial({ color: this.palettes.bridge, roughness: 1.0 });
        this.blankMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 });

        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.mouseDownTime = 0;
        this.activeIslandData = null;

        this.bindEvents();
        this.injectReturnButton();
        this.initWorld();
    }

    pseudoNoise(x, z, seedX, seedZ) {
        const nx = x + seedX * 100; const nz = z + seedZ * 100;
        return (Math.sin(nx * 0.15) + Math.cos(nz * 0.15) + Math.sin((nx+nz) * 0.2)) / 3;
    }

    getBiome() {
        const r = Math.random();
        if (r < this.palettes.biomes.forest.prob) return 'forest';
        if (r < this.palettes.biomes.forest.prob + this.palettes.biomes.desert.prob) return 'desert';
        return 'field';
    }

    spawnIsland(gridX, gridZ, parentX = null, parentZ = null, isHub = false) {
        const key = `${gridX},${gridZ}`;
        if (this.worldMap.has(key)) {
            if (parentX !== null && parentZ !== null) this.createBridge(parentX, parentZ, gridX, gridZ);
            return false;
        }
        this.worldMap.add(key);

        const islandCenter = new THREE.Vector3(gridX * this.islandSpacing, 0, gridZ * this.islandSpacing);
        const islandWrapper = new THREE.Group();
        islandWrapper.position.copy(islandCenter);
        this.worldGroup.add(islandWrapper);

        const biomeType = isHub ? 'field' : this.getBiome();
        const biome = this.palettes.biomes[biomeType];

        const baseData = []; const topData = [];
        for (let x = -this.islandRadius; x <= this.islandRadius; x++) {
            for (let z = -this.islandRadius; z <= this.islandRadius; z++) {
                const dist = Math.sqrt(x*x + z*z);
                const noise = this.pseudoNoise(x, z, gridX, gridZ);
                if (dist < (this.islandRadius - 2) + noise * 3) {
                    let topHeight = 1 + Math.floor(Math.abs(noise) * 3);
                    if (dist < 4) topHeight += isHub ? 0 : Math.floor(Math.random()*2);

                    let depth = Math.floor((this.islandRadius - dist) * 1.5 + Math.abs(noise) * 2);
                    if (depth < 1) depth = 1;

                    const totalHeight = topHeight + depth;
                    const centerY = (topHeight - depth) / 2;

                    const animDelay = dist / this.islandRadius;

                    baseData.push({ pos: new THREE.Vector3(x, centerY, z), scale: new THREE.Vector3(1, totalHeight, 1), delay: animDelay });

                    const topColorHex = biome.top[Math.floor(Math.random() * biome.top.length)];
                    topData.push({ pos: new THREE.Vector3(x, topHeight + 0.12, z), scale: new THREE.Vector3(1.02, 0.25, 1.02), color: topColorHex, delay: animDelay });
                }
            }
        }

        const baseMat = new THREE.MeshStandardMaterial({ color: biome.base, roughness: 1 });
        const baseInstanced = new THREE.InstancedMesh(this.boxGeo, baseMat, baseData.length);
        baseInstanced.castShadow = true; baseInstanced.receiveShadow = true;
        for(let i=0; i<baseData.length; i++) {
            this.dummy.position.copy(baseData[i].pos);
            this.dummy.scale.setScalar(0.001);
            this.dummy.rotation.set(0, 0, 0);
            this.dummy.updateMatrix();
            baseInstanced.setMatrixAt(i, this.dummy.matrix);
        }
        islandWrapper.add(baseInstanced);

        const topInstanced = new THREE.InstancedMesh(this.boxGeo, this.blankMat, topData.length);
        topInstanced.castShadow = true; topInstanced.receiveShadow = true;
        for(let i=0; i<topData.length; i++) {
            this.dummy.position.copy(topData[i].pos);
            this.dummy.scale.setScalar(0.001);
            this.dummy.rotation.set(0, 0, 0);
            this.dummy.updateMatrix();
            topInstanced.setMatrixAt(i, this.dummy.matrix);

            this.colorObj.setHex(topData[i].color);
            topInstanced.setColorAt(i, this.colorObj);
        }
        topInstanced.userData = { isClickable: !isHub, gridX, gridZ, biomeId: biome.id, center: islandCenter };
        if (!isHub) this.interactableObjects.push(topInstanced);
        islandWrapper.add(topInstanced);

        const propsGroup = new THREE.Group();
        propsGroup.scale.setScalar(0.001);
        islandWrapper.add(propsGroup);

        topData.forEach(data => {
            if(data.pos.x === 0 && data.pos.z === 0 && isHub) {
                this.createCamp(propsGroup, data.pos.x, data.pos.y + 0.2, data.pos.z);
            } else if (Math.random() > 0.94 && (!isHub || Math.abs(data.pos.x) > 2 || Math.abs(data.pos.z) > 2)) {
                if (Math.random() > 0.6) this.createRock(propsGroup, data.pos.x, data.pos.y + 0.2, data.pos.z);
                else this.createVegetation(propsGroup, data.pos.x, data.pos.y + 0.2, data.pos.z, biomeType, biome);
            }
        });

        this.islandGroups.push({
            group: islandWrapper,
            baseInstanced, topInstanced, baseData, topData, propsGroup,
            spawnTimer: 0,
            baseY: (Math.random() - 0.5) * 4,
            hoverSpeed: 0.5 + Math.random() * 0.5, hoverOffset: Math.random() * Math.PI * 2
        });

        if (parentX !== null && parentZ !== null) this.createBridge(parentX, parentZ, gridX, gridZ);

        return true;
    }

    createCamp(parent, x, y, z) {
        const tentMat = new THREE.MeshStandardMaterial({ color: this.palettes.tent, flatShading: true });
        const tent = new THREE.Mesh(new THREE.CylinderGeometry(0, 1.2, 1.5, 4), tentMat);
        tent.position.set(x - 1, y + 0.6, z - 1); tent.rotation.y = Math.PI / 4; tent.castShadow = true;
        parent.add(tent);

        const fire = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.6, 4), new THREE.MeshBasicMaterial({ color: 0xf97316 }));
        fire.position.set(x + 1, y + 0.3, z + 1);
        parent.add(fire);

        const fireLight = new THREE.PointLight(0xf97316, 1, 15);
        fireLight.position.set(x + 1, y + 1, z + 1);
        parent.add(fireLight);
    }

    createVegetation(parent, x, y, z, type, biomeDef) {
        if (type === 'desert') {
            const group = new THREE.Group();
            const main = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.2, 0.4), new THREE.MeshStandardMaterial({ color: biomeDef.leaves[0] }));
            main.position.y = 0.6; main.castShadow = true; group.add(main);
            group.position.set(x, y, z); parent.add(group);
        } else {
            const group = new THREE.Group();
            const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, 0.8, 4), new THREE.MeshStandardMaterial({ color: this.palettes.wood }));
            trunk.position.y = 0.4; trunk.castShadow = true; group.add(trunk);
            const leavesGroup = new THREE.Group();
            const leavesMat = new THREE.MeshStandardMaterial({ color: biomeDef.leaves[0], flatShading: true });
            const tiers = 2 + Math.floor(Math.random() * 2);
            for(let i=0; i<tiers; i++) {
                const cone = new THREE.Mesh(new THREE.ConeGeometry(0.7 - (i*0.15), 1.2, 4), leavesMat);
                cone.position.y = 1.0 + (i * 0.5); cone.castShadow = true; leavesGroup.add(cone);
            }
            group.add(leavesGroup);
            group.scale.setScalar(0.7 + Math.random() * 0.6); group.position.set(x + (Math.random()-0.5)*0.5, y, z + (Math.random()-0.5)*0.5);
            parent.add(group);
            this.windObjects.push({ obj: leavesGroup, speed: 1.5 + Math.random(), phase: Math.random() * 10 });
        }
    }

    createRock(parent, x, y, z) {
        const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.4, 0), new THREE.MeshStandardMaterial({ color: this.palettes.stone, flatShading: true }));
        rock.position.set(x, y + 0.2, z); rock.castShadow = true; parent.add(rock);
    }

    createBridge(x1, z1, x2, z2) {
        const bridgeId = [x1, z1, x2, z2].sort().join('_');
        if (this.bridgeSet.has(bridgeId)) return;
        this.bridgeSet.add(bridgeId);

        const start = new THREE.Vector3(x1 * this.islandSpacing, 0, z1 * this.islandSpacing);
        const end = new THREE.Vector3(x2 * this.islandSpacing, 0, z2 * this.islandSpacing);
        start.y = 1; end.y = 1;

        const steps = 12;
        const numPlanks = steps - 1;
        const bridgeIM = new THREE.InstancedMesh(new THREE.BoxGeometry(2.5, 0.3, 1.2), this.bridgeMat, numPlanks);
        bridgeIM.castShadow = true;

        const bridgeData = [];
        for(let i=1; i<steps; i++) {
            const idx = i - 1;
            const t = i / steps;
            const pos = start.clone().lerp(end, t);
            pos.y -= Math.sin(t * Math.PI) * 4;
            bridgeData.push({ pos, lookAt: end.clone(), rotZ: (Math.random() - 0.5) * 0.2, delay: t, idx: idx });

            this.dummy.position.copy(pos);
            this.dummy.scale.setScalar(0.001);
            this.dummy.updateMatrix();
            bridgeIM.setMatrixAt(idx, this.dummy.matrix);
        }
        this.worldGroup.add(bridgeIM);
        this.bridgeGroups.push({ im: bridgeIM, data: bridgeData, spawnTimer: 0 });
    }

    bindEvents() {
        this._onPointerDown = () => { this.mouseDownTime = Date.now(); };
        this._onPointerUp = (e) => {
            if (Date.now() - this.mouseDownTime < 250 && e.target.tagName === 'CANVAS') {
                this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1; this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
                this.raycaster.setFromCamera(this.mouse, window.camera);
                const intersects = this.raycaster.intersectObjects(this.interactableObjects);
                if (intersects.length > 0) {
                    const data = intersects[0].object.userData;
                    if (data && data.isClickable) this.openModal(data);
                }
            }
        };
        window.addEventListener('pointerdown', this._onPointerDown);
        window.addEventListener('pointerup', this._onPointerUp);

        // Bind enter logic
        const btnEntrar = document.getElementById('btn-entrar');
        if (btnEntrar) {
            this._onBtnEntrar = () => {
                this.closeModal();
                if (this.activeIslandData) {
                    const clickedMesh = this.interactableObjects.find(obj => obj.userData.gridX === this.activeIslandData.gridX && obj.userData.gridZ === this.activeIslandData.gridZ);
                    if(clickedMesh) clickedMesh.userData.isClickable = false;

                    const dirs = [ {dx: 1, dz: 0}, {dx: -1, dz: 0}, {dx: 0, dz: 1}, {dx: 0, dz: -1} ];
                    dirs.forEach((dir, index) => {
                        setTimeout(() => this.spawnIsland(this.activeIslandData.gridX + dir.dx, this.activeIslandData.gridZ + dir.dz, this.activeIslandData.gridX, this.activeIslandData.gridZ), index * 300);
                    });

                    // Launch run
                    window.changeGameState('ROGUELIKE', { biome: this.activeIslandData.biomeId });
                }
            };
            btnEntrar.addEventListener('click', this._onBtnEntrar);
        }

        const btnClose = document.getElementById('rpg-modal-close');
        if (btnClose) {
            this._onBtnClose = () => { this.closeModal(); };
            btnClose.addEventListener('click', this._onBtnClose);
        }
    }

    getRandomObj(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

    openModal(data) {
        this.activeIslandData = data;
        const b = this.rpgData[data.biomeId];
        const titleEl = document.getElementById('m-title'); if(titleEl) titleEl.innerText = this.getRandomObj(b.names);
        const diffEl = document.getElementById('m-diff'); if(diffEl) diffEl.innerText = this.getRandomObj(b.diff);
        const enemiesEl = document.getElementById('m-enemies'); if(enemiesEl) enemiesEl.innerText = this.getRandomObj(b.enemies);
        const animalsEl = document.getElementById('m-animals'); if(animalsEl) animalsEl.innerText = this.getRandomObj(b.animals);
        const fishesEl = document.getElementById('m-fishes'); if(fishesEl) fishesEl.innerText = this.getRandomObj(b.fishes);
        const mineralsEl = document.getElementById('m-minerals'); if(mineralsEl) mineralsEl.innerText = this.getRandomObj(b.minerals);
        const modalEl = document.getElementById('rpg-modal'); if(modalEl) modalEl.style.display = 'flex';
    }

    closeModal() {
        const modalEl = document.getElementById('rpg-modal');
        if (modalEl) modalEl.style.display = 'none';
    }

    initWorld() {
        this.spawnIsland(0, 0, null, null, true);
        setTimeout(() => this.spawnIsland(1, 0, 0, 0), 200);
        setTimeout(() => this.spawnIsland(0, 1, 0, 0), 400);
        setTimeout(() => this.spawnIsland(-1, 0, 0, 0), 600);
        setTimeout(() => this.spawnIsland(0, -1, 0, 0), 800);
    }

    injectReturnButton() {
        this.returnBtn = document.createElement('button');
        this.returnBtn.id = 'btn-return-hub';
        this.returnBtn.innerText = '🔙 Retornar ao Hub';
        this.returnBtn.style.position = 'absolute';
        this.returnBtn.style.top = '20px';
        this.returnBtn.style.left = '20px';
        this.returnBtn.style.padding = '12px 20px';
        this.returnBtn.style.background = 'rgba(15, 23, 42, 0.9)';
        this.returnBtn.style.color = '#ffd700';
        this.returnBtn.style.border = '2px solid #ffd700';
        this.returnBtn.style.borderRadius = '12px';
        this.returnBtn.style.fontWeight = 'bold';
        this.returnBtn.style.cursor = 'pointer';
        this.returnBtn.style.zIndex = '100';
        this.returnBtn.style.boxShadow = '0 4px 15px rgba(0,0,0,0.5)';

        this._onReturnClick = () => { window.changeGameState('HUB'); };
        this.returnBtn.addEventListener('click', this._onReturnClick);

        document.body.appendChild(this.returnBtn);
    }

    cleanup() {
        this.scene.remove(this.worldGroup);
        if (this.returnBtn) {
            this.returnBtn.removeEventListener('click', this._onReturnClick);
            this.returnBtn.remove();
        }
        window.removeEventListener('pointerdown', this._onPointerDown);
        window.removeEventListener('pointerup', this._onPointerUp);

        const btnEntrar = document.getElementById('btn-entrar');
        if (btnEntrar && this._onBtnEntrar) btnEntrar.removeEventListener('click', this._onBtnEntrar);

        const btnClose = document.getElementById('rpg-modal-close');
        if (btnClose && this._onBtnClose) btnClose.removeEventListener('click', this._onBtnClose);

        this.closeModal();
    }

    update(delta, time, camera, playerPos) {
        this.islandGroups.forEach(data => {
            if (data.spawnTimer <= 1.0) {
                data.spawnTimer += delta * 0.4;
                const isFinished = data.spawnTimer >= 1.0;

                for(let i=0; i<data.baseData.length; i++) {
                    const bData = data.baseData[i];
                    const progress = isFinished ? 1 : Math.max(0, Math.min(1, (data.spawnTimer - bData.delay * 0.5) * 2.0));
                    const ease = 1 - Math.pow(1 - progress, 4);

                    this.dummy.position.copy(bData.pos);
                    this.dummy.position.y -= (1 - ease) * 15;
                    this.dummy.scale.copy(bData.scale).multiplyScalar(ease || 0.001);
                    this.dummy.rotation.set(0, 0, 0);
                    this.dummy.updateMatrix();
                    data.baseInstanced.setMatrixAt(i, this.dummy.matrix);
                }
                data.baseInstanced.instanceMatrix.needsUpdate = true;

                for(let i=0; i<data.topData.length; i++) {
                    const tData = data.topData[i];
                    const progress = isFinished ? 1 : Math.max(0, Math.min(1, (data.spawnTimer - tData.delay * 0.5) * 2.0));
                    const ease = 1 - Math.pow(1 - progress, 4);

                    this.dummy.position.copy(tData.pos);
                    this.dummy.position.y -= (1 - ease) * 15;
                    this.dummy.scale.copy(tData.scale).multiplyScalar(ease || 0.001);
                    this.dummy.rotation.set(0, 0, 0);
                    this.dummy.updateMatrix();
                    data.topInstanced.setMatrixAt(i, this.dummy.matrix);
                }
                data.topInstanced.instanceMatrix.needsUpdate = true;

                const propsScale = isFinished ? 1 : Math.max(0, Math.min(1, (data.spawnTimer - 0.7) * 3.3));
                data.propsGroup.scale.setScalar(propsScale === 0 ? 0.001 : Math.sin(propsScale * Math.PI/2));
            }
            data.group.position.y = data.baseY + Math.sin(time * data.hoverSpeed + data.hoverOffset) * 1.5;
        });

        this.bridgeGroups.forEach(bridge => {
            if(bridge.spawnTimer <= 1.0) {
                bridge.spawnTimer += delta * 0.5;
                const isFinished = bridge.spawnTimer >= 1.0;
                for(let i=0; i<bridge.data.length; i++) {
                    const bData = bridge.data[i];
                    const progress = isFinished ? 1 : Math.max(0, Math.min(1, (bridge.spawnTimer - bData.delay * 0.5) * 2.0));
                    const ease = 1 - Math.pow(1 - progress, 3);
                    this.dummy.position.copy(bData.pos);
                    this.dummy.position.y += (1 - ease) * 5;
                    this.dummy.lookAt(bData.lookAt);
                    this.dummy.rotation.z += bData.rotZ;
                    this.dummy.scale.setScalar(ease || 0.001);
                    this.dummy.updateMatrix();
                    bridge.im.setMatrixAt(bData.idx, this.dummy.matrix);
                }
                bridge.im.instanceMatrix.needsUpdate = true;
            }
        });

        this.windObjects.forEach(w => { w.obj.rotation.z = Math.sin(time * w.speed * 1.0 + w.phase) * 0.06; });
    }
}
