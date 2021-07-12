'use strict';

const redis = require('redis');
const config = require('./config');
const logger = require('./logger');

Promise.promisifyAll(redis.RedisClient.prototype);
Promise.promisifyAll(redis.Multi.prototype);

const client = redis.createClient({
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.auth,
    retry_strategy: options => {
        // if (options.error.code === 'ECONNREFUSED') {
        // 	// End reconnecting on a specific error and flush all commands with a individual error
        // 	return new Error('The server refused the connection');
        // }
        if (options.total_retry_time > 1000 * 60 * 60) {
            // End reconnecting after a specific timeout and flush all commands with a individual error
            return new Error('Retry time exhausted');
        }
        if (options.times_connected > 10) {
            // End reconnecting with built in error
            return undefined;
        }
        // reconnect after
        return Math.max(options.attempt * 100, 3000);
    },
});

client.on('ready', () => {
    logger.info('Connected to redis.');
});

client.on('error', err => {
    logger.error(err);
});

module.exports = client;
