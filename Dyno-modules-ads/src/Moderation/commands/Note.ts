import { Command, CommandData } from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';
import ModUtils from '../ModUtils';

export default class Note extends Command {
	public aliases     : string[] = ['note'];
	public group       : string   = 'Moderator';
	public module      : string   = 'Moderation';
	public description : string   = 'Add note(s) about a member';
	public usage       : string   = 'note [user] [text]';
	public example     : string   = 'note @NoobLance Fantastic dude!';
	public permissions : string   = 'serverMod';
	public cooldown    : number   = 3000;
	public expectedArgs: number   = 2;

	public async execute({ message, args, guildConfig }: CommandData) {
		const guild = (<eris.GuildChannel>message.channel).guild;
		const modUtils = new ModUtils(this.dyno, guild);
		const user     = this.resolveUser(guild, args[0], null, true);

		if (!user) {
			return this.error(message.channel, `I can't find user ${args[0]}.`);
		}

		const note = args.length > 1 ? args.slice(1).join(' ') : null;

		if (!note || (note.length < 3 || note.length >= 500)) {
			return this.error(message.channel, `Please write a note. (min 3, max 500 characters)`);
		}

		try {
			const res = await modUtils.noteMember(guild, message, user, guildConfig, note);
			return this.success(message.channel, res);
		} catch (err) {
			return this.error(message.channel, err);
		}
	}
}
