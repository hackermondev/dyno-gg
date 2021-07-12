'use strict';

const Base = Loader.require('./core/structures/Base');

class Purger extends Base {
	getMessages(channel, limit) {
		return new Promise(resolve => {
			this.client.getMessages(channel.id, limit).then(messages => {
				if (!messages || !messages.length) return resolve();
				return resolve(messages);
			}).catch(() => resolve());
		});
	}

	deleteMessages(channel, messages) {
		if (!messages || !messages.length) {
			return Promise.resolve();
		}

		let channelID = typeof channel === 'string' ? channel : channel.id;

		let messageIds = messages.filter(m => {
			if (m.pinned) return false;
			if (!m.timestamp) return true;
			if ((Date.now() - m.timestamp) > (14 * 24 * 60 * 60 * 1000)) {
				return false;
			}
			return true;
		}).map(m => m.id);

		if (!messageIds.length) {
			return Promise.resolve();
		}

		return new Promise(resolve =>
			this.client.deleteMessages(channelID, messageIds)
				.catch(resolve)
				.then(resolve));
	}

	purge(channel, limit) {
		return this.getMessages(channel, 5000)
			.then(messages => this.deleteMessages(channel, messages));
	}
}

module.exports = Purger;
