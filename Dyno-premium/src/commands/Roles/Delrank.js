'use strict';

const Command = Loader.require('./core/structures/Command');

class Delrank extends Command {
	constructor(...args) {
		super(...args);

		this.aliases      = ['delrank'];
		this.group        = 'Roles';
		this.module       = 'Autoroles';
		this.description  = 'Delete a rank';
		this.usage        = 'delrank [role name]';
		this.permissions  = 'serverAdmin';
		this.cooldown     = 8000;
		this.expectedArgs = 1;
		this.requiredPermissions = ['manageRoles'];
	}

	async execute({ message, args }) {
		const Autoroles = this.dyno.modules.get('Autoroles');

		const roleName = args.join(' ');

		try {
			await Autoroles.ranks.deleteRank(message.channel.guild, roleName);
			return this.success(message.channel, `Deleted rank ${roleName}`);
		} catch (err) {
			return this.error(message.channel, `I can't delete that rank.`);
		}
	}
}

module.exports = Delrank;
