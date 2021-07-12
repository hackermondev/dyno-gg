'use strict';

const {Command} = require('@dyno.gg/dyno-core');

class IgnoreRole extends Command {
	constructor(...args) {
		super(...args);

		this.aliases      = ['ignorerole'];
		this.group        = 'Manager';
		this.description  = 'Toggles command usage for a role. (Does not affect mods and managers)';
		this.usage        = 'ignorerole [role]';
		this.permissions  = 'serverAdmin';
		this.overseerEnabled = true;
		this.disableDM    = true;
		this.expectedArgs = 1;
	}

	execute({ message, args, guildConfig }) {
		const role = this.resolveRole(message.guild, args[0]);
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

		return this.dyno.guilds.update(message.guild.id, { $set: { 'ignoredRoles': guildConfig.ignoredRoles } })
			.then(() => this.success(message.channel, index > -1 ?
				`Removed ${role.name} from ignored roles. Commands can be used again.` :
				`Added ${role.name} to ignored roles. Commands will no longer be usable.`))
			.catch(() => this.error(message.channel, 'Something went wrong.'));
	}
}

module.exports = IgnoreRole;
