import {Base} from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';
import * as each from 'async-each';
import * as dyno from 'Dyno';
import Moderation from '.';
import ModUtils from './ModUtils';

/**
 * @class Moderations
 * @extends Base
 */
export default class Moderations extends Base {
	public module: Moderation;
	public modUtils: ModUtils;

	/**
	 * Moderations handler
	 * @param {Moderation} module Instance of Moderation module
	 */
	constructor(module: Moderation) {
		super(module.dyno);
		this.module = module;
		this.modUtils = module.modUtils;
	}

	/**
	 * Check for expired moderations and handle them
	 */
	public async process() {
		if (!this.dyno.isReady) {
			return;
		}

		let docs;
		try {
			docs = await this.models.Moderation.find({ completedAt: { $lte: Date.now() } }).lean().exec();
		} catch (err) {
			this.logger.error(err, { type: 'moderations.process' });
		}

		if (!docs || !docs.length) {
			return;
		}

		this.utils.asyncForEach(docs, async (doc: any) => {
			const guild = this.client.guilds.get(doc.server);
			if (!guild) {
				return;
			}

			const guildConfig = await this.dyno.guilds.getOrFetch(doc.server);
			if (!guildConfig) {
				return;
			}

			if (!this.module.isEnabled(guild, this.module, guildConfig)) {
				return;
			}

			if (this[doc.type]) {
				setImmediate(this[doc.type].bind(this), guild, doc, guildConfig);
			}
		});
	}

	public ban(guild: eris.Guild, doc: ModerationDoc, guildConfig: dyno.GuildConfig) {
		if (!this.hasPermissions(guild, 'banMembers')) {
			return;
		}

		guild.unbanMember(doc.user.id)
			.then(() => {
				this.modUtils.log({
					type: 'Unban',
					user: doc.user,
					guild: guild,
					reason: `Auto`,
					guildConfig,
				});
			})
			.catch(() => null)
			.then(() => this.removeModeration(doc._id, guild, 'ban'));
	}

	// tslint:disable-next-line:cyclomatic-complexity
	public async mute(guild: eris.Guild, doc: ModerationDoc, guildConfig: dyno.GuildConfig) {
		// check permissions.
		let member: eris.Member;

		if (guild && !guild.members) {
			try {
				member = await this.dyno.restClient.getRESTGuildMember(guild.id, doc.user.id);
			} catch (err) {
				return;
			}
		} else if (guild && guild.members) {
			member = guild.members.find((m: eris.Member) => m.id === doc.user.id);
		}

		// remove moderation if permissions, member, or guildConfig are not present
		if (!this.hasPermissions(guild, 'manageRoles') || !guildConfig) {
			return this.removeModeration(doc._id, guild, 'mute');
		}

		if (!member) {
			return this.removeModeration(doc._id, guild, 'mute');
		}

		const mutedRole = (guildConfig && guildConfig.moderation) ?
		guildConfig.moderation.mutedRole || null : null;

		if (!mutedRole) {
			return;
		}

		const role = guild.roles.find((r: eris.Role) => r.id === mutedRole);
		if (!role) {
			return;
		}

		let roles = [...member.roles];

		if (guildConfig.moderation.removeRoles) {
			try {
				const moderation = await this.modUtils.getModeration(guild, member, 'mute');
				if (moderation.roles) {
					roles = roles.concat(moderation.roles);
				}
			} catch (err) {
				return Promise.reject(`Something went wrong.`);
			}
		}

		const index = roles.indexOf(role.id);

		// If the member was unmuted already, remove the moderation
		if (index === -1) {
			return this.removeModeration(doc._id, guild, 'mute');
		}

		roles.splice(index, 1);

		const payload: any = { roles };

		if (this.hasPermissions(guild, 'voiceMuteMembers') && member.voiceState && member.voiceState.channelID) {
			payload.mute = false;
		}

		// Remove the member from the muted role
		this.client.editGuildMember(guild.id, member.id, payload)
			.then(() => {
				this.modUtils.log({
					type: 'Unmute',
					user: member,
					guild: guild,
					reason: `Auto`,
					guildConfig,
				});
			})
			.catch(() => null)
			.then(() => this.removeModeration(doc._id, guild, 'mute'));
	}

	// tslint:disable-next-line:cyclomatic-complexity
	public async role(guild: eris.Guild, doc: ModerationDoc, guildConfig: dyno.GuildConfig) {
		// check permissions.
		let member: eris.Member;

		if (guild && !guild.members) {
			try {
				member = await this.dyno.restClient.getRESTGuildMember(guild.id, doc.user.id);
			} catch (err) {
				return;
			}
		} else if (guild && guild.members) {
			member = guild.members.find((m: eris.Member) => m.id === doc.user.id);
		}

		// remove moderation if permissions, member, or guildConfig are not present
		if (!this.hasPermissions(guild, 'manageRoles') || !guildConfig) {
			return this.removeModeration(doc._id, guild, 'mute');
		}

		if (!member) {
			return this.removeModeration(doc._id, guild, 'mute');
		}

		const roleId = doc && doc.role;

		if (!roleId) {
			return;
		}

		const role = guild.roles.find((r: eris.Role) => r.id === roleId);
		if (!role) {
			return;
		}

		const roles = [...member.roles];
		const index = roles.indexOf(role.id);

		// If the role was removed already, remove the moderation
		if (index === -1) {
			return this.removeModeration(doc._id, guild, 'role');
		}

		roles.splice(index, 1);

		const payload: any = { roles };

		// Remove the member from the muted role
		this.client.editGuildMember(guild.id, member.id, payload)
			.then(() => {
				this.modUtils.log({
					type: 'Remove Persist',
					user: member,
					guild: guild,
					reason: `Auto`,
					role,
					guildConfig,
				});
			})
			.catch(() => null)
			.then(() => this.removeModeration(doc._id, guild, 'role'));
	}

	public async lock(guild: eris.Guild, doc: ModerationDoc, guildConfig: dyno.GuildConfig) {
		if (!this.hasPermissions(guild, 'manageChannels')) {
			return;
		}

		const channel = guild.channels.get(doc.channel);
		const user = this.client.user;

		this.modUtils.unlockChannel(channel, user, guildConfig)
			.then(() => {
				this.modUtils.channelLog({
					type: 'Unlock [Auto]',
					channel: channel,
					guild: guild,
					user: user,
					guildConfig,
				});
			})
			.catch(() => null)
			.then(() => this.removeModeration(doc._id, guild, 'lock'));
	}

	private removeModeration(id: string, guild: eris.Guild, type: string) {
		return this.models.Moderation.remove({ _id: id })
			.catch((err: any) => this.logger.error(err, {
				type: `moderations.${type}.remove`,
				guild: guild.id,
				shard: guild.shard.id,
			}));
	}
}
