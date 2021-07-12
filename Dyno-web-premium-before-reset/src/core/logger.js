'use strict';

const config = require('./config');
const { Logger, Transports, LogFormatter, LogLevel } = require('@ayana/logger');
const { format } = require('logform');
const chalk = require('chalk');
const elasticTransport = require('./elasticTransport');

const getColor = (level) => {
	switch (level) {
		case LogLevel.TRACE:
		case LogLevel.DEBUG:
			return chalk.blue;
		case LogLevel.INFO:
			return chalk.green;
		case LogLevel.ERROR:
			return chalk.red;
		case LogLevel.WARN:
			return chalk.yellow;
	}
}

const getSymbol = (level) => {
	switch (level) {
		case LogLevel.TRACE:
		case LogLevel.DEBUG:
			return '⚙';
		case LogLevel.INFO:
			return '🆗';
		case LogLevel.ERROR:
			return '🔥';
		case LogLevel.WARN:
			return '☣';
	}
};

/**
 * @class Logger
 */
class DynoLogger {
	static init(options) {
		this._options = options = options || config;

		Logger.setConfig({
			level: config.logLevel,
			transports: [
				new Transports.Console(),
				new elasticTransport(),
			],
			formatter: new LogFormatter({
				lineFormatter: format.combine(
					format.timestamp({ format:'YYYY-MM-DD HH:mm:ss:SSS' }),
					format(info => {
						const logColor = getColor(info.level);
						info.message = logColor(`[${info.timestamp}] ${getSymbol(info.level)} ${info.level} `) + chalk.white(info.message);
						return info;
					})(),
				),
				messageFormatter: format(info => {
					const { pkgName, pkgPath, uniqueMarker, name, message } = info;	
					const { cyan, blue, gray } = chalk;
					// eslint-disable-next-line max-len
					info.message = `[${cyan(`${pkgName}:`)}${blue(`${pkgPath}${name}`)}${uniqueMarker ? `/${gray(`${uniqueMarker}`)}` : ''}] ${message}`;
					return info;
				}),
			}),
		});
	}

	static get(name) {
		return Logger.get(name);
	}
}

DynoLogger.init();
module.exports = DynoLogger;
