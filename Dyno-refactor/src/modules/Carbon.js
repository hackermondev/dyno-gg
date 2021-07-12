'use strict';

const superagent = require('superagent');
const { Module } = require('@dyno.gg/dyno-core');

/**
 * Carbon Module
 * @class Carbon
 * @extends Module
 */
class Carbon extends Module {
	constructor(...args) {
		super(...args);

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
		if (this.config.state !== 3 || this.dyno.clientOptions.clusterId !== 0) return;

		this.info('Updating carbon stats.');

		try {
			var guildCounts = await this.redis.hgetall(`dyno:guilds:${this.config.client.id}`);
		} catch (err) {
			return this.logger.error(err);
		}

		let guildCount = Object.values(guildCounts).reduce((a, b) => a += parseInt(b), 0);

		this.statsd.gauge(`guilds.${this.config.client.id}`, guildCount);

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
		
		// Post to discordbots.org
		superagent
			.post(this.config.dbl.url)
			.send(data)
			.set('Authorization', this.config.dbl.key)
			.set('Accept', 'application/json')
			.end(() => false);

		// Post to discordbots.org
		superagent
			.post(this.config.botspace.url)
			.send({ server_count: data.server_count })
			.set('Authorization', this.config.botspace.key)
			.set('Accept', 'application/json')
			.end(() => false);
	}
}

module.exports = Carbon;
