export class ShopUI {
    constructor() {
        this.container = document.getElementById('npc-shop-ui');
        this.titleElement = document.getElementById('npc-shop-title');
        this.goldElement = document.getElementById('shop-player-gold');
        this.itemsContainer = document.getElementById('shop-items-container');
        this.closeBtn = document.getElementById('btn-close-shop');

        this.currentNPC = null;

        if (this.closeBtn) {
            this.closeBtn.addEventListener('click', () => this.close());
        }

        // Escape key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !this.container.classList.contains('hidden')) {
                this.close();
            }
        });

        // Bind to window for global access from NPC scripts
        window.openNPCShopUI = this.open.bind(this);
    }

    open(npc, items) {
        if (!this.container) return;

        this.currentNPC = npc;
        this.titleElement.innerText = npc.getDisplayName();

        // Disable game controls when UI is open
        if (window.hubBuildingState !== 'UI_OPEN') {
            this.previousState = window.hubBuildingState;
            window.hubBuildingState = 'UI_OPEN';
        }

        if (window.orbitControls) {
            window.orbitControls.enabled = false;
        }

        this.updateGoldDisplay();
        this.renderItems(items);

        this.container.classList.remove('hidden');
    }

    close() {
        if (!this.container) return;
        this.container.classList.add('hidden');

        // Restore controls
        if (this.previousState) {
            window.hubBuildingState = this.previousState;
        } else {
            window.hubBuildingState = 'NONE';
        }

        if (window.orbitControls) {
            window.orbitControls.enabled = true;
        }

        this.currentNPC = null;
    }

    updateGoldDisplay() {
        if (window.gameState && window.gameState.inventory) {
            // Assuming gold is tracked in gameState.permanent or similar
            // If it's an item, we'd count it. For now, we mock or look for 'gold'
            const gold = window.gameState.inventory['gold'] || 0;
            this.goldElement.innerText = gold.toString();
        } else {
            this.goldElement.innerText = "0";
        }
    }

    renderItems(items) {
        this.itemsContainer.innerHTML = '';

        if (!items || items.length === 0) {
            this.itemsContainer.innerHTML = '<p class="text-gray-400 italic col-span-2 text-center">Nenhum item à venda.</p>';
            return;
        }

        items.forEach(item => {
            const el = document.createElement('div');
            el.className = "flex items-center justify-between p-3 bg-slate-800/80 border border-slate-700 rounded-lg hover:border-yellow-500/50 transition-colors group";

            el.innerHTML = `
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 bg-slate-900 rounded border border-slate-600 flex items-center justify-center">
                        <span class="text-xs text-gray-500">${item.type === 'consumable' ? '🧪' : '⚔️'}</span>
                    </div>
                    <div>
                        <div class="text-white font-medium group-hover:text-yellow-400 transition-colors">${item.name}</div>
                        <div class="text-xs text-gray-400">Preço: <span class="text-yellow-500">${item.price}g</span></div>
                    </div>
                </div>
                <button class="btn-buy px-4 py-1.5 bg-yellow-600/20 hover:bg-yellow-600/40 border border-yellow-600/50 text-yellow-500 rounded text-sm transition-all shadow-[0_0_10px_rgba(202,138,4,0.1)] hover:shadow-[0_0_15px_rgba(202,138,4,0.3)]">Comprar</button>
            `;

            const buyBtn = el.querySelector('.btn-buy');
            buyBtn.addEventListener('click', () => this.buyItem(item));

            this.itemsContainer.appendChild(el);
        });
    }

    buyItem(item) {
        if (!window.gameState || !window.gameState.inventory) return;

        const currentGold = window.gameState.inventory['gold'] || 0;

        if (currentGold >= item.price) {
            // Deduct gold
            window.gameState.inventory['gold'] = currentGold - item.price;

            // Add item
            if (!window.gameState.inventory[item.id]) {
                window.gameState.inventory[item.id] = 0;
            }
            window.gameState.inventory[item.id] += 1;

            window.gameState.save();

            // Re-render UI
            this.updateGoldDisplay();

            if (window.showToast) {
                window.showToast(`Comprado: ${item.name}`, "success");
            }

            // If inventory UI is globally accessible, refresh it
            if (window.inventoryUI && typeof window.inventoryUI.renderGrid === 'function') {
                window.inventoryUI.renderGrid();
            }
        } else {
            if (window.showToast) {
                window.showToast("Ouro insuficiente!", "error");
            }
        }
    }
}
