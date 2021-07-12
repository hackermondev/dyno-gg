import elasticsearch from 'elasticsearch';
import config from '../config';

let client;

if (config.elastic && config.elastic.host) {
	client = new elasticsearch.Client({
		host: `${config.elastic.host}`,
		log: ['warning', 'error'],
		// log: 'trace',
	});
}

export { client };
