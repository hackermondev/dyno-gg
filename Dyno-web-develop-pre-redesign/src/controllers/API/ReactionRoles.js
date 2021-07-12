'use strict';

const Controller = require('../../core/Controller');
const logger = require('../../core/logger').get('ReactionRoles');
const db = require('../../core/models');
const config = require('../../core/config');

class ReactionRoles extends Controller {
	constructor(bot) {
		super(bot);

		const basePath = '/api/server/:id/reactionRoles';

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

	async create(bot, req, res) {
		const guildConfig = await config.guilds.fetch(req.params.id);
		if (!guildConfig) {
			return res.status(500).send('Something went wrong.');
		}

        let { name, channel, title, description, reactions } = req.body;

		if (!name || !channel || !title || !reactions) {
			return res.status(400).send('Missing required parameters.');
		}
		
		reactions.forEach((r) => {
			if (!r.role || !r.role.value) {
				return res.status(400).send('Missing required parameters.');
			}

			if (!r.emoji) {
				return res.status(400).send('Missing required parameters.');
			}
		})

		const uniqueItems = [...new Set(reactions.map(r => r.emoji.native || `<${r.emoji.animated ? 'a' : ''}${r.emoji.colons}${r.emoji._id}>`))];
		if(uniqueItems.length !== reactions.length) {
			return res.status(400).send('No duplicated emojis allowed.');			
		}

		const uniqueRoles = [...new Set(reactions.map(r => r.role.value))];
		if(uniqueRoles.length !== reactions.length) {
			return res.status(400).send('No duplicated roles allowed.');
		}

		try {
			const msgDoc = { name, title, description, channel, roles: [] };
			msgDoc.roles = reactions.map((r) => {
				const roleDoc = { ...r.emoji, roleId: r.role.value, description: r.description };
				if (r.emoji._id) {
					roleDoc.emojiId = r.emoji._id;
				}
				return roleDoc;
			} );

            const embed = {
                title,
                description,
			};

			embed.fields = msgDoc.roles.map((r) => { return {
				name: r.native || `<${r.animated ? 'a' : ''}${r.colons}${r._id}>`,
				value: r.description || '',
				inline: true,
			};});

			const message = await this.client.createMessage(channel, { embed });
			
			try {
				for(const r of msgDoc.roles) {
					await this.client.addMessageReaction(channel, message.id,  r.native || `${r.colons}${r._id}`);
				}
			} catch	(err) {
				let msgDeleted = false;
				try {
					await this.client.deleteMessage(channel, message.id);
					msgDeleted = true;
				} catch { }

				let msg = "Couldn't add reactions to message."
				if (!msgDeleted) { 
					msg = `${msg} The message was not deleted.`;
				}

				res.status(500).send(msg);
				return;
			}

            msgDoc.id = message.id;

            guildConfig.reactionroles = guildConfig.reactionroles || {};
            guildConfig.reactionroles.messages = guildConfig.reactionroles.messages || [];
            guildConfig.reactionroles.messages.push(msgDoc);

            return this.update(req.params.id, { $set: { reactionroles: { messages: guildConfig.reactionroles.messages } } })
			.then(() => {
				this.weblog(req, req.params.id, req.session.user, `Created Reaction Role ${name} #${channel.name}.`);
				this.log(req.params.id, `Created Reaction Role: ${name} #${channel.name}.`);
				return res.status(200).send({ message: msgDoc });
			})
			.catch(err => res.status(500).send(err));
		} catch (err) {
			logger.error(err);
			return res.status(500).send('Something went wrong.');
		}
	}

	async delete(bot, req, res) {
		if (!req.body.messageId) {
			return res.status(400).send('Missing required message id.');
		}

		const guildConfig = await config.guilds.fetch(req.params.id);
		if (!guildConfig || !guildConfig.reactionroles || !guildConfig.reactionroles.messages) {
			return res.status(500).send('Something went wrong.');
		}

		const doc = guildConfig.reactionroles.messages.find((m) => m.id === req.body.messageId);
		const channel = doc.channel;

		try {
			await this.client.deleteMessage(channel, doc.id);
		} catch (err) {
			if (err.response && err.response.status !== 404) {
				logger.error(err);
			}
		}

		try {
            guildConfig.reactionroles.messages = guildConfig.reactionroles.messages.filter((m) => m.id !== doc.id);

            return this.update(req.params.id, { $set: { reactionroles: { messages: guildConfig.reactionroles.messages } } })
			.then(() => {
				this.weblog(req, req.params.id, req.session.user, `Deleted Reaction Role.`);
				this.log(req.params.id, `Deleted Reaction Role.`);
				return res.status(200).send({ message: doc });
			});
		} catch (err) {
			logger.error(err);
			return res.status(500).send('Something went wrong.');
		}
	}

	async edit(bot, req, res) {
		if (!req.body.id) {
			return res.status(400).send('Invalid message id.');
		}

		const guildConfig = await config.guilds.fetch(req.params.id);
		if (!guildConfig) {
			return res.status(500).send('Something went wrong.');
		}

		let { id, name, channel, title, description, reactions } = req.body;

		if (!name || !channel || !title || !reactions) {
			return res.status(400).send('Missing required parameters.');
		}
		
		reactions.forEach((r) => {
			if (!r.role || !r.role.value) {
				return res.status(400).send('Missing required parameters.');
			}

			if (!r.emoji) {
				return res.status(400).send('Missing required parameters.');
			}
		})

		const uniqueItems = [...new Set(reactions.map(r => r.emoji.native || `<${r.emoji.animated ? 'a' : ''}${r.emoji.colons}${r.emoji._id}>`))];
		if(uniqueItems.length !== reactions.length) {
			return res.status(400).send('No duplicated emojis allowed.');			
		}

		const uniqueRoles = [...new Set(reactions.map(r => r.role.value))];
		if(uniqueRoles.length !== reactions.length) {
			return res.status(400).send('No duplicated roles allowed.');
		}

		try {
			const msgDoc = { name, title, description, channel, roles: [] };
			msgDoc.roles = reactions.map((r) => {
				const roleDoc = { ...r.emoji, roleId: r.role.value, description: r.description };
				if (r.emoji._id) {
					roleDoc.emojiId = r.emoji._id;
				}
				return roleDoc;
			} );

            const embed = {
                title,
                description,
			};

			embed.fields = msgDoc.roles.map((r) => { return {
				name: r.native || `<${r.animated ? 'a' : ''}${r.colons}${r.emojiId}>`,
				value: r.description || '',
				inline: true,
			};});

			const message = await this.client.editMessage(channel, id, { embed });
			await this.client.removeMessageReactions(channel, id);
			
			try {
				for(const r of msgDoc.roles) {
					await this.client.addMessageReaction(channel, message.id,  r.native || `${r.colons}${r.emojiId}`);
				}
			} catch	(err) {
				let msg = "Couldn't add reactions to message.";

				res.status(500).send(msg);
				return;
			}

            msgDoc.id = message.id;

            guildConfig.reactionroles = guildConfig.reactionroles || {};
			guildConfig.reactionroles.messages = guildConfig.reactionroles.messages || [];
            guildConfig.reactionroles.messages = guildConfig.reactionroles.messages.filter((m) => m.id !== id);
            guildConfig.reactionroles.messages.push(msgDoc);

            return this.update(req.params.id, { $set: { reactionroles: { messages: guildConfig.reactionroles.messages } } })
			.then(() => {
				this.weblog(req, req.params.id, req.session.user, `Edited Reaction Role ${name} #${channel.name}.`);
				this.log(req.params.id, `Edited Reaction Role: ${name} #${channel.name}.`);
				return res.status(200).send({ message: msgDoc });
			})
			.catch(err => res.status(500).send(err));
		} catch (err) {
			logger.error(err);
			return res.status(500).send('Something went wrong.');
		}
	}
}

module.exports = ReactionRoles;
