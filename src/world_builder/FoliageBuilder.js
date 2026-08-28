import * as THREE from 'three';
import { applyWorldCurvature } from '../core/GraphicsUtils.js';

/**
 * FoliageBuilder responsible for creating and scattering tree tops and grass tufts in the Hub.
 */
export class FoliageBuilder {
    constructor() {
        this.colors = ['#388e3c', '#2e7d32', '#43a047'];
        this.palette = this.colors.map(hex => new THREE.Color(hex));
    }

    /**
     * Attaches stylized foliage tree tops to specified tree trunk positions.
     *
     * @param {THREE.Scene|THREE.Group} scene - Target scene or container group.
     * @param {Array<THREE.Vector3|Object>} treePositions - Array of tree trunk positions.
     * @param {Object} [options={}] - Optional settings (style, offsetY).
     * @returns {THREE.Group} Group containing created foliage tops.
     */
    attachTreeTops(scene, treePositions = [], options = {}) {
        const foliageGroup = new THREE.Group();
        foliageGroup.name = 'FoliageTreeTops';

        if (!Array.isArray(treePositions) || treePositions.length === 0) {
            if (scene) scene.add(foliageGroup);
            return foliageGroup;
        }

        const styleOption = options.style || 'random';
        const offsetY = options.offsetY !== undefined ? options.offsetY : 1.2;

        treePositions.forEach((pos) => {
            const x = pos.x ?? pos.position?.x ?? 0;
            const y = pos.y ?? pos.position?.y ?? 0;
            const z = pos.z ?? pos.position?.z ?? 0;

            const treeTopGroup = new THREE.Group();
            treeTopGroup.position.set(x, y + offsetY, z);

            const selectedStyle = styleOption === 'random'
                ? (Math.random() > 0.5 ? 'dodecahedron' : 'cones')
                : styleOption;

            if (selectedStyle === 'dodecahedron') {
                const hexColor = this.colors[Math.floor(Math.random() * this.colors.length)];
                const mat = new THREE.MeshLambertMaterial({
                    color: hexColor,
                    flatShading: true,
                    roughness: 0.8
                });
                applyWorldCurvature(mat, true, false);

                const geo = new THREE.DodecahedronGeometry(1.2, 1);
                const mesh = new THREE.Mesh(geo, mat);
                mesh.castShadow = true;
                mesh.receiveShadow = false;

                mesh.rotation.y = Math.random() * Math.PI * 2;
                mesh.rotation.x = (Math.random() - 0.5) * 0.2;
                mesh.rotation.z = (Math.random() - 0.5) * 0.2;
                const scale = 0.85 + Math.random() * 0.3;
                mesh.scale.set(scale, scale * (0.9 + Math.random() * 0.2), scale);

                treeTopGroup.add(mesh);
            } else {
                // 2 overlapping low-poly cones
                const hexColor1 = this.colors[Math.floor(Math.random() * this.colors.length)];
                const hexColor2 = this.colors[Math.floor(Math.random() * this.colors.length)];

                const mat1 = new THREE.MeshLambertMaterial({
                    color: hexColor1,
                    flatShading: true,
                    roughness: 0.8
                });
                applyWorldCurvature(mat1, true, false);

                const mat2 = new THREE.MeshLambertMaterial({
                    color: hexColor2,
                    flatShading: true,
                    roughness: 0.8
                });
                applyWorldCurvature(mat2, true, false);

                const cone1Geo = new THREE.ConeGeometry(1.2, 1.8, 6);
                cone1Geo.translate(0, 0.9, 0);
                const cone1 = new THREE.Mesh(cone1Geo, mat1);
                cone1.castShadow = true;
                cone1.receiveShadow = false;

                const cone2Geo = new THREE.ConeGeometry(0.95, 1.4, 6);
                cone2Geo.translate(0, 1.6, 0);
                const cone2 = new THREE.Mesh(cone2Geo, mat2);
                cone2.castShadow = true;
                cone2.receiveShadow = false;

                treeTopGroup.add(cone1);
                treeTopGroup.add(cone2);

                treeTopGroup.rotation.y = Math.random() * Math.PI * 2;
            }

            foliageGroup.add(treeTopGroup);
        });

        if (scene) {
            scene.add(foliageGroup);
        }

        return foliageGroup;
    }

    /**
     * Scatters stylized grass tufts on grass block positions using InstancedMesh.
     *
     * @param {THREE.Scene|THREE.Group} scene - Target scene or group.
     * @param {Array<THREE.Vector3|Object>} grassBlockPositions - Surface positions of grass blocks.
     * @param {number} [density=0.4] - Density multiplier for scattering tufts.
     * @param {Object} [options={}] - Optional settings (offsetY).
     * @returns {THREE.InstancedMesh|null} Created InstancedMesh or null if empty.
     */
    scatterGrassTufts(scene, grassBlockPositions = [], density = 0.4, options = {}) {
        if (!Array.isArray(grassBlockPositions) || grassBlockPositions.length === 0) {
            return null;
        }

        const validBlocks = [];
        grassBlockPositions.forEach(pos => {
            const countOnBlock = Math.floor(density) + (Math.random() < (density % 1) ? 1 : 0);
            if (countOnBlock > 0) {
                validBlocks.push({ pos, count: countOnBlock });
            }
        });

        const totalTufts = validBlocks.reduce((sum, item) => sum + item.count, 0);
        if (totalTufts === 0) return null;

        // Stylized low-poly grass tuft pyramid geometry
        const tuftGeo = new THREE.ConeGeometry(0.18, 0.45, 3);
        tuftGeo.translate(0, 0.225, 0);

        const tuftMat = new THREE.MeshLambertMaterial({
            color: 0xffffff, // White base color so instance colors are applied accurately
            flatShading: true,
            side: THREE.DoubleSide
        });
        applyWorldCurvature(tuftMat, true, false);

        const instancedMesh = new THREE.InstancedMesh(tuftGeo, tuftMat, totalTufts);
        instancedMesh.name = 'FoliageGrassTufts';
        instancedMesh.castShadow = true;
        instancedMesh.receiveShadow = false;

        const dummy = new THREE.Object3D();
        let instanceIdx = 0;

        const offsetY = options.offsetY !== undefined ? options.offsetY : 0.5;

        validBlocks.forEach(item => {
            const bx = item.pos.x ?? item.pos.position?.x ?? 0;
            const by = item.pos.y ?? item.pos.position?.y ?? 0;
            const bz = item.pos.z ?? item.pos.position?.z ?? 0;

            for (let i = 0; i < item.count; i++) {
                const offsetX = (Math.random() - 0.5) * 0.7;
                const offsetZ = (Math.random() - 0.5) * 0.7;
                const scaleY = 0.6 + Math.random() * 0.7;
                const scaleXZ = 0.8 + Math.random() * 0.5;

                dummy.position.set(bx + offsetX, by + offsetY, bz + offsetZ);
                dummy.rotation.set(0, Math.random() * Math.PI * 2, 0);
                dummy.scale.set(scaleXZ, scaleY, scaleXZ);
                dummy.updateMatrix();

                instancedMesh.setMatrixAt(instanceIdx, dummy.matrix);

                const color = this.palette[Math.floor(Math.random() * this.palette.length)];
                instancedMesh.setColorAt(instanceIdx, color);

                instanceIdx++;
            }
        });

        instancedMesh.instanceMatrix.needsUpdate = true;
        if (instancedMesh.instanceColor) {
            instancedMesh.instanceColor.needsUpdate = true;
        }

        if (scene) {
            scene.add(instancedMesh);
        }

        return instancedMesh;
    }
}

export const foliageBuilder = new FoliageBuilder();
export default foliageBuilder;
