'use strict';

const superagent = require('superagent');
const Module = Loader.require('./core/structures/Module');
const statsd = require('../core/statsd');

/**
 * Carbon Module
 * @class Carbon
 * @extends Module
 */
class Carbon extends Module {
	constructor() {
		super();

		this.module = 'Carbon';
		this.enabled = true;
		this.core = true;
		this.list = false;
	}

	static get name() {
		return 'Carbon';
	}

	start() {
		this.schedule('*/1 * * * *', this.updateCarbon.bind(this));
	}

	async updateCarbon() {
		if (!this.dyno.isReady) return;
		if (this.config.state !== 3 || this.dyno.options.clusterId !== 0) return;

		this.info('Updating carbon stats.');

		try {
			var guildCounts = await this.redis.hgetallAsync(`dyno:guilds:${this.config.client.id}`);
		} catch (err) {
			return this.logger.error(err);
		}

		let guildCount = Object.values(guildCounts).reduce((a, b) => { a += parseInt(b); return a; }, 0);

		statsd.gauge(`guilds.${this.config.client.id}`, guildCount);

		const data = {
			shard_id: 0,
			shard_count: 1,
			server_count: guildCount,
		};

		// Post to carbonitex
		superagent
			.post(this.config.carbon.url)
			.send(Object.assign({ key: this.config.carbon.key }, Object.assign(data, {
				logoid: `https://www.dynobot.net/images/dyno-v2-300.jpg`,
			})))
			.set('Accept', 'application/json')
			.end(err => err ? this.logger.error(err) : false);

		// Post to bots.discord.pw
		superagent
			.post(this.config.dbots.url)
			.send(data)
			.set('Authorization', this.config.dbots.key)
			.set('Accept', 'application/json')
			.end(() => false); // ignore timeouts
	}
}

module.exports = Carbon;
