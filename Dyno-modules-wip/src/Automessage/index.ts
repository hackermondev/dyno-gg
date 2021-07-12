import { Module } from '@dyno.gg/dyno-core';
import * as each from 'async-each';
import * as moment from 'moment';
import { default as Model } from './models/Automessage';

/**
 * Automessage Module
 * @class Automessage
 * @extends Module
 */
export default class Automessage extends Module {
	public module      : string  = 'Automessage';
	public friendlyName: string  = 'Auto Message';
	public description : string  = 'Automatically post timed messages in a channel.';
	public list        : boolean = true;
	public enabled     : boolean = true;
	public hasPartial  : boolean = true;
	public moduleModels: any[]   = [Model];

	public start() {
		this.schedule('1,16,31,46 * * * * *', this.post.bind(this));
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

		each(docs, async (doc: any, next: any) => {
			if (doc.disabled) {
				return next();
			}

			const guild = this.client.guilds.get(doc.guild);
			if (!guild) {
				return next();
			}

			const guildConfig = await this.dyno.guilds.getOrFetch(doc.guild);
			if (!this.isEnabled(guild, this.module, guildConfig)) {
				if (!guildConfig.modules.Automessage || guildConfig.modules.Automessage === false) {
					this.models.Automessage.remove({ _id: doc._id }).catch(() => null);
				}
				return next();
			}

			const channel = guild.channels.get(doc.channel);
			if (!channel) {
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
					const second = moment().second();
					const nextPost = moment()
						.add(doc.interval, 'minutes')
						.subtract(second % 15, 'seconds')
						.toDate();

					this.statsd.increment('automessage.success', 1);
					return this.models.Automessage.update({ _id: doc._id }, { $set: { nextPost: nextPost } }).catch(() => null);
				})
				.catch(() => {
					let update = { $inc: { errorCount: 1 } };
					this.statsd.increment('automessage.error', 1);
					if (doc.errorCount >= 5) {
						update = Object.assign(update, {
							$set: { disabled: true, disabledAt: moment().toDate() },
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
