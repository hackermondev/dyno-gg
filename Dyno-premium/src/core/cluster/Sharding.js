'use strict';

const os = require('os');
const Eris = require('eris');
const superagent = require('superagent');
const config = require('../config');
const logger = require('../logger');

/**
 * @class Sharding
 */
class Sharding {
	/**
	 * Sharding manager
	 * @param {Manager} manager Cluster Manager instance
	 */
	constructor(manager) {
		this.manager = manager;
		this.logger = manager.logger;
		this.shardCount = os.cpus().length;
	}

	/**
	 * Alias for process strategy
	 */
	createShardsProcess() {
		return this.process();
	}

	/**
	 * Alias for shared strategy
	 */
	createShardsShared() {
		return this.shared();
	}

	/**
	 * Alias for balanced strategy
	 */
	createShardsBalancedCores() {
		return this.balanced();
	}

	/**
	 * Alias for semibalanced strategy
	 */
	createShardsSemiBalanced() {
		return this.semibalanced();
	}

	/**
	 * Create clusters sequentially
	 */
	async process() {
		const shardCount = await this.getShardCount();

		const shardIds = config.shardIds || [];

		this.shardCount = shardCount;
		this.manager.events.register();

		this.logger.log(`[Sharding] Starting with ${shardIds.length || shardCount} shards.`);

		for (let i = 0; i < shardCount; i++) {
			if (shardIds.length && !shardIds.includes(i.toString())) continue;

			this.manager.createCluster({
				id: i,
				shardCount,
			});
			await Promise.delay(6500);
		}
	}

	/**
	 * Create a shared state instance
	 */
	async shared() {
		const shardCount = await this.getShardCount();

		this.shardCount = shardCount;
		this.manager.events.register();
		this.logger.log(`[Sharding] Starting with ${shardCount} shards.`);

		this.manager.createCluster({
			id: 0,
			clusterCount: 1,
			shardCount: shardCount,
			firstShardId: 0,
			lastShardId: shardCount - 1,
		});
	}

	/**
	 * Create shards balanced across all cores
	 * @param  {Boolean|undefined} semi If false, round up to a multiple of core count
	 */
	async balanced(semi) {
		const shardCount = config.shardCountOverride || await this.getShardCount(semi);
		const len = config.clusterCount || os.cpus().length;

		let firstShardId = config.firstShardOverride || 0,
			lastShardId = config.lastShardOverride || 0;

		const localShardCount = config.shardCountOverride ? (lastShardId + 1) - firstShardId : shardCount;

		let shardCounts = [];
		let mod = localShardCount % len;

		this.shardCount = shardCount;

		for (let i = 0; i < len; i++) {
			shardCounts[i] = Math.floor(localShardCount / len);
			if (mod > 0) {
				shardCounts[i]++;
				mod--;
			}
		}

		this.manager.events.register();
		this.logger.log(`[Sharding] Starting with ${localShardCount} shards in ${len} clusters.`);

		const clusterIds = config.clusterIds || [];

		for (let i in shardCounts) {
			const count = shardCounts[i];
			lastShardId = (firstShardId + count) - 1;

			if (clusterIds.length && !clusterIds.includes(i.toString())) {
				firstShardId += count;
				continue;
			}

			await this.manager.createCluster({
				id: i,
				clusterCount: len,
				shardCount,
				firstShardId,
				lastShardId,
			});

			firstShardId += count;
		}
	}

	/**
	 * Create shards semi-balanced across all ores
	 */
	async semibalanced() {
		return this.balanced(true);
	}

	/**
	 * Get estimated guild count
	 */
	async getEstimatedGuilds() {
		const client = new Eris(config.client.token);

		try {
			var data = await client.getBotGateway();
		} catch (err) {
			return Promise.resolve();
		}

		if (!data || !data.shards) return Promise.resolve();

		logger.info(`[Sharding] Discord suggested ${data.shards} shards.`);
		return Promise.resolve(parseInt(data.shards) * 1000);
	}

	/**
	 * Fetch guild count with fallbacks in the event of an error
	 * @return {Number} Guild count
	 */
	async fetchGuildCount() {
		let res, guildCount;

		guildCount = await this.getEstimatedGuilds();

		if (guildCount) return guildCount;

		try {
			res = await superagent
				.get(config.dbots.url)
				.set('Authorization', config.dbots.key)
				.set('Accept', 'application/json')
				.timeout(5000);

			if (!res || !res.body || !res.body.stats) {
				throw new Error(`Invalid response from Carbonitex`);
			}

			guildCount = res.body.stats.reduce((a, b) => {
				a += b.server_count;
				return a;
			}, 0);

			if (!guildCount || isNaN(guildCount)) {
				throw new Error('Unable to get guild count.');
			}
		} catch (err) {
			res = await superagent
				.get(config.carbon.info)
				.set('Accept', 'application/json')
				.timeout(5000);

			if (!res || !res.body) {
				throw new Error(`Invalid response from bots.discord.pw`);
			}

			guildCount = res.body.servercount || res.body.server_count || null;

			if (!guildCount || isNaN(guildCount)) {
				throw new Error('Unable to get guild count.');
			}
		}

		return guildCount;
	}

	/**
	 * Get shard count to start
	 * @param  {Boolean} balanced Whether or not to round up
	 * @return {Number} Shard count
	 */
	async getShardCount(balanced) {
		try {
			var guildCount = await this.fetchGuildCount();
		} catch (err) {
			throw new Error(err);
		}

		if (!guildCount || isNaN(guildCount)) {
			throw new Error('Unable to get guild count.');
		}

		guildCount = parseInt(guildCount);

		logger.debug(`${guildCount} Guilds`);

		if (guildCount < 2500) {
			guildCount = 2500;
		}

		let n = balanced ? os.cpus().length : 2;

		const shardCalc = Math.round((Math.ceil(guildCount / 2500) * 2500) / 1400);
		return Math.max(this.shardCount, n * Math.ceil(shardCalc / n));
	}
}

module.exports = Sharding;
