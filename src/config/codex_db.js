export const CODEX_DATABASE = {
    bestiary: [
        {
            id: 'bestiary_goblin_saqueador',
            name: 'Goblin Saqueador',
            category: 'bestiary',
            discovered: false,
            masteryLevel: 0,
            description: 'Uma criatura fraca, mas perigosa em grupo.',
            stats: { hp: 50, damage: 10 }
        }
    ],
    grimoire: [
        {
            id: 'grimoire_fireball',
            name: 'Bola de Fogo',
            category: 'grimoire',
            discovered: false,
            masteryLevel: 0,
            description: 'Lança uma esfera de fogo causando dano em área.',
            stats: { manaCost: 20, damage: 40 }
        }
    ],
    inventory_items: [
        {
            id: 'item_health_potion',
            name: 'Poção de Vida',
            category: 'inventory_items',
            discovered: false,
            masteryLevel: 0,
            description: 'Restaura a saúde do Penitente.',
            stats: { healAmount: 50 }
        }
    ],
    sanctuary: [
        {
            id: 'sanctuary_altar_of_blood',
            name: 'Altar de Sangue',
            category: 'sanctuary',
            discovered: false,
            masteryLevel: 0,
            description: 'Um lugar de descanso corrompido.',
            stats: { restBonus: 10 }
        }
    ],
    penitente: [
        {
            id: 'penitente_the_exiled',
            name: 'O Exilado',
            category: 'penitente',
            discovered: false,
            masteryLevel: 0,
            description: 'Aquele que carrega o peso do Purgatório.',
            stats: { baseHp: 100, baseStamina: 100 }
        }
    ]
};
