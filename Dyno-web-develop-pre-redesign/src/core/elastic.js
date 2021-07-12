const elasticsearch = require('elasticsearch');
const config = require('./config');

let client;

if (config.elastic.host) {
    client = new elasticsearch.Client({
        host: `${config.elastic.host}`,
        log: ['warning', 'error'],
        // log: 'trace',
    });
}

module.exports = client;
