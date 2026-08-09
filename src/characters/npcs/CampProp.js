import * as THREE from 'three';

export class CampProp {
    static createTent(scene, position) {
        const group = new THREE.Group();
        group.position.copy(position);

        // Tent Base Geometry (Prism)
        const shape = new THREE.Shape();
        shape.moveTo(-1, 0);
        shape.lineTo(1, 0);
        shape.lineTo(0, 1.5);
        shape.lineTo(-1, 0);

        const extrudeSettings = {
            steps: 1,
            depth: 2,
            bevelEnabled: false
        };

        const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        geometry.center();

        // Random tent color
        const colors = [0x5c4033, 0x8b0000, 0x228b22, 0x8b4513];
        const randomColor = colors[Math.floor(Math.random() * colors.length)];

        const material = new THREE.MeshStandardMaterial({
            color: randomColor,
            roughness: 0.9,
            side: THREE.DoubleSide
        });

        const tentMesh = new THREE.Mesh(geometry, material);
        tentMesh.position.y = 0.75;

        // Tent poles
        const poleGeo = new THREE.CylinderGeometry(0.05, 0.05, 1.6);
        const poleMat = new THREE.MeshStandardMaterial({ color: 0x4a3c31 });

        const pole1 = new THREE.Mesh(poleGeo, poleMat);
        pole1.position.set(0, 0.75, 1.05);

        const pole2 = new THREE.Mesh(poleGeo, poleMat);
        pole2.position.set(0, 0.75, -1.05);

        group.add(tentMesh);
        group.add(pole1);
        group.add(pole2);

        // Add minimal rotation to look natural
        group.rotation.y = Math.random() * Math.PI * 2;

        scene.add(group);
        return group;
    }

    static createCampfire(scene, position) {
        const group = new THREE.Group();
        group.position.copy(position);

        // Stones ring
        const stoneGeo = new THREE.DodecahedronGeometry(0.15, 0);
        const stoneMat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.8 });

        const numStones = 8;
        for (let i = 0; i < numStones; i++) {
            const angle = (i / numStones) * Math.PI * 2;
            const radius = 0.5;
            const stone = new THREE.Mesh(stoneGeo, stoneMat);
            stone.position.set(Math.cos(angle) * radius, 0.05, Math.sin(angle) * radius);

            // Randomize stone slightly
            stone.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
            stone.scale.setScalar(0.8 + Math.random() * 0.4);
            group.add(stone);
        }

        // Logs
        const logGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.8);
        const logMat = new THREE.MeshStandardMaterial({ color: 0x3e2723, roughness: 0.9 });

        for (let i = 0; i < 3; i++) {
            const log = new THREE.Mesh(logGeo, logMat);
            log.position.y = 0.15;
            log.rotation.x = Math.PI / 2;
            log.rotation.z = (i * Math.PI / 3) + (Math.random() * 0.2);
            // Tilt slightly
            log.rotation.y = 0.2;
            group.add(log);
        }

        // Emissive fire glow (simple visual representation)
        const fireGeo = new THREE.ConeGeometry(0.3, 0.6, 5);
        const fireMat = new THREE.MeshStandardMaterial({
            color: 0xff4500,
            emissive: 0xff4500,
            emissiveIntensity: 0.8,
            transparent: true,
            opacity: 0.8
        });
        const fire = new THREE.Mesh(fireGeo, fireMat);
        fire.position.y = 0.3;
        group.add(fire);

        // Add PointLight for illumination
        const light = new THREE.PointLight(0xffa500, 1.5, 10);
        light.position.y = 0.5;
        group.add(light);

        // Save fire reference for basic animation if updated
        group.userData = { isCampfire: true, fireMesh: fire, light: light, time: 0 };

        scene.add(group);
        return group;
    }

    static updateCampfire(campGroup, delta) {
        if (campGroup.userData && campGroup.userData.isCampfire) {
            campGroup.userData.time += delta * 5;
            const fire = campGroup.userData.fireMesh;
            const light = campGroup.userData.light;

            // Flickering effect
            if (fire) {
                fire.scale.y = 1.0 + Math.sin(campGroup.userData.time) * 0.1;
                fire.rotation.y += delta * 2;
            }
            if (light) {
                light.intensity = 1.2 + Math.random() * 0.4;
            }
        }
    }

    static createCauldron(scene, position) {
        const group = new THREE.Group();
        group.position.copy(position);

        // Cauldron Body
        const cauldronGeo = new THREE.SphereGeometry(0.6, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.6);
        const cauldronMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.7, metalness: 0.5 });
        const cauldron = new THREE.Mesh(cauldronGeo, cauldronMat);
        cauldron.position.y = 0.6;
        cauldron.rotation.x = Math.PI; // Flip it
        group.add(cauldron);

        // Cauldron Lip
        const lipGeo = new THREE.TorusGeometry(0.55, 0.08, 8, 24);
        const lip = new THREE.Mesh(lipGeo, cauldronMat);
        lip.position.y = 0.6;
        lip.rotation.x = Math.PI / 2;
        group.add(lip);

        // Green Liquid inside
        const liquidGeo = new THREE.CircleGeometry(0.5, 16);
        const liquidMat = new THREE.MeshStandardMaterial({
            color: 0x00ff00,
            emissive: 0x00aa00,
            transparent: true,
            opacity: 0.9,
            side: THREE.DoubleSide
        });
        const liquid = new THREE.Mesh(liquidGeo, liquidMat);
        liquid.position.y = 0.5;
        liquid.rotation.x = -Math.PI / 2;
        group.add(liquid);

        // Add simple light for the liquid
        const light = new THREE.PointLight(0x00ff00, 1.0, 5);
        light.position.y = 1.0;
        group.add(light);

        // Legs
        const legGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.4);
        for(let i=0; i<3; i++) {
            const angle = (i / 3) * Math.PI * 2;
            const leg = new THREE.Mesh(legGeo, cauldronMat);
            leg.position.set(Math.cos(angle) * 0.4, 0.2, Math.sin(angle) * 0.4);
            leg.lookAt(0, 0.6, 0); // Point slightly towards center
            group.add(leg);
        }

        group.rotation.y = Math.random() * Math.PI * 2;

        scene.add(group);
        return group;
    }
}
