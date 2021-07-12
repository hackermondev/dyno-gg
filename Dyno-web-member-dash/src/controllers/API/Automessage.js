'use strict';

const moment = require('moment');
const { ObjectID } = require('mongodb');
const superagent = require('superagent');
const Controller = require('../../core/Controller');
const config = require('../../core/config');
const db = require('../../core/models');

class Automessage extends Controller {
	constructor(bot) {
		super(bot);

		const basePath = '/api/server/:id/automessage';

		return {
			create: {
				method: 'post',
				uri: `${basePath}/create`,
				handler: this.create.bind(this),
			},
			delete: {
				method: 'post',
				uri: `${basePath}/delete`,
				handler: this.delete.bind(this),
			},
		};
	}

	getDocs(guildId, channelId) {
		return db.collection('automessages').find({ guild: guildId, channel: channelId }).toArray();
	}

	async getOrCreateWebhook(channelId) {
		try {
			const webhooks = await this.client.getChannelWebhooks(channelId);

			if (webhooks && webhooks.length) {
				const webhook = webhooks.find(hook => hook.name === 'Dyno');
				if (webhook) {
					return Promise.resolve(webhook);
				}
			}

			const avatarURL = `https://cdn.discordapp.com/avatars/${this.bot.user.id}/${this.bot.user.avatar}.png?size=128`;
			const res = await superagent.get(avatarURL).buffer(true);
			const webhook = await this.client.createWebhook(channelId, {
				name: 'Dyno',
				avatar: res.body,
			});

			return Promise.resolve(webhook);
		} catch (err) {
			return Promise.reject(err);
		}
	}

	async create(bot, req, res) {
		if (!req.body.interval) {
			return res.status(400).send('Missing required interval.');
		}
		if (!req.body.channel) {
			return res.status(400).send('Missing required channel.');
		}

		let webhook;

		try {
			webhook = await this.getOrCreateWebhook(req.body.channel);
		} catch (err) {
			return res.status(500).send('Something went wrong.');
		}

		if (!webhook) {
			return res.status(500).send('Something went wrong.');
		}

		const guildConfig = await config.guilds.getOrFetch(req.params.id);
		if (!guildConfig) {
			return res.status(500).send('Something went wrong.');
		}
		let { interval, channel } = req.body;

		interval *= 60;

		if (!guildConfig.isPremium && (interval < 60 || interval > 4320)) {
			return res.status(400).send('Post interval must be more than 1 hour and no more than 3 days.');
		}

		try {
			const docs = await this.getDocs(req.params.id, channel);
			if (!guildConfig.isPremium && docs && docs.length) {
				return res.status(400).send('Auto message limit reached.');
			}

			const doc = {
				guild: req.params.id,
				channel: channel,
				content: req.body.messageContent,
				interval: interval,
				webhook: webhook,
				nextPost: moment().add(interval, 'minutes').toDate(),
				createdAt: new Date(),
			};

			await db.collection('automessages').insertOne(doc);

			this.weblog(req, req.params.id, req.session.user, 'Added auto message.');
			return res.send('Added auto message.');
		} catch (err) {
			console.error(err);
			return res.status(500).send('Something went wrong.');
		}
	}

	async delete(bot, req, res) {
		if (!req.body.channel) {
			return res.status(400).send('Missing required channel.');
		}

		try {
			const docs = await this.getDocs(req.params.id, req.body.channel.id);
			if (!docs || !docs.length) {
				return res.status(400).send(`Auto message is not enabled for that channel.`);
			}

			await db.collection('automessages').deleteOne({ _id: new ObjectID(req.body.message._id) });

			this.weblog(req, req.params.id, req.session.user, 'Deleted auto message.');
			return res.send('Deleted auto message.');
		} catch (err) {
			return res.status(500).send('Something went wrong.');
		}
	}
}

module.exports = Automessage;
