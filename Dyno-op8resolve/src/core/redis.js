'use strict';

const Redis = require('ioredis');
const logger = require('./logger');

async function connect() {
	return new Promise((resolve, reject) => {
		const client = new Redis({
			name: 'master',
			sentinels: [
				{ host: '10.12.0.55', port: 26379 },
				{ host: '10.12.0.56', port: 26379 },
				{ host: '10.12.0.57', port: 26379 },
				{ host: '10.12.0.58', port: 26379 },
			],
		});

		let errorCount = 0;

		const rejectFunc = (err) => {
			errorCount += 1;
			if(errorCount >= 50) {
				process.exit(1);
			}
		};

		client.on('ready', () => {
			logger.info('Connected to redis.');
			client.removeListener('error', rejectFunc);
			resolve(client);
		});

		client.on('error', rejectFunc);

		client.on('error', err => {
			logger.error(err);
		});
	});
}

module.exports = { connect };
