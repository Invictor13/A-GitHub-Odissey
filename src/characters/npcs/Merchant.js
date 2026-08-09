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
        // Body
        const bodyGeo = new THREE.CylinderGeometry(0.35, 0.35, 1.4, 8);

        // Random mantle color
        const mantleColors = [0x8b4513, 0x556b2f, 0x8b0000];
        const mantleColor = mantleColors[Math.floor(Math.random() * mantleColors.length)];
        const bodyMat = new THREE.MeshStandardMaterial({ color: mantleColor });

        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 0.7;

        // Head
        const headGeo = new THREE.BoxGeometry(0.4, 0.4, 0.4);
        const headMat = new THREE.MeshStandardMaterial({ color: 0xffccaa });
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.y = 1.6;

        // Hood
        const hoodGeo = new THREE.BoxGeometry(0.45, 0.45, 0.45);
        const hoodMat = new THREE.MeshStandardMaterial({ color: mantleColor });
        const hood = new THREE.Mesh(hoodGeo, hoodMat);
        hood.position.set(0, 1.62, -0.05);

        // Huge Backpack
        const packGeo = new THREE.BoxGeometry(0.6, 0.8, 0.4);
        const packMat = new THREE.MeshStandardMaterial({ color: 0x4a3c31 });
        const pack = new THREE.Mesh(packGeo, packMat);
        pack.position.set(0, 0.8, -0.4);
        pack.rotation.x = -0.2;

        this.meshGroup.add(body);
        this.meshGroup.add(head);
        this.meshGroup.add(hood);
        this.meshGroup.add(pack);
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
