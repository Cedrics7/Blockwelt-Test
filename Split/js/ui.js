export function showUI(element) {
    if (!element) return;
    const displayType = element.id.includes('grid') || element.id.includes('hotbar') ? 'grid' : 'flex';
    element.style.display = displayType;
}

export function hideUI(element) {
    if (element) {
        element.style.display = 'none';
    }
}

export function setupGameUI(inventorySize) {
    const inventoryGrid = document.getElementById('inventory-grid');
    const hotbar = document.getElementById('hotbar');
    hotbar.innerHTML = '';
    inventoryGrid.innerHTML = '';

    for (let i = 0; i < inventorySize; i++) {
        const slot = document.createElement('div');
        slot.classList.add('slot');
        slot.setAttribute('data-index', i); // WICHTIG: Fügt den Index hinzu

        const count = document.createElement('div');
        count.classList.add('slot-count');
        slot.appendChild(count);

        if (i < 9) {
            const hotbarSlot = slot.cloneNode(true);
            hotbarSlot.classList.add('hotbar-slot');
            hotbar.appendChild(hotbarSlot);
        }
        inventoryGrid.appendChild(slot);
    }
}

export function updateHealthBar(player) {
    const healthBar = document.getElementById('health-bar');
    if (!healthBar || !player) return;
    const healthPercentage = (player.health / player.maxHealth) * 100;
    healthBar.style.width = `${healthPercentage}%`;
}

export function updateFullUI(player, textureDataURLs, blockTypes) {
    if (!player || !textureDataURLs) return;
    updateHealthBar(player); // Gesundheitsleiste hier aktualisieren

    const hotbarSlots = document.querySelectorAll('#hotbar .slot');
    const inventorySlots = document.querySelectorAll('#inventory-grid .slot');

    player.inventory.forEach((item, i) => {
        const slotsToUpdate = [];
        if (i < 9) {
            slotsToUpdate.push(hotbarSlots[i]);
        }
        slotsToUpdate.push(inventorySlots[i]);

        slotsToUpdate.forEach(slot => {
            if (!slot) return;
            const countDisplay = slot.querySelector('.slot-count');
            if (item.type !== blockTypes.AIR && item.count > 0) {
                slot.style.backgroundImage = `url(${textureDataURLs[item.type]})`;
                countDisplay.textContent = item.count > 1 ? item.count : '';
            } else {
                slot.style.backgroundImage = 'none';
                countDisplay.textContent = '';
            }

            if (slot.classList.contains('hotbar-slot')) {
                slot.classList.toggle('selected', i === player.selectedHotbarSlot);
            }
        });
    });
}