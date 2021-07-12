'use strict';

const each = require('async-each');
const Command = Loader.require('./core/structures/Command');

class Role extends Command {
	constructor(...args) {
		super(...args);

		this.aliases      = ['role'];
		this.group        = 'Manager';
		this.description  = 'Add/remove a user to a role or roles.';
		this.defaultUsage = 'role [user] [role name]';
		this.permissions  = 'serverAdmin';
		this.disableDM    = true;
		this.cooldown     = 5000;
		this.expectedArgs = 2;
		this.requiredPermissions = ['manageRoles'];
		this.defaultCommand = 'user';

		this.commands = [
			{ name: 'user', desc: 'Add/remove a user to a role or roles.', default: true, usage: 'role [user] [role]' },
			{ name: 'add', desc: 'Add a user to a role or roles.', usage: 'role add [user] [role]' },
			{ name: 'remove', desc: 'Remove a user from a role or roles.', usage: 'role remove [user] [role]' },
			{ name: 'toggle', desc: 'Toggle a user from a role or roles.', usage: 'role toggle [user] [role]' },
			{ name: 'removeall', desc: 'Remove all roles from a user', usage: 'role removall [user]' },
			{ name: 'all', desc: 'Add/remove all users to or from a role. (Limit 1 role)', usage: 'role all [role]' },
			{ name: 'bots', desc: 'Add/remove all bots to or from a role.', usage: 'role bots [role]' },
			{ name: 'humans', desc: 'Add/remove all humans to or from a role.', usage: 'role humans [role]' },
			{ name: 'in', desc: 'Add/remove users to or from a role that are in a role. (Limit 1 role)', usage: 'role in [in role], [role]' },
		];

		this.usage = [
			'role NoobLance Accomplices',
			'role NoobLance Regulars, Accomplices',
			'role NoobLance Members, -Newbies',
			'role NoobLance +Members, -Newbies (prevent toggling)',
			'role NoobLance Regulars, Accomplices, The Hammer, Overseers',
			'role add NoobLance Regulars (no -/+)',
			'role remove NoobLance Regulars (no -/+)',
			'role toggle NoobLance Regulars (no -/+)',
			'role all Humans',
			'role all -Humans',
			'role bots Boats',
			'role bots -Humans',
			'role humans Humans',
			'role in The Hammer, Secret Fights',
			'role in Accomplices, -Accomplices',
		];
	}

	async execute() {
		return Promise.resolve();
	}

	all(message, args, guildConfig, filter) {
		if (!this.hasPermissions(message.channel.guild, 'manageRoles')) {
			return this.error(message.channel, `I don't have \`Manager Roles\` permissions.`);
		}

		const arg = args.join(' ');
		const search = arg.replace(/^(\+|-)/, '');
		const role = this.resolveRole(message.channel.guild, search);

		if (!role) {
			return this.error(message.channel, `I couldn't find the ${search} role.`);
		}

		if (!this.hasRoleHierarchy(message.channel.guild, role)) {
			return this.error(message.channel, `My role isn't high enough to assign members to this role.`);
		}

		let members = [...message.channel.guild.members.values()];


		if (filter) {
			try {
				members = members.filter(filter);
			} catch (err) {
				this.logger.error(err);
				return this.error(`Something went wrong.`);
			}
		}


		members = arg.startsWith('-') ?
			members.filter(m => m.roles.includes(role.id)) :
			members.filter(m => !m.roles.includes(role.id));


		each(members, member => {
			if (arg.startsWith('+') && member.roles.includes(role.id)) return;
			if (arg.startsWith('-') && !member.roles.includes(role.id)) return;

			if (arg.startsWith('+')) {
				return member.addRole(role.id, encodeURIComponent(`Responsible User: ${this.utils.fullName(message.author)}`));
			}

			if (arg.startsWith('-')) {
				return member.removeRole(role.id, encodeURIComponent(`Responsible User: ${this.utils.fullName(message.author)}`));
			}

			return member.addRole(role.id, encodeURIComponent(`Responsible User: ${this.utils.fullName(message.author)}`));
		});

		let text = `Changing roles for ${members.length} members.`;
		if (members.length > 20) {
			text += ' This may take a while.';
		}

		return this.sendMessage(message.channel, text);
	}

	bots(message, args) {
		return this.all(message, args, null, m => m.bot);
	}

	humans(message, args) {
		return this.all(message, args, null, m => !m.bot);
	}

	in(message, args) {
		let [inSearch, roleSearch] = args.join(' ').split(',');

		inSearch = inSearch.trim();
		roleSearch = roleSearch.trim();

		const inRole = this.resolveRole(message.guild, inSearch);
		if (!inRole) {
			return this.error(message.channel, `I couldn't find the ${inSearch} role.`);
		}

		return this.all(message, [roleSearch], null, m => m.roles.includes(inRole.id));
	}

	async user(message, args) {
		const member = this.resolveUser(message.channel.guild, args[0]);

		if (!member) {
			return this.error(message.channel, `Couldn't find that user.`);
		}

		const roleArgs = args.slice(1).join(' ')
			.replace(/, /g, ',')
			.split(',');

		const roles = [...member.roles];
		const invalidRoles = [],
			roleChanges = [];

		for (const arg of roleArgs) {
			const search = arg.replace(/^(\+|-)/, '');
			const role = this.resolveRole(message.channel.guild, search);

			if (!role) {
				invalidRoles.push(search);
				continue;
			}

			if (arg.startsWith('+') && roles.indexOf(role.id) > -1) continue;
			if (arg.startsWith('-') && roles.indexOf(role.id) === -1) continue;

			if (arg.startsWith('+')) {
				roleChanges.push({ add: true, role });
				continue;
			}

			const index = member.roles.indexOf(role.id);

			if (arg.startsWith('-')) {
				roleChanges.push({ remove: true, role });
				continue;
			}

			if (index > -1) {
				roleChanges.push({ remove: true, role });
				continue;
			}

			roleChanges.push({ add: true, role });
		}

		if (invalidRoles.length) {
			return this.error(message.channel, `I can't find the role(s) ${invalidRoles.join(',')}.`);
		}

		if (!roleChanges.length) {
			return this.sendMessage(message.channel, `No changes were made.`);
		}

		let changes = [];

		for (const change of roleChanges) {
			let index = roles.indexOf(change.role.id);

			if (change.remove) {
				roles.splice(index, 1);
				changes.push(`-${change.role.name}`);
			} else if (change.add) {
				roles.push(change.role.id);
				changes.push(`+${change.role.name}`);
			}
		}

		return member.edit({ roles }, encodeURIComponent(`Responsible User: ${this.utils.fullName(message.author)}`))
			.then(() => this.success(message.channel,
				`Changed roles for ${this.utils.fullName(member)}, ${changes.join(', ')}`))
			.catch(err => this.error(message.channel,
				`I couldn't change the roles for that user. Please check my permissions and role position.`, err));
	}

	async add(message, args) {
		const member = this.resolveUser(message.channel.guild, args[0]);

		if (!member) {
			return this.error(message.channel, `Couldn't find that user.`);
		}

		const roleArgs = args.slice(1).join(' ')
			.replace(/, /g, ',')
			.split(',');

		const roles = [...member.roles];
		const invalidRoles = [],
			roleChanges = [];

		for (const search of roleArgs) {
			const role = this.resolveRole(message.channel.guild, search);

			if (!role) {
				invalidRoles.push(search);
				continue;
			}

			roleChanges.push({ add: true, role });
		}

		if (invalidRoles.length) {
			return this.error(message.channel, `I can't find the role(s) ${invalidRoles.join(',')}.`);
		}

		if (!roleChanges.length) {
			return this.sendMessage(message.channel, `No changes were made.`);
		}

		let changes = [];

		for (const change of roleChanges) {
			if (change.remove) {
				roles.splice(change.index, 1);
				changes.push(`removed ${change.role.name}`);
			} else if (change.add) {
				roles.push(change.role.id);
				changes.push(`added ${change.role.name}`);
			}
		}

		return member.edit({ roles }, encodeURIComponent(`Responsible User: ${this.utils.fullName(message.author)}`))
			.then(() => this.success(message.channel,
				`Changed roles for ${this.utils.fullName(member)}, ${changes.join(', ')}`))
			.catch(err => this.error(message.channel,
				`I couldn't change the roles for that user. Please check my permissions and role position.`, err));
	}

	async remove(message, args) {
		const member = this.resolveUser(message.channel.guild, args[0]);

		if (!member) {
			return this.error(message.channel, `Couldn't find that user.`);
		}

		const roleArgs = args.slice(1).join(' ')
			.replace(/, /g, ',')
			.split(',');

		const roles = [...member.roles];
		const invalidRoles = [],
			roleChanges = [];

		for (const search of roleArgs) {
			const role = this.resolveRole(message.channel.guild, search);

			if (!role) {
				invalidRoles.push(search);
				continue;
			}

			roleChanges.push({ remove: true, role });
		}

		if (invalidRoles.length) {
			return this.error(message.channel, `I can't find the role(s) ${invalidRoles.join(',')}.`);
		}

		if (!roleChanges.length) {
			return this.sendMessage(message.channel, `No changes were made.`);
		}

		let changes = [];

		for (const change of roleChanges) {
			if (change.remove) {
				roles.splice(change.index, 1);
				changes.push(`removed ${change.role.name}`);
			} else if (change.add) {
				roles.push(change.role.id);
				changes.push(`added ${change.role.name}`);
			}
		}

		return member.edit({ roles }, encodeURIComponent(`Responsible User: ${this.utils.fullName(message.author)}`))
			.then(() => this.success(message.channel,
				`Changed roles for ${this.utils.fullName(member)}, ${changes.join(', ')}`))
			.catch(err => this.error(message.channel,
				`I couldn't change the roles for that user. Please check my permissions and role position.`, err));
	}

	removeall(message, args) {
		const member = this.resolveUser(message.channel.guild, args[0]);

		if (!member) {
			return this.error(message.channel, `Couldn't find that user.`);
		}

		let roles = message.guild.roles.filter(r => member.roles.includes(r.id));
		let rolenames = roles.map(r => r.name);

		return member.edit({ roles: [] }, encodeURIComponent(`Responsible User: ${this.utils.fullName(message.author)}`))
			.then(() => this.success(message.channel,
				`Removed the following roles from ${this.utils.fullName(member)}, ${rolenames.join(', ')}`))
			.catch(err => this.error(message.channel,
				`I couldn't change the roles for that user. Please check my permissions and role position.`, err));
	}

	async toggle(message, args) {
		const member = this.resolveUser(message.channel.guild, args[0]);

		if (!member) {
			return this.error(message.channel, `Couldn't find that user.`);
		}

		const roleArgs = args.slice(1).join(' ')
			.replace(/, /g, ',')
			.split(',');

		const roles = [...member.roles];
		const invalidRoles = [],
			roleChanges = [];

		for (const search of roleArgs) {
			const role = this.resolveRole(message.channel.guild, search);

			if (!role) {
				invalidRoles.push(search);
				continue;
			}

			const index = member.roles.indexOf(role.id);

			if (index > -1) {
				roleChanges.push({ remove: true, index, role });
				continue;
			}

			roleChanges.push({ add: true, role });
		}

		if (invalidRoles.length) {
			return this.error(message.channel, `I can't find the role(s) ${invalidRoles.join(',')}.`);
		}

		if (!roleChanges.length) {
			return this.sendMessage(message.channel, `No changes were made.`);
		}

		let changes = [];

		for (const change of roleChanges) {
			if (change.remove) {
				roles.splice(change.index, 1);
				changes.push(`removed ${change.role.name}`);
			} else if (change.add) {
				roles.push(change.role.id);
				changes.push(`added ${change.role.name}`);
			}
		}

		return member.edit({ roles }, encodeURIComponent(`Responsible User: ${this.utils.fullName(message.author)}`))
			.then(() => this.success(message.channel,
				`Changed roles for ${this.utils.fullName(member)}, ${changes.join(', ')}`))
			.catch(err => this.error(message.channel,
				`I couldn't change the roles for that user. Please check my permissions and role position.`, err));
	}
}

module.exports = Role;
