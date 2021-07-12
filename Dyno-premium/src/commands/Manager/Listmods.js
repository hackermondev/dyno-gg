'use strict';

const Command = Loader.require('./core/structures/Command');

class Listmods extends Command {
	constructor(...args) {
		super(...args);

		this.aliases      = ['listmods'];
		this.group        = 'Manager';
		this.description  = 'List moderators';
		this.usage        = 'listmods';
		this.permissions  = 'serverAdmin';
		this.disableDM    = true;
		this.expectedArgs = 0;
	}

	execute({ message, guildConfig }) {
		const msgArray = [];

		if (!guildConfig) {
			return this.error(message.channel, 'No settings found for this server.');
		}

		if ((!guildConfig.mods || !guildConfig.mods.length) &&
			(!guildConfig.modRoles || !guildConfig.modRoles.length)) {
			return this.sendMessage(message.channel, 'There are no moderators for this server. Use the `addmod` command to add.');
		}

		msgArray.push('```ini');
		msgArray.push('[ Moderators ]');

		if (!guildConfig.mods || !guildConfig.mods.length) {
			msgArray.push('None');
		} else {
			for (const mod of guildConfig.mods) {
				const member = message.channel.guild.members.get(mod);
				if (!member) continue;
				msgArray.push(this.utils.fullName(member));
			}
		}

		msgArray.push('[ Mod Roles ]');

		if (!guildConfig.modRoles || !guildConfig.modRoles.length) {
			msgArray.push('None');
		} else {
			for (const roleid of guildConfig.modRoles) {
				const role = message.channel.guild.roles.get(roleid);
				if (!role) continue;
				msgArray.push(role.name);
			}
		}

		msgArray.push('```');

		return this.sendMessage(message.channel, msgArray);
	}
}

module.exports = Listmods;
