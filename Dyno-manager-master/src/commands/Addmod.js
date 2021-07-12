'use strict';

const {Command} = require('@dyno.gg/dyno-core');

class Addmod extends Command {
	constructor(...args) {
		super(...args);

		this.aliases      = ['addmod'];
		this.group        = 'Manager';
		this.description  = 'Add a moderator role.';
		this.usage        = 'addmod [role]';
		this.permissions  = 'serverAdmin';
		this.disableDM    = true;
		this.expectedArgs = 1;
	}

	async execute({ message, args, guildConfig }) {
		const role = this.resolveRole(message.channel.guild, args.join(' '));

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

module.exports = Addmod;
