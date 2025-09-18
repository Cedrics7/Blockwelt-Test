export class SettingsManager {
    constructor() {
        this.settings = {
            viewDistance: 4,
            textureQuality: 'medium'
        };
        this.load();
    }

    load() {
        const saved = localStorage.getItem('blockweltSettings');
        if (saved) {
            this.settings = JSON.parse(saved);
        }
    }

    save() {
        localStorage.setItem('blockweltSettings', JSON.stringify(this.settings));
    }
}