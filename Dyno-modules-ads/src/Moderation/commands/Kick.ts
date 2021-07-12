import {Command} from '@dyno.gg/dyno-core';
import * as core from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';
import ModUtils from '../ModUtils';

export default class Kick extends Command {
	public aliases            : string[] = ['kick'];
	public group              : string   = 'Moderator';
	public module             : string   = 'Moderation';
	public description        : string   = 'Kick a member';
	public usage              : string   = 'kick [user] [reason]';
	public example            : string   = 'kick @NoobLance Get out!';
	public permissions        : string   = 'serverMod';
	public requiredPermissions: string[] = ['kickMembers'];
	public cooldown           : number   = 3000;
	public expectedArgs       : number   = 1;

	public async execute({ message, args, guildConfig }: core.CommandData) {
		const guild = (<eris.GuildChannel>message.channel).guild;
		const modUtils = new ModUtils(this.dyno, guild);
		const reason   = args.length > 1 ? args.slice(1).join(' ') : null;
		const user     = <eris.Member>this.resolveUser(guild, args[0], null, true);

		if (!user) {
			return this.error(message.channel, `I can't find user ${args[0]}.`);
		}

		try {
			const res = await modUtils.kickMember(guild, message, user, guildConfig, reason);
			return this.success(message.channel, res);
		} catch (err) {
			return this.error(message.channel, err);
		}
	}
}
