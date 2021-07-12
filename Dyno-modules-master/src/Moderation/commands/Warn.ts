import {Command} from '@dyno.gg/dyno-core';
import * as core from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';
import ModUtils from '../ModUtils';

export default class Warn extends Command {
	public aliases     : string[] = ['warn'];
	public group       : string   = 'Moderator';
	public module      : string   = 'Moderation';
	public description : string   = 'Warn a member';
	public usage       : string   = 'warn [user] [reason]';
	public example     : string   = 'warn @NoobLance Stop posting lewd images';
	public permissions : string   = 'serverMod';
	public cooldown    : number   = 3000;
	public expectedArgs: number   = 2;

	public async execute({ message, args, guildConfig }: core.CommandData) {
		const guild = (<eris.GuildChannel>message.channel).guild;
		const modUtils = new ModUtils(this.dyno, guild);
		const user     = this.resolveUser(guild, args[0], null, true);

		if (!user) {
			return this.error(message.channel, `I can't find user ${args[0]}.`);
		}

		const reason = args.length > 1 ? args.slice(1).join(' ') : null;

		if (!reason) {
			return this.error(message.channel, `Please give a reason.`);
		}

		try {
			const res = await modUtils.warnMember(guild, message, user, guildConfig, reason);
			return this.success(message.channel, res);
		} catch (err) {
			return this.error(message.channel, err);
		}
	}
}
