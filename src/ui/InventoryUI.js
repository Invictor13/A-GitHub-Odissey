import gameState from '../core/GameState.js';
import { ITEM_DATABASE } from '../data/ItemData.js';
import { inventoryManager } from '../systems/InventoryManager.js';

const CRAFTING_RECIPES = [
    {
        id: 'wooden_stick',
        name: 'Bastão de Madeira',
        inputs: [{ itemId: 'stick', amount: 1 }],
        output: { itemId: 'wooden_stick', amount: 1 }
    },
    {
        id: 'wooden_spear',
        name: 'Lança de Madeira',
        inputs: [{ itemId: 'stick', amount: 1 }, { itemId: 'stone', amount: 1 }],
        output: { itemId: 'wooden_spear', amount: 1 }
    }
];

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

        // Tab Switching Logic
        const tabBtns = document.querySelectorAll('.inv-tab-btn');
        const tabContents = document.querySelectorAll('.inv-tab-content');

        tabBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const targetId = btn.id.replace('tab-btn-', 'tab-content-');

                // Update active button classes
                tabBtns.forEach(b => {
                    b.classList.remove('active', 'bg-amber-900/40', 'text-amber-200', 'border-amber-500/50');
                    b.classList.add('bg-stone-950/40', 'text-amber-200/50', 'border-transparent');
                });
                btn.classList.add('active', 'bg-amber-900/40', 'text-amber-200', 'border-amber-500/50');
                btn.classList.remove('bg-stone-950/40', 'text-amber-200/50', 'border-transparent');

                // Update visible content
                tabContents.forEach(content => {
                    if (content.id === targetId) {
                        content.classList.remove('opacity-0', 'pointer-events-none');
                        content.classList.add('opacity-100');
                        if (targetId === 'tab-content-crafting') {
                            this.renderCrafting();
                        }
                    } else {
                        content.classList.remove('opacity-100');
                        content.classList.add('opacity-0', 'pointer-events-none');
                    }
                });
            });
        });

        const recipeList = document.getElementById('recipe-list');
        if (recipeList) {
            recipeList.addEventListener('click', (e) => {
                const craftBtn = e.target.closest('.btn-craft');
                if (craftBtn) {
                    this.handleCraftClick(craftBtn.dataset.recipeId);
                }
            });
        }
    }

    handleCraftClick(recipeId) {
        const recipe = CRAFTING_RECIPES.find(r => r.id === recipeId);
        if (!recipe) return;

        // Check if player has required items
        const backpackState = gameState.backpackState;
        let canCraft = true;

        for (const input of recipe.inputs) {
            let totalAmount = 0;
            for (const slot of backpackState) {
                if (slot && slot.itemId === input.itemId) {
                    totalAmount += slot.count;
                }
            }
            if (totalAmount < input.amount) {
                canCraft = false;
                break;
            }
        }

        if (!canCraft) {
            if (window.showToast) window.showToast('Recursos insuficientes!', 'text-red-400', 'fa-circle-xmark');
            return;
        }

        // Check inventory space (unless output is stackable and we already have a stack, but simpler to just check hasSpace)
        if (!inventoryManager.hasSpace() && ITEM_DATABASE[recipe.output.itemId].type !== 'material' && ITEM_DATABASE[recipe.output.itemId].type !== 'consumable') {
             if (window.showToast) window.showToast('Mochila cheia!', 'text-red-400', 'fa-suitcase-rolling');
             return;
        }

        // Consume inputs
        for (const input of recipe.inputs) {
            let amountToRemove = input.amount;
            for (let i = 0; i < backpackState.length; i++) {
                if (amountToRemove <= 0) break;
                if (backpackState[i] && backpackState[i].itemId === input.itemId) {
                    if (backpackState[i].count >= amountToRemove) {
                        backpackState[i].count -= amountToRemove;
                        amountToRemove = 0;
                        if (backpackState[i].count === 0) {
                            backpackState[i] = null;
                        }
                    } else {
                        amountToRemove -= backpackState[i].count;
                        backpackState[i] = null;
                    }
                }
            }
        }

        // Add output
        inventoryManager.addItem(recipe.output.itemId, recipe.output.amount);

        if (window.showToast) {
            const itemData = ITEM_DATABASE[recipe.output.itemId];
            window.showToast(`+${recipe.output.amount} ${itemData.name} criado`, 'text-green-400', itemData.icon);
        }

        this.render();
        this.renderCrafting();
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

    renderCrafting() {
        if (!this.isOpen) return;

        const recipeList = document.getElementById('recipe-list');
        if (!recipeList) return;

        recipeList.innerHTML = '';

        CRAFTING_RECIPES.forEach(recipe => {
            const outputItem = ITEM_DATABASE[recipe.output.itemId];

            let inputsHtml = '';
            let canCraft = true;

            recipe.inputs.forEach(input => {
                const inputItem = ITEM_DATABASE[input.itemId];

                let playerAmount = 0;
                gameState.backpackState.forEach(slot => {
                    if (slot && slot.itemId === input.itemId) playerAmount += slot.count;
                });

                const hasEnough = playerAmount >= input.amount;
                if (!hasEnough) canCraft = false;

                inputsHtml += `
                    <div class="flex items-center gap-1 text-[10px] ${hasEnough ? 'text-amber-200' : 'text-red-400'}">
                        <i class="fa-solid ${inputItem.icon}"></i> ${playerAmount}/${input.amount} ${inputItem.name}
                    </div>
                `;
            });

            const recipeDiv = document.createElement('div');
            recipeDiv.className = 'bg-stone-900/50 border border-amber-900/30 rounded p-2 flex justify-between items-center';
            recipeDiv.innerHTML = `
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 bg-stone-950/80 rounded flex items-center justify-center border border-amber-700/50">
                        <i class="fa-solid ${outputItem.icon} text-amber-500 text-lg"></i>
                    </div>
                    <div>
                        <div class="text-xs font-bold text-amber-200 font-title mb-1">${recipe.name}</div>
                        <div class="flex flex-wrap gap-2">
                            ${inputsHtml}
                        </div>
                    </div>
                </div>
                <button class="btn-craft px-3 py-1 bg-amber-900/40 hover:bg-amber-700/60 text-amber-200 border border-amber-500/50 rounded text-xs font-bold transition disabled:opacity-50 disabled:cursor-not-allowed" data-recipe-id="${recipe.id}" ${canCraft ? '' : 'disabled'}>
                    Criar
                </button>
            `;
            recipeList.appendChild(recipeDiv);
        });
    }

}
