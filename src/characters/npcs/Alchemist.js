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
        this.setupMaterials();
        // Give her a purple robe look
        this.matShirt = new THREE.MeshStandardMaterial({ color: 0x4a0e4e, roughness: 0.9 });
        this.matLeatherDark = new THREE.MeshStandardMaterial({ color: 0x2d082f, roughness: 0.9 });
        this.buildHumanoid();

        // Pointy Hat
        const hatGeo = new THREE.ConeGeometry(1.2, 2.0, 8);
        const hatMat = new THREE.MeshStandardMaterial({ color: 0x2d082f });
        const hat = new THREE.Mesh(hatGeo, hatMat);
        hat.position.set(0, 1.2, -0.2);
        hat.rotation.x = -0.2;
        this.headPivot.add(hat);

        // Staff/Wand
        const wandGeo = new THREE.CylinderGeometry(0.06, 0.08, 3.0);
        const wandMat = new THREE.MeshStandardMaterial({ color: 0x8b4513 });
        const wand = new THREE.Mesh(wandGeo, wandMat);

        // Glowing gem on wand
        const gemGeo = new THREE.OctahedronGeometry(0.25);
        const gemMat = new THREE.MeshStandardMaterial({
            color: 0x00ffcc,
            emissive: 0x00aa88,
            transparent: true,
            opacity: 0.8
        });
        const gem = new THREE.Mesh(gemGeo, gemMat);
        gem.position.y = 1.5;
        wand.add(gem);

        this.handR.add(wand);
        wand.position.set(0, 0, 0.4);
        wand.rotation.x = Math.PI / 4;
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
