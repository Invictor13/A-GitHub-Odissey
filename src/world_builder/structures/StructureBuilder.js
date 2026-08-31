import * as THREE from 'three';

export class StructureBuilder {
    static create3DObject(type, isPreview = false) {
        const group = new THREE.Group();
        const opacity = isPreview ? 0.65 : 1.0;
        const transparent = isPreview;

        // Normalização de tipo
        if (type === 'tent') type = 'barraca';
        if (type === 'campfire') type = 'fogueira';
        if (type === 'cadeira') type = 'chair';
        if (type === 'banco') type = 'bench';
        if (type === 'cerca') type = 'fence';
        if (type === 'tocha' || type === 'lanterna') type = 'lantern';
        if (type === 'forja' || type === 'forge') type = 'furnace';
        if (type === 'bigorna') type = 'anvil';

        // 1. INTERIORES
        if (type === 'barraca') {
            const woodMat = new THREE.MeshStandardMaterial({ color: isPreview ? 0xfacc15 : 0x4a2e16, roughness: 0.8, transparent, opacity });
            const canvasMat = new THREE.MeshStandardMaterial({ color: isPreview ? 0xfacc15 : 0xddc088, roughness: 0.7, transparent, opacity, side: THREE.DoubleSide });
            const trimMat = new THREE.MeshStandardMaterial({ color: isPreview ? 0xfacc15 : 0x854d0e, roughness: 0.6, transparent, opacity });
            const rugMat = new THREE.MeshStandardMaterial({ color: isPreview ? 0xfacc15 : 0x0f766e, roughness: 0.7, transparent, opacity });

            const platform = new THREE.Mesh(new THREE.CylinderGeometry(3.6, 3.8, 0.25, 8), woodMat);
            platform.position.y = 0.125;
            group.add(platform);

            const step = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.12, 0.8), woodMat);
            step.position.set(0, 0.06, 3.6);
            group.add(step);

            const rug = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.03, 1.2), rugMat);
            rug.position.set(0, 0.26, 2.5);
            group.add(rug);

            const p1 = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.1, 3.8), woodMat); p1.position.set(-1.8, 1.8, 2.2); p1.rotation.z = -0.32; group.add(p1);
            const p2 = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.1, 3.8), woodMat); p2.position.set(1.8, 1.8, 2.2); p2.rotation.z = 0.32; group.add(p2);
            const p3 = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.1, 3.8), woodMat); p3.position.set(-1.8, 1.8, -2.2); p3.rotation.z = -0.32; group.add(p3);
            const p4 = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.1, 3.8), woodMat); p4.position.set(1.8, 1.8, -2.2); p4.rotation.z = 0.32; group.add(p4);

            const ridge = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 5.2), woodMat);
            ridge.position.set(0, 3.3, 0); ridge.rotation.x = Math.PI / 2; group.add(ridge);

            const roofGeo = new THREE.ConeGeometry(3.5, 3.2, 4, 1, true, 0, Math.PI * 1.6);
            roofGeo.rotateY(Math.PI * 0.7);
            const roof = new THREE.Mesh(roofGeo, canvasMat);
            roof.position.set(0, 1.9, 0);
            group.add(roof);

            const topCap = new THREE.Mesh(new THREE.ConeGeometry(2.0, 1.2, 4), trimMat);
            topCap.position.set(0, 3.1, 0); topCap.rotation.y = Math.PI / 4;
            group.add(topCap);

            const curtainGeo = new THREE.PlaneGeometry(1.2, 2.8, 4, 4);
            const curtainL = new THREE.Mesh(curtainGeo, trimMat);
            curtainL.position.set(-1.2, 1.5, 2.1); curtainL.rotation.set(0.15, Math.PI / 4, -0.2); group.add(curtainL);
            const curtainR = new THREE.Mesh(curtainGeo, trimMat);
            curtainR.position.set(1.2, 1.5, 2.1); curtainR.rotation.set(0.15, -Math.PI / 4, 0.2); group.add(curtainR);

            const lanternFrame = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.4, 0.25), new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.3 }));
            lanternFrame.position.set(0, 2.6, 2.3); group.add(lanternFrame);
            if (!isPreview) {
                const lanternLight = new THREE.PointLight(0xff9900, 2.5, 8);
                lanternLight.position.set(0, 2.5, 2.3); group.add(lanternLight);
            }
        }
        else if (type === 'espelho') {
            const frameMat = new THREE.MeshStandardMaterial({ color: isPreview ? 0xfacc15 : 0xd4af37, roughness: 0.4, metalness: 0.8, transparent, opacity });
            const mirrorMat = new THREE.MeshStandardMaterial({ color: isPreview ? 0xfacc15 : 0xa5f3fc, roughness: 0.1, metalness: 0.9, transparent, opacity: isPreview ? opacity : 0.9 });
            const woodMat = new THREE.MeshStandardMaterial({ color: isPreview ? 0xfacc15 : 0x3e2723, roughness: 0.9, transparent, opacity });

            // Base
            const base = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.1, 0.4), woodMat);
            base.position.y = 0.05;
            group.add(base);

            // Frame
            const frame = new THREE.Mesh(new THREE.BoxGeometry(1.0, 2.2, 0.1), frameMat);
            frame.position.set(0, 1.15, 0);
            group.add(frame);

            // Mirror surface
            const surface = new THREE.Mesh(new THREE.BoxGeometry(0.9, 2.1, 0.12), mirrorMat);
            surface.position.set(0, 1.15, 0);
            group.add(surface);

            // Legs
            const leg1 = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.2), woodMat);
            leg1.position.set(-0.55, 0.6, -0.15); leg1.rotation.x = -0.2;
            group.add(leg1);

            const leg2 = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.2), woodMat);
            leg2.position.set(0.55, 0.6, -0.15); leg2.rotation.x = -0.2;
            group.add(leg2);
        }

        // 2. EXTERIORES
        else if (type === 'fogueira') {
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
        } else if (type === 'chair') {
            const mat = new THREE.MeshStandardMaterial({ color: isPreview ? 0xfacc15 : 0x78350f, transparent, opacity, roughness: 0.8 });
            const seat = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.12, 0.7), mat); seat.position.y = 0.45; group.add(seat);
            const back = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.6, 0.1), mat); back.position.set(0, 0.75, -0.3); group.add(back);
            const leg1 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.4, 0.1), mat); leg1.position.set(-0.28, 0.2, -0.28); group.add(leg1);
            const leg2 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.4, 0.1), mat); leg2.position.set(0.28, 0.2, -0.28); group.add(leg2);
            const leg3 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.4, 0.1), mat); leg3.position.set(-0.28, 0.2, 0.28); group.add(leg3);
            const leg4 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.4, 0.1), mat); leg4.position.set(0.28, 0.2, 0.28); group.add(leg4);
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
        } else if (type === 'chest') {
            const chestMat = new THREE.MeshStandardMaterial({ color: isPreview ? 0xfacc15 : 0x713f12, roughness: 0.7, transparent, opacity });
            const body = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.5, 0.6), chestMat); body.position.y = 0.25; group.add(body);
            const metalMat = new THREE.MeshStandardMaterial({ color: isPreview ? 0xfacc15 : 0xfacc15, metalness: 0.8, transparent, opacity });
            const lock = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.15, 0.08), metalMat); lock.position.set(0, 0.25, 0.31); group.add(lock);
        } else if (type === 'furnace') {
            const stoneMat = new THREE.MeshStandardMaterial({ color: isPreview ? 0xfacc15 : 0x4b5563, roughness: 0.8, transparent, opacity });
            const base = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.8, 1.2), stoneMat); base.position.y = 0.4; group.add(base);
            const top = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.6, 0.8, 4), stoneMat); top.position.y = 1.2; top.rotation.y = Math.PI / 4; group.add(top);
            if (!isPreview) {
                const fireLight = new THREE.PointLight(0xffaa00, 1.5, 5);
                fireLight.position.set(0, 0.5, 0.65);
                group.add(fireLight);
            }
        } else if (type === 'workbench') {
            const woodMat = new THREE.MeshStandardMaterial({ color: isPreview ? 0xfacc15 : 0x78350f, roughness: 0.9, transparent, opacity });
            const top = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.15, 0.8), woodMat); top.position.y = 0.8; group.add(top);
            const leg1 = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.8, 0.15), woodMat); leg1.position.set(-0.7, 0.4, -0.3); group.add(leg1);
            const leg2 = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.8, 0.15), woodMat); leg2.position.set(0.7, 0.4, -0.3); group.add(leg2);
            const leg3 = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.8, 0.15), woodMat); leg3.position.set(-0.7, 0.4, 0.3); group.add(leg3);
            const leg4 = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.8, 0.15), woodMat); leg4.position.set(0.7, 0.4, 0.3); group.add(leg4);
        } else if (type === 'anvil') {
            const metalMat = new THREE.MeshStandardMaterial({ color: isPreview ? 0xfacc15 : 0x333333, metalness: 0.8, roughness: 0.4, transparent, opacity });
            const woodMat = new THREE.MeshStandardMaterial({ color: isPreview ? 0xfacc15 : 0x4a2e16, roughness: 0.9, transparent, opacity });
            const stump = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.4, 8), woodMat); stump.position.y = 0.2; group.add(stump);
            const anvilBase = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.2, 0.3), metalMat); anvilBase.position.y = 0.5; group.add(anvilBase);
            const anvilTop = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.2, 0.3), metalMat); anvilTop.position.y = 0.7; group.add(anvilTop);
            const horn = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.4, 8), metalMat); horn.position.set(0.55, 0.7, 0); horn.rotation.z = -Math.PI / 2; group.add(horn);
        }

        // 3. NATUREZA
        else if (type === 'tree') {
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
        }

        // 4. SOLOS (Pisos / Tiles de Terreno)
        else if (type === 'mud_tile') {
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
            const islandMat = new THREE.MeshStandardMaterial({ color: isPreview ? 0xfacc15 : 0x334155, roughness: 0.9, flatShading: true, transparent, opacity, wireframe: isPreview });
            const grassMat = new THREE.MeshStandardMaterial({ color: isPreview ? 0xfacc15 : 0x15803d, roughness: 0.8, flatShading: true, transparent, opacity, wireframe: isPreview });
            const dirtMat = new THREE.MeshStandardMaterial({ color: isPreview ? 0xfacc15 : 0x291d16, roughness: 0.85, flatShading: true, transparent, opacity, wireframe: isPreview });

            const topGeo = new THREE.CylinderGeometry(14.0, 13.5, 1.0, 24);
            const topMesh = new THREE.Mesh(topGeo, grassMat);
            topMesh.position.y = 0.5;
            group.add(topMesh);

            const dirtGeo = new THREE.CylinderGeometry(13.5, 12.0, 2.0, 24);
            const dirtMesh = new THREE.Mesh(dirtGeo, dirtMat);
            dirtMesh.position.y = -1.0;
            group.add(dirtMesh);

            const botGeo = new THREE.ConeGeometry(12.0, 16.0, 20);
            const botMesh = new THREE.Mesh(botGeo, islandMat);
            botMesh.position.y = -10.0;
            botMesh.rotation.x = Math.PI;
            group.add(botMesh);
        } else if (type === 'ponte_magica') {
            const woodMat = new THREE.MeshStandardMaterial({ color: isPreview ? 0xfacc15 : 0x4a2e16, roughness: 0.8, transparent, opacity });
            const magicMat = new THREE.MeshStandardMaterial({ color: 0x00ffff, emissive: 0x00ffff, emissiveIntensity: 0.8, transparent: true, opacity: isPreview ? 0.4 : 0.8 });

            for (let i = -1; i <= 1; i++) {
                const plank = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.15, 0.4), woodMat);
                plank.position.set(0, 0, i * 0.5);
                group.add(plank);
            }

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
}
