export class InventoryUI {
    constructor() {
        this.isOpen = false;
        console.warn('Mock InventoryUI initialized. A proper implementation should be written.');
    }

    toggle() {
        this.isOpen = !this.isOpen;
        console.log(`Inventory UI toggled: ${this.isOpen}`);
    }
}
