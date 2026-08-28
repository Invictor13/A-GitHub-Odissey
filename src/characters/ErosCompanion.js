import * as THREE from 'three';

export class ErosCompanion {
    constructor(scene, position = new THREE.Vector3()) {
        this.scene = scene;
        this.spawnPosition = position.clone();

        this.group = new THREE.Group();
        this.group.position.copy(this.spawnPosition);

        this.group.userData.interactable = true;
        this.group.userData.name = 'Eros';

        this.scene.add(this.group);

        this.currentState = 'IDLE'; // IDLE, PATROL, FOLLOW, INTERACTING, PETTING
        this.stateTimer = 0;
        this.animTime = 0;

        this.targetPosition = new THREE.Vector3();
        this.waypoints = this.generateWaypoints(this.spawnPosition, 4.0, 4);
        this.currentWaypointIndex = 0;

        this.isFollowing = false;
        this.followTarget = null;

        // Interaction jump variables
        this.isJumping = false;
        this.jumpTime = 0;
        this.baseY = position.y;

        this.buildModel();

        this.handleCommand = this.handleCommand.bind(this);
        window.addEventListener('ErosCommand', this.handleCommand);
    }

    generateWaypoints(center, radius, count) {
        const pts = [];
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            pts.push(new THREE.Vector3(
                center.x + Math.cos(angle) * radius,
                center.y,
                center.z + Math.sin(angle) * radius
            ));
        }
        return pts;
    }

    buildModel() {
        this.bodyGroup = new THREE.Group();
        this.group.add(this.bodyGroup);

        const mat = new THREE.MeshStandardMaterial({ color: 0x78350f }); // Brown
        const hatMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.3 }); // Yellow

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
        if (this.currentState === 'INTERACTING') return;

        this.currentState = 'INTERACTING';
        this.playerContext = player;

        // Trigger jump feedback
        this.isJumping = true;
        this.jumpTime = 0;

        // Open Radial Menu
        if (window.radialMenu) {
            window.radialMenu.open(this);
        }
    }

    handleCommand(e) {
        if (e.detail.context !== this) return;
        const action = e.detail.action;

        if (action === 'PET') {
            this.currentState = 'PETTING';
            this.stateTimer = 2.0; // Petting animation duration

            // Jump in joy
            this.isJumping = true;
            this.jumpTime = 0;
            if(window.triggerErosBark) window.triggerErosBark("Arf! Arf!");

        } else if (action === 'TOGGLE_FOLLOW') {
            this.isFollowing = !this.isFollowing;
            this.currentState = this.isFollowing ? 'FOLLOW' : 'IDLE';
            if (this.isFollowing) {
                this.followTarget = window.penitent && window.penitent.mesh ? window.penitent.mesh : null;
            } else {
                // When stopped following, set a new spawn position to wander around
                this.spawnPosition.copy(this.group.position);
                this.waypoints = this.generateWaypoints(this.spawnPosition, 4.0, 4);
                this.currentWaypointIndex = 0;
            }
            if(window.triggerErosBark) window.triggerErosBark(this.isFollowing ? "Auf!" : "Woof...");

        } else if (action === 'BUILD') {
            this.currentState = 'IDLE'; // return to IDLE while UI handles building

            // Original build UI logic hook
            const tabMenu = document.getElementById('tab-menu');
            if (tabMenu) {
                tabMenu.classList.remove('hidden');
                window.hubBuildingState = 'UI_OPEN';

                // Re-wire just in case
                if (window.currentEnvironment && window.currentEnvironment.startGridPlacement) {
                    document.getElementById('build-tent').onclick = () => {
                        window.currentEnvironment.startGridPlacement('tent');
                        tabMenu.classList.add('hidden');
                        document.getElementById('build-hint').classList.remove('hidden');
                    };
                    document.getElementById('build-campfire').onclick = () => {
                        window.currentEnvironment.startGridPlacement('campfire');
                        tabMenu.classList.add('hidden');
                        document.getElementById('build-hint').classList.remove('hidden');
                    };
                }
            }
        } else {
            this.currentState = 'IDLE';
        }
    }

    update(delta) {
        this.animTime += delta;

        // Reset procedural mods
        this.bodyGroup.position.y = 0;
        this.bodyGroup.scale.y = 1;

        if (this.isJumping) {
            this.jumpTime += delta * 6; // Jump speed
            if (this.jumpTime > Math.PI) {
                this.isJumping = false;
                this.jumpTime = 0;
            } else {
                this.bodyGroup.position.y = Math.sin(this.jumpTime) * 0.4; // Jump height
            }
        }

        switch (this.currentState) {
            case 'IDLE':
                this.updateIdle(delta);
                break;
            case 'PATROL':
                this.updatePatrol(delta);
                break;
            case 'FOLLOW':
                this.updateFollow(delta);
                break;
            case 'INTERACTING':
            case 'PETTING':
                this.updateInteracting(delta);
                break;
        }
    }

    updateIdle(delta) {
        const breath = Math.sin(this.animTime * 3) * 0.02;
        this.bodyGroup.scale.y = 1 + breath;
        this.bodyGroup.position.y += breath * 0.2;

        if (this.isFollowing) {
            this.currentState = 'FOLLOW';
            return;
        }

        this.stateTimer -= delta;
        if (this.stateTimer <= 0) {
            this.currentState = 'PATROL';
            this.targetPosition.copy(this.waypoints[this.currentWaypointIndex]);
        }
    }

    updatePatrol(delta) {
        const bounce = Math.abs(Math.sin(this.animTime * 10)) * 0.05;
        if (!this.isJumping) {
            this.bodyGroup.position.y += bounce;
        }

        const moveDir = new THREE.Vector3().subVectors(this.targetPosition, this.group.position);
        moveDir.y = 0;
        const dist = moveDir.length();

        if (dist < 0.2) {
            this.currentState = 'IDLE';
            this.stateTimer = 2 + Math.random() * 2;
            this.currentWaypointIndex = (this.currentWaypointIndex + 1) % this.waypoints.length;
        } else {
            moveDir.normalize();
            const speed = 1.2;
            this.group.position.addScaledVector(moveDir, speed * delta);
            this.group.position.y = this.baseY;

            this.smoothRotateTo(moveDir, delta, 5);
        }
    }

    updateFollow(delta) {
        if (!this.followTarget) {
            this.currentState = 'IDLE';
            this.isFollowing = false;
            return;
        }

        const moveDir = new THREE.Vector3().subVectors(this.followTarget.position, this.group.position);
        moveDir.y = 0;
        const dist = moveDir.length();

        if (dist > 3.0) { // Start following if further than 3 units
            const bounce = Math.abs(Math.sin(this.animTime * 12)) * 0.06;
            if (!this.isJumping) this.bodyGroup.position.y += bounce;

            moveDir.normalize();
            const speed = 2.5; // Faster when following
            this.group.position.addScaledVector(moveDir, speed * delta);
            this.group.position.y = this.baseY;

            this.smoothRotateTo(moveDir, delta, 8);
        } else {
            // Close enough, breathe
            const breath = Math.sin(this.animTime * 3) * 0.02;
            this.bodyGroup.scale.y = 1 + breath;
            this.bodyGroup.position.y += breath * 0.2;

            // Look at player
            if (dist > 0.5) {
                this.smoothRotateTo(moveDir, delta, 5);
            }
        }
    }

    updateInteracting(delta) {
        if (this.playerContext && this.playerContext.position) {
            const lookDir = new THREE.Vector3().subVectors(this.playerContext.position, this.group.position);
            lookDir.y = 0;
            this.smoothRotateTo(lookDir, delta, 8);
        }

        if (this.currentState === 'PETTING') {
            this.stateTimer -= delta;
            if (this.stateTimer <= 0) {
                this.currentState = this.isFollowing ? 'FOLLOW' : 'IDLE';
                this.stateTimer = 1.0;
            }
        }
        // If INTERACTING, wait for Radial Menu to send a command
    }

    smoothRotateTo(dir, delta, turnSpeed) {
        if (dir.lengthSq() < 0.001) return;
        const targetAngle = Math.atan2(dir.x, dir.z);
        let diff = targetAngle - this.group.rotation.y;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        this.group.rotation.y += diff * turnSpeed * delta;
    }

    destroy() {
        window.removeEventListener('ErosCommand', this.handleCommand);
        // Assuming disposeHierarchy exists in window scope or is handled by HubEnvironment
    }
}
