import { codexManager } from '../systems/codex_manager.js';

export class CodexUI {
    constructor() {
        this.isOpen = false;
        this.activeTab = 'bestiary';
        this.searchQuery = '';
        this.selectedEntry = null;

        // Emoji mapping based on user request
        this.tabIcons = {
            bestiary: '👹',
            grimoire: '📜',
            inventory_items: '🎒',
            sanctuary: '⛩️',
            penitente: '🛡️'
        };

        this.tabNames = {
            bestiary: 'Bestiário',
            grimoire: 'Grimório',
            inventory_items: 'Relíquias',
            sanctuary: 'Santuário',
            penitente: 'Penitente'
        };

        this.initDOM();
        this.bindEvents();
        this.render();
    }

    initDOM() {
        // Create main container
        this.container = document.createElement('div');
        this.container.id = 'codex-modal';
        // Gothic Tailwind CSS styling with glassmorphism
        this.container.className = 'fixed inset-0 z-50 flex items-center justify-center hidden bg-black/85 backdrop-blur-md transition-opacity duration-300 opacity-0';

        // Inner panel
        this.panel = document.createElement('div');
        this.panel.className = 'flex flex-col w-[90vw] h-[85vh] max-w-6xl bg-black/60 border border-amber-900/50 rounded-lg shadow-2xl text-amber-100 overflow-hidden';

        // Header
        const header = document.createElement('div');
        header.className = 'flex items-center justify-between p-4 border-b border-amber-900/50 bg-black/40';

        const title = document.createElement('h2');
        title.className = 'text-2xl font-serif tracking-widest text-amber-500 uppercase';
        title.innerHTML = '📖 Tomo do Purgatório';

        const closeBtn = document.createElement('button');
        closeBtn.id = 'codex-close-btn';
        closeBtn.className = 'text-amber-500 hover:text-amber-300 text-2xl font-bold transition-colors';
        closeBtn.innerHTML = '×';

        header.appendChild(title);
        header.appendChild(closeBtn);

        // Main content area
        const contentArea = document.createElement('div');
        contentArea.className = 'flex flex-1 overflow-hidden';

        // Sidebar (Tabs + Search)
        const sidebar = document.createElement('div');
        sidebar.className = 'w-1/3 min-w-[250px] border-r border-amber-900/50 flex flex-col bg-black/40';

        // Search bar
        const searchContainer = document.createElement('div');
        searchContainer.className = 'p-3 border-b border-amber-900/50';
        this.searchInput = document.createElement('input');
        this.searchInput.type = 'text';
        this.searchInput.placeholder = 'Buscar registro...';
        this.searchInput.className = 'w-full px-3 py-2 bg-black/50 border border-amber-900/50 rounded text-amber-100 placeholder-amber-700/50 focus:outline-none focus:border-amber-500 transition-colors';
        searchContainer.appendChild(this.searchInput);

        // Tabs container
        this.tabsContainer = document.createElement('div');
        this.tabsContainer.className = 'flex flex-wrap gap-1 p-2 border-b border-amber-900/50 justify-center';

        // List container
        this.listContainer = document.createElement('div');
        this.listContainer.className = 'flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar';

        sidebar.appendChild(searchContainer);
        sidebar.appendChild(this.tabsContainer);
        sidebar.appendChild(this.listContainer);

        // Details Panel
        this.detailsPanel = document.createElement('div');
        this.detailsPanel.className = 'flex-1 p-8 overflow-y-auto bg-gradient-to-br from-transparent to-black/80 flex flex-col items-center justify-center text-center';

        contentArea.appendChild(sidebar);
        contentArea.appendChild(this.detailsPanel);

        this.panel.appendChild(header);
        this.panel.appendChild(contentArea);
        this.container.appendChild(this.panel);

        document.body.appendChild(this.container);

        // Add custom scrollbar styling if not exists
        if (!document.getElementById('codex-styles')) {
            const style = document.createElement('style');
            style.id = 'codex-styles';
            style.textContent = `
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0,0,0,0.2); }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(120, 53, 15, 0.5); border-radius: 3px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(180, 83, 9, 0.8); }
            `;
            document.head.appendChild(style);
        }
    }

    bindEvents() {
        const closeBtn = this.container.querySelector('#codex-close-btn');
        closeBtn.addEventListener('click', () => this.toggle());

        this.searchInput.addEventListener('input', (e) => {
            this.searchQuery = e.target.value.toLowerCase();
            this.renderList();
        });

        // Global keyboard shortcut
        window.addEventListener('keydown', (e) => {
            // Ignore if typing in an input
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            const key = e.key.toLowerCase();
            if (key === 'c' || key === 'j') {
                e.preventDefault();
                this.toggle();
            } else if (e.key === 'Escape' && this.isOpen) {
                this.toggle();
            }
        });
    }

    toggle() {
        this.isOpen = !this.isOpen;
        if (this.isOpen) {
            // Ensure data is synced before opening
            codexManager.init();
            this.container.classList.remove('hidden');
            // Trigger reflow
            void this.container.offsetWidth;
            this.container.classList.remove('opacity-0');
            this.container.classList.add('opacity-100');
            this.render();

            // Auto-select first item if none selected
            if (!this.selectedEntry) {
                const db = codexManager.getDatabase();
                if (db[this.activeTab] && db[this.activeTab].length > 0) {
                    this.selectedEntry = db[this.activeTab][0];
                    this.renderDetails();
                }
            }
        } else {
            this.container.classList.remove('opacity-100');
            this.container.classList.add('opacity-0');
            setTimeout(() => {
                if (!this.isOpen) this.container.classList.add('hidden');
            }, 300);
        }
    }

    render() {
        this.renderTabs();
        this.renderList();
        this.renderDetails();
    }

    renderTabs() {
        this.tabsContainer.innerHTML = '';
        const categories = Object.keys(codexManager.getDatabase());

        categories.forEach(cat => {
            const btn = document.createElement('button');
            const isActive = this.activeTab === cat;
            btn.className = `px-3 py-1 text-sm rounded transition-colors border ${isActive ? 'bg-amber-900/50 border-amber-500 text-amber-200' : 'bg-transparent border-transparent text-amber-700 hover:text-amber-400 hover:bg-black/30'}`;
            btn.title = this.tabNames[cat] || cat;
            btn.innerHTML = `${this.tabIcons[cat] || '❓'}`;

            btn.addEventListener('click', () => {
                this.activeTab = cat;
                this.searchQuery = '';
                this.searchInput.value = '';
                this.selectedEntry = null; // reset selection on tab change
                this.render();
            });

            this.tabsContainer.appendChild(btn);
        });
    }

    renderList() {
        this.listContainer.innerHTML = '';
        const db = codexManager.getDatabase();
        const entries = db[this.activeTab] || [];

        const filtered = entries.filter(entry => {
            if (!this.searchQuery) return true;
            if (!entry.discovered) return false; // Can't search undiscovered easily, or we hide them
            return entry.name.toLowerCase().includes(this.searchQuery) || entry.description.toLowerCase().includes(this.searchQuery);
        });

        if (filtered.length === 0) {
            this.listContainer.innerHTML = '<div class="text-amber-800/50 text-center text-sm italic mt-4">Nenhum registro encontrado.</div>';
            return;
        }

        filtered.forEach(entry => {
            const item = document.createElement('div');
            const isSelected = this.selectedEntry && this.selectedEntry.id === entry.id;

            item.className = `p-3 rounded cursor-pointer border transition-all ${isSelected ? 'border-amber-500 bg-amber-900/30' : 'border-amber-900/30 bg-black/20 hover:border-amber-700/50 hover:bg-amber-900/10'}`;

            if (entry.discovered) {
                item.innerHTML = `
                    <div class="flex items-center gap-3">
                        <span class="text-2xl">${this.tabIcons[entry.category] || '❓'}</span>
                        <div>
                            <div class="font-serif text-amber-200">${entry.name}</div>
                            <div class="text-xs text-amber-600/80 uppercase tracking-widest mt-1">Maestria: ${entry.masteryLevel}/100</div>
                        </div>
                    </div>
                `;
            } else {
                item.innerHTML = `
                    <div class="flex items-center gap-3 opacity-50 grayscale">
                        <span class="text-2xl">❓</span>
                        <div>
                            <div class="font-serif text-amber-800">???</div>
                            <div class="text-xs text-amber-900/60 uppercase mt-1">Registro Oculto</div>
                        </div>
                    </div>
                `;
            }

            item.addEventListener('click', () => {
                this.selectedEntry = entry;
                this.renderList(); // re-render to update active styling
                this.renderDetails();
            });

            this.listContainer.appendChild(item);
        });
    }

    renderDetails() {
        this.detailsPanel.innerHTML = '';

        if (!this.selectedEntry) {
            this.detailsPanel.innerHTML = '<div class="text-amber-800/40 text-lg font-serif italic">Selecione um registro no tomo.</div>';
            return;
        }

        const entry = this.selectedEntry;

        if (!entry.discovered) {
            this.detailsPanel.innerHTML = `
                <div class="flex flex-col items-center gap-6 opacity-60">
                    <div class="text-6xl filter grayscale blur-sm">❓</div>
                    <h3 class="text-3xl font-serif tracking-widest text-amber-800 border-b border-amber-900/50 pb-2">???</h3>
                    <p class="text-amber-700 italic max-w-md text-lg">"Registro Oculto no Purgatório."</p>
                </div>
            `;
            return;
        }

        let statsHTML = '';
        if (entry.stats && Object.keys(entry.stats).length > 0) {
            statsHTML = `<div class="mt-8 grid grid-cols-2 gap-4 w-full max-w-sm">`;
            for (const [key, value] of Object.entries(entry.stats)) {
                statsHTML += `
                    <div class="bg-black/40 border border-amber-900/30 p-2 rounded text-sm flex flex-col items-center">
                        <span class="text-amber-700/80 uppercase text-xs tracking-wider">${key}</span>
                        <span class="text-amber-400 font-bold">${value}</span>
                    </div>
                `;
            }
            statsHTML += `</div>`;
        }

        const masteryProgress = `
            <div class="w-full max-w-md mt-6">
                <div class="flex justify-between text-xs text-amber-600 uppercase tracking-widest mb-1">
                    <span>Maestria</span>
                    <span>${entry.masteryLevel}%</span>
                </div>
                <div class="w-full bg-black/50 border border-amber-900/50 rounded-full h-2 overflow-hidden">
                    <div class="bg-amber-600 h-full transition-all duration-500" style="width: ${entry.masteryLevel}%"></div>
                </div>
            </div>
        `;

        this.detailsPanel.innerHTML = `
            <div class="flex flex-col items-center gap-4 animate-fade-in w-full max-w-2xl">
                <div class="text-6xl mb-2 filter drop-shadow-[0_0_15px_rgba(217,119,6,0.4)]">${this.tabIcons[entry.category] || '❓'}</div>
                <h3 class="text-4xl font-serif tracking-widest text-amber-400 border-b border-amber-700/50 pb-3 w-full text-center uppercase">${entry.name}</h3>

                <p class="text-amber-200/80 italic text-lg text-center leading-relaxed mt-4 bg-black/20 p-4 rounded border-l-4 border-amber-800/50">"${entry.description}"</p>

                ${statsHTML}

                ${masteryProgress}
            </div>
        `;
    }
}
