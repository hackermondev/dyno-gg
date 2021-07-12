import { LogFormatter, Logger as AyanaLogger, LogLevel, Transports } from '@ayana/logger';
import chalk from 'chalk';
import { format } from 'logform';
import config from '../config';
import { ElasticTransport } from './elasticTransport';

const getColor = (level : LogLevel) => {
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
		default:
			return chalk.white;
	}
};

const getSymbol = (level : LogLevel) => {
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
		default:
			return '?';
	}
};

/**
 * @class Logger
 */
export default class Logger {
	public _options : any;
	public static init(options : any) {
		AyanaLogger.setConfig({
			level: config.logLevel,
			transports: [
				new Transports.Console(),
				new ElasticTransport(),
			],
			formatter: new LogFormatter({
				lineFormatter: format.combine(
					format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:SSS' }),
					format((info : any) => {
						const logColor = getColor(info.level);
						info.message = logColor(`[${info.timestamp}] ${getSymbol(info.level)} ${info.level} `) + chalk.white(info.message);
						return info;
					})(),
				),
				messageFormatter: format((info : any) => {
					const { pkgName, pkgPath, uniqueMarker, name, message } = info;
					const { cyan, blue, gray } = chalk;
					// eslint-disable-next-line max-len
					info.message = `[${cyan(`${pkgName}:`)}${blue(`${pkgPath}${name}`)}${uniqueMarker ? `/${gray(`${uniqueMarker}`)}` : ''}] ${message}`;
					return info;
				}),
			}),
		});
	}

	public static get(name : string) {
		if (process.env.NODE_ENV === 'test') {
			// tslint:disable-next-line:no-empty
			const noop = (message : string, uniqueMarker? : string, additionalInfo?: any) => {};
			return {
				info: noop,
				warn: noop,
				trace: noop,
				debug: noop,
				error: (message : string, uniqueMarker? : string, additionalInfo?: any) => {
					throw message;
				},
			};
		}

		return AyanaLogger.get(name);
	}
}

Logger.init({});
