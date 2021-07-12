import { Command, CommandData } from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';

export default class SetNick extends Command {
	public aliases     : string[] = ['setnick'];
	public group       : string   = 'Manager';
	public description : string   = 'Change the nickname of a user.';
	public usage	   : string   = 'setnick [user] [new nickname]';
	public example	   : string   = 'setnick MEE6 Kick Me';
	public permissions : string   = 'serverAdmin';
	public cooldown    : number   = 5000;
	public expectedArgs: number   = 2;
	public requiredPermissions: string[] = ['changeNickname'];

	public async execute({ message, args }: CommandData) {
		const guild = (<eris.GuildChannel>message.channel).guild;
		const member = this.resolveUser(guild, args[0]);

		if (!member) {
			return this.error(message.channel, `Couldn't find that user.`);
		}

		const nick = args.length > 1 ? args.slice(1).join(' ') : null;
		// member = guild.members.get(this.client.user.id);

		try {
			await this.client.editGuildMember(guild.id, member.id, { nick });
		} catch (err) {
			return this.error(message.channel, `Unable to change nickname for ${this.utils.fullName(member)}.`, err);
		}

		return this.success(message.channel, 'Nickname changed.');
	}
}
