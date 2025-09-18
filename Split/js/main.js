import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

// Lokale Module importieren
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
const raycaster = new THREE.Raycaster();

// NEU: Zustand für Drag & Drop
let draggedItemStack = null;

// --- Manager Instanzen ---
const settingsManager = new SettingsManager();
const dbManager = new DBManager();

// --- DOM-Elemente holen ---
// (Dieser Abschnitt bleibt unverändert)
const mainMenu = document.getElementById('main-menu');
const settingsMenu = document.getElementById('settings-menu');
const pauseMenu = document.getElementById('pause-menu');
const loadingOverlay = document.getElementById('loading-overlay');
const loadingText = document.getElementById('loading-text');
const gameCanvas = document.getElementById('game-canvas');
const deathScreen = document.getElementById('death-screen');
const hotbarDiv = document.getElementById('hotbar');
const inventoryScreen = document.getElementById('inventory-screen');
const crosshair = document.getElementById('crosshair');
const viewDistSlider = document.getElementById('view-distance-slider');
const viewDistValue = document.getElementById('view-distance-value');
const texQualitySelect = document.getElementById('texture-quality-select');

// --- Haupt-Spiellogik ---

async function initGame(isNew, loadedData) {
    // ... (initGame bleibt größtenteils gleich)
    hideUI(mainMenu);
    showUI(loadingOverlay);
    await new Promise(resolve => setTimeout(resolve, 50));
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB);
    renderer = new THREE.WebGLRenderer({ canvas: gameCanvas, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    controls = new PointerLockControls(camera, renderer.domElement);
    controls.addEventListener('unlock', () => { if (gameRunning && !isInventoryOpen) { isPaused = true; showUI(pauseMenu); } });
    controls.addEventListener('lock', () => { if (gameRunning) { isPaused = false; hideUI(pauseMenu); } });
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 50, 50);
    scene.add(ambientLight, directionalLight);
    world = new World();
    player = new Player(world);
    entityManager = new EntityManager(scene, world);
    if (isNew) {
        loadingText.textContent = 'Welt wird generiert...';
        await new Promise(resolve => setTimeout(() => { world.init(); world.generate(); resolve(); }, 50));
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
    chunkManager = new ChunkManager(scene, world, assets.blockGeometry);
    hideUI(loadingOverlay);
    showUI(gameCanvas);
    showUI(hotbarDiv);
    showUI(crosshair);
    setupGameUI(CONSTANTS.INVENTORY_SIZE);
    updateFullUI(player, assets.textureDataURLs, CONSTANTS.BLOCK_TYPES);

    // NEU: Event Listener für das Inventar einmalig initialisieren
    initializeInventoryListeners();

    controls.lock();
    gameRunning = true;
    isPaused = false;
    isPlayerDead = false;
    animate();
}

// ... (animate, handlePlayerDeath, quitToMainMenu bleiben unverändert)
function animate() { if (!gameRunning) return; gameLoopId = requestAnimationFrame(animate); const dt = clock.getDelta(); if (!isPaused && !isPlayerDead) { player.update(dt, keys, camera); if (player.isDead) { handlePlayerDeath(); } else { entityManager.update(dt, player); chunkManager.update(player.pos, assets.materials, assets.grassMaterials, settingsManager.settings); } } if (renderer && scene && camera) { renderer.render(scene, camera); } }
function handlePlayerDeath() { if (isPlayerDead) return; isPlayerDead = true; controls.unlock(); deathScreen.textContent = "Du bist gestorben!"; showUI(deathScreen); setTimeout(() => { hideUI(deathScreen); player.respawn(); isPlayerDead = false; controls.lock(); }, 2000); }
function quitToMainMenu() { gameRunning = false; isPaused = false; if (gameLoopId) cancelAnimationFrame(gameLoopId); if (controls) controls.unlock(); if (scene) { while (scene.children.length > 0) { scene.remove(scene.children[0]); } } hideUI(gameCanvas); hideUI(hotbarDiv); hideUI(crosshair); hideUI(pauseMenu); hideUI(inventoryScreen); hideUI(deathScreen); showUI(mainMenu); dbManager.hasSaveGame().then(hasSave => { document.getElementById('load-world-btn').disabled = !hasSave; }); }


// --- Event Listener Setup ---
document.addEventListener('DOMContentLoaded', () => {
    // ... (Dieser Block bleibt unverändert)
    showUI(mainMenu);
    dbManager.init().then(() => {
        dbManager.hasSaveGame().then(hasSave => {
            document.getElementById('load-world-btn').disabled = !hasSave;
        });
    });
    document.getElementById('new-world-btn').addEventListener('click', () => initGame(true));
    document.getElementById('load-world-btn').addEventListener('click', async () => { const data = await dbManager.loadGame(); if (data.worldData && data.playerData) initGame(false, data); });
    document.getElementById('settings-btn').addEventListener('click', () => { hideUI(mainMenu); showUI(settingsMenu); });
    document.getElementById('back-btn').addEventListener('click', async () => { const newQuality = texQualitySelect.value; const qualityChanged = settingsManager.settings.textureQuality !== newQuality; settingsManager.settings.viewDistance = parseInt(viewDistSlider.value); settingsManager.settings.textureQuality = newQuality; settingsManager.save(); if (gameRunning && qualityChanged) { loadingText.textContent = 'Texturen werden aktualisiert...'; showUI(loadingOverlay); await new Promise(r => setTimeout(r, 50)); assets = generateAssets(settingsManager.settings, CONSTANTS, renderer); chunkManager.chunks.forEach(chunk => chunk.dispose()); chunkManager.chunks.clear(); updateFullUI(player, assets.textureDataURLs, CONSTANTS.BLOCK_TYPES); hideUI(loadingOverlay); } hideUI(settingsMenu); if (gameRunning) { showUI(pauseMenu); } else { showUI(mainMenu); } });
    document.getElementById('resume-btn').addEventListener('click', () => { if (controls) controls.lock(); });
    document.getElementById('settings-pause-btn').addEventListener('click', () => { hideUI(pauseMenu); showUI(settingsMenu); });
    document.getElementById('save-btn').addEventListener('click', async (e) => { e.target.textContent = 'Speichern...'; await dbManager.saveGame(world.data, player.getState()); e.target.textContent = 'Gespeichert!'; setTimeout(() => { e.target.textContent = 'Spiel speichern'; }, 2000); });
    document.getElementById('quit-to-main-btn').addEventListener('click', quitToMainMenu);
});

document.addEventListener('keydown', (e) => {
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

    // NEU: 'I' zum Öffnen UND Schließen verwenden
    if (e.code === 'KeyI') {
        if (isInventoryOpen) {
            isInventoryOpen = false;
            hideUI(inventoryScreen);
            if (!isPaused) controls.lock();
        } else if (controls.isLocked) {
            isInventoryOpen = true;
            controls.unlock();
            showUI(inventoryScreen);
        }
    }

    if (!isPaused && controls.isLocked && e.code.startsWith('Digit')) {
        const i = parseInt(e.code.slice(5)) - 1;
        if (i >= 0 && i < 9) {
            player.selectedHotbarSlot = i;
            updateFullUI(player, assets.textureDataURLs, CONSTANTS.BLOCK_TYPES);
        }
    }
});

document.addEventListener('keyup', (e) => { keys[e.code] = false; });
window.addEventListener('resize', () => { if (gameRunning && camera && renderer) { camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); } });
window.addEventListener('contextmenu', (e) => e.preventDefault());
gameCanvas.addEventListener('click', () => { if (!isPlayerDead && !isPaused) { controls.lock(); } });
window.addEventListener('mousedown', (e) => {
    if (!gameRunning || !controls.isLocked) return;
    raycaster.setFromCamera({ x: 0, y: 0 }, camera);
    const iMeshes = chunkManager.getIntersectableMeshes();
    const intersects = raycaster.intersectObjects(iMeshes, false);
    if (intersects.length > 0) {
        const intersection = intersects[0];
        if (intersection.distance > CONSTANTS.PLAYER_REACH) return;
        const pos = new THREE.Vector3().copy(intersection.point);
        const normal = intersection.face.normal.clone();
        if (e.button === 0) { pos.sub(normal.multiplyScalar(0.5)); const blockPos = { x: Math.floor(pos.x), y: Math.floor(pos.y), z: Math.floor(pos.z) }; const blockType = world.getBlock(blockPos.x, blockPos.y, blockPos.z); if (blockType !== CONSTANTS.BLOCK_TYPES.AIR && blockType !== CONSTANTS.BLOCK_TYPES.LAVA) { player.addItem(blockType, 1); world.setBlock(blockPos.x, blockPos.y, blockPos.z, CONSTANTS.BLOCK_TYPES.AIR); chunkManager.rebuildChunkAt(blockPos.x, blockPos.y, blockPos.z, assets.materials, assets.grassMaterials); updateFullUI(player, assets.textureDataURLs, CONSTANTS.BLOCK_TYPES); } }
        else if (e.button === 2) { const item = player.inventory[player.selectedHotbarSlot]; if (!item || item.type === CONSTANTS.BLOCK_TYPES.AIR || item.count <= 0) return; pos.add(normal.multiplyScalar(0.5)); const newBlockPos = { x: Math.floor(pos.x), y: Math.floor(pos.y), z: Math.floor(pos.z) }; const pBox = player.getBoundingBox(); const nBBox = new THREE.Box3(new THREE.Vector3(newBlockPos.x, newBlockPos.y, newBlockPos.z), new THREE.Vector3(newBlockPos.x + 1, newBlockPos.y + 1, newBlockPos.z + 1)); if (!pBox.intersectsBox(nBBox) && world.getBlock(newBlockPos.x, newBlockPos.y, newBlockPos.z) === CONSTANTS.BLOCK_TYPES.AIR) { world.setBlock(newBlockPos.x, newBlockPos.y, newBlockPos.z, item.type); player.removeItem(player.selectedHotbarSlot, 1); chunkManager.rebuildChunkAt(newBlockPos.x, newBlockPos.y, newBlockPos.z, assets.materials, assets.grassMaterials); updateFullUI(player, assets.textureDataURLs, CONSTANTS.BLOCK_TYPES); } }
    }
});


// ##################################################################
// ##### NEUER ABSCHNITT: LOGIK FÜR INVENTAR-INTERAKTION #########
// ##################################################################
function initializeInventoryListeners() {
    const draggedItemDiv = document.getElementById('dragged-item');
    const draggedItemCount = draggedItemDiv.querySelector('.slot-count');

    // Listener, um das gezogene Item mit der Maus zu bewegen
    window.addEventListener('mousemove', (e) => {
        if (draggedItemStack) {
            draggedItemDiv.style.left = `${e.clientX}px`;
            draggedItemDiv.style.top = `${e.clientY}px`;
        }
    });

    // Wrapper, der das ganze Inventar umfasst (Hotbar + Grid)
    const inventoryContainer = document.getElementById('inventory-screen');

    inventoryContainer.addEventListener('mousedown', (e) => {
        if (!isInventoryOpen || !player) return;

        const targetSlot = e.target.closest('.slot');

        // Fall 1: Klick INS Inventar auf einen Slot
        if (targetSlot) {
            const slotIndex = parseInt(targetSlot.dataset.index);
            const itemInSlot = player.inventory[slotIndex];

            // Wenn wir bereits ein Item in der Hand haben (draggedItemStack)
            if (draggedItemStack) {
                // Wir legen unser Item in den geklickten Slot.
                // Gleichzeitig nehmen wir das Item auf, das eventuell schon dort lag.
                player.inventory[draggedItemStack.originalIndex] = itemInSlot;
                player.inventory[slotIndex] = draggedItemStack.item;

                draggedItemStack = null;
                hideUI(draggedItemDiv);
            }
            // Wenn wir kein Item in der Hand haben und der geklickte Slot nicht leer ist
            else if (itemInSlot && itemInSlot.type !== CONSTANTS.BLOCK_TYPES.AIR) {
                // Wir heben das Item auf
                draggedItemStack = {
                    item: itemInSlot,
                    originalIndex: slotIndex
                };
                player.inventory[slotIndex] = { type: CONSTANTS.BLOCK_TYPES.AIR, count: 0 };

                // Aktualisiere das visuelle Element, das an der Maus hängt
                draggedItemDiv.style.backgroundImage = `url(${assets.textureDataURLs[draggedItemStack.item.type]})`;
                draggedItemCount.textContent = draggedItemStack.item.count > 1 ? draggedItemStack.item.count : '';
                showUI(draggedItemDiv);
            }
        }
        // Fall 2: Klick AUSSERHALB des Inventar-Grids, während wir ein Item halten -> Item droppen
        else if (draggedItemStack) {
            // "Droppen" bedeutet hier einfach, dass es aus dem Inventar entfernt wird.
            console.log(`Item gedroppt: ${draggedItemStack.item.count}x ${draggedItemStack.item.type}`);
            draggedItemStack = null;
            hideUI(draggedItemDiv);
        }

        // Nach jeder Aktion die gesamte UI neu zeichnen
        updateFullUI(player, assets.textureDataURLs, CONSTANTS.BLOCK_TYPES);
    });
}