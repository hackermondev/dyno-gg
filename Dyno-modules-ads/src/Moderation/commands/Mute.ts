import {Command} from '@dyno.gg/dyno-core';
import * as core from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';
import ModUtils from '../ModUtils';

export default class Mute extends Command {
	public aliases            : string[] = ['mute'];
	public group              : string   = 'Moderator';
	public module             : string   = 'Moderation';
	public description        : string   = 'Mute a member so they cannot type or speak, time limit in minutes.';
	public usage              : string   = 'mute [user] [limit] [reason]';
	public permissions        : string   = 'serverMod';
	public cooldown           : number   = 3000;
	public expectedArgs       : number   = 2;
	public requiredPermissions: string[] = ['manageRoles', 'manageChannels', 'voiceMuteMembers'];
	public example            : string[] = [
		'mute @NoobLance 10 Shitposting',
		'mute User 10m spamming',
		'mute NoobLance 1d Too Cool',
		'mute NoobLance 5h He asked for it',
	];

	public async execute({ message, args, guildConfig }: core.CommandData) {
		const guild = (<eris.GuildChannel>message.channel).guild;
		const modUtils = new ModUtils(this.dyno, guild);
		const limit    = this.utils.parseTimeLimit(args[1]);
		const user     = this.resolveUser(guild, args[0], null, true);

		if (limit && limit > 20160) {
			return this.error(message.channel, `Please use a valid limit less than 14 days. ex. 3m, 2h, 1d`);
		}

		// let reason = args.length > 2 ? args.slice(2).join(' ') : null;
		let reason = limit && args.length > 2 ?
			args.slice(2).join(' ') :
			(args.length > 1 ? args.slice(1).join(' ') : null);

		if (!user) {
			return this.error(message.channel, `I can't find user ${args[0]}.`);
		}

		if (limit && isNaN(parseInt(limit, 10))) {
			return this.error(message.channel, 'Please use a valid limit less than 14 days. ex. 3m, 2h, 1d');
		}

		// set the reason if it doesn't exist
		reason = reason || 'No reason given.';

		try {
			const res = await modUtils.muteMember(guild, message, user, guildConfig, limit, reason);
			return this.success(message.channel, res);
		} catch (err) {
			return this.error(message.channel, err);
		}
	}
}
