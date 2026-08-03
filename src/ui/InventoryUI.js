import gameState from '../core/GameState.js';
import { ITEM_DATABASE } from '../data/ItemData.js';

export class InventoryUI {
    constructor() {
        this.isOpen = false;
        this.modal = document.getElementById('inventory-modal');
        if (!this.modal) {
            console.warn('Inventory modal not found in DOM.');
        }

        this.goldHud = document.getElementById('hud-gold-counter');
        this.goldVal = document.getElementById('hud-gold-value');

        window.addEventListener('gold-updated', () => {
            this.updateGoldHUD();
        });

        this.updateGoldHUD();
    }

    toggle() {
        if (!this.modal) return;
        this.isOpen = !this.isOpen;
        if (this.isOpen) {
            this.modal.classList.remove('hidden');
        } else {
            this.modal.classList.add('hidden');
        }
        this.render();
    }

    updateGoldHUD() {
        if (!this.goldHud) {
            this.goldHud = document.getElementById('hud-gold-counter');
            this.goldVal = document.getElementById('hud-gold-value');
        }
        if (this.goldVal) {
            this.goldVal.innerText = gameState.resources.gold;
        }
        if (this.goldHud) {
            this.goldHud.classList.remove('hidden');
        }
    }

    render() {
        if (!this.isOpen) return;

        const grid = document.getElementById('backpack-grid');
        if (!grid) return;

        grid.innerHTML = '';

        for (let i = 0; i < gameState.backpackState.length; i++) {
            const slotData = gameState.backpackState[i];
            const div = document.createElement('div');
            div.className = 'w-full h-12 bg-stone-900/50 border border-amber-900/30 rounded flex items-center justify-center relative hover:border-amber-500/50 transition cursor-pointer';

            if (slotData) {
                const itemData = ITEM_DATABASE[slotData.itemId];
                if (itemData) {
                    div.innerHTML = `<i class="fa-solid ${itemData.icon} text-amber-500/80 text-xl shadow-lg"></i>
                                     <span class="absolute bottom-0 right-1 text-[10px] font-bold text-amber-200 font-mono">${slotData.count > 1 ? slotData.count : ''}</span>`;
                }
            }
            grid.appendChild(div);
        }
    }

}
