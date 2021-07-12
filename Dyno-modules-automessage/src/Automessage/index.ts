import {Module} from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';
import * as each from 'async-each';
import * as dyno from 'Dyno';
import * as moment from 'moment';

/**
 * Automessage Module
 * @class Automessage
 * @extends Module
 */
export default class Automessage extends Module {
	public module      : string   = 'Automessage';
	public friendlyName: string   = 'Auto Message';
	public description : string   = 'Automatically post timed messages in a channel.';
	public list        : boolean  = true;
	public enabled     : boolean  = true;
	public hasPartial  : boolean  = false;

	public start() {
		this.schedule('*/1 * * * *', this.post.bind(this));
	}

	public async post() {
		let docs;
		try {
			docs = await this.models.Automessage.find({ nextPost: { $lte: Date.now() } }).lean().exec();
		} catch (err) {
			return this.logger.error(err);
		}

		if (!docs || !docs.length) {
			return;
		}

		this.logger.debug(`Found ${docs.length} messages to post.`);

		each(docs, (doc: any, next: any) => {
			if (!this.client.guilds.has(doc.guild)) {
				return next();
			}

			if (doc.disabled) {
				return next();
			}

			this.logger.debug(`Posting ${doc.guild}`);

			const options: any = {};

			if (doc.content) {
				options.content = doc.content;
			}

			if (doc.embed) {
				options.embeds = [doc.embed];
			}

			this.postWebhook(doc.channel, doc.webhook, options)
				.then(() => {
					const nextPost = moment().add(doc.interval, 'minutes');
					return this.models.Automessage.update({ _id: doc._id }, { $set: { nextPost: nextPost } }).catch(() => null);
				})
				.catch(() => {
					let update = { $inc: { errorCount: 1 } };
					if (doc.errorCount >= 5) {
						update = Object.assign(update, {
							$set: { disabled: true },
						});
					}
					return this.models.Automessage.update({ _id: doc._id }, update).catch(() => null);
				})
				.then(next);
		});
	}

	public postWebhook(channelId: string, webhook: any, options: any) {
		const avatarURL = `https://cdn.discordapp.com/avatars/${this.dyno.user.id}/${this.dyno.user.avatar}.jpg?r=${this.config.version}`;

		let payload = {
			username: 'Dyno',
			avatarURL: avatarURL,
			tts: false,
			wait: true,
		};

		payload = Object.assign(payload, options);

		return this.client.executeWebhook(webhook.id, webhook.token, payload);
	}
}
