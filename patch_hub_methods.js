const fs = require('fs');

let content = fs.readFileSync('src/world_builder/HubEnvironment.js', 'utf8');

// The reviewer noticed missing methods. Let's add them back right before updateDayNightLighting

const missingMethods = `
    formatGameTime(hours) {
        const h = Math.floor(hours);
        const m = Math.floor((hours % 1) * 60);
        return \`\${h.toString().padStart(2, '0')}:\${m.toString().padStart(2, '0')}\`;
    }

    updateTimeAndWeatherHUD() {
        if (!gameState.hubState) return;
        const timeStr = this.formatGameTime(gameState.hubState.gameTimeHours);
        const locationSubtitle = document.getElementById('location-subtitle');
        const weatherBadgeIcon = document.getElementById('weather-badge-icon');
        const weatherBadgeText = document.getElementById('weather-badge-text');

        if(locationSubtitle) {
            const WEATHER_TYPES = {
                SUNNY: { name: 'Ensolarado', icon: 'fa-sun', color: '#facc15' },
                LIGHT_RAIN: { name: 'Chuva Leve', icon: 'fa-cloud-rain', color: '#38bdf8' },
                STORM: { name: 'Tempestade', icon: 'fa-bolt', color: '#a855f7' },
                WINDY: { name: 'Ventania', icon: 'fa-wind', color: '#94a3b8' },
                SNOW: { name: 'Neve', icon: 'fa-snowflake', color: '#e2e8f0' }
            };
            const wType = WEATHER_TYPES[gameState.hubState.currentWeatherKey] || WEATHER_TYPES.SUNNY;
            locationSubtitle.textContent = \`Dia \${gameState.hubState.dayCount} • \${timeStr} • \${wType.name}\`;

            if(weatherBadgeIcon) {
                weatherBadgeIcon.className = \`fa-solid \${wType.icon}\`;
                weatherBadgeIcon.style.color = wType.color;
            }
            if(weatherBadgeText) {
                weatherBadgeText.textContent = wType.name;
            }
        }
    }

    triggerErosBark(text) {
        const diagBox = document.getElementById('dialogue-box');
        const erosText = document.getElementById('eros-text');
        if(!diagBox || !erosText) return;

        erosText.innerText = \`"\${text}"\`;
        diagBox.style.opacity = '1';

        if (this.eros) this.eros.bark();

        clearTimeout(this.barkTimeout);
        this.barkTimeout = setTimeout(() => { diagBox.style.opacity = '0'; }, 4000);
    }
`;

content = content.replace(/cleanup\(\) \{/, missingMethods + '\n    cleanup() {');

fs.writeFileSync('src/world_builder/HubEnvironment.js', content);
