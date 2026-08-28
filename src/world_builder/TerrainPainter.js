import * as THREE from 'three';

export class TerrainPainter {
    constructor() {
        this.grassTexture = null;
        this.sandTexture = null;
        this.dirtTexture = null;
    }

    /**
     * Configures texture filtering and wrapping for pixel/low-poly look.
     * @param {THREE.CanvasTexture} texture
     * @returns {THREE.CanvasTexture}
     */
    _configureTexture(texture) {
        texture.magFilter = THREE.NearestFilter;
        texture.minFilter = THREE.NearestFilter;
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.needsUpdate = true;
        return texture;
    }

    /**
     * Creates a 64x64 2D Canvas element.
     * @returns {{canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D}}
     */
    _createCanvas() {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        return { canvas, ctx };
    }

    /**
     * Dotted noise grass texture with 3 green tones (#4caf50, #43a047, #388e3c).
     * @returns {THREE.CanvasTexture}
     */
    createGrassTexture() {
        const { canvas, ctx } = this._createCanvas();
        const colors = ['#4caf50', '#43a047', '#388e3c'];
        const pixelSize = 4;

        for (let x = 0; x < 64; x += pixelSize) {
            for (let y = 0; y < 64; y += pixelSize) {
                const color = colors[Math.floor(Math.random() * colors.length)];
                ctx.fillStyle = color;
                ctx.fillRect(x, y, pixelSize, pixelSize);
            }
        }

        const texture = new THREE.CanvasTexture(canvas);
        this.grassTexture = this._configureTexture(texture);
        return this.grassTexture;
    }

    /**
     * Sand texture with golden granulation (#fdd835, #fbc02d, #fff59d).
     * @returns {THREE.CanvasTexture}
     */
    createSandTexture() {
        const { canvas, ctx } = this._createCanvas();
        const colors = ['#fdd835', '#fbc02d', '#fff59d'];
        const pixelSize = 4;

        for (let x = 0; x < 64; x += pixelSize) {
            for (let y = 0; y < 64; y += pixelSize) {
                const color = colors[Math.floor(Math.random() * colors.length)];
                ctx.fillStyle = color;
                ctx.fillRect(x, y, pixelSize, pixelSize);
            }
        }

        const texture = new THREE.CanvasTexture(canvas);
        this.sandTexture = this._configureTexture(texture);
        return this.sandTexture;
    }

    /**
     * Earthy dirt texture with brown tones (#5d4037, #4e342e).
     * @returns {THREE.CanvasTexture}
     */
    createDirtTexture() {
        const { canvas, ctx } = this._createCanvas();
        const colors = ['#5d4037', '#4e342e'];
        const pixelSize = 4;

        for (let x = 0; x < 64; x += pixelSize) {
            for (let y = 0; y < 64; y += pixelSize) {
                const color = colors[Math.floor(Math.random() * colors.length)];
                ctx.fillStyle = color;
                ctx.fillRect(x, y, pixelSize, pixelSize);
            }
        }

        const texture = new THREE.CanvasTexture(canvas);
        this.dirtTexture = this._configureTexture(texture);
        return this.dirtTexture;
    }

    /**
     * Replaces smooth materials with textured materials across the given group/object.
     * @param {THREE.Object3D|Object} islandMeshGroup
     */
    applyMaterials(islandMeshGroup) {
        if (!islandMeshGroup) return;

        if (!this.grassTexture) this.createGrassTexture();
        if (!this.sandTexture) this.createSandTexture();
        if (!this.dirtTexture) this.createDirtTexture();

        const processMaterial = (mat, meshName = '', meshUserData = {}) => {
            if (!mat) return;

            const name = (mat.name || meshName || '').toLowerCase();
            const type = meshUserData.type || mat.userData?.type;
            const colorHex = mat.color ? mat.color.getHexString() : '';

            let textureToApply = null;

            if (type === 'grass' || name.includes('grass') || name.includes('grama') || colorHex === '4ade80' || colorHex === '15803d' || colorHex === '4e9a38') {
                textureToApply = this.grassTexture;
            } else if (type === 'sand' || name.includes('sand') || name.includes('areia') || colorHex === 'fde047' || colorHex === 'fdd835' || colorHex === 'd4b26f') {
                textureToApply = this.sandTexture;
            } else if (type === 'dirt' || name.includes('dirt') || name.includes('terra') || colorHex === '5a3825' || colorHex === '291d16' || colorHex === '6b4423' || colorHex === '5d4037') {
                textureToApply = this.dirtTexture;
            } else if (type) {
                if (type.includes('grass')) textureToApply = this.grassTexture;
                else if (type.includes('sand')) textureToApply = this.sandTexture;
                else if (type.includes('dirt')) textureToApply = this.dirtTexture;
            }

            if (textureToApply) {
                mat.map = textureToApply;
                mat.needsUpdate = true;
            }
        };

        if (islandMeshGroup.matDict) {
            if (islandMeshGroup.matDict.grass) {
                islandMeshGroup.matDict.grass.map = this.grassTexture;
                islandMeshGroup.matDict.grass.needsUpdate = true;
            }
            if (islandMeshGroup.matDict.sand) {
                islandMeshGroup.matDict.sand.map = this.sandTexture;
                islandMeshGroup.matDict.sand.needsUpdate = true;
            }
            if (islandMeshGroup.matDict.dirt) {
                islandMeshGroup.matDict.dirt.map = this.dirtTexture;
                islandMeshGroup.matDict.dirt.needsUpdate = true;
            }
        }

        if (typeof islandMeshGroup.traverse === 'function') {
            islandMeshGroup.traverse((child) => {
                if (child.isMesh && child.material) {
                    const materials = Array.isArray(child.material) ? child.material : [child.material];
                    materials.forEach(mat => processMaterial(mat, child.name, child.userData));
                }
            });
        }
    }
}
