import gameState from '../core/GameState.js';

export class SurvivalSystem {
    constructor() {
        this.timeSinceLastTick = 0;
        this.tickInterval = 12; // 12 seconds as in the original code, but we will use delta time
    }

    update(delta) {
        this.timeSinceLastTick += delta;

        if (this.timeSinceLastTick >= this.tickInterval) {
            this.timeSinceLastTick = 0;

            gameState.vitals.food = Math.max(0, gameState.vitals.food - 1);
            gameState.vitals.water = Math.max(0, gameState.vitals.water - 1.5);

            if (gameState.vitals.food === 0 || gameState.vitals.water === 0) {
                gameState.vitals.hp = Math.max(0, gameState.vitals.hp - 2);
                if (gameState.vitals.hp === 0) {
                    this.showToast('O Penitente sucumbiu no Purgatório...', 'error');
                } else {
                    this.showToast('Sua vitalidade está esvaindo por fome/sede!', 'error');
                }
            }

            this.updateUI();
            gameState.save();
        }
    }

    updateUI() {
        const hpBar = document.getElementById('vital-hp');
        const hpTxt = document.getElementById('txt-hp');
        if (hpBar) hpBar.style.width = `${gameState.vitals.hp}%`;
        if (hpTxt) hpTxt.innerText = `${Math.round(gameState.vitals.hp)}%`;

        const foodBar = document.getElementById('vital-food');
        const foodTxt = document.getElementById('txt-food');
        if (foodBar) foodBar.style.width = `${gameState.vitals.food}%`;
        if (foodTxt) foodTxt.innerText = `${Math.round(gameState.vitals.food)}%`;

        const waterBar = document.getElementById('vital-water');
        const waterTxt = document.getElementById('txt-water');
        if (waterBar) waterBar.style.width = `${gameState.vitals.water}%`;
        if (waterTxt) waterTxt.innerText = `${Math.round(gameState.vitals.water)}%`;
    }

    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `px-4 py-3 rounded-lg shadow-lg text-sm font-bold flex items-center gap-3 transform transition-all duration-300 translate-y-2 opacity-0 ${type === 'error' ? 'bg-red-900/90 text-red-100 border border-red-500/50' : 'bg-slate-800/90 text-slate-100 border border-slate-600/50'}`;

        const icon = document.createElement('i');
        icon.className = `fa-solid ${type === 'error' ? 'fa-triangle-exclamation text-red-400' : 'fa-circle-info text-sky-400'}`;
        toast.appendChild(icon);

        const text = document.createElement('span');
        text.innerText = message;
        toast.appendChild(text);

        container.appendChild(toast);

        // Animate in
        requestAnimationFrame(() => {
            toast.classList.remove('translate-y-2', 'opacity-0');
        });

        // Remove after 3 seconds
        setTimeout(() => {
            toast.classList.add('opacity-0', '-translate-y-2');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}
