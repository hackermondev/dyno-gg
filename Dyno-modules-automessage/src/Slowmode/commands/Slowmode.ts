import {Command} from '@dyno.gg/dyno-core';
import * as core from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';
import * as each from 'async-each';
import * as dyno from 'Dyno';

export default class Slowmode extends Command {
	public aliases: string[]      = ['slowmode'];
	public group: string        = 'Manager';
	public module: string       = 'Slowmode';
	public description: string  = 'Enable/Disable slowmode';
	public cooldown: number     = 6000;
	public expectedArgs: number = 1;

	public commands: core.SubCommand[] = [
		{ name: 'channel', desc: 'Enable/Disable slowmode for a channel', usage: 'slowmode channel [channel] [time]' },
		{ name: 'user', desc: 'Enable/Disable slowmode per user for a channel', usage: 'slowmode user [channel] [time]' },
	];
	public usage: string[] = [
		'slowmode channel [channel] [limit]',
		'slowmode user [channel] [limit]',
	];
	public example: string[] = [
		'slowmode channel #channel 1s',
		'slowmode user #channel 5s',
	];

	public execute() {
		return Promise.resolve();
	}

	public channel({ message, args, guildConfig }: core.CommandData) {
		const guild = (<eris.GuildChannel>message.channel).guild;
		const channel = this.resolveChannel(guild, args[0]);
		if (!channel || channel.type !== 0) {
			return this.error(message.channel, `Please use a valid text channel.`);
		}

		if (guildConfig.slowmode && guildConfig.slowmode.channels) {
			if (guildConfig.slowmode.channels.find((c: any) => c.id === channel.id && !c.user)) {
				return this._disable(message, args, guildConfig);
			}
		}
		return this._enable(message, args, guildConfig);
	}

	public user({ message, args, guildConfig }: core.CommandData) {
		const guild = (<eris.GuildChannel>message.channel).guild;
		const channel = this.resolveChannel(guild, args[0]);
		if (!channel || channel.type !== 0) {
			return this.error(message.channel, `Please use a valid text channel.`);
		}

		if (guildConfig.slowmode && guildConfig.slowmode.channels) {
			if (guildConfig.slowmode.channels.find((c: any) => c.id === channel.id && c.user)) {
				return this._disable(message, args, guildConfig);
			}
		}

		return this._enable(message, args, guildConfig, true);
	}

	private _enable(message: eris.Message, args: any[], guildConfig: dyno.GuildConfig, user?: boolean) {
		const guild = (<eris.GuildChannel>message.channel).guild;
		const slowmode = this.dyno.modules.get('Slowmode');
		const channel = this.resolveChannel(guild, args[0]);
		let time = args[1] ? parseInt(args[1].replace('s', ''), 10) : 5;

		if (isNaN(time)) {
			time = 5;
		}

		return slowmode.enable(guildConfig, channel, time, user)
			.then(() => this.success(message.channel, `Enabled slowmode on <#${channel.id}> at a rate of 1 message per ${time} seconds.`))
			.catch((err: string) => this.error(message.channel, err));
	}

	private _disable(message: eris.Message, args: any[], guildConfig: dyno.GuildConfig) {
		const guild = (<eris.GuildChannel>message.channel).guild;
		const slowmode = this.dyno.modules.get('Slowmode');
		const channel = this.resolveChannel(guild, args[0]);

		if (!channel || channel.type !== 0) {
			return this.error(message.channel, `Please use a valid text channel.`);
		}

		return slowmode.disable(guildConfig, channel)
			.then(() => this.success(message.channel, `Disabled slowmode on <#${channel.id}>.`))
			.catch((err: string) => this.error(message.channel, err));
	}
}
