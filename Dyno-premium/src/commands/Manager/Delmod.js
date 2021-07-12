'use strict';

const Command = Loader.require('./core/structures/Command');

class Delmod extends Command {
	constructor(...args) {
		super(...args);

		this.aliases      = ['delmod'];
		this.group        = 'Manager';
		this.description  = 'Remove a bot moderator';
		this.usage        = 'delmod [user or role]';
		this.permissions  = 'serverAdmin';
		this.disableDM    = true;
		this.expectedArgs = 1;
	}

	async execute({ message, args, guildConfig }) {
		const role = this.resolveRole(message.channel.guild, args.join(' '));

		let user, index;

		if (!role) {
			user = this.resolveUser(message.channel.guild, args.join(' '));
			if (!user) return this.error(message.channel, `Couldn't find user or role ${args[0]}.`);
			user = user.user || user;
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

		if (!index === -1) {
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

module.exports = Delmod;
