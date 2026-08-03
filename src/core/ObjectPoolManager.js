export class ObjectPoolManager {
    constructor() {
        this.pools = {};
    }

    createPool(poolName, createFunc, initialSize = 10) {
        if (!this.pools[poolName]) {
            this.pools[poolName] = {
                createFunc: createFunc,
                inactive: [],
                active: []
            };

            for (let i = 0; i < initialSize; i++) {
                const obj = createFunc();
                this.pools[poolName].inactive.push(obj);
            }
        }
    }

    get(poolName) {
        const pool = this.pools[poolName];
        if (!pool) {
            console.error(`Object pool '${poolName}' does not exist.`);
            return null;
        }

        let obj;
        if (pool.inactive.length > 0) {
            obj = pool.inactive.pop();
        } else {
            // Expand pool if necessary
            obj = pool.createFunc();
        }

        pool.active.push(obj);
        return obj;
    }

    release(poolName, obj) {
        const pool = this.pools[poolName];
        if (!pool) return;

        const activeIndex = pool.active.indexOf(obj);
        if (activeIndex !== -1) {
            pool.active.splice(activeIndex, 1);
            pool.inactive.push(obj);

            // Optional: reset object state here if needed,
            // but it's usually better handled by the object itself or before releasing.
            if (obj.visible !== undefined) obj.visible = false;
        }
    }

    releaseAll(poolName) {
        const pool = this.pools[poolName];
        if (!pool) return;

        while (pool.active.length > 0) {
            const obj = pool.active.pop();
            if (obj.visible !== undefined) obj.visible = false;
            pool.inactive.push(obj);
        }
    }
}

// Global instance for convenience
export const ObjectPool = new ObjectPoolManager();
