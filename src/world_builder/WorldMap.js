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

        // UI Layer
        this.uiLayer = null;
        this.rpgModal = null;
        this.loader = null;

        this.currentHour = 12.0;
        this.weatherIdx = 0;

        this.weathers = [
            { id: 'clear', icon: '☀️', cloudTarget: new THREE.Color('#f8fafc'), cloudScale: 1.0 },
            { id: 'rain', icon: '🌧️', cloudTarget: new THREE.Color('#94a3b8'), cloudScale: 2.2 },
            { id: 'storm', icon: '⛈️', cloudTarget: new THREE.Color('#334155'), cloudScale: 3.5 },
            { id: 'snow', icon: '❄️', cloudTarget: new THREE.Color('#bae6fd'), cloudScale: 1.8 },
            { id: 'wind', icon: '💨', cloudTarget: new THREE.Color('#e2e8f0'), cloudScale: 1.3 }
        ];
        this.currentWeather = this.weathers[this.weatherIdx];
        this.globalCloudScale = 1.0;

        this.timeColors = {
            day: { sky: new THREE.Color('#38bdf8'), ambient: new THREE.Color('#bae6fd'), sun: new THREE.Color('#ffedd5'), intensity: 1.2 },
            sunset: { sky: new THREE.Color('#f59e0b'), ambient: new THREE.Color('#fca5a5'), sun: new THREE.Color('#f43f5e'), intensity: 0.8 },
            night: { sky: new THREE.Color('#020617'), ambient: new THREE.Color('#1e293b'), sun: new THREE.Color('#64748b'), intensity: 0.15 },
            sunrise: { sky: new THREE.Color('#fbcfe8'), ambient: new THREE.Color('#fdf4ff'), sun: new THREE.Color('#fcd34d'), intensity: 0.7 },
            storm: { sky: new THREE.Color('#1e293b'), ambient: new THREE.Color('#334155'), sun: new THREE.Color('#94a3b8'), intensity: 0.3 }
        };

        this.setupLighting();
        this.setupWeatherSystem();
        this.setupClouds();
        this.setupMagicRing();
        this.injectUI();

        this.bindEvents();
        this.initWorld();
    }

    setupLighting() {
        this.ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        this.worldGroup.add(this.ambientLight);

        this.sunLight = new THREE.DirectionalLight(0xffffff, 1.2);
        this.sunLight.castShadow = true;
        this.sunLight.shadow.mapSize.width = 2048; this.sunLight.shadow.mapSize.height = 2048;
        const d = 300;
        this.sunLight.shadow.camera.left = -d; this.sunLight.shadow.camera.right = d;
        this.sunLight.shadow.camera.top = d; this.sunLight.shadow.camera.bottom = -d;
        this.sunLight.shadow.camera.far = 1000; this.sunLight.shadow.bias = -0.0005;
        this.worldGroup.add(this.sunLight);

        this.lightningLight = new THREE.PointLight(0xa5b4fc, 0, 1000);
        this.lightningLight.position.set(0, 100, 0);
        this.worldGroup.add(this.lightningLight);
    }

    setupWeatherSystem() {
        this.weatherCount = 8000;
        const weatherGeo = new THREE.BufferGeometry();
        this.weatherPos = new Float32Array(this.weatherCount * 3);
        this.weatherVel = new Float32Array(this.weatherCount);

        for(let i=0; i<this.weatherCount; i++) {
            this.weatherPos[i*3] = (Math.random() - 0.5) * 400;
            this.weatherPos[i*3+1] = Math.random() * 200 - 50;
            this.weatherPos[i*3+2] = (Math.random() - 0.5) * 400;
            this.weatherVel[i] = 1 + Math.random();
        }
        weatherGeo.setAttribute('position', new THREE.BufferAttribute(this.weatherPos, 3));

        this.weatherMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.8, transparent: true, opacity: 0 });
        this.weatherSystem = new THREE.Points(weatherGeo, this.weatherMat);
        this.worldGroup.add(this.weatherSystem);
    }

    setupClouds() {
        this.cloudSeaMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, flatShading: true, transparent: true, opacity: 0.85 });
        const cloudGeo = new THREE.PlaneGeometry(1200, 1200, 40, 40); cloudGeo.rotateX(-Math.PI / 2);
        this.seaOfClouds = new THREE.Mesh(cloudGeo, this.cloudSeaMat); this.seaOfClouds.position.y = -35; this.worldGroup.add(this.seaOfClouds);

        this.cloudCount = 300;
        this.topCloudIM = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(4, 0), this.cloudSeaMat, this.cloudCount);
        this.bottomCloudIM = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(4, 0), this.cloudSeaMat, this.cloudCount);
        this.topCloudData = []; this.bottomCloudData = [];
        this.dummyCloud = new THREE.Object3D();

        for(let i=0; i<this.cloudCount; i++) {
            this.topCloudData.push({ pos: new THREE.Vector3((Math.random()-0.5)*800, 20 + Math.random()*60, (Math.random()-0.5)*800), scale: 0.5 + Math.random()*2, speed: 0.05 + Math.random()*0.1 });
            this.bottomCloudData.push({ pos: new THREE.Vector3((Math.random()-0.5)*800, -20 - Math.random()*15, (Math.random()-0.5)*800), scale: 1 + Math.random()*3, speed: 0.03 + Math.random()*0.08 });
        }
        this.worldGroup.add(this.topCloudIM); this.worldGroup.add(this.bottomCloudIM);
    }

    setupMagicRing() {
        const magicRingGeo = new THREE.TorusGeometry(1, 0.1, 8, 32);
        this.magicRingMat = new THREE.MeshBasicMaterial({ color: 0x60a5fa, transparent: true, opacity: 0, side: THREE.DoubleSide });
        this.magicRing = new THREE.Mesh(magicRingGeo, this.magicRingMat);
        this.magicRing.rotation.x = Math.PI / 2;
        this.worldGroup.add(this.magicRing);
        this.ringAnim = { active: false, scale: 1, opacity: 0 };
    }

    playCreationEffect(pos) {
        this.magicRing.position.copy(pos); this.magicRing.position.y = 5;
        this.ringAnim.active = true; this.ringAnim.scale = 1; this.ringAnim.opacity = 1;
    }

    injectUI() {
        const style = document.createElement('style');
        style.id = 'world-map-styles';
        style.innerHTML = `
            .glass-panel {
                background: rgba(15, 23, 42, 0.7); backdrop-filter: blur(16px);
                border: 1px solid rgba(148, 163, 184, 0.15); border-radius: 24px;
                color: #f8fafc; pointer-events: auto;
                box-shadow: 0 10px 40px rgba(0,0,0,0.5);
            }
            #ui-layer {
                position: absolute; top: 0; left: 0; width: 100%; height: 100%;
                pointer-events: none; display: flex; flex-direction: column; justify-content: flex-end; align-items: center;
                padding: 24px; z-index: 10;
            }
            .hud-bottom {
                display: flex; align-items: center; gap: 15px; padding: 12px 24px;
                margin-bottom: 20px;
            }
            .icon-btn {
                background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(255,255,255,0.2);
                border-radius: 50%; width: 45px; height: 45px; font-size: 20px;
                display: flex; justify-content: center; align-items: center;
                cursor: pointer; transition: all 0.2s; color: white;
            }
            .icon-btn:hover { background: rgba(255, 255, 255, 0.2); transform: scale(1.1); }
            .time-btn {
                background: rgba(0, 0, 0, 0.4); padding: 10px 24px; border-radius: 16px;
                font-size: 18px; font-weight: bold; color: #fbbf24; cursor: pointer;
                border: 1px solid rgba(255,255,255,0.1); transition: all 0.2s;
                min-width: 100px; text-align: center;
            }
            .time-btn:hover { background: rgba(0, 0, 0, 0.6); border-color: #fbbf24; }
            #time-popup {
                position: absolute; bottom: 100px; padding: 15px 20px;
                display: flex; flex-direction: column; gap: 10px; width: 250px;
                opacity: 0; pointer-events: none; transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                transform: translateY(20px);
            }
            #time-popup.active { opacity: 1; pointer-events: auto; transform: translateY(0); }
            #time-popup label { font-size: 12px; font-weight: bold; color: #a7f3d0; text-transform: uppercase; text-align: center;}
            input[type=range] { -webkit-appearance: none; width: 100%; background: transparent; }
            input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; height: 16px; width: 16px; border-radius: 50%; background: #fbbf24; cursor: pointer; margin-top: -6px; box-shadow: 0 0 10px #fbbf24; }
            input[type=range]::-webkit-slider-runnable-track { width: 100%; height: 4px; cursor: pointer; background: rgba(255,255,255,0.2); border-radius: 2px; }
            #rpg-modal {
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(0,0,0,0.6); backdrop-filter: blur(5px);
                z-index: 50; display: none; justify-content: center; align-items: center; pointer-events: auto;
            }
            .modal-content {
                width: 400px; animation: modalPop 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                display: flex; flex-direction: column; gap: 15px; padding: 24px;
            }
            @keyframes modalPop { 0% { transform: scale(0.8); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
            .modal-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 10px; }
            .biome-title { font-size: 22px; font-weight: bold; color: #fff; }
            .difficulty { color: #f87171; font-weight: bold; letter-spacing: 2px;}
            .stat-row { display: flex; align-items: center; gap: 10px; font-size: 13px; color: #cbd5e1; background: rgba(0,0,0,0.2); padding: 8px; border-radius: 6px;}
            .stat-icon { width: 24px; text-align: center; font-size: 16px; }
            .stat-value { font-weight: bold; color: #fff; }
            .btn-entrar {
                background: linear-gradient(135deg, #3b82f6, #2563eb); border: none; padding: 14px;
                border-radius: 12px; color: white; font-weight: bold; font-size: 16px; text-transform: uppercase;
                cursor: pointer; transition: transform 0.1s, box-shadow 0.2s;
                box-shadow: 0 4px 15px rgba(37, 99, 235, 0.4); margin-top: 10px;
            }
            .btn-entrar:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(37, 99, 235, 0.6); }
            .btn-fechar { position: absolute; top: 15px; right: 20px; background: none; border: none; color: #94a3b8; font-size: 20px; cursor: pointer; }
            #loader {
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background: #0f172a; z-index: 999; display: flex; flex-direction: column; justify-content: center; align-items: center; transition: opacity 0.8s ease;
                color: white; font-family: 'Segoe UI', sans-serif;
            }
            .spinner { width: 50px; height: 50px; border: 4px solid rgba(255,255,255,0.1); border-top-color: #fbbf24; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 20px; }
            @keyframes spin { to { transform: rotate(360deg); } }
            #btn-return-hub {
                position: absolute; top: 20px; left: 20px; padding: 12px 20px;
                background: rgba(15, 23, 42, 0.9); color: #ffd700; border: 2px solid #ffd700;
                border-radius: 12px; font-weight: bold; cursor: pointer; z-index: 100;
                box-shadow: 0 4px 15px rgba(0,0,0,0.5); pointer-events: auto;
            }
        `;
        document.head.appendChild(style);

        this.uiLayer = document.createElement('div');
        this.uiLayer.id = 'ui-layer';
        this.uiLayer.innerHTML = `
            <button id="btn-return-hub">🔙 Retornar ao Hub</button>
            <div id="time-popup" class="glass-panel">
                <label>Ajustar Horário</label>
                <input type="range" id="time-slider" min="0" max="24" step="0.1" value="12">
            </div>
            <div class="glass-panel hud-bottom">
                <button id="btn-backpack" class="icon-btn" title="Mochila">🎒</button>
                <div id="clock-container" class="time-btn" title="Alterar Horário">
                    <span id="time-display">12:00</span>
                </div>
                <button id="btn-weather" class="icon-btn" title="Alterar Clima">☀️</button>
            </div>
        `;
        document.body.appendChild(this.uiLayer);

        this.rpgModal = document.createElement('div');
        this.rpgModal.id = 'rpg-modal';
        this.rpgModal.innerHTML = `
            <div class="glass-panel modal-content">
                <button class="btn-fechar" id="rpg-modal-close">×</button>
                <div class="modal-header">
                    <div class="biome-title" id="m-title">Floresta Anciã</div>
                    <div class="difficulty" id="m-diff">★★★☆☆</div>
                </div>
                <div class="stat-row"><div class="stat-icon">⚔️</div> Inimigos: <span class="stat-value" id="m-enemies">Lobos, Bandidos</span></div>
                <div class="stat-row"><div class="stat-icon">🦌</div> Caça: <span class="stat-value" id="m-animals">Cervos, Javalis</span></div>
                <div class="stat-row"><div class="stat-icon">🐟</div> Pesca: <span class="stat-value" id="m-fishes">Truta, Salmão</span></div>
                <div class="stat-row"><div class="stat-icon">⛏️</div> Recursos: <span class="stat-value" id="m-minerals">Madeira, Ferro</span></div>
                <button class="btn-entrar" id="btn-entrar">Iniciar Aventura</button>
            </div>
        `;
        document.body.appendChild(this.rpgModal);

        this.loader = document.createElement('div');
        this.loader.id = 'loader';
        this.loader.innerHTML = `<div class="spinner"></div><h2>Forjando o Mundo...</h2>`;
        document.body.appendChild(this.loader);

        setTimeout(() => {
            if (this.loader) {
                this.loader.style.opacity = '0';
                setTimeout(() => { if (this.loader && this.loader.parentNode) this.loader.parentNode.removeChild(this.loader); }, 800);
            }
        }, 1000);
    }

    lerpColor(c1, c2, t, target) {
        target.r = c1.r + (c2.r - c1.r) * t; target.g = c1.g + (c2.g - c1.g) * t; target.b = c1.b + (c2.b - c1.b) * t;
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
                const timePopup = document.getElementById('time-popup');
                if (timePopup) timePopup.classList.remove('active');

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

        // Bind UI events
        const clockContainer = document.getElementById('clock-container');
        if (clockContainer) {
            this._onClockClick = () => { document.getElementById('time-popup').classList.toggle('active'); };
            clockContainer.addEventListener('click', this._onClockClick);
        }

        const timeSlider = document.getElementById('time-slider');
        if (timeSlider) {
            this._onTimeChange = (e) => {
                this.currentHour = parseFloat(e.target.value);
                const hrs = Math.floor(this.currentHour); const mins = Math.floor((this.currentHour - hrs) * 60);
                document.getElementById('time-display').innerText = `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
            };
            timeSlider.addEventListener('input', this._onTimeChange);
        }

        const btnWeather = document.getElementById('btn-weather');
        if (btnWeather) {
            this._onWeatherClick = () => {
                this.weatherIdx = (this.weatherIdx + 1) % this.weathers.length;
                this.currentWeather = this.weathers[this.weatherIdx];
                btnWeather.innerText = this.currentWeather.icon;

                if(this.currentWeather.id === 'rain' || this.currentWeather.id === 'storm' || this.currentWeather.id === 'snow') {
                    this.weatherMat.opacity = 0.6;
                    if(this.currentWeather.id === 'snow') { this.weatherMat.color.setHex(0xffffff); this.weatherMat.size = 0.6; }
                    else { this.weatherMat.color.setHex(0x94a3b8); this.weatherMat.size = 1.0; }
                } else {
                    this.weatherMat.opacity = 0;
                }
            };
            btnWeather.addEventListener('click', this._onWeatherClick);
        }

        const btnBackpack = document.getElementById('btn-backpack');
        if (btnBackpack) {
            this._onBackpackClick = () => { alert('Mochila vazia! O inventário será implementado em breve.'); };
            btnBackpack.addEventListener('click', this._onBackpackClick);
        }

        const returnBtn = document.getElementById('btn-return-hub');
        if (returnBtn) {
            this._onReturnClick = () => { window.changeGameState('HUB'); };
            returnBtn.addEventListener('click', this._onReturnClick);
        }

        const btnEntrar = document.getElementById('btn-entrar');
        if (btnEntrar) {
            this._onBtnEntrar = () => {
                this.closeModal();
                if (this.activeIslandData) {
                    const selectedBiome = this.activeIslandData.biomeId || 'floresta';
                    window.changeGameState('ROGUELIKE', { biome: selectedBiome, islandData: this.activeIslandData });
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
        import('../core/GameState.js').then(({ default: gameState }) => {
            // First spawn base hub and default adjacent
            this.spawnIsland(0, 0, null, null, true);
            this.spawnIsland(1, 0, 0, 0);
            this.spawnIsland(0, 1, 0, 0);
            this.spawnIsland(-1, 0, 0, 0);
            this.spawnIsland(0, -1, 0, 0);

            // Spawn any previously completed nodes and their adjacencies WITHOUT animation
            if (gameState.completedNodes && gameState.completedNodes.length > 0) {
                // (Optional feature to re-generate the entire map structure based on completed nodes,
                // but for now we just process the completed ones)
                gameState.completedNodes.forEach(nodeId => {
                    const [nx, nz] = nodeId.split(',').map(Number);
                    this.spawnIsland(nx, nz, 0, 0); // Need to link back, simple logic for now

                    // Mark completed node as unclickable
                    const mesh = this.interactableObjects.find(obj => obj.userData.gridX === nx && obj.userData.gridZ === nz);
                    if (mesh) mesh.userData.isClickable = false;

                    // Reveal adjacent
                    const dirs = [ {dx: 1, dz: 0}, {dx: -1, dz: 0}, {dx: 0, dz: 1}, {dx: 0, dz: -1} ];
                    dirs.forEach(dir => {
                        this.spawnIsland(nx + dir.dx, nz + dir.dz, nx, nz);
                    });
                });
            }

            // Check if there are pending unlocks to animate
            if (gameState.pendingUnlocks) {
                const node = gameState.pendingUnlocks;
                // Wait a moment for scene to settle, then play animation
                setTimeout(() => {
                    this.playCreationEffect(new THREE.Vector3(node.gridX * this.islandSpacing, 0, node.gridZ * this.islandSpacing));

                    setTimeout(() => {
                        const dirs = [ {dx: 1, dz: 0}, {dx: -1, dz: 0}, {dx: 0, dz: 1}, {dx: 0, dz: -1} ];
                        dirs.forEach((dir, index) => {
                            setTimeout(() => this.spawnIsland(node.gridX + dir.dx, node.gridZ + dir.dz, node.gridX, node.gridZ), index * 300);
                        });
                    }, 400);

                    gameState.pendingUnlocks = null;
                    gameState.save();
                }, 1000);
            }
        });
    }

    cleanup() {
        this.scene.remove(this.worldGroup);
        this.closeModal();

        window.removeEventListener('pointerdown', this._onPointerDown);
        window.removeEventListener('pointerup', this._onPointerUp);

        if (this.uiLayer && this.uiLayer.parentNode) this.uiLayer.parentNode.removeChild(this.uiLayer);
        if (this.rpgModal && this.rpgModal.parentNode) this.rpgModal.parentNode.removeChild(this.rpgModal);

        const style = document.getElementById('world-map-styles');
        if (style && style.parentNode) style.parentNode.removeChild(style);

        if (this.scene.fog) {
            this.scene.fog.color.setHex(0x000000); // reset fog or let main handle it
        }
    }

    update(delta, time, camera, playerPos) {
        // Lighting and time
        const timeOfDay = this.currentHour / 24.0;
        const sunAngle = (timeOfDay - 0.25) * Math.PI * 2;
        this.sunLight.position.x = Math.cos(sunAngle) * 200;
        this.sunLight.position.y = Math.sin(sunAngle) * 200;
        this.sunLight.position.z = Math.cos(sunAngle) * 100;

        let cColors, nColors, lFactor;
        const h = this.sunLight.position.y;

        if (this.currentWeather.id === 'storm') {
            cColors = this.timeColors.storm; nColors = this.timeColors.storm; lFactor = 1;
            if (Math.random() > 0.98) {
                this.lightningLight.position.set((Math.random()-0.5)*200, 100, (Math.random()-0.5)*200);
                this.lightningLight.intensity = 5;
            } else { this.lightningLight.intensity = Math.max(0, this.lightningLight.intensity - 0.5); }
        } else {
            this.lightningLight.intensity = 0;
            if (h > 50) { cColors = this.timeColors.day; nColors = this.timeColors.day; lFactor = 1; }
            else if (h > 0) { cColors = this.sunLight.position.x > 0 ? this.timeColors.sunrise : this.timeColors.sunset; nColors = this.timeColors.day; lFactor = h / 50; }
            else if (h > -50) { cColors = this.timeColors.night; nColors = this.sunLight.position.x > 0 ? this.timeColors.sunrise : this.timeColors.sunset; lFactor = (h + 50) / 50; }
            else { cColors = this.timeColors.night; nColors = this.timeColors.night; lFactor = 1; }
        }

        if (this.scene.background) this.lerpColor(cColors.sky, nColors.sky, lFactor, this.scene.background);
        if (this.scene.fog) this.lerpColor(cColors.sky, nColors.sky, lFactor, this.scene.fog.color);
        this.lerpColor(cColors.ambient, nColors.ambient, lFactor, this.ambientLight.color);
        this.lerpColor(cColors.sun, nColors.sun, lFactor, this.sunLight.color);
        this.sunLight.intensity = cColors.intensity + (nColors.intensity - cColors.intensity) * lFactor;

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

        const isWindy = this.currentWeather.id === 'wind' || this.currentWeather.id === 'storm';
        const windMult = isWindy ? 4.0 : 1.0;
        this.windObjects.forEach(w => { w.obj.rotation.z = Math.sin(time * w.speed * windMult + w.phase) * (isWindy ? 0.15 : 0.06); });

        // Clouds and weather
        this.cloudSeaMat.color.lerp(this.currentWeather.cloudTarget, 0.02);
        this.globalCloudScale += (this.currentWeather.cloudScale - this.globalCloudScale) * 0.015;

        const updateClouds = (dataArr, instMesh) => {
            for(let i=0; i<this.cloudCount; i++) {
                dataArr[i].pos.x += dataArr[i].speed * windMult;
                if(dataArr[i].pos.x > 400) dataArr[i].pos.x = -400; // Reset no horizonte

                let currentScale = dataArr[i].scale * this.globalCloudScale;

                if (i > 80) {
                    const extraVisibility = Math.max(0, Math.min(1, (this.globalCloudScale - 1.1) / 0.8));
                    currentScale *= extraVisibility;
                }

                this.dummyCloud.position.copy(dataArr[i].pos);

                const wideness = 1 + (this.globalCloudScale - 1) * 0.6;
                this.dummyCloud.scale.set(currentScale * wideness, currentScale, currentScale * wideness);

                this.dummyCloud.updateMatrix();
                instMesh.setMatrixAt(i, this.dummyCloud.matrix);
            }
            instMesh.instanceMatrix.needsUpdate = true;
        };

        updateClouds(this.topCloudData, this.topCloudIM);
        updateClouds(this.bottomCloudData, this.bottomCloudIM);

        if (this.seaOfClouds && this.seaOfClouds.geometry) {
            const pos = this.seaOfClouds.geometry.attributes.position.array;
            for(let i=0; i<pos.length; i+=3) {
                pos[i+1] = Math.sin(pos[i] * 0.02 + time * 0.5 * windMult) * 4 + Math.cos(pos[i+2] * 0.02 + time * 0.4 * windMult) * 4;
            }
            this.seaOfClouds.geometry.attributes.position.needsUpdate = true;
        }

        if (this.weatherMat.opacity > 0) {
            const wPos = this.weatherSystem.geometry.attributes.position.array;
            const speedMult = this.currentWeather.id === 'snow' ? 0.2 : (this.currentWeather.id === 'storm' ? 3.0 : 2.0);
            for(let i=0; i<this.weatherCount; i++) {
                wPos[i*3+1] -= this.weatherVel[i] * speedMult;
                if(this.currentWeather.id === 'snow') wPos[i*3] += Math.sin(time * 2 + i) * 0.1;
                else if (isWindy) wPos[i*3] += 1.5;

                if(wPos[i*3+1] < -50) {
                    wPos[i*3+1] = 150; wPos[i*3] = (Math.random() - 0.5) * 400;
                }
            }
            this.weatherSystem.geometry.attributes.position.needsUpdate = true;
        }

        if (this.ringAnim.active) {
            this.ringAnim.scale += delta * 15; this.ringAnim.opacity -= delta * 1.5;
            this.magicRing.scale.setScalar(this.ringAnim.scale); this.magicRing.material.opacity = this.ringAnim.opacity;
            if (this.ringAnim.opacity <= 0) this.ringAnim.active = false;
        }
    }
}
