'use strict';

const utils = Loader.require('./core/utils');
const logger = Loader.require('./core/logger');
const { Queue } = require('../../core/models');

/**
 * @class Queue
 * @extends Map
 */
class QueueCollection extends Map {
	/**
	 * Represents the music queue collection
	 * @param {Music} music Music instance
	 */
	constructor(music) {
		super();

		this._dyno   = music.dyno;
		this._client = music.client;
		this._config = music.config;
		this._logger = music.logger;

		// this.load();
	}

	fetch(guildId) {
		const result = this.get(guildId);
		if (result) return Promise.resolve(result);

		return new Promise((resolve, reject) =>
			Queue.findOne({ guild: guildId }).lean().exec()
			.then(doc => resolve(doc && doc.queue ? doc.queue : []))
			.catch(err => {
				const guild = this._client.guilds.get(guildId);
				logger.error(err, {
					type: 'queue.fetch',
					guild: guild.id,
					shard: guild.shard.id,
				});
				return reject('Something went wrong.');
			}));
	}

	/**
	 * Save a guild queue to the database
	 * @param {String} guildId Guild ID
	 * @param {Array} queue Queue array
	 */
	save(guildId, queue) {
		this.set(guildId, queue);

		return new Promise((resolve, reject) => {
			process.nextTick(() => {
				Queue.update({ guild: guildId }, { $set: { guild: guildId, queue } }, { upsert: true })
					.then(resolve)
					.catch(err => {
						const guild = this._client.guilds.get(guildId);
						logger.error(err, {
							type: 'queue.save',
							guild: guild.id,
							shard: guild.shard.id,
						});
						return reject(err);
					});
			});
		});
	}

	/**
	 * Check if the queue is empty
	 * @param {String} guildId Guild ID
	 * @returns {Promise}
	 */
	isEmpty(guildId) {
		return new Promise(resolve => this.fetch(guildId).then(queue => resolve(!queue || !queue.length)));
	}

	/**
	 * Shift the queue
	 * @param {String} guildId Guild ID
	 */
	shift(guildId, forceRemove) {
		return new Promise(resolve => {
			this.fetch(guildId).then(queue => {
				if (!queue || !queue.length) return resolve();

				this._dyno.guilds.getOrFetch(guildId).then(guildConfig => {
					if (!guildConfig) return resolve();

					// shift the queue
					const active = queue.shift();

					// push to the queue if repeating
					if (!forceRemove && guildConfig.music && guildConfig.music.repeat) {
						queue.push(active);
					}

					this.save(guildId, queue);

					return resolve(queue);
				})
				.catch(() => resolve());
			});
		});
	}

	/**
	 * Add an item to the queue
	 * @param {String} guildId Guild ID
	 * @param {Object} info Media info
	 * @param {Boolean} [prepend] Prepend to the list rather than append
	 */
	add(guildId, info, prepend) {
		return new Promise((resolve, reject) => this.fetch(guildId).then(queue => {
			queue = queue || [];

			if (queue.find(i => i.video_id === info.video_id)) {
				return reject(`That video is in queue.`);
			}

			if (prepend) {
				queue.unshift(info);
			} else {
				queue.push(info);
			}

			this.save(guildId, queue);

			return resolve(queue);
		}));
	}

	/**
	 * Remove an item from queue
	 * @param {String} guildId Guild ID
	 * @param {Number} [index] Index in queue
	 * @returns {Object|false}
	 */
	async remove(guildId, index) {
		// return if there's nothing in queue
		if (await this.isEmpty(guildId)) {
			throw new Error('The queue is empty');
		}

		const queue = await this.fetch(guildId);
		let result;

		// remove the first song if there's no index
		if (!index) {
			result = queue.shift();
		} else {
			result = queue.splice(--index, 1).shift();
		}

		this.save(guildId, queue);

		return Promise.resolve(result);
	}

	async shuffle(guildId) {
		if (await this.isEmpty(guildId)) {
			throw new Error('The queue is empty');
		}

		let queue = await this.fetch(guildId);
		queue = utils.shuffleArray(queue);

		this.save(guildId, queue);

		await utils.nextTick();

		return queue;
	}

	/**
	 * Clear the queue
	 * @param {String} guildId Guild ID
	 */
	clear(guildId) {
		this.save(guildId, []);
	}
}

module.exports = QueueCollection;
