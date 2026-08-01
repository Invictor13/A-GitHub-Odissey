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
        this.container = document.createElement('div');
        this.container.id = 'mobile-controls-container';
        this.container.style.position = 'fixed';
        this.container.style.inset = '0';
        this.container.style.zIndex = '40'; // Below modals, above game canvas
        this.container.style.pointerEvents = 'none'; // Only interactive elements will have pointer-events
        this.container.style.display = 'none'; // Hidden by default, shown by game state manager
        document.body.appendChild(this.container);

        // Left half for joystick detection
        this.leftZone = document.createElement('div');
        this.leftZone.style.position = 'absolute';
        this.leftZone.style.left = '0';
        this.leftZone.style.top = '0';
        this.leftZone.style.width = '40%';
        this.leftZone.style.height = '100%';
        this.leftZone.style.pointerEvents = 'auto';
        this.leftZone.style.touchAction = 'none'; // Prevent scrolling
        this.container.appendChild(this.leftZone);

        // Center zone for camera rotation (handled by OrbitControls naturally if we leave it alone, but we need to ensure it's touchable)
        // OrbitControls already binds to the canvas, so we don't need a specific zone as long as we don't block it.
        // We will make sure the center has pointerEvents: 'none' so touches go through to the canvas.

        // Joystick Visuals
        this.joystickBase = document.createElement('div');
        this.joystickBase.style.position = 'absolute';
        this.joystickBase.style.width = '100px';
        this.joystickBase.style.height = '100px';
        this.joystickBase.style.borderRadius = '50%';
        this.joystickBase.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
        this.joystickBase.style.border = '2px solid rgba(255, 255, 255, 0.4)';
        this.joystickBase.style.display = 'none';
        this.joystickBase.style.transform = 'translate(-50%, -50%)';
        this.joystickBase.style.pointerEvents = 'none';
        this.container.appendChild(this.joystickBase);

        this.joystickStick = document.createElement('div');
        this.joystickStick.style.position = 'absolute';
        this.joystickStick.style.width = '50px';
        this.joystickStick.style.height = '50px';
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
        this.buttonsContainer.style.gap = '15px';
        this.buttonsContainer.style.pointerEvents = 'none'; // Container shouldn't block, only buttons
        this.container.appendChild(this.buttonsContainer);

        const createButton = (label, keyToSimulate, isMouse = false, mouseBtn = 0, size = 60, color = 'rgba(255,255,255,0.3)') => {
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
            btn.style.pointerEvents = 'auto';
            btn.style.userSelect = 'none';
            btn.style.touchAction = 'none'; // Prevent default touch actions like zoom

            // Touch handlers
            btn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                btn.style.backgroundColor = 'rgba(255,255,255,0.6)';
                if (isMouse) {
                    document.dispatchEvent(new MouseEvent('mousedown', { button: mouseBtn }));
                } else {
                    document.dispatchEvent(new KeyboardEvent('keydown', { key: keyToSimulate }));
                }
            });

            btn.addEventListener('touchend', (e) => {
                e.preventDefault();
                btn.style.backgroundColor = color;
                if (isMouse) {
                    document.dispatchEvent(new MouseEvent('mouseup', { button: mouseBtn }));
                } else {
                    document.dispatchEvent(new KeyboardEvent('keyup', { key: keyToSimulate }));
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

        const btnJump = createButton('Pulo', 'Space', false, 0, 50, 'rgba(100, 200, 255, 0.3)');
        const btnInteract = createButton('Ação', 'e', false, 0, 50, 'rgba(100, 255, 100, 0.3)');

        const btnDefend = createButton('Def', '', true, 2, 60, 'rgba(255, 150, 50, 0.3)');
        const btnAttack = createButton('Atq', '', true, 0, 70, 'rgba(255, 50, 50, 0.3)');
        const btnSprint = createButton('Corr', 'Shift', false, 0, 50, 'rgba(200, 100, 255, 0.3)');

        topRow.appendChild(btnInteract);
        topRow.appendChild(btnDefend);

        bottomRow.appendChild(btnSprint);
        bottomRow.appendChild(btnJump);
        bottomRow.appendChild(btnAttack);

        this.buttonsContainer.appendChild(topRow);
        this.buttonsContainer.appendChild(bottomRow);
    }

    setupTouchEvents() {
        let touchId = null;
        let startX = 0;
        let startY = 0;
        const maxRadius = 50;

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
        const maxRadius = 50;

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
}
