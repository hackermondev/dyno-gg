'use strict';

const Command = Loader.require('./core/structures/Command');
const utils = Loader.require('./core/utils');

class Addrank extends Command {
	constructor(...args) {
		super(...args);

		this.aliases      = ['addrank'];
		this.group        = 'Roles';
		this.module       = 'Autoroles';
		this.description  = 'Add a new rank for members to join, works with existing or new roles.';
		this.usage        = 'addrank [name] (hex color) (hoist)';
		this.example      = 'addrank Team Mystic #0677ef true';
		this.permissions  = 'serverAdmin';
		this.cooldown     = 8000;
		this.expectedArgs = 1;
		this.requiredPermissions = ['manageRoles'];
	}

	execute({ message, args }) {
		const Autoroles = this.dyno.modules.get('Autoroles');

		let role = message.channel.guild.roles.find(r => r.name.toLowerCase() === args.join(' ').toLowerCase());

		if (role) {
			return Autoroles.ranks.createRank(message.channel.guild, role, role.name)
				.then(() => this.success(message.channel, `Created rank ${role.name}`))
				.catch(err => this.error(message.channel, `I can't create that rank.`, err));
		}

		const options = {
			hoist: false,
			color: null,
			name: null,
		};

		if (['true', 'yes'].includes(args[args.length - 1].toLowerCase()))
			options.hoist = args.pop();

		if (args.length > 1 && args[args.length - 1].match(/^#?([a-f\d]{3}){1,2}\b/i))
			options.color = utils.hexToInt(args.pop());

		options.name = args.join(' ');

		if (!options.name) {
			return this.error(message.channel, 'Please give a role name.');
		}

		return this.createRole(message.channel.guild, options)
			.then(role => Autoroles.ranks.createRank(message.channel.guild, role, options.name)
				.then(() => this.success(message.channel, `Created rank ${options.name}`))
				.catch(err => this.error(message.channel, err)))
			.catch(err => this.error(message, `I can't create that rank.`, err));
	}
}

module.exports = Addrank;
