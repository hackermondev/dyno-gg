'use strict';

const Command = Loader.require('./core/structures/Command');

class Delrole extends Command {
	constructor(...args) {
		super(...args);

		this.aliases      = ['delrole'];
		this.group        = 'Manager';
		this.description  = 'Delete a role';
		this.usage        = 'delrole [role name]';
		this.permissions  = 'serverAdmin';
		this.disableDM    = true;
		this.expectedArgs = 1;
		this.requiredPermissions = ['manageRoles'];
	}

	async execute({ message, args }) {
		let roleName = args.join(' '),
			role = message.channel.guild.roles.find(r => r.name === roleName);

		if (!role) {
			return this.error(message.channel, `Couldn't find the role ${roleName}`);
		}

		try {
			await role.delete();
			return this.success(message.channel, `Deleted role ${roleName}`);
		} catch (err) {
			this.logger.error(err);
			return this.error(message.channel, `I can't delete that role. I may not have manage roles permissions.`);
		}
	}
}

module.exports = Delrole;
