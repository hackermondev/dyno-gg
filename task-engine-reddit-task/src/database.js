const DataFactory = require('@dyno.gg/datafactory');
const config = require('./config');

const dbString = config.mongoDSN;

if (!dbString) {
	throw new Error('Missing Mongo DSN.');
}

const db = new DataFactory({
	dbString,
	logger: {
		level: config.logLevel || 'error',
	},
});

module.exports = db;
