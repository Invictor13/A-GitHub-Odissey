import { NPCBase } from './NPCBase.js';
import * as THREE from 'three';

export class Explorer extends NPCBase {
    constructor(scene, position) {
        super(scene, position, 'Explorer');
        this.hp = 10; // Starts with very low HP
        this.maxHp = 50;
        this.healed = false;
    }

    getDisplayName() {
        return "Explorador Ferido";
    }

    buildModel() {
        // Body (Leather Armor)
        const bodyGeo = new THREE.CylinderGeometry(0.3, 0.35, 1.3, 8);
        const armorMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.9 });
        const body = new THREE.Mesh(bodyGeo, armorMat);
        body.position.y = 0.65;

        // Head
        const headGeo = new THREE.BoxGeometry(0.35, 0.35, 0.35);
        const headMat = new THREE.MeshStandardMaterial({ color: 0xffccaa });
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.y = 1.45;

        // Bandana
        const bandanaGeo = new THREE.BoxGeometry(0.36, 0.1, 0.36);
        const bandanaMat = new THREE.MeshStandardMaterial({ color: 0xaa2222 });
        const bandana = new THREE.Mesh(bandanaGeo, bandanaMat);
        bandana.position.y = 1.5;

        this.meshGroup.add(body);
        this.meshGroup.add(head);
        this.meshGroup.add(bandana);

        // Slumped over posture since he's injured
        this.meshGroup.rotation.x = 0.4;
        this.meshGroup.position.y = -0.3;
    }

interact(player) {
        if (this.isDead) return;
        super.interact(player);

        if (this.healed) {
            if (window.showToast) {
                window.showToast("Explorador: 'Obrigado novamente. Vou voltar para casa.'");
            }
            return;
        }

        if (window.gameState && window.gameState.inventory) {
            // Check inventory for 'health_potion' or 'food'
            const hasPotion = (window.gameState.inventory['health_potion'] || 0) > 0;
            const hasFood = (window.gameState.inventory['food'] || 0) > 0;

            if (hasPotion || hasFood) {
                this.healed = true;
                this.hp = this.maxHp;

                // Consume item
                if (hasPotion) {
                    window.gameState.inventory['health_potion']--;
                } else if (hasFood) {
                    window.gameState.inventory['food']--;
                }

                // Stand up straight
                this.meshGroup.rotation.x = 0;
                this.meshGroup.position.y = 0;

                // Reward player with gold or a special item
                window.gameState.inventory['gold'] = (window.gameState.inventory['gold'] || 0) + 50;
                window.gameState.save();

                if (window.inventoryUI && typeof window.inventoryUI.renderGrid === 'function') {
                    window.inventoryUI.renderGrid();
                }

                if (window.showToast) {
                    window.showToast("Explorador: 'Muito obrigado! Tome este ouro como recompensa.'", "success");
                }
            } else {
                if (window.showToast) {
                    window.showToast("Explorador: 'Por favor... me ajude... preciso de poção de vida ou comida...'");
                }
            }
        }
    }
}
