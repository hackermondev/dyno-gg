'use strict';

const Command = Loader.require('./core/structures/Command');

class Addrole extends Command {
	constructor(...args) {
		super(...args);

		this.aliases      = ['addrole'];
		this.group        = 'Manager';
		this.description  = 'Add a new role, with optional color and hoist.';
		this.usage        = 'addrole [name] [hex color] [hoist]';
		this.example      = 'addrole Test #FF0000 true';
		this.permissions  = 'serverAdmin';
		this.disableDM    = true;
		this.expectedArgs = 1;
		this.requiredPermissions = ['manageRoles'];
	}

	async execute({ message, args }) {
		const options = {};

		if (['true', 'yes'].includes(args[args.length - 1].toLowerCase()))
			options.hoist = args.pop();

		if (args.length > 1 && args[args.length - 1].match(/^#?([a-f\d]{3}){1,2}\b/i))
			options.color = this.utils.hexToInt(args.pop());

		options.name = args.join(' ');

		if (!options.name) {
			return this.error(message.channel, 'Please give a role name.');
		}

		try {
			await this.createRole(message.channel.guild, options);
			return this.success(message.channel, `Created role ${options.name}`);
		} catch (err) {
			return this.error(message.channel, `I can't create that role. I may not have manage roles permissions.`);
		}
	}
}

module.exports = Addrole;
