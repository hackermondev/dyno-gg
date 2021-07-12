'use strict';

const Collection = require('./Collection');
const logger = require('../core/logger');
const { Server } = require('../core/models');

/**
 * @class GuildCollection
 * @extends Collection
 */
class GuildCollection extends Collection {
	/**
	 * A collection of guild configurations
	 */
	constructor() {
		super();

		setInterval(this.uncacheGuilds.bind(this), 300000);
	}

	uncacheGuilds() {
		for (const [id, guild] of this.entries()) {
			if ((Date.now() - guild.cachedAt) > 300) {
				this.delete(id);
			}
		}
	}

	/**
	 * Get or fetch a guild, no async/await for performance reasons
	 * @param {String} id Guild ID
	 * @returns {Promise}
	 */
	getOrFetch(id) {
		const guild = this.get(id);

		if (guild) return Promise.resolve(guild);

		return new Promise((resolve) => {
			Server.findOne({ _id: id })
				.lean()
				.exec()
				.then(doc => {
					if (!doc) return resolve();

					doc.cachedAt = Date.now();

					this.set(doc._id, doc);
					return resolve(doc);
				})
				.catch(err => {
					logger.error(err);
					return resolve();
				});
		});
	}

	/**
	 * Fetch a guild from the database
	 * @param {String} id Guild ID
	 * @returns {Promise}
	 */
	async fetch(id) {
		try {
			const doc = await Server.findOne({ _id: id }).lean().exec();

			if (!doc) return Promise.resolve();

			this.set(doc._id, doc);
			return Promise.resolve(doc);
		} catch (e) {
			return Promise.reject(e);
		}
	}
}

module.exports = GuildCollection;
