import { NPCBase } from './NPCBase.js';
import * as THREE from 'three';

export class Alchemist extends NPCBase {
    constructor(scene, position) {
        super(scene, position, 'Alchemist');
        this.hp = 40;
        this.maxHp = 40;

        // Healing service mock
        this.servicePrice = 25;
    }

    getDisplayName() {
        return "Curandeira / Alquimista";
    }

    buildModel() {
        // Body (Robes)
        const bodyGeo = new THREE.ConeGeometry(0.4, 1.4, 8);
        const robeMat = new THREE.MeshStandardMaterial({ color: 0x4a0e4e }); // Deep purple
        const body = new THREE.Mesh(bodyGeo, robeMat);
        body.position.y = 0.7;

        // Head
        const headGeo = new THREE.SphereGeometry(0.25, 8, 8);
        const headMat = new THREE.MeshStandardMaterial({ color: 0xffccaa });
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.y = 1.5;

        // Pointy Hat
        const hatGeo = new THREE.ConeGeometry(0.35, 0.6, 8);
        const hatMat = new THREE.MeshStandardMaterial({ color: 0x2d082f });
        const hat = new THREE.Mesh(hatGeo, hatMat);
        hat.position.y = 1.8;
        hat.rotation.x = -0.1;

        // Staff/Wand
        const wandGeo = new THREE.CylinderGeometry(0.02, 0.03, 1.0);
        const wandMat = new THREE.MeshStandardMaterial({ color: 0x8b4513 });
        const wand = new THREE.Mesh(wandGeo, wandMat);
        wand.position.set(0.3, 0.8, 0.3);
        wand.rotation.x = Math.PI / 4;

        // Glowing gem on wand
        const gemGeo = new THREE.OctahedronGeometry(0.08);
        const gemMat = new THREE.MeshStandardMaterial({
            color: 0x00ffcc,
            emissive: 0x00aa88,
            transparent: true,
            opacity: 0.8
        });
        const gem = new THREE.Mesh(gemGeo, gemMat);
        gem.position.y = 0.5;
        wand.add(gem);

        this.meshGroup.add(body);
        this.meshGroup.add(head);
        this.meshGroup.add(hat);
        this.meshGroup.add(wand);
    }

interact(player) {
        if (this.isDead) return;
        super.interact(player);

        // Quick interaction: Pay gold to heal
        if (window.gameState && window.gameState.inventory) {
            const currentGold = window.gameState.inventory['gold'] || 0;
            const hasGold = currentGold >= this.servicePrice;

            if (hasGold) {
                window.gameState.inventory['gold'] = currentGold - this.servicePrice;

                if (window.gameState.vitals) {
                    window.gameState.vitals.hp = window.gameState.vitals.maxHp || 100;
                    window.gameState.vitals.food = window.gameState.vitals.maxFood || 100;
                    window.gameState.vitals.water = window.gameState.vitals.maxWater || 100;
                    window.gameState.save();
                }

                // Visual effect on player could go here

                if (window.showToast) {
                    window.showToast("Alquimista: 'Sua vitalidade foi restaurada, viajante.'", "success");
                }

                // Refresh UI if needed
                if (window.inventoryUI && typeof window.inventoryUI.renderGrid === 'function') {
                    window.inventoryUI.renderGrid();
                }

            } else {
                if (window.showToast) {
                    window.showToast("Alquimista: 'Você não tem Ouro suficiente. São " + this.servicePrice + " moedas.'", "error");
                }
            }
        }
    }
}
