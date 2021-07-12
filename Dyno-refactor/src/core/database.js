'use strict';

const DataFactory = require('@dyno.gg/datafactory');
const config = require('./config');

const dbString = config.mongo.dsn;

if (!dbString) {
	throw new Error('Missing environment variable CLIENT_MONGO_URL.');
}

const db = new DataFactory({
	dbString,
	logger: {
		level: config.logLevel || 'error',
		sentry: {
			level: config.sentry.logLevel,
			dsn: config.sentry.dsn,
		},
	},
});

module.exports = db;
