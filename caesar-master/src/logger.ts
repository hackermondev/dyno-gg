import { createLogger, format, transports, Logger } from 'winston';
import config from './config';

console.log(config.logLevel)
export const logger : Logger = createLogger({
  format: format.combine(
    format.colorize(),
    format.timestamp(),
    format.printf(info => `[${info.timestamp}] - ${info.level}: ${info.message}`)
  ),
  transports: [new transports.Console()],
  level: config.logLevel,
});

export default logger;