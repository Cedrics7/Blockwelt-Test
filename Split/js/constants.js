// js/constants.js

// Block-Typen
export const BLOCK_TYPES = { AIR: 0, GRASS: 1, DIRT: 2, STONE: 3, LAVA: 4, SAND: 5, COAL_ORE: 6, IRON_ORE: 7, GOLD_ORE: 8, TITANIUM_ORE: 9, WOOD: 10, LEAVES: 11 };

// Erz-Generierung
export const ORE_PARAMETERS = [
    { blockType: BLOCK_TYPES.COAL_ORE, minY: -180, maxY: 80, scarcity: 0.015, clusterSize: 8 },
    { blockType: BLOCK_TYPES.IRON_ORE, minY: -150, maxY: 40, scarcity: 0.01, clusterSize: 6 },
    { blockType: BLOCK_TYPES.GOLD_ORE, minY: -200, maxY: 10, scarcity: 0.005, clusterSize: 4 },
    { blockType: BLOCK_TYPES.TITANIUM_ORE, minY: -200, maxY: -50, scarcity: 0.003, clusterSize: 3 },
];

// Welt-Dimensionen
export const WORLD_SIZE_X = 512;
export const WORLD_SIZE_Z = 512;
export const WORLD_SIZE_Y = 301;
export const WORLD_MIN_Y = -200;
export const CHUNK_SIZE = 16;

// Spieler-Einstellungen
export const PLAYER_REACH = 5;
export const VOID_DEATH_Y = -250;

// Inventar
export const INVENTORY_SIZE = 36;
export const MAX_STACK_SIZE = 99;

// Grafik (HIER IST DIE WICHTIGE ZEILE!)
// Stelle sicher, dass "export const TEXTURE_SIZES" korrekt geschrieben ist.
export const TEXTURE_SIZES = { low: 16, medium: 32, high: 64, 'very-high': 128, 'ultra': 256 };