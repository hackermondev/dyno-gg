import * as winston from 'winston';
import * as Sentry from 'winston-raven-sentry';
import {config} from './config';

export const logger = new winston.Logger({
	transports: [
		new Sentry({
			dsn: config.sentry.dsn,
			level: config.sentry.logLevel,
		}),
	],
});
