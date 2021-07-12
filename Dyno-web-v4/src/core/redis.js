'use strict';

const Redis = require('ioredis');
const config = require('./config');
const logger = require('./logger');

const client = new Redis({
        name: 'master',
        sentinels: [
                { host: '10.12.0.55', port: 26379 },
                { host: '10.12.0.56', port: 26379 },
                { host: '10.12.0.57', port: 26379 },
                { host: '10.12.0.58', port: 26379 },
        ],
});

client.on('ready', () => {
	logger.info('Connected to redis.');
});

client.on('error', err => {
        console.log(err);
	logger.error(err);
});

module.exports = client;
