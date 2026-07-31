const STORAGE_KEY = 'A_GITHUB_ODYSSEY_SAVE';

const TOTAL_BACKPACK_SLOTS = 20;

class GameState {
    constructor() {
        this.resetToDefaults();
    }

    resetToDefaults() {
        this.resources = { gold: 0, wood: 50, ore: 30, straw: 20 };
        this.vitals = { hp: 100, maxHp: 100, food: 100, water: 100 };

        this.backpackState = new Array(TOTAL_BACKPACK_SLOTS).fill(null);
        // Default items based on the prompt instructions
        this.backpackState[0] = { itemId: "wood_ancient", count: 12 };
        this.backpackState[1] = { itemId: "ore_purgatory", count: 8 };
        this.backpackState[2] = { itemId: "herb_astral", count: 15 };
        this.backpackState[3] = { itemId: "elixir_celestial", count: 3 };
        this.backpackState[4] = { itemId: "ration_purgatory", count: 4 };
        this.backpackState[5] = { itemId: "penitent_sword", count: 1 };
        this.backpackState[6] = { itemId: "hood_sinner", count: 1 };

        this.equipmentState = {
            head: null,
            chest: null,
            right_hand: null,
            left_hand: null,
            feet: null,
            accessory: null
        };

        this.masteries = {
            combat: { level: 1, xp: 0 },
            lumberjack: { level: 1, xp: 0 },
            mining: { level: 1, xp: 0 },
            alchemy: { level: 1, xp: 0 }
        };

        this.buildingsBuilt = {
            island: 0,
            forge: false,
            farm: false,
            animal: false
        };

        this.completedNodes = [];
        this.pendingUnlocks = null; // Track if we need to unlock adjacent islands upon returning to WorldMap
    }

    save() {
        const data = {
            resources: this.resources,
            vitals: this.vitals,
            backpackState: this.backpackState,
            equipmentState: this.equipmentState,
            masteries: this.masteries,
            buildingsBuilt: this.buildingsBuilt,
            completedNodes: this.completedNodes,
            pendingUnlocks: this.pendingUnlocks
        };
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
            console.log('Game state saved successfully.');
        } catch (error) {
            console.error('Failed to save game state to LocalStorage', error);
        }
    }

    load() {
        try {
            const rawData = localStorage.getItem(STORAGE_KEY);
            if (rawData) {
                const parsedData = JSON.parse(rawData);
                if (parsedData.resources) this.resources = parsedData.resources;
                if (parsedData.vitals) this.vitals = parsedData.vitals;
                if (parsedData.backpackState) this.backpackState = parsedData.backpackState;
                if (parsedData.equipmentState) this.equipmentState = parsedData.equipmentState;
                if (parsedData.masteries) this.masteries = parsedData.masteries;
                if (parsedData.buildingsBuilt) this.buildingsBuilt = parsedData.buildingsBuilt;
                if (parsedData.completedNodes) this.completedNodes = parsedData.completedNodes;
                if (parsedData.pendingUnlocks !== undefined) this.pendingUnlocks = parsedData.pendingUnlocks;
                console.log('Game state loaded successfully.');
                return true;
            }
        } catch (error) {
            console.error('Failed to load game state from LocalStorage', error);
        }
        return false;
    }
}

const gameState = new GameState();
export default gameState;
