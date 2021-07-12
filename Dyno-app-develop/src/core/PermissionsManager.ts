import * as eris from '@dyno.gg/eris';

export default class PermissionsManager {
	private config: DynoConfig;
	private dyno: Dyno;

	constructor(dyno: Dyno) {
		this.config = dyno.config;
		this.dyno = dyno;
	}

	/**
	 * Check if user is dyno admin
	 */
	public isAdmin(user: eris.User | eris.Member) {
		if (!user || !user.id) {
			return false;
		}
		return (user.id === this.config.client.admin);
	}

	/**
	 * Check if user is a dyno overseer
	 */
	public isOverseer(user: eris.User | eris.Member) {
		if (!user || !user.id) {
			return false;
		}
		return (this.config.overseers && this.config.overseers.includes(user.id));
	}

	/**
	 * Check if user is server admin
	 */
	public isServerAdmin(member: eris.Member, channel: eris.GuildChannel) {
		// ignore DM
		if (!member || channel.type !== 0) {
			return false;
		}
		// let permissions = member.permissionsFor(channel);
		return (member.id === channel.guild.ownerID || (member.permission &&
				(member.permission.has('administrator') || member.permission.has('manageGuild'))));
	}

	/**
	 * Check if user is server mod
	 */
	public isServerMod(member: eris.Member, channel: eris.GuildChannel) {
		// ignore DM
		if (!member || channel.type !== 0) {
			return false;
		}

		const guildConfig = this.dyno.guilds.get(channel.guild.id);

		if (this.isAdmin(member) || this.isServerAdmin(member, channel)) {
			return true;
		}

		// server config may not have loaded yet
		if (!guildConfig) { return false; }

		// check mod roles
		if (guildConfig.modRoles && member.roles && member.roles.find((r: string) => guildConfig.modRoles.includes(r))) {
			return true;
		}

		// sanity check
		if (!guildConfig.mods) {
			return false;
		}

		return guildConfig.mods.includes(member.id);
	}

	public canOverride(channel: eris.GuildChannel, member: eris.Member, command: any) {
		if (!member || !channel) { return null; }

		const guildConfig = this.dyno.guilds.get(channel.guild.id);

		if (!guildConfig.permissions || !guildConfig.permissions.length) {
			return null;
		}

		const channelPerms = guildConfig.channelPermissions;
		const rolePerms = guildConfig.rolePermissions;

		let canOverride = null;

		if (channelPerms && channelPerms.length) {
			if (channelPerms[channel.id] && channelPerms[channel.id].commands.hasOwnProperty(command)) {
				canOverride = channelPerms[channel.id].commands[command];
			}
		}

		if (!rolePerms.length) {
			return canOverride;
		}

		const roles = this.dyno.utils.sortRoles(channel.guild.roles);

		for (const role of roles) {
			if (!rolePerms[role.id]) { continue; }
			if (member.roles.indexOf(role.id) === -1) { continue; }

			if (rolePerms[role.id].commands.hasOwnProperty(command)) {
				canOverride = rolePerms[role.id].commands[command];
				break;
			}
		}

		return canOverride;
	}
}
