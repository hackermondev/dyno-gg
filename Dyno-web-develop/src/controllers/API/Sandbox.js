'use strict';

const Controller = require('../../core/Controller');
const logger = require('../../core/logger').get('MessageEmbed');
const { models } = require('../../core/models');
const config = require('../../core/config');

class Sandbox extends Controller {
	constructor(bot) {
		super(bot);

		const basePath = '/api/server/:id/sandbox';

		return {
			create: {
				method: 'post',
				uri: `${basePath}/postEmoji`,
				handler: this.postEmoji.bind(this),
			},
		};
	}

	async postEmoji(bot, req, res) {
		if (!req.session.isAdmin) {
			return res.status(403).send('Forbidden');
		}
		if (!req.body.emoji) {
			return res.status(400).send('Missing required emoji.');
		}

		if (!req.body.channelId) {
			return res.status(400).send('Missing required channelId.');
		}

		let { channelId, emoji } = req.body;

		try {
			const text = emoji.native || `<${emoji.animated ? 'a' : ''}${emoji.colons}${emoji._id}>`;
			const reaction = emoji.native || `${emoji.animated ? 'a' : ''}${emoji.colons}${emoji._id}`;

			const message = await this.client.createMessage(channelId, text);
			await message.addReaction(reaction);

			return res.send('OK');
		} catch (err) {
			logger.error(err);
			return res.status(500).send('Something went wrong.');
		}
	}
}

module.exports = Sandbox;
