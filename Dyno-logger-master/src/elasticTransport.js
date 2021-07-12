const moment = require('moment');
const { LogLevelValue, Logger } = require('@ayana/logger');
const logger = Logger.get('ElasticTransport');
let elastic;

class ElasticTransport {
    constructor(opts = {}) {
        const defaults = {
            indexPrefix: 'default.',
            indexSuffixPattern: 'YYYY.MM.DD',
            minLevel: 'INFO',
            type: 'log',
            environment: 'UNKNOWN',
            bulkInterval: 5000,
        };

        if (!opts.environment) {
            throw new Error('Missing log environment option.');
        }

        this.options = Object.assign(defaults, opts);
        this.bulkBuffer = [];
        this.lastBulkTime = new Date();

        elastic = require('./elastic')(this.options);
    }

    async flushBulk() {
        if (this.bulkBuffer.length <= 0) {
            return;
        }

        const bulkCopy = this.bulkBuffer.slice(0);
        this.bulkBuffer = [];

        const body = [];
        const indexName = this.formatIndexName();
        bulkCopy.forEach((item) => {
            body.push({ index: { _index: indexName, _type: this.options.type } });
            body.push(item);
        });

        try {
            await elastic.bulk({ body });
            this.lastBulkTime = new Date();
            logger.trace(`Succesfully indexed ${bulkCopy.length} documents`);
        } catch (e) {
            // Restore the bulk items in case we can index later
            this.bulkBuffer.push(...bulkCopy);
            // Offset the new bulk by 1 minute
            this.lastBulkTime = moment().add(1, 'minutes');
            logger.error(e);
            logger.trace('Offsetting next ElasticTransport bulk index by 1 minute');
        }
    }

    formatIndexName() {
        const now = moment();
        const dateString = now.format(this.options.indexSuffixPattern);

        return `${this.options.indexPrefix}${dateString}`;
    }

    async log(info) {
        if (LogLevelValue[info.level] > LogLevelValue[this.options.minLevel]) {
            return;
        }

        if (!elastic) {
            return;
        }

        let body = {};
        body['@timestamp'] = new Date().toISOString();
        body.severity = info.level;
        body.environment = this.options.environment;
        body.message = info.rawMessage;
        body.marker = info.uniqueMarker;
        body.name = info.name;
        body.fields = info.additionalFields || {};
        if (info.rawError) {
            body.fields.error = info.rawError;
        }

        this.bulkBuffer.push(body);

        if (moment().diff(this.lastBulkTime) > this.options.bulkInterval) {
            logger.trace(`Starting bulk flush after ${moment().diff(this.lastBulkTime)} ms`);
            await this.flushBulk();
        }
    }
}

module.exports = ElasticTransport;
