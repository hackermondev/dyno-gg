'use strict';

const Redis = require('ioredis');
const config = require('./config');
const logger = require('./logger');

const client = new Redis({
	host: config.redis.host,
	port: config.redis.port,
	password: config.redis.auth
});

client.on('ready', () => {
	logger.info('Connected to redis.');
});

client.on('error', err => {
	logger.error(err);
});

module.exports = client;
