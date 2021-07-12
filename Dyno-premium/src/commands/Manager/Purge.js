'use strict';

const Command = Loader.require('./core/structures/Command');

class Purge extends Command {
	constructor(...args) {
		super(...args);

		this.aliases      = ['purge', 'prune'];
		this.group        = 'Manager';
		this.description  = 'Delete a number of messages from a channel. (limit 1000)';
		this.permissions  = 'serverAdmin';
		this.expectedArgs = 1;
		this.defaultCommand = 'any';
		this.defaultUsage = 'purge [number] (user)';
		this.requiredPermissions = ['manageMessages'];

		this.commands = [
			{ name: 'any', desc: 'Delete a number of messages from a channel.', default: true, usage: 'any [number]' },
			{ name: 'user', desc: 'Delete messages for a user in the channel.', usage: '[number] [user]' },
			{ name: 'match', desc: 'Delete messages containing text. (Limit 100)', usage: 'match [text] [number]' },
			{ name: 'not', desc: 'Delete messages not containing text. (Limit 100', usage: 'not [text] [number]' },
			{ name: 'startswith', desc: 'Delete messages that start with text. (Limit 100)', usage: 'startswith [text] [number]' },
			{ name: 'endswith', desc: 'Delete messages that ends with text. (Limit 100)', usage: 'endswith [text] [number]' },
			{ name: 'links', desc: 'Delete a number links posted in the channel. (Limit 100)', usage: 'links [number]' },
			{ name: 'invites', desc: 'Delete server invites posted in the channel. (Limit 100)', usage: 'invites [number]' },
			{ name: 'images', desc: 'Delete a number of images in the channel. (Limit 100)', usage: 'images [number]' },
			{ name: 'mentions', desc: 'Delete messages with mentions in the channel. (Limit 100)', usage: 'mentions [number]' },
			{ name: 'embeds', desc: 'Delete messages containing rich embeds in the channel.', usage: 'embeds [number]' },
			{ name: 'bots', desc: 'Delete messages sent by bots.', usage: 'bots [number]' },
			{ name: 'text', desc: 'Delete messages containing text, ignoring images/embeds.', usage: 'text [number]' },
			// { name: 'global', desc: 'Delete a number of messages by user from every channel (Limit 100).',
			// 	usage: 'global [user] [number]' },
		];

		this.usage = [
			'purge 10',
			'purge 20 @NoobLance',
			'purge match heck off 100',
			'purge startswith ? 10',
			'purge endswith / 10',
			'purge links 10',
			'purge invites 10',
			'purge images 5',
			'purge mentions 10',
			// 'purge global @NoobLance 50',
		];

		this.deleteError = `I couldn't purge those messages. Make sure I have manage messages permissions.`;

		this._linkRegex = new RegExp(/https?:\/\/[\w\d-_]/, 'gi');
		this._inviteRegex = new RegExp(/discord.(gg|me)\s?\//, 'gi');
	}

	getMessages(channel, limit, before, filter, slice) {
		return new Promise(resolve => {
			this.client.getMessages(channel.id, limit, before).then(messages => {
				if (!messages) return resolve();

				if (filter) {
					messages = messages.filter(filter);
				}

				if (slice) {
					let count = slice > messages.length ? messages.length : slice;
					messages = messages.slice(0, count);
				}

				if (!messages.length) return resolve();

				return resolve(messages);
			}).catch(() => resolve());
		});
	}

	deleteMessages(message, messages) {
		if (!messages || !messages.length) {
			return this.error(message.channel, `I didn't find any messages to delete.`);
		}

		let hasOldMessages = false;
		let messageIds = messages.filter(m => {
			if (!m.timestamp) return true;
			if ((Date.now() - m.timestamp) > (14 * 24 * 60 * 60 * 1000)) {
				hasOldMessages = true;
				return false;
			}
			return true;
		}).map(m => m.id);

		if (!messageIds.length) {
			return Promise.reject();
		}

		return new Promise(resolve =>
			this.client.deleteMessages(message.channel.id, messageIds)
				.catch(() => {
					this.error(message.channel, this.deleteError);
					return resolve();
				})
				.then(() => {
					message.delete().catch(() => false);
					if (hasOldMessages) {
						this.client.createMessage(message.channel.id, `I was unable to purge some messages older than 14 days due to a limitation in Discord.`);
						return resolve();
					}
					return resolve();
				}));
	}

	async purgeUserMessages(message, user, count) {
		try {
			let messages = await this.getMessages(message.channel, 100, message.id, m => m.author.id === user.id, count);

			if (!messages || !messages.length) {
				return this.error(message.channel, `Couldn't find any messages for that user in the last 100 messages.`);
			}

			return this.client.deleteMessages(message.channel.id, messages.map(m => m.id))
				.then(() => message.delete().catch(() => false))
				.catch(err => this.logger.error(err));
		} catch (err) {
			return this.error(message.channel, `I couldn't purge those messages. Make sure I have manage messages permissions.`, err);
		}
	}

	execute() {
		return Promise.resolve();
	}

	async any(message, args) {
		let count = parseInt(args[0]),
			total = Number(count),
			purged = 0,
			user = args[1] ? this.resolveUser(message.channel.guild, args.slice(1).join(' ')) : null,
			progress = count > 100;

		if (count > 1000) {
			count = 1000;
			total = Number(count);
		}

		if (isNaN(count)) {
			return this.error(message.channel, `Enter a number of messages to purge.`);
		}

		if (user) {
			count = count > 100 ? 100 : count;
			return this.purgeUserMessages(message, user, count);
		}

		if (count < 100) {
			try {
				const messages = await this.getMessages(message.channel, count, message.id, m => !m.pinned);

				if (!messages || !messages.length) {
					return this.error(message.channel, `I didn't get any messages to purge.`);
				}

				return this.deleteMessages(message, messages).catch(() => false);
			} catch (err) {
				return this.error(message.channel, this.deleteError, err);
			}
		}

		if (args[1]) {
			return this.error(message.channel, `I couldn't find that user.`);
		}

		const purgeText = progress ? 'Purging messages... 0%' : 'Purging messages...';
		const purgeMsg = await this.sendMessage(message.channel, purgeText);

		while (count > 0) {
			let messages = [];

			try {
				messages = await this.getMessages(message.channel, Math.min(count, 100), message.id, m => !m.pinned);
			} catch (e) {
				return this.error('Unable to get messages.');
			}

			try {
				await this.deleteMessages(message, messages).catch(() => false);
			} catch (err) {
				break;
			}

			purged += messages.length;

			if (progress) {
				purgeMsg.edit(`Purging messages... ${Math.ceil(purged / total * 100)}%`).catch(() => false);
			}

			if (!messages.length) count = 0;

			await Promise.delay(1100);
			count -= Math.min(count, 100);
		}

		purgeMsg.edit(`Purged ${purged} messages.`).catch(() => false);
		setTimeout(() => purgeMsg.delete().catch(() => false), 9000);
		message.delete().catch(() => false);

		return Promise.resolve();
	}

	user(message, args, guildConfig) {
		if (!args || !args.length) return this.help(message, guildConfig);

		const count = isNaN(args[args.length]) ? args.pop() : 100;
		const user = this.resolveUser(message.channel.guild, args.slice(1).join(' '));

		if (!user) {
			return this.error(message.channel, `I couldn't find that user.`);
		}

		return this.purgeUserMessages(message, user, count);
	}

	match(message, args, guildConfig) {
		if (!args || !args.length) return this.help(message, guildConfig);

		const count = args.length >= 2 && isNaN(args[args.length]) ? args.pop() : 100;
		const text = args.join(' ').split('|');

		return this.getMessages(message.channel, 100, message.id,
			m => {
				const content = m.content.toLowerCase();
				for (let t of text) {
					if (content.includes(t.toLowerCase())) return true;
				}
				return false;
			}, count)
			.then(messages => this.deleteMessages(message, messages).catch(() => false));
	}

	not(message, args, guildConfig) {
		if (!args || !args.length) return this.help(message, guildConfig);

		const count = args.length >= 2 && isNaN(args[args.length]) ? args.pop() : 100;
		const text = args.join(' ').split('|');

		return this.getMessages(message.channel, 100, message.id,
			m => {
				const content = m.content.toLowerCase();
				for (let t of text) {
					if (!content.includes(t.toLowerCase())) return true;
				}
				return false;
			}, count)
			.then(messages => this.deleteMessages(message, messages).catch(() => false));
	}

	startswith(message, args, guildConfig) {
		if (!args || !args.length) return this.help(message, guildConfig);

		const count = args.length >= 2 && isNaN(args[args.length]) ? args.pop() : 100;
		const text = args.join(' ').split('|');

		return this.getMessages(message.channel, 100, message.id,
			m => {
				const content = m.content.toLowerCase();
				for (let t of text) {
					if (content.startsWith(t.toLowerCase())) return true;
				}
				return false;
			}, count)
			.then(messages => this.deleteMessages(message, messages).catch(() => false));
	}

	endswith(message, args, guildConfig) {
		if (!args || !args.length) return this.help(message, guildConfig);

		const count = args.length >= 2 && isNaN(args[args.length]) ? args.pop() : 100;
		const text = args.join(' ').split('|');

		return this.getMessages(message.channel, 100, message.id,
			m => {
				const content = m.content.toLowerCase();
				for (let t of text) {
					if (content.endsWith(t.toLowerCase())) return true;
				}
				return false;
			}, count)
			.then(messages => this.deleteMessages(message, messages).catch(() => false));
	}

	links(message, args) {
		const count = args ? args[0] : 100;

		return this.getMessages(message.channel, 100, message.id, m => m.content.match(this._linkRegex), count)
			.then(messages => this.deleteMessages(message, messages).catch(() => false));
	}

	invites(message, args) {
		const count = args ? args[0] : 100;

		return this.getMessages(message.channel, 100, message.id, m => m.content.match(this._inviteRegex), count)
			.then(messages => this.deleteMessages(message, messages).catch(() => false));
	}

	images(message, args) {
		const count = args ? args[0] : 100;

		return this.getMessages(message.channel, 100, message.id,
			m => (m.attachments && m.attachments.length) || (m.embeds && m.embeds.length), count)
			.then(messages => this.deleteMessages(message, messages).catch(() => false));
	}

	mentions(message, args) {
		const count = args ? args[0] : 100;

		return this.getMessages(message.channel, 100, message.id, m => m.mentions && m.mentions.length, count)
			.then(messages => this.deleteMessages(message, messages).catch(() => false));
	}

	embeds(message, args) {
		const count = args ? args[0] : 100;

		return this.getMessages(message.channel, 100, message.id, m => m.embeds && m.embeds.length && m.embeds[0].type === 'rich', count)
			.then(messages => this.deleteMessages(message, messages).catch(() => false));
	}

	bots(message, args) {
		const count = args ? args[0] : 100;

		return this.getMessages(message.channel, 100, message.id, m => m.author && m.author.bot, count)
			.then(messages => this.deleteMessages(message, messages).catch(() => false));
	}

	text(message, args) {
		const count = args ? args[0] : 100;

		return this.getMessages(message.channel, 100, message.id,
			m => (!m.attachments || !m.attachments.length) && (!m.embeds || !m.embeds.length), count)
			.then(messages => this.deleteMessages(message, messages).catch(() => false));
	}

	// global(message, args, guildConfig) {
	// 	if (!args || !args.length) return this.help(message, guildConfig);
	// }

}

module.exports = Purge;
