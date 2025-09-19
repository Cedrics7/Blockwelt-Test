// Korrigierte Import-Reihenfolge
import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { ItemEntity } from './entities/ItemEntity.js';
import * as CONSTANTS from './constants.js';
import { SettingsManager } from './managers/SettingsManager.js';
import { DBManager } from './managers/DBManager.js';
import { World } from './world/World.js';
import { Player } from './entities/Player.js';
import { ChunkManager } from './managers/ChunkManager.js';
import { EntityManager } from './managers/EntityManager.js';
import { generateAssets } from './utils/AssetGenerator.js';
import { showUI, hideUI, setupGameUI, updateFullUI } from './ui.js';

// --- Globale Variablen für den Spielzustand ---
let scene, camera, renderer, controls, world, player, chunkManager, entityManager, assets;
let gameRunning = false, isPaused = false, isInventoryOpen = false, isPlayerDead = false;
let gameLoopId;
const clock = new THREE.Clock();
const keys = {};

// --- Zustand für Drag & Drop ---
let draggedItemStack = null;

// --- Manager Instanzen ---
const settingsManager = new SettingsManager();
const dbManager = new DBManager();

// --- Warteschlangen für dynamische Welt-Events ---
const decayQueue = new Set();
const grassConversionQueue = new Map();
const saplingGrowthQueue = new Map();
let isProcessingDecay = false;

// --- DOM-Elemente holen ---
const mainMenu = document.getElementById('main-menu');
const settingsMenu = document.getElementById('settings-menu');
const pauseMenu = document.getElementById('pause-menu');
const loadingOverlay = document.getElementById('loading-overlay');
const loadingText = document.getElementById('loading-text');
const gameCanvas = document.getElementById('game-canvas');
const deathScreen = document.getElementById('death-screen');
const inventoryScreen = document.getElementById('inventory-screen');
const crosshair = document.getElementById('crosshair');
const healthBarContainer = document.getElementById('health-bar-container');
const raycaster = new THREE.Raycaster();


// --- Haupt-Spiellogik ---

async function initGame(isNew, loadedData) {
    hideUI(mainMenu);
    showUI(loadingOverlay);
    await new Promise(resolve => setTimeout(resolve, 50));

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB);
    renderer = new THREE.WebGLRenderer({ canvas: gameCanvas, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    controls = new PointerLockControls(camera, renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 50, 50);
    scene.add(ambientLight, directionalLight);

    world = new World();
    player = new Player(world);
    entityManager = new EntityManager(scene, world);

    if (isNew) {
        loadingText.textContent = 'Welt wird generiert...';
        await new Promise(resolve => setTimeout(() => {
            world.init();
            world.generate();
            const spawnX = CONSTANTS.WORLD_SIZE_X / 2;
            const spawnZ = CONSTANTS.WORLD_SIZE_Z / 2;
            player.pos.set(spawnX, world.getSurfaceY(spawnX, spawnZ), spawnZ);
            resolve();
        }, 50));
    } else {
        loadingText.textContent = 'Welt wird geladen...';
        world.init(loadedData.worldData);
        player.setState(loadedData.playerData);
    }

    loadingText.textContent = 'Assets werden erstellt...';
    await new Promise(resolve => setTimeout(() => {
        assets = generateAssets(settingsManager.settings, CONSTANTS, renderer);
        resolve();
    }, 50));

    chunkManager = new ChunkManager(scene, world);

    hideUI(loadingOverlay);
    showUI(gameCanvas);
    showUI(document.getElementById('hotbar'));
    showUI(crosshair);
    showUI(healthBarContainer);

    setupGameUI(CONSTANTS.INVENTORY_SIZE);
    updateFullUI(player, assets.textureDataURLs, CONSTANTS.BLOCK_TYPES);
    initializeInGameEventListeners();

    controls.lock();
    gameRunning = true;
    isPaused = false;
    isPlayerDead = false;
    animate();
}

function animate() {
    if (!gameRunning) return;
    gameLoopId = requestAnimationFrame(animate);
    const dt = clock.getDelta();

    if (!isPaused && !isPlayerDead) {
        player.update(dt, keys, camera);
        processDirtToGrassConversion(); // NEUER AUFRUF
        if (player.isDead) {
            handlePlayerDeath();
        } else {
            entityManager.entities.forEach((entity, index) => {
                if (entity instanceof ItemEntity) {
                    entity.update(dt, player, camera);
                } else {
                    entity.update(dt, player.pos);
                }

                if (entity.shouldBeRemoved) {
                    entity.remove();
                    entityManager.entities.splice(index, 1);
                    updateFullUI(player, assets.textureDataURLs, CONSTANTS.BLOCK_TYPES);
                } else if (!(entity instanceof ItemEntity)) {
                    const distance = entity.pos.distanceTo(player.pos);
                    if (distance > entityManager.spawnRadius + 40) {
                        entity.remove();
                        entityManager.entities.splice(index, 1);
                    }
                }
            });

            if (entityManager.entities.length < entityManager.maxEntities && Math.random() < 0.1) {
                entityManager.trySpawn(player.pos);
            }

            chunkManager.update(player.pos, assets.materials, assets.grassMaterials, settingsManager.settings);
            processGrassConversion();
            processSaplingGrowth();
            updateFullUI(player, assets.textureDataURLs, CONSTANTS.BLOCK_TYPES);
        }
    }
    if (renderer && scene && camera) {
        renderer.render(scene, camera);
    }
}

function handlePlayerDeath() {
    if (isPlayerDead) return;
    isPlayerDead = true;
    controls.unlock(); // Stellt sicher, dass die Maus frei ist
    deathScreen.textContent = "Du bist gestorben!";
    showUI(deathScreen);

    // Setzt den Spieler zurück und belebt ihn wieder
    setTimeout(() => {
        hideUI(deathScreen);
        const respawnX = CONSTANTS.WORLD_SIZE_X / 2;
        const respawnZ = CONSTANTS.WORLD_SIZE_Z / 2;
        const respawnY = world.getSurfaceY(respawnX, respawnZ);
        player.pos.set(respawnX + 0.5, respawnY, respawnZ + 0.5);
        player.respawn(); // Setzt Leben und Status zurück
        isPlayerDead = false; // WICHTIG: Status zurücksetzen
        // Entfernt den optionalen auto-lock, damit der Spieler im Menü bleiben kann
    }, 2000);
}

function quitToMainMenu() {
    gameRunning = false;
    isPaused = false;
    if (gameLoopId) cancelAnimationFrame(gameLoopId);
    if (controls) controls.unlock();
    if (scene) {
        while (scene.children.length > 0) {
            scene.remove(scene.children[0]);
        }
    }
    hideUI(gameCanvas);
    hideUI(document.getElementById('hotbar'));
    hideUI(crosshair);
    hideUI(pauseMenu);
    hideUI(inventoryScreen);
    hideUI(deathScreen);
    hideUI(healthBarContainer);
    showUI(mainMenu);
    dbManager.hasSaveGame().then(hasSave => {
        document.getElementById('load-world-btn').disabled = !hasSave;
    });
}

// --- Event Listener Initialisierung ---
function initializeInGameEventListeners() {
    // Globale Events
    const keydownHandler = (e) => {
        keys[e.code] = true;
        if (!gameRunning || isPlayerDead) return;
        if (e.code === 'Escape') {
            if (isInventoryOpen) {
                isInventoryOpen = false;
                hideUI(inventoryScreen);
                controls.lock();
            } else if (controls.isLocked) {
                controls.unlock();
            }
        }
        if (e.code === 'KeyI') {
            isInventoryOpen = !isInventoryOpen;
            if (isInventoryOpen) {
                controls.unlock();
                showUI(inventoryScreen);
            } else {
                hideUI(inventoryScreen);
                if (!isPaused) controls.lock();
            }
        }
        if (!isPaused && controls.isLocked && e.code.startsWith('Digit')) {
            const i = parseInt(e.code.slice(5)) - 1;
            if (i >= 0 && i < 9) {
                player.selectedHotbarSlot = i;
                updateFullUI(player, assets.textureDataURLs, CONSTANTS.BLOCK_TYPES);
            }
        }
    };
    const keyupHandler = (e) => { keys[e.code] = false; };
    const resizeHandler = () => {
        if (gameRunning && camera && renderer) {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        }
    };

    document.addEventListener('keydown', keydownHandler);
    document.addEventListener('keyup', keyupHandler);
    window.addEventListener('resize', resizeHandler);
    window.addEventListener('contextmenu', (e) => e.preventDefault());
    gameCanvas.addEventListener('click', () => { if (gameRunning && !isPlayerDead && !isPaused) { controls.lock(); } });
    controls.addEventListener('unlock', () => { if (gameRunning && !isInventoryOpen) { isPaused = true; showUI(pauseMenu); } });
    controls.addEventListener('lock', () => { if (gameRunning) { isPaused = false; hideUI(pauseMenu); } });

    // Inventar-Interaktion
    const draggedItemDiv = document.getElementById('dragged-item');
    const inventoryContainer = document.getElementById('inventory-screen');
    const mouseMoveHandler = (e) => {
        if (draggedItemStack) {
            draggedItemDiv.style.left = `${e.clientX}px`;
            draggedItemDiv.style.top = `${e.clientY}px`;
        }
    };
    const inventoryMouseDownHandler = (e) => {
        if (!isInventoryOpen || !player) return;
        const targetSlot = e.target.closest('.slot');
        if (targetSlot) {
            const slotIndex = parseInt(targetSlot.dataset.index);
            const itemInSlot = player.inventory[slotIndex];
            if (draggedItemStack) {
                player.inventory[draggedItemStack.originalIndex] = itemInSlot;
                player.inventory[slotIndex] = draggedItemStack.item;
                draggedItemStack = null;
                hideUI(draggedItemDiv);
            } else if (itemInSlot && itemInSlot.type !== CONSTANTS.BLOCK_TYPES.AIR) {
                draggedItemStack = { item: itemInSlot, originalIndex: slotIndex };
                player.inventory[slotIndex] = { type: CONSTANTS.BLOCK_TYPES.AIR, count: 0 };
                const draggedItemCount = draggedItemDiv.querySelector('.slot-count');
                draggedItemDiv.style.backgroundImage = `url(${assets.textureDataURLs[draggedItemStack.item.type]})`;
                draggedItemCount.textContent = draggedItemStack.item.count > 1 ? draggedItemStack.item.count : '';
                showUI(draggedItemDiv);
            }
        } else if (draggedItemStack) {
            draggedItemStack = null;
            hideUI(draggedItemDiv);
        }
        updateFullUI(player, assets.textureDataURLs, CONSTANTS.BLOCK_TYPES);
    };

    window.addEventListener('mousemove', mouseMoveHandler);
    inventoryContainer.addEventListener('mousedown', inventoryMouseDownHandler);

    // Block-Interaktion
    const blockInteractionHandler = (e) => {
        if (!gameRunning || !controls || !controls.isLocked) return;
        raycaster.setFromCamera({ x: 0, y: 0 }, camera);
        const iMeshes = chunkManager.getIntersectableMeshes();
        const intersects = raycaster.intersectObjects(iMeshes, false);
        if (intersects.length > 0) {
            const intersection = intersects[0];
            if (intersection.distance > CONSTANTS.PLAYER_REACH) return;
            const pos = new THREE.Vector3().copy(intersection.point);
            const normal = intersection.face.normal.clone();

            if (e.button === 0) { // Abbauen
                pos.sub(normal.multiplyScalar(0.5));
                const blockPos = { x: Math.floor(pos.x), y: Math.floor(pos.y), z: Math.floor(pos.z) };
                const blockType = world.getBlock(blockPos.x, blockPos.y, blockPos.z);
                if (blockType !== CONSTANTS.BLOCK_TYPES.AIR && blockType !== CONSTANTS.BLOCK_TYPES.LAVA) {
                    player.addItem(blockType, 1);
                    world.setBlock(blockPos.x, blockPos.y, blockPos.z, CONSTANTS.BLOCK_TYPES.AIR);
                    if (blockType === CONSTANTS.BLOCK_TYPES.LEAVES && Math.random() < 0.05) {
                        const dropPos = new THREE.Vector3(blockPos.x + 0.5, blockPos.y + 0.5, blockPos.z + 0.5);
                        // KORREKTUR: Greift auf die Textur aus dem `assets`-Objekt zu
                        entityManager.spawnItemEntity(dropPos, CONSTANTS.BLOCK_TYPES.SAPLING, assets.materials[CONSTANTS.BLOCK_TYPES.SAPLING].map);
                    }
                    if (blockType === CONSTANTS.BLOCK_TYPES.WOOD || blockType === CONSTANTS.BLOCK_TYPES.LEAVES) {
                        checkAdjacentLeaves(blockPos.x, blockPos.y, blockPos.z);
                    }
                    chunkManager.rebuildChunkAt(blockPos.x, blockPos.y, blockPos.z, assets.materials, assets.grassMaterials);
                    updateFullUI(player, assets.textureDataURLs, CONSTANTS.BLOCK_TYPES);
                }
            } else if (e.button === 2) { // Platzieren
                const item = player.inventory[player.selectedHotbarSlot];
                if (!item || item.type === CONSTANTS.BLOCK_TYPES.AIR || item.count <= 0) return;
                pos.add(normal.multiplyScalar(0.5));
                const newBlockPos = { x: Math.floor(pos.x), y: Math.floor(pos.y), z: Math.floor(pos.z) };
                const pBox = player.getBoundingBox();
                const nBBox = new THREE.Box3(new THREE.Vector3(newBlockPos.x, newBlockPos.y, newBlockPos.z), new THREE.Vector3(newBlockPos.x + 1, newBlockPos.y + 1, newBlockPos.z + 1));
                if (!pBox.intersectsBox(nBBox) && world.getBlock(newBlockPos.x, newBlockPos.y, newBlockPos.z) === CONSTANTS.BLOCK_TYPES.AIR) {
                    let blockPlaced = false;
                    if (item.type === CONSTANTS.BLOCK_TYPES.SAPLING) {
                        const groundBlock = world.getBlock(newBlockPos.x, newBlockPos.y - 1, newBlockPos.z);
                        if (groundBlock === CONSTANTS.BLOCK_TYPES.GRASS || groundBlock === CONSTANTS.BLOCK_TYPES.DIRT) {
                            world.setBlock(newBlockPos.x, newBlockPos.y, newBlockPos.z, item.type);
                            saplingGrowthQueue.set(`${newBlockPos.x},${newBlockPos.y},${newBlockPos.z}`, Date.now());
                            blockPlaced = true;
                        }
                    } else {
                        world.setBlock(newBlockPos.x, newBlockPos.y, newBlockPos.z, item.type);
                        blockPlaced = true;
                    }
                    if (blockPlaced) {
                        const blockBelowPos = { x: newBlockPos.x, y: newBlockPos.y - 1, z: newBlockPos.z };
                        if (world.getBlock(blockBelowPos.x, blockBelowPos.y, blockBelowPos.z) === CONSTANTS.BLOCK_TYPES.GRASS) {
                            grassConversionQueue.set(`${blockBelowPos.x},${blockBelowPos.y},${blockBelowPos.z}`, Date.now());
                        }
                        player.removeItem(player.selectedHotbarSlot, 1);
                        chunkManager.rebuildChunkAt(newBlockPos.x, newBlockPos.y, newBlockPos.z, assets.materials, assets.grassMaterials);
                        updateFullUI(player, assets.textureDataURLs, CONSTANTS.BLOCK_TYPES);
                    }
                }
            }
        }
    };
    window.addEventListener('mousedown', blockInteractionHandler);
}

// --- Welt-Prozesse ---
function processGrassConversion() {
    if (grassConversionQueue.size === 0) return;
    const conversionTime = 10000;
    const now = Date.now();
    for (const [key, startTime] of grassConversionQueue.entries()) {
        if (now - startTime > conversionTime) {
            const [x, y, z] = key.split(',').map(Number);
            const blockAbove = world.getBlock(x, y + 1, z);
            const currentBlock = world.getBlock(x, y, z);
            if (blockAbove !== CONSTANTS.BLOCK_TYPES.AIR && currentBlock === CONSTANTS.BLOCK_TYPES.GRASS) {
                world.setBlock(x, y, z, CONSTANTS.BLOCK_TYPES.DIRT);
                chunkManager.rebuildChunkAt(x, y, z, assets.materials, assets.grassMaterials);
            }
            grassConversionQueue.delete(key);
        }
    }
}

// In Split/js/main.js

// In Split/js/main.js

// In Split/js/main.js

// In Split/js/main.js

function processSaplingGrowth() {
    if (saplingGrowthQueue.size === 0) return;

    const growthTime = 30000; // 30 Sekunden
    const now = Date.now();

    for (const [key, startTime] of saplingGrowthQueue.entries()) {
        if (now - startTime > growthTime) {
            const [x, y, z] = key.split(',').map(Number);
            const playerBoundingBox = player.getBoundingBox();
            const saplingBox = new THREE.Box3(
                new THREE.Vector3(x, y, z),
                new THREE.Vector3(x + 1, y + 1.5, z + 1)
            );

            if (world.getBlock(x, y, z) === CONSTANTS.BLOCK_TYPES.SAPLING) {
                if (!playerBoundingBox.intersectsBox(saplingBox)) {
                    world.generateTree(x, y, z);

                    // KORREKTUR: Alle Chunks im Umkreis des Baumes neu laden
                    for (let dx = -2; dx <= 2; dx++) {
                        for (let dz = -2; dz <= 2; dz++) {
                            for (let dy = 0; dy <= 6; dy++) {
                                chunkManager.rebuildChunkAt(x + dx, y + dy, z + dz, assets.materials, assets.grassMaterials);
                            }
                        }
                    }
                    saplingGrowthQueue.delete(key);
                } else {
                    saplingGrowthQueue.set(key, now);
                }
            } else {
                saplingGrowthQueue.delete(key);
            }
        }
    }
}

function checkAdjacentLeaves(x, y, z) {
    for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
            for (let dz = -1; dz <= 1; dz++) {
                if (dx === 0 && dy === 0 && dz === 0) continue;
                if (world.getBlock(x + dx, y + dy, z + dz) === CONSTANTS.BLOCK_TYPES.LEAVES) {
                    decayQueue.add(`${x + dx},${y + dy},${z + dz}`);
                }
            }
        }
    }
    if (!isProcessingDecay) {
        processDecayQueue();
    }
}

async function processDecayQueue() {
    if (decayQueue.size === 0) {
        isProcessingDecay = false;
        return;
    }
    isProcessingDecay = true;
    const blockKey = decayQueue.values().next().value;
    decayQueue.delete(blockKey);
    const [x, y, z] = blockKey.split(',').map(Number);

    if (world.getBlock(x, y, z) !== CONSTANTS.BLOCK_TYPES.LEAVES) {
        setTimeout(processDecayQueue, 25);
        return;
    }

    let hasWood = false;
    const searchRadius = 4;
    for (let dx = -searchRadius; dx <= searchRadius && !hasWood; dx++) {
        for (let dy = -searchRadius; dy <= searchRadius && !hasWood; dy++) {
            for (let dz = -searchRadius; dz <= searchRadius && !hasWood; dz++) {
                if (Math.sqrt(dx * dx + dy * dy + dz * dz) > searchRadius) continue;
                if (world.getBlock(x + dx, y + dy, z + dz) === CONSTANTS.BLOCK_TYPES.WOOD) {
                    hasWood = true;
                }
            }
        }
    }

    if (!hasWood) {
        world.setBlock(x, y, z, CONSTANTS.BLOCK_TYPES.AIR);
        chunkManager.rebuildChunkAt(x, y, z, assets.materials, assets.grassMaterials);
        if (Math.random() < 0.05) {
            const dropPos = new THREE.Vector3(x + 0.5, y + 0.5, z + 0.5);
            entityManager.spawnItemEntity(dropPos, CONSTANTS.BLOCK_TYPES.SAPLING, assets.materials[CONSTANTS.BLOCK_TYPES.SAPLING].map);
        }
        checkAdjacentLeaves(x, y, z);
    }
    setTimeout(processDecayQueue, 50);
}

function processDirtToGrassConversion() {
    if (world.dirtToGrassQueue.size === 0) return;

    const conversionTime = 15000; // 15 Sekunden
    const now = Date.now();

    for (const [key, startTime] of world.dirtToGrassQueue.entries()) {
        if (now - startTime > conversionTime) {
            const [x, y, z] = key.split(',').map(Number);

            // Überprüfen, ob die Bedingungen noch erfüllt sind
            if (world.getBlock(x, y, z) === CONSTANTS.BLOCK_TYPES.DIRT &&
                world.getBlock(x, y + 1, z) === CONSTANTS.BLOCK_TYPES.AIR) {

                world.setBlock(x, y, z, CONSTANTS.BLOCK_TYPES.GRASS);
                chunkManager.rebuildChunkAt(x, y, z, assets.materials, assets.grassMaterials);
            }
            world.dirtToGrassQueue.delete(key);
        }
    }
}


// Initialer Start des Setups - Dieser Listener wird nur einmal beim Laden der Seite ausgeführt
document.addEventListener('DOMContentLoaded', () => {
    // --- Alle Menü-Buttons initialisieren ---

    // Hauptmenü
    document.getElementById('new-world-btn').addEventListener('click', () => initGame(true));
    document.getElementById('load-world-btn').addEventListener('click', async () => {
        const data = await dbManager.loadGame();
        if (data.worldData && data.playerData) initGame(false, data);
    });
    document.getElementById('settings-btn').addEventListener('click', () => {
        hideUI(mainMenu);
        showUI(settingsMenu);
    });

    // Einstellungsmenü
    const viewDistSlider = document.getElementById('view-distance-slider');
    const viewDistValue = document.getElementById('view-distance-value');
    const texQualitySelect = document.getElementById('texture-quality-select');

    document.getElementById('back-btn').addEventListener('click', async () => {
        const newQuality = texQualitySelect.value;
        const qualityChanged = settingsManager.settings.textureQuality !== newQuality;
        settingsManager.settings.viewDistance = parseInt(viewDistSlider.value);
        settingsManager.settings.textureQuality = newQuality;
        settingsManager.save();

        if (gameRunning && qualityChanged) {
            loadingText.textContent = 'Texturen werden aktualisiert...';
            showUI(loadingOverlay);
            await new Promise(r => setTimeout(r, 50));
            assets = generateAssets(settingsManager.settings, CONSTANTS, renderer);
            chunkManager.chunks.forEach(chunk => chunk.dispose());
            chunkManager.chunks.clear();
            updateFullUI(player, assets.textureDataURLs, CONSTANTS.BLOCK_TYPES);
            hideUI(loadingOverlay);
        }
        hideUI(settingsMenu);
        if (gameRunning) {
            showUI(pauseMenu);
        } else {
            showUI(mainMenu);
        }
    });

    // Pause-Menü
    document.getElementById('resume-btn').addEventListener('click', () => { if (controls) controls.lock(); });
    document.getElementById('settings-pause-btn').addEventListener('click', () => { hideUI(pauseMenu); showUI(settingsMenu); });
    document.getElementById('save-btn').addEventListener('click', async (e) => {
        e.target.textContent = 'Speichern...';
        await dbManager.saveGame(world.data, player.getState());
        e.target.textContent = 'Gespeichert!';
        setTimeout(() => { e.target.textContent = 'Spiel speichern'; }, 2000);
    });
    document.getElementById('quit-to-main-btn').addEventListener('click', quitToMainMenu);


    // --- Initialisierung der Datenbank und UI ---
    showUI(mainMenu);
    dbManager.init().then(() => {
        dbManager.hasSaveGame().then(hasSave => {
            document.getElementById('load-world-btn').disabled = !hasSave;
        });
    });

    // Einstellungen laden und anzeigen
    viewDistSlider.value = settingsManager.settings.viewDistance;
    viewDistValue.textContent = settingsManager.settings.viewDistance;
    viewDistSlider.addEventListener('input', (e) => { viewDistValue.textContent = e.target.value; });
    texQualitySelect.value = settingsManager.settings.textureQuality;
});