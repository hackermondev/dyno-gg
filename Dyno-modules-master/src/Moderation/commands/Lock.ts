import {Command} from '@dyno.gg/dyno-core';
import * as core from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';
import ModUtils from '../ModUtils';

export default class Lock extends Command {
	public aliases            : string[] = ['lock'];
	public group              : string   = 'Moderator';
	public module             : string   = 'Moderation';
	public description        : string   = 'Lock a channel with optional timer and message.';
	public usage              : string   = 'lock [channel] (time) (message)';
	public permissions        : string   = 'serverMod';
	public requiredPermissions: string[] = ['manageChannels'];
	public cooldown           : number   = 5000;
	public expectedArgs       : number   = 1;
	public example            : string[] = [
		'lock #general We will be back soon',
		'lock #support 2h This channel will be locked for two hours.',
		`lock #help 4h`,
	];

	public async execute({ message, args, guildConfig }: core.CommandData) {
		const guild = (<eris.GuildChannel>message.channel).guild;
		const modUtils = new ModUtils(this.dyno, guild);
		const limit    = this.utils.parseTimeLimit(args[1]);
		const channel  = <eris.TextChannel>this.resolveChannel(guild, args[0]);

		if (!channel) {
			return this.error(message.channel, `I can't find that channel ${args[0]}.`);
		}

		if (limit && (isNaN(parseInt(limit, 10)) || limit > 10080)) {
			return this.error(message.channel, 'Please use a valid limit less than 7 days. ex. 3m, 2h, 1d');
		}

		const msg = limit && args.length > 2 ?
			args.slice(2).join(' ') :
			(args.length > 1 ? args.slice(1).join(' ') : null);

		try {
			const res = await modUtils.lockChannel(channel, message.author, guildConfig, limit || null, msg);

			modUtils.channelLog({
				type: 'Lock',
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
