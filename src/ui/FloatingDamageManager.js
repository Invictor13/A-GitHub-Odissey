import * as THREE from 'three';

export class FloatingDamageManager {
    constructor() {
        this.floatingTexts = [];
        this.pool = [];
        this.container = document.createElement('div');
        this.container.id = 'floating-damage-container';
        this.container.style.position = 'absolute';
        this.container.style.top = '0';
        this.container.style.left = '0';
        this.container.style.width = '100%';
        this.container.style.height = '100%';
        this.container.style.pointerEvents = 'none';
        this.container.style.overflow = 'hidden';
        this.container.style.zIndex = '1000';
        document.body.appendChild(this.container);
    }

    createFloatingText(text, pos3d, color = '#ffffff') {
        let el;
        if (this.pool.length > 0) {
            el = this.pool.pop();
        } else {
            el = document.createElement('div');
            el.style.position = 'absolute';
            el.style.fontWeight = 'bold';
            el.style.fontSize = '24px';
            el.style.textShadow = '2px 2px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000';
            el.style.fontFamily = 'monospace';
            el.style.pointerEvents = 'none';
            el.style.transition = 'opacity 0.2s';
            this.container.appendChild(el);
        }

        el.innerText = text;
        el.style.color = color;
        el.style.opacity = '1';
        el.style.transform = 'translate(-50%, -50%) scale(1)';

        const lifeTime = 1.0;

        // Add random jitter to world pos so multiple hits don't overlap exactly
        const jitterX = (Math.random() - 0.5) * 0.5;
        const jitterY = (Math.random() - 0.5) * 0.5 + 1.0; // Start slightly higher
        const jitterZ = (Math.random() - 0.5) * 0.5;

        this.floatingTexts.push({
            el: el,
            pos3d: new THREE.Vector3(pos3d.x + jitterX, pos3d.y + jitterY, pos3d.z + jitterZ),
            lifeTime: lifeTime,
            maxLifeTime: lifeTime,
            velY: 2.0 // units per second upwards
        });
    }

    update(delta, camera, windowWidth, windowHeight) {
        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
            const ft = this.floatingTexts[i];
            ft.lifeTime -= delta;

            if (ft.lifeTime <= 0) {
                ft.el.style.opacity = '0';
                this.pool.push(ft.el);
                this.floatingTexts.splice(i, 1);
                continue;
            }

            // Move up in world space
            ft.pos3d.y += ft.velY * delta;

            // Project to screen space
            const vec = ft.pos3d.clone();
            vec.project(camera);

            if (vec.z > 1.0) {
                // Behind camera
                ft.el.style.display = 'none';
            } else {
                ft.el.style.display = 'block';
                const x = (vec.x *  .5 + .5) * windowWidth;
                const y = (vec.y * -.5 + .5) * windowHeight;

                // Add a tiny bit of scale animation
                const progress = 1.0 - (ft.lifeTime / ft.maxLifeTime);
                const scale = 1.0 + Math.sin(progress * Math.PI) * 0.5;

                ft.el.style.left = `${x}px`;
                ft.el.style.top = `${y}px`;
                ft.el.style.transform = `translate(-50%, -50%) scale(${scale})`;

                if (ft.lifeTime < 0.2) {
                    ft.el.style.opacity = (ft.lifeTime / 0.2).toString();
                }
            }
        }
    }
}
