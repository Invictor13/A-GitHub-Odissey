import * as THREE from 'three';

// Procedural textures
function createBumpTexture(type, size = 256) {
    const canvas = document.createElement('canvas'); canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d'); const imgData = ctx.createImageData(size, size);
    for (let i = 0; i < imgData.data.length; i += 4) {
        let val = 128;
        if (type === 'leather') val += (Math.random() * 80) - 40;
        else if (type === 'hair') val += (Math.sin(Math.floor((i / 4) / size) * 0.5) * 40) + (Math.random() * 30) - 15;
        else if (type === 'cloth') val += (Math.sin((i / 4) % size) * 20) + (Math.cos(Math.floor((i / 4) / size)) * 20);
        else if (type === 'noise') val += (Math.random() * 120) - 60; // Para o chão e terra
        imgData.data[i] = imgData.data[i+1] = imgData.data[i+2] = val; imgData.data[i+3] = 255;
    }
    ctx.putImageData(imgData, 0, 0); const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.RepeatWrapping; return tex;
}

const texLeatherBump = createBumpTexture('leather');
const texHairBump = createBumpTexture('hair', 128);
const texClothBump = createBumpTexture('cloth', 128);
const texNoiseBump = createBumpTexture('noise', 256);

// Materials
const matBase = { roughness: 0.85, flatShading: true };
const matRock = new THREE.MeshStandardMaterial({ color: 0x64748b, bumpMap: texNoiseBump, bumpScale: 0.05, ...matBase });
const matDirt = new THREE.MeshStandardMaterial({ color: 0x291d16, bumpMap: texNoiseBump, bumpScale: 0.08, ...matBase });
const matWood = new THREE.MeshStandardMaterial({ color: 0x5c2b0c, bumpMap: texLeatherBump, bumpScale: 0.05, ...matBase });
const matGrass = new THREE.MeshStandardMaterial({ color: 0x15803d, bumpMap: texNoiseBump, bumpScale: 0.03, roughness: 0.8, flatShading: true });
const matDogBody = new THREE.MeshStandardMaterial({ color: 0x0f172a, bumpMap: texLeatherBump, bumpScale: 0.02, roughness: 0.6, flatShading: true });
const matDogSkin = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5, flatShading: true });

export class HubEnvironment {
    constructor(scene) {
        this.scene = scene;
        this.hubGroup = new THREE.Group();
        this.scene.add(this.hubGroup);

        this.groundMeshes = [];
        this.ISLAND_SIZE = 22.0;

        // Animated grass material
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

        this.grassGeo = new THREE.BufferGeometry();
        this.grassGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-0.15, 0, 0, 0.15, 0, 0, 0.0, 0.8, 0]), 3));
        this.grassGeo.computeVertexNormals();

        this.buildSkies();
        this.buildIsland(0, 0, true);
        this.buildCampfire();
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

    buildIsland(x, z, isCentral = false) {
        const group = new THREE.Group();
        const terrainGroup = new THREE.Group();

        const basePlat = new THREE.Mesh(new THREE.BoxGeometry(this.ISLAND_SIZE, 0.4, this.ISLAND_SIZE), matGrass);
        basePlat.position.y = 0.2; basePlat.receiveShadow = true; basePlat.castShadow = true;
        terrainGroup.add(basePlat); this.groundMeshes.push(basePlat);

        const baseDirt = new THREE.Mesh(new THREE.BoxGeometry(this.ISLAND_SIZE - 0.2, 8.0, this.ISLAND_SIZE - 0.2), matDirt);
        baseDirt.position.y = -4.0;
        baseDirt.receiveShadow = true; baseDirt.castShadow = true;
        terrainGroup.add(baseDirt);

        const baseRock = new THREE.Mesh(new THREE.CylinderGeometry(this.ISLAND_SIZE * 0.45, this.ISLAND_SIZE * 0.15, 20.0, 9), matRock);
        baseRock.position.y = -18.0;
        baseRock.castShadow = true; baseRock.receiveShadow = true;
        terrainGroup.add(baseRock);

        for (let i = 0; i < 5; i++) {
            const stalactite = new THREE.Mesh(new THREE.ConeGeometry(1 + Math.random()*2, 4 + Math.random()*6, 5), matDirt);
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

            const elevGrass = new THREE.Mesh(new THREE.BoxGeometry(w, 0.4, d), matGrass);
            elevGrass.position.set(px, 0.4 + h - 0.2, pz);
            elevGrass.receiveShadow = true; elevGrass.castShadow = true;
            terrainGroup.add(elevGrass); this.groundMeshes.push(elevGrass);

            const elevDirt = new THREE.Mesh(new THREE.BoxGeometry(w - 0.2, h - 0.4, d - 0.2), matDirt);
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
                const s = new THREE.Mesh(stoneGeo, matRock);
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
        this.hubGroup.add(group);
        return group;
    }

    buildCampfire() {
        const campfireGroup = new THREE.Group(); campfireGroup.position.set(0, 0.4, 0); this.hubGroup.add(campfireGroup);
        for(let i=0; i<6; i++) {
            const log = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 1.2, 6), matWood);
            log.rotation.z = Math.PI/2; log.rotation.y = (i / 6) * Math.PI * 2; log.position.y = 0.06;
            campfireGroup.add(log);
        }
        const fireLight = new THREE.PointLight(0xf97316, 5.0, 20); fireLight.position.set(0, 0.8, 0); campfireGroup.add(fireLight);
        const fireMesh = new THREE.Mesh(new THREE.ConeGeometry(0.4, 1.2, 6), new THREE.MeshBasicMaterial({ color: 0xf97316 }));
        fireMesh.position.y = 0.6; campfireGroup.add(fireMesh);
    }

    buildSkies() {
        const skyGroup = new THREE.Group(); this.scene.add(skyGroup);
        const starGeo = new THREE.BufferGeometry();
        const starPos = new Float32Array(1500 * 3);
        for(let i=0; i<1500*3; i+=3) {
            starPos[i] = (Math.random() - 0.5) * 400; starPos[i+1] = 60 + Math.random() * 120; starPos[i+2] = (Math.random() - 0.5) * 400;
        }
        starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
        const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.6, transparent: true, opacity: 0.9, fog: false });
        const starsMesh = new THREE.Points(starGeo, starMat);
        skyGroup.add(starsMesh);

        this.cloudsGroup = new THREE.Group(); this.scene.add(this.cloudsGroup);
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
    }

    getFloorY(position) {
        const raycaster = new THREE.Raycaster();
        const origin = position.clone(); origin.y += 10.0;
        raycaster.set(origin, new THREE.Vector3(0, -1, 0));
        const intersects = raycaster.intersectObjects(this.groundMeshes, false);
        if (intersects.length > 0) return intersects[0].point.y;
        return -50;
    }

    update(delta, time, playerPos) {
        this.cloudsGroup.rotation.y += delta * 0.01;
        this.grassUniforms.uTime.value = time;
        if(playerPos) {
            this.grassUniforms.uPlayerPos.value.copy(playerPos);
        }
    }
}