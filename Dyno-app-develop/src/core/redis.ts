import * as Redis from 'ioredis';
import config from './config';
import { logger } from './logger';

const client = new Redis({
	host: config.redis.host,
	port: config.redis.port,
	password: config.redis.auth,
});

client.on('ready', () => {
	logger.info('Connected to redis.');
});

client.on('error', (err: string) => {
	logger.error(err);
});

export default client;
