import {Module} from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';
import * as dyno from 'Dyno';
import * as commands from './commands';

/**
 * Slowmode Module
 * @class Slowmode
 * @extends Module
 */
export default class Slowmode extends Module {
	public module      : string   = 'Slowmode';
	public friendlyName: string   = 'Slowmode';
	public description : string   = 'Rate limit the number of messages members can send in a channel.';
	public list        : boolean  = true;
	public enabled     : boolean  = false;
	public hasPartial  : boolean  = false;
	public vipOnly     : boolean  = true;
	public permissions : string[] = ['manageMessages'];
	public commands    : {}       = commands;

	get settings() {
		return {
			channels: { type: Array, default: [] },
		};
	}

	public start() {
		this.cooldowns = new Map();
	}

	public enable(guildConfig: dyno.GuildConfig, channel: eris.GuildChannel, time: number, user: boolean) {
		const guild = (<eris.GuildChannel>channel).guild;
		guildConfig.slowmode = guildConfig.slowmode || {};
		guildConfig.slowmode.channels = guildConfig.slowmode.channels || [];

		const test = user ?
			(c: any) => c.id === channel.id :
			(c: any) => c.id === channel.id && user === true;

		if (guildConfig.slowmode.channels.find(test)) {
			return Promise.reject('Slowmode is already enabled on that channel.');
		}

		const doc: any = { id: channel.id, time: time };
		if (user) {
			doc.user = true;
		}

		guildConfig.slowmode.channels.push(doc);
		return this.dyno.guilds.update(guild.id, { $set: { slowmode: guildConfig.slowmode } });
	}

	public disable(guildConfig: dyno.GuildConfig, channel: eris.GuildChannel) {
		const guild = (<eris.GuildChannel>channel).guild;
		guildConfig.slowmode = guildConfig.slowmode || {};
		guildConfig.slowmode.channels = guildConfig.slowmode.channels || [];

		const index = guildConfig.slowmode.channels.findIndex((c: any) => c.id === channel.id);
		if (index === -1) {
			return Promise.reject(`Slowmode isn't enabled on that channel.`);
		}

		guildConfig.slowmode.channels.splice(index, 1);
		return this.dyno.guilds.update(guild.id, { $set: { slowmode: guildConfig.slowmode } });
	}

	/**
	 * Handle new message
	 * @param {Message} message Message object
	 * @returns {void}
	 */
	public messageCreate({ message, guildConfig, isAdmin }: any) {
		if (!this.dyno.isReady || !guildConfig) {
			return;
		}
		if (!message.channel.guild || !message.author || message.author.bot || !message.member) {
			return;
		}
		if (isAdmin || this.isServerMod(message.member, message.channel)) {
			return;
		}

		if (!this.isEnabled(message.channel.guild, this, guildConfig)) {
			return;
		}
		if (!this.hasPermissions(message.channel.guild, 'manageMessages')) {
			return;
		}

		const slowconfig = guildConfig.slowmode;
		if (!slowconfig || !slowconfig.channels || !slowconfig.channels.length) {
			return;
		}

		const channel = slowconfig.channels.find((c: any) => c.id === message.channel.id);
		if (!channel) {
			return;
		}

		const time = parseInt(channel.time, 10) * 1000;

		if (channel.user) {
			const cooldown = this.cooldowns.get(`${message.channel.id}.${message.author.id}`);
			if (cooldown && (Date.now() - cooldown) < time) {
				return message.delete().catch((err: string) => err);
			}
			this.cooldowns.set(`${message.channel.id}.${message.author.id}`, Date.now());
		} else {
			const cooldown = this.cooldowns.get(message.channel.id);
			if (cooldown && (Date.now() - cooldown) < time) {
				return message.delete().catch((err: string) => err);
			}
			this.cooldowns.set(message.channel.id, Date.now());
		}
	}
}
