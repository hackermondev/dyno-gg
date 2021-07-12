import { Command, CommandData, SubCommand } from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';

export default class ActionLog extends Command {
	public aliases: string[]      = ['actionlog'];
	public group: string        = 'Action Log';
	public description: string  = 'Configure actionlog settings.';
	public defaultUsage: string = 'actionlog help';
	public permissions: string  = 'serverAdmin';
	public cooldown: number     = 5000;
	public expectedArgs: number = 0;
	public commands: SubCommand[] = [
		{ name: 'ignorechannel', desc: 'Ignore/unignore a channel', usage: 'actionlog ignorechannel [channel|name]' },
		{ name: 'ignored', desc: 'List ignored channels', usage: 'actionlog list' },
	];
	public usage: string[] = [
		'actionlog ignorechannel [channel]',
		'actionlog ignored',
	];
	public example: string[] = [
		'actionlog ignorechannel #admins',
	];

	public async execute() {
		return Promise.resolve();
	}

	public ignorechannel({ message, args, guildConfig }: CommandData) {
		const guild = (<eris.GuildChannel>message.channel).guild;
		if (!args || !args.length) {
			return this.help(message, guildConfig);
		}

		const channel = this.resolveChannel(guild, args[0]);
		if (!channel) {
			return this.error(message.channel, `Please enter a valid channel.`);
		}

		guildConfig.actonlog = guildConfig.actonlog || {};
		guildConfig.actonlog.ignoredChannels = guildConfig.actonlog.ignoredChannels || [];

		const index = guildConfig.actonlog.ignoredChannels.findIndex((c: any) => c.id === channel.id);
		let status = 'disabled';

		if (index === -1) {
			guildConfig.actonlog.ignoredChannels.push({ id: channel.id, name: channel.name });
			status = 'enabled';
		} else {
			guildConfig.actonlog.ignoredChannels.splice(index, 1);
		}

		return this.dyno.guilds.update(guild.id, { $set: { 'actonlog.ignoredChannels': guildConfig.actonlog.ignoredChannels } })
			.then(() => this.success(message.channel, `Action Log ${status} in ${channel.name}.`))
			.catch(() => this.error(message.channel, 'Something went wrong.'));
	}

	public ignored({ message, args, guildConfig }: CommandData) {
		if (!guildConfig.actionlog) {
			return this.error(message.channel, `Action log is not configured yet.`);
		}

		if (!guildConfig.actionlog.ignoredChannels) {
			return this.error(message.channel, `There are no channels or roles ignored by action log.`);
		}

		let channels;
		if (guildConfig.actionlog.ignoredChannels) {
			channels = guildConfig.actionlog.ignoredChannels.map((c: any) => {
				const channel = this.client.getChannel(c.id);
				return channel || `#${c.name} (Deleted)`;
			});
		}

		const embed = this.buildEmbed({
			fields: [
				{ name: 'Ignored Channels', value: channels && channels.length ?
					channels.map((c: eris.GuildChannel) => `${c.mention || c}`).join('\n') : 'None' },
			],
			timestamp: (new Date()).toISOString(),
		}, true);

		return this.sendMessage(message.channel, { embed });
	}
}
