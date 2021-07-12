import * as eris from '@dyno.gg/eris';
import Base from '../structures/Base';

export default class Purger extends Base {
	public async getMessages(channel: eris.TextChannel, options: any = {}) {
		const channelId = typeof channel === 'string' ? channel : channel.id || null;
		if (!channelId) {
			return Promise.resolve();
		}

		let messages;
		try {
			messages = await this.client.getMessages(channelId, options.limit || 5000, options.before || null);
		} catch (err) {
			this.logger.error(err);
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

	public deleteMessages(channel: eris.TextChannel, messages: eris.Message[]) {
		if (!messages || !messages.length) {
			return Promise.resolve();
		}

		const channelId = typeof channel === 'string' ? channel : channel.id || null;
		if (!channelId) {
			return Promise.reject('Inavlid channel');
		}

		const messageIds = messages.filter((m: eris.Message) => {
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
		}).map((m: eris.Message) => m.id);

		if (!messageIds.length) {
			return Promise.resolve();
		}

		return new Promise((resolve: Function, reject: Function) =>
			this.client.deleteMessages(channelId, messageIds)
				.catch((err: any) => {
					this.prom.register.getSingleMetric('dyno_app_purge_failed').inc();
					return reject(err);
				})
				.then(() => {
					this.prom.register.getSingleMetric('dyno_app_purge_success').inc();
					return resolve();
				}));
	}

	public purge(channel: eris.TextChannel, options: any) {
		return this.getMessages(channel, options)
			.then((messages: eris.Message[]) => {
				if (!messages || !messages.length) {
					return;
				}
				this.logger.debug(`Got ${messages.length} messages.`);
				this.deleteMessages(channel, messages);
			});
	}
}
