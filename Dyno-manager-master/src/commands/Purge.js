'use strict';

const {Command, Purger} = require('@dyno.gg/dyno-core');

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
			{ name: 'user', desc: 'Delete messages for a user in the channel.', usage: '[number] [user or id]' },
			{ name: 'match', desc: 'Delete messages containing text. (Limit 100)', usage: 'match [text] [number]' },
			{ name: 'not', desc: 'Delete messages not containing text. (Limit 100)', usage: 'not [text] [number]' },
			{ name: 'startswith', desc: 'Delete messages that start with text. (Limit 100)', usage: 'startswith [text] [number]' },
			{ name: 'endswith', desc: 'Delete messages that ends with text. (Limit 100)', usage: 'endswith [text] [number]' },
			{ name: 'links', desc: 'Delete a number links posted in the channel. (Limit 100)', usage: 'links [number]' },
			{ name: 'invites', desc: 'Delete server invites posted in the channel. (Limit 100)', usage: 'invites [number]' },
			{ name: 'images', desc: 'Delete a number of images in the channel. (Limit 100)', usage: 'images [number]' },
			{ name: 'mentions', desc: 'Delete messages with mentions in the channel. (Limit 100)', usage: 'mentions [number]' },
			{ name: 'embeds', desc: 'Delete messages containing rich embeds in the channel.', usage: 'embeds [number]' },
			{ name: 'bots', desc: 'Delete messages sent by bots.', usage: 'bots [number]' },
			{ name: 'text', desc: 'Delete messages containing text, ignoring images/embeds.', usage: 'text [number]' },
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
		];

		this.deleteError = `I couldn't purge those messages. Make sure I have manage messages permissions.`;

		this._linkRegex = new RegExp(/https?:\/\/[\w\d-_]/, 'gi');
		this._inviteRegex = new RegExp(/discord.(gg|me)\s?\//, 'gi');

		this._purger = new Purger(this.dyno);
	}

	async purgeMessages(channel, options) {
		if (!this.hasPermissions(channel.guild, 'manageMessages')) {
			return Promise.reject(`I don't have permissions to Manage Messages.`);
		}

		try {
			await this._purger.purge(channel, options);
		} catch (err) {
			this.logger.error(err);
			return Promise.reject(this.deleteError);
		}
	}

	purgeUserMessages(message, user, count) {
		let userid = typeof user === 'string' ? user : user.id;

		return this.purgeMessages(message.channel, {
			limit: 100,
			before: message.id,
			filter: m => m.author.id === userid,
			slice: count > 100 ? 100 : count,
		})
		.then(() => message.delete().catch(() => null))
		.catch(err => this.error(message.channel, err));
	}

	execute() {
		return Promise.resolve();
	}

	async any({ message, args }) {
		let count = parseInt(args[0]) > 1000 ? 1000 : parseInt(args[0]);

		if (count === 0) {
			return this.error(message.channel, `Please choose a number of messages to purge.`);
		}

		let user = args[1] && isNaN(args[1]) ?
			this.resolveUser(message.channel.guild, args.slice(1).join(' ')) : null;

		if (user) {
			return this.purgeUserMessages(message, user, count);
		} else if (args.length > 1) {
			user = this.resolveUser(message.channel.guild, args[0]);
			if (user) {
				count = parseInt(args[1]);
			} else if (args[1] && args[1].match(/<@!?/)) {
				user = args[1].replace(/<@!?([0-9]+)>/, '$1');
			}

			if (user) {
				return this.purgeUserMessages(message, user, count);
			}
		}

		if (isNaN(count)) {
			return this.error(message.channel, `Enter a number of messages to purge.`);
		}

		this.purgeMessages(message.channel, {
			limit: count,
			before: message.id,
		})
		.then(() => message.delete().catch(() => null))
		.catch(err => this.error(message.channel, err));

		return Promise.resolve();
	}

	user({ message, args, guildConfig }) {
		if (!args || !args.length) return this.help(message, guildConfig);

		let user = this.resolveUser(message.channel.guild, args.slice(1).join(' '));
		let count = args[0];
		let userid = null;

		if (!user) {
			user = this.resolveUser(message.channel.guild, args[0]);
			count = args[1];
		}
		if (!user) {
			user = this.resolveUser(message.channel.guild, args[1]);
			count = args[0];
		}

		if (!user && !isNaN(args[0]) && !isNaN(args[1])) {
			userid = args[1];
			count = args[0];
		}

		if (!user && !userid) {
			return this.error(message.channel, `I couldn't find that user.`);
		}

		return this.purgeUserMessages(message, userid || user, count);
	}

	match({ message, args, guildConfig }) {
		if (!args || !args.length) return this.help(message, guildConfig);

		const count = args.length >= 2 && isNaN(args[args.length]) ? args.pop() : 100;
		const text = args.join(' ').split('|');

		return this.purgeMessages(message.channel, {
			limit: 100,
			before: message.id,
			filter: m => {
				const content = m.content.toLowerCase();
				for (let t of text) {
					if (content.includes(t.toLowerCase())) return true;
					if (m.embeds && m.embeds.length) {
						for (let e of m.embeds) {
							if (e.description && e.description.includes(t.toLowerCase())) return true;
						}
					}
				}
				return false;
			},
			slice: count,
		})
		.then(() => message.delete().catch(() => null))
		.catch(err => this.error(message.channel, err));
	}

	not({ message, args, guildConfig }) {
		if (!args || !args.length) return this.help(message, guildConfig);

		const count = args.length >= 2 && isNaN(args[args.length]) ? args.pop() : 100;
		const text = args.join(' ').split('|');

		return this.purgeMessages(message.channel, {
			limit: 100,
			before: message.id,
			filter: m => {
				const content = m.content.toLowerCase();
				for (let t of text) {
					if (content.includes(t.toLowerCase())) return false;
					if (m.embeds && m.embeds.length) {
						for (let e of m.embeds) {
							if (e.description && e.description.includes(t.toLowerCase())) return false;
						}
					}
				}
				return true;
			},
			slice: count,
		})
		.then(() => message.delete().catch(() => null))
		.catch(err => this.error(message.channel, err));
	}

	startswith({ message, args, guildConfig }) {
		if (!args || !args.length) return this.help(message, guildConfig);

		const count = args.length >= 2 && isNaN(args[args.length]) ? args.pop() : 100;
		const text = args.join(' ').split('|');


		return this.purgeMessages(message.channel, {
			limit: 100,
			before: message.id,
			filter: m => {
				const content = m.content.toLowerCase();
				for (let t of text) {
					if (content.startsWith(t.toLowerCase())) return true;
				}
				return false;
			},
			slice: count,
		})
		.then(() => message.delete().catch(() => null))
		.catch(err => this.error(message.channel, err));
	}

	endswith({ message, args, guildConfig }) {
		if (!args || !args.length) return this.help(message, guildConfig);

		const count = args.length >= 2 && isNaN(args[args.length]) ? args.pop() : 100;
		const text = args.join(' ').split('|');

		return this.purgeMessages(message.channel, {
			limit: 100,
			before: message.id,
			filter: m => {
				const content = m.content.toLowerCase();
				for (let t of text) {
					if (content.endsWith(t.toLowerCase())) return true;
				}
				return false;
			},
			slice: count,
		})
		.then(() => message.delete().catch(() => null))
		.catch(err => this.error(message.channel, err));
	}

	links({ message, args }) {
		const count = args ? args[0] : 100;

		return this.purgeMessages(message.channel, {
			limit: 100,
			before: message.id,
			filter: m => m.content.match(this._linkRegex),
			slice: count,
		})
		.then(() => message.delete().catch(() => null))
		.catch(err => this.error(message.channel, err));
	}

	invites({ message, args }) {
		const count = args ? args[0] : 100;

		return this.purgeMessages(message.channel, {
			limit: 100,
			before: message.id,
			filter: m => m.content.match(this._inviteRegex),
			slice: count,
		})
		.then(() => message.delete().catch(() => null))
		.catch(err => this.error(message.channel, err));
	}

	images({ message, args }) {
		const count = args ? args[0] : 100;

		return this.purgeMessages(message.channel, {
			limit: 100,
			before: message.id,
			filter: m => (m.attachments && m.attachments.length) || (m.content.length && m.embeds && m.embeds.length),
			slice: count,
		})
		.then(() => message.delete().catch(() => null))
		.catch(err => this.error(message.channel, err));
	}

	mentions({ message, args }) {
		const count = args ? args[0] : 100;

		return this.purgeMessages(message.channel, {
			limit: 100,
			before: message.id,
			filter: m => m.mentions && m.mentions.length,
			slice: count,
		})
		.then(() => message.delete().catch(() => null))
		.catch(err => this.error(message.channel, err));
	}

	embeds({ message, args }) {
		const count = args ? args[0] : 100;

		return this.purgeMessages(message.channel, {
			limit: 100,
			before: message.id,
			filter: m => m.embeds && m.embeds.length && m.embeds[0].type === 'rich',
			slice: count,
		})
		.then(() => message.delete().catch(() => null))
		.catch(err => this.error(message.channel, err));
	}

	bots({ message, args }) {
		const count = args ? args[0] : 100;

		return this.purgeMessages(message.channel, {
			limit: 100,
			before: message.id,
			filter: m => m.author && m.author.bot,
			slice: count,
		})
		.then(() => message.delete().catch(() => null))
		.catch(err => this.error(message.channel, err));
	}

	text({ message, args }) {
		const count = args ? args[0] : 100;

		return this.purgeMessages(message.channel, {
			limit: 100,
			before: message.id,
			filter: m => (!m.attachments || !m.attachments.length) && (!m.embeds || !m.embeds.length),
			slice: count,
		})
		.then(() => message.delete().catch(() => null))
		.catch(err => this.error(message.channel, err));
	}
}

module.exports = Purge;
