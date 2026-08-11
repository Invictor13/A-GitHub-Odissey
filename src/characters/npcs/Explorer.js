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
        this.setupMaterials();

        // Leather Armor look
        this.matShirt = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.9, bumpMap: this.texLeatherBump, bumpScale: 0.1 });
        this.buildHumanoid();

        // Bandana
        const bandanaGeo = new THREE.BoxGeometry(1.2, 0.3, 1.2);
        const bandanaMat = new THREE.MeshStandardMaterial({ color: 0xaa2222 });
        const bandana = new THREE.Mesh(bandanaGeo, bandanaMat);
        bandana.position.y = 0.6;
        this.headPivot.add(bandana);

        // Hide hair top due to bandana
        this.hairTopGroup = new THREE.Group();

        // Slumped over posture since he's injured
        if(this.bodyGroup) {
            this.bodyGroup.rotation.x = 0.4;
            this.bodyGroup.position.y = -0.5;
            this.headPivot.rotation.x = 0.4;
        }
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
                if(this.bodyGroup) { this.bodyGroup.rotation.x = 0; }
                if(this.bodyGroup) { this.bodyGroup.position.y = 0; this.headPivot.rotation.x = 0; }

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
