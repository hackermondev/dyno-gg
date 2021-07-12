import { Command, CommandData } from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';

export default class Delmod extends Command {
	public aliases     : string[] = ['delmod'];
	public group       : string   = 'Manager';
	public description : string   = 'Remove a moderator or mod role.';
	public usage	   : string   = 'delmod [user or role]';
	public example	   : string  = 'delmod NoobLance';
	public permissions : string   = 'serverAdmin';
	public cooldown    : number   = 5000;
	public expectedArgs: number   = 1;

	public async execute({ message, args, guildConfig }: CommandData) {
		const guild = (<eris.GuildChannel>message.channel).guild;

		const role = this.resolveRole(guild, args.join(' '));

		let user: eris.User | eris.Member;
		let index: number;

		if (!role) {
			user = this.resolveUser(guild, args.join(' '));
			if (!user) {
				if (guildConfig.mods && guildConfig.mods.includes(args[0])) {
					index = guildConfig.mods.indexOf(args[0]);
					if (index !== -1) {
						guildConfig.mods.splice(index, 1);
						await this.dyno.guilds.update(guildConfig._id, { $set: { mods: guildConfig.mods } });
						return this.success(message.channel, `Removed ${args[0]} as a moderator.`);
					}
				}
				return this.error(message.channel, `Couldn't find user or role ${args[0]}.`);
			}
		}

		guildConfig.mods = guildConfig.mods || [];
		guildConfig.modRoles = guildConfig.modRoles || [];

		if (role) {
			index = guildConfig.modRoles.indexOf(role.id);

			if (index === -1) {
				return this.error(message.channel, `That role doesn't have mod permissions.`);
			}

			guildConfig.modRoles.splice(index, 1);

			try {
				await this.dyno.guilds.update(guildConfig._id, { $set: { modRoles: guildConfig.modRoles } });
				return this.success(message.channel, `Users in role ${role.name} no longer have mod permissions.`);
			} catch (err) {
				this.logger.error(err);
				return this.error(message.channel, 'Something went wrong. This is probably not your fault.', err);
			}
		}

		index = guildConfig.mods.indexOf(user.id);

		if (index === -1) {
			return this.error(message.channel, 'That user or role is not a server mod.');
		}

		guildConfig.mods.splice(index, 1);

		try {
			await this.dyno.guilds.update(guildConfig._id, { $set: { mods: guildConfig.mods } });
			return this.success(message.channel, `${user.username}#${user.discriminator} is no longer a server moderator.`);
		} catch (err) {
			this.logger.error(err);
			return this.error(message.channel, 'Something went wrong. This is probably not your fault.', err);
		}
	}
}
