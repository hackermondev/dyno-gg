import {Module} from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';
import * as each from 'async-each';
import * as dyno from 'Dyno';
import * as commands from './commands';
import Note from './models/Note';
import Moderations from './Moderations';
import ModUtils from './ModUtils';

/**
 * Moderation Module
 * @class Moderation
 * @extends Module
 */
export default class Moderation extends Module {
	public module     : string   = 'Moderation';
	public description: string   = 'Enabled moderation commands and mod log.';
	public list       : boolean  = true;
	public enabled    : boolean  = true;
	public hasPartial : boolean  = true;
	public commands   : {}       = commands;
	public modUtils   : ModUtils;
	public moderations : Moderations;
	public moduleModels: any[]   = [Note];
	public permissions: string[] = [
		'manageRoles',
		'manageChannels',
		'banMembers',
		'kickMembers',
	];

	private _scheduleInterval: NodeJS.Timer;

	get settings() {
		return {
			dmBans: Boolean,
			dmMutes: Boolean,
			removeRoles: Boolean,
			protectedRoles: Array,
			deleteCommands: Boolean,
			respondWithReasons: Boolean,
			count: { type: Number, default: 0 },
			channel: { type: this.db.Schema.Types.Mixed, default: false },
			mutedRole: { type: this.db.Schema.Types.Mixed, default: false },
		};
	}

	/**
	 * Fired when the module is started
	 */
	public start() {
		this.modUtils = new ModUtils(this.dyno);
		this.moderations = new Moderations(this);

		// create the cron job
		// this.schedule('*/1 * * * *', () => this.moderations.process());
		const interval = this.config.isPremium ? 20000 : 60000;
		this._scheduleInterval = setInterval(() => this.moderations.process(), interval);
	}

	public unload() {
		if (this._scheduleInterval) {
			clearInterval(this._scheduleInterval);
		}
	}

	public guildCreate({ guild, guildConfig }: any) {
		if (!guildConfig) {
			return;
		}
		if (!this.isEnabled(guild, this, guildConfig)) {
			return;
		}

		guildConfig.moderation = guildConfig.moderation || {};

		// Create the muted role if it isn't registered
		if (typeof guildConfig.moderation.mutedRole !== 'string') {
			return this.modUtils.createMutedRole(guild, guildConfig);
		}

		// Create the muted role if it's registered but no longer exists
		if (!guild.roles.find((r: eris.Role) => r.id === guildConfig.moderation.mutedRole)) {
			this.modUtils.createMutedRole(guild, guildConfig);
		}
	}

	public guildMemberAdd({ guild, member, guildConfig }: any) {
		if (!guildConfig.moderation) {
			return;
		}

		this.models.Moderation.find({ server: guild.id, userid: member.id }).lean().exec()
			.then((docs: any[]) => {
				for (const doc of docs) {
					if (!doc) {
						return;
					}

					let role;

					if (doc.type === 'mute') {
						role = guildConfig.moderation ?
							guild.roles.find((r: eris.Role) => r.id === guildConfig.moderation.mutedRole || null) : null;
					} else if (doc.type === 'role' && doc.role) {
						role = guild.roles.find((r: eris.Role) => r.id === doc.role);
					} else {
						continue;
					}

					if (!role) {
						continue;
					}

					member.addRole(role.id, encodeURIComponent('Dyno role persist')).catch(() => false);
				}
			});
	}

	public async logEvent(event: any) {
		const guildConfig = await this.dyno.guilds.getOrFetch(event.guild.id);
		if (!guildConfig) {
			return;
		}

		if (!this.isEnabled(event.guild, this, guildConfig)) {
			return;
		}

		return this.modUtils.log(event);
	}
}
