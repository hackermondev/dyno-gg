'use strict';

const accounting = require('accounting');
const Controller = require('../../core/Controller');
const redis = require('../../core/redis');
const moment = require('moment');
const config = require('../../core/config');
require('moment-duration-format');

/**
 * Sessions controller
 * @class Sessions
 * @extends {Controller}
 */
class Sessions extends Controller {

	/**
	 * Constructor
	 * @returns {Object}
	 */
	constructor(bot) {
		super(bot);

		// define routes
		return {
			index: {
				method: 'get',
				uri: '/api/sessions',
				handler: this.sessions.bind(this),
			},
		};
	}

	async sessions(bot, req, res) {
		let data;
		try {
			data = await redis.get(`sessions:${config.client.id}`);
			if (!data) {
				data = await this.client.getBotGateway();
				data.timestamp = (new Date()).toISOString();
				redis.setex(`sessions:${config.client.id}`, 60, JSON.stringify(data));
			} else {
				data = JSON.parse(data);
			}
		} catch (err) {
			data = await this.client.getBotGateway();
			data.timestamp = (new Date()).toISOString();
			redis.setex(`sessions:${config.client.id}`, 60, JSON.stringify(data));
		}

		if (!data) {
			return res.status(500).send('Internal server error.');
		}

		let resetAfter = moment.duration(data.session_start_limit.reset_after, 'milliseconds'),
			resetAfterDate = moment().subtract(data.session_start_limit.reset_after, 'milliseconds').format('llll');

		const result = {
			'Recommended Shards': data.shards.toString(),
			'Session Limit': data.session_start_limit.total.toString(),
			'Session Remaining': data.session_start_limit.remaining.toString(),
			'Reset After': resetAfter.format('d [days], h [hrs], m [min], s [sec]'),
			'Reset After Date': resetAfterDate,
			'Timestamp': data.timestamp,
		};

		return res.status(200).send(result);
	}
}

module.exports = Sessions;
