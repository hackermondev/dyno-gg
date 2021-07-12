'use strict';

const Command = Loader.require('./core/structures/Command');

class Addmod extends Command {
	constructor(...args) {
		super(...args);

		this.aliases      = ['addmod'];
		this.group        = 'Manager';
		this.description  = 'Add a bot moderator or group of moderators.';
		this.usage        = 'addmod [user or role]';
		this.permissions  = 'serverAdmin';
		this.disableDM    = true;
		this.expectedArgs = 1;
	}

	async execute({ message, args, guildConfig }) {
		const role = this.resolveRole(message.channel.guild, args.join(' '));

		let user;

		if (!role) {
			user = this.resolveUser(message.channel.guild, args.join(' '));
			if (!user) return this.error(message.channel, `I couldn't find user or role ${args[0]}.`);
			user = user.user || user;
		}

		guildConfig.mods = guildConfig.mods || [];
		guildConfig.modRoles = guildConfig.modRoles || [];

		if (role) {
			if (guildConfig.modRoles.includes(role.id)) {
				return this.error(message.channel, 'That role already has mod permissions.');
			}

			guildConfig.modRoles.push(role.id);

			try {
				await this.dyno.guilds.update(guildConfig._id, { $set: { modRoles: guildConfig.modRoles } });
				return this.success(message.channel, `Users in role ${role.name} now have mod permissions.`);
			} catch (err) {
				this.logger.error(err);
				return this.error(message.channel, 'Something went wrong. This is probably not your fault.', err);
			}
		}

		if (guildConfig.mods.indexOf(user.id) > -1) {
			return this.error(message.channel, 'That user is already a server mod.');
		}

		guildConfig.mods.push(user.id);

		try {
			await this.dyno.guilds.update(guildConfig._id, { $set: { mods: guildConfig.mods } });
			return this.success(message.channel, `${user.username}#${user.discriminator} is now a server moderator.`);
		} catch (err) {
			this.logger.error(err);
			return this.error(message.channel, 'Something went wrong. This is probably not your fault.', err);
		}
	}
}

module.exports = Addmod;
