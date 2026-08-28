import * as THREE from 'three';
import { applyWorldCurvature } from '../core/GraphicsUtils.js';

export class TerrainMaterials {
    constructor() {
        this.textureCache = new Map();
        this.materialCache = new Map();
    }

    /**
     * Configures common texture wrapping and filtering for pixel/low-poly style.
     * @param {THREE.CanvasTexture} texture
     * @returns {THREE.CanvasTexture}
     */
    _configureTexture(texture) {
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.magFilter = THREE.NearestFilter;
        texture.minFilter = THREE.NearestFilter;
        texture.needsUpdate = true;
        return texture;
    }

    /**
     * Helper to create a 128x128 2D Canvas context.
     * @returns {{canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D}}
     */
    _createCanvas() {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');
        return { canvas, ctx };
    }

    /**
     * Dotted grass texture with green variations (#4e9a38, #3b7d28, #60b343).
     * @returns {THREE.CanvasTexture}
     */
    createGrassTexture() {
        const { canvas, ctx } = this._createCanvas();

        // Base background fill (#4e9a38)
        ctx.fillStyle = '#4e9a38';
        ctx.fillRect(0, 0, 128, 128);

        const colors = ['#3b7d28', '#60b343'];
        const pixelSize = 4; // 32x32 grid on 128x128 canvas for crisp pixel look

        for (let x = 0; x < 128; x += pixelSize) {
            for (let y = 0; y < 128; y += pixelSize) {
                const rand = Math.random();
                if (rand < 0.25) {
                    ctx.fillStyle = colors[0];
                    ctx.fillRect(x, y, pixelSize, pixelSize);
                } else if (rand > 0.75) {
                    ctx.fillStyle = colors[1];
                    ctx.fillRect(x, y, pixelSize, pixelSize);
                }
            }
        }

        const texture = new THREE.CanvasTexture(canvas);
        return this._configureTexture(texture);
    }

    /**
     * Dirt/mud texture with brown noise (#6b4423, #523419, #7d522c).
     * @returns {THREE.CanvasTexture}
     */
    createDirtTexture() {
        const { canvas, ctx } = this._createCanvas();

        // Base fill (#6b4423)
        ctx.fillStyle = '#6b4423';
        ctx.fillRect(0, 0, 128, 128);

        const colors = ['#523419', '#7d522c'];
        const pixelSize = 4;

        for (let x = 0; x < 128; x += pixelSize) {
            for (let y = 0; y < 128; y += pixelSize) {
                const rand = Math.random();
                if (rand < 0.3) {
                    ctx.fillStyle = colors[0];
                    ctx.fillRect(x, y, pixelSize, pixelSize);
                } else if (rand > 0.7) {
                    ctx.fillStyle = colors[1];
                    ctx.fillRect(x, y, pixelSize, pixelSize);
                }
            }
        }

        const texture = new THREE.CanvasTexture(canvas);
        return this._configureTexture(texture);
    }

    /**
     * Sand texture with soft granules (#d4b26f, #e5c98b).
     * @returns {THREE.CanvasTexture}
     */
    createSandTexture() {
        const { canvas, ctx } = this._createCanvas();

        // Base fill (#d4b26f)
        ctx.fillStyle = '#d4b26f';
        ctx.fillRect(0, 0, 128, 128);

        const accentColor = '#e5c98b';
        const pixelSize = 4;

        for (let x = 0; x < 128; x += pixelSize) {
            for (let y = 0; y < 128; y += pixelSize) {
                if (Math.random() < 0.2) {
                    ctx.fillStyle = accentColor;
                    ctx.fillRect(x, y, pixelSize, pixelSize);
                }
            }
        }

        const texture = new THREE.CanvasTexture(canvas);
        return this._configureTexture(texture);
    }

    /**
     * Rocky stone texture for island sides (#686b73, #4f5159).
     * @returns {THREE.CanvasTexture}
     */
    createStoneTexture() {
        const { canvas, ctx } = this._createCanvas();

        // Base fill (#686b73)
        ctx.fillStyle = '#686b73';
        ctx.fillRect(0, 0, 128, 128);

        const darkColor = '#4f5159';
        const pixelSize = 4;

        for (let x = 0; x < 128; x += pixelSize) {
            for (let y = 0; y < 128; y += pixelSize) {
                const rand = Math.random();
                if (rand < 0.35) {
                    ctx.fillStyle = darkColor;
                    ctx.fillRect(x, y, pixelSize, pixelSize);
                }
            }
        }

        const texture = new THREE.CanvasTexture(canvas);
        return this._configureTexture(texture);
    }

    /**
     * Returns cached or newly created texture by type key.
     * @param {'grass'|'dirt'|'sand'|'stone'} type
     * @returns {THREE.CanvasTexture}
     */
    getTexture(type) {
        if (!this.textureCache.has(type)) {
            let texture;
            switch (type) {
                case 'grass':
                    texture = this.createGrassTexture();
                    break;
                case 'dirt':
                    texture = this.createDirtTexture();
                    break;
                case 'sand':
                    texture = this.createSandTexture();
                    break;
                case 'stone':
                case 'rock':
                    texture = this.createStoneTexture();
                    break;
                default:
                    texture = this.createGrassTexture();
                    break;
            }
            this.textureCache.set(type, texture);
        }
        return this.textureCache.get(type);
    }

    /**
     * Creates a material with texture, roughness, and CurvatureEffect support.
     * @param {'grass'|'dirt'|'sand'|'stone'|'rock'} type
     * @param {Object} options - Custom options (e.g., roughness, materialType, repeat)
     * @returns {THREE.Material}
     */
    createTerrainMaterial(type, options = {}) {
        const texture = this.getTexture(type);
        const roughness = options.roughness !== undefined ? options.roughness : 0.9;
        const repeat = options.repeat || [1, 1];

        if (repeat[0] !== 1 || repeat[1] !== 1) {
            texture.repeat.set(repeat[0], repeat[1]);
        }

        const matParams = {
            map: texture,
            roughness: roughness,
            flatShading: options.flatShading !== undefined ? options.flatShading : true,
            ...options.materialParams
        };

        const MaterialClass = options.useStandard ? THREE.MeshStandardMaterial : THREE.MeshLambertMaterial;
        const material = new MaterialClass(matParams);

        if (options.applyCurvature !== false) {
            applyWorldCurvature(material, options.isVegetation || false, options.isWater || false);
        }

        return material;
    }

    /**
     * Utility method to get or create a material by type key.
     * @param {'grass'|'dirt'|'sand'|'stone'|'rock'} type
     * @param {Object} options
     * @returns {THREE.Material}
     */
    getMaterial(type, options = {}) {
        const cacheKey = `${type}_${options.roughness || 0.9}_${options.useStandard || false}`;
        if (!this.materialCache.has(cacheKey)) {
            const material = this.createTerrainMaterial(type, options);
            this.materialCache.set(cacheKey, material);
        }
        return this.materialCache.get(cacheKey);
    }

    /**
     * Convenience method to apply curvature to any given material.
     * @param {THREE.Material} material
     * @param {boolean} isVegetation
     * @param {boolean} isWater
     */
    applyCurvature(material, isVegetation = false, isWater = false) {
        applyWorldCurvature(material, isVegetation, isWater);
    }
}
