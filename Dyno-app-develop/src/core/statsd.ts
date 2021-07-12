import * as getenv from 'getenv';
import * as StatsD from 'hot-shots';
import {logger} from './logger';

const client = new StatsD({
	host: getenv('STATSD_HOST', 'statsd.davinci.sh'),
	port: getenv('STATSD_PORT', 4280),
	prefix: getenv('STATSD_PREFIX', 'dyno.prod.'),
});

export default client;
