import { Command, CommandData } from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';

export default class IgnoreRole extends Command {
	public aliases     : string[] = ['ignorerole'];
	public group       : string   = 'Manager';
	public description : string   = 'Toggles command usage for a role. (Does not affect mods and managers)';
	public usage	   : string   = 'ignorerole [role]';
	public example	   : string   = 'ignorerole #annoying';
	public permissions : string   = 'serverAdmin';
	public cooldown    : number   = 5000;
	public expectedArgs: number   = 1;

	public execute({ message, args, guildConfig }: CommandData) {
		const guild = (<eris.GuildChannel>message.channel).guild;
		const role = this.resolveRole(guild, args[0]);
		if (!role) {
			return this.error(message.channel, `Please provide a valid role.`);
		}

		guildConfig.ignoredRoles = guildConfig.ignoredRoles || [];
		const index = guildConfig.ignoredRoles.indexOf(role.id);
		if (index > -1) {
			guildConfig.ignoredRoles.splice(index, 1);
		} else {
			guildConfig.ignoredRoles.push(role.id);
		}

		return this.dyno.guilds.update(guild.id, { $set: { ignoredRoles: guildConfig.ignoredRoles } })
			.then(() => this.success(message.channel, index > -1 ?
				`Removed ${role.name} from ignored roles. Commands can be used again.` :
				`Added ${role.name} to ignored roles. Commands will no longer be usable.`))
			.catch(() => this.error(message.channel, 'Something went wrong.'));
	}
}
