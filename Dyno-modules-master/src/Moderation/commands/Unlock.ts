import {Command} from '@dyno.gg/dyno-core';
import * as core from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';
import ModUtils from '../ModUtils';

export default class Unlock extends Command {
	public aliases            : string[] = ['unlock'];
	public group              : string   = 'Moderator';
	public module             : string   = 'Moderation';
	public description        : string   = 'Unlock a previously locked channel.';
	public usage              : string   = 'unlock [channel] (message)';
	public permissions        : string   = 'serverAdmin';
	public requiredPermissions: string[] = ['manageChannels'];
	public cooldown           : number   = 5000;
	public expectedArgs       : number   = 1;
	public example            : string[] = [
		'unlock #general',
		`unlock #support We're back everyone!`,
	];

	public async execute({ message, args, guildConfig }: core.CommandData) {
		const guild = (<eris.GuildChannel>message.channel).guild;
		const modUtils = new ModUtils(this.dyno, guild);
		const msg = args.length > 1 ? args.slice(1).join(' ') : null;
		const channel  = <eris.TextChannel>this.resolveChannel(guild, args[0]);

		if (!channel) {
			return this.error(message.channel, `I can't find that channel ${args[0]}.`);
		}

		try {
			const res = await modUtils.unlockChannel(channel, message.author, guildConfig, msg);

			modUtils.channelLog({
				type: 'Unlock',
				channel: channel,
				guild: guild,
				user: message.author,
				guildConfig,
			});

			return this.success(message.channel, res);
		} catch (err) {
			return this.error(message.channel, err);
		}
	}
}
