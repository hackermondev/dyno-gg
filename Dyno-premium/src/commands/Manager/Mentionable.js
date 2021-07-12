'use strict';

const Command = Loader.require('./core/structures/Command');

class Mentionable extends Command {
	constructor(...args) {
		super(...args);

		this.aliases      = ['mentionable'];
		this.group        = 'Manager';
		this.description  = 'Toggle making a role mentionable on/off';
		this.usage        = 'mentionable [role name]';
		this.permissions  = 'serverAdmin';
		this.disableDM    = true;
		this.expectedArgs = 1;
		this.requiredPermissions = ['manageRoles'];
	}

	async execute({ message, args }) {
		let mentionable,
			rolename;

		if (['true', 'false'].includes(args[args.length - 1])) {
			mentionable = args[args.length - 1] === 'true' ? true : false; // eslint-disable-line
			rolename = args.slice(0, args.length - 1).join(' ');
		}

		const role = this.resolveRole(message.channel.guild, rolename || args.join(' '));

		if (!role) {
			return this.error(message.channel, `Couldn't find that role.`);
		}

		mentionable = mentionable || !(role.mentionable || false);

		return role.edit({ mentionable: mentionable })
			.then(() => this.success(message.channel, `Made the ${role.name} role ${mentionable ? 'mentionable' : 'unmentionable'}`))
			.catch(() => this.error(message.channel, `I couldn't make changes to that role.`));
	}
}

module.exports = Mentionable;
