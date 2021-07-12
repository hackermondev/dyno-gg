'use strict';

const { Collection, Module } = require('@dyno.gg/dyno-core');
const blocked = require('blocked');
const moment = require('moment');
const superagent = require('superagent');

/**
 * ShardStatus module
 * @class ShardStatus
 * @extends Module
 */
class ShardStatus extends Module {
	constructor(...args) {
		super(...args);

		this.module = 'ShardStatus';
		this.description = 'Dyno core module.';
		this.core = true;
		this.list = false;
		this.enabled = true;
		this.hasPartial = false;
	}

	static get name() {
		return 'ShardStatus';
	}

	start() {
		this.shardListeners = new Collection();

		this.shardListeners.set('shardReady', this.shardReady.bind(this));
		this.shardListeners.set('shardResume', this.shardResume.bind(this));
		this.shardListeners.set('shardDisconnect', this.shardDisconnect.bind(this));

		for (let [event, listener] of this.shardListeners) {
			this.client.on(event, listener);
		}

		this.blockHandler = blocked(ms => {
			const id = this.cluster.clusterId.toString();
			const text = `C${id} blocked for ${ms}ms`;
			this.logger.info(`[Dyno] ${text}`);
			this.dyno.ipc.send('blocked', text);
		}, { threshold: 1000 });
	}

	unload() {
		if (this.blockHandler) {
			clearInterval(this.blockHandler);
			this.blockHandler = null;
		}
		if (!this.shardListeners.size) return;
		for (let [event, listener] of this.shardListeners) {
			this.client.removeListener(event, listener);
		}
	}

	/**
	 * Shard ready handler
	 * @param  {Number} id Shard ID
	 */
	shardReady(id) {
		this.logger.info(`[Dyno] Shard ${id} ready.`);
		this.dyno.ipc.send(`shardReady`, id.toString());
		this.postStat('ready');
	}

	/**
	 * Shard resume handler
	 * @param  {Number} id Shard ID
	 */
	shardResume(id) {
		this.logger.info(`[Dyno] Shard ${id} resumed.`);
		this.dyno.ipc.send('shardResume', id.toString());
		this.postStat('resume');
	}

	/**
	 * Shard disconnect handler
	 * @param  {Error} err Error if one is passed
	 * @param  {Number} id  Shard ID
	 */
	shardDisconnect(err, id) {
		if (err) {
			const shard = this.client.shards.get(id);
			this.logger.warn(err, { type: 'dyno.shardDisconnect', cluster: this.cluster.clusterId, shard: id, trace: shard.discordServerTrace });
		}

		this.logger.info(`[Dyno] Shard ${id} disconnected`);

		let data = { id };
		if (err && err.message) data.error = err.message;

		this.dyno.ipc.send('shardDisconnect', data);
		this.postStat('disconnect');
	}

	postShardStatus(text, fields) {
		if (!this.config.shardWebhook) return;
		if (this.config.state === 2) return;

		const payload = {
            username: 'Shard Manager',
            avatar_url: `${this.config.avatar}`,
            embeds: [],
            tts: false,
        };

        const embed = {
			title: text,
			timestamp: new Date(),
			footer: {
				text: this.config.stateName,
			},
        };

        if (fields) embed.fields = fields;

        payload.embeds.push(embed);

        this.postWebhook(this.config.shardWebhook, payload);
	}

	async postStat(key) {
		const day = moment().format('YYYYMMDD');
		const hr = moment().format('YYYYMMDDHH');

		this.statsd.increment(`discord.shard.${key}`, 1);

		const [dayExists, hrExists] = await Promise.all([
			this.redis.exists(`shard.${key}.${day}`),
			this.redis.exists(`shard.${key}.${hr}`),
		]);

		const multi = this.redis.multi();

		multi.incrby(`shard.${key}.${day}`, 1);
		multi.incrby(`shard.${key}.${hr}`, 1);

		if (!dayExists) {
			multi.expire(`shard.${key}.${day}`, 604800);
		}

		if (!hrExists) {
			multi.expire(`shard.${key}.${hr}`, 259200);
		}

		multi.exec().catch(err => this.logger.error(err));
	}

	postWebhook(webhook, payload) {
		return new Promise((resolve, reject) => {
			superagent
				.post(webhook)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json')
				.send(payload)
				.then(resolve)
				.catch(reject);
			});
	}
}

module.exports = ShardStatus;
