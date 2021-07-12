'use strict';

const each = require('async-each');
const moment = require('moment');
const Module = Loader.require('./core/structures/Module');
const Ranks = Loader.require('./modules/Autoroles/Ranks');
const { Schema, Autorole } = require('../../core/models');
const statsd = require('../../core/statsd');

/**
 * Autoroles Module
 * @class Autoroles
 * @extends Module
 */
class Autoroles extends Module {
	constructor() {
		super();

		this.module = 'Autoroles';
		this.description = 'Enables joinable ranks and optional role on join.';
		this.enabled = true;
		this.hasPartial = true;

		this.permissions = [
			'manageRoles',
		];
	}

	static get name() {
		return 'Autoroles';
	}

	get settings() {
		return {
			roleOnJoin: { type: Schema.Types.Mixed, default: false },
			ranks: { type: Array, default: [] },
			disableMulti: { type: Boolean },
			joinWait: { type: Schema.Types.Mixed, default: false },
		};
	}

	async start() {
		this.ranks = new Ranks(this);
		this.autoroles = new Map();

		await this.loadAutoroles().catch(err => this.logger.error(err));

		this.schedule('*/1 * * * *', this.applyRoles.bind(this));
	}

	diagnose({ guild, guildConfig, diagnosis }) {
		if (!guildConfig.autoroles) return diagnosis;

		if (guildConfig.autoroles.roleOnJoin) {
			const role = guild.roles.get(guildConfig.autoroles.roleOnJoin);
			if (!role) return diagnosis;

			if (!this.hasRoleHierarchy(guild, role)) {
				diagnosis.issues.push(`The Dyno role isn't high enough to assign the ${role.name} role.`);
			}
		}

		if (guildConfig.autoroles.ranks && guildConfig.autoroles.ranks.length) {
			for (let rank of guildConfig.autoroles.ranks) {
				const role = guild.roles.get(rank.id);
				if (!role) {
					const ranks = new Ranks(this);
					ranks.deleteRank(guild, rank.name).catch(() => false);
					diagnosis.issues.push(`The ${rank.name} role has been deleted, I deleted the rank.`);
				}
				if (!this.hasRoleHierarchy(guild, role)) {
					diagnosis.issues.push(`The Dyno role isn't high enough to assign the ${rank.name} rank.`);
				}
			}
		}

		return diagnosis;
	}

	/**
	 * Handle new guild members
	 * @param {Guild} guild Guild object
	 * @param {Member} member Guild member object
	 */
	guildMemberAdd({ guild, member, guildConfig }) {
		// ignore bots
		if (!guildConfig || member.bot) return;
		if (!this.isEnabled(guild, this.module, guildConfig)) return;

		const roleOnJoin = guildConfig.autoroles ? guildConfig.autoroles.roleOnJoin || false : false;

		if (roleOnJoin && roleOnJoin !== 'Select Role') {
			if (!this.hasPermissions(guild, 'manageRoles')) {
				return statsd.increment(`autoroles.add.error`);
			}

			const role = guild.roles.get(guildConfig.autoroles.roleOnJoin);
			if (!role || !this.hasRoleHierarchy(guild, role)) {
				return statsd.increment(`autoroles.add.error`);
			}

			const joinWait = guildConfig.autoroles.joinWait;

			if (joinWait && !isNaN(joinWait) && joinWait > 0) {
				return this.createAutorole({
					guild: guild.id,
					user: member.id,
					role: roleOnJoin,
					duration: joinWait,
					createdAt: Date.now(),
				});
			}

			member.addRole(roleOnJoin, encodeURIComponent(`Dyno Autorole`))
				.then(() => statsd.increment(`autoroles.add.success`))
				.catch(() => statsd.increment(`autoroles.add.error`));
		}
	}

	guildMemberRemove({ guild, member, guildConfig }) {
		// ignore bots
		if (member.bot) return;
		if (!guildConfig || !guildConfig.autoroles || !guildConfig.autoroles.joinWait) return;

		if (this.autoroles.get(guild.id + member.id)) {
			this.deleteAutorole({ guild: guild.id, user: member.id });
		}
	}

	/**
	 * Apply timed roles to members
	 * @returns {*}
	 */
	async applyRoles() {
		if (!this.dyno.isReady) return;
		if (!this.autoroles || this.autoroles.size === 0) return;

		each([...this.autoroles.values()], async data => {
			const guild = this.client.guilds.get(data.guild);

			if (!guild) return;

			const member = guild.members.get(data.user);

			if (!member) {
				return this.deleteAutorole(data);
			}

			if (!await this.isEnabled(guild, this)) return;

			const duration = moment().diff(moment(data.createdAt), 'minutes');

			if (duration < data.duration) {
				return;
			}

			if (member.roles.includes(data.role)) {
				return this.deleteAutorole(data);
			}

			if (!this.hasPermissions(guild, 'manageRoles')) {
				return statsd.increment(`autoroles.add.error`);
			}

			const role = guild.roles.get(data.role);
			if (!role || !this.hasRoleHierarchy(guild, role)) {
				statsd.increment(`autoroles.add.error`);
				return this.deleteAutorole(data);
			}

			member.addRole(data.role, encodeURIComponent(`Dyno Autorole`))
				.then(() => {
					statsd.increment(`autoroles.add.success`);
					return this.deleteAutorole(data);
				})
				.catch(() => statsd.increment(`autoroles.add.error`));
		});
	}

	async fetchAndApplyRole(data) {
		const guild = this.client.guilds.get(data.guild);

		const guildConfig = await this.dyno.guilds.getOrFetch(data.guild);
		if (!guildConfig) return;

		try {
			await this.restClient.getRESTUser(data.user);
		} catch (err) {
			this.logger.error(err);
		}

		try {
			var member = await this.restClient.getRESTGuildMember(data.guild, data.user);
		} catch (err) {
			this.deleteAutorole(data);
		}

		if (!member) {
			return this.deleteAutorole(data);
		}

		if (!this.isEnabled(guild, this, guildConfig)) return;
		if (!this.hasPermissions(guild, 'manageRoles')) return;

		const duration = moment().diff(moment(data.createdAt), 'minutes');

		if (duration < data.duration) {
			return;
		}

		const roles = [...member.roles];
		roles.push(data.role);

		member.edit({ roles })
			.then(() => this.deleteAutorole(data))
			.catch(() => false); // most likely permissions error
	}

	/**
	 * Load autoroles from the database
	 * @returns {Promise}
	 */
	async loadAutoroles() {
		try {
			var docs = await Autorole.find().lean().exec();
		} catch (err) {
			this.logger.error(err, { type: 'autoroles.loadAutoroles.find' });
		}

		for (const doc of docs) {
			this.autoroles.set(doc.guild + doc.user, doc);
		}

		return Promise.resolve();
	}

	/**
	 * Create member autorole
	 * @param {Object} data Autorole data
	 */
	createAutorole(data) {
		const doc = new Autorole(data);
		doc.save();

		this.autoroles.set(data.guild + data.user, data);
	}

	/**
	 * Delete member autorole
	 * @param {Object} data Autorole data
	 */
	async deleteAutorole(data) {
		try {
			await Autorole.remove({ guild: data.guild, user: data.user });
		} catch (err) {
			this.logger.error(err, {
				type: 'autoroles.deleteAutorole.remove',
				guild: data.guild,
			});
		}
		this.autoroles.delete(data.guild + data.user);
	}
}

module.exports = Autoroles;
