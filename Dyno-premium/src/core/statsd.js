'use strict';

const StatsD = require('hot-shots');
const logger = require('./logger');
const config = require('./config');
const client = new StatsD({
	host: 'graphite.davinci.sh',
	port: 4286,
	prefix: config.statsdPrefix || 'dyno.prod.',
});

client.socket.on('error', err => {
	logger.error('Error in socket: ', err);
});

module.exports = client;
