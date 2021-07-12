import {Command} from '@dyno.gg/dyno-core';
import * as core from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';
import ModUtils from '../ModUtils';

export default class DelNote extends Command {
	public aliases     : string[] = ['delnote'];
	public group       : string   = 'Moderator';
	public module      : string   = 'Moderation';
	public description : string   = 'Delete a note about a member';
	public usage       : string   = 'delnote [user] [note ID]';
	public example     : string   = 'delnote @NoobLance 1';
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

		let index = args[1];

		if (isNaN(index)) {
			return this.error(message.channel, `ID must be a number`);
		}

		index = index - 1;

		try {
			const res = await modUtils.unnoteMember(guild, message, user, guildConfig, index);
			return this.success(message.channel, res);
		} catch (err) {
			return this.error(message.channel, err);
		}
	}
}
