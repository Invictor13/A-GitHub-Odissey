import * as THREE from 'three';

export class InteractionManager {
    constructor(camera, domElement, getInteractiveObjects) {
        this.camera = camera;
        this.domElement = domElement;
        this.getInteractiveObjects = getInteractiveObjects;

        this.raycaster = new THREE.Raycaster();
        this.mouseVec = new THREE.Vector2(-9999, -9999);
        this.isHovering = false;

        this.onPointerDown = this.onPointerDown.bind(this);
        this.onPointerMove = this.onPointerMove.bind(this);

        this.domElement.addEventListener('pointerdown', this.onPointerDown);
        this.domElement.addEventListener('pointermove', this.onPointerMove);
    }

    updateMousePos(clientX, clientY) {
        const rect = this.domElement.getBoundingClientRect();
        this.mouseVec.x = ((clientX - rect.left) / rect.width) * 2 - 1;
        this.mouseVec.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    }

    getIntersectedObject() {
        this.raycaster.setFromCamera(this.mouseVec, this.camera);

        const interactiveObjects = this.getInteractiveObjects();
        const meshesToTest = interactiveObjects.map(obj => obj.mesh).filter(Boolean);

        if (meshesToTest.length === 0) return null;

        const intersects = this.raycaster.intersectObjects(meshesToTest, true);

        for (let i = 0; i < intersects.length; i++) {
            let current = intersects[i].object;

            // Subimos na hierarquia até encontrar a flag interactable
            while (current) {
                if (current.userData && current.userData.interactable) {
                    const originalData = interactiveObjects.find(obj => obj.mesh === current);

                    if (originalData) {
                        return {
                            object: current,
                            data: originalData
                        };
                    }
                }
                current = current.parent;
            }
        }
        return null;
    }

    onPointerMove(event) {
        // Só verificar interação se não estivermos construindo algo na grade, etc
        // Ou pelo menos só se o jogo estiver no modo HUB.
        // Se window.GAME_STATE não for HUB, ou o hubBuildingState não for de interação, pulamos.
        // Mas a lógica do getInteractiveObjects() já deve retornar array vazio se não houver interação disponível.

        this.updateMousePos(event.clientX, event.clientY);

        const result = this.getIntersectedObject();

        if (result) {
            if (!this.isHovering) {
                document.body.style.cursor = 'pointer';
                this.isHovering = true;
            }
        } else {
            if (this.isHovering) {
                document.body.style.cursor = 'default';
                this.isHovering = false;
            }
        }
    }

    onPointerDown(event) {
        if (event.button !== 0) return; // Apenas botão esquerdo do mouse

        this.updateMousePos(event.clientX, event.clientY);
        const result = this.getIntersectedObject();

        if (result && result.data && result.data.action) {
            // Não clicamos se alguma UI modal estiver aberta ou o estado for de construção de grade
            if (window.hubBuildingState === 'BUILDING_GRID' || window.hubBuildingState === 'UI_OPEN') {
                return;
            }

            console.log("Interagindo com: " + result.object.userData.name);
            result.data.action();
        }
    }

    update() {
        // Chamado no loop de animação, caso haja necessidade de atualizar algo continuamente (por exemplo, animação de highlight)
    }

    cleanup() {
        this.domElement.removeEventListener('pointerdown', this.onPointerDown);
        this.domElement.removeEventListener('pointermove', this.onPointerMove);
        document.body.style.cursor = 'default';
    }
}
