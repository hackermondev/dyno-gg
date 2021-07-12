const logger = require('../logger')('Purger', 'autopurge');

class Purger {
    constructor(client) {
        this.client = client;
    }

	async getMessages(channel, options = {}) {
		const channelId = typeof channel === 'string' ? channel : channel.id || null;
		if (!channelId) {
			return Promise.resolve();
		}

		let messages;
		try {
			messages = await this.client.getMessages(channelId, options.limit || 5000, options.before || null);
		} catch (err) {
			logger.error(err);
			return Promise.resolve();
		}

		if (!messages || !messages.length) {
			return Promise.resolve();
		}
		if (options.filter) {
			messages = messages.filter(options.filter);
		}
		if (options.slice) {
			const count = options.slice > messages.length ? messages.length : options.slice;
			messages = messages.slice(0, count);
		}

		return Promise.resolve(messages);
	}

	deleteMessages(channel, messages) {
		if (!messages || !messages.length) {
			return Promise.resolve();
		}

		const channelId = typeof channel === 'string' ? channel : channel.id || null;
		if (!channelId) {
			return Promise.reject('Inavlid channel');
		}

		const messageIds = messages.filter(m => {
			if (m.pinned) {
				return false;
			}
			if (!m.timestamp) {
				return true;
			}
			if ((Date.now() - m.timestamp) > (14 * 24 * 60 * 60 * 1000)) {
				return false;
			}
			return true;
		}).map(m => m.id);

		if (!messageIds.length) {
			return Promise.resolve();
		}

		return new Promise((resolve, reject) =>
			this.client.deleteMessages(channelId, messageIds)
				.catch(err => {
					// this.statsd.increment('purge.error');
					return reject(err);
				})
				.then(() => {
					// this.statsd.increment('purge.success');
					return resolve();
				}));
	}

	purge(channel, options) {
		return this.getMessages(channel, options)
			.then((messages) => {
				if (!messages || !messages.length) {
					return;
				}
				logger.debug(`Got ${messages.length} messages.`);
				this.deleteMessages(channel, messages);
			});
	}
}

module.exports = Purger;
