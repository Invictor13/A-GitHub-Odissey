export class InventoryUI {
    constructor() {
        this.isOpen = false;
        this.modal = document.getElementById('inventory-modal');
        if (!this.modal) {
            console.warn('Inventory modal not found in DOM.');
        }
    }

    toggle() {
        if (!this.modal) return;
        this.isOpen = !this.isOpen;
        if (this.isOpen) {
            this.modal.classList.remove('hidden');
        } else {
            this.modal.classList.add('hidden');
        }
    }
}
