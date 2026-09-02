import * as THREE from 'three';

export class DistanceCuller {
    constructor(activeRadius = 60, sleepRadius = 180) {
        this.activeRadius = activeRadius;
        this.sleepRadius = sleepRadius;
    }

    update(playerPos, attachedIslandsManager, camera) {
        if (!playerPos || !attachedIslandsManager || !attachedIslandsManager.attachedIslands) return;

        attachedIslandsManager.attachedIslands.forEach(record => {
            if (!record.center) return;

            const dist = playerPos.distanceTo(record.center);

            // Distance-based culling logic:
            // Islands start Sleeping and are woken by crossing the Bridge trigger or entering activeRadius (60)
            if (record.state === 'Active') {
                if (dist > this.sleepRadius) {
                    attachedIslandsManager.sleepIsland(record);
                }
            } else if (record.state === 'Sleeping') {
                if (dist < this.activeRadius) {
                    attachedIslandsManager.wakeIsland(record);
                }
            }

            // Frustum culling check for active islands
            if (record.state === 'Active' && record.proceduralMap && record.proceduralMap.mapGroup && camera) {
                const islandBoundingSphere = new THREE.Sphere(record.center, record.radius || 50);
                const frustum = new THREE.Frustum();
                const projScreenMatrix = new THREE.Matrix4();
                projScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
                frustum.setFromProjectionMatrix(projScreenMatrix);

                const isVisibleInFrustum = frustum.intersectsSphere(islandBoundingSphere);
                record.proceduralMap.mapGroup.visible = isVisibleInFrustum;
            }
        });
    }
}
