import {Command} from '@dyno.gg/dyno-core';
import * as core from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';
import ModUtils from '../ModUtils';

export default class ClearNotes extends Command {
	public aliases     : string[] = ['clearnotes'];
	public group       : string   = 'Moderator';
	public module      : string   = 'Moderation';
	public description : string   = 'Delete all notes for a member';
	public usage       : string   = 'clearnotes [user]';
	public example     : string   = 'clearnotes @NoobLance';
	public permissions : string   = 'serverAdmin';
	public cooldown    : number   = 3000;
	public expectedArgs: number   = 1;

	public async execute({ message, args }: core.CommandData) {
		const guild = (<eris.GuildChannel>message.channel).guild;
		const user     = this.resolveUser(guild, args[0], null, true);

		if (!user) {
			return this.error(message.channel, `I can't find user ${args[0]}.`);
		}

		try {
			await this.models.Note.update({
				guild: guild.id,
				userid: user.id,
			}, { $set: { notes: [] } });
			return this.success(message.channel, `Cleared all notes for ${this.utils.fullName(user)}`);
		} catch (err) {
			this.logger.error(err);
			return this.error(message.channel, `Something went wrong.`);
		}
	}
}
