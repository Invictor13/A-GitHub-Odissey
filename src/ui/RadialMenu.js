export class RadialMenu {
    constructor() {
        this.setupStyles();
        this.initDOM();
    }

    setupStyles() {
        if (document.getElementById('radial-menu-styles')) return;
        const style = document.createElement('style');
        style.id = 'radial-menu-styles';
        style.textContent = `
            .radial-menu-overlay {
                position: fixed;
                top: 0; left: 0; width: 100vw; height: 100vh;
                background: rgba(0, 0, 0, 0.4);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 2000;
                opacity: 0;
                pointer-events: none;
                transition: opacity 0.2s ease;
            }
            .radial-menu-overlay.active {
                opacity: 1;
                pointer-events: auto;
            }
            .radial-menu-container {
                position: relative;
                width: 300px;
                height: 300px;
                border-radius: 50%;
            }
            .radial-item {
                position: absolute;
                top: 50%; left: 50%;
                width: 80px; height: 80px;
                margin-top: -40px; margin-left: -40px;
                background: #1e293b;
                border: 2px solid #eab308;
                border-radius: 50%;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                color: #eab308;
                font-family: 'Inter', sans-serif;
                font-size: 12px;
                cursor: pointer;
                transition: transform 0.2s, background 0.2s;
                text-align: center;
                box-shadow: 0 4px 6px rgba(0,0,0,0.5);
                user-select: none;
            }
            .radial-item:hover {
                transform: scale(1.1);
                background: #334155;
                color: #fef08a;
            }
            .radial-item i {
                font-size: 24px;
                margin-bottom: 4px;
            }

            #radial-btn-pet { transform: rotate(-90deg) translate(100px) rotate(90deg); }
            #radial-btn-follow { transform: rotate(30deg) translate(100px) rotate(-30deg); }
            #radial-btn-build { transform: rotate(150deg) translate(100px) rotate(-150deg); }

            #radial-btn-pet:hover { transform: rotate(-90deg) translate(100px) rotate(90deg) scale(1.1); }
            #radial-btn-follow:hover { transform: rotate(30deg) translate(100px) rotate(-30deg) scale(1.1); }
            #radial-btn-build:hover { transform: rotate(150deg) translate(100px) rotate(-150deg) scale(1.1); }

            .radial-center {
                position: absolute;
                top: 50%; left: 50%;
                width: 60px; height: 60px;
                margin-top: -30px; margin-left: -30px;
                background: rgba(30,41,59,0.8);
                border: 2px solid #64748b;
                border-radius: 50%;
                display: flex;
                justify-content: center;
                align-items: center;
                color: white;
                cursor: pointer;
                transition: 0.2s;
            }
            .radial-center:hover {
                background: rgba(30,41,59,1);
                border-color: #ef4444;
                color: #ef4444;
            }
        `;
        document.head.appendChild(style);
    }

    initDOM() {
        this.overlay = document.createElement('div');
        this.overlay.className = 'radial-menu-overlay';
        this.overlay.innerHTML = `
            <div class="radial-menu-container">
                <div class="radial-item" id="radial-btn-pet">
                    <i class="fa-solid fa-hand-sparkles"></i>
                    <span>Acariciar</span>
                </div>
                <div class="radial-item" id="radial-btn-follow">
                    <i class="fa-solid fa-paw"></i>
                    <span id="radial-follow-text">Seguir</span>
                </div>
                <div class="radial-item" id="radial-btn-build">
                    <i class="fa-solid fa-hammer"></i>
                    <span>Projetos</span>
                </div>
                <div class="radial-center" id="radial-btn-close">
                    <i class="fa-solid fa-xmark"></i>
                </div>
            </div>
        `;
        document.body.appendChild(this.overlay);

        this.overlay.querySelector('#radial-btn-pet').addEventListener('click', () => this.dispatchAction('PET'));
        this.overlay.querySelector('#radial-btn-follow').addEventListener('click', () => this.dispatchAction('TOGGLE_FOLLOW'));
        this.overlay.querySelector('#radial-btn-build').addEventListener('click', () => this.dispatchAction('BUILD'));
        this.overlay.querySelector('#radial-btn-close').addEventListener('click', () => this.close());
    }

    open(context = null) {
        this.context = context;
        if (context && context.isFollowing) {
            document.getElementById('radial-follow-text').textContent = 'Ficar';
        } else {
            document.getElementById('radial-follow-text').textContent = 'Seguir';
        }
        this.overlay.classList.add('active');

        // Let external listeners know the menu opened so they can pause game if needed
        window.dispatchEvent(new CustomEvent('RadialMenuOpened'));
    }

    close() {
        this.overlay.classList.remove('active');
        window.dispatchEvent(new CustomEvent('RadialMenuClosed'));
    }

    dispatchAction(actionType) {
        const event = new CustomEvent('ErosCommand', { detail: { action: actionType, context: this.context } });
        window.dispatchEvent(event);
        this.close();
    }
}
