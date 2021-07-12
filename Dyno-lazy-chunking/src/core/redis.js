'use strict';

const Redis = require('ioredis');
const config = require('./config');
const logger = require('./logger');

const client = new Redis({
	name: 'master',
	sentinels: [
		{ host: 'sentinel01.dyno.lan', port: 26379 },
		{ host: 'sentinel02.dyno.lan', port: 26379 },
		{ host: 'sentinel03.dyno.lan', port: 26379 },
		{ host: 'sentinel04.dyno.lan', port: 26379 },
	],
});

client.on('ready', () => {
	logger.info('Connected to redis.');
});

client.on('error', err => {
	logger.error(err);
});

module.exports = client;
