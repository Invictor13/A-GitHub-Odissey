export class SeverinoSentinelaUI {
    constructor() {
        this.isOpen = false;
        this.evidenceCount = 0;
        this.initDOM();
        this.bindEvents();
    }

    initDOM() {
        // Main container overlay for Severino Sentinela
        this.container = document.createElement('div');
        this.container.id = 'severino-sentinela-ui';
        this.container.className = 'fixed inset-0 z-[110] hidden flex flex-col justify-between p-4 md:p-6 pointer-events-none transition-opacity duration-300 opacity-0';

        // Header Panel / Board Header
        const headerContainer = document.createElement('div');
        headerContainer.className = 'w-full max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 pointer-events-auto bg-slate-950/80 backdrop-blur-md border border-amber-500/30 rounded-2xl p-4 shadow-2xl';

        headerContainer.innerHTML = `
            <div class="flex items-center gap-4">
                <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/20 to-slate-900 border border-amber-400/40 flex items-center justify-center text-amber-400 text-2xl shadow-lg">
                    <i class="fa-solid fa-shield-halved"></i>
                </div>
                <div>
                    <h1 class="text-xl md:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-amber-100 uppercase tracking-wider font-title">
                        SEVERINO SENTINELA
                    </h1>
                    <p class="text-xs text-slate-400 tracking-wide font-medium">
                        Central de Evidências, Capturas Rápidas & Blindagem Forense
                    </p>
                </div>
            </div>

            <!-- Red Status Badge (no truncation, flex auto fit) -->
            <div class="flex items-center gap-3 bg-red-950/70 border border-red-500/60 px-4 py-2 rounded-xl text-red-200 shadow-lg shadow-red-950/50 animate-pulse whitespace-nowrap">
                <div class="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></div>
                <span class="text-xs font-bold uppercase tracking-wider text-red-300">
                    PERÍCIA EM ANDAMENTO — ANALISANDO MATERIAL DA DELEGACIA
                </span>
            </div>
        `;

        // Delegacia Modal (Popup) - Kept hidden by default, accessible via button
        this.popupModal = document.createElement('div');
        this.popupModal.id = 'delegacia-popup-modal';
        this.popupModal.className = 'fixed inset-0 z-[140] hidden flex items-center justify-center bg-black/80 backdrop-blur-md pointer-events-auto p-4';
        this.popupModal.innerHTML = `
            <div class="glass-panel border border-amber-500/40 p-6 rounded-2xl max-w-lg w-full flex flex-col shadow-2xl relative text-slate-200">
                <button id="btn-close-delegacia-modal" class="absolute top-4 right-4 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 border border-slate-600 rounded-full w-8 h-8 flex items-center justify-center transition">
                    <i class="fa-solid fa-xmark"></i>
                </button>
                <div class="flex items-center gap-3 border-b border-amber-500/30 pb-3 mb-4">
                    <i class="fa-solid fa-building-shield text-2xl text-amber-400"></i>
                    <div>
                        <h3 class="text-lg font-bold text-amber-300 uppercase tracking-wider">Delegacia de Evidências</h3>
                        <p class="text-xs text-slate-400">Selecione uma categoria para consultar os autos do inquérito</p>
                    </div>
                </div>
                <div class="space-y-3 my-2">
                    <div class="bg-slate-900/60 p-3 rounded-xl border border-slate-700/60 flex items-center justify-between hover:border-amber-400/50 transition cursor-pointer">
                        <span class="text-sm font-semibold text-slate-200"><i class="fa-solid fa-folder-open text-amber-400 mr-2"></i>Ocorrências Registradas</span>
                        <span class="text-xs bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded border border-amber-500/30">Ativo</span>
                    </div>
                    <div class="bg-slate-900/60 p-3 rounded-xl border border-slate-700/60 flex items-center justify-between hover:border-amber-400/50 transition cursor-pointer">
                        <span class="text-sm font-semibold text-slate-200"><i class="fa-solid fa-microscope text-cyan-400 mr-2"></i>Laudos Forenses de TI</span>
                        <span class="text-xs bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded border border-cyan-500/30">Em análise</span>
                    </div>
                    <div class="bg-slate-900/60 p-3 rounded-xl border border-slate-700/60 flex items-center justify-between hover:border-amber-400/50 transition cursor-pointer">
                        <span class="text-sm font-semibold text-slate-200"><i class="fa-solid fa-shield-virus text-emerald-400 mr-2"></i>Blindagem LGPD & logs</span>
                        <span class="text-xs bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30">Concluído</span>
                    </div>
                </div>
            </div>
        `;

        // Modern Clean Footer Navigation Bar
        const footerNav = document.createElement('div');
        footerNav.className = 'w-full max-w-4xl mx-auto pointer-events-auto bg-slate-950/85 backdrop-blur-xl border border-slate-800/80 hover:border-slate-700/80 p-2.5 rounded-2xl shadow-2xl flex items-center justify-center gap-2 flex-wrap transition-all duration-300 mb-2';

        footerNav.innerHTML = `
            <button id="sentinela-btn-print" class="sentinela-nav-btn flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700/60 hover:border-amber-400/60 text-xs font-bold uppercase tracking-wider transition-all duration-200 shadow-md hover:-translate-y-0.5 hover:shadow-amber-500/10 cursor-pointer">
                <i class="fa-solid fa-paste text-amber-400 text-sm"></i>
                <span>Cole seu Print</span>
            </button>

            <button id="sentinela-btn-mural" class="sentinela-nav-btn flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700/60 hover:border-cyan-400/60 text-xs font-bold uppercase tracking-wider transition-all duration-200 shadow-md hover:-translate-y-0.5 hover:shadow-cyan-500/10 cursor-pointer">
                <i class="fa-solid fa-map-pin text-cyan-400 text-sm"></i>
                <span>Mural de Pistas (<span id="sentinela-pistas-count">0</span>)</span>
            </button>

            <button id="sentinela-btn-record" class="sentinela-nav-btn flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700/60 hover:border-red-400/60 text-xs font-bold uppercase tracking-wider transition-all duration-200 shadow-md hover:-translate-y-0.5 hover:shadow-red-500/10 cursor-pointer">
                <i class="fa-solid fa-circle text-red-500 text-xs animate-pulse"></i>
                <span>Gravar Tela</span>
            </button>

            <button id="sentinela-btn-delegacia" class="sentinela-nav-btn flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700/60 hover:border-emerald-400/60 text-xs font-bold uppercase tracking-wider transition-all duration-200 shadow-md hover:-translate-y-0.5 hover:shadow-emerald-500/10 cursor-pointer">
                <i class="fa-solid fa-building-shield text-emerald-400 text-sm"></i>
                <span>Delegacia</span>
            </button>

            <button id="sentinela-btn-exit" class="sentinela-nav-btn flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-950/50 hover:bg-red-900/70 text-red-200 border border-red-800/60 hover:border-red-500 text-xs font-bold uppercase tracking-wider transition-all duration-200 shadow-md hover:-translate-y-0.5 hover:shadow-red-900/40 cursor-pointer">
                <i class="fa-solid fa-door-open text-red-400 text-sm"></i>
                <span>Sair</span>
            </button>
        `;

        this.container.appendChild(headerContainer);
        this.container.appendChild(footerNav);

        document.body.appendChild(this.container);
        document.body.appendChild(this.popupModal);
    }

    bindEvents() {
        const btnCloseModal = this.popupModal.querySelector('#btn-close-delegacia-modal');
        if (btnCloseModal) {
            btnCloseModal.addEventListener('click', () => {
                this.popupModal.classList.add('hidden');
            });
        }

        const btnDelegacia = this.container.querySelector('#sentinela-btn-delegacia');
        if (btnDelegacia) {
            btnDelegacia.addEventListener('click', () => {
                this.popupModal.classList.toggle('hidden');
            });
        }

        const btnExit = this.container.querySelector('#sentinela-btn-exit');
        if (btnExit) {
            btnExit.addEventListener('click', () => {
                this.toggle(false);
            });
        }
    }

    toggle(show) {
        this.isOpen = show !== undefined ? show : !this.isOpen;
        if (this.isOpen) {
            this.container.classList.remove('hidden');
            void this.container.offsetWidth;
            this.container.classList.remove('opacity-0');
            this.container.classList.add('opacity-100');
        } else {
            this.container.classList.remove('opacity-100');
            this.container.classList.add('opacity-0');
            setTimeout(() => {
                if (!this.isOpen) this.container.classList.add('hidden');
            }, 300);
            this.popupModal.classList.add('hidden');
        }
    }
}
