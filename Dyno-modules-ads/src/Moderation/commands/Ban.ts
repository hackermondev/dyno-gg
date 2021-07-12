import {Command, SubCommand} from '@dyno.gg/dyno-core';
import * as core from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';
import ModUtils from '../ModUtils';

export default class Ban extends Command {
	public aliases            : string[] = ['ban'];
	public group              : string   = 'Moderator';
	public module             : string   = 'Moderation';
	public description        : string   = 'Ban a member, optional time limit';
	public defaultCommand	  : string 	 = 'user';
	public defaultUsage		  : string   = 'ban [user] [limit] [reason]';
	public permissions        : string   = 'serverMod';
	public disableDM          : boolean  = true;
	public cooldown           : number   = 3000;
	public expectedArgs       : number   = 1;
	public requiredPermissions: string[] = ['banMembers'];

	public commands			  : SubCommand[] = [
		{ name: 'user', desc: 'Ban a user either permanently or temporarily.', default: true, usage: '[user] (limit) (reason)' },
		{ name: 'save', desc: 'Ban a user and save their messages in chat.', usage: 'save [user] (limit) (reason)' },
		{ name: 'match', desc: 'Ban members who sent messages matching the text. (Must be enabled in dashboard)', usage: 'match [match text]' },
	];

	public usage: string[] = [
		'ban [user] (limit) (reason)',
		'ban save [user] (limit) (reason)',
		'ban match [match text]',
	];
	public example: string[] = [
		'ban @NoobLance Get out!',
		'ban save @NoobLance Get out!',
		'ban match Raided',
	];

	public execute() {
		return Promise.resolve();
	}

	public async user({ message, args, guildConfig }: core.CommandData) {
		return this.ban({ message, args, guildConfig });
	}

	public async save({ message, args, guildConfig}: core.CommandData) {
		return this.ban({ message, args, guildConfig, preserve: true });
	}

	public async match({ message, args, guildConfig }: core.CommandData) {
		if (!guildConfig.moderation || !guildConfig.moderation.matchEnabled) {
			return this.error(message.channel, `Ban match must be enabled in the moderation settings in the dashboard.`);
		}

		if (!this.isServerAdmin(message.member, message.channel)) {
			return this.error(message.channel, `You don't have permissions to use this command.`);
		}

		const guild      = (<eris.GuildChannel>message.channel).guild;
		const modUtils   = new ModUtils(this.dyno, guild);
		const Moderation = this.dyno.modules.get('Moderation');

		if (!args || !args.length) {
			return this.help(message, guildConfig);
		}

		const text = args.join(' ').split('|');

		if (args.join(' ').length < 4) {
			return this.error(message.channel, `Match text not long enough (min 4 characters).`);
		}

		const messages = await this.getMessages((<eris.GuildChannel>message.channel), {
			limit: 100,
			before: message.id,
			filter: (m: eris.Message) => {
				if (m.member.bot) {
					return;
				}
				if (this.isServerMod(m.member, message.channel)) {
					return;
				}
				if (modUtils.isProtected(message, m.member, guildConfig)) {
					return;
				}
				const content = m.content.toLowerCase();
				for (const t of text) {
					if (content.includes(t.toLowerCase())) {
						return true;
					}
				}
			},
		});

		if (!messages || !messages.length) {
			return this.error(message.channel, `I didn't find any matching messages.`);
		}

		const uniqueIds = [...new Set(messages.map((m: eris.Message) => m.author.id))];
		const uniqueMembers = uniqueIds.map((id: string) => guild.members.find((m: eris.Member) => m.id === id));

		const memberLog = uniqueMembers.map((m: eris.Member) => `${m.id} | ${m.username}#${m.discriminator}`).join('\n');

		const channel = this.client.getChannel(guildConfig.moderation.channel);
		if (channel) {
			const msgArray = this.utils.splitMessage(memberLog, 1990);
			msgArray.unshift(`Banned Users:`);

			for (const m of msgArray) {
				await this.sendCode(channel, `${m.toString()}`, 'js').catch((err: any) => console.error(err));
			}
		}

		const reason = `Ban match \`${text}\` by ${this.utils.fullName(message.author)} (${message.author.id})`;

		for (const id of uniqueIds) {
			let user = this.client.users.find((m: eris.User) => m.id === id);
			user = user ? user.toJSON() : null;
			this.client.banGuildMember(guild.id, id, 7, reason)
				.then(async () => {
					if (!user) {
						const ban = await this.client.getGuildBan(guild.id, id).catch(() => false).then((d: ErisBan) => ban.user || ban);
						if (ban) {
							user = ban;
						}
					}
					modUtils.log({
						type: 'Ban',
						user: user,
						guild: guild,
						mod: message.author,
						reason: reason,
						guildConfig: guildConfig,
					});
				})
				.catch(() => null);
		}

		this.deleteCommand(message, guildConfig);

		return Promise.resolve();
	}

	private async ban({ message, args, guildConfig, preserve }: any) {
		const guild      = (<eris.GuildChannel>message.channel).guild;
		const modUtils   = new ModUtils(this.dyno, guild);
		const Moderation = this.dyno.modules.get('Moderation');

		let user: eris.Member;
		let reason = null;
		let limit  = null;

		if (this.isOverseer(message.member) && args[0] === 'match' && args.length > 1) {
			return this.match({ message, args, guildConfig});
		}

		try {
			user = <eris.Member>this.resolveUser(guild, args[0], null, true);

			if (args[1] && args[1].match(/([0-9]+)([a-zA-Z]+)?/g)) {
				limit = this.utils.parseTimeLimit(args[1]);
			}

			reason = limit && args.length > 2 ? args.slice(2).join(' ') : args.length > 1 ? args.slice(1).join(' ') : null;
			reason = reason || null;

			if (!user && args[0].match(/^([0-9]+)$/)) {
				if (args[0] === this.client.user.id || args[0] === message.author.id) {
					return this.error(message.channel, `I can't ban ${user.username}#${user.discriminator}`);
				}

				try {
					const res = await modUtils.banMember(guild, message, args[0], guildConfig, reason, limit, preserve);
					return this.success(message.channel, res);
				} catch (err) {
					return this.error(message.channel, err);
				}
			}

			if (!user) {
				return this.error(message.channel, `I can't find user ${args[0]}.`);
			}

			try {
				const res = await modUtils.banMember(guild, message, user, guildConfig, reason, limit, preserve);
				return this.success(message.channel, res);
			} catch (err) {
				return this.error(message.channel, err);
			}
		} catch (err) {
			this.logger.error(err);
			return this.error(message.channel, `Something went wrong.`);
		}
	}

	private async getMessages(channel: eris.GuildChannel, options: any = {}) {
		const channelId = typeof channel === 'string' ? channel : channel.id || null;
		if (!channelId) {
			return Promise.resolve();
		}

		let messages;
		try {
			messages = await this.client.getMessages(channelId, options.limit || 5000, options.before || null);
		} catch (err) {
			this.logger.error(err);
			return Promise.resolve();
		}

		if (!messages || !messages.length) {
			return Promise.resolve();
		}
		if (options.filter) {
			messages = messages.filter(options.filter);
		}
		if (options.slice) {
			const count = options.slice > messages.length ? messages.length : options.slice;
			messages = messages.slice(0, count);
		}

		return Promise.resolve(messages);
	}
}
