import {Command} from '@dyno.gg/dyno-core';
import * as core from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';
import ModUtils from '../ModUtils';

export default class DelWarn extends Command {
	public aliases     : string[] = ['delwarn'];
	public group       : string   = 'Moderator';
	public module      : string   = 'Moderation';
	public description : string   = 'Delete a single warning for a member';
	public usage       : string   = 'delwarn [warning ID]';
	public example     : string   = 'delwarn 5d3b50eb105c06b128b28c57';
	public permissions : string   = 'serverMod';
	public cooldown    : number   = 3000;
	public expectedArgs: number   = 1;

	public async execute({ message, args, guildConfig }: core.CommandData) {
		const guild = (<eris.GuildChannel>message.channel).guild;
		const modUtils = new ModUtils(this.dyno, guild);

		const id = args[0];

		try {
			const res = await modUtils.unwarnMember(guild, message, guildConfig, id);
			return this.success(message.channel, res);
		} catch (err) {
			return this.error(message.channel, err);
		}
	}
}
