import { Command, CommandData, SubCommand } from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';
import * as each from 'async-each';

interface IRoleCommandData extends CommandData {
	filter: any;
}

const modPerms: string[] = [
	'kickMembers',
	'banMembers',
	'administrator',
	'manageChannels',
	'manageGuild',
	'manageNicknames',
	'manageRoles',
];

export default class Role extends Command {
	public aliases     : string[] = ['role'];
	public group       : string   = 'Manager';
	public description : string   = 'Add/remove a user to a role or roles.';
	public defaultCommand: string = 'user';
	public defaultUsage: string   = 'role [user] [role name]';
	public permissions : string   = 'serverAdmin';
	public cooldown    : number   = 5000;
	public expectedArgs: number   = 2;
	public requiredPermissions: string[] = ['manageRoles'];

	public commands: SubCommand[] = [
		{ name: 'user', desc: 'Add/remove a user to a role or roles.', default: true, usage: '[user] [role]' },
		{ name: 'add', desc: 'Add a user to a role or roles.', usage: 'add [user] [role]' },
		{ name: 'remove', desc: 'Remove a user from a role or roles.', usage: 'remove [user] [role]' },
		{ name: 'toggle', desc: 'Toggle a user from a role or roles.', usage: 'toggle [user] [role]' },
		{ name: 'removeall', desc: 'Remove all roles from a user', usage: 'removall [user]' },
		{ name: 'all', desc: 'Add/remove all users to or from a role. (Limit 1 role)', usage: 'all [role]' },
		{ name: 'bots', desc: 'Add/remove all bots to or from a role.', usage: 'bots [role]' },
		{ name: 'humans', desc: 'Add/remove all humans to or from a role.', usage: 'humans [role]' },
		{ name: 'in', desc: 'Add/remove users to or from a role that are in a role. (Limit 1 role)', usage: 'in [in role], [role]' },
	];

	public usage: string[] = [
		'role [user] (+/-)[role(s)] (separated by comma `, `)',
		'role add [user] (+/-)[role(s)] (separated by comma `, `)',
		'role remove [user] (+/-)[role(s)] (separated by comma `, `)',
		'role toggle [user] (+/-)[role(s)] (separated by comma `, `)',
		'role removeall [user]',
		'role all (+/-)[role]',
		'role bots (+/-)[role]',
		'role humans (+/-)[role]',
		'role in [role], (+/-)[role]',
	];

	public example: string[] = [
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

	public async execute() {
		return Promise.resolve();
	}

	public all({ message, args, filter, guildConfig }: IRoleCommandData) {
		const guild = (<eris.GuildChannel>message.channel).guild;

		if (!this.hasPermissions(guild, 'manageRoles')) {
			return this.error(message.channel, `I don't have \`Manager Roles\` permissions.`);
		}

		const arg = args.join(' ');
		const search = arg.replace(/^(\+|-)/, '');
		const role = this.resolveRole(guild, search);

		if (!role) {
			return this.error(message.channel, `I couldn't find the ${search} role.`);
		}

		if (!this.hasRoleHierarchy(guild, role)) {
			return this.error(message.channel, `My role isn't high enough to assign members to this role.`);
		}

		if (guildConfig.modRoles && guildConfig.modRoles.includes(role.id)) {
			return this.error(message.channel, `That role has mod permissions, it cannot be assigned to all members.`);
		}

		for (const perm of modPerms) {
			if (role.permissions.has(perm)) {
				return this.error(message.channel, `That role has mod permissions, it cannot be assigned to all members.`);
			}
		}

		let members = [...guild.members.values()];

		if (filter) {
			try {
				members = members.filter(filter);
			} catch (err) {
				this.logger.error(err);
				return this.error(message.channel, `Something went wrong.`);
			}
		}

		members = arg.startsWith('-') ?
			members.filter((m: eris.Member) => m.roles.includes(role.id)) :
			members.filter((m: eris.Member) => !m.roles.includes(role.id));

		each(members, (member: eris.Member) => {
			if (arg.startsWith('+') && member.roles.includes(role.id)) {
				return;
			}
			if (arg.startsWith('-') && !member.roles.includes(role.id)) {
				return;
			}

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

		return this.info(message.channel, text);
	}

	public bots({ message, args, guildConfig }: CommandData) {
		return this.all({ message, args, filter: (m: eris.Member) => m.bot, guildConfig });
	}

	public humans({ message, args, guildConfig }: CommandData) {
		return this.all({ message, args, filter: (m: eris.Member) => !m.bot, guildConfig });
	}

	public in({ message, args, guildConfig }: CommandData) {
		let [inSearch, roleSearch] = args.join(' ').split(',');

		inSearch = inSearch.trim();
		roleSearch = roleSearch.trim();

		const inRole = this.resolveRole((<eris.GuildChannel>message.channel).guild, inSearch);
		if (!inRole) {
			return this.error(message.channel, `I couldn't find the ${inSearch} role.`);
		}

		return this.all({ message, args: [roleSearch], filter: (m: eris.Member) => m.roles.includes(inRole.id), guildConfig });
	}

	public async user({ message, args }: CommandData) {
		const guild = (<eris.GuildChannel>message.channel).guild;
		const member = this.resolveUser(guild, args[0]);

		if (!member) {
			return this.error(message.channel, `Couldn't find that user.`);
		}

		const roleArgs = args.slice(1).join(' ')
			.replace(/, /g, ',')
			.split(',');

		const roles = [...(<eris.Member>member).roles];
		const invalidRoles = [];
		const roleChanges = [];

		for (const arg of roleArgs) {
			const search = arg.replace(/^(\+|-)/, '');
			const role = this.resolveRole(guild, search);

			if (!role) {
				invalidRoles.push(search);
				continue;
			}

			if (arg.startsWith('+') && roles.indexOf(role.id) > -1) {
				continue;
			}
			if (arg.startsWith('-') && roles.indexOf(role.id) === -1) {
				continue;
			}

			if (arg.startsWith('+')) {
				roleChanges.push({ add: true, role });
				continue;
			}

			const index = (<eris.Member>member).roles.indexOf(role.id);

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
			return this.info(message.channel, `No changes were made.`);
		}

		const changes = [];

		for (const change of roleChanges) {
			const index = roles.indexOf(change.role.id);

			if (change.remove) {
				roles.splice(index, 1);
				changes.push(`-${change.role.name}`);
			} else if (change.add) {
				roles.push(change.role.id);
				changes.push(`+${change.role.name}`);
			}
		}

		return (<eris.Member>member).edit({ roles }, encodeURIComponent(`Responsible User: ${this.utils.fullName(message.author)}`))
			.then(() => this.success(message.channel,
				`Changed roles for ${this.utils.fullName(member)}, ${changes.join(', ')}`))
			.catch((err: any) => this.error(message.channel,
				`I couldn't change the roles for that user. Please check my permissions and role position.`, err));
	}

	public async add({ message, args }: CommandData) {
		const guild = (<eris.GuildChannel>message.channel).guild;
		const member = this.resolveUser(guild, args[0]);

		if (!member) {
			return this.error(message.channel, `Couldn't find that user.`);
		}

		const roleArgs = args.slice(1).join(' ')
			.replace(/, /g, ',')
			.split(',');

		const roles = [...(<eris.Member>member).roles];
		const invalidRoles = [];
		const roleChanges = [];

		for (const search of roleArgs) {
			const role = this.resolveRole(guild, search);

			if (!role) {
				invalidRoles.push(search);
				continue;
			}

			roleChanges.push({ role });
		}

		if (invalidRoles.length) {
			return this.error(message.channel, `I can't find the role(s) ${invalidRoles.join(',')}.`);
		}

		if (!roleChanges.length) {
			return this.info(message.channel, `No changes were made.`);
		}

		const changes = [];

		for (const change of roleChanges) {
			roles.push(change.role.id);
			changes.push(`added ${change.role.name}`);
		}

		const diff = roles.filter((r: string) => !(<eris.Member>member).roles.includes(r));
		if (!diff || !diff.length) {
			return this.info(message.channel, `No changes were made.`);
		}

		return (<eris.Member>member).edit({ roles }, encodeURIComponent(`Responsible User: ${this.utils.fullName(message.author)}`))
			.then(() => this.success(message.channel,
				`Changed roles for ${this.utils.fullName(member)}, ${changes.join(', ')}`))
			.catch((err: any) => this.error(message.channel,
				`I couldn't change the roles for that user. Please check my permissions and role position.`, err));
	}

	public async remove({ message, args }: CommandData) {
		const guild = (<eris.GuildChannel>message.channel).guild;
		const member = this.resolveUser(guild, args[0]);

		if (!member) {
			return this.error(message.channel, `Couldn't find that user.`);
		}

		const roleArgs = args.slice(1).join(' ')
			.replace(/, /g, ',')
			.split(',');

		const roles = [...(<eris.Member>member).roles];
		const invalidRoles = [];
		const roleChanges = [];

		for (const search of roleArgs) {
			const role = this.resolveRole(guild, search);

			if (!role) {
				invalidRoles.push(search);
				continue;
			}

			roleChanges.push({ role, index: roles.indexOf(role.id) });
		}

		if (invalidRoles.length) {
			return this.error(message.channel, `I can't find the role(s) ${invalidRoles.join(',')}.`);
		}

		if (!roleChanges.length) {
			return this.info(message.channel, `No changes were made.`);
		}

		const changes = [];

		for (const change of roleChanges) {
			roles.splice(change.index, 1);
			changes.push(`removed ${change.role.name}`);
		}

		const diff = roles.filter((r: string) => !(<eris.Member>member).roles.includes(r));
		if (!diff || !diff.length) {
			return this.info(message.channel, `No changes were made.`);
		}

		return (<eris.Member>member).edit({ roles }, encodeURIComponent(`Responsible User: ${this.utils.fullName(message.author)}`))
			.then(() => this.success(message.channel,
				`Changed roles for ${this.utils.fullName(member)}, ${changes.join(', ')}`))
			.catch((err: any) => this.error(message.channel,
				`I couldn't change the roles for that user. Please check my permissions and role position.`, err));
	}

	public removeall({ message, args }: CommandData) {
		const guild = (<eris.GuildChannel>message.channel).guild;
		const member = this.resolveUser(guild, args[0]);

		if (!member) {
			return this.error(message.channel, `Couldn't find that user.`);
		}

		const roles = guild.roles.filter((r: eris.Role) => (<eris.Member>member).roles.includes(r.id));
		const rolenames = roles.filter((r: eris.Role) => !r.managed).map((r: eris.Role) => r.name);

		return (<eris.Member>member).edit({ roles: roles.filter((r: eris.Role) => r.managed).map((r: eris.Role) => r.id) },
				encodeURIComponent(`Responsible User: ${this.utils.fullName(message.author)}`))
			.then(() => this.success(message.channel,
				`Removed the following roles from ${this.utils.fullName(member)}, ${rolenames.join(', ')}`))
			.catch((err: any) => this.error(message.channel,
				`I couldn't change the roles for that user. Please check my permissions and role position.`, err));
	}

	public async toggle({ message, args }: CommandData) {
		const guild = (<eris.GuildChannel>message.channel).guild;
		const member = this.resolveUser(guild, args[0]);

		if (!member) {
			return this.error(message.channel, `Couldn't find that user.`);
		}

		const roleArgs = args.slice(1).join(' ')
			.replace(/, /g, ',')
			.split(',');

		const roles = [...(<eris.Member>member).roles];
		const invalidRoles = [];
		const roleChanges = [];

		for (const search of roleArgs) {
			const role = this.resolveRole(guild, search);

			if (!role) {
				invalidRoles.push(search);
				continue;
			}

			const index = (<eris.Member>member).roles.indexOf(role.id);

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
			return this.info(message.channel, `No changes were made.`);
		}

		const changes = [];

		for (const change of roleChanges) {
			if (change.remove) {
				roles.splice(change.index, 1);
				changes.push(`removed ${change.role.name}`);
			} else if (change.add) {
				roles.push(change.role.id);
				changes.push(`added ${change.role.name}`);
			}
		}

		return (<eris.Member>member).edit({ roles }, encodeURIComponent(`Responsible User: ${this.utils.fullName(message.author)}`))
			.then(() => this.success(message.channel,
				`Changed roles for ${this.utils.fullName(member)}, ${changes.join(', ')}`))
			.catch((err: any) => this.error(message.channel,
				`I couldn't change the roles for that user. Please check my permissions and role position.`, err));
	}
}
