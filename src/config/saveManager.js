const SAVE_KEY = 'GHO_SaveData';

export const DEFAULT_SAVE_DATA = {
    permanente: {
        recursos_hub: { ouro: 0, madeira: 0, minerio: 0 },
        ilhas_desbloqueadas: { ferreiro: false, lenhador: false, fazenda: false, mago: false, dojo: false }
    },
    run_atual: {
        status: { hp: 100, stamina: 100, mana: 100 },
        maestrias: {
            soco: 1,
            espada: 1,
            machado: 1,
            mineracao: 1,
            lenhador: 1,
            pesca: 1,
            aptidao_magica: 1,
            reserva_mana: 1,
            reserva_hp: 1,
            reserva_stamina: 1
        }
    }
};

/**
 * Saves the given game data to localStorage.
 * Overwrites the existing save.
 * @param {Object} data - The complete game state object to save ({ permanente, run_atual }).
 */
export function saveGame(data) {
    try {
        const json = JSON.stringify(data);
        localStorage.setItem(SAVE_KEY, json);
    } catch (e) {
        console.error('Error saving game data to localStorage', e);
    }
}

/**
 * Loads the game data from localStorage.
 * If no data is found or an error occurs, it returns the DEFAULT_SAVE_DATA.
 * @returns {Object} The saved game state or default state.
 */
export function loadGame() {
    try {
        const json = localStorage.getItem(SAVE_KEY);
        if (json) {
            return JSON.parse(json);
        }
    } catch (e) {
        console.error('Error loading game data from localStorage', e);
    }
    return structuredClone(DEFAULT_SAVE_DATA);
}

/**
 * Resets the ephemeral data (run_atual) to default values,
 * keeping the permanent data intact, and saves the updated state.
 */
export function resetRun() {
    const currentState = loadGame();

    // Reset only the current run branch using a deep copy of the default
    currentState.run_atual = structuredClone(DEFAULT_SAVE_DATA.run_atual);

    saveGame(currentState);
}
