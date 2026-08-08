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
        this.setupInteractions();
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


    setupInteractions() {
        const grid = document.getElementById('backpack-grid');
        if (grid) {
            grid.addEventListener('click', (e) => {
                const slotDiv = e.target.closest('.backpack-slot');
                if (!slotDiv) return;
                const slotIndex = parseInt(slotDiv.dataset.index);
                this.handleBackpackClick(slotIndex);
            });
        }

        document.querySelectorAll('.slot-equip').forEach(slot => {
            slot.addEventListener('click', (e) => {
                const equipType = slot.dataset.equipType;
                this.handleEquipClick(equipType);
            });
        });
    }

    handleBackpackClick(slotIndex) {
        const slotData = gameState.backpackState[slotIndex];
        if (!slotData) return;
        const itemData = ITEM_DATABASE[slotData.itemId];
        if (!itemData) return;

        if (itemData.type.startsWith('weapon') || itemData.type.startsWith('armor')) {
            let targetSlot = '';
            if (itemData.type === 'weapon_1h' || itemData.type === 'weapon_2h') targetSlot = 'right_hand';
            else if (itemData.type === 'armor_offhand') targetSlot = 'left_hand';
            else if (itemData.type === 'armor_head') targetSlot = 'head';
            else if (itemData.type === 'armor_chest') targetSlot = 'chest';
            else if (itemData.type === 'armor_feet') targetSlot = 'feet';
            else if (itemData.type === 'accessory') targetSlot = 'accessory';

            if (targetSlot) {
                if (itemData.type === 'weapon_2h' && gameState.equipmentState.left_hand) {
                    this.unequipItem('left_hand');
                }
                if (itemData.type === 'armor_offhand' && gameState.equipmentState.right_hand) {
                    const rightWeapon = ITEM_DATABASE[gameState.equipmentState.right_hand];
                    if (rightWeapon && rightWeapon.type === 'weapon_2h') {
                        this.unequipItem('right_hand');
                    }
                }

                const currentEquip = gameState.equipmentState[targetSlot];
                gameState.equipmentState[targetSlot] = slotData.itemId;

                if (currentEquip) {
                     gameState.backpackState[slotIndex] = { itemId: currentEquip, count: 1 };
                } else {
                     gameState.backpackState[slotIndex].count -= 1;
                     if (gameState.backpackState[slotIndex].count <= 0) {
                         gameState.backpackState[slotIndex] = null;
                     }
                }

                gameState.save();
                this.render();
                window.dispatchEvent(new CustomEvent('equipment-changed'));
            }
        }
    }

    handleEquipClick(equipType) {
        this.unequipItem(equipType);
    }

    unequipItem(equipType) {
        const itemId = gameState.equipmentState[equipType];
        if (!itemId) return;

        let emptySlot = -1;
        for (let i = 0; i < gameState.backpackState.length; i++) {
            if (!gameState.backpackState[i]) {
                emptySlot = i;
                break;
            }
        }

        if (emptySlot !== -1) {
            gameState.backpackState[emptySlot] = { itemId: itemId, count: 1 };
            gameState.equipmentState[equipType] = null;
            gameState.save();
            this.render();
            window.dispatchEvent(new CustomEvent('equipment-changed'));
        } else {
            console.warn('Backpack is full!');
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
            div.className = 'backpack-slot w-full h-12 bg-stone-900/50 border border-amber-900/30 rounded flex items-center justify-center relative hover:border-amber-500/50 transition cursor-pointer';
            div.dataset.index = i;

            if (slotData) {
                const itemData = ITEM_DATABASE[slotData.itemId];
                if (itemData) {
                    div.innerHTML = `<i class="fa-solid ${itemData.icon} text-amber-500/80 text-xl shadow-lg"></i>
                                     <span class="absolute bottom-0 right-1 text-[10px] font-bold text-amber-200 font-mono">${slotData.count > 1 ? slotData.count : ''}</span>`;
                }
            }
            grid.appendChild(div);
        }

        const equipTypes = ['head', 'chest', 'right_hand', 'left_hand', 'feet', 'accessory'];
        equipTypes.forEach(type => {
            const slot = document.getElementById(`slot-${type}`);
            if (slot) {
                const itemId = gameState.equipmentState[type];
                if (itemId) {
                    const itemData = ITEM_DATABASE[itemId];
                    if (itemData) {
                        slot.innerHTML = `<i class="fa-solid ${itemData.icon} text-amber-500/80 text-2xl shadow-lg pointer-events-none"></i>`;
                        slot.style.border = '1px solid rgba(245, 158, 11, 0.5)';
                    }
                } else {
                    slot.innerHTML = '';
                    slot.style.border = '';
                }
            }
        });
    }

}
