import { Command, CommandData } from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';

export default class Addmod extends Command {
	public aliases     : string[] = ['addmod'];
	public group       : string   = 'Manager';
	public description : string   = 'Add a moderator role.';
	public usage	   : string   = 'addmod [role]';
	public example	   : string   = 'addmod Police';
	public permissions : string   = 'serverAdmin';
	public cooldown    : number   = 5000;
	public expectedArgs: number   = 1;

	public async execute({ message, args, guildConfig }: CommandData) {
		const role = this.resolveRole((<eris.GuildChannel>message.channel).guild, args.join(' '));

		if (!role) {
			return this.error(message.channel, `I couldn't find the role ${args[0]}.`);
		}

		guildConfig.modRoles = guildConfig.modRoles || [];

		if (role) {
			if (guildConfig.modRoles.includes(role.id)) {
				return this.error(message.channel, 'That role already has moderator permissions.');
			}

			guildConfig.modRoles.push(role.id);

			try {
				await this.dyno.guilds.update(guildConfig._id, { $set: { modRoles: guildConfig.modRoles } });
				return this.success(message.channel, `Users in role ${role.name} now have moderator permissions.`);
			} catch (err) {
				this.logger.error(err);
				return this.error(message.channel, 'Something went wrong. This is probably not your fault.', err);
			}
		}
	}
}
