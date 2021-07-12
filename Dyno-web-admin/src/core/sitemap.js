const { createSitemap, buildSitemapIndex } = require('sitemap');
const config = require('./config');
const slugify = require('slugify');

class Sitemap {
    constructor() {
        this.hostname = config.site.host.replace(/\/$/g, '');
        this.staticsitemap = createSitemap({
            hostname: this.hostname,
            urls: [
                { url: '/servers', changefreq: 'hourly', priority: 0.7 },
                { url: '/bot', changefreq: 'monthly', priority: 0.8 },
                { url: '/commands', changefreq: 'monthly', priority: 0.6 },
                { url: '/faq', changefreq: 'monthly', priority: 0.6 },
                { url: '/status', changefreq: 'weekly', priority: 0.5 },
                { url: '/upgrade', changefreq: 'weekly', priority: 0.6 },
            ],
        });
        this.dynamicMaps = {
            sitemap0: this.staticsitemap.toXML(),
        };

        this.sitemapIndex = buildSitemapIndex({
            urls: [`${this.hostname}/sitemaps/sitemap0.xml`],
        });
    }

    updateServers(servers) {
        this.servers = servers;

        const chunks = this.chunkArray(50000, servers);
        
        this.dynamicMaps = {
            sitemap0: this.staticsitemap.toXML(),
        };

        let mapNumber = 1;
        
        // static sitemap
        const urls = [`${this.hostname}/sitemaps/sitemap0.xml`];
        chunks.forEach((chunk) => {
            this.dynamicMaps[`sitemap${mapNumber}`] = this.createDynamicServersMap(chunk).toXML();
            urls.push(`${this.hostname}/sitemaps/sitemap${mapNumber}.xml`);
            mapNumber++;
        });

        this.sitemapIndex = buildSitemapIndex({
            urls,
        });
    }

    // O(N) chunking algorithm for arrays
    chunkArray(chunkSize, array) {
        return array.reduce((previous, current) => {
            var chunk;
            if (previous.length === 0 ||
                    previous[previous.length - 1].length === chunkSize) {
                chunk = [];
                previous.push(chunk);
            } else {
                chunk = previous[previous.length - 1];
            }
            chunk.push(current);
            return previous;
        }, []);
    }

    createDynamicServersMap(servers) {
        const map = createSitemap({
            hostname: config.site.host,
        });

        // /server/:id/:slug?
        servers.forEach((s) => {
            map.add({ url: `/server/${s.id}/${slugify(s.name)}`, changefreq: 'daily' });
        });

        return map;
    }

    getSitemapIndex() {
        return this.sitemapIndex;
    }

    getDynamicSitemap() {
        return this.dynamicMaps;
    }

    getStaticSitemap() {
        return this.staticsitemap;
    }
}

module.exports = Sitemap;
