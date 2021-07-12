'use strict';

const Command = Loader.require('./core/structures/Command');

class RolePersist extends Command {
	constructor(...args) {
		super(...args);

		this.aliases      = ['rolepersist', 'role5ever'];
		this.group        = 'Moderator';
		this.description  = 'Assign/unassign a role that persists if the user leaves and rejoins.';
		this.usage        = 'rolepersist [user] [role], [optional reason]';
		this.example      = `rolepersist @NoobLance Special, Because he's special`;
		this.permissions  = 'serverMod';
		this.cooldown     = 5000;
		this.expectedArgs = 2;
	}

	execute({ message, args, guildConfig }) {
		const Moderation = this.dyno.modules.get('Moderation');
		const member = this.resolveUser(message.channel.guild, args[0]);
		const modPerms = [ 'kickMembers', 'banMembers', 'administrator', 'manageChannels', 'manageGuild', 'manageNicknames', 'manageRoles' ];

		if (!member) {
			return this.error(message.channel, `Couldn't find the user ${args[0]}.`);
		}

		let [rolename, reason] = args.slice(1).join(' ').split(', ');

		const role = this.resolveRole(message.channel.guild, rolename);
		if (!role) {
			return this.error(message.channel, `I can't find the role ${rolename}`);
		}

		for (let perm of modPerms) {
			if (role.permissions.has(perm)) {
				return this.error(message.channel, `That role has mod permissions, it cannot be persisted.`);
			}
		}

		// set the reason if it doesn't exist
		reason = reason || 'No reason given.';

		return Moderation.commands.persist(message, member, role, reason)
			.then(res => this.success(message.channel, res))
			.catch(err => this.error(message.channel, err));
	}
}

module.exports = RolePersist;
