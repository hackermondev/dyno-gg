import { AsyncStorage } from 'react-native';

export class LocalStorage {
    constructor() {
        this.local = AsyncStorage;
    }

   async set(key, value) {
        return this.local.setItem(key, value);
    }

    async get(key) {
        return this.local.getItem(key);
    }

    async delete(key) {
        return this.local.removeItem(key);
    }
}
