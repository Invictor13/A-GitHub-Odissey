import gameState from '../core/GameState.js';
import { ITEM_DATABASE } from '../data/ItemData.js';

export class InventoryManager {
    constructor() {}

    hasSpace() {
        return gameState.backpackState.some(slot => slot === null);
    }

    addItem(itemId, amount = 1) {
        const itemData = ITEM_DATABASE[itemId];
        if (!itemData) return false;

        let added = false;

        // Find existing stack if stackable (materials/consumables)
        if (itemData.type === 'material' || itemData.type === 'consumable') {
            for (let i = 0; i < gameState.backpackState.length; i++) {
                if (gameState.backpackState[i] && gameState.backpackState[i].itemId === itemId) {
                    gameState.backpackState[i].count += amount;
                    added = true;
                    break;
                }
            }
        }

        // Find empty slot if not added to stack
        if (!added) {
            for (let i = 0; i < gameState.backpackState.length; i++) {
                if (!gameState.backpackState[i]) {
                    gameState.backpackState[i] = { itemId: itemId, count: amount };
                    added = true;
                    break;
                }
            }
        }

        if (added) {
            gameState.save();
            return true;
        }
        return false;
    }

    removeItem(slotIndex, amount = 1) {
        if (slotIndex < 0 || slotIndex >= gameState.backpackState.length) return false;

        const slot = gameState.backpackState[slotIndex];
        if (!slot) return false;

        slot.count -= amount;
        if (slot.count <= 0) {
            gameState.backpackState[slotIndex] = null;
        }
        gameState.save();
        return true;
    }
}

export const inventoryManager = new InventoryManager();
