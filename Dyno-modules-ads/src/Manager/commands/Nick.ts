import { Command, CommandData } from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';

export default class Nick extends Command {
	public aliases     : string[] = ['nick'];
	public group       : string   = 'Manager';
	public description : string   = 'Change the bot nickname.';
	public usage	   : string   = 'nick [new nickname]';
	public example	   : string   = 'nick Titan';
	public permissions : string   = 'serverAdmin';
	public cooldown    : number   = 5000;
	public expectedArgs: number   = 1;
	public requiredPermissions: string[] = ['changeNickname'];

	public async execute({ message, args }: CommandData) {
		const nick = (args.length) ? args.join(' ') : null;

		const guild = (<eris.GuildChannel>message.channel).guild;

		try {
			await this.client.editNickname(guild.id, nick);
		} catch (err) {
			return this.error(message.channel, 'Unable to change nickname.', err);
		}

		return this.success(message.channel, 'Nickname changed.');
	}
}
