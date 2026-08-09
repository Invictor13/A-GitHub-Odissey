export class MobileControls {
    constructor() {
        this.isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        this.joystickData = { x: 0, y: 0, active: false };
        window.virtualJoystick = this.joystickData;

        if (this.isTouchDevice) {
            this.initUI();
            this.setupTouchEvents();
        }
    }

    initUI() {
        // Container for mobile controls
        this.container = document.getElementById('mobile-controls-container');
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = 'mobile-controls-container';
            document.body.appendChild(this.container);
        }

        this.container.style.position = 'fixed';
        this.container.style.inset = '0';
        this.container.style.zIndex = '40'; // Below modals, above game canvas
        this.container.style.pointerEvents = 'none'; // Only interactive elements will have pointer-events
        this.container.style.display = 'none'; // Hidden by default, shown by game state manager

        // Left half for joystick detection
        this.leftZone = document.createElement('div');
        this.leftZone.style.position = 'absolute';
        this.leftZone.style.left = '0';
        this.leftZone.style.top = '0';
        this.leftZone.style.width = '40%';
        this.leftZone.style.height = '100%';
        this.leftZone.style.pointerEvents = this.isTouchDevice ? 'auto' : 'none';
        this.leftZone.style.touchAction = 'none'; // Prevent scrolling
        this.container.appendChild(this.leftZone);

        // Make sure pointerEvents is specifically handled for the leftZone so it doesn't block mouse clicks on desktop.
        // Left zone is only pointer-events auto if touch device
        if (!this.isTouchDevice) {
            this.leftZone.style.pointerEvents = 'none';
        }

        // Joystick Visuals
        this.joystickBase = document.createElement('div');
        this.joystickBase.style.position = 'absolute';
        this.joystickBase.style.width = '80px';
        this.joystickBase.style.height = '80px';
        this.joystickBase.style.borderRadius = '50%';
        this.joystickBase.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
        this.joystickBase.style.border = '2px solid rgba(255, 255, 255, 0.4)';
        this.joystickBase.style.display = 'none';
        this.joystickBase.style.transform = 'translate(-50%, -50%)';
        this.joystickBase.style.pointerEvents = 'none';
        this.container.appendChild(this.joystickBase);

        this.joystickStick = document.createElement('div');
        this.joystickStick.style.position = 'absolute';
        this.joystickStick.style.width = '40px';
        this.joystickStick.style.height = '40px';
        this.joystickStick.style.borderRadius = '50%';
        this.joystickStick.style.backgroundColor = 'rgba(255, 255, 255, 0.6)';
        this.joystickStick.style.display = 'none';
        this.joystickStick.style.transform = 'translate(-50%, -50%)';
        this.joystickStick.style.pointerEvents = 'none';
        this.container.appendChild(this.joystickStick);

        // Right side buttons container
        this.buttonsContainer = document.createElement('div');
        this.buttonsContainer.style.position = 'absolute';
        this.buttonsContainer.style.right = '20px';
        this.buttonsContainer.style.bottom = '20px';
        this.buttonsContainer.style.display = 'flex';
        this.buttonsContainer.style.flexDirection = 'column';
        this.buttonsContainer.style.alignItems = 'flex-end';
        this.buttonsContainer.style.gap = '10px';
        this.buttonsContainer.style.pointerEvents = 'none'; // Container shouldn't block, only buttons
        this.container.appendChild(this.buttonsContainer);

        // Top right menus container
        this.menusContainer = document.createElement('div');
        this.menusContainer.style.position = 'absolute';
        this.menusContainer.style.right = '20px';
        this.menusContainer.style.top = '90px';
        this.menusContainer.style.display = 'flex';
        this.menusContainer.style.flexDirection = 'row';
        this.menusContainer.style.gap = '15px';
        this.menusContainer.style.pointerEvents = 'none'; // Container shouldn't block, only buttons
        this.container.appendChild(this.menusContainer);

        // Top left menus container
        this.menusContainerLeft = document.createElement('div');
        this.menusContainerLeft.style.position = 'absolute';
        this.menusContainerLeft.style.left = '20px';
        this.menusContainerLeft.style.top = '140px';
        this.menusContainerLeft.style.display = 'flex';
        this.menusContainerLeft.style.flexDirection = 'row';
        this.menusContainerLeft.style.gap = '15px';
        this.menusContainerLeft.style.pointerEvents = 'none';
        this.container.appendChild(this.menusContainerLeft);

        const createButton = (label, keyToSimulate, codeToSimulate = '', isMouse = false, mouseBtn = 0, size = 60, color = 'rgba(255,255,255,0.3)') => {
            const btn = document.createElement('button');
            btn.innerText = label;
            btn.style.width = `${size}px`;
            btn.style.height = `${size}px`;
            btn.style.borderRadius = '50%';
            btn.style.backgroundColor = color;
            btn.style.border = '2px solid rgba(255,255,255,0.5)';
            btn.style.color = 'white';
            btn.style.fontWeight = 'bold';
            btn.style.fontSize = '12px';
            btn.style.pointerEvents = this.isTouchDevice ? 'auto' : 'none';
            btn.style.userSelect = 'none';
            btn.style.touchAction = 'none'; // Prevent default touch actions like zoom

            // Touch handlers
            btn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                btn.style.backgroundColor = 'rgba(255,255,255,0.6)';
                if (isMouse) {
                    document.dispatchEvent(new MouseEvent('mousedown', { button: mouseBtn, bubbles: true, cancelable: true }));
                } else {
                    document.dispatchEvent(new KeyboardEvent('keydown', { key: keyToSimulate, code: codeToSimulate, bubbles: true, cancelable: true }));
                }
            });

            btn.addEventListener('touchend', (e) => {
                e.preventDefault();
                btn.style.backgroundColor = color;
                if (isMouse) {
                    document.dispatchEvent(new MouseEvent('mouseup', { button: mouseBtn, bubbles: true, cancelable: true }));
                } else {
                    document.dispatchEvent(new KeyboardEvent('keyup', { key: keyToSimulate, code: codeToSimulate, bubbles: true, cancelable: true }));
                }
            });

            return btn;
        };

        // Layout the buttons
        const topRow = document.createElement('div');
        topRow.style.display = 'flex';
        topRow.style.gap = '15px';
        topRow.style.marginRight = '30px';

        const bottomRow = document.createElement('div');
        bottomRow.style.display = 'flex';
        bottomRow.style.gap = '15px';

        const btnJump = createButton('Pulo', ' ', 'Space', false, 0, 45, 'rgba(100, 200, 255, 0.3)');

        const btnDefend = createButton('Def', '', '', true, 2, 50, 'rgba(255, 150, 50, 0.3)');
        const btnAttack = createButton('Atq', '', '', true, 0, 60, 'rgba(255, 50, 50, 0.3)');

        // Single button for Action and Sprint, defaults to Sprint
        this.btnActionSprint = createButton('Corr', 'Shift', 'ShiftLeft', false, 0, 45, 'rgba(200, 100, 255, 0.3)');

        topRow.appendChild(btnDefend);

        bottomRow.appendChild(this.btnActionSprint);
        bottomRow.appendChild(btnJump);
        bottomRow.appendChild(btnAttack);

        this.buttonsContainer.appendChild(topRow);
        this.buttonsContainer.appendChild(bottomRow);

        // Setup top menus buttons
        const btnInventory = createButton('Inv', 'i', 'KeyI', false, 0, 45, 'rgba(255, 255, 255, 0.2)');
        btnInventory.id = 'btn-mobile-inventory';
        const btnJournal = createButton('Diário', 'j', 'KeyJ', false, 0, 45, 'rgba(255, 255, 255, 0.2)');
        btnJournal.id = 'btn-mobile-journal';

        this.menusContainerLeft.appendChild(btnJournal);
        this.menusContainer.appendChild(btnInventory);
    }

    setupTouchEvents() {
        let touchId = null;
        let startX = 0;
        let startY = 0;
        const maxRadius = 40;

        this.leftZone.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (touchId !== null) return; // Already tracking a touch

            const touch = e.changedTouches[0];
            touchId = touch.identifier;
            startX = touch.clientX;
            startY = touch.clientY;

            this.joystickBase.style.left = `${startX}px`;
            this.joystickBase.style.top = `${startY}px`;
            this.joystickBase.style.display = 'block';

            this.joystickStick.style.left = `${startX}px`;
            this.joystickStick.style.top = `${startY}px`;
            this.joystickStick.style.display = 'block';

            this.joystickData.active = true;
            this.updateJoystick(startX, startY);
        });

        this.leftZone.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (touchId === null) return;

            for (let i = 0; i < e.changedTouches.length; i++) {
                if (e.changedTouches[i].identifier === touchId) {
                    this.updateJoystick(e.changedTouches[i].clientX, e.changedTouches[i].clientY);
                    break;
                }
            }
        });

        const handleTouchEnd = (e) => {
            e.preventDefault();
            if (touchId === null) return;

            for (let i = 0; i < e.changedTouches.length; i++) {
                if (e.changedTouches[i].identifier === touchId) {
                    touchId = null;
                    this.joystickBase.style.display = 'none';
                    this.joystickStick.style.display = 'none';
                    this.joystickData.x = 0;
                    this.joystickData.y = 0;
                    this.joystickData.active = false;
                    break;
                }
            }
        };

        this.leftZone.addEventListener('touchend', handleTouchEnd);
        this.leftZone.addEventListener('touchcancel', handleTouchEnd);
    }

    updateJoystick(clientX, clientY) {
        const dx = clientX - parseFloat(this.joystickBase.style.left);
        const dy = clientY - parseFloat(this.joystickBase.style.top);
        const distance = Math.sqrt(dx * dx + dy * dy);
        const maxRadius = 40;

        let clampedX = dx;
        let clampedY = dy;

        if (distance > maxRadius) {
            clampedX = (dx / distance) * maxRadius;
            clampedY = (dy / distance) * maxRadius;
        }

        const stickX = parseFloat(this.joystickBase.style.left) + clampedX;
        const stickY = parseFloat(this.joystickBase.style.top) + clampedY;

        this.joystickStick.style.left = `${stickX}px`;
        this.joystickStick.style.top = `${stickY}px`;

        this.joystickData.x = clampedX / maxRadius;
        this.joystickData.y = clampedY / maxRadius;
    }

    show() {
        if (this.isTouchDevice && this.container) {
            this.container.style.display = 'block';
        }
    }

    hide() {
        if (this.container) {
            this.container.style.display = 'none';
            // Reset joystick state
            this.joystickData.x = 0;
            this.joystickData.y = 0;
            this.joystickData.active = false;
            if (this.joystickBase) this.joystickBase.style.display = 'none';
            if (this.joystickStick) this.joystickStick.style.display = 'none';
        }
    }

    updateActionState(hasInteraction) {
        if (!this.btnActionSprint) return;

        if (hasInteraction) {
            this.btnActionSprint.innerText = 'Ação';
            this.btnActionSprint.style.backgroundColor = 'rgba(100, 255, 100, 0.3)';

            // Remove previous listeners and swap to E
            const newBtn = this.btnActionSprint.cloneNode(true);
            this.btnActionSprint.parentNode.replaceChild(newBtn, this.btnActionSprint);
            this.btnActionSprint = newBtn;

            this.btnActionSprint.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.btnActionSprint.style.backgroundColor = 'rgba(255,255,255,0.6)';
                document.dispatchEvent(new KeyboardEvent('keydown', { key: 'e', code: 'KeyE', bubbles: true, cancelable: true }));
            });

            this.btnActionSprint.addEventListener('touchend', (e) => {
                e.preventDefault();
                this.btnActionSprint.style.backgroundColor = 'rgba(100, 255, 100, 0.3)';
                document.dispatchEvent(new KeyboardEvent('keyup', { key: 'e', code: 'KeyE', bubbles: true, cancelable: true }));
            });

        } else {
            this.btnActionSprint.innerText = 'Corr';
            this.btnActionSprint.style.backgroundColor = 'rgba(200, 100, 255, 0.3)';

            // Revert to Shift
            const newBtn = this.btnActionSprint.cloneNode(true);
            this.btnActionSprint.parentNode.replaceChild(newBtn, this.btnActionSprint);
            this.btnActionSprint = newBtn;

            this.btnActionSprint.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.btnActionSprint.style.backgroundColor = 'rgba(255,255,255,0.6)';
                document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Shift', code: 'ShiftLeft', bubbles: true, cancelable: true }));
            });

            this.btnActionSprint.addEventListener('touchend', (e) => {
                e.preventDefault();
                this.btnActionSprint.style.backgroundColor = 'rgba(200, 100, 255, 0.3)';
                document.dispatchEvent(new KeyboardEvent('keyup', { key: 'Shift', code: 'ShiftLeft', bubbles: true, cancelable: true }));
            });
        }
    }
}
