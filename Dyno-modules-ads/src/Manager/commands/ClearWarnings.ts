import { Command, CommandData } from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';

export default class ClearWarnings extends Command {
	public aliases     : string[] = ['clearwarn'];
	public group       : string   = 'Manager';
	public description : string   = 'Clear warnings for a user.';
	public usage	   : string   = 'clearwarn [user]';
	public example	   : string[]  = ['clearwarn NoobLance', 'clearwarn all'];
	public permissions : string   = 'serverAdmin';
	public cooldown    : number   = 5000;
	public expectedArgs: number   = 1;

	public async execute({ message, args }: CommandData) {
		let user: eris.User | eris.Member;
		let userid: string;

		const guild = (<eris.GuildChannel>message.channel).guild;

		if (isNaN(args[0]) && args[0] !== 'all') {
			user = this.resolveUser(guild, args.join(' '));
			if (!user) {
				return this.error(message.channel, `I can't find user ${args.join(' ')}.`);
			}
		} else if (args[0] === 'all') {
			if (message.author.id !== guild.ownerID) {
				return this.error(message.channel, 'Only the server owner can clear all warnings.');
			}

			try {
				await this.models.Warning.remove({ guild: guild.id }).exec();
			} catch (err) {
				this.logger.error(err);
				return this.error(message.channel, 'Something went wrong.');
			}

			return this.success(message.channel, `Cleared all warnings for this server.`);
		} else {
			userid = args[0];
		}

		let warnings: Warning[];

		try {
			warnings = await this.models.Warning
				.find({ guild: guild.id, 'user.id': userid || user.id })
				.lean().exec();
			if (!warnings || !warnings.length) {
				return this.error(message.channel, `No warnings found for ${userid || user.mention}.`);
			}
			await this.models.Warning.remove({ guild: guild.id, 'user.id': userid || user.id }).exec();
		} catch (err) {
			this.logger.error(err);
			return this.error(message.channel, 'Something went wrong.');
		}

		if (warnings) {
			return this.success(message.channel, `Cleared ${warnings.length} warnings for ${userid || this.utils.fullName(user)}.`);
		}
	}
}
