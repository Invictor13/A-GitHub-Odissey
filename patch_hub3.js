const fs = require('fs');
let content = fs.readFileSync('src/world_builder/HubEnvironment.js', 'utf8');

content = content.replace(/restoreState\(\) \{[\s\S]*?updateTimeAndWeatherHUD\(\)/, `updateTimeAndWeatherHUD()`);

// Let's also remove restoreState from being called
content = content.replace(/this\.restoreState\(\);/, '');

// Format Time might have been removed too, let's put it back if needed
if (!content.includes('formatGameTime')) {
    content = content.replace(/updateTimeAndWeatherHUD\(\) \{/, `formatGameTime(hours) {
        const h = Math.floor(hours);
        const m = Math.floor((hours % 1) * 60);
        return \`\${h.toString().padStart(2, '0')}:\${m.toString().padStart(2, '0')}\`;
    }

    updateTimeAndWeatherHUD() {`);
}

// Remove enterTent, exitTent, sleepInTent, handleJournalInteraction, triggerErosBark, isFloorType, bindEvents, cleanup
// We will just keep the minimal methods left at the end (mostly cleanup and update). Wait, cleanup needs to be there to dispose properly.
content = content.replace(/enterTent\(\) \{[\s\S]*?cleanup\(\) \{/, `cleanup() {`);
// Oh wait, triggerErosBark might be used, let's check.

fs.writeFileSync('src/world_builder/HubEnvironment.js', content);
