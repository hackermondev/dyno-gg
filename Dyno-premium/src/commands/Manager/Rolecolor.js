'use strict';

const Command = Loader.require('./core/structures/Command');

class Rolecolor extends Command {
	constructor(...args) {
		super(...args);

		this.aliases      = ['rolecolor', 'rolecolour'];
		this.group        = 'Manager';
		this.description  = 'Change the color of a role.';
		this.usage        = 'rolecolor [role name] [hex color]';
		this.permissions  = 'serverAdmin';
		this.disableDM    = true;
		this.expectedArgs = 2;
		this.cooldown     = 6000;
		this.requiredPermissions = ['manageRoles'];
	}

	async execute({ message, args }) {
		let hexColor = args.pop();

		if (hexColor === 'random') {
			hexColor = ('00000' + (Math.random() * (1 << 24) | 0).toString(16)).slice(-6);
		}

		const color = this.utils.hexToInt(hexColor);
		const role = this.resolveRole(message.channel.guild, args.join(' '));

		if (!role) {
			return this.error(message.channel, `Couldn't find that role.`);
		}

		return role.edit({ color: color })
			.then(() => this.sendMessage(message.channel, {
				embed: { color: color, description: `Changed the role color for ${role.name} to #${hexColor}` },
			}))
			.catch(() => this.error(message.channel, `I couldn't make changes to that role.`));
	}
}

module.exports = Rolecolor;
