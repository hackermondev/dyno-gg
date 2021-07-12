import { Logger, LogLevelValue } from '@ayana/logger';
import * as moment from 'moment';
import config from './../config';
import { client as elastic } from './elastic';
const logger = Logger.get('ElasticTransport');

export class ElasticTransport {
	private options : any;
	private bulkBuffer : any[];
	private lastBulkTime : Date | moment.Moment;
	constructor(opts : any = {}) {
		const defaults = {
			indexPrefix: 'weblogs.',
			indexSuffixPattern: 'YYYY.MM.DD',
			minLevel: config.elastic.minLogLevel,
			type: 'log',
			environment: 'gatekeeper',
			bulkInterval: 5000,
		};

		this.options = Object.assign(defaults, opts);
		this.bulkBuffer = [];
		this.lastBulkTime = new Date();
	}

	public async log(info : any) {
		if (LogLevelValue[info.level] > LogLevelValue[this.options.minLevel]) {
			return;
		}

		if (!elastic) {
			return;
		}

		const body : any = {};
		body['@timestamp'] = new Date().toISOString();
		body.severity = info.level;
		body.environment = this.options.environment;
		body.message = info.rawMessage;
		body.marker = info.uniqueMarker;
		body.fields = info.additionalFields || {};
		if (info.rawError) {
			body.fields.error = info.rawError;
		}

		this.bulkBuffer.push(body);

		if (moment().diff(this.lastBulkTime) > this.options.bulkInterval) {
			logger.trace(`Starting bulk flush after ${moment().diff(this.lastBulkTime)} ms`);
			await this.flushBulk();
		}
	}

	private async flushBulk() {
		if (this.bulkBuffer.length <= 0) {
			return;
		}

		const bulkCopy = this.bulkBuffer.slice(0);
		this.bulkBuffer = [];

		const body = [];
		const indexName = this.formatIndexName();
		bulkCopy.forEach((item : any) => {
			body.push({ index: { _index: indexName, _type: this.options.type } });
			body.push(item);
		});

		try {
			await elastic.bulk({ body });
			this.lastBulkTime = new Date();
			logger.trace(`Succesfully indexed ${bulkCopy.length} documents`);
		} catch (e) {
			// Restore the bulk items in case we can index later
			this.bulkBuffer.push(bulkCopy);
			// Offset the new bulk by 1 minute
			this.lastBulkTime = moment().add(1, 'minutes');
			logger.error(e);
			logger.trace('Offsetting next ElasticTransport bulk index by 1 minute');
		}
	}

	private formatIndexName() {
		const now = moment();
		const dateString = now.format(this.options.indexSuffixPattern);

		return `${this.options.indexPrefix}${dateString}`;
	}
}
