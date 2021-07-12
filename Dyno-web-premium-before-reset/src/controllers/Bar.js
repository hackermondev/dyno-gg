'use strict';

const accounting = require('accounting');
const Controller = require('../core/Controller');
const redis = require('../core/redis');
const moment = require('moment');

/**
 * Bar controller
 * @class Bar
 * @extends {Controller}
 */
class Bar extends Controller {

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
				uri: '/bar/stats',
				handler: this.stats.bind(this),
			},
		};
	}

	async stats(bot, req, res) {
		const [guildCounts, vc] = await Promise.all([
			redis.hgetall(`dyno:guilds:161660517914509312`),
			redis.hgetall(`dyno:vc`),
		]).catch(() => false);

		const data = {};

		data.guilds = accounting.formatNumber(Object.values(guildCounts).reduce((a, b) => a += parseInt(b), 0));
		data.connections = accounting.formatNumber([...Object.values(vc)].reduce((a, b) => a + parseInt(b), 0));

		const date = moment().subtract(1, 'days');
		let reconnectCount = 0;
		const multi = redis.multi();
		for (let i = 0; i < 24; i++) {
			multi.get(`shard.ready.${date.format('YYYYMMDDHH')}`);
			date.add(1, 'hours');
		}

		const result = await multi.exec();
		result.forEach((i) => {
			if (i[1]) {
				reconnectCount += Number.parseInt(i[1]);
			}
		});

		data.reconnectCount = reconnectCount;
		return res.send(data);
	}
}

module.exports = Bar;
