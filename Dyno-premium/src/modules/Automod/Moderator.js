'use strict';

const Base = Loader.require('./core/structures/Base');
const Role = Loader.require('./core/structures/Role');
const statsd = require('../../core/statsd');

class Moderator extends Base {
	constructor(module) {
		super();
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
	createModeration(...args) {
		return this.moderation.createModeration(...args);
	}

	delete(message) {
		return message.delete()
			.catch(err => err)
			.then(() => {
				statsd.increment('automod.counts', 1);
			});
	}

	mute(message, guildConfig, limitOverride, reason) {
		return new Promise(async (resolve, reject) => {
			let role = guildConfig.moderation ?
				message.channel.guild.roles.find(r => r.id === guildConfig.moderation.mutedRole || null) : null;

			if (!this.hasPermissions(message.channel.guild, 'manageRoles', 'manageChannels')) return;

			// create the muted role if it doesn't exist
			if (!guildConfig.moderation || !role) {
				role = await this.moderation.createMutedRole(message.channel.guild, guildConfig);
			}

			if (!role) return;

			if (message.member.roles.includes(role.id)) return;

			const hasRoleHierarchy = this.hasRoleHierarchy(message.channel.guild, role);
			if (!hasRoleHierarchy) return;

			reason = reason ? `Dyno Automod - ${reason}` : `Dyno Automod`;

			message.member.addRole(role.id, encodeURIComponent(reason))
				.then(() => {
					const clientUser = this.client.users.get(this.dyno.userid);

					if (limitOverride !== 0) {
						this.createModeration(message, message.author, clientUser, 'mute', limitOverride || guildConfig.automod.muteTime || 10);
					}

					// Verify overwrite permissions
					const _role = new Role(message.channel.guild, guildConfig);
					_role.createOverwritePermissions([...message.channel.guild.channels.values()], [
						'sendMessages',
						'addReactions',
						'voiceSpeak',
					]);

					return resolve();
				})
				.catch(() => reject());
		});
	}

	/**
	 * Warn a user when auto modded.
	 * @param {Message} message Message object
	 * @param {String} reason Reason for the mod action
	 * @return {void}
	 */
	warnUser(message, reason) {
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

module.exports = Moderator;
