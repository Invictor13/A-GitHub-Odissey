import * as THREE from 'three';

export class Eros {
    constructor(scene, position = new THREE.Vector3()) {
        this.scene = scene;
        this.spawnPosition = position.clone(); // The origin for WANDER radius

        // Root group for the character
        this.group = new THREE.Group();
        this.group.position.copy(this.spawnPosition);

        // Raycaster tags
        this.group.userData.interactable = true;
        this.group.userData.name = 'Eros';

        this.scene.add(this.group);

        // FSM State
        this.currentState = 'IDLE';
        this.stateTimer = 0;
        this.animTime = 0;
        this.targetPosition = new THREE.Vector3();

        // Interact jump variables
        this.jumpTime = 0;
        this.isJumping = false;
        this.baseY = position.y;

        this.playerContext = null;

        this.buildModel();
    }

    buildModel() {
        this.bodyGroup = new THREE.Group();
        this.group.add(this.bodyGroup);

        const mat = new THREE.MeshStandardMaterial({ color: 0x78350f });
        const hatMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.3 });

        // Body
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.5, 0.8), mat);
        body.position.set(0, 0.4, 0);
        body.castShadow = true;
        this.bodyGroup.add(body);

        // Head
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), mat);
        head.position.set(0, 0.7, 0.5);
        this.bodyGroup.add(head);

        // Snout
        const snout = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.2), new THREE.MeshStandardMaterial({ color: 0x111111 }));
        snout.position.set(0, 0.6, 0.75);
        this.bodyGroup.add(snout);

        // Hat
        const hat = new THREE.Mesh(new THREE.SphereGeometry(0.25, 16, 16, 0, Math.PI*2, 0, Math.PI/2), hatMat);
        hat.position.set(0, 0.95, 0.5);
        this.bodyGroup.add(hat);

        // Brim
        const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.04, 16), hatMat);
        brim.position.set(0, 0.95, 0.5);
        this.bodyGroup.add(brim);

        // Legs
        for(let i=0; i<4; i++) {
            const leg = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.3, 0.15), mat);
            leg.position.set(i%2===0 ? 0.2 : -0.2, 0.15, i<2 ? 0.3 : -0.3);
            this.bodyGroup.add(leg);
        }
    }

    interact(player) {
        if (this.currentState === 'INTERACT') return;

        this.currentState = 'INTERACT';
        this.stateTimer = 2.5; // Stay in INTERACT for 2.5 seconds
        this.playerContext = player;

        // Trigger procedural jump
        this.isJumping = true;
        this.jumpTime = 0;
    }

    update(delta) {
        this.animTime += delta;

        // Reset breathing/movement alterations
        this.bodyGroup.position.y = 0;
        this.bodyGroup.scale.y = 1;

        // Handle Jump
        if (this.isJumping) {
            this.jumpTime += delta * 5; // Jump speed
            if (this.jumpTime > Math.PI) {
                this.isJumping = false;
                this.jumpTime = 0;
            } else {
                this.bodyGroup.position.y = Math.sin(this.jumpTime) * 0.3; // Jump height
            }
        }

        switch (this.currentState) {
            case 'IDLE':
                this.updateIdle(delta);
                break;
            case 'WANDER':
                this.updateWander(delta);
                break;
            case 'INTERACT':
                this.updateInteract(delta);
                break;
        }
    }

    updateIdle(delta) {
        // Procedural breathing: subtle Y scale and position change
        const breath = Math.sin(this.animTime * 3) * 0.02;
        this.bodyGroup.scale.y = 1 + breath;
        this.bodyGroup.position.y += breath * 0.2;

        this.stateTimer -= delta;
        if (this.stateTimer <= 0) {
            // Switch to WANDER
            this.currentState = 'WANDER';
            this.stateTimer = 5 + Math.random() * 5; // Wander state duration before forcing idle, or until destination reached

            // Pick a random point within 5 units of spawn
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * 5.0;
            this.targetPosition.set(
                this.spawnPosition.x + Math.cos(angle) * radius,
                this.spawnPosition.y,
                this.spawnPosition.z + Math.sin(angle) * radius
            );
        }
    }

    updateWander(delta) {
        // Procedural walking bounce
        const bounce = Math.abs(Math.sin(this.animTime * 10)) * 0.05;
        if (!this.isJumping) {
            this.bodyGroup.position.y += bounce;
        }

        const moveDir = new THREE.Vector3().subVectors(this.targetPosition, this.group.position);
        moveDir.y = 0;
        const dist = moveDir.length();

        if (dist < 0.1 || this.stateTimer <= 0) {
            // Reached destination or timed out
            this.currentState = 'IDLE';
            this.stateTimer = 2 + Math.random() * 3; // Stay idle for 2-5 seconds
        } else {
            // Move slowly
            moveDir.normalize();
            const speed = 1.0;
            this.group.position.addScaledVector(moveDir, speed * delta);

            // Fix Y to base
            this.group.position.y = this.baseY;

            // Rotate towards movement
            const targetAngle = Math.atan2(moveDir.x, moveDir.z);
            let diff = targetAngle - this.group.rotation.y;
            while (diff < -Math.PI) diff += Math.PI * 2;
            while (diff > Math.PI) diff -= Math.PI * 2;
            this.group.rotation.y += diff * 5 * delta;
        }

        this.stateTimer -= delta;
    }

    updateInteract(delta) {
        // Look at player if player context is provided
        if (this.playerContext && this.playerContext.position) {
            const lookDir = new THREE.Vector3().subVectors(this.playerContext.position, this.group.position);
            lookDir.y = 0;
            if (lookDir.lengthSq() > 0.001) {
                const targetAngle = Math.atan2(lookDir.x, lookDir.z);
                let diff = targetAngle - this.group.rotation.y;
                while (diff < -Math.PI) diff += Math.PI * 2;
                while (diff > Math.PI) diff -= Math.PI * 2;
                this.group.rotation.y += diff * 8 * delta;
            }
        }

        this.stateTimer -= delta;
        if (this.stateTimer <= 0) {
            this.currentState = 'IDLE';
            this.stateTimer = 2.0; // Rest idle before wandering again
            this.playerContext = null;
        }
    }
}
