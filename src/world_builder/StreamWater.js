import * as THREE from 'three';
import { applyWorldCurvature } from '../core/GraphicsUtils.js';

export class StreamWater extends THREE.Mesh {
    constructor(curvePoints = null, width = 3.5) {
        // Build curve if points provided or use default Hub river path
        let curve;
        if (curvePoints && curvePoints.isCurve) {
            curve = curvePoints;
        } else if (Array.isArray(curvePoints) && curvePoints.length > 1) {
            curve = new THREE.CatmullRomCurve3(curvePoints);
        } else {
            // Default stream path crossing the Hub island
            const defaultPoints = [];
            const steps = 30;
            for (let i = 0; i <= steps; i++) {
                const t = i / steps;
                const x = -28 + t * 56;
                const z = Math.sin(x * 0.15) * 8;
                const y = 0.28;
                defaultPoints.push(new THREE.Vector3(x, y, z));
            }
            curve = new THREE.CatmullRomCurve3(defaultPoints);
        }

        const lengthSegments = 60;
        const widthSegments = 4;
        const geometry = StreamWater.createRibbonGeometry(curve, width, lengthSegments, widthSegments);

        const material = new THREE.MeshStandardMaterial({
            color: 0x0ea5e9,
            roughness: 0.1,
            metalness: 0.1,
            transparent: true,
            opacity: 0.85,
            flatShading: true,
            side: THREE.DoubleSide
        });

        applyWorldCurvature(material, false, true);

        super(geometry, material);
        this.renderOrder = 10;

        this.width = width;
        this.curve = curve;
        this.lengthSegments = lengthSegments;
        this.widthSegments = widthSegments;
        this.flowTime = 0;

        // Store original vertex positions for animation reference
        this.initialPositions = this.geometry.attributes.position.array.slice();
    }

    static createRibbonGeometry(curve, width, lengthSegments, widthSegments) {
        const geometry = new THREE.BufferGeometry();
        const numVertices = (lengthSegments + 1) * (widthSegments + 1);
        const positions = new Float32Array(numVertices * 3);
        const uvs = new Float32Array(numVertices * 2);
        const indices = [];

        const points = curve.getSpacedPoints(lengthSegments);

        let vertexIdx = 0;
        let uvIdx = 0;

        for (let i = 0; i <= lengthSegments; i++) {
            const u = i / lengthSegments;
            const pt = points[i];

            // Compute tangent in XZ plane for ribbon orientation
            let tangent;
            if (i < lengthSegments) {
                tangent = new THREE.Vector3().subVectors(points[i + 1], pt);
            } else {
                tangent = new THREE.Vector3().subVectors(pt, points[i - 1]);
            }
            tangent.y = 0;
            tangent.normalize();

            // Perpendicular vector in XZ plane
            const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

            for (let j = 0; j <= widthSegments; j++) {
                const v = j / widthSegments;
                const offset = (v - 0.5) * width;

                const vx = pt.x + normal.x * offset;
                const vy = pt.y;
                const vz = pt.z + normal.z * offset;

                positions[vertexIdx * 3] = vx;
                positions[vertexIdx * 3 + 1] = vy;
                positions[vertexIdx * 3 + 2] = vz;

                uvs[uvIdx * 2] = u;
                uvs[uvIdx * 2 + 1] = v;

                vertexIdx++;
                uvIdx++;
            }
        }

        const rowSize = widthSegments + 1;
        for (let i = 0; i < lengthSegments; i++) {
            for (let j = 0; j < widthSegments; j++) {
                const a = i * rowSize + j;
                const b = (i + 1) * rowSize + j;
                const c = (i + 1) * rowSize + (j + 1);
                const d = i * rowSize + (j + 1);

                indices.push(a, b, d);
                indices.push(b, c, d);
            }
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
        geometry.setIndex(indices);
        geometry.computeVertexNormals();

        return geometry;
    }

    update(delta = 0.016, time = null) {
        const dt = typeof delta === 'number' ? delta : 0.016;
        this.flowTime += dt;
        const currentTime = time !== null ? time : this.flowTime;

        const posAttr = this.geometry.attributes.position;
        const count = posAttr.count;

        for (let i = 0; i < count; i++) {
            const origX = this.initialPositions[i * 3];
            const origY = this.initialPositions[i * 3 + 1];
            const origZ = this.initialPositions[i * 3 + 2];

            // Animate subtle wave along flow direction (u direction mapped to X/Z coordinates)
            const wave = Math.sin((origX + origZ) * 0.8 + currentTime * 2.5) * 0.06
                       + Math.cos((origX - origZ) * 0.5 + currentTime * 1.8) * 0.04;

            posAttr.setY(i, origY + wave);
        }

        posAttr.needsUpdate = true;
        this.geometry.computeVertexNormals();
    }
}
