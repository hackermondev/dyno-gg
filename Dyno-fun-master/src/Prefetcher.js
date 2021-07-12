const superagent = require('superagent');

class Prefetcher {
    constructor(url, options) {
        this.url = url;
        this.options = options || {};
        this.cache = [];
    }

    async get() {
        let item;

        if (this.cache[0]) {
            item = this.cache.splice(0, 1);
        } else {
            item = await this.fetch(false);
        }

        this.fetch(true).catch(() => null);
        return item;
    }

    async fetch(prefetch) {
        if (!prefetch) {
            return await superagent
                .get(this.url)
                .set(this.options);
        }
        let item = await superagent
            .get(this.url)
            .set(this.options);

        this.cache.push(item);
    }

    async init() {
        for (let i = 0; i < 10; i++) {
            this.fetch(true).catch(() => null);
        }
    }
}

module.exports = Prefetcher;
