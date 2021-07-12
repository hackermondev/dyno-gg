import {Command} from '@dyno.gg/dyno-core';
import * as core from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';
import ModUtils from '../ModUtils';

export default class Unmute extends Command {
	public aliases: string[]      = ['unmute'];
	public group: string        = 'Moderator';
	public module: string       = 'Moderation';
	public description: string  = 'Unmute a member';
	public usage: string        = 'unmute [user] (optional reason)';
	public example: string      = 'unmute @NoobLance Appealed';
	public permissions: string  = 'serverMod';
	public cooldown: number = 3000;
	public expectedArgs: number = 1;
	public requiredPermissions: string[] = ['manageRoles'];

	public async execute({ message, args, guildConfig }: core.CommandData) {
		const guild    = (<eris.GuildChannel>message.channel).guild;
		const modUtils = new ModUtils(this.dyno, guild);

		try {
			const user     = this.resolveUser(guild, args[0]);
			const reason   = args.length > 1 ? args.slice(1).join(' ') : null;

			if (!user) {
				return this.error(message.channel, `I can't find user ${args[0]}.`);
			}

			if (user.id === this.client.user.id || user.id === message.author.id) {
				return this.error(message.channel, `I can't unmute ${this.utils.fullName(user)}`);
			}

			try {
				const res = await modUtils.unmuteMember(guild, message, user, guildConfig, reason);
				return this.success(message.channel, res);
			} catch (err) {
				return this.error(message.channel, err);
			}
		} catch (err) {
			this.logger.error(err);
			return this.error(message.channel, `Something went wrong.`);
		}
	}
}
