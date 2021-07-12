'use strict';

const Base = Loader.require('./core/structures/Base');
const Role = Loader.require('./core/structures/Role');
const utils = Loader.require('./core/utils');
const { Warning } = require('../../core/models');

/**
 * @class Commands
 * @extends Base
 */
class Commands extends Base {
	/**
	 * Moderation commands
	 * @param {Moderation} module Instance of Moderation module
	 */
	constructor(module) {
		super();
		this.module = module;
		this.moderation = module.moderation;
	}

	/**
	 * DM the user if they are kicked/banned
	 * @param {User|Member} user User object
	 * @param {String} text Text to DM
	 * @param {String} reason Reason for the kick/ban (optional)
	 * @param {Number} [limit] Optional limit in minutes
	 * @returns {Promise}
	 */
	sendDM(user, text, reason, limit) {
		text = limit ? `${text} for ${limit} minutes` : text;
		text = reason ? `${text}, ${reason}` : text;

		return this.client.getDMChannel(user.id).then(channel => {
			if (!channel) {
				this.logger.error('Channel is undefined or null' + this._client.privateChannelMap[user.id]);
				return;
			}
			this.sendMessage(channel, text);
		}).catch(err => this.logger.error(err));
	}

	/**
	 * Delete moderation commands when used
	 * @param {Message} msg Message Object
	 * @param {Object} config Guild config
	 */
	deleteCommand(msg, config) {
		if (config.moderation && config.moderation.deleteCommands) {
			msg.delete().catch(() => false);
		}
	}

	/**
	 * Kick a user
	 * @param {Message} msg Message object
	 * @param {User|Member} user User object
	 * @param {String} reason Reason for kicking (optional)
	 * @returns {Promise} Passes the user.kick() promise
	 */
	async kick(msg, user, reason) {
		const guildConfig = await this.dyno.guilds.getOrFetch(msg.channel.guild.id);
		if (!guildConfig) return Promise.reject('Unknown error occurred');

		if (!this.hasPermissions(msg.channel.guild, 'kickMembers')) {
			return Promise.reject(`I don't have permissions to Ban Members.`);
		}

		if (!user.kick) {
			return this.sendMessage(msg.channel, `I can't find that user to kick.`);
		}

		if (guildConfig.moderation && guildConfig.moderation.dmBans) {
			this.sendDM(user, `You were kicked from ${msg.channel.guild.name}`, reason);
		}

		// set the reason if it doesn't exist
		reason = reason || 'No reason given.';

		return new Promise((resolve, reject) =>
			user.kick().then(() => {
				this.moderation.log({
					type: 'Kick',
					user: user,
					guild: msg.guild,
					mod: msg.author,
					limit: null,
					reason: reason,
					guildConfig: guildConfig,
				});

				this.deleteCommand(msg, guildConfig);
				resolve(`***${utils.fullName(user)}*** was kicked.`);
			}).catch(() => reject(`I can't kick ${utils.fullName(user)}`)));
	}

	/**
	 * Ban a user
	 * @param {Message} msg Message object
	 * @param {User|Member|String} user User object
	 * @param {String} reason Reason for banning (optional)
	 * @param {Number} [limit] Limit in minutes
	 * @returns {Promise} Passes the user.ban() promise
	 */
	async ban(msg, user, reason = 'No reason given.', limit) {
		const guildConfig = await this.dyno.guilds.getOrFetch(msg.channel.guild.id);
		if (!guildConfig) return Promise.reject('Unknown error occurred');

		if (!this.hasPermissions(msg.channel.guild, 'banMembers')) {
			return Promise.reject(`I don't have permissions to Ban Members.`);
		}

		if (guildConfig.moderation && guildConfig.moderation.dmBans) {
			if (msg.guild.members.has(user.id)) {
				this.sendDM(user, `You were banned from ${msg.channel.guild.name}`, reason, limit);
			}
		}

		if (typeof user === 'string') {
			let bannedUser = this.client.users.get(user);

			return new Promise((resolve, reject) => {
				this.client.banGuildMember(msg.channel.guild.id, user, 7, encodeURIComponent(reason)).then(async () => {
					if (!bannedUser) {
						const bans = await this.client.getGuildBans(msg.channel.guild.id).catch(() => false).then(d => d.map(ban => ban.user || ban));
						if (bans) {
							bannedUser = bans.find(u => u.id === user.id);
						}
					}
					this.moderation.log({
						type: 'Ban',
						user: bannedUser || user,
						guild: msg.guild,
						mod: msg.author,
						limit, reason, guildConfig,
					});

					this.deleteCommand(msg, guildConfig);

					if (limit) {
						this.moderation.createModeration(msg, user, msg.author, 'ban', limit);
					}

					resolve(`***${bannedUser ? utils.fullName(bannedUser) : user} was banned!***`);
				}).catch(() => reject(`I can't ban ${user}`));
			});
		}

		const bannedUser = {
			id: user.id,
			username: user.username,
			discriminator: user.discriminator,
			avatarURL: user.avatarURL,
			mention: user.mention,
		};

		return new Promise((resolve, reject) =>
			this.client.banGuildMember(msg.guild.id, user.id, 7, encodeURIComponent(reason)).then(async () => {
				if (bannedUser) {
					this.moderation.log({
						type: 'Ban',
						user: bannedUser,
						guild: msg.channel.guild,
						mod: msg.author,
						limit, reason, guildConfig,
					});
					this.success(msg.channel, `***${utils.fullName(bannedUser)} was banned!***`);
				} else {
					const bans = await this.client.getGuildBans(msg.channel.guild.id).catch(() => false).then(d => d.map(ban => ban.user || ban));
					if (bans) {
						const bannedUser = bans.find(u => u.id === user.id);
						this.moderation.log({
							type: 'Ban',
							user: bannedUser,
							guild: msg.guild,
							mod: msg.author,
							limit, reason, guildConfig,
						});

						resolve(`***${utils.fullName(bannedUser)} was banned!***`);
					} else {
						user.username = 'Unknown';
						user.discriminator = '0000';

						this.moderation.log({
							type: 'Ban',
							guild: msg.channel.guild,
							mod: msg.author,
							user, limit, reason, guildConfig,
						});

						resolve(`***${user.id} was banned!***`);
					}
				}

				if (limit) {
					this.moderation.createModeration(msg, user, msg.author, 'ban', limit);
				}

				this.deleteCommand(msg, guildConfig);
			}).catch(() => reject(`I can't ban ${utils.fullName(user)}`)));
	}

	/**
	 * Softban a user
	 * @param {Message} msg Message object
	 * @param {User|Member} user User object
	 * @param {String} reason Reason for banning (optional)
	 * @returns {Promise} Passes the user.ban() promise
	 */
	async softban(msg, user, reason) {
		const guildConfig = await this.dyno.guilds.getOrFetch(msg.channel.guild.id);
		if (!guildConfig) return Promise.reject('Unknown error occurred');

		if (!this.hasPermissions(msg.channel.guild, 'banMembers')) {
			return Promise.reject(`I don't have permissions to Ban Members.`);
		}

		if (!user.ban) {
			return Promise.reject(`I can't find that user to ban.`);
		}

		if (guildConfig.moderation && guildConfig.moderation.dmBans) {
			if (msg.guild.members.has(user.id)) {
				this.sendDM(user, `You were kicked from ${msg.channel.guild.name}`, reason);
			}
		}

		// set the reason if it doesn't exist
		reason = reason || 'No reason given.';

		return new Promise((resolve, reject) =>
			this.client.banGuildMember(msg.channel.guild.id, user.id, 7, reason).then (() => {
				msg.channel.guild.unbanMember(user.id);
				this.moderation.log({
					type: 'Softban',
					guild: msg.guild,
					mod: msg.author,
					limit: null,
					user, reason, guildConfig,
				});

				this.deleteCommand(msg, guildConfig);
				resolve(`***${utils.fullName(user)} was banned!***`);
			}).catch(() => reject(`I can't ban ${utils.fullName(user)}`)));
	}

	/**
	 * Warn a user for a specified reason
	 * @param {Message} msg Message object
	 * @param {User|Member} user User object
	 * @param {String} reason Reason for warning
	 * @return {Promise}
	 */
	async warn(msg, user, reason) {
		const guildConfig = await this.dyno.guilds.getOrFetch(msg.channel.guild.id);
		if (!guildConfig) return Promise.reject('Unknown error occurred');

		reason = reason || 'No reason given.';

		await this.sendDM(user, `You have been warned in ${msg.channel.guild.name}`, reason);
		this.moderation.log({
			type: 'Warn',
			guild: msg.guild,
			mod: msg.author,
			limit: null, user, reason, guildConfig,
		});

		const doc = new Warning({
			guild: msg.channel.guild.id,
			user: user.user ? user.user.toJSON() : user.toJSON(),
			mod: msg.author.toJSON(),
			reason: reason,
		});

		doc.save();

		this.deleteCommand(msg, guildConfig);
		return Promise.resolve(`***${utils.fullName(user)} has been warned.***`);
	}

	async persist(msg, member, role, reason) {
		const guildConfig = await this.dyno.guilds.getOrFetch(msg.channel.guild.id);
		if (!guildConfig) return Promise.reject('Unknown error occurred');

		const helpText = 'Make sure the Dyno role has `Manage Roles` and `Manage Channels` permissions.',
			permError = `I don't have enough permissions. ${helpText}`,
			hierarchyError = `My role isn't high enough to mute this user. Move the Dyno role up above other roles.`;

		if (!this.hasPermissions(msg.channel.guild, 'manageRoles')) {
			return Promise.reject(permError);
		}

		const hasRoleHierarchy = this.hasRoleHierarchy(msg.channel.guild, role);
		if (!hasRoleHierarchy) {
			return Promise.reject(hierarchyError);
		}

		if (member.roles.includes(role.id)) {
			return new Promise((resolve, reject) =>
				member.removeRole(role.id, encodeURIComponent(`Responsible User: ${this.utils.fullName(msg.author)}`))
					.then(() => resolve(`Removed ${this.utils.fullName(member)} from ${role.name}`))
					.catch(() => reject(`I was unable to remove that role.`)));
		}

		this.moderation.createModeration(msg, member, msg.author, 'role', null, role);

		this.moderation.log({
			type: 'Role Persist',
			user: member,
			guild: msg.guild,
			mod: msg.author,
			role, reason, guildConfig,
		});

		return new Promise((resolve, reject) =>
			member.addRole(role.id, encodeURIComponent(`Responsible User: ${this.utils.fullName(msg.author)}`))
				.then(() => resolve(`Added ${role.name} to ${this.utils.fullName(member)}`))
				.catch(err => {
					this.logger.error(err);
					return reject(`I was unable to add that role.`);
				}));
	}

	/**
	 * Mute a user for a period of time
	 * @param {Message} msg Message object
	 * @param {User|Member} user User object
	 * @param {Number} limit Limit in minutes
	 * @param {String} reason Reason for muting
	 * @param {Boolean} [auto=false] If this is was automated
	 * @return {Promise}
	 */
	async mute(msg, user, limit, reason) {
		const guildConfig = await this.dyno.guilds.getOrFetch(msg.channel.guild.id);
		if (!guildConfig) return Promise.reject('Unknown error occurred');

		const helpText = 'Make sure the Dyno role has `Manage Roles` and `Manage Channels` permissions.',
			createError = `I can't create the Muted role. ${helpText}`,
			permError = `I don't have enough permissions. ${helpText}`,
			hierarchyError = `My role isn't high enough to mute this user. Move the Dyno role up above other roles.`;

		let role = guildConfig.moderation ?
			msg.channel.guild.roles.find(r => r.id === guildConfig.moderation.mutedRole || null) :
			null;

		if (!this.hasPermissions(msg.channel.guild, 'manageRoles', 'manageChannels')) {
			return Promise.reject(permError);
		}

		// create the muted role if it doesn't exist
		if (!guildConfig.moderation || !role) {
			role = await this.moderation.createMutedRole(msg.channel.guild, guildConfig);
		}

		if (!role) {
			return Promise.reject(createError);
		}

		const roles = [...user.roles];

		if (user.roles.includes(role.id)) {
			return Promise.reject(`${user.username}#${user.discriminator} is already muted.`);
		}

		const hasRoleHierarchy = this.hasRoleHierarchy(msg.channel.guild, role);
		if (!hasRoleHierarchy) {
			return this.error(msg.channel, hierarchyError);
		}

		roles.push(role.id);

		if (limit) {
			this.moderation.createModeration(msg, user, msg.author, 'mute', limit);
		}

		this.moderation.log({
			type: 'Mute',
			user: user,
			guild: msg.guild,
			mod: msg.author,
			limit, reason, guildConfig,
		});

		this.deleteCommand(msg, guildConfig);

		if (guildConfig.moderation && guildConfig.moderation.dmBans) {
			this.sendDM(user, `You were muted in ${msg.channel.guild.name}`, reason);
		}

		const _role = new Role(msg.channel.guild, guildConfig);
		_role.createOverwritePermissions([...msg.channel.guild.channels.values()], [
			'sendMessages',
			'addReactions',
			'voiceSpeak',
		]);

		return new Promise((resolve, reject) =>
			user.edit({ roles })
				.then(() => resolve(`${user.username}#${user.discriminator} has been muted.`))
				.catch(() => reject(`I couldn't mute the user. ${helpText}`)));
	}

	/**
	 * Unmute a user
	 * @param {Message} msg Message object
	 * @param {User|Member} user User object
	 * @return {Promise}
	 */
	async unmute(msg, user, reason) {
		const guildConfig = await this.dyno.guilds.getOrFetch(msg.channel.guild.id);
		if (!guildConfig) return Promise.reject('Unknown error occurred');

		let role;

		if (!guildConfig.moderation || !guildConfig.moderation.mutedRole) {
			return Promise.reject(`I can't unmute ${utils.fullName(user)}, they aren't muted by the bot.`);
		}

		role = msg.channel.guild.roles.find(r => r.id === guildConfig.moderation.mutedRole);
		if (!role) {
			return Promise.reject(`I couldn't find the Muted role.`);
		}

		const roles = [...user.roles];
		const index = roles.indexOf(role.id);

		if (index === -1) {
			return Promise.reject(`I can't unmute ${utils.fullName(user)}, they aren't muted.`);
		}

		roles.splice(index, 1);
		return new Promise((resolve, reject) =>
			user.edit({ roles })
				.then(() => {
					this.moderation.log({
						type: 'Unmute',
						guild: msg.guild,
						mod: msg.author,
						limit: null,
						reason: reason,
						user, guildConfig,
					});

					this.deleteCommand(msg, guildConfig);
					this.moderation.removeModeration(msg.guild, user);
					resolve(`Unmuted ${utils.fullName(user)}.`);
				})
				.catch(() => reject(`I can't unmute ${utils.fullName(user)}.`)));
	}
}

module.exports = Commands;
