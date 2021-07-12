import {Module} from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';
import * as dyno from 'Dyno';
import * as moment from 'moment';
import * as commands from './commands';

/**
 * AFK Module
 * @class AFK
 * @extends Module
 */
export default class AFK extends Module {
	public module: string = 'AFK';
	public description: string = 'Allow members to set an AFK status.';
	public list: boolean = true;
	public enabled: boolean = true;
	public hasPartial: boolean = false;
	public permissions: string[] = ['manageNicknames'];
	public commands: {} = commands;

	get settings() {
		return {
			users: { type: Object, default: {} },
			ignoredChannels: { type: Array },
		};
	}

	public start() {}

	/**
	 * Message create event handler
	 * @param  {Object} options.message Message object
	 * @return {void}
	 */
	public messageCreate({ message, guildConfig }: any) {
		if (!message.channel.guild || !message.member || message.author.bot) {
			return;
		}
		if (!this.isEnabled(message.channel.guild, this, guildConfig)) {
			return;
		}

		// const guildConfig = await this.dyno.guilds.getOrFetch(message.channel.guild.id);
		if (!guildConfig || !guildConfig.afk || !guildConfig.afk.users) {
			return;
		}

		if (guildConfig.afk && guildConfig.afk.ignoredChannels && guildConfig.afk.ignoredChannels.includes(message.channel.id)) {
			return;
		}

		if (guildConfig.afk.users[message.author.id]) {
			const afkUser = guildConfig.afk.users[message.author.id];

			if (Date.now() - parseInt(afkUser.time, 10) < 30000) {
				return;
			}

			if (message.member.nick && message.member.nick.includes('[AFK]')) {
				const name = message.member.nick.replace(/\[AFK\]\s/g, '');
				message.member.edit({ nick: name }).catch(() => false);
			}

			this.sendMessage(message.channel,
				`Welcome back ${message.author.mention}, I removed your AFK`,
				{ deleteAfter: 9000 },
			);
			delete guildConfig.afk.users[message.author.id];
			this.dyno.guilds.update(message.channel.guild.id, { $set: { 'afk.users': guildConfig.afk.users } })
				.catch((err: string) => this.logger.error(err));
			return;
		}

		if (message.mentions) {
			for (const user of message.mentions) {
				if (guildConfig.afk.users[user.id]) {
					const afkUser = guildConfig.afk.users[user.id];
					this.sendMessage(message.channel, `${afkUser.name} is AFK: ${afkUser.message} - ${moment(afkUser.time).fromNow()}`);
				}
			}
		}
	}

	public isAFK(message: eris.Message, guildConfig: dyno.GuildConfig) {
		guildConfig.afk = guildConfig.afk || {};
		guildConfig.afk.users = guildConfig.afk.users || {};
		if (guildConfig.afk.users[message.author.id]) {
			return true;
		}
		return false;
	}

	/**
	 * Set AFK for a user
	 */
	public async setAFK(message: eris.Message, status: string, guildConfig: dyno.GuildConfig) {
		const guild = (<eris.GuildChannel>message.channel).guild;
		if (!this.isEnabled(guild, this, guildConfig)) {
			return Promise.reject(null);
		}

		guildConfig.afk = guildConfig.afk || {};
		guildConfig.afk.users = guildConfig.afk.users || {};

		if (guildConfig.afk.users[message.author.id]) {
			return Promise.reject(null);
		}

		let name = message.member.nick || message.author.username;
		name = name.replace(/\[AFK\] /g, '');

		guildConfig.afk.users[message.member.id] = {
			name: name,
			message: status,
			time: Date.now(),
		};

		this.dyno.guilds.update(guild.id, { $set: { 'afk.users': guildConfig.afk.users } })
			.catch((err: string) => this.logger.error(err));

		await message.member.edit({ nick: `[AFK] ${name}` }).catch(() => null);

		return Promise.resolve(`${message.author.mention} I set your AFK: ${status}`);
	}

	/**
	 * Add AFK ignored channels to not return when talking
	 */
	public async ignoreChannel(message: eris.Message, guildConfig: dyno.GuildConfig) {
		const guild = (<eris.GuildChannel>message.channel).guild;

		guildConfig.afk = guildConfig.afk || {};
		guildConfig.afk.ignoredChannels = guildConfig.afk.ignoredChannels || [];

		if (guildConfig.afk.ignoredChannels.includes(message.channel.id)) {
			return Promise.reject('This channel is already ignored.');
		}

		guildConfig.afk.ignoredChannels.push(message.channel.id);

		try {
			await this.dyno.guilds.update(guild.id, { $set: { 'afk.ignoredChannels': guildConfig.afk.ignoredChannels } });
			return Promise.resolve(`Added ${(<eris.GuildChannel>message.channel).mention} to AFK ignored channels.`);
		} catch {
			return Promise.reject('Something went wrong.');
		}
	}
}
