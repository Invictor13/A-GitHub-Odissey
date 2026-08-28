export class HubBounds {
    constructor() {
        this.isRespawning = false;
    }

    checkPlayerFall(player, respawnCoords = {x: 0, y: 1, z: 0}, onRespawnCallback = null) {
        if (!player || !player.group) return;

        if (player.group.position.y < -15 && !this.isRespawning) {
            this.isRespawning = true;
            this.triggerFadeOutRespawn(player, respawnCoords, onRespawnCallback);
        }
    }

    triggerFadeOutRespawn(player, respawnCoords, onRespawnCallback) {
        // Create fade overlay
        const overlay = document.createElement('div');
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100vw';
        overlay.style.height = '100vh';
        overlay.style.backgroundColor = 'black';
        overlay.style.opacity = '0';
        overlay.style.transition = 'opacity 0.5s ease-in-out';
        overlay.style.zIndex = '9999';
        overlay.style.pointerEvents = 'none';
        document.body.appendChild(overlay);

        // Start fade to black
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                overlay.style.opacity = '1';
            });
        });

        // After fade to black completes, reset position and fade back in
        setTimeout(() => {
            player.group.position.set(respawnCoords.x, respawnCoords.y, respawnCoords.z);
            player.velocityY = 0; // Stop falling

            if (onRespawnCallback && typeof onRespawnCallback === 'function') {
                onRespawnCallback();
            }

            overlay.style.opacity = '0';

            // Remove overlay after fading back in
            setTimeout(() => {
                if (document.body.contains(overlay)) {
                    document.body.removeChild(overlay);
                }
                this.isRespawning = false;
            }, 500);
        }, 500);
    }
}
