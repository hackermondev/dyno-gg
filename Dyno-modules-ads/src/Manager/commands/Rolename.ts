import { Command, CommandData } from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';

export default class Rolename extends Command {
	public aliases     : string[] = ['rolename'];
	public group       : string   = 'Manager';
	public description : string   = 'Change the name of a role.';
	public usage	   : string   = 'rolename [role], [new name]';
	public example	   : string   = 'rolename Members, Regulars';
	public permissions : string   = 'serverAdmin';
	public cooldown    : number   = 6000;
	public expectedArgs: number   = 2;
	public requiredPermissions: string[] = ['manageRoles'];

	public async execute({ message, args }: CommandData) {
		const [roleName, newName] = args.join(' ').replace(', ', ',').split(',');

		if (!roleName || !newName) {
			return this.error(message.channel, 'Separate role names with a comma. See `?help rolename` for examples.');
		}

		const role = this.resolveRole((<eris.GuildChannel>message.channel).guild, roleName);

		if (!role) {
			return this.error(message.channel, `Couldn't find the \`${roleName}\` role.`);
		}

		return role.edit({ name: newName })
			.then(() => this.success(message.channel, `Changed the role name for ${roleName} to ${newName}`))
			.catch(() => this.error(message.channel, `I couldn't make changes to that role.`));
	}
}
