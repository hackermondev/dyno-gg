'use strict';

const Controller = require('../../core/Controller');
const logger = require('../../core/logger');
const { models } = require('../../core/models');
const config = require('../../core/config');

class MessageEmbed extends Controller {
	constructor(bot) {
		super(bot);

		const basePath = '/api/server/:id/messageEmbed';

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
			edit: {
				method: 'post',
				uri: `${basePath}/edit`,
				handler: this.edit.bind(this),
			},
		};
	}

	getDocs(guildId) {
		return models.MessageEmbed.find({ guild: guildId }).lean().exec();
	}

	async create(bot, req, res) {
		if (!req.body.message) {
			return res.status(400).send('Missing required message.');
		}

		const guildConfig = await config.guilds.fetch(req.params.id);
		if (!guildConfig) {
			return res.status(500).send('Something went wrong.');
		}

		if (!guildConfig.isPremium) {
			return res.status(500).send('Premium verification failed');
		}

		let { name, channel, embed } = req.body.message;

		if (!name || !channel || !embed) {
			return res.status(400).send('Missing required parameters.');
		}

		try {
			const message = await this.client.createMessage(channel, { embed });
			const doc = new models.MessageEmbed(req.body.message);
			doc.message = message.id;
			await doc.save();

			this.weblog(req, req.params.id, req.session.user, `Created Message Embed ${name} #${channel.name}.`);

			return res.send({ message: doc });
		} catch (err) {
			logger.error(err);
			return res.status(500).send('Something went wrong.');
		}
	}

	async delete(bot, req, res) {
		if (!req.body.message) {
			return res.status(400).send('Missing required message.');
		}

		const guildConfig = await config.guilds.fetch(req.params.id);
		if (!guildConfig) {
			return res.status(500).send('Something went wrong.');
		}

		if (!guildConfig.isPremium) {
			return res.status(500).send('Premium verification failed');
		}

		const doc = req.body.message;
		const channel = typeof doc.channel === 'object' ? doc.channel.id : doc.channel;

		if (typeof channel !== 'string') {
			return res.status(500).send('Something went wrong, please try refreshing.');
		}

		try {
			await this.client.deleteMessage(channel, doc.message);
		} catch (err) {
			if (err.response && err.response.status !== 404) {
				logger.error(err);
			}
		}

		try {
			const docs = await this.getDocs(req.params.id);
			if (!docs || !docs.length) {
				return res.status(400).send(`Auto purge is not enabled for that channel.`);
			}

			await models.MessageEmbed.find({ _id: doc._id }).remove().exec();

			this.weblog(req, req.params.id, req.session.user, 'Deleted Message Embed.');
			return res.send('Deleted Message Embed.');
		} catch (err) {
			logger.error(err);
			return res.status(500).send('Something went wrong.');
		}
	}

	async edit(bot, req, res) {
		if (!req.body.message || !req.body.message._id) {
			return res.status(400).send('Invalid message.');
		}

		const guildConfig = await config.guilds.fetch(req.params.id);
		if (!guildConfig) {
			return res.status(500).send('Something went wrong.');
		}

		if (!guildConfig.isPremium) {
			return res.status(500).send('Premium verification failed');
		}

		const message = req.body.message;
		let msg;

		try {
			msg = await this.client.editMessage(message.channel, message.message, { embed: message.embed });
		} catch (err) {
			logger.error(err);
			if (err.response && err.response !== 404) {
				return res.status(500).send('Error editing message in Discord.');
			}
		}

		if (!msg) {
			try {
				msg = await this.client.createMessage(message.channel, { embed: message.embed });
			} catch (err) {
				logger.error(err);
				return res.status(500).send('Error sending message in Discord.');
			}
		}

		if (!msg) {
			return res.status(500).send('Unable to edit/send message.');
		}

		try {
			await models.MessageEmbed.update({ _id: message._id }, { $set: {
				name: message.name,
				embed: message.embed,
			} });

			this.weblog(req, req.params.id, req.session.user, `Edited Message Embed ${message.name}.`);
			return res.send('Edited Message Embed.');
		} catch (err) {
			logger.error(err);
		}
	}
}

module.exports = MessageEmbed;
