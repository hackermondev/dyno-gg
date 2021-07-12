import {Command} from '@dyno.gg/dyno-core';
import * as core from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';
import ModUtils from '../ModUtils';

export default class Softban extends Command {
	public aliases: string[]      = ['softban'];
	public group: string        = 'Moderator';
	public module: string       = 'Moderation';
	public description: string  = 'Softban a member (ban and immediate unban to delete user messages)';
	public usage: string        = `softban [user] [reason]`;
	public example: string      = `softban @NoobLance Get out!`;
	public permissions: string  = 'serverMod';
	public cooldown: number     = 3000;
	public expectedArgs: number = 1;
	public requiredPermissions: string[] = ['banMembers'];

	public async execute({ message, args, guildConfig }: core.CommandData) {
		const guild = (<eris.GuildChannel>message.channel).guild;
		const modUtils = new ModUtils(this.dyno, guild);
		const reason   = args.length > 1 ? args.slice(1).join(' ') : null;
		const user     = this.resolveUser(guild, args[0], null, true);

		if (!user) {
			return this.error(message.channel, `I can't find user ${args[0]}.`);
		}

		try {
			const res = await modUtils.softbanMember(guild, message, user, guildConfig, reason);
			return this.success(message.channel, res);
		} catch (err) {
			return this.error(message.channel, err);
		}
	}
}
