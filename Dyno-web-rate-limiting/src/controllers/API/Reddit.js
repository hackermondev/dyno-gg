'use strict';

const moment = require('moment');
const { ObjectID } = require('mongodb');
const superagent = require('superagent');
const Controller = require('../../core/Controller');
const config = require('../../core/config');
const db = require('../../core/models');
const logger = require('../../core/logger').get('Automessage');

class Reddit extends Controller {
	constructor(bot) {
		super(bot);

		const basePath = '/api/server/:id/reddit';

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

	getDocs(guild, subreddit, messageType) {
		return db.collection('reddits').find({ guildId: guild, subreddit, messageType }).toArray();
	}

	async getOrCreateWebhook(channelId, reason) {
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
			const webhook = await this.client.createChannelWebhook(channelId, {
				name: 'Dyno',
				avatar: res.body,
			}, reason);

			return Promise.resolve(webhook);
		} catch (err) {
			return Promise.reject(err);
		}
	}

	async create(bot, req, res) {
		let {
			subreddit,
			channel,
			messageType,
			blurNsfw,
			includeNsfw,
			flair,
		} = req.body;

		if (!subreddit) {
			return res.status(400).send('Missing required subreddit.');
		}
		if (!channel) {
			return res.status(400).send('Missing required channel.');
		}
		if (!messageType || !['simple', 'embed'].includes(messageType)) {
			return res.status(400).send('Missing/invalid messageType.');
		}

		if (blurNsfw === undefined) {
			blurNsfw = true;
		}

		if (includeNsfw === undefined) {
			includeNsfw = false;
		}

		let webhook;

		try {
			webhook = await this.getOrCreateWebhook(channel);
		} catch (err) {
			logger.error(err);
			return res.status(500).send('Failed to create webhook');
		}

		if (!webhook) {
			return res.status(500).send('Webhook is invalid (null)');
		}

		const guildConfig = await config.guilds.getOrFetch(req.params.id);
		if (!guildConfig) {
			return res.status(500).send('Couldn\'t fetch guild config');
		}

		try {
			// const docs = await this.getDocs(req.params.id, subreddit, messageType);
			// if (docs && docs.length > 0) {
			// 	if (docs.filter(d => d.flair && d.flair.some(f => flair.includes(f))).length > 0) {
			// 		return res.status(400).send('Subscription already exists');
			// 	}
			// }


			const doc = {
				guildId: req.params.id,
				channelId: channel,
				webhookId: webhook.id,
				webhookToken: webhook.token,
				includeNsfw,
				blurNsfw,
				messageType,
				subreddit: subreddit.toLowerCase(),
				subredditOriginal: subreddit,
				createdAt: new Date(),
			};

			if (flair) {
				doc.flair = flair;
			}

			await db.collection('reddits').insertOne(doc);

			this.weblog(req, req.params.id, req.session.user, 'Added reddit subscription.');
			return res.send('Added reddit subscription.');
		} catch (err) {
			logger.error(err);
			return res.status(500).send('Something went wrong.');
		}
	}

	async delete(bot, req, res) {
		if (!req.body._id) {
			return res.status(400).send('Missing required id.');
		}

		let {
			subreddit,
			messageType,
			_id,
		} = req.body;

		try {
			const docs = await this.getDocs(req.params.id, subreddit, messageType);
			if (!docs || !docs.length) {
				return res.status(400).send(`Subscription not found.`);
			}

			await db.collection('reddits').deleteOne({ _id: new ObjectID(_id) });

			this.weblog(req, req.params.id, req.session.user, 'Deleted reddit subscription.');
			return res.send('Deleted reddit subscription.');
		} catch (err) {
			logger.error(err);
			return res.status(500).send('Something went wrong.');
		}
	}
}

module.exports = Reddit;
