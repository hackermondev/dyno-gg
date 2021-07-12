'use strict';

const Command = Loader.require('./core/structures/Command');
const utils = Loader.require('./core/utils');

class Roles extends Command {
	constructor(...args) {
		super(...args);

		this.aliases = ['roles'];
		this.group = 'Roles';
		this.description = 'Get a list of server roles and member counts.';
		this.usage = 'roles';
		this.permissions  = 'serverMod';
		this.expectedArgs = 0;
		this.cooldown = 30000;
	}

	async execute({ message }) {
		try {
			let roles = await this.getRoles(message.channel.guild);
			const msgArray = utils.splitMessage(roles, 1950);

			for (const m of msgArray) {
				this.sendCode(message.channel, m);
			}

			return Promise.resolve();
		} catch (err) {
			return this.error(message.channel, 'Something went wrong.', err);
		}
	}

	getRoles(guild) {
		if (!guild.roles || !guild.roles.size) {
			return Promise.resolve('There are no roles on this server.');
		}

		let msgArray = [],
			len = Math.max(...guild.roles.map(r => r.name.length));

		const roles = utils.sortRoles(guild.roles);

		for (let role of roles) {
			if (role.name === '@everyone') continue;
			const members = guild.members.filter(m => m.roles.includes(role.id));
			role.memberCount = members && members.length ? members.length : 0;
			msgArray.push(`${utils.pad(role.name, len)} ${role.memberCount} members`);
		}

		return Promise.resolve(msgArray.join('\n'));
	}
}

module.exports = Roles;
