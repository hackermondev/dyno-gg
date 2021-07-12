'use strict';

const util = require('util');
const getenv = require('getenv');
const moment = require('moment');
const winston = require('winston');
const Sentry = require('winston-sentry');
const config = require('./config');

/**
 * @class Logger
 */
class Logger {
	/**
	 * @prop {Array} transports
	 * @prop {Boolean} exitOnError
	 */
	constructor(options) {
		this._options = options = options || config;

		this.transports = [
			new (winston.transports.Console)({
				colorize: true,
				level: options.logLevel || getenv('BOT_LOGLEVEL', 'info'),
				debugStdout: true,
				// handleExceptions: true,
				// humanReadableUnhandledException: true,
				timestamp: () => new Date(),
				formatter: this._formatter.bind(this),
			}),
		];

		if (options.sentry && options.sentry.dsn) {
			this.transports.push(new Sentry({
				level: options.sentry.logLevel || 'error',
				dsn:   options.sentry.dsn,
			}));
		}

		this.exitOnError = false;

		return new (winston.Logger)(this);
	}

	/**
	 * Custom formatter for console
	 * @param {Object} options Formatter options
	 * @returns {String}
	 * @private
	 */
	_formatter(options) {
		let ts = util.format('[%s]', moment(options.timestamp()).format('HH:mm:ss')),
			level = winston.config.colorize(options.level);

		if (this._options.hasOwnProperty('shardId')) {
			ts = `[Shard ${this._options.shardId}] ${ts}`;
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
		}

		let message = ts + ' ' + level + ': ' + (undefined !== options.message ? options.message : '') +
			(options.meta && Object.keys(options.meta).length ? '\n\t' + util.inspect(options.meta) : '');

		if (options.colorize === 'all') {
			return winston.config.colorize(options.level, message);
		}
		return message;
	}
}

module.exports = new Logger();
