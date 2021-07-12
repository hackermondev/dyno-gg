import { Base, Role } from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';
import * as each from 'async-each';
import * as dyno from 'Dyno';
import Automod from '.';
import ModUtils from '../Moderation/ModUtils';

export default class Moderator extends Base {
	public module: Automod;
	public warnings: Map<string, Warning> = new Map();
	private moderation: ModUtils;

	constructor(module: Automod) {
		super(module.dyno);
		this.module = module;
		this.warnings = new Map();
		this.moderation = module.moderation;
	}

	/**
	 * Create a timed moderation
	 * @param {Message} message Message object
	 * @param {User|Member} user User object
	 * @param {String} type Type of moderation
	 * @param {Number} limit Limit in minutes
	 * @returns {*}
	 */
	public createModeration(msg: eris.Message, user: any, mod: eris.User, type: string, limit: number, role?: eris.Role, options?: any) {
		return this.moderation.createModeration(msg, user, mod, type, limit, role, options);
	}

	public delete(message: eris.Message) {
		return message.delete()
			.catch((err: string) => err)
			.then(() => {
				this.statsd.increment('automod.counts', 1);
			});
	}

	public bulkDelete(guild: eris.Guild, channel: eris.GuildChannel, messageIds: string[]) {
		if (!this.hasChannelPermissions(guild, channel, 'manageMessages')) {
			return Promise.resolve();
		}
		return this.client.deleteMessages(channel.id, messageIds);
		// return this.snowClient.channel.bulkDeleteMessages(channelId, messageIds);
	}

	public ban(guild: eris.Guild, message: eris.Message, reason: string = 'Dyno Automod') {
		return this.client.banGuildMember(guild.id, message.member.id, 1, reason);
	}

	public async mute(message: eris.Message, guildConfig: dyno.GuildConfig, limitOverride?: number, reason?: string) {
		const guild = (<eris.GuildChannel>message.channel).guild;

		// return new Promise(async (resolve, reject) => {
		let role = guildConfig.moderation ?
			guild.roles.find((r: eris.Role) => r.id === guildConfig.moderation.mutedRole || null) : null;

		if (!this.hasPermissions(guild, 'manageRoles', 'manageChannels')) {
			return;
		}

		// create the muted role if it doesn't exist
		if (!guildConfig.moderation || !role) {
			role = await this.moderation.createMutedRole(guild, guildConfig);
		}

		if (!role) {
			return;
		}

		if (message.member.roles.includes(role.id)) {
			return;
		}

		const hasRoleHierarchy = this.hasRoleHierarchy(guild, role);
		if (!hasRoleHierarchy) {
			return;
		}

		reason = reason ? `Dyno Automod - ${reason}` : `Dyno Automod`;

		const options: any = {};
		let roles = [...message.member.roles];

		if (guildConfig.moderation.removeRoles) {
			const managedRoles = guild.roles.filter((r: eris.Role) => r.managed).map((r: eris.Role) => r.id);

			roles = roles.filter((id: string) => managedRoles.includes(id));

			options.roles = message.member.roles.filter((id: string) => !roles.includes(id));
		}

		roles.push(role.id);

		try {
			let payload : any = { roles };
			if(this.hasPermissions(guild, 'voiceMuteMembers') && message.member.voiceState && message.member.voiceState.channelID) {
				payload.mute = true;
			}

			await this.client.editGuildMember(guild.id, message.member.id, payload, encodeURIComponent(reason));

			const clientUser = this.client.users.get(this.dyno.userid);

			if (limitOverride !== 0) {
				this.createModeration(message, message.author, clientUser, 'mute', limitOverride || guildConfig.automod.muteTime || 10, null, options);
			}

			// Verify overwrite permissions
			const _role = new Role(this.dyno, guild);
			_role.createOverwritePermissions(role.id, [...guild.channels.values()], [
				'sendMessages',
				'addReactions',
				'voiceSpeak',
			]);

			return Promise.resolve();
		} catch {
			return Promise.reject(null);
		}
	}

	/**
	 * Warn a user when auto modded.
	 */
	public warnUser(message: eris.Message, reason: string) {
		const warning = this.warnings.get(message.author.id);
		if (warning && Date.now() - warning.time < 6000) {
			warning.count++;
			return;
		}

		this.warnings.set(message.author.id, {
			time: Date.now(),
			count: 1,
		});

		this.reply(message, reason, { deleteAfter: 6000 });
	}
}
