import { CODEX_DATABASE } from '../config/codex_db.js';

class CodexManager {
    constructor() {
        this.storageKey = 'gho_codex_data';
        this.db = this.cloneDatabase(CODEX_DATABASE);
    }

    cloneDatabase(db) {
        return JSON.parse(JSON.stringify(db));
    }

    init() {
        const savedDataStr = localStorage.getItem(this.storageKey);
        if (savedDataStr) {
            try {
                const savedData = JSON.parse(savedDataStr);
                this.mergeData(savedData);
            } catch (e) {
                console.error('Error parsing codex data from localStorage', e);
            }
        }
    }

    mergeData(savedData) {
        for (const category in this.db) {
            if (savedData[category]) {
                const defaultEntities = this.db[category];
                const savedEntities = savedData[category];

                // Map saved entities by ID for quick lookup
                const savedMap = {};
                for (const entity of savedEntities) {
                    savedMap[entity.id] = entity;
                }

                // Update default entities with saved state
                for (const entity of defaultEntities) {
                    if (savedMap[entity.id]) {
                        entity.discovered = savedMap[entity.id].discovered;
                        entity.masteryLevel = savedMap[entity.id].masteryLevel;
                    }
                }
            }
        }
    }

    _findEntry(id) {
        for (const category in this.db) {
            const entities = this.db[category];
            for (const entity of entities) {
                if (entity.id === id) {
                    return entity;
                }
            }
        }
        return null;
    }

    unlockEntry(id) {
        const entry = this._findEntry(id);
        if (entry) {
            if (!entry.discovered) {
                entry.discovered = true;
                this.save();
                return true;
            }
        } else {
            console.warn(`CodexManager: Entry with ID ${id} not found.`);
        }
        return false;
    }

    updateMastery(id, amount) {
        const entry = this._findEntry(id);
        if (entry) {
            if (entry.masteryLevel < 100) {
                entry.masteryLevel = Math.min(100, entry.masteryLevel + amount);
                this.save();

                if (entry.masteryLevel === 100) {
                    console.log(`CodexManager: Mastery for ${id} reached 100!`);
                    // Here we can dispatch an event or handle unlocking bonuses
                }
                return true;
            }
        } else {
            console.warn(`CodexManager: Entry with ID ${id} not found.`);
        }
        return false;
    }

    save() {
        try {
            // We only need to save discovered and masteryLevel to save space,
            // but for simplicity and robust state restoring, we save the current db.
            // A more optimized approach would just save {id: {discovered: true, masteryLevel: X}}

            // To ensure we don't save everything and only state:
            const stateToSave = {};
            for (const category in this.db) {
                stateToSave[category] = this.db[category].map(entry => ({
                    id: entry.id,
                    discovered: entry.discovered,
                    masteryLevel: entry.masteryLevel
                }));
            }

            localStorage.setItem(this.storageKey, JSON.stringify(stateToSave));
        } catch (e) {
            console.error('Error saving codex data to localStorage', e);
        }
    }

    reset() {
        this.db = this.cloneDatabase(CODEX_DATABASE);
        localStorage.removeItem(this.storageKey);
    }

    getDatabase() {
        return this.db;
    }
}

export const codexManager = new CodexManager();
