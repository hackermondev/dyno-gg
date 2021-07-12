import { Command, CommandData, Purger, SubCommand } from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';

export default class Purge extends Command {
	public aliases     : string[] = ['purge'];
	public group       : string   = 'Manager';
	public description : string   = 'Delete a number of messages from a channel. (limit 1000)';
	public defaultCommand: string = 'any';
	public defaultUsage: string   = 'purge';
	public permissions : string   = 'serverAdmin';
	public cooldown    : number   = 5000;
	public expectedArgs: number   = 1;
	public requiredPermissions: string[] = ['manageMessages'];

	public commands: SubCommand[] = [
		{ name: 'any', desc: 'Delete a number of messages from a channel.', default: true, usage: 'any [count]' },
		{ name: 'user', desc: 'Delete messages for a user in the channel.', usage: '[count] [user or id]' },
		{ name: 'match', desc: 'Delete messages containing text. (Limit 100)', usage: 'match [text] [count]' },
		{ name: 'not', desc: 'Delete messages not containing text. (Limit 100)', usage: 'not [text] [count]' },
		{ name: 'startswith', desc: 'Delete messages that start with text. (Limit 100)', usage: 'startswith [text] [count]' },
		{ name: 'endswith', desc: 'Delete messages that ends with text. (Limit 100)', usage: 'endswith [text] [count]' },
		{ name: 'links', desc: 'Delete a number links posted in the channel. (Limit 100)', usage: 'links [count]' },
		{ name: 'invites', desc: 'Delete server invites posted in the channel. (Limit 100)', usage: 'invites [count]' },
		{ name: 'images', desc: 'Delete a number of images in the channel. (Limit 100)', usage: 'images [count]' },
		{ name: 'mentions', desc: 'Delete messages with mentions in the channel. (Limit 100)', usage: 'mentions [count]' },
		{ name: 'embeds', desc: 'Delete messages containing rich embeds in the channel.', usage: 'embeds [count]' },
		{ name: 'bots', desc: 'Delete messages sent by bots.', usage: 'bots [count]' },
		{ name: 'text', desc: 'Delete messages containing text, ignoring images/embeds.', usage: 'text [count]' },
	];

	public usage: string[] = [
		'purge [count]',
		'purge [count] [user]',
		'purge match [text] (count)',
		'purge not [text] (count)',
		'purge startswith [text] (count)',
		'purge endswith [text] (count)',
		'purge links',
		'purge invites (count)',
		'purge images (count)',
		'purge mentions (count)',
		'purge embeds (count)',
		'purge bots (count)',
		'purge text (count)',
	];

	public example: string[] = [
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

	private deleteError: string;
	private _linkRegex: RegExp;
	private _inviteRegex: RegExp;
	private _purger: Purger;

	constructor(dyno: any, ...args: any[]) {
		super(dyno, ...args);

		this.deleteError = `I couldn't purge those messages. Make sure I have manage messages permissions.`;

		this._linkRegex = new RegExp(/https?:\/\/[\w\d-_]/, 'gi');
		this._inviteRegex = new RegExp(/discord.(gg|me)\s?\//, 'gi');

		this._purger = new Purger(this.dyno);
	}

	public execute() {
		return Promise.resolve();
	}

	public async any({ message, args }: CommandData) {
		let count = parseInt(args[0], 10) > 1000 ? 1000 : parseInt(args[0], 10);

		if (count === 0) {
			return this.error(message.channel, `Please choose a number of messages to purge.`);
		}

		const guild = (<eris.GuildChannel>message.channel).guild;

		let user = args[1] && isNaN(args[1]) ?
			this.resolveUser(guild, args.slice(1).join(' ')) : null;

		if (user) {
			return this.purgeUserMessages(message, user, count);
		} else if (args.length > 1) {
			user = this.resolveUser(guild, args[0]);
			if (user) {
				count = parseInt(args[1], 10);
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
		.catch((err: any) => this.error(message.channel, err));

		return Promise.resolve();
	}

	public user({ message, args, guildConfig }: CommandData) {
		if (!args || !args.length) {
			return this.help(message, guildConfig);
		}

		const guild = (<eris.GuildChannel>message.channel).guild;

		let user = this.resolveUser(guild, args.slice(1).join(' '));
		let count = args[0];
		let userid = null;

		if (!user) {
			user = this.resolveUser(guild, args[0]);
			count = args[1];
		}
		if (!user) {
			user = this.resolveUser(guild, args[1]);
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

	public match({ message, args, guildConfig }: CommandData) {
		if (!args || !args.length) {
			return this.help(message, guildConfig);
		}

		const count = args.length >= 2 && isNaN(args[args.length]) ? args.pop() : 100;
		const text = args.join(' ').split('|');

		return this.purgeMessages(message.channel, {
			limit: 100,
			before: message.id,
			filter: (m: eris.Message) => {
				const content = m.content.toLowerCase();
				for (const t of text) {
					if (content.includes(t.toLowerCase())) {
						return true;
					}
					if (m.embeds && m.embeds.length) {
						for (const e of m.embeds) {
							if (e.description && e.description.includes(t.toLowerCase())) {
								return true;
							}
						}
					}
				}
				return false;
			},
			slice: count,
		})
		.then(() => message.delete().catch(() => null))
		.catch((err: any) => this.error(message.channel, err));
	}

	public not({ message, args, guildConfig }: CommandData) {
		if (!args || !args.length) {
			return this.help(message, guildConfig);
		}

		const count = args.length >= 2 && isNaN(args[args.length]) ? args.pop() : 100;
		const text = args.join(' ').split('|');

		return this.purgeMessages(message.channel, {
			limit: 100,
			before: message.id,
			filter: (m: eris.Message) => {
				const content = m.content.toLowerCase();
				for (const t of text) {
					if (content.includes(t.toLowerCase())) {
						return false;
					}
					if (m.embeds && m.embeds.length) {
						for (const e of m.embeds) {
							if (e.description && e.description.includes(t.toLowerCase())) {
								return false;
							}
						}
					}
				}
				return true;
			},
			slice: count,
		})
		.then(() => message.delete().catch(() => null))
		.catch((err: any) => this.error(message.channel, err));
	}

	public startswith({ message, args, guildConfig }: CommandData) {
		if (!args || !args.length) {
			return this.help(message, guildConfig);
		}

		const count = args.length >= 2 && isNaN(args[args.length]) ? args.pop() : 100;
		const text = args.join(' ').split('|');

		return this.purgeMessages(message.channel, {
			limit: 100,
			before: message.id,
			filter: (m: eris.Message) => {
				const content = m.content.toLowerCase();
				for (const t of text) {
					if (content.startsWith(t.toLowerCase())) {
						return true;
					}
				}
				return false;
			},
			slice: count,
		})
		.then(() => message.delete().catch(() => null))
		.catch((err: any) => this.error(message.channel, err));
	}

	public endswith({ message, args, guildConfig }: CommandData) {
		if (!args || !args.length) {
			return this.help(message, guildConfig);
		}

		const count = args.length >= 2 && isNaN(args[args.length]) ? args.pop() : 100;
		const text = args.join(' ').split('|');

		return this.purgeMessages(message.channel, {
			limit: 100,
			before: message.id,
			filter: (m: eris.Message) => {
				const content = m.content.toLowerCase();
				for (const t of text) {
					if (content.endsWith(t.toLowerCase())) {
						return true;
					}
				}
				return false;
			},
			slice: count,
		})
		.then(() => message.delete().catch(() => null))
		.catch((err: any) => this.error(message.channel, err));
	}

	public links({ message, args }: CommandData) {
		const count = args ? args[0] : 100;

		return this.purgeMessages(message.channel, {
			limit: 100,
			before: message.id,
			filter: (m: eris.Message) => m.content.match(this._linkRegex),
			slice: count,
		})
		.then(() => message.delete().catch(() => null))
		.catch((err: any) => this.error(message.channel, err));
	}

	public invites({ message, args }: CommandData) {
		const count = args ? args[0] : 100;

		return this.purgeMessages(message.channel, {
			limit: 100,
			before: message.id,
			filter: (m: eris.Message) => m.content.match(this._inviteRegex),
			slice: count,
		})
		.then(() => message.delete().catch(() => null))
		.catch((err: any) => this.error(message.channel, err));
	}

	public images({ message, args }: CommandData) {
		const count = args ? args[0] : 100;

		return this.purgeMessages(message.channel, {
			limit: 100,
			before: message.id,
			filter: (m: eris.Message) => (m.attachments && m.attachments.length) || (m.content.length && m.embeds && m.embeds.length),
			slice: count,
		})
		.then(() => message.delete().catch(() => null))
		.catch((err: any) => this.error(message.channel, err));
	}

	public mentions({ message, args }: CommandData) {
		const count = args ? args[0] : 100;

		return this.purgeMessages(message.channel, {
			limit: 100,
			before: message.id,
			filter: (m: eris.Message) => m.mentions && m.mentions.length,
			slice: count,
		})
		.then(() => message.delete().catch(() => null))
		.catch((err: any) => this.error(message.channel, err));
	}

	public embeds({ message, args }: CommandData) {
		const count = args ? args[0] : 100;

		return this.purgeMessages(message.channel, {
			limit: 100,
			before: message.id,
			filter: (m: eris.Message) => m.embeds && m.embeds.length && m.embeds[0].type === 'rich',
			slice: count,
		})
		.then(() => message.delete().catch(() => null))
		.catch((err: any) => this.error(message.channel, err));
	}

	public bots({ message, args }: CommandData) {
		const count = args ? args[0] : 100;

		return this.purgeMessages(message.channel, {
			limit: 100,
			before: message.id,
			filter: (m: eris.Message) => m.author && m.author.bot,
			slice: count,
		})
		.then(() => message.delete().catch(() => null))
		.catch((err: any) => this.error(message.channel, err));
	}

	public text({ message, args }: CommandData) {
		const count = args ? args[0] : 100;

		return this.purgeMessages(message.channel, {
			limit: 100,
			before: message.id,
			filter: (m: eris.Message) => (!m.attachments || !m.attachments.length) && (!m.embeds || !m.embeds.length),
			slice: count,
		})
		.then(() => message.delete().catch(() => null))
		.catch((err: any) => this.error(message.channel, err));
	}

	private async purgeMessages(channel: any, options: any) {
		if (!this.hasPermissions((<eris.GuildChannel>channel).guild, 'manageMessages')) {
			return Promise.reject(`I don't have permissions to Manage Messages.`);
		}

		try {
			let messages = await this._purger.getMessages(channel, options);
			let hasOldMessages = false;
			// let hasPinnedMessages = false;

			if (!messages || !messages.length) {
				return;
			}

			messages = messages.filter(m => {
				if (m.pinned) {
					// hasPinnedMessages = true;
					return false;
				}
				if (!m.timestamp) {
					return true;
				}
				if ((Date.now() - m.timestamp) > (14 * 24 * 60 * 60 * 1000)) {
					hasOldMessages = true;
					return false;
				}
				return true;
			});

			if (!messages.length && hasOldMessages) {
				this.error(channel, 'Unable to purge messages older than 14 days.').catch(() => null);
				return Promise.resolve();
			}

			// if (!messages.length && hasPinnedMessages) {
			// 	this.error(channel, `Dyno doesn't delete pinned messages.`);
			// 	return Promise.resolve();
			// }

			return this._purger.deleteMessages(channel, messages);
		} catch (err) {
			this.logger.error(err);
			return Promise.reject(this.deleteError);
		}
	}

	private purgeUserMessages(message: eris.Message, user: eris.User|eris.Member, count: number) {
		const userid = typeof user === 'string' ? user : user.id;

		return this.purgeMessages(message.channel, {
			limit: 100,
			before: message.id,
			filter: (m: eris.Message) => m.author.id === userid,
			slice: count > 100 ? 100 : count,
		})
		.then(() => message.delete().catch(() => null))
		.catch((err: any) => this.error(message.channel, err));
	}
}
