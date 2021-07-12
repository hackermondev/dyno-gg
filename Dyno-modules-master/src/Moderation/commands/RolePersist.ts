import { Command, SubCommand } from '@dyno.gg/dyno-core';
import * as core from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';
import ModUtils from '../ModUtils';

export default class RolePersist extends Command {
	public aliases: string[] = ['rolepersist', 'role5ever'];
	public group: string = 'Moderator';
	public module: string = 'Moderation';
	public description: string = 'Assign/unassign a role that persists if the user leaves and rejoins.';
	public permissions: string = 'serverMod';
	public defaultCommand: string = 'toggle';
	public defaultUsage: string = 'rolepersist [user] [role], [optional reason]';
	public cooldown: number = 5000;
	public expectedArgs: number = 2;

	public usage: string[] = [
		'rolepersist [user] [role], [optional reason]',
		'rolepersist add [user] [role], [optional reason]',
		'rolepersist remove [user] [role], [optional reason]',
		'rolepersist toggle [user] [role], [optional reason]',
	];
	public example: string[] = [
		'rolepersist @NoobLance Special, Because he\'s special',
		'rolepersist add @NoobLance Special, Because he\'s special',
		'rolepersist remove @Gin Special, not special anymore',
		'rolepersist toggle @Gin Special, Perhaps he\'s special?',
	];

	public commands: SubCommand[] = [
		{ name: 'add', desc: 'Adds a rolepersist to an user', usage: '[user] role, (reason)' },
		{ name: 'remove', desc: 'Removes a rolepersist from an user', usage: 'remove [user] role, (reason)' },
		{ name: 'toggle', desc: 'Toggles a rolepersist from an user', default: true, usage: 'toggle [user] role, (reason)' },
	];

	public execute() {
		return Promise.resolve();
	}

	public async add(e: core.CommandData) {
		return this.toggle(e, true, false);
	}

	public async remove(e: core.CommandData) {
		return this.toggle(e, false, true);
	}

	public async toggle({ message, args, guildConfig }: core.CommandData, add?: boolean, remove?: boolean) {
		const guild = (<eris.GuildChannel>message.channel).guild;
		const modUtils = new ModUtils(this.dyno, guild);
		const member = <eris.Member>this.resolveUser(guild, args[0]);
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

		// tslint:disable-next-line:prefer-const
		let [rolename, reason] = args.slice(1).join(' ').split(', ');

		const role = this.resolveRole(guild, rolename);
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
			const res = await modUtils.persistRole(guild, message, member, role, guildConfig, null, reason, false, add, remove);
			return this.success(message.channel, res);
		} catch (err) {
			this.logger.error(err);
			return this.error(message.channel, err);
		}
	}
}
