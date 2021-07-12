'use strict';

const each = require('async-each');
const Base = Loader.require('./core/structures/Base');
const models = require('../../core/models');

/**
 * @class Moderations
 * @extends Base
 */
class Moderations extends Base {
	/**
	 * Moderations handler
	 * @param {Moderation} module Instance of Moderation module
	 */
	constructor(module) {
		super();
		this.module = module;
		this.moderation = module.moderation;
	}

	/**
	 * Check for expired moderations and handle them
	 */
	async process() {
		if (!this.dyno.isReady) return;

		try {
			var docs = await models.Moderation.find({ completedAt: { $lte: Date.now() } }).lean().exec();
		} catch (err) {
			this.logger.error(err, { type: 'moderations.process' });
		}

		if (!docs || !docs.length) return;

		each(docs, async doc => {
			const guild = this.client.guilds.get(doc.server);
			if (!guild) return;

			const guildConfig = await this.dyno.guilds.getOrFetch(doc.server);
			if (!guildConfig) return;

			if (!this.module.isEnabled(guild, this.module, guildConfig)) return;

			if (this[doc.type]) {
				setImmediate(this[doc.type].bind(this), guild, doc, guildConfig);
			}
		});
	}

	ban(guild, doc, guildConfig) {
		if (!this.hasPermissions(guild, 'banMembers')) return;

		guild.unbanMember(doc.user.id).then(() => {
			this.moderation.log({
				type: 'Unban',
				user: doc.user,
				guild: guild,
				reason: `Auto`,
				guildConfig,
			});
			models.Moderation.remove({ _id: doc._id })
				.catch(err => this.logger.error(err, {
					type: 'moderations.ban.remove',
					guild: guild.id,
					shard: guild.shard.id,
				}));
		}).catch(() => { // permissions likely too low
			models.Moderation.remove({ _id: doc._id })
				.catch(err => this.logger.error(err, {
					type: 'moderations.ban.remove',
					guild: guild.id,
					shard: guild.shard.id,
				}));
		});
	}

	async mute(guild, doc, guildConfig) {
		// check permissions.
		let member = guild ? guild.members.find(m => m.id === doc.user.id) : null;

		// remove moderation if permissions, member, or guildConfig are not present
		if (!this.hasPermissions(guild, 'manageRoles') || !guildConfig) {
			return models.Moderation.remove({ _id: doc._id })
				.catch(err => this.logger.error(err, {
					type: 'moderations.mute.remove',
					guild: guild.id,
					shard: guild.shard.id,
				}));
		}

		if (!member) {
			return models.Moderation.remove({ _id: doc._id })
				.catch(err => this.logger.error(err, {
					type: 'moderations.mute.remove',
					guild: guild.id,
					shard: guild.shard.id,
				}));
		}

		const mutedRole = (guildConfig && guildConfig.moderation) ?
		guildConfig.moderation.mutedRole || null : null;

		if (!mutedRole) return;

		const role = guild.roles.find(r => r.id === mutedRole);
		if (!role) return;

		// check if the bot has correct role hierarchy
		// const hasRoleHierarchy = this.hasRoleHierarchy(guild, role);
		// if (!hasRoleHierarchy) {
		// 	return;
		// }

		const roles = [...member.roles];
		const index = roles.indexOf(role.id);

		// If the member was unmuted already, remove the moderation
		if (index === -1) {
			return models.Moderation.remove({ _id: doc._id })
				.catch(err => this.logger.error(err, {
					type: 'moderations.mute.remove',
					guild: guild.id,
					shard: guild.shard.id,
				}));
		}

		roles.splice(index, 1);

		// Remove the member from the muted role
		member.edit({ roles }).then(() => {
			this.moderation.log({
				type: 'Unmute',
				user: member,
				guild: guild,
				reason: `Auto`,
				guildConfig,
			});
			return models.Moderation.remove({ _id: doc._id })
				.catch(err => this.logger.error(err, {
					type: 'moderations.mute.remove',
					guild: guild.id,
					shard: guild.shard.id,
				}));
		}).catch(() => false);
	}
}

module.exports = Moderations;
