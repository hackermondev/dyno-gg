import {Command, SubCommand} from '@dyno.gg/dyno-core';
import * as core from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';
import ModUtils from '../ModUtils';

export default class TempRole extends Command {
	public aliases: string[]      = ['temprole', 'role4abit'];
	public group: string        = 'Moderator';
	public module: string       = 'Moderation';
	public description: string  = 'Assign/unassign a role that persists for a limited time.';
	public defaultCommand: string = 'add';
	public defaultUsage: string = 'temprole [user] [time] [role], [optional reason]';
	public permissions: string  = 'serverMod';
	public cooldown: number     = 5000;
	public expectedArgs: number = 3;

	public usage: string[] = [
		'temprole [user] [time] [role], [optional reason]',
		'temprole add [user] [time] [role], [optional reason]',
		'temprole remove [user] [role], [optional reason]',
	];
	public example: string[] = [
		'temprole @NoobLance 1d Birthday, Happy Birthday',
		'temprole add @NoobLance 1d Birthday, Happy Birthday',
		'temprole remove @NoobLance Birthday, Wrong date',
	];

	public commands: SubCommand[] = [
		{ name: 'add', desc: 'Adds a temprole to an user', default: true, usage: '[user] role, (reason)' },
		{ name: 'remove', desc: 'Removes a temprole from an user', usage: 'remove [user] role, (reason)' },
	];

	public execute() {
		return Promise.resolve();
	}

	public async add(e: core.CommandData) {
		return this.toggle(e, true, false);
	}

	public async remove(e: core.CommandData) {
		const args = [e.args[0], '1m', e.args[1], e.args[2]];
		e.args = args.filter(i => i !== undefined);
		return this.toggle(e, false, true);
	}

	public async toggle({ message, args, guildConfig }: core.CommandData, add?: boolean, remove?: boolean) {
		const guild = (<eris.GuildChannel>message.channel).guild;
		const modUtils = new ModUtils(this.dyno, guild);
		const limit    = this.utils.parseTimeLimit(args[1]);
		const member   = <eris.Member>this.resolveUser(guild, args[0]);
		const modPerms = [
			'kickMembers',
			'banMembers',
			'administrator',
			'manageChannels',
			'manageGuild',
			'manageNicknames',
			'manageRoles',
		];

		if (!member) {
			return this.error(message.channel, `Couldn't find the user ${args[0]}.`);
		}

		if (limit && limit > 43200) {
			return this.error(message.channel, `Please use a valid limit less than 30 days. ex. 3m, 2h, 1d`);
		}

		if (!limit || isNaN(parseInt(limit, 10))) {
			return this.error(message.channel, 'Please use a valid limit less than 30 days. ex. 3m, 2h, 1d');
		}

		// tslint:disable-next-line:prefer-const
		let [rolename, reason] = args.slice(2).join(' ').split(', ');

		const role = this.resolveRole(guild, rolename);

		console.log(role.name, role.id);

		if (!role) {
			return this.error(message.channel, `I can't find the role ${rolename}`);
		}

		if (guildConfig.modRoles && guildConfig.modRoles.includes(role.id)) {
			return this.error(message.channel, `That role has mod permissions, it cannot be persisted.`);
		}

		for (const perm of modPerms) {
			if (role.permissions.has(perm)) {
				return this.error(message.channel, `That role has mod permissions, it cannot be persisted.`);
			}
		}

		// set the reason if it doesn't exist
		reason = reason || 'No reason given.';

		try {
			const res = await modUtils.persistRole(guild, message, member, role, guildConfig, limit, reason, true, add, remove);
			return this.success(message.channel, res);
		} catch (err) {
			return this.error(message.channel, err);
		}
	}
}
