import * as DataFactory from '@dyno.gg/datafactory';
import * as getenv from 'getenv';

require('dotenv').config({ silent: true });

const dbString = getenv('CLIENT_MONGO_URL');

if (!dbString) {
	throw new Error('Missing environment variable CLIENT_MONGO_URL.');
}

const db = new DataFactory({
	dbString,
	logger: {
		level: getenv('CLIENT_LOGLEVEL', 'info'),
		sentry: {
			level: getenv('SENTRY_LOGLEVEL', 'error'),
			dsn: getenv('SENTRY_DSN'),
		},
	},
});

const models = db.models;
models.mongoose = db.mongoose;
models.Schema = db.Schema;

export default models;
