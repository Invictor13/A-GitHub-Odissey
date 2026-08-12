import { NPCBase } from './NPCBase.js';
import * as THREE from 'three';

export class Merchant extends NPCBase {
    constructor(scene, position) {
        super(scene, position, 'Merchant');
        this.hp = 60;
        this.maxHp = 60;

        // Define simple mock inventory for the merchant
        this.shopItems = [
            { id: 'health_potion', name: 'Poção de Vida', price: 10, type: 'consumable' },
            { id: 'antidote', name: 'Antídoto', price: 5, type: 'consumable' },
            { id: 'bomb', name: 'Bomba', price: 15, type: 'consumable' }
        ];
    }

    getDisplayName() {
        return "Mercador Viajante";
    }

    buildModel() {
        this.setupMaterials();

        // Random mantle color
        const mantleColors = [0x8b4513, 0x556b2f, 0x8b0000];
        const mantleColor = mantleColors[Math.floor(Math.random() * mantleColors.length)];
        this.matShirt = new THREE.MeshStandardMaterial({ color: mantleColor, roughness: 0.9 });

        this.buildHumanoid();

        // Hood
        const hoodGeo = new THREE.BoxGeometry(1.4, 1.4, 1.4);
        const hood = new THREE.Mesh(hoodGeo, this.matShirt);
        hood.position.set(0, 0.2, -0.1);
        this.headPivot.add(hood);

        // Huge Backpack
        const packGeo = new THREE.BoxGeometry(1.6, 2.2, 1.2);
        const packMat = new THREE.MeshStandardMaterial({ color: 0x4a3c31 });
        const pack = new THREE.Mesh(packGeo, packMat);
        pack.position.set(0, 0, -1.2);
        pack.rotation.x = -0.2;

        // Bedroll on backpack
        const rollGeo = new THREE.CylinderGeometry(0.4, 0.4, 1.8, 8);
        const rollMat = new THREE.MeshStandardMaterial({ color: 0x555555 });
        const roll = new THREE.Mesh(rollGeo, rollMat);
        roll.position.set(0, 1.2, 0);
        roll.rotation.z = Math.PI / 2;
        pack.add(roll);

        this.torso.add(pack);
    }

    interact(player) {
        if (this.isDead) return;
        super.interact(player);

        // Open UI
        if (window.openNPCShopUI) {
            window.openNPCShopUI(this, this.shopItems);
        } else {
            console.log("Merchant interaction triggered, but UI function is missing.");
        }
    }

dropLoot() {
        if (!this.group || !this.group.position) return;

        // Drop a signature item (a potion) and maybe some gold
        if (window.EnemyManager && window.EnemyManager.lootManager) {
            console.log("Merchant died. Dropping special item.");
            // We use the lootManager to spawn something manually.
            // Assuming spawnLoot is set up to handle basic drops
            window.EnemyManager.lootManager.spawnLoot('Chest_Wood', this.group.position);
        }
    }
}
