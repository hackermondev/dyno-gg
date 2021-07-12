'use strict';

const Module = Loader.require('./core/structures/Module');
const models = require('../../core/models');
const Commands = Loader.require('./modules/Moderation/Commands');
const Moderations = Loader.require('./modules/Moderation/Moderations');
const Helper = Loader.require('./helpers/Moderation');

const { Schema } = models;

/**
 * Moderation Module
 * @class Moderation
 * @extends Module
 */
class Moderation extends Module {
	constructor() {
		super();

		this.module = 'Moderation';
		this.description = 'Enables moderation commands and mod log.';
		this.enabled = true;
		this.hasPartial = true;

		this.permissions = [
			'manageRoles',
			'manageChannels',
			'banMembers',
			'kickMembers',
		];
	}

	static get name() {
		return 'Moderation';
	}

	get settings() {
		return {
			dmBans: Boolean,
			dmMutes: Boolean,
			protectedRoles: Array,
			deleteCommands: Boolean,
			count: { type: Number, default: 0 },
			channel: { type: Schema.Types.Mixed, default: false },
			mutedRole: { type: Schema.Types.Mixed, default: false },
		};
	}

	/**
	 * Fired when the module is started
	 */
	start() {
		this.moderation = new Helper(this.config, this.dyno);
		this.moderations = new Moderations(this);
		this.commands = new Commands(this);

		// create the cron job
		this.schedule('*/1 * * * *', () => this.moderations.process());
	}

	guildCreate(guild) {
		this.dyno.guilds.getOrFetch(guild.id)
			.then(guildConfig => this.enable(guild, guildConfig));
	}

	/**
	 * Fired when the module is enabled
	 * @param {Guild} guild Guild object
	 */
	async enable(guild, guildConfig) {
		if (!guildConfig) return;
		if (!this.isEnabled(guild, this, guildConfig)) return;

		guildConfig.moderation = guildConfig.moderation || {};

		// Create the muted role if it isn't registered
		if (typeof guildConfig.moderation.mutedRole !== 'string') {
			return this.moderation.createMutedRole(guild, guildConfig);
		}

		// Create the muted role if it's registered but no longer exists
		if (!guild.roles.find(r => r.id === guildConfig.moderation.mutedRole)) {
			this.moderation.createMutedRole(guild, guildConfig);
		}
	}

	guildMemberAdd({ guild, member, guildConfig }) {
		if (!guildConfig.moderation) return;

		models.Moderation.find({ server: guild.id, userid: member.id }).lean().exec()
			.then(docs => {
				for (let doc of docs) {
					if (!doc) return;

					let role;

					if (doc.type === 'mute') {
						role = guildConfig.moderation ?
							guild.roles.find(r => r.id === guildConfig.moderation.mutedRole || null) : null;
					} else if (doc.type === 'role' && doc.role) {
						role = guild.roles.find(r => r.id === doc.role);
					} else continue;

					if (!role) return;

					return member.addRole(role.id, encodeURIComponent('Dyno role persist')).catch(() => false);
				}
			});
	}

	isProtected(message, member, guildConfig) {
		if (!guildConfig.moderation || !guildConfig.moderation.protectedRoles) return true;
		if (!member.roles) return true;

		let protectedRoles = member.roles.find(r => guildConfig.moderation.protectedRoles.find(p => p.id === r));
		if (protectedRoles) {
			return false;
		}

		return true;
	}

	async logEvent(event) {
		const guildConfig = await this.dyno.guilds.getOrFetch(event.guild.id);
		if (!guildConfig) return;

		if (!this.isEnabled(event.guild, this, guildConfig)) return;

		return this.moderation.log(event);
	}
}

module.exports = Moderation;
