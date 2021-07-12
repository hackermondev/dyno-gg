import { Command, CommandData } from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';

export default class Delrole extends Command {
	public aliases     : string[] = ['delrole'];
	public group       : string   = 'Manager';
	public description : string   = 'Delete a role';
	public usage	   : string   = 'delrole [role]';
	public example	   : string   = 'delrole MEE6';
	public permissions : string   = 'serverAdmin';
	public cooldown    : number   = 5000;
	public expectedArgs: number   = 1;
	public requiredPermissions: string[] = ['manageRoles'];

	public async execute({ message, args }: CommandData) {
		const guild = (<eris.GuildChannel>message.channel).guild;
		const roleName = args.join(' ');
		const role = this.resolveRole(guild, roleName);

		if (!role) {
			return this.error(message.channel, `Couldn't find a role matching ${roleName}`);
		}

		const fullName = role.name;

		try {
			await role.delete();
			return this.success(message.channel, `Deleted role ${fullName}`);
		} catch (err) {
			return this.error(message.channel, `I can't delete the role ${fullName}. I may not have manage roles permissions.`);
		}
	}
}
