'use strict';

const Dyno = require('../Dyno');
const logger = require('../logger');
const { Permissions } = require('eris').Constants;

class Role {
	constructor(guild, guildConfig) {
		this._guild = guild;
		this._guildConfig = guildConfig;
	}

	static async createRole(guild, options) {
		try {
			var role = await guild.createRole(options);
		} catch (err) {
			if (role && role.id) {
				role.delete().catch(() => false);
			}
			return Promise.reject(err);
		}

		return Promise.resolve(role);
	}

	createRole(options) {
		return this.constructor.createRole(this._guild, options);
	}

	/**
	 * Check if the bot has permissions
	 * @param {Guild} guild The guild to check
	 * @param {...String} perms The permissions to check for
	 * @returns {boolean}
	 */
	hasPermissions(guild, ...perms) {
		this.dyno = this.dyno || Dyno.instance;
		const clientMember = guild.members.get(this.dyno.userid);
		for (const perm of perms) {
			if (!clientMember.permission || !clientMember.permission.has(perm)) return false;
		}

		return true;
	}

	getOrCreate(options) {
		if (!options || !options.name) return Promise.reject('No role name or invalid options given.');
		if (!this._guildConfig) return Promise.reject('Unable to get server configuration.');

		if (!this.hasPermissions(this._guild, 'manageRoles', 'manageChannels')) {
			return Promise.reject('Not enough permissions.');
		}

		const role = this._guild.roles.find(r => r.name === options.name);

		if (role) {
			return Promise.resolve(role);
		}

		return this.createRole(options);
	}

	/**
	 * Verify overwrite permissions are set per channel
	 * @param {Guild} guild Guild to verify
	 */
	createOverwritePermissions(channels, permissions) {
		const guild = this._guild;
		const guildConfig = this._guildConfig;

		if (!guildConfig || !guildConfig.moderation || !guildConfig.moderation.mutedRole) return;

		const role = guild ? guild.roles.find(r => r.id === guildConfig.moderation.mutedRole) : null;

		if (!guild || !role) {
			return;
		}

		logger.debug(`Creating overwrite permissions for ${channels.length} channels in ${guild.name}`);

		for (const channel of channels) {
			if (!this.hasPermissions(guild, 'manageRoles', 'manageChannels')) continue;

			const overwrite = channel.permissionOverwrites.get(role.id);
			let needsOverwrite = false;
			let permInt = 0;

			if (overwrite) {
				for (const perm of permissions) {
					if (channel.type === 0 && perm.includes('voice')) continue;
					if (channel.type === 2 && !perm.includes('voice')) continue;

					permInt |= Permissions[perm];

					if (overwrite.json.hasOwnProperty(perm) && overwrite.json[perm] === false) continue;

					needsOverwrite = true;
				}
			} else {
				for (const perm of permissions) {
					if (channel.type === 0 && perm.includes('voice')) continue;
					if (channel.type === 2 && !perm.includes('voice')) continue;

					permInt |= Permissions[perm];
				}

				needsOverwrite = true;
			}

			if (!needsOverwrite) continue;

			channel.editPermission(role.id, 0, permInt, 'role').catch(() => false);
		}
	}
}

module.exports = Role;
