'use strict';

const Command = Loader.require('./core/structures/Command');

class Rolename extends Command {
	constructor(...args) {
		super(...args);

		this.aliases      = ['rolename'];
		this.group        = 'Manager';
		this.description  = 'Change the name of a role.';
		this.defaultUsage = 'rolename [role name], [new name]';
		this.permissions  = 'serverAdmin';
		this.disableDM    = true;
		this.expectedArgs = 2;
		this.cooldown     = 6000;
		this.requiredPermissions = ['manageRoles'];
		this.usage = [
			'rolename Members, Regulars',
			'rolename The Hammer, Moderators'
		];

	}

	async execute({ message, args }) {
		let [roleName, newName] = args.join(' ').replace(', ', ',').split(',');

		if (!roleName || !newName) {
			return this.error(message.channel, 'Separate role names with a comma. See `?help rolename` for examples.');
		}

		const role = this.resolveRole(message.channel.guild, roleName);

		if (!role) {
			return this.error(message.channel, `Couldn't find the \`${roleName}\` role.`);
		}

		return role.edit({ name: newName })
			.then(() => this.success(message.channel, `Changed the role name for ${roleName} to ${newName}`))
			.catch(() => this.error(message.channel, `I couldn't make changes to that role.`));
	}
}

module.exports = Rolename;
