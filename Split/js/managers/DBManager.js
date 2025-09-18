export class DBManager {
    constructor() {
        this.db = null;
    }

    init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('BlockweltDB', 1);
            request.onerror = () => reject("DB Error");
            request.onsuccess = (e) => { this.db = e.target.result; resolve(); };
            request.onupgradeneeded = (e) => {
                e.target.result.createObjectStore('savegame', { keyPath: 'id' });
            };
        });
    }

    saveGame(worldData, playerData) {
        return new Promise((resolve) => {
            const transaction = this.db.transaction(['savegame'], 'readwrite');
            const store = transaction.objectStore('savegame');
            store.put({ id: 'world', data: worldData });
            store.put({ id: 'player', data: playerData });
            transaction.oncomplete = () => resolve();
        });
    }

    loadGame() {
        return new Promise((resolve) => {
            const transaction = this.db.transaction(['savegame'], 'readonly');
            const store = transaction.objectStore('savegame');
            const worldReq = store.get('world');
            const playerReq = store.get('player');
            const result = {};
            worldReq.onsuccess = () => { result.worldData = worldReq.result?.data; };
            playerReq.onsuccess = () => { result.playerData = playerReq.result?.data; };
            transaction.oncomplete = () => resolve(result);
        });
    }

    hasSaveGame() {
        return new Promise(resolve => {
            const transaction = this.db.transaction(['savegame'], 'readonly');
            const store = transaction.objectStore('savegame');
            const request = store.get('world');
            request.onsuccess = () => resolve(!!request.result);
        });
    }
}