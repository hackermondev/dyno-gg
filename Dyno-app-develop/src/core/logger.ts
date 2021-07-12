import * as childProcess from 'child_process';
import * as getenv from 'getenv';
import * as moment from 'moment';
import * as util from 'util';
import * as winston from 'winston';
import Sentry from 'winston-raven-sentry';
import config from './config';

const revision = childProcess.execSync('git rev-parse HEAD').toString().trim();

/**
 * Logger class
 * @class Logger
 */
export class Logger {
	public transports: winston[];
	public exitOnError: boolean = false;

	constructor() {
		this.transports = [
			new (winston.transports.Console)({
				colorize: true,
				level: config.logLevel || getenv('BOT_LOGLEVEL', 'info'),
				debugStdout: true,
				// handleExceptions: true,
				// humanReadableUnhandledException: true,
				timestamp: () => new Date(),
				formatter: this._formatter.bind(this),
			}),
		];

		if (config.sentry.dsn) {
			this.transports.push(new Sentry({
				// patchGlobal: true,
				level: config.sentry.logLevel || 'error',
				dsn:   config.sentry.dsn,
				config: {
					captureUnhandledRejections: true,
					logger: config.stateName,
					release: revision,
					tags: [ config.version ],
				},
			}));
		}

		return new (winston.Logger)(this);
	}

	/**
	 * Custom formatter for console
	 */
	private _formatter(options: any) {
		const level = winston.config.colorize(options.level);
		let ts = util.format('[%s]', moment(options.timestamp()).format('HH:mm:ss'));

		if (config.hasOwnProperty('clusterId')) {
			ts = `[Cluster ${config.clusterId}] ${ts}`;
		}

		if (!options.message.length && options.meta instanceof Error) {
			options.message = options.meta + options.meta.stack;
		}

		if (options.meta && options.meta.guild && typeof options.meta.guild !== 'string') {
			if (options.meta.guild.shard) {
				options.meta.shard = options.meta.guild.shard.id;
			}
			options.meta.guild = options.meta.guild.id;
		}

		switch (options.level) {
			case 'debug':
				ts += ' ⚙ ';
				break;
			case 'info':
				ts += ' 🆗 ';
				break;
			case 'error':
				ts += ' 🔥 ';
				break;
			case 'warn':
				ts += ' ☣ ';
				break;
			case 'silly':
				ts += ' 💩 ';
				break;
			default:
				break;
		}

		// tslint:disable-next-line:prefer-template
		const message = ts + ' ' + level + ': ' + (undefined !== options.message ? options.message : '') +
			(options.meta && Object.keys(options.meta).length ? '\n\t' + util.inspect(options.meta) : '');

		if (options.colorize === 'all') {
			return winston.config.colorize(options.level, message);
		}

		return message;
	}
}

export const logger: winston = new Logger();
