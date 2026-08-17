const fs = require('fs');

let content = fs.readFileSync('src/world_builder/HubEnvironment.js', 'utf8');

// The cleanup method was likely deleted by the regex that removed the building functions because it came before updateDayNightLighting.
// We need to re-add it.

content = content.replace(/updateDayNightLighting\(delta\) \{/, `cleanup() {
        const disposeGroup = (group) => {
            if (!group) return;
            import('../core/GraphicsUtils.js').then(({ disposeHierarchy }) => {
                disposeHierarchy(group);
                this.scene.remove(group);
            });
        };

        disposeGroup(this.hubGroup);
        disposeGroup(this.skyGroup);
        if(this.weatherParticleGroup) disposeGroup(this.weatherParticleGroup);

        if (this.erosSpot) {
            import('../core/GraphicsUtils.js').then(({ disposeHierarchy }) => {
                disposeHierarchy(this.erosSpot);
                this.scene.remove(this.erosSpot);
                if(this.erosSpot.target) {
                    disposeHierarchy(this.erosSpot.target);
                    this.scene.remove(this.erosSpot.target);
                }
                this.erosSpot.dispose();
            });
        }

        this.interactiveObjects = [];
    }

    updateDayNightLighting(delta) {`);

fs.writeFileSync('src/world_builder/HubEnvironment.js', content);
